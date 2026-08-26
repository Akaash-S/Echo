import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1 import Query
from fastapi import HTTPException, status

def get_db():
    """
    Get Firestore client instance from initialized firebase_admin app.
    """
    return firestore.client()

def _get_sessions_collection(db, uid: str):
    """
    Returns collection reference strictly scoped to /users/{uid}/sessions
    Enforces Non-Negotiable #3.
    """
    if not uid or not isinstance(uid, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID provided for Firestore query."
        )
    return db.collection("users").document(uid).collection("sessions")

def create_session(
    uid: str,
    opening_message_text: str,
    previous_theme: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new session document under /users/{uid}/sessions/{sessionId}
    
    Data Model matching §4:
    - startedAt: timestamp
    - endedAt: null
    - messages: array of { role: "model", text: opening_message_text, timestamp }
    - summary: null
    - extractedTheme: null
    - followUpQuestion: null
    - followUpAsked: false
    - followUpReferencedNext: false
    """
    db = get_db()
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    initial_message = {
        "role": "model",
        "text": opening_message_text,
        "timestamp": now_iso
    }

    session_data = {
        "sessionId": session_id,
        "userId": uid,
        "startedAt": now_iso,
        "endedAt": None,
        "messages": [initial_message],
        "summary": None,
        "extractedTheme": None,
        "followUpQuestion": None,
        "followUpAsked": False,
        "followUpReferencedNext": False,
    }

    session_ref = _get_sessions_collection(db, uid).document(session_id)
    session_ref.set(session_data)

    return session_data

def append_message(
    uid: str,
    session_id: str,
    role: str,
    text: str
) -> Dict[str, Any]:
    """
    Append a message (role, text, timestamp) to a session's messages array.
    Verifies ownership of the session before updating.
    """
    if role not in ("user", "model"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message role. Must be 'user' or 'model'."
        )

    db = get_db()
    session_ref = _get_sessions_collection(db, uid).document(session_id)
    doc_snapshot = session_ref.get()

    if not doc_snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found for authenticated user."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    new_message = {
        "role": role,
        "text": text,
        "timestamp": now_iso
    }

    # Append message to array using Firestore arrayUnion or field update
    session_ref.update({
        "messages": firestore.ArrayUnion([new_message])
    })

    return new_message

def get_session(uid: str, session_id: str) -> Dict[str, Any]:
    """
    Fetch a session by sessionId, strictly verifying it belongs to the given uid.
    Raises 404 if missing or not belonging to uid.
    """
    db = get_db()
    session_ref = _get_sessions_collection(db, uid).document(session_id)
    doc_snapshot = session_ref.get()

    if not doc_snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found for authenticated user."
        )

    data = doc_snapshot.to_dict()
    return data

def get_most_recent_themed_session(uid: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the most recent session for a uid that has a non-null, non-empty extractedTheme.
    Used for Echo's signature next-session callback feature (§3.5 B).
    """
    db = get_db()
    sessions_ref = _get_sessions_collection(db, uid)

    # Query sorted by startedAt descending
    try:
        query = (
            sessions_ref
            .order_by("startedAt", direction=Query.DESCENDING)
            .limit(20)
        )
        docs = query.stream()

        for doc in docs:
            data = doc.to_dict()
            theme = data.get("extractedTheme")
            if theme and isinstance(theme, str) and theme.strip():
                return data
    except Exception as e:
        # If composite index is building or not yet available, fallback to client-side filter
        docs = sessions_ref.limit(50).stream()
        themed_sessions = []
        for doc in docs:
            d = doc.to_dict()
            if d.get("extractedTheme"):
                themed_sessions.append(d)
        
        if themed_sessions:
            themed_sessions.sort(key=lambda x: x.get("startedAt", ""), reverse=True)
            return themed_sessions[0]

    return None

def mark_follow_up_referenced(uid: str, session_id: str) -> None:
    """
    Marks that a prior session's theme/follow-up has been referenced in a subsequent session.
    """
    db = get_db()
    session_ref = _get_sessions_collection(db, uid).document(session_id)
    session_ref.update({
        "followUpReferencedNext": True
    })

def end_session_and_update(
    uid: str,
    session_id: str,
    summary: str,
    extracted_theme: str,
    follow_up_question: str
) -> Dict[str, Any]:
    """
    Update a session with summary, extractedTheme, followUpQuestion, endedAt, followUpAsked: True.
    Verifies ownership of the session before updating.
    """
    db = get_db()
    session_ref = _get_sessions_collection(db, uid).document(session_id)
    doc_snapshot = session_ref.get()

    if not doc_snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found for authenticated user."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = {
        "summary": summary,
        "extractedTheme": extracted_theme,
        "followUpQuestion": follow_up_question,
        "endedAt": now_iso,
        "followUpAsked": True
    }

    session_ref.update(update_data)

    # Return full updated document
    updated_doc = session_ref.get().to_dict()
    return updated_doc
