from fastapi import FastAPI, Depends, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

from auth import get_verified_uid, get_verified_user
import firestore_client

load_dotenv()

app = FastAPI(
    title="Echo Backend API",
    description="Secure FastAPI backend for Echo personal AI journal with Firebase Auth verification and Firestore persistence.",
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
# Request & Response Schemas
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
    }

# ---------------------------------------------------------------------------
# §5 API Contract - Wired to Firestore Persistence
# ---------------------------------------------------------------------------

@app.post(
    "/api/session/start",
    response_model=StartSessionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Sessions"],
    summary="Start a new journal session and persist to Firestore",
)
async def start_session(
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/start
    
    1. Verifies Bearer token via `get_verified_uid` dependency (extracts `uid`).
    2. Looks up most recent session for `uid` with a non-null `extractedTheme`.
    3. Crafts opening message placeholder (wired to Gemini in Item 3).
    4. Creates session document under /users/{uid}/sessions/{sessionId}.
    5. Returns { sessionId, openingMessage, previousTheme, startedAt }.
    """
    # 2. Look up most recent session with extractedTheme
    recent_session = firestore_client.get_most_recent_themed_session(uid)
    previous_theme = recent_session.get("extractedTheme") if recent_session else None

    # Mark prior session as referenced if found
    if recent_session and recent_session.get("sessionId"):
        firestore_client.mark_follow_up_referenced(uid, recent_session["sessionId"])

    # 3. Placeholder opening message (Will be Gemini in Item 3)
    if previous_theme:
        opening_message = f"Welcome back! Last time we explored '{previous_theme}'. How has that been settling with you, or is there a fresh thought on your mind today?"
    else:
        opening_message = "Welcome to Echo. This is your private space to reflect, untangle thoughts, or brainstorm. What's on your mind today?"

    # 4. Persist to Firestore under /users/{uid}/sessions/{sessionId}
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
    summary="Append user reflection and model reply to session in Firestore",
)
async def post_message(
    payload: MessageRequest,
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/message
    
    1. Verifies Bearer token via `get_verified_uid` dependency.
    2. Verifies the session belongs to `uid` and appends user message to Firestore.
    3. Generates model reply placeholder (wired to Gemini in Item 3).
    4. Appends model reply to Firestore messages array.
    5. Returns { reply, sessionId, messages }.
    """
    # 2. Verify ownership & append user message
    firestore_client.append_message(
        uid=uid,
        session_id=payload.sessionId,
        role="user",
        text=payload.text.strip(),
    )

    # 3. Placeholder response (Will call Gemini in Item 3 with full history)
    reply_text = f"I hear your reflection on '{payload.text.strip()[:60]}...'. When you observe this, what feels like the most essential aspect to explore?"

    # 4. Append model reply
    firestore_client.append_message(
        uid=uid,
        session_id=payload.sessionId,
        role="model",
        text=reply_text,
    )

    # Fetch updated session
    updated_session = firestore_client.get_session(uid, payload.sessionId)

    return MessageResponse(
        reply=reply_text,
        sessionId=payload.sessionId,
        messages=updated_session.get("messages", []),
    )


@app.post(
    "/api/session/end",
    response_model=EndSessionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Sessions"],
    summary="Conclude session and persist summary, theme, and follow-up question to Firestore",
)
async def end_session(
    payload: EndSessionRequest,
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/end
    
    1. Verifies Bearer token via `get_verified_uid` dependency.
    2. Verifies ownership of /users/{uid}/sessions/{sessionId}.
    3. Synthesizes summary, theme tag, and follow-up question placeholder (Gemini in Item 4).
    4. Updates session doc: summary, extractedTheme, followUpQuestion, endedAt, followUpAsked: true.
    5. Returns { summary, extractedTheme, followUpQuestion, sessionId, endedAt, followUpAsked }.
    """
    # Verify session exists and belongs to user
    session = firestore_client.get_session(uid, payload.sessionId)

    # Placeholder synthesis (Gemini in Item 4)
    summary_text = "Reflective conversation examining priorities, decision dynamics, and personal clarity."
    theme_tag = "clarifying priorities and focus"
    follow_up_question = "What is one boundary or clear step you can commit to before tomorrow?"

    # 4. Update session document in Firestore
    updated_doc = firestore_client.end_session_and_update(
        uid=uid,
        session_id=payload.sessionId,
        summary=summary_text,
        extracted_theme=theme_tag,
        follow_up_question=follow_up_question,
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
