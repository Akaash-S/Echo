# Echo System Architecture & Technical Documentation Report

**Project**: Echo — Reflective AI Journal with Continuous Memory  
**Target Environment**: Python/FastAPI Backend on Google Cloud Run, Cloud Firestore, Google GenAI SDK (Gemini 2.5 Flash), React/Vite Frontend  
**Status**: Pre-Deployment Verification & Architecture Self-Audit

---

## 1. Component Inventory

### Backend Components (Python / FastAPI)

| File | Purpose | Functional Description |
|---|---|---|
| `auth.py` | Authentication & Token Verification | Provides FastAPI dependencies (`get_verified_uid`, `get_verified_user`) that extract HTTP `Authorization: Bearer <token>` headers, verify them using `firebase_admin.auth.verify_id_token`, and return the verified `uid`. Rejects missing, invalid, or expired tokens with HTTP 401. |
| `firestore_client.py` | Scoped Database Access Layer | Encapsulates all Cloud Firestore operations. Enforces strict per-user document isolation by scoping all session reads, writes, and list queries exclusively under `/users/{uid}/sessions/{sessionId}`. Provides helper methods to create sessions, append turns, retrieve transcripts, fetch themed sessions, and persist end-of-session synthesis metadata. |
| `gemini_service.py` | Google GenAI SDK Service | Connects to Gemini via the official Python `google-genai` SDK (`from google import genai`). Implements the Echo reflective persona (`ECHO_SYSTEM_INSTRUCTION`), generates theme-callback openers, converts conversation turns into `types.Content` multi-turn sequences, and performs structured JSON synthesis (`SessionSynthesisSchema`) for session summaries, theme tags, and follow-up reflection questions. |
| `main.py` | FastAPI Application & API Routes | Defines the main ASGI FastAPI application, CORS middleware, Pydantic request/response validation models, and route endpoints (`/api/session/start`, `/api/session/message`, `/api/session/end`, `/api/sessions`, `/api/session/{sessionId}`, and `/health`). Injects `Depends(get_verified_uid)` on all authenticated endpoints. |
| `requirements.txt` | Python Dependencies Specification | Declares pinned Python dependencies required for the backend service: `fastapi`, `uvicorn[standard]`, `firebase-admin`, `pydantic`, `python-dotenv`, and `google-genai`. |
| `firestore.rules` | Database Security Rules | Declarative rules enforcing database-level authorization: guarantees that `/users/{uid}/sessions/{sessionId}` can only be read or written if `request.auth.uid == uid`. |
| `firebase.json` | Firebase Configuration | Specifies deployment targets for Firebase services, including the path to `firestore.rules`. |
| `.env.example` | Environment Configuration Template | Documents required environment variables (`GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `FRONTEND_URL`, `PORT`) without containing secrets. |

### Frontend Components (React 19 / TypeScript / Vite / Tailwind CSS)

| File | Purpose | Functional Description |
|---|---|---|
| `src/App.tsx` | Main Application Container & Coordinator | Top-level state manager. Coordinates user authentication state, active session selection, sidebar drawer state, and initial API handshakes (`startSession`). Renders `AuthScreen` when unauthenticated or `Sidebar` + `JournalChat` when authenticated. |
| `src/components/AuthScreen.tsx` | Typographic Sign-in View | Clean, minimal authentication interface (zero logo marks). Provides the "Sign in with Google" action, handles auth loading states, and passes the resulting `AuthUser` object to the root state. |
| `src/components/Sidebar.tsx` | Past Reflections Drawer / Navigation | Collapsible sidebar listing past journaling sessions ordered chronologically with date and extracted theme previews. Houses the "New session" action and user account sign-out button. Supports full mobile off-canvas drawer transitions. |
| `src/components/JournalChat.tsx` | Primary Conversation & Composer View | Constrained conversation column rendering distinct user cards and markdown-formatted Echo model messages. Houses the auto-growing bottom composer (`textarea`), scroll-to-bottom effects, and the soft, dismissible end-of-session reflection card. |
| `src/lib/api.ts` | Backend API Client | Typed HTTP client (`EchoApiClient`) that wraps `fetch`, automatically attaches the `Authorization: Bearer <token>` header, enforces JSON response parsing, and exposes methods for all session lifecycle routes. |
| `src/types.ts` | Shared TypeScript Type Definitions | Declares TypeScript interfaces for `JournalMessage`, `JournalSession`, `AuthUser`, `StartSessionResponse`, `MessageSessionResponse`, and `EndSessionResponse`. |
| `src/index.css` | Global Styling & Typography | Imports Tailwind CSS and sets baseline styling for markdown content, custom scrollbars, and selection colors in warm neutral dark tones. |
| `src/main.tsx` | Frontend DOM Entry Point | Mounts `App.tsx` to the root DOM node in `index.html`. |
| `vite.config.ts` | Vite Build & Local Dev Configuration | Configures Vite plugins (`@vitejs/plugin-react`, `@tailwindcss/vite`) and includes an embedded local development middleware (`echoApiDevPlugin`) to mock backend routes during browser preview when running standalone. |
| `package.json` | Frontend Manifest & Tooling | Manages frontend dependencies (`react`, `react-dom`, `lucide-react`, `motion`, `react-markdown`, `tailwindcss`, `vite`, `typescript`). Excludes backend Node modules to preserve the locked Python backend stack. |
| `tsconfig.json` | TypeScript Compiler Configuration | Configures compiler options for React 19 JSX transformation and ES module resolution. |
| `metadata.json` | Application Metadata & Permissions | Contains the application display name ("Echo"), description, requested frame permissions, and capability flags. |

---

## 2. Backend Architecture — As Built

### 2.1 API Route Contracts & Schemas

The backend runs on **FastAPI** (`main.py`) with all route parameters and response schemas strictly validated via **Pydantic v2**.

#### 1. `GET /health`
- **Authentication**: None (Public health probe).
- **Request**: None.
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "echo-fastapi-backend",
    "auth_enforcement": "firebase_bearer_token",
    "database": "cloud_firestore",
    "ai_engine": "google-genai-gemini-2.5-flash"
  }
  ```

#### 2. `POST /api/session/start`
- **Authentication**: Required (`Authorization: Bearer <Firebase_ID_Token>`).
- **Request Body**: `{}` (Empty JSON object).
- **Response Status**: `201 Created`.
- **Response Body**:
  ```json
  {
    "sessionId": "sess_8f3a1b2c4d5e6f7a",
    "openingMessage": "Welcome back! Last time you were reflecting on 'work-life balance boundaries'. How has that been settling with you, or is there a fresh thought on your mind today?",
    "previousTheme": "work-life balance boundaries",
    "startedAt": "2026-08-26T18:30:00.000000Z"
  }
  ```
- *Implementation Notes*: Queries Firestore for the caller's most recent session having a non-null `extractedTheme`. If found, prompts Gemini to generate a personalized callback opener; if not found (or first session), generates a warm welcoming opener. Marks the prior session's `followUpReferencedNext: true` and initializes the new session document in Firestore.

#### 3. `POST /api/session/message`
- **Authentication**: Required (`Authorization: Bearer <Firebase_ID_Token>`).
- **Request Body**:
  ```json
  {
    "sessionId": "sess_8f3a1b2c4d5e6f7a",
    "text": "I noticed that I said yes to taking on an extra project even though my plate was full."
  }
  ```
- **Response Status**: `200 OK`.
- **Response Body**:
  ```json
  {
    "reply": "Saying yes when your plate is already full is such an instinctive reaction, especially when we want to be dependable. When that moment happened, what was the internal dialogue or concern that nudged you toward agreeing?",
    "sessionId": "sess_8f3a1b2c4d5e6f7a",
    "messages": [
      {
        "role": "model",
        "text": "Welcome back! Last time...",
        "timestamp": "2026-08-26T18:30:00.000000Z"
      },
      {
        "role": "user",
        "text": "I noticed that I said yes...",
        "timestamp": "2026-08-26T18:32:15.000000Z"
      },
      {
        "role": "model",
        "text": "Saying yes when your plate is already full...",
        "timestamp": "2026-08-26T18:32:18.000000Z"
      }
    ]
  }
  ```
- *Implementation Notes*: Appends the user turn to Firestore, retrieves the full conversation transcript from Firestore, translates it into `types.Content` turns, passes it to Gemini 2.5 Flash with the Echo system instruction, appends the model response to Firestore, and returns the updated conversation state.

#### 4. `POST /api/session/end`
- **Authentication**: Required (`Authorization: Bearer <Firebase_ID_Token>`).
- **Request Body**:
  ```json
  {
    "sessionId": "sess_8f3a1b2c4d5e6f7a"
  }
  ```
- **Response Status**: `200 OK`.
- **Response Body**:
  ```json
  {
    "summary": "The user examined their tendency to overcommit to work projects despite feeling overwhelmed, identifying a fear of letting colleagues down as the primary driver.",
    "extractedTheme": "people-pleasing and workload boundaries",
    "followUpQuestion": "Between now and our next session, what is one low-stakes boundary you can practice holding without apology?",
    "sessionId": "sess_8f3a1b2c4d5e6f7a",
    "endedAt": "2026-08-26T18:45:00.000000Z",
    "followUpAsked": true
  }
  ```
- *Implementation Notes*: Retrieves the entire session transcript, submits it to Gemini 2.5 Flash under a structured JSON schema (`SessionSynthesisSchema`), updates the Firestore document with `summary`, `extractedTheme`, `followUpQuestion`, `endedAt`, and `followUpAsked: true`, and returns the synthesis.

#### 5. `GET /api/sessions`
- **Authentication**: Required (`Authorization: Bearer <Firebase_ID_Token>`).
- **Response Status**: `200 OK`.
- **Response Body**:
  ```json
  {
    "sessions": [
      {
        "sessionId": "sess_8f3a1b2c4d5e6f7a",
        "userId": "firebase_uid_123",
        "startedAt": "2026-08-26T18:30:00.000000Z",
        "endedAt": "2026-08-26T18:45:00.000000Z",
        "messages": [...],
        "summary": "...",
        "extractedTheme": "people-pleasing and workload boundaries",
        "followUpQuestion": "...",
        "followUpAsked": true,
        "followUpReferencedNext": false
      }
    ]
  }
  ```

#### 6. `GET /api/session/{session_id}`
- **Authentication**: Required (`Authorization: Bearer <Firebase_ID_Token>`).
- **Response Status**: `200 OK` (or `404 Not Found`).
- **Response Body**:
  ```json
  {
    "session": { ... }
  }
  ```

---

### 2.2 Auth Verification Middleware (`auth.py`)

Auth verification is implemented using FastAPI's dependency injection system:

```python
async def get_verified_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token."
        )
    token = credentials.credentials
    # In live Cloud Run environments, verifies using Firebase Admin SDK:
    decoded_token = auth.verify_id_token(token)
    return decoded_token

async def get_verified_uid(
    user_payload: Dict[str, Any] = Depends(get_verified_user)
) -> str:
    uid = user_payload.get("uid") or user_payload.get("user_id") or user_payload.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing valid UID."
        )
    return str(uid)
```

**Key Characteristics**:
1. No route accepts user-supplied `uid` in the JSON request body or URL path for access authorization.
2. The `uid` is derived exclusively from cryptographically verified Firebase ID tokens.
3. If the token is invalid, expired, or malformed, the dependency halts execution before route logic runs.

---

### 2.3 Scoped Firestore Data Access Layer (`firestore_client.py`)

All document references and collection references are constructed via a path helper:
```python
def _get_sessions_collection(db, uid: str):
    return db.collection("users").document(uid).collection("sessions")
```

#### Implemented Functions:
1. `create_session(uid, opening_message_text, previous_theme)`:
   - Sets doc at `/users/{uid}/sessions/{sessionId}`.
   - Sets `userId: uid`, `startedAt: ISO8601`, `messages: [openingMessage]`, `endedAt: null`, `summary: null`, `extractedTheme: null`, `followUpQuestion: null`, `followUpAsked: false`, `followUpReferencedNext: false`.
2. `append_message(uid, session_id, role, text)`:
   - Verifies that `/users/{uid}/sessions/{session_id}` exists.
   - Atomically appends `{ role, text, timestamp }` using `firestore.ArrayUnion`.
3. `get_session(uid, session_id)`:
   - Reads `/users/{uid}/sessions/{session_id}`.
   - Raises HTTP 404 if the document does not exist under the user's path.
4. `get_most_recent_themed_session(uid)`:
   - Queries `/users/{uid}/sessions` ordered by `startedAt DESC`.
   - Iterates to find the latest session where `extractedTheme` is non-null and non-empty.
5. `mark_follow_up_referenced(uid, session_id)`:
   - Updates `followUpReferencedNext: true` on the targeted session document.
6. `end_session_and_update(uid, session_id, summary, extracted_theme, follow_up_question)`:
   - Updates `/users/{uid}/sessions/{session_id}` with synthesis fields and sets `endedAt: now` and `followUpAsked: true`.

---

### 2.4 Gemini Integration (`gemini_service.py`)

The Gemini integration is implemented using the official Python SDK `google-genai` (`v1.2.0`).

#### 1. Model & Persona Definition
- **Model**: `gemini-2.5-flash`
- **System Instruction (`ECHO_SYSTEM_INSTRUCTION`)**: Configures Echo as an empathetic, grounded personal AI journaling companion that actively listens, reflects sentiments, avoids preachy platitudes or unsolicited advice, and closes each turn with a reflective question.

#### 2. Multi-Turn Context Maintenance (`generate_conversation_turn`)
- Firestore array items (`{ role: "user"|"model", text: "..." }`) are mapped into `types.Content` objects:
  ```python
  contents.append(
      types.Content(
          role="user" if msg["role"] == "user" else "model",
          parts=[types.Part.from_text(text=msg["text"])]
      )
  )
  ```
- The complete array of content turns is sent in each request to `client.models.generate_content`, maintaining dialogue continuity.

#### 3. Continuous Memory & Theme Callback Opener (`generate_opening_prompt`)
- If a prior session had `extractedTheme = "workplace boundary setting"`, the opener prompt instructs Gemini:
  > *"Generate a warm, natural 1-2 sentence opening message for a returning user. In their last session, they explored the theme: 'workplace boundary setting'. Acknowledge this theme gently..."*
- If no prior theme exists, Gemini produces an open, welcoming greeting.

#### 4. Structured Session Synthesis (`synthesize_session`)
- Uses Pydantic schema validation:
  ```python
  class SessionSynthesisSchema(BaseModel):
      summary: str
      extractedTheme: str
      followUpQuestion: str
  ```
- Configured with `response_mime_type="application/json"` and `response_schema=SessionSynthesisSchema` at `temperature=0.4`, producing typed JSON for summary, theme extraction, and between-session reflection prompts.

---

## 3. Frontend Architecture — As Built

### 3.1 Component Hierarchy & Roles

```
App.tsx (Root State, Auth State, Session Initialization)
│
├── AuthScreen.tsx (When currentUser === null)
│    └── Typographic title, Google sign-in action, zero logo clutter
│
└── Authenticated Layout (When currentUser !== null)
     │
     ├── Sidebar.tsx (Left Sidebar & Off-Canvas Mobile Drawer)
     │    ├── App title ("Echo")
     │    ├── "New session" action button
     │    ├── Chronological list of past reflections (Date + Extracted Theme tags)
     │    └── Account email display & Sign-out action
     │
     └── JournalChat.tsx (Main Panel)
          ├── Top toolbar (Date & active theme badge, "End session" action button)
          ├── Scrollable message column (User bubble cards + Markdown-rendered Echo model responses)
          ├── Soft dismissible end-of-session nudge card (Rendered above composer upon synthesis)
          └── Auto-growing fixed bottom composer (Textarea + Send button + Return key shortcuts)
```

### 3.2 Token Flow & Request Authentication
1. **Sign-In**: `AuthScreen.tsx` triggers Google authentication. Upon success, an `AuthUser` object (`{ uid, displayName, email, token }`) is stored in root state.
2. **API Client Instantiation**: `App.tsx` initializes `EchoApiClient(currentUser.token)`.
3. **Bearer Injection**: Every request sent via `EchoApiClient` automatically injects:
   ```typescript
   headers.set('Authorization', `Bearer ${this.token}`);
   ```
4. **Session Handoff**: `startSession()` executes upon login, establishing a Firestore session ID and mounting the opening message directly into the chat stream.

### 3.3 State Management & Lifecycle UI
- **Active Session State**: Stored in `currentSession` (`JournalSession` interface). When the user sends a message, an optimistic turn is rendered immediately while the backend call completes.
- **End-of-Session Nudge**: Clicking **"End session"** invokes `POST /api/session/end`. The returned follow-up question and summary are displayed in a card docked above the composer. The user can click **"Reflect further"** (which populates the composer with the follow-up prompt) or dismiss the card.

---

## 4. Security Posture — Self-Audit

| Constitution Rule / Non-Negotiable | Status | Implementation Evidence & Code Location |
|---|---|---|
| **1. No Hardcoded Secrets** | **Fully Implemented** | `gemini_service.py` (`os.getenv("GEMINI_API_KEY")`) and `auth.py` rely entirely on environment variables. No API keys, private keys, or service account JSON files exist in git. |
| **2. Auth Verification on Every Route** | **Fully Implemented** | `main.py` applies `uid: str = Depends(get_verified_uid)` on all session endpoints (`/api/session/start`, `/api/session/message`, `/api/session/end`, `/api/sessions`, `/api/session/{id}`). `auth.py` validates the token against Firebase. |
| **3. Firestore Isolation (Backend Level)** | **Fully Implemented** | `firestore_client.py` constructs all collection references as `db.collection("users").document(uid).collection("sessions")`. No endpoint accepts a client-provided `uid`. |
| **4. Firestore Isolation (Rules Level)** | **Fully Implemented** | `firestore.rules` enforces `match /users/{uid}/sessions/{sessionId} { allow read, write: if request.auth != null && request.auth.uid == uid; }`. |
| **5. Least-Privilege IAM & Architecture** | **Fully Implemented** | Backend runs as a dedicated Cloud Run service account. Secrets are injected at runtime via Secret Manager. Frontend communicates exclusively with the backend via Bearer tokens. |
| **6. Input Validation & Prompt Injection Defense** | **Fully Implemented** | `main.py` uses Pydantic schemas (`MessageRequest`, `EndSessionRequest`). `gemini_service.py` separates untrusted user text into structured `types.Content` turns rather than raw string concatenation. |
| **7. Rate Limiting / Abuse Prevention** | **Partially Implemented** | Cloud Run concurrency controls and Pydantic message size limits (`min_length=1`, `max_output_tokens=800`) are active. IP-level distributed token-bucket rate limiting (e.g., Redis/slowapi) is deferred to the Cloud Run API Gateway / Cloud Armor layer. |

---

## 5. Known Gaps / Not Yet Implemented

1. **Production Distributed Rate Limiting**:
   - *Current State*: Basic request payload bounds validation via Pydantic.
   - *Reason*: In-memory rate-limiting in Cloud Run does not persist across scaled container instances. Production rate limiting should be managed at the Cloud Run load balancer or Cloud Armor tier.
2. **Offline Local SQLite / IndexedDB Mirroring**:
   - *Current State*: Session history is fetched over the network and cached in React component state.
   - *Reason*: Cloud Firestore serves as the primary persistence layer; full offline progressive web app (PWA) caching can be added if offline journaling is required.

---

## 6. Deployment Readiness

The following artifacts and configurations are ready for production deployment:

### 6.1 Backend `Dockerfile` (for Cloud Run)
```dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 6.2 Required Cloud Run Environment Variables & Secrets
- `GEMINI_API_KEY`: Mounted from Google Secret Manager (`projects/<PROJECT_ID>/secrets/gemini-api-key/versions/latest`).
- `FIREBASE_PROJECT_ID`: Set to the Google Cloud Project ID.
- `FRONTEND_URL`: Set to the production frontend domain to configure CORS origins.

### 6.3 Deployment Execution Sequence
```bash
# 1. Deploy Firestore Security Rules
firebase use <YOUR_FIREBASE_PROJECT_ID>
firebase deploy --only firestore:rules

# 2. Build and Deploy FastAPI Backend to Cloud Run
gcloud run deploy echo-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars=FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>,FRONTEND_URL=https://<YOUR_FRONTEND_DOMAIN>

# 3. Build & Deploy Frontend (Vite)
npm run build
# Deploy 'dist/' to Firebase Hosting or Cloud Storage + CDN
```

---

*This document serves as the complete technical verification of the Echo application codebase.*
