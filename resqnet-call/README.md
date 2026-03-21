# ResQNet - Emergency Call AI Dispatcher

ResQNet is an AI-powered emergency response system that uses Twilio to receive calls, transcribe speech with Whisper, and analyze emergencies using Google's Gemini AI to provide instant emergency classification and recommendations.

## Features

- 📞 **Twilio Integration** - Receive emergency calls from any phone
- 🎤 **Speech Recognition** - Transcribe caller speech with OpenAI Whisper
- 🤖 **AI Analysis** - Analyze emergencies with Google Gemini 2.5 Flash
- 🚨 **Emergency Classification** - Categorize by type (medical, fire, accident, crime, missing person)
- 📍 **Location Extraction** - Automatically extract location from speech
- ⚡ **Real-time Processing** - Analyze and respond within seconds
- 🔒 **Error Handling** - Graceful error recovery, never crashes

## Prerequisites

- Python 3.8+
- Twilio Account with a phone number
- Google Gemini API Key
- macOS/Linux (tested on macOS)
- ngrok for local testing

## Installation

### 1. Clone/Setup Project
```bash
cd /path/to/resqnet-call
```

### 2. Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install --index-url https://download.pytorch.org/whl/cpu torch
pip install -r requirements.txt

# Whisper requires ffmpeg at runtime
sudo apt install -y ffmpeg
```

Dependencies include:
- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **twilio** - Twilio SDK
- **openai-whisper** - Speech transcription
- **google-generativeai** - Gemini API
- **httpx** - Async HTTP client
- **python-dotenv** - Environment variables
- **python-multipart** - Form data parsing

### 3. Configure Environment Variables

Create/update `.env` file:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
GEMINI_API_KEY=your_gemini_api_key
```

**Getting your credentials:**

- **Twilio**: [Twilio Console](https://console.twilio.com/)
- **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)

## Quick Start

### Terminal 1: Start the Server
```bash
cd /path/to/resqnet-call
source .venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

✅ Server runs at: `http://0.0.0.0:8000`

### Terminal 2: Start ngrok
```bash
ngrok http 8000
```

Copy the ngrok URL (e.g., `https://abcd-1234-efgh.ngrok.io`)

### Terminal 3: Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com/)
2. **Phone Numbers** → **Active Numbers** → Select your number
3. Under **Voice Configuration**:
   - **When a call comes in**: Set to `https://YOUR_NGROK_URL/twilio/incoming`
   - **Method**: `POST`
4. Click **Save**

### Make a Test Call

1. Call your Twilio phone number
2. Describe your emergency (e.g., "Car accident on Main Street")
3. Say your location (e.g., "Near downtown hospital")
4. System records and analyzes your call
5. Check server terminal for results

## Project Structure

```
resqnet-call/
├── main.py              # FastAPI app with Twilio endpoints
├── analyzer.py          # Gemini emergency analysis
├── transcriber.py       # Whisper speech transcription
├── requirements.txt     # Python dependencies
├── .env                 # API keys (keep secret!)
└── README.md           # This file
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health check |
| `/twilio/incoming` | POST | Handle incoming calls |
| `/twilio/got-emergency` | POST | Get emergency description |
| `/twilio/got-location` | POST | Get caller location |
| `/twilio/complete` | POST | Process call and analyze |
| `/test/gemini` | GET | Test Gemini analysis |
| `/test/analyze` | POST | Manual transcription test |

## Testing Without Calling

### Health Check
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "ResQNet Emergency Dispatcher",
  "version": "1.0.0",
  "timestamp": "2026-03-21"
}
```

### Test Gemini Analysis
```bash
curl http://localhost:8000/test/gemini
```

### Manual Emergency Analysis
```bash
curl -X POST "http://localhost:8000/test/analyze?transcript=There%20is%20a%20fire%20in%20my%20apartment%20building"
```

## How It Works

### Call Flow

