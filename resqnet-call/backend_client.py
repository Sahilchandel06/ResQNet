"""
backend_client.py - Submit resqnet-call analysis to the backend SOS route.
"""

import asyncio
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

ML_CATEGORY_MAP = {
    "medical": "Medical",
    "fire": "Fire",
    "accident": "Accident",
    "crime": "Crime",
    "missing_person": "Disaster",
    "other": "Other",
}

ML_PRIORITY_MAP = {
    "critical": "Critical",
    "high": "High",
    "moderate": "High",
    "medium": "Medium",
    "low": "Low",
}

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2


def _map_type(ml_category: str) -> str:
    return ML_CATEGORY_MAP.get(ml_category.lower().strip(), "Other")


def _map_priority(ml_priority: str) -> str:
    return ML_PRIORITY_MAP.get(ml_priority.lower().strip(), "Medium")


def build_payload(
    analysis: dict,
    caller: str,
    transcript: str,
    location: str = "",
    source_request_key: str = "",
) -> dict:
    resolved_location = location.strip() if location else (analysis.get("location") or "")

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
    payload = build_payload(
        analysis,
        caller,
        transcript,
        location,
        source_request_key,
    )
    url = f"{BACKEND_URL}/api/sos"

    print(f"\nBackend payload: {payload}\n")

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)

            if response.status_code in {200, 201}:
                data = response.json()
                sos_id = data.get("sos", {}).get("sequenceId", "?")
                print(
                    f"SUCCESS SOS submitted to backend successfully "
                    f"(sequenceId: {sos_id}, attempt {attempt}/{MAX_RETRIES})"
                )
                return True

            print(
                f"WARNING Backend returned {response.status_code}: "
                f"{response.text[:200]} (attempt {attempt}/{MAX_RETRIES})"
            )
            return False

        except Exception as error:
            print(
                f"ERROR Backend POST failed (attempt {attempt}/{MAX_RETRIES}): {error}"
            )

        if attempt < MAX_RETRIES:
            wait = RETRY_BACKOFF_BASE ** attempt
            print(f"Retrying in {wait}s...")
            await asyncio.sleep(wait)

    print("ERROR All retry attempts exhausted. SOS was NOT submitted to backend.")
    return False
