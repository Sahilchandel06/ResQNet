import json
import time

from fastapi import BackgroundTasks, FastAPI, Form
from fastapi.responses import Response

from analyzer import analyze_emergency
from backend_client import submit_to_backend
from transcriber import transcribe_url

app = FastAPI()

call_data = {}
active_submissions = set()
completed_submissions = {}

STAGE_AWAITING_EMERGENCY = "awaiting_emergency"
STAGE_AWAITING_LOCATION = "awaiting_location"
STAGE_AWAITING_RECORDING = "awaiting_recording"
STAGE_COMPLETED = "completed"
CALL_STATE_TTL_SECONDS = 30 * 60
COMPLETED_SUBMISSION_TTL_SECONDS = 6 * 60 * 60


def xml_response(body: str) -> Response:
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
{body}
</Response>"""
    return Response(content=xml, media_type="application/xml")


def ask_for_emergency() -> Response:
    return xml_response(
        '  <Gather input="speech" action="/twilio/got-emergency" actionOnEmptyResult="true" '
        'timeout="5" speechTimeout="auto" language="en-IN">\n'
        '    <Say voice="Polly.Aditi">Welcome to ResQNet. Please describe your emergency now.</Say>\n'
        "  </Gather>\n"
        '  <Say voice="Polly.Aditi">No input received. Ending this call now.</Say>\n'
        "  <Hangup/>"
    )


def ask_for_location() -> Response:
    return xml_response(
        '  <Gather input="speech" action="/twilio/got-location" actionOnEmptyResult="true" '
        'timeout="5" speechTimeout="auto" language="en-IN">\n'
        '    <Say voice="Polly.Aditi">Thank you. What is your location or nearest landmark?</Say>\n'
        "  </Gather>\n"
        '  <Say voice="Polly.Aditi">No location was received. Ending this call now.</Say>\n'
        "  <Hangup/>"
    )


def start_recording() -> Response:
    return xml_response(
        '  <Say voice="Polly.Aditi">Got it. Please describe anything else. We are recording. Press star when finished.</Say>\n'
        '  <Record action="/twilio/complete" maxLength="15" timeout="3" finishOnKey="*" playBeep="true" trim="trim-silence"/>'
    )


def closing_response(message: str) -> Response:
    return xml_response(
        f'  <Say voice="Polly.Aditi">{message}</Say>\n'
        "  <Hangup/>"
    )


def prune_runtime_state() -> None:
    now = time.monotonic()
    expired_calls = [
        call_sid
        for call_sid, state in call_data.items()
        if now - state.get("updated_at", now) > CALL_STATE_TTL_SECONDS
    ]
    for call_sid in expired_calls:
        call_data.pop(call_sid, None)

    expired_submissions = [
        submission_key
        for submission_key, completed_at in completed_submissions.items()
        if now - completed_at > COMPLETED_SUBMISSION_TTL_SECONDS
    ]
    for submission_key in expired_submissions:
        completed_submissions.pop(submission_key, None)


def update_call_state(call_sid: str, **updates) -> dict:
    state = call_data.setdefault(call_sid, {})
    state.update(updates)
    state["updated_at"] = time.monotonic()
    return state


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
        print(f"  -> ML Category:  {analysis.get('emergency_type')}")
        print(f"  -> ML Priority:  {analysis.get('priority')}")
        print(f"  -> ML Confidence: {analysis.get('confidence')}")
        print("==========================================\n")

        raw_message = full_transcript.strip() or emergency.strip()
        raw_location = location.strip()

        try:
            await submit_to_backend(
                analysis,
                caller,
                raw_message,
                raw_location,
                source_request_key=f"twilio:{submission_key}",
            )
        except Exception as backend_error:
            print(f"WARNING Backend submission error (non-fatal): {backend_error}")
    except Exception as error:
        print(f"\nERROR IN BACKGROUND /twilio/complete PROCESSING: {error}")
    finally:
        active_submissions.discard(submission_key)


@app.post("/twilio/incoming")
async def incoming(CallSid: str = Form(...)):
    prune_runtime_state()
    update_call_state(CallSid, stage=STAGE_AWAITING_EMERGENCY, emergency="", location="")
    return ask_for_emergency()


@app.post("/twilio/got-emergency")
async def got_emergency(CallSid: str = Form(...), SpeechResult: str = Form("")):
    prune_runtime_state()
    state = call_data.get(CallSid)
    if not state or state.get("stage") not in {STAGE_AWAITING_EMERGENCY, STAGE_AWAITING_LOCATION}:
        print(f"WARNING Ignoring repeated emergency stage for call {CallSid}")
        return closing_response("This call step was already processed. Ending the call now.")

    update_call_state(CallSid, emergency=SpeechResult, stage=STAGE_AWAITING_LOCATION)
    return ask_for_location()


@app.post("/twilio/got-location")
async def got_location(CallSid: str = Form(...), SpeechResult: str = Form("")):
    prune_runtime_state()
    state = call_data.get(CallSid)
    if not state or state.get("stage") not in {STAGE_AWAITING_LOCATION, STAGE_AWAITING_RECORDING}:
        print(f"WARNING Ignoring repeated location stage for call {CallSid}")
        return closing_response("This call step was already processed. Ending the call now.")

    update_call_state(CallSid, location=SpeechResult, stage=STAGE_AWAITING_RECORDING)
    return start_recording()


@app.post("/twilio/complete")
async def complete(
    background_tasks: BackgroundTasks,
    CallSid: str = Form(...),
    RecordingUrl: str = Form(...),
    RecordingSid: str = Form(""),
    From: str = Form(...),
):
    prune_runtime_state()
    submission_key = (RecordingSid or RecordingUrl or CallSid).strip()

    if submission_key in active_submissions or submission_key in completed_submissions:
        print(f"WARNING Duplicate /twilio/complete ignored for key: {submission_key}")
        return closing_response("Thank you. Help is being coordinated. Please stay safe.")

    active_submissions.add(submission_key)
    completed_submissions[submission_key] = time.monotonic()

    try:
        call_state = update_call_state(CallSid, stage=STAGE_COMPLETED)

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
    except Exception as error:
        print(f"\nERROR IN /twilio/complete: {error}")
        active_submissions.discard(submission_key)
        completed_submissions.discard(submission_key)
        return closing_response("Sorry, there was an error processing your call. Please try again.")
    finally:
        call_data.pop(CallSid, None)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ResQNet Emergency Dispatcher",
        "version": "2.0.0",
        "pipeline": "Gemini NLP + Local ML Scoring",
    }


@app.get("/test/gemini")
async def test_gemini():
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
        print(f"  -> ML Category:  {analysis.get('emergency_type')}")
        print(f"  -> ML Priority:  {analysis.get('priority')}")
        print(f"  -> ML Confidence: {analysis.get('confidence')}")
        print("=================================================\n")

        backend_ok = await submit_to_backend(
            analysis,
            "test-gemini",
            test_transcript,
            analysis.get("location", ""),
        )

        return {
            "status": "success",
            "test": "unified_gemini_ml_pipeline",
            "transcript": test_transcript,
            "analysis": analysis,
            "backend_submitted": backend_ok,
        }
    except Exception as error:
        print(f"\nERROR in unified test: {error}")
        return {
            "status": "error",
            "test": "unified_gemini_ml_pipeline",
            "error": str(error),
        }


@app.post("/test/analyze")
async def test_analyze_manual(transcript: str):
    try:
        analysis = await analyze_emergency(transcript)

        print("\n========== RESQNET MANUAL TEST RESULT ==========")
        print(f"Transcript: {transcript}")
        print(f"Analysis:\n{json.dumps(analysis, indent=2)}")
        print(f"  -> ML Category:  {analysis.get('emergency_type')}")
        print(f"  -> ML Priority:  {analysis.get('priority')}")
        print(f"  -> ML Confidence: {analysis.get('confidence')}")
        print("================================================\n")

        backend_ok = await submit_to_backend(
            analysis,
            "test-manual",
            transcript,
            analysis.get("location", ""),
        )

        return {
            "status": "success",
            "test": "manual_unified_analysis",
            "transcript": transcript,
            "analysis": analysis,
            "backend_submitted": backend_ok,
        }
    except Exception as error:
        print(f"\nERROR in manual test: {error}")
        return {
            "status": "error",
            "test": "manual_unified_analysis",
            "error": str(error),
        }


@app.get("/test")
async def test():
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
        print(f"  -> ML Category:  {analysis.get('emergency_type')}")
        print(f"  -> ML Priority:  {analysis.get('priority')}")
        print(f"  -> ML Confidence: {analysis.get('confidence')}")
        print("=========================================\n")

        await submit_to_backend(
            analysis,
            "test-legacy",
            test_transcript,
            analysis.get("location", ""),
        )

        return analysis
    except Exception as error:
        print(f"\nERROR in test: {error}")
        return {
            "status": "error",
            "error": str(error),
        }