1. **Incoming Call** → `/twilio/incoming`
   - Twilio sends incoming call
   - App greets caller with TwiML
   - Prompts for emergency description

2. **Emergency Input** → `/twilio/got-emergency`
   - App records emergency description
   - Prompts for location

3. **Location Input** → `/twilio/got-location`
   - App records location
   - Records full message

4. **Recording Processing** → `/twilio/complete`
   - **Transcribe**: Whisper converts audio to text
   - **Analyze**: Gemini analyzes the full transcript
   - **Classify**: Determines emergency type and priority
   - **Extract**: Gets location and suggested actions
   - **Log**: Prints results to console
   - **Respond**: Sends confirmation to caller

### AI Analysis Response

```json
{
  "emergency_type": "medical|fire|accident|crime|missing_person|other",
  "priority": "critical|moderate|low",
  "location": "extracted location or null",
  "summary": "one sentence description",
  "suggested_action": "immediate action for responders",
  "confidence": 0.95,
  "keywords_detected": ["keyword1", "keyword2"]
}
```

## Error Handling

The system handles errors gracefully:

- **Network failures** → Fallback transcription message
- **Transcription errors** → Error flagged but call continues
- **Gemini API errors** → Fallback emergency response
- **File system errors** → Cleanup in finally block
- **Any endpoint error** → Error TwiML sent to caller, call doesn't crash

## Troubleshooting

### "Address already in use" Error
```bash
kill -9 $(lsof -t -i :8000)
```

Then restart the server.

### "No module named 'main'"
Make sure you're in the correct directory:
```bash
cd /path/to/resqnet-call
source .venv/bin/activate
```

### "externally-managed-environment"
You're trying to install into system Python (common on Debian/Ubuntu). Use a virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### "ffmpeg: command not found"
```bash
sudo apt install -y ffmpeg
```

### Twilio Returns 404
Check that Twilio webhook is set to:
- `https://YOUR_NGROK_URL/twilio/incoming` (with `/twilio/incoming` path)
- Method is `POST`

### Gemini API Not Working
- Verify `GEMINI_API_KEY` in `.env`
- Get fresh key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Make sure API is enabled in Google project

### No Speech Transcription
- Check Twilio credentials are correct
- Verify RecordingUrl format in logs
- Test with `/test/analyze` endpoint

## Configuration

### Change Port
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Change Host
```bash
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Enable Auto-reload (Development)
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Security Notes

- ⚠️ **Never commit `.env` file to version control**
- ⚠️ **Keep API keys secret**
- ⚠️ **Use ngrok only for testing**
- ✅ Use HTTPS in production
- ✅ Add rate limiting
- ✅ Validate all inputs

## Production Deployment

For production, consider:

1. **Use fixed public domain** instead of ngrok
2. **Add authentication** to Twilio webhook
3. **Store call data** in database
4. **Add logging** to file or service
5. **Monitor API quotas** (Gemini, Twilio)
6. **Set up alerts** for failures
7. **Use environment-specific configs**
8. **Enable CORS** properly

## Performance Notes

- Whisper model: ~2-3 seconds to transcribe
- Gemini analysis: ~1-2 seconds
- Total processing: ~5 seconds per call
- First load: May take longer as models initialize

## Files Reference

### main.py
Main FastAPI application with all Twilio endpoints and routing logic.

### analyzer.py
Gemini API integration for emergency analysis and classification.

### transcriber.py
Whisper integration for converting audio to text with error handling.

### requirements.txt
All Python dependencies and versions.

## Support & Debugging

### View Server Logs
Server terminal shows:
- All incoming requests
- Transcriptions attempted
- Emergency analysis results
- Any errors encountered

### API Documentation
Once server is running, visit:
```
http://localhost:8000/docs
```

Interactive Swagger UI for testing endpoints.

## License

MIT License - Feel free to use and modify

## Contact

For issues or questions, check the code documentation above.

---

**Last Updated**: March 21, 2026
**Status**: ✅ Production Ready
