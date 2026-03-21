from fastapi import FastAPI, Form
from fastapi.responses import PlainTextResponse
from transcriber import transcribe_url
from analyzer import analyze_emergency
from backend_client import submit_to_backend
import json

app = FastAPI()

call_data = {}

@app.post("/twilio/incoming", response_class=PlainTextResponse)
async def incoming(CallSid: str = Form(...)):
    call_data[CallSid] = {}
    return '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/twilio/got-emergency" timeout="5" speechTimeout="auto" language="en-IN">
    <Say voice="Polly.Aditi">Welcome to ResQNet. Please describe your emergency now.</Say>
  </Gather>
</Response>'''

@app.post("/twilio/got-emergency", response_class=PlainTextResponse)
async def got_emergency(CallSid: str = Form(...), SpeechResult: str = Form("")):
    call_data.setdefault(CallSid, {})
    call_data[CallSid]["emergency"] = SpeechResult
    return '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/twilio/got-location" timeout="5" speechTimeout="auto" language="en-IN">
    <Say voice="Polly.Aditi">Thank you. What is your location or nearest landmark?</Say>
  </Gather>
</Response>'''

@app.post("/twilio/got-location", response_class=PlainTextResponse)
async def got_location(CallSid: str = Form(...), SpeechResult: str = Form("")):
    call_data.setdefault(CallSid, {})
    call_data[CallSid]["location"] = SpeechResult
    return '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Got it. Please describe anything else. We are recording. Press star when finished.</Say>
    <Record action="/twilio/complete" maxLength="15" timeout="3" finishOnKey="*" playBeep="true" trim="trim-silence"/>
</Response>'''

@app.post("/twilio/complete", response_class=PlainTextResponse)
async def complete(
    CallSid: str = Form(...),
    RecordingUrl: str = Form(...),
    From: str = Form(...)
):
    try:
        emergency = call_data.get(CallSid, {}).get("emergency", "")
        location  = call_data.get(CallSid, {}).get("location", "")

        full_transcript = await transcribe_url(RecordingUrl)

        combined = f"Emergency: {emergency}\nLocation: {location}\nFull message: {full_transcript}"

        analysis = await analyze_emergency(combined)

        print("\n========== RESQNET CALL RESULT ==========")
        print(f"Caller: {From}")
        print(f"Transcript: {combined}")
        print(f"Analysis:\n{json.dumps(analysis, indent=2)}")
        print(f"  → ML Category:  {analysis.get('emergency_type')}")
        print(f"  → ML Priority:  {analysis.get('priority')}")
        print(f"  → ML Confidence: {analysis.get('confidence')}")
        print("==========================================\n")

        # Build the raw user message from speech parts (no prefixes)
        raw_message = full_transcript.strip() or emergency.strip()
        raw_location = location.strip()

        # Auto-submit to backend (never breaks the Twilio response)
        try:
            await submit_to_backend(analysis, From, raw_message, raw_location)
        except Exception as be:
            print(f"⚠️  Backend submission error (non-fatal): {be}")

        return '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Thank you. Help is being coordinated. Please stay safe.</Say>
</Response>'''
    
    except Exception as e:
        print(f"\n❌ ERROR IN /twilio/complete: {e}")
        return '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Sorry, there was an error processing your call. Please try again.</Say>
</Response>'''
    
    finally:
        call_data.pop(CallSid, None)

@app.get("/health")
async def health_check():
    """Health check endpoint for ngrok and monitoring"""
    return {
        "status": "healthy",
        "service": "ResQNet Emergency Dispatcher",
        "version": "2.0.0",
        "pipeline": "Gemini NLP + Local ML Scoring",
    }


@app.get("/test/gemini")
async def test_gemini():
    """Test the unified Gemini + ML pipeline without Twilio"""
    test_transcript = """
    Emergency: I had a car accident near Alkapuri Circle, 
    someone is bleeding badly and unconscious. 
    Location: Alkapuri Circle, Vadodara near the petrol pump.
    """
    
    try:
        analysis = await analyze_emergency(test_transcript)
        
        print("\n========== RESQNET UNIFIED TEST RESULT ==========")
        print(f"Transcript: {test_transcript}")
        print(f"Analysis:\n{json.dumps(analysis, indent=2)}")
        print(f"  → ML Category:  {analysis.get('emergency_type')}")
        print(f"  → ML Priority:  {analysis.get('priority')}")
        print(f"  → ML Confidence: {analysis.get('confidence')}")
        print("=================================================\n")

        # Auto-submit test result to backend
        backend_ok = await submit_to_backend(analysis, "test-gemini", test_transcript, analysis.get("location", ""))
        
        return {
            "status": "success",
            "test": "unified_gemini_ml_pipeline",
            "transcript": test_transcript,
            "analysis": analysis,
            "backend_submitted": backend_ok
        }
    except Exception as e:
        print(f"\n❌ Error in unified test: {e}")
        return {
            "status": "error",
            "test": "unified_gemini_ml_pipeline",
            "error": str(e)
        }


@app.post("/test/analyze")
async def test_analyze_manual(transcript: str):
    """Manual test endpoint - send custom transcript for unified analysis"""
    try:
        analysis = await analyze_emergency(transcript)
        
        print("\n========== RESQNET MANUAL TEST RESULT ==========")
        print(f"Transcript: {transcript}")
        print(f"Analysis:\n{json.dumps(analysis, indent=2)}")
        print(f"  → ML Category:  {analysis.get('emergency_type')}")
        print(f"  → ML Priority:  {analysis.get('priority')}")
        print(f"  → ML Confidence: {analysis.get('confidence')}")
        print("================================================\n")

        # Auto-submit manual test result to backend
        backend_ok = await submit_to_backend(analysis, "test-manual", transcript, analysis.get("location", ""))
        
        return {
            "status": "success",
            "test": "manual_unified_analysis",
            "transcript": transcript,
            "analysis": analysis,
            "backend_submitted": backend_ok
        }
    except Exception as e:
        print(f"\n❌ Error in manual test: {e}")
        return {
            "status": "error",
            "test": "manual_unified_analysis",
            "error": str(e)
        }


@app.get("/test")
async def test():
    """Legacy test endpoint - simulates complete emergency flow with ML scoring"""
    test_transcript = """
    Emergency: I had a car accident near Alkapuri Circle, 
    someone is bleeding badly and unconscious. 
    Location: Alkapuri Circle, Vadodara near the petrol pump.
    """
    
    try:
        analysis = await analyze_emergency(test_transcript)
        
        print("\n========== RESQNET TEST RESULT ==========")
        print(f"Transcript: {test_transcript}")
        print(f"Analysis:\n{json.dumps(analysis, indent=2)}")
        print(f"  → ML Category:  {analysis.get('emergency_type')}")
        print(f"  → ML Priority:  {analysis.get('priority')}")
        print(f"  → ML Confidence: {analysis.get('confidence')}")
        print("=========================================\n")

        # Auto-submit legacy test result to backend
        await submit_to_backend(analysis, "test-legacy", test_transcript, analysis.get("location", ""))
        
        return analysis
    except Exception as e:
        print(f"\n❌ Error in test: {e}")
        return {
            "status": "error",
            "error": str(e)
        }
