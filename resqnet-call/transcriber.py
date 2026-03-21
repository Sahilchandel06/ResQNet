import whisper
import httpx
import tempfile
import os
from dotenv import load_dotenv
load_dotenv()

model = whisper.load_model("base")

async def transcribe_url(recording_url: str) -> str:
    """Transcribe audio from URL with error handling"""
    tmp_path = None
    try:
        auth = (os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        async with httpx.AsyncClient() as client:
            r = await client.get(recording_url + ".mp3", auth=auth)
        
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(r.content)
            tmp_path = f.name
        
        result = model.transcribe(tmp_path, fp16=False, language="en")
        return result["text"]
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        return f"[Unable to transcribe: {str(e)[:50]}]"
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
