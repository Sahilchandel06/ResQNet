"""
analyzer.py — Unified emergency analysis: Gemini for NLP + local ML for scoring.

Gemini handles:  keyword extraction, summary, location, suggested action
ML models handle: emergency classification (category) and priority scoring
"""

import google.generativeai as genai
import json
import os
from dotenv import load_dotenv
from ml_scorer import score_with_ml

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))


async def analyze_emergency(transcript: str) -> dict:
    """
    Two-stage analysis:
      1. Gemini extracts keywords, summary, location, suggested_action,
         and an initial emergency_type hint.
      2. Local ML models score priority and category using the transcript,
         cross-referenced with Gemini's category hint for confidence adjustment.

    Returns a merged dict with ML-derived scores overriding Gemini's.
    """

    def fallback_gemini() -> dict:
        return {
            "emergency_type": "other",
            "location": None,
            "summary": transcript[:100],
            "suggested_action": "Dispatch nearest volunteer",
            "keywords_detected": [],
        }

    # ── Stage 1: Gemini — NLP extraction ──────────────────────────────
    prompt = f"""
You are an emergency dispatcher AI. Analyze this transcript.
Return ONLY valid JSON, no markdown, no explanation.

Transcript:
{transcript}

Return exactly:
{{
  "emergency_type": "medical|fire|accident|crime|missing_person|other",
  "location": "extracted location or null",
  "summary": "one sentence max",
  "suggested_action": "what responder should do immediately",
  "keywords_detected": ["keyword1", "keyword2"]
}}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        gemini_result = json.loads(text.strip())
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        gemini_result = fallback_gemini()

    # ── Stage 2: Local ML — scoring ──────────────────────────────────
    gemini_category = gemini_result.get("emergency_type", "other")
    ml_result = score_with_ml(transcript, gemini_category)

    # ── Merge: Gemini NLP + ML scores ────────────────────────────────
    return {
        # From Gemini (NLP extraction)
        "location": gemini_result.get("location"),
        "summary": gemini_result.get("summary", transcript[:100]),
        "suggested_action": gemini_result.get("suggested_action", "Dispatch nearest responder"),
        "keywords_detected": gemini_result.get("keywords_detected", []),
        # From ML models (credible scoring) — these OVERRIDE Gemini's values
        "emergency_type": ml_result["ml_category"],
        "priority": ml_result["ml_priority"],
        "confidence": ml_result["confidence"],
        # Full ML detail for debugging / transparency
        "ml_detail": {
            "gemini_category_hint": gemini_category,
            "category_probability": ml_result["category_probability"],
            "priority_probability": ml_result["priority_probability"],
        },
    }
