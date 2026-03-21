import google.generativeai as genai
import json
import os
from dotenv import load_dotenv
load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

async def analyze_emergency(transcript: str) -> dict:
    def fallback_response() -> dict:
        return {
            "emergency_type": "other",
            "priority": "moderate",
            "location": None,
            "summary": transcript[:100],
            "suggested_action": "Dispatch nearest volunteer",
            "confidence": 0.5,
            "keywords_detected": []
        }

    prompt = f"""
You are an emergency dispatcher AI. Analyze this transcript.
Return ONLY valid JSON, no markdown, no explanation.

Transcript:
{transcript}

Return exactly:
{{
  "emergency_type": "medical|fire|accident|crime|missing_person|other",
  "priority": "critical|moderate|low",
  "location": "extracted location or null",
  "summary": "one sentence max",
  "suggested_action": "what responder should do immediately",
  "confidence": 0.95,
  "keywords_detected": ["keyword1", "keyword2"]
}}
"""
    try:
        response = model.generate_content(prompt)
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return fallback_response()

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return fallback_response()
