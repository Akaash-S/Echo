from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

from auth import get_verified_uid, get_verified_user

load_dotenv()

app = FastAPI(
    title="Echo Backend API",
    description="Secure FastAPI backend for Echo personal AI journal with Firebase Auth verification.",
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

# Allow any custom frontend origin specified via environment variable
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
class StartSessionResponse(BaseModel):
    sessionId: str
    openingMessage: str
    previousTheme: Optional[str] = None
    status: str = "stub_active"

class MessageRequest(BaseModel):
    sessionId: str = Field(..., description="The unique session identifier")
    text: str = Field(..., min_length=1, description="User's reflection or conversation turn")

class MessageResponse(BaseModel):
    reply: str
    sessionId: str
    status: str = "stub_active"

class EndSessionRequest(BaseModel):
    sessionId: str = Field(..., description="The unique session identifier to conclude")

class EndSessionResponse(BaseModel):
    summary: str
    extractedTheme: Optional[str]
    followUpQuestion: Optional[str]
    sessionId: str
    status: str = "stub_ended"

# ---------------------------------------------------------------------------
# Health & Status Endpoint
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "echo-fastapi-backend",
        "auth_enforcement": "firebase_bearer_token",
    }

# ---------------------------------------------------------------------------
# §5 API Contract - Stub Routes with Real Auth Enforcement
# ---------------------------------------------------------------------------

@app.post(
    "/api/session/start",
    response_model=StartSessionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Sessions"],
    summary="Start a new journal session",
)
async def start_session(
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/start (Stub)
    
    1. Verifies Bearer token via `get_verified_uid` dependency (extracts `uid`).
    2. [Next step]: Query Firestore for most recent session with extractedTheme.
    3. [Next step]: Call Gemini for theme callback opener or generic greeting.
    4. [Next step]: Create session document in /users/{uid}/sessions/{sessionId}.
    """
    return StartSessionResponse(
        sessionId="stub-session-id-12345",
        openingMessage=f"Welcome back to Echo! (Stub opener for verified user: {uid})",
        previousTheme=None,
        status="stub_active",
    )


@app.post(
    "/api/session/message",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    tags=["Sessions"],
    summary="Post a message turn to the active session",
)
async def post_message(
    payload: MessageRequest,
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/message (Stub)
    
    1. Verifies Bearer token via `get_verified_uid` dependency.
    2. [Next step]: Verify session ownership at /users/{uid}/sessions/{sessionId}.
    3. [Next step]: Append user message, call Gemini with full history, append reply.
    4. [Next step]: Persist to Firestore.
    """
    return MessageResponse(
        reply=f"Echo received your thought: '{payload.text}'. (Stub reply for user {uid})",
        sessionId=payload.sessionId,
        status="stub_active",
    )


@app.post(
    "/api/session/end",
    response_model=EndSessionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Sessions"],
    summary="End and synthesize an active session",
)
async def end_session(
    payload: EndSessionRequest,
    uid: str = Depends(get_verified_uid),
):
    """
    POST /api/session/end (Stub)
    
    1. Verifies Bearer token via `get_verified_uid` dependency.
    2. [Next step]: Verify session ownership at /users/{uid}/sessions/{sessionId}.
    3. [Next step]: Call Gemini to summarize, extract theme tag, and generate follow-up question.
    4. [Next step]: Update session doc in Firestore with end timestamps and metadata.
    """
    return EndSessionResponse(
        summary="This is a placeholder summary. Full Gemini summarization will be wired in next step.",
        extractedTheme="clarifying priorities",
        followUpQuestion="What is one small action step you can take today based on this reflection?",
        sessionId=payload.sessionId,
        status="stub_ended",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
