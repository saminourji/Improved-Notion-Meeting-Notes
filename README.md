# Improved Notion AI Meeting Notes - Speaker Detection

[![Speaker Detection Demo](https://img.youtube.com/vi/VIDEO_ID_HERE/maxresdefault.jpg)](https://youtube.com/watch?v=VIDEO_ID_HERE)

A full-stack meeting notes application that automatically identifies speakers, creates annotated transcripts, and generates AI-powered summaries with personalized action items.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- FFmpeg (`brew install ffmpeg` on macOS)

### Backend Setup
```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# Set up environment variables
cp .env.example .env
# Add your HUGGINGFACE_TOKEN and OPENAI_API_KEY to .env

# Start backend server
uvicorn backend.app.main:app --reload
```

Backend runs at: `http://localhost:8000`

### Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

## Key Features

- **🎯 AUTO Speaker Detection** - No need to specify number of speakers
- **🗄️ Voice Profile Enrollment** - Persistent speaker embeddings with automatic learning
- **📝 Real-time Transcription** - Whisper-powered speech-to-text with speaker labels
- **🤖 AI-powered Analysis** - GPT-4 generated summaries and personalized action items
- **📱 Notion-like Interface** - Familiar document editor with meeting blocks

## Architecture

**Backend**: FastAPI + pyannote.audio + faster-whisper + OpenAI API
**Frontend**: Next.js + BlockNote editor + Convex

### Processing Pipeline
```
Audio Input → Speaker Diarization → Voice Matching → Transcription → LLM Analysis
     ↓              ↓                    ↓              ↓              ↓
  Upload/Record → Identify Speakers → Match Profiles → Generate Text → Summarize & Extract Actions
```

**Core Components:**
- **Speaker Diarization**: pyannote.audio identifies who spoke when
- **Voice Matching**: Cosine similarity matching against enrolled speakers
- **Transcription**: faster-whisper converts speech to text
- **AI Analysis**: OpenAI GPT-4 generates summaries and action items

## Usage

### 1. Speaker Setup
- Navigate to the speaker setup page
- Record voice samples for meeting participants
- Voice profiles are stored persistently for future meetings

### 2. Meeting Processing
- **Live Recording**: Click "Start transcribing" to record in real-time
- **File Upload**: Use dropdown to upload existing audio files
- Supported formats: MP3, WAV, M4A

### 3. Results
- **Summary**: AI-generated meeting overview
- **Action Items**: Personalized tasks for each speaker
- **Transcript**: Full text with speaker identification and timestamps

## API Endpoints

- `POST /process` - Process complete meeting with speaker identification
- `GET /health` - Backend health check
- `POST /summarize` - Generate summary from transcript
- `POST /action-items` - Extract action items (general or speaker-specific)

## Documentation

- [Project Requirements](docs/project-requirements.md) - Detailed feature specifications
- [Technical Stack](docs/technical-stack.md) - Technology decisions and dependencies
- [Backend Setup](backend/README.md) - Backend-specific documentation
- [Frontend Setup](frontend/README.md) - Frontend-specific documentation

## Testing

Run the complete test suite:
```bash
python backend/tests/run_all_tests.py
```

Test individual components:
```bash
python backend/tests/test_audio_conversion.py
python backend/tests/test_diarization.py
python backend/tests/test_transcription.py
```

## Project Structure

```
Improved-Notion-Meeting-Notes/
├── backend/              # FastAPI backend with speaker diarization & AI
├── frontend/             # Next.js frontend with Notion-like UI
├── docs/                 # Project documentation
├── data/                 # Audio samples and processing results
└── pretrained_models/    # Downloaded ML models
```

## Environment Variables

Required for backend:
- `HUGGINGFACE_TOKEN` - For pyannote.audio speaker diarization
- `OPENAI_API_KEY` - For GPT-4 summaries and action items

## Development

The application is built for production deployment with:
- Structured logging for debugging
- Error handling and user feedback
- Session storage for persistence
- CORS configuration for frontend-backend communication

## Attribution

This project builds upon the base Notion implementation from [@JyotiranjanGhibila/notion-clone](https://github.com/JyotiranjanGhibila/notion-clone), which provides the core document editing interface and user authentication features.

**Original Work**: All meeting notes functionality, speaker detection, voice profile enrollment, audio processing pipeline, and AI-powered analysis features are original implementations developed specifically for this project.

## License

This project is a prototype demonstration of enhanced meeting notes with speaker detection capabilities.