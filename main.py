from fastapi import FastAPI, Depends, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

from auth import get_verified_uid, get_verified_user
import firestore_client
import gemini_service

load_dotenv()

app = FastAPI(
    title="Echo Backend API",
    description="Secure FastAPI backend for Echo personal AI journal with Firebase Auth, Firestore persistence, and Gemini multi-turn conversation & synthesis.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS Configuration
# Configured for local React dev server (http://localhost:5173) and production
# ---------------------------------------------------------------------------
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request & Response Schemas (§5 API Contracts)
# ---------------------------------------------------------------------------
class MessageItem(BaseModel):
    role: str
    text: str
    timestamp: str

class StartSessionResponse(BaseModel):
    sessionId: str
    openingMessage: str
    previousTheme: Optional[str] = None
    startedAt: str

class MessageRequest(BaseModel):
    sessionId: str = Field(..., description="The unique session identifier")
    text: str = Field(..., min_length=1, description="User's reflection or conversation turn")

class MessageResponse(BaseModel):
    reply: str
    sessionId: str
    messages: List[Dict[str, Any]]

class EndSessionRequest(BaseModel):
    sessionId: str = Field(..., description="The unique session identifier to conclude")

class EndSessionResponse(BaseModel):
    summary: str
    extractedTheme: Optional[str]
    followUpQuestion: Optional[str]
    sessionId: str
    endedAt: str
    followUpAsked: bool

# ---------------------------------------------------------------------------
# Health & Status Endpoint
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "echo-fastapi-backend",
        "auth_enforcement": "firebase_bearer_token",
        "database": "cloud_firestore",
        "ai_engine": "google-genai-gemini-2.5-flash",
    }

# ---------------------------------------------------------------------------
# §5 API Endpoints — Implemented with Real Gemini & Scoped Firestore Access
# ---------------------------------------------------------------------------

