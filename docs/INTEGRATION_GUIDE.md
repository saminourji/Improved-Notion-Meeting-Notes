# Frontend-Backend Integration Guide

## ✅ Integration Complete

The frontend and backend are now connected! The meeting block will send real audio to the FastAPI backend for processing.

## Quick Start

### 1. Start the Backend

```bash
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload
```

Backend will run on `http://localhost:8000`

### 2. Start the Frontend

```bash
cd frontend-v2
npm run dev
```

Frontend will run on `http://localhost:3000` (or 3001 if you specified that port)

### 3. Test the Integration

1. Open the frontend in your browser
2. Navigate to any document page
3. Add a meeting block (type `/meeting` in the editor)
4. Click "Start transcribing" to record audio
5. Speak for a few seconds
6. Click the stop button
7. Wait for the backend to process (this may take 30-60 seconds depending on audio length)
8. View the results: transcript, summary, and action items

## What Was Changed

### Frontend Changes

#### 1. Environment Variables
- **File**: `frontend-v2/.env.local`
- Sets `NEXT_PUBLIC_API_URL=http://localhost:8000`

#### 2. API Service (`frontend-v2/lib/api.ts`)
- Updated `baseURL` to use environment variable
- Fixed form data key from `audio` to `meeting_audio` (matching backend)
- Improved error handling with detailed error messages
- Adapted response structure to handle backend's format

#### 3. Meeting Block (`frontend-v2/components/blocks/meeting-block.tsx`)
- Added import for `apiService`
- Replaced demo `processAudio` function with real API calls
- Converts audio Blob to File before sending
- Sends participant names to backend
- Added health check on component mount
- Proper error handling and display

### Backend Changes

#### CORS Configuration (`backend/app/main.py`)
- Added `CORSMiddleware` to allow requests from frontend
- Configured to accept requests from `localhost:3000` and `localhost:3001`

## Testing Checklist

### ✅ Basic Functionality
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Browser console shows "Backend connection established"
- [ ] Can record audio (microphone permission granted)
- [ ] Recording duration displays correctly
- [ ] Processing status appears after stopping recording
- [ ] Transcript appears with speaker labels
- [ ] Summary is generated
- [ ] Action items are displayed

### ⚠️ Error Scenarios
- [ ] Backend offline: Should show connection error
- [ ] No microphone permission: Should show permission error
- [ ] Short audio (< 1 second): Backend should handle gracefully
- [ ] Network timeout: Should show timeout error

### 📊 Integration Points
- [ ] Speaker names from participant input are used in backend
- [ ] Transcript segments render with correct timing
- [ ] Summary text displays properly
- [ ] Action items show with assignees
- [ ] Duration is tracked accurately

## Common Issues & Solutions

### Issue: "Backend is not available"
**Solution**: 
1. Check if backend is running: `http://localhost:8000/health`
2. Ensure `.env` file has required credentials (`HUGGINGFACE_TOKEN`, `OPENAI_API_KEY`)
3. Check backend logs for startup errors

### Issue: CORS errors in browser console
**Solution**: 
- Ensure backend CORS middleware is configured (already done)
- Check that frontend is running on `localhost:3000` or `3001`
- Try restarting both servers

### Issue: "Processing failed"
**Solution**:
1. Check backend logs for detailed error
2. Ensure audio file is valid (WAV format preferred)
3. Check if Hugging Face model is downloaded (first run takes time)
4. Verify OpenAI API key is valid and has credits

### Issue: Long processing time
**Expected Behavior**: 
- First request: 60-120 seconds (model download + processing)
- Subsequent requests: 30-60 seconds depending on audio length
- Speaker diarization is compute-intensive

## Environment Variables Reference

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`.env`)
```env
HUGGINGFACE_TOKEN=your_token_here
OPENAI_API_KEY=your_key_here
POSTGRES_URL=optional
REDIS_URL=optional
LOG_LEVEL=INFO
```

## API Endpoints Used

### `/health` (GET)
- Health check endpoint
- Returns: `{"status": "ok", "message": "Meeting Notes API is running"}`

### `/process` (POST)
- Main meeting processing endpoint
- Accepts: FormData with `meeting_audio`, `speaker_names`, voice samples, options
- Returns: Transcription segments, summary, action items
- Processing time: 30-120 seconds depending on audio length

## Next Steps

### Enhancements to Consider

1. **Loading Indicators**: Add progress bar during processing
2. **Voice Samples**: Integrate speaker setup page to send voice samples
3. **Retry Logic**: Auto-retry failed requests
4. **Caching**: Store processed meetings in backend database
5. **WebSocket**: Real-time processing updates
6. **Authentication**: Add user authentication for production
7. **File Upload**: Test with uploaded audio files (already supported)

### Production Deployment

#### Backend (Railway/Heroku)
1. Deploy backend first
2. Set environment variables in deployment platform
3. Get production URL
4. Test `/health` endpoint

#### Frontend (Vercel/Netlify)
1. Update `frontend-v2/.env.production` with backend URL
2. Deploy frontend
3. Test end-to-end flow
4. Update CORS in backend to include production frontend domain

## Troubleshooting Commands

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check backend logs
cd backend
tail -f logs/app.log  # if logging to file

# Test backend with curl
curl -X POST "http://localhost:8000/process" \
  -F "meeting_audio=@test.wav" \
  -F "speaker_names=Alice,Bob" \
  -F "generate_insights=true"

# Check frontend environment variables
cd frontend-v2
npm run build  # Will show if env vars are loaded

# Clear browser cache
# Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

## Support

If you encounter issues:
1. Check backend logs for errors
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Ensure all dependencies are installed (`pip install -r requirements.txt`, `npm install`)
5. Try with a test audio file first before recording

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Meeting Block Component                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐│  │
│  │  │   Record     │  │   Upload     │  │  Participants││  │
│  │  │   Audio      │  │   File       │  │   Input      ││  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘│  │
│  │         └──────────────────┴─────────────────┘       │  │
│  │                          │                            │  │
│  │                    ┌─────▼──────┐                     │  │
│  │                    │ API Service│                     │  │
│  │                    └─────┬──────┘                     │  │
│  └──────────────────────────┼──────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────┘
                              │ HTTP POST /process
                              │ FormData: audio + speakers
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              /process Endpoint                        │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐  │
│  │          Meeting Processor                           │  │
│  │  ┌────────────────┐  ┌──────────────┐  ┌──────────┐ │  │
│  │  │   Whisper      │  │  Pyannote    │  │   GPT-4  │ │  │
│  │  │ Transcription  │  │  Diarization │  │ Insights │ │  │
│  │  └────────────────┘  └──────────────┘  └──────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                    ┌──────▼────────┐                         │
│                    │   Response    │                         │
│                    │  (JSON)       │                         │
│                    └───────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Success Indicators

✅ Integration is working correctly when:
- Backend health check passes on frontend mount
- Recording creates audio blob
- Processing status shows during backend work
- Transcript appears with multiple speakers
- Summary is coherent and relevant
- Action items are extracted
- No CORS errors in console
- Error messages are clear and actionable

