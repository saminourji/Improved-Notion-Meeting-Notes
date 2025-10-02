# Improved Notion Meeting Notes - Complete Setup Guide

This guide provides complete instructions for setting up and running the AI Meeting Notes application with speaker identification and real-time recording capabilities.

## System Overview

The application consists of two main components:
1. **Backend**: Python FastAPI server with audio processing and AI analysis
2. **Frontend**: React + TypeScript interface with recording and display capabilities

## Prerequisites

### System Requirements
- **Python 3.9+** with pip
- **Node.js 18+** with npm
- **FFmpeg** (for audio processing)
- **Git** (for version control)
- **Modern browser** with microphone access (Chrome 60+, Firefox 55+, Safari 14+)

### API Keys Required
- **OpenAI API Key** (for LLM processing)
- **Hugging Face Token** (for speaker diarization models)

## Installation Guide

### 1. Clone and Navigate to Project

```bash
git clone https://github.com/saminourji/Improved-Notion-Meeting-Notes.git
cd Improved-Notion-Meeting-Notes
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install FFmpeg (if not already installed)
# macOS: brew install ffmpeg
# Ubuntu: sudo apt update && sudo apt install ffmpeg
# Windows: Download from https://ffmpeg.org/download.html

# Set up environment variables
cp .env.example .env
```

Edit `.env` file with your API keys:
```bash
OPENAI_API_KEY=your_openai_api_key_here
HF_TOKEN=your_hugging_face_token_here
```

### 3. Frontend Setup

```bash
# Open new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

## Running the Application

### 1. Start Backend Server

```bash
# In backend directory, activate virtual environment
cd backend
source .venv/bin/activate

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

### 2. Start Frontend Development Server

```bash
# In frontend directory
cd frontend && npm run dev
```

Frontend will be available at: `http://localhost:5173`

### 3. Access Application

Open your browser and navigate to `http://localhost:5173`

## Usage Instructions

### Step 1: Speaker Setup
1. Click "Add First Speaker" or "Add Speaker"
2. Enter speaker names
3. For each speaker:
   - Click "Record Voice Sample" (10-60 seconds recommended)
   - OR click "Upload Audio File" to use existing voice sample
4. Ensure at least one speaker has a voice sample before proceeding

### Step 2: Record or Upload Meeting
1. **Record Live Meeting**:
   - Click "Start Meeting"
   - Speak naturally during the meeting
   - Click "Stop Meeting" when finished
2. **Upload Existing File**:
   - Click "Choose Audio File"
   - Select your meeting recording (WAV, MP3, M4A formats supported)

### Step 3: Processing
- The system will automatically process your meeting:
  1. Audio transcription using Whisper
  2. Speaker identification using voice samples
  3. AI-powered summary generation
  4. Action items extraction with speaker assignment

### Step 4: View Results
Navigate through the three tabs:
- **Summary**: AI-generated meeting summary and action items
- **Notes**: Add your own meeting notes (saved automatically)
- **Transcript**: Full transcript with speaker identification and search

## API Documentation

### Backend Endpoints

#### Core Processing
- `POST /process` - Process complete meeting with speaker identification
- `POST /summarize` - Generate summary from transcript
- `POST /action-items` - Extract action items (general or speaker-specific)
- `POST /action-items/all-views` - Generate all action item views (n+1)
- `POST /insights` - Comprehensive meeting insights

#### Request Format
All endpoints expect `multipart/form-data` with appropriate fields:
- `audio`: Meeting audio file
- `transcript`: Speaker-annotated transcript text
- `speaker_names`: Comma-separated speaker names
- `voice_sample_1/2/3`: Voice sample files
- `user_notes`: Optional user-provided context

### Error Handling

Common error scenarios and solutions:

**Backend Not Running**
```
"Backend server is not running. Please start the backend server."
```
Solution: Start the backend server on port 8000

**Microphone Access Denied**
```
"Microphone access denied. Please allow microphone access and try again."
```
Solution: Grant microphone permissions in browser settings