@app.post(
    "/api/session/start",
    response_model=StartSessionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Sessions"],
    summary="Start a new journal session with Gemini dynamic opening prompt and theme callback",
)
async def start_session(
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/start
    
    1. Verifies Bearer token via `get_verified_uid` dependency.
    2. Queries Firestore for most recent session with a non-null `extractedTheme`.
    3. Calls Gemini in Python via `gemini_service.generate_opening_prompt`:
       - If prior theme exists: generates theme callback greeting (§3.5 B).
       - If no prior theme: generates welcoming open-ended reflection greeting.
    4. Marks previous session's followUpReferencedNext: true (if applicable).
    5. Creates new session document under /users/{uid}/sessions/{sessionId}.
    6. Returns { sessionId, openingMessage, previousTheme, startedAt }.
    """
    # 2. Query most recent session with extractedTheme
    recent_session = firestore_client.get_most_recent_themed_session(uid)
    previous_theme = recent_session.get("extractedTheme") if recent_session else None

    # Mark prior session as referenced
    if recent_session and recent_session.get("sessionId"):
        firestore_client.mark_follow_up_referenced(uid, recent_session["sessionId"])

    # 3. Call Gemini for dynamic opening prompt
    opening_message = gemini_service.generate_opening_prompt(previous_theme=previous_theme)

    # 5. Persist to Firestore under /users/{uid}/sessions/{sessionId}
    session_doc = firestore_client.create_session(
        uid=uid,
        opening_message_text=opening_message,
        previous_theme=previous_theme,
    )

    return StartSessionResponse(
        sessionId=session_doc["sessionId"],
        openingMessage=opening_message,
        previousTheme=previous_theme,
        startedAt=session_doc["startedAt"],
    )


@app.post(
    "/api/session/message",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    tags=["Sessions"],
    summary="Post a message turn; Gemini responds with full multi-turn session context",
)
async def post_message(
    payload: MessageRequest,
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/message
    
    1. Verifies Bearer token via `get_verified_uid` dependency.
    2. Appends user message to Firestore under /users/{uid}/sessions/{sessionId}.
    3. Retrieves full session history from Firestore.
    4. Calls Gemini in Python with full conversation turns and Echo persona system prompt.
    5. Appends Gemini's reply to Firestore messages array.
    6. Returns { reply, sessionId, messages }.
    """
    # 2. Append user reflection to Firestore (verifies session ownership)
    firestore_client.append_message(
        uid=uid,
        session_id=payload.sessionId,
        role="user",
        text=payload.text.strip(),
    )

    # 3. Fetch full session messages history
    current_session = firestore_client.get_session(uid, payload.sessionId)
    messages_history = current_session.get("messages", [])

    # 4. Call Gemini in Python with full context
    model_reply = gemini_service.generate_conversation_turn(messages=messages_history)

    # 5. Append model reply to Firestore
    firestore_client.append_message(
        uid=uid,
        session_id=payload.sessionId,
        role="model",
        text=model_reply,
    )

    # Fetch updated session state
    updated_session = firestore_client.get_session(uid, payload.sessionId)

    return MessageResponse(
        reply=model_reply,
        sessionId=payload.sessionId,
        messages=updated_session.get("messages", []),
    )


@app.post(
    "/api/session/end",
    response_model=EndSessionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Sessions"],
    summary="Conclude session and synthesize summary, theme, and follow-up question with Gemini",
)
async def end_session(
    payload: EndSessionRequest,
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/end (Item 4 Gemini Synthesis)
    
    1. Verifies Bearer token via `get_verified_uid` dependency.
    2. Verifies ownership and fetches full transcript of /users/{uid}/sessions/{sessionId}.
    3. Calls Gemini in Python with structured schema to synthesize:
       - summary (2-4 sentence narrative)
       - extractedTheme (2-5 word thematic tag)
       - followUpQuestion (open-ended question for between sessions)
    4. Updates session document in Firestore:
       - summary
       - extractedTheme
       - followUpQuestion
       - endedAt
       - followUpAsked: true
    5. Returns { summary, extractedTheme, followUpQuestion, sessionId, endedAt, followUpAsked }.
    """
    # 2. Fetch full session transcript and verify ownership
    session = firestore_client.get_session(uid, payload.sessionId)
    messages_history = session.get("messages", [])

    # 3. Call Gemini with Structured JSON Schema
    synthesis = gemini_service.synthesize_session(messages=messages_history)

    # 4. Update session document in Firestore
    updated_doc = firestore_client.end_session_and_update(
        uid=uid,
        session_id=payload.sessionId,
        summary=synthesis["summary"],
        extracted_theme=synthesis["extractedTheme"],
        follow_up_question=synthesis["followUpQuestion"],
    )

    return EndSessionResponse(
        summary=updated_doc["summary"],
        extractedTheme=updated_doc["extractedTheme"],
        followUpQuestion=updated_doc["followUpQuestion"],
        sessionId=payload.sessionId,
        endedAt=updated_doc["endedAt"],
        followUpAsked=updated_doc["followUpAsked"],
    )


# ---------------------------------------------------------------------------
# Query Routes for Frontend Past Sessions View
# ---------------------------------------------------------------------------
@app.get(
    "/api/session/{session_id}",
    tags=["Sessions"],
    summary="Get single session document scoped to verified user",
)
async def get_single_session(
    session_id: str,
    uid: str = Depends(get_verified_uid),
):
    """
    Fetch a session by ID scoped strictly to /users/{uid}/sessions/{session_id}.
    """
    session = firestore_client.get_session(uid, session_id)
    return {"session": session}


@app.get(
    "/api/sessions",
    tags=["Sessions"],
    summary="List all past sessions scoped to verified user",
)
async def list_sessions(
    uid: str = Depends(get_verified_uid),
):
    """
    List all sessions belonging to /users/{uid}/sessions ordered by startedAt desc.
    """
    db = firestore_client.get_db()
    sessions_ref = firestore_client._get_sessions_collection(db, uid)
    docs = sessions_ref.order_by("startedAt", direction=firestore_client.Query.DESCENDING).stream()
    
    results = [doc.to_dict() for doc in docs]
    return {"sessions": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
