import os
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from fastapi import HTTPException, status

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger("echo.gemini")
logging.basicConfig(level=logging.INFO)

# Model configuration with environment variable override
def get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

DEFAULT_MODEL = get_model_name()

_client: Optional[genai.Client] = None

def get_gemini_client() -> genai.Client:
    """
    Initializes and returns the Google GenAI client, backed by Vertex AI
    (Gemini Enterprise Agent Platform) rather than the AI Studio API-key path.

    Auth is via Application Default Credentials (ADC) - locally via
    `gcloud auth application-default login`, and automatically via the
    attached service account on Cloud Run. Billing is against the GCP
    project's Cloud Billing account (and any linked trial credit), not
    the separate AI-Studio "prepay" wallet used by GEMINI_API_KEY.

    Requires GOOGLE_CLOUD_PROJECT (or VERTEX_PROJECT_ID) and, optionally,
    VERTEX_LOCATION (defaults to us-central1) to be set in the environment.
    Satisfies Non-Negotiable #1 (no hardcoded secrets) & Non-Negotiable #5 (least privilege).
    """
    global _client
    if _client is not None:
        return _client

    project_id = os.getenv("VERTEX_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) environment variable is not configured on the server."
        )
    location = os.getenv("VERTEX_LOCATION", "us-central1")

    _client = genai.Client(vertexai=True, project=project_id, location=location)
    return _client

ECHO_SYSTEM_INSTRUCTION = """You are Echo, an empathetic, perceptive, and grounded personal AI journal companion.
Your purpose is to help the user explore their thoughts, reflect on experiences, structure brainstorms, and untangle complex decisions.

Guidelines:
1. Active & Empathetic Reflection: Listen closely, reflect back core sentiments, and validate authentic perspectives.
2. No Platitudes or Preachiness: Avoid unsolicited generic advice, toxic positivity, or patronizing motivational quotes.
3. Thought-Provoking Inquiry: End your responses with one insightful, open-ended question to help the user dive deeper into their feelings, assumptions, or actionable priorities.
4. Tone & Style: Warm, calm, conversational, and reflective. Keep responses concise (typically 2 to 3 focused paragraphs). Use clear, natural markdown formatting when helpful.
"""

class SessionSynthesisSchema(BaseModel):
    summary: str = Field(
        ...,
        description="A thoughtful, cohesive 2-4 sentence narrative summarizing what the user explored, felt, or realized during this session."
    )
    extractedTheme: str = Field(
        ...,
        description="A concise 2-5 word thematic tag representing the core subject or emotional thread (e.g. 'work-life balance boundaries', 'decision paralysis on relocation', 'creative project momentum')."
    )
    followUpQuestion: str = Field(
        ...,
        description="A forward-looking, open-ended reflective question for the user to ponder between now and their next session."
    )

def generate_opening_prompt(previous_theme: Optional[str] = None) -> str:
    """
    Generates the opening message for a new journal session.
    
    - Next-session callback (§3.5 B): If a previous theme exists, calls Gemini to reference it.
    - Generic warm opener: Returns an instant warm greeting to eliminate session start latency.
    """
    if not previous_theme or not previous_theme.strip():
        return "Welcome to Echo. This is your private space to reflect, untangle thoughts, or brainstorm. What's on your mind today?"

    client = get_gemini_client()
    model_name = get_model_name()
    
    user_prompt = f"""Generate a warm, natural 1-2 sentence opening message for a returning user.
In their last session, they explored the theme: "{previous_theme.strip()}".
Acknowledge this theme gently (e.g. "Last time we touched on {previous_theme.strip()} — how has that been sitting with you, or is there something fresh on your mind today?").
Do not be intrusive or forceful; invite them to either continue that thread or explore whatever is present for them now."""

    print(f"[Gemini API Call] Invoking model '{model_name}' for opening prompt (previous_theme={previous_theme!r})...")
    logger.info(f"Invoking Gemini model {model_name} for opening prompt (theme={previous_theme})")

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=ECHO_SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=150,
            ),
        )
        if response.text and response.text.strip():
            print(f"[Gemini API Response] Received opening prompt from {model_name}.")
            return response.text.strip()
    except Exception as e:
        print(f"[Gemini API Error] Error calling Gemini for opening prompt: {e}")
        return f"Welcome back! Last time you were reflecting on '{previous_theme}'. How is that sitting with you today, or is there a fresh thought on your mind?"

    return f"Welcome back! Last time we were exploring '{previous_theme}'. What would you like to reflect on today?"

