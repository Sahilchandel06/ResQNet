# ResQNet Setup Guide

## Step 1: Install Dependencies
```bash
cd /path/to/resqnet-call

# Linux/Debian-safe setup (avoids PEP 668 "externally-managed-environment")
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip

# Install CPU-only torch first to avoid huge CUDA wheel downloads
pip install --index-url https://download.pytorch.org/whl/cpu torch
pip install -r requirements.txt

# Whisper runtime dependency
sudo apt install -y ffmpeg
```

## Step 2: Get API Keys

### Twilio Account
1. Go to [https://www.twilio.com/console](https://www.twilio.com/console)
2. Copy **Account SID** and **Auth Token**
3. Get a phone number or use existing

### Gemini API Key
1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the generated key

## Step 3: Configure .env
Update `.env` file with your credentials:
```
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
GEMINI_API_KEY=your_key_here
```

## Step 4: Start Server

**Terminal 1:**
```bash
cd /path/to/resqnet-call
source .venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Step 5: Start ngrok

**Terminal 2:**
```bash
ngrok http 8000
```

You should see:
```
Session Status                online
Version                       3.x.x
Region                        us
Forwarding                    https://xxxx-xxxx-xxxx.ngrok.io -> http://localhost:8000
```

Copy the HTTPS URL: `https://xxxx-xxxx-xxxx.ngrok.io`

## Step 6: Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com/phone-numbers/verified)
2. Click **Phone Numbers** → **Active Numbers**
3. Select your phone number
4. Scroll to **Voice Configuration**
5. Set **"When a call comes in"** to:
   ```
   https://xxxx-xxxx-xxxx.ngrok.io/twilio/incoming
   ```
   (Replace `xxxx-xxxx-xxxx` with your ngrok URL)

6. Make sure **Method** is set to `POST`
7. Click **Save**

## Step 7: Test the System

### Option A: Test Without Calling
```bash
# Health check
curl http://localhost:8000/health

# Test Gemini
curl http://localhost:8000/test/gemini

# Test with custom text
curl -X POST "http://localhost:8000/test/analyze?transcript=Fire%20in%20my%20apartment"
```

### Option B: Make a Real Call
1. Call your Twilio phone number
2. Say your emergency
3. Say your location
4. Wait for confirmation

Watch the server terminal for results!

## Quick Command Reference

| What | Command |
|------|---------|
| Start server | `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000` |
| Start ngrok | `ngrok http 8000` |
| Health check | `curl http://localhost:8000/health` |
| Kill port 8000 | `kill -9 $(lsof -t -i :8000)` |
| View API docs | Visit `http://localhost:8000/docs` in browser |

## Common Issues

**"Address already in use"**
```bash
kill -9 $(lsof -t -i :8000)
```

**ImportError on startup**
- Make sure you're in `/resqnet-call` directory
- Activate the virtualenv: `source .venv/bin/activate`
- Re-run dependency install: `pip install -r requirements.txt`

**`externally-managed-environment` error**
- You're installing into system Python. Use virtualenv:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

**`ffmpeg` not found**
```bash
sudo apt install -y ffmpeg
```

**Twilio sends 404**
- Check ngrok URL in webhook (should have `/twilio/incoming`)
- Verify webhook format in Twilio console

**Gemini not working**
- Verify API key in `.env`
- Get new key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## File Overview

| File | Purpose |
|------|---------|
| `main.py` | FastAPI server & Twilio endpoints |
| `analyzer.py` | Gemini AI analysis |
| `transcriber.py` | Whisper speech-to-text |
| `requirements.txt` | Dependencies |
| `.env` | API keys (keep secret!) |
| `README.md` | Full documentation |

## Next Steps

1. ✅ Install dependencies
2. ✅ Get API keys
3. ✅ Configure .env
4. ✅ Start server & ngrok
5. ✅ Set Twilio webhook
6. ✅ Test the system
7. ✅ Make emergency calls

## Support

View full documentation in `README.md` for detailed information about:
- API endpoints
- Error handling
- Production deployment
- Performance tuning
- Debugging

---

**All set!** Your ResQNet system is ready to receive emergency calls. 🚨