**Processing Timeout**
```
"Request timeout. The meeting may be too long to process."
```
Solution: Try with shorter audio files or adjust timeout settings

## File Structure

```
Improved-Notion-Meeting-Notes/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI main application
│   │   ├── services/
│   │   │   └── llm_service.py   # OpenAI integration
│   │   └── pipeline/
│   │       └── processor.py     # Audio processing pipeline
│   ├── tests/                   # Backend test suite
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/api.ts      # API integration layer
│   │   ├── context/             # State management
│   │   └── types/               # TypeScript definitions
│   ├── package.json             # Node.js dependencies
│   └── README.md                # Frontend documentation
├── docs/
│   ├── progress-log.md          # Development progress
│   ├── frontend-design-spec.md  # Technical specifications
│   └── technical-stack.md       # Technology decisions
└── SETUP.md                     # This setup guide
```

## Development

### Backend Development

```bash
# Run tests
cd backend
python -m pytest tests/

# Run specific LLM tests
python tests/test_llm_integration.py

# Format code
black app/ tests/

# Type checking
mypy app/
```

### Frontend Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Environment Variables

**Backend (.env)**:
```bash
OPENAI_API_KEY=sk-...
HF_TOKEN=hf_...
LOG_LEVEL=INFO
MAX_UPLOAD_SIZE=100MB
```

**Frontend (.env.local)** (optional):
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_DEBUG=true
VITE_MAX_UPLOAD_SIZE=100
```

## Troubleshooting

### Common Issues

1. **Python Dependencies Fail to Install**
   - Ensure Python 3.9+ is installed
   - Install build tools: `pip install build setuptools wheel`
   - On macOS: `xcode-select --install`

2. **FFmpeg Not Found**
   - Install FFmpeg and ensure it's in PATH
   - Test: `ffmpeg -version`

3. **CORS Errors in Browser**
   - Ensure backend is running on port 8000
   - Check browser network tab for specific error details
   - Backend may need CORS configuration updates

4. **Audio Recording Not Working**
   - Ensure HTTPS or localhost (required for microphone access)
   - Check browser permissions: Settings > Privacy & Security > Microphone
   - Try different browsers (Chrome recommended)

5. **Large File Upload Failures**
   - Check file size limits (default ~100MB)
   - Consider audio compression before upload
   - Monitor network timeout settings

### Performance Optimization

1. **Audio File Size**: Compress audio files to reduce processing time
2. **Browser Memory**: Close other tabs during processing
3. **Network**: Use wired connection for better upload stability
4. **API Limits**: Monitor OpenAI API usage and rate limits

### Logs and Debugging

**Backend Logs**:
```bash
# View server logs
tail -f logs/app.log

# Enable debug mode
export LOG_LEVEL=DEBUG
```

**Frontend Debugging**:
- Open browser Developer Tools (F12)
- Check Console tab for errors
- Monitor Network tab for API calls
- Use React Developer Tools extension

## Production Deployment

### Backend Production
1. Use production ASGI server (Gunicorn + Uvicorn)
2. Set up proper logging and monitoring
3. Configure environment variables securely
4. Set up reverse proxy (nginx)
5. Enable HTTPS

### Frontend Production
1. Build optimized bundle: `npm run build`
2. Serve static files with web server
3. Configure proper CORS headers
4. Enable compression and caching
5. Set up CDN for assets

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **File Upload**: Validate file types and sizes
3. **CORS**: Configure appropriate CORS policies
4. **Rate Limiting**: Implement API rate limiting
5. **Data Storage**: Meetings are session-only by design

## Support

For issues and questions:
1. Check this setup guide first
2. Review error messages in browser console
3. Check backend logs for processing errors
4. Verify all prerequisites are installed correctly
5. Test with smaller audio files first

## Next Steps

After successful setup:
1. Test with sample audio files
2. Explore different speaker identification scenarios
3. Customize UI styling as needed
4. Consider production deployment options
5. Monitor API usage and costs