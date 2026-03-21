"""
backend_client.py — Submits resqnet-call analysis to the backend SOS route.

Maps the Gemini analysis JSON + caller info to the backend's expected
{name, message, type} schema and POSTs to POST /api/sos with retry logic.
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

# Map resqnet-call emergency_type → backend SOS type enum
EMERGENCY_TYPE_MAP = {
    "medical": "Medical",
    "fire": "Fire",
    "accident": "Accident",
    "crime": "Crime",
    "missing_person": "Disaster",
    "other": "Other",
}

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


def _map_type(emergency_type: str) -> str:
    """Convert Gemini emergency_type to the backend's type enum."""
    return EMERGENCY_TYPE_MAP.get(emergency_type.lower().strip(), "Other")


def build_payload(analysis: dict, caller: str, transcript: str, location: str = "") -> dict:
    """
    Build the payload the backend's POST /api/sos route expects.

    The backend only accepts: name, message, type, location.
    - name:     "ResQNet-Call (<caller phone>)" to identify automated entries
    - message:  the user's actual spoken words only — nothing else
    - type:     mapped from the Gemini emergency_type to the backend enum
    - location: from the caller's speech or Gemini extraction
    """
    # Use the provided location first, fall back to Gemini's extraction
    resolved_location = location.strip() if location else (analysis.get("location") or "")

    return {
        "name": f"ResQNet-Call ({caller})",
        "message": transcript,
        "type": _map_type(analysis.get("emergency_type", "other")),
        "location": resolved_location,
    }


async def submit_to_backend(
    analysis: dict, caller: str, transcript: str, location: str = ""
) -> bool:
    """
    POST the mapped payload to the backend's /api/sos route.

    Retries up to MAX_RETRIES times with exponential backoff.
    Returns True on success, False on failure (never raises).
    """
    payload = build_payload(analysis, caller, transcript, location)
    url = f"{BACKEND_URL}/api/sos"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)

            if response.status_code == 201:
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
