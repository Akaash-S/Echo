import os
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from fastapi import HTTPException, status

_client: Optional[genai.Client] = None

def get_gemini_client() -> genai.Client:
    """
    Initializes and returns the Google GenAI client in Python.
    
    Reads GEMINI_API_KEY from environment variables (populated via Secret Manager on Cloud Run).
    Satisfies Non-Negotiable #1 (no hardcoded secrets) & Non-Negotiable #5 (least privilege).
    """
    global _client
    if _client is not None:
        return _client
        
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is not configured on the server."
        )
        
    _client = genai.Client(api_key=api_key)
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
    
    - Next-session callback (§3.5 B): If a previous theme exists, references it naturally.
    - Generic warm opener: If no previous theme exists (first session), invites open reflection.
    """
    client = get_gemini_client()
    
    if previous_theme and previous_theme.strip():
        user_prompt = f"""Generate a warm, natural 1-2 sentence opening message for a returning user.
In their last session, they explored the theme: "{previous_theme.strip()}".
Acknowledge this theme gently (e.g. "Last time we touched on {previous_theme.strip()} — how has that been sitting with you, or is there something fresh on your mind today?").
Do not be intrusive or forceful; invite them to either continue that thread or explore whatever is present for them now."""
    else:
        user_prompt = """Generate a warm, inviting 1-2 sentence opening greeting welcoming the user to their journaling session.
Invite them to share whatever thought, feeling, idea, or challenge is taking up space in their mind today without pressure."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=ECHO_SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=250,
            ),
        )
        if response.text and response.text.strip():
            return response.text.strip()
    except Exception as e:
        print(f"Error calling Gemini for opening prompt: {e}")
        if previous_theme:
            return f"Welcome back! Last time you were reflecting on '{previous_theme}'. How is that sitting with you today, or is there a fresh thought on your mind?"
        return "Welcome to Echo. This is your private space to reflect, untangle thoughts, or brainstorm. What's on your mind today?"

    return "Welcome to Echo. What's on your mind today?"

def generate_conversation_turn(messages: List[Dict[str, Any]]) -> str:
    """
    Generates a conversational response from Gemini given the full session history.
    
    - Full Conversation History (§3.2): Converts Firestore message list to Gemini Content turns
      so multi-turn context remains coherent.
    - Untrusted Input (§7 #4): Message texts are structured as user/model content turns.
    """
    client = get_gemini_client()
    
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

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=ECHO_SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=800,
            ),
        )
        
        if response.text and response.text.strip():
            return response.text.strip()
        else:
            return "I'm listening closely. Could you tell me more about how that is affecting you right now?"
            
    except Exception as e:
        print(f"Error calling Gemini for conversation turn: {e}")
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

Please analyze the transcript and generate:
1. `summary`: A compassionate, objective 2-4 sentence narrative capturing the core thoughts, tensions, realizations, or plans the user explored.
2. `extractedTheme`: A short 2-5 word lowercase theme tag that encapsulates the core topic/emotional thread (e.g. 'work boundary setting', 'career transition doubts', 'restoring creative energy').
3. `followUpQuestion`: A single forward-looking, open-ended question that gently invites the user to notice how this unfolds in their daily life before their next session."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=synthesis_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SessionSynthesisSchema,
                temperature=0.4,
                max_output_tokens=600,
            ),
        )
        
        raw_text = response.text or ""
        parsed = json.loads(raw_text)
        
        return {
            "summary": parsed.get("summary", "Reflective conversation exploring personal thoughts and experiences.").strip(),
            "extractedTheme": parsed.get("extractedTheme", "personal reflection").strip(),
            "followUpQuestion": parsed.get("followUpQuestion", "What is one thought or feeling from today's session you want to stay mindful of?").strip()
        }
    except Exception as e:
        print(f"Error synthesizing session with Gemini: {e}")
        # Fallback structured synthesis
        return {
            "summary": "The user explored recent experiences and reflections to gain clarity.",
            "extractedTheme": "personal reflection and growth",
            "followUpQuestion": "How does reflecting on this situation change how you want to approach it tomorrow?"
        }
