"""
backend_client.py — Submits resqnet-call analysis to the backend SOS route.

Maps the unified analysis JSON (Gemini NLP + ML scores) + caller info
to the backend's expected schema and POSTs to POST /api/sos with retry logic.

The ML model's priority, category, and confidence are used instead of Gemini's.
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

# Map ML model category labels → backend SOS type enum
ML_CATEGORY_MAP = {
    "medical": "Medical",
    "fire": "Fire",
    "accident": "Accident",
    "crime": "Crime",
    "missing_person": "Disaster",
    "other": "Other",
}

# Map ML model priority labels → backend SOS priority enum
ML_PRIORITY_MAP = {
    "critical": "Critical",
    "high": "High",
    "moderate": "High",
    "medium": "Medium",
    "low": "Low",
}

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


def _map_type(ml_category: str) -> str:
    """Convert ML model category to the backend's type enum."""
    return ML_CATEGORY_MAP.get(ml_category.lower().strip(), "Other")


def _map_priority(ml_priority: str) -> str:
    """Convert ML model priority to the backend's priority enum."""
    return ML_PRIORITY_MAP.get(ml_priority.lower().strip(), "Medium")


def build_payload(
    analysis: dict,
    caller: str,
    transcript: str,
    location: str = "",
    source_request_key: str = "",
) -> dict:
    """
    Build the payload the backend's POST /api/sos route expects.

    Fields sent:
      name            – "ResQNet-Call (<caller phone>)"
      message         – the user's actual spoken words
      type            – mapped from the ML model's category
      location        – from the caller's speech or Gemini extraction
      priority        – mapped from the ML model's priority
      analysisSummary – Gemini summary + ML confidence + keywords
      suspicious      – True if ML confidence is very low
    """
    # Resolve location: caller's speech first, fallback to Gemini extraction
    resolved_location = location.strip() if location else (analysis.get("location") or "")

    # Build a rich analysis summary from Gemini + ML data
    summary = analysis.get("summary", "")
    confidence = analysis.get("confidence", 0.0)
    keywords = analysis.get("keywords_detected", [])
    ml_detail = analysis.get("ml_detail", {})

    summary_parts = []
    if summary:
        summary_parts.append(summary)
    summary_parts.append(f"ML Confidence: {confidence:.1%}")
    if keywords:
        summary_parts.append(f"Keywords: {', '.join(keywords)}")
    if ml_detail.get("gemini_category_hint"):
        summary_parts.append(f"Gemini hint: {ml_detail['gemini_category_hint']}")

    analysis_summary = " | ".join(summary_parts)

    # Flag as suspicious if ML confidence is very low
    suspicious = confidence < 0.3

    return {
        "name": f"ResQNet-Call ({caller})",
        "message": transcript,
        "type": _map_type(analysis.get("emergency_type", "other")),
        "location": resolved_location,
        "priority": _map_priority(analysis.get("priority", "moderate")),
        "analysisSummary": analysis_summary,
        "suspicious": suspicious,
        "keywords": keywords,
        "mlScores": {
            "confidence": confidence,
            "mlCategory": analysis.get("emergency_type", ""),
            "mlPriority": analysis.get("priority", ""),
            "geminiCategoryHint": ml_detail.get("gemini_category_hint", ""),
            "categoryProbability": ml_detail.get("category_probability", {}),
            "priorityProbability": ml_detail.get("priority_probability", {}),
        },
        "sourceRequestKey": source_request_key.strip(),
    }


async def submit_to_backend(
    analysis: dict,
    caller: str,
    transcript: str,
    location: str = "",
    source_request_key: str = "",
) -> bool:
    """
    POST the mapped payload to the backend's /api/sos route.

    Retries up to MAX_RETRIES times with exponential backoff.
    Returns True on success, False on failure (never raises).
    """
    payload = build_payload(
        analysis,
        caller,
        transcript,
        location,
        source_request_key,
    )
    url = f"{BACKEND_URL}/api/sos"

    print(f"\n📤 Backend payload: {payload}\n")

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)

            if response.status_code in {200, 201}:
                data = response.json()
                sos_id = data.get("sos", {}).get("sequenceId", "?")
                print(
                    f"✅ SOS submitted to backend successfully "
                    f"(sequenceId: {sos_id}, attempt {attempt}/{MAX_RETRIES})"
                )
                return True

            print(
                f"⚠️  Backend returned {response.status_code}: "
                f"{response.text[:200]} (attempt {attempt}/{MAX_RETRIES})"
            )
            return False

        except Exception as e:
            print(
                f"❌ Backend POST failed (attempt {attempt}/{MAX_RETRIES}): {e}"
            )

        if attempt < MAX_RETRIES:
            wait = RETRY_BACKOFF_BASE ** attempt
            print(f"   Retrying in {wait}s...")
            await asyncio.sleep(wait)

    print("❌ All retry attempts exhausted. SOS was NOT submitted to backend.")
    return False
