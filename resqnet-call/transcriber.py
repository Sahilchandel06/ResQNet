import os
import tempfile

import httpx
import whisper
from dotenv import load_dotenv

load_dotenv()

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
_model = None


def get_model():
    global _model
    if _model is None:
        _model = whisper.load_model(WHISPER_MODEL_NAME)
    return _model


async def download_recording(client: httpx.AsyncClient, recording_url: str, auth) -> bytes:
    candidate_urls = [recording_url + ".mp3", recording_url]

    for candidate_url in candidate_urls:
        try:
            response = await client.get(candidate_url, auth=auth)
            response.raise_for_status()
            return response.content
        except httpx.HTTPError:
            continue

    raise RuntimeError("Unable to download recording from Twilio.")


async def transcribe_url(recording_url: str) -> str:
    """Transcribe audio from a URL with error handling."""
    tmp_path = None
    try:
        auth = (os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        async with httpx.AsyncClient(timeout=30.0) as client:
            recording_bytes = await download_recording(client, recording_url, auth)

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as file_handle:
            file_handle.write(recording_bytes)
            tmp_path = file_handle.name

        result = get_model().transcribe(tmp_path, fp16=False, language="en")
        return result["text"]
    except Exception as error:
        print(f"ERROR Transcription error: {error}")
        return f"[Unable to transcribe: {str(error)[:50]}]"
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