def generate_conversation_turn(messages: List[Dict[str, Any]]) -> str:
    """
    Generates a conversational response from Gemini given the full session history.
    
    - Full Conversation History (§3.2): Converts Firestore message list to Gemini Content turns
      so multi-turn context remains coherent.
    - Untrusted Input (§7 #4): Message texts are structured as user/model content turns.
    """
    client = get_gemini_client()
    model_name = get_model_name()
    
    contents: List[types.Content] = []
    
    for msg in messages:
        role = msg.get("role")
        text = msg.get("text", "")
        if not text:
            continue
            
        sdk_role = "user" if role == "user" else "model"
        
        contents.append(
            types.Content(
                role=sdk_role,
                parts=[types.Part.from_text(text=text)]
            )
        )
        
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate response from empty message history."
        )

    print(f"[Gemini API Call] Invoking model '{model_name}' for conversation turn with {len(contents)} multi-turn history items...")
    logger.info(f"Invoking Gemini model {model_name} for conversation turn (turn count: {len(contents)})")

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=ECHO_SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=1000,
            ),
        )
        
        if response.text and response.text.strip():
            print(f"[Gemini API Response] Received conversation reply from {model_name}.")
            return response.text.strip()
        else:
            return "I'm listening closely. Could you tell me more about how that is affecting you right now?"
            
    except Exception as e:
        print(f"[Gemini API Error] Error calling Gemini for conversation turn: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini AI generation error: {str(e)}"
        )

def synthesize_session(messages: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Item 4: Gemini Session Synthesis (§3.4 & §3.5).
    
    Analyzes the complete session transcript and generates structured JSON output:
    1. summary: A warm, clear, 2-4 sentence synthesis of what the user discussed.
    2. extractedTheme: A concise 2-5 word thematic tag (for the next-session callback).
    3. followUpQuestion: A thoughtful, open-ended question for between-session reflection.
    """
    client = get_gemini_client()
    model_name = get_model_name()
    
    # Format the session transcript into readable text for analysis
    transcript_lines = []
    for msg in messages:
        speaker = "User" if msg.get("role") == "user" else "Echo"
        text = msg.get("text", "").strip()
        if text:
            transcript_lines.append(f"{speaker}: {text}")
            
    transcript_text = "\n\n".join(transcript_lines)
    if not transcript_text:
        return {
            "summary": "Short reflection session without extensive dialogue.",
            "extractedTheme": "general personal reflection",
            "followUpQuestion": "What is one insight you would like to carry forward into tomorrow?"
        }

    synthesis_prompt = f"""You are analyzing a completed journal session between a user and Echo.
Transcript of the session:
\"\"\"
{transcript_text}
\"\"\"

Analyze the transcript and generate JSON with:
1. `summary`: A compassionate, objective 2-4 sentence narrative capturing the core thoughts, tensions, realizations, or plans the user explored.
2. `extractedTheme`: A short 2-5 word lowercase theme tag that encapsulates the core topic/emotional thread (e.g. 'work boundary setting', 'career transition doubts', 'restoring creative energy').
3. `followUpQuestion`: A single forward-looking, open-ended question that gently invites the user to notice how this unfolds in their daily life before their next session."""

    print(f"[Gemini API Call] Invoking model '{model_name}' for session synthesis ({len(messages)} messages)...")
    logger.info(f"Invoking Gemini model {model_name} for session synthesis")

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=synthesis_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SessionSynthesisSchema,
                temperature=0.3,
                max_output_tokens=1000,
            ),
        )
        
        raw_text = (response.text or "").strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        parsed = json.loads(raw_text)
        print(f"[Gemini API Response] Successfully synthesized session with {model_name}: theme='{parsed.get('extractedTheme')}'")
        
        return {
            "summary": parsed.get("summary", "Reflective conversation exploring personal thoughts and experiences.").strip(),
            "extractedTheme": parsed.get("extractedTheme", "personal reflection").strip(),
            "followUpQuestion": parsed.get("followUpQuestion", "What is one thought or feeling from today's session you want to stay mindful of?").strip()
        }
    except Exception as e:
        print(f"[Gemini API Error] Error synthesizing session with Gemini: {e}")
        # Fallback structured synthesis
        return {
            "summary": "The user explored recent experiences and reflections to gain clarity.",
            "extractedTheme": "personal reflection and growth",
            "followUpQuestion": "How does reflecting on this situation change how you want to approach it tomorrow?"
        }