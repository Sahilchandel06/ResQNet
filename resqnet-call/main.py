from fastapi import BackgroundTasks, FastAPI, Form
from fastapi.responses import PlainTextResponse
from transcriber import transcribe_url
from analyzer import analyze_emergency
from backend_client import submit_to_backend
import json

app = FastAPI()

call_data = {}
active_submissions = set()
completed_submissions = set()
active_call_sid = None

STAGE_AWAITING_EMERGENCY = "awaiting_emergency"
STAGE_AWAITING_LOCATION = "awaiting_location"
STAGE_AWAITING_RECORDING = "awaiting_recording"
STAGE_COMPLETED = "completed"


def xml_response(body: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
{body}
</Response>'''


def ask_for_emergency() -> str:
    return xml_response(
        '  <Gather input="speech" action="/twilio/got-emergency" actionOnEmptyResult="true" '
        'timeout="5" speechTimeout="auto" language="en-IN">\n'
        '    <Say voice="Polly.Aditi">Welcome to ResQNet. Please describe your emergency now.</Say>\n'
        '  </Gather>\n'
        '  <Say voice="Polly.Aditi">No input received. Ending this call now.</Say>\n'
        '  <Hangup/>'
    )


def ask_for_location() -> str:
    return xml_response(
        '  <Gather input="speech" action="/twilio/got-location" actionOnEmptyResult="true" '
        'timeout="5" speechTimeout="auto" language="en-IN">\n'
        '    <Say voice="Polly.Aditi">Thank you. What is your location or nearest landmark?</Say>\n'
        '  </Gather>\n'
        '  <Say voice="Polly.Aditi">No location was received. Ending this call now.</Say>\n'
        '  <Hangup/>'
    )


def start_recording() -> str:
    return xml_response(
        '  <Say voice="Polly.Aditi">Got it. Please describe anything else. We are recording. Press star when finished.</Say>\n'
        '  <Record action="/twilio/complete" maxLength="15" timeout="3" finishOnKey="*" playBeep="true" trim="trim-silence"/>'
    )


def busy_response() -> str:
    return xml_response(
        '  <Say voice="Polly.Aditi">Another emergency call is already in progress. Please try again shortly.</Say>\n'
        '  <Hangup/>'
    )


def closing_response(message: str) -> str:
    return xml_response(
        f'  <Say voice="Polly.Aditi">{message}</Say>\n'
        '  <Hangup/>'
    )


async def process_completed_call(
    submission_key: str,
    caller: str,
    recording_url: str,
    emergency: str,
    location: str,
):
    try:
        full_transcript = await transcribe_url(recording_url)

        combined = f"Emergency: {emergency}\nLocation: {location}\nFull message: {full_transcript}"
        analysis = await analyze_emergency(combined)

        print("\n========== RESQNET CALL RESULT ==========")
        print(f"Caller: {caller}")
        print(f"Transcript: {combined}")
        print(f"Analysis:\n{json.dumps(analysis, indent=2)}")
        print(f"  → ML Category:  {analysis.get('emergency_type')}")
        print(f"  → ML Priority:  {analysis.get('priority')}")
        print(f"  → ML Confidence: {analysis.get('confidence')}")
        print("==========================================\n")

        raw_message = full_transcript.strip() or emergency.strip()
        raw_location = location.strip()

        try:
            await submit_to_backend(analysis, caller, raw_message, raw_location)
        except Exception as be:
            print(f"⚠️  Backend submission error (non-fatal): {be}")
    except Exception as e:
        print(f"\n❌ ERROR IN BACKGROUND /twilio/complete PROCESSING: {e}")
    finally:
        active_submissions.discard(submission_key)

@app.post("/twilio/incoming", response_class=PlainTextResponse)
async def incoming(CallSid: str = Form(...)):
    global active_call_sid

    if active_call_sid and active_call_sid != CallSid:
        print(f"⚠️  Incoming call {CallSid} rejected because {active_call_sid} is already active.")
        return busy_response()

    active_call_sid = CallSid
    call_data[CallSid] = {"stage": STAGE_AWAITING_EMERGENCY}
    return ask_for_emergency()

@app.post("/twilio/got-emergency", response_class=PlainTextResponse)
async def got_emergency(CallSid: str = Form(...), SpeechResult: str = Form("")):
    call_data.setdefault(CallSid, {})
    if call_data[CallSid].get("stage") not in {STAGE_AWAITING_EMERGENCY, STAGE_AWAITING_LOCATION}:
        print(f"⚠️  Ignoring repeated emergency stage for call {CallSid}")
        return closing_response("This call step was already processed. Ending the call now.")

    call_data[CallSid]["emergency"] = SpeechResult
    call_data[CallSid]["stage"] = STAGE_AWAITING_LOCATION
    return ask_for_location()

@app.post("/twilio/got-location", response_class=PlainTextResponse)
async def got_location(CallSid: str = Form(...), SpeechResult: str = Form("")):
    call_data.setdefault(CallSid, {})
    if call_data[CallSid].get("stage") not in {STAGE_AWAITING_LOCATION, STAGE_AWAITING_RECORDING}:
        print(f"⚠️  Ignoring repeated location stage for call {CallSid}")
        return closing_response("This call step was already processed. Ending the call now.")

    call_data[CallSid]["location"] = SpeechResult
    call_data[CallSid]["stage"] = STAGE_AWAITING_RECORDING
    return start_recording()

@app.post("/twilio/complete", response_class=PlainTextResponse)
async def complete(
    background_tasks: BackgroundTasks,
    CallSid: str = Form(...),
    RecordingUrl: str = Form(...),
    RecordingSid: str = Form(""),
    From: str = Form(...)
):
    global active_call_sid
    submission_key = (RecordingSid or RecordingUrl or CallSid).strip()

    if submission_key in active_submissions or submission_key in completed_submissions:
        print(f"⚠️  Duplicate /twilio/complete ignored for key: {submission_key}")
        return closing_response("Thank you. Help is being coordinated. Please stay safe.")

    active_submissions.add(submission_key)
    completed_submissions.add(submission_key)

    try:
        call_state = call_data.setdefault(CallSid, {})
        call_state["stage"] = STAGE_COMPLETED

        emergency = call_state.get("emergency", "")
        location = call_state.get("location", "")

        background_tasks.add_task(
            process_completed_call,
            submission_key,
            From,
            RecordingUrl,
            emergency,
            location,
        )

        return closing_response("Thank you. Help is being coordinated. Please stay safe.")
    
    except Exception as e:
        print(f"\n❌ ERROR IN /twilio/complete: {e}")
        active_submissions.discard(submission_key)
        completed_submissions.discard(submission_key)
        return closing_response("Sorry, there was an error processing your call. Please try again.")
    
    finally:
        call_data.pop(CallSid, None)
        if active_call_sid == CallSid:
            active_call_sid = None

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
