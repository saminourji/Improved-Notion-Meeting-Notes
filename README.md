# Improved-Notion-Meeting-Notes

Improving Notion's beta AI Meeting Notes by adding speaker recognition and personalized action items.

## Overview
A full-stack meeting notes application with a Notion-like interface that identifies speakers, creates annotated transcripts, and generates AI-powered summaries and action items. Built for production-ready deployment.

## Documentation
- [Project Requirements](docs/project-requirements.md)
- [Progress Log](docs/progress-log.md)
- [Technical Stack](docs/technical-stack.md)
- [Integration Guide](docs/INTEGRATION_GUIDE.md) - Frontend-Backend setup
- [Integration Complete](docs/INTEGRATION_COMPLETE.md) - Implementation details

## Quick Start

### Backend Setup
1. Ensure Python 3.10+ and FFmpeg are installed (`ffmpeg -version`)
2. Create virtual environment: `python3 -m venv .venv`
3. Activate it: `source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
4. Install dependencies: `pip install --upgrade pip && pip install -r backend/requirements.txt`
5. Copy `.env.example` to `.env` and add your `HUGGINGFACE_TOKEN` and `OPENAI_API_KEY`
6. Start backend: `uvicorn backend.app.main:app --reload`

**Note**: First run will download models (~100MB) to `pretrained_models/` directory.

### Frontend Setup
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open browser to `http://localhost:3000`

**Note**: Backend must be running at `http://localhost:8000` for full functionality.

## Usage
### Testing Pipeline
- Run the CLI test: `python backend/test_pipeline.py`
- This tests diarization, speaker matching, and transcription using your sample files

### API Usage
- **Endpoint**: `POST /process`
- **Parameters**:
  - `meeting_audio`: Audio file (required)
  - `speaker_names`: Comma-separated speaker names (optional)
  - `voice_sample_1`, `voice_sample_2`, `voice_sample_3`: Voice samples for speaker identification (optional)
- **Returns**: Complete meeting analysis with segments, speakers, and transcriptions

### Example API Call
```bash
curl -X POST "http://localhost:8000/process" \
  -F "meeting_audio=@data/audio_test_files_1/sample_meeting_sparsh_aadil_sami.m4a" \
  -F "speaker_names=sparsh,aadil,sami" \
  -F "voice_sample_1=@data/audio_test_files_1/voice_sample_sparsh.m4a" \
  -F "voice_sample_2=@data/audio_test_files_1/voice_sample_aadil.m4a" \
  -F "voice_sample_3=@data/audio_test_files_1/voice_sample_sami.m4a"
```

## Architecture
- **Core Pipeline**: Audio processing → AUTO diarization → Speaker database matching → Transcription
- **Speaker Database**: Persistent storage of voice embeddings with automatic learning
- **API**: Single endpoint for file upload and processing
- **Storage**: Results saved to `data/results/`, speakers to `data/speakers/`
- **Logging**: Structured logs capture each processing stage

## Key Features
- **🎯 AUTO Speaker Detection**: No need to specify number of speakers
- **🗄️ Speaker Database**: Persistent learning and recognition of speakers
- **📊 Dynamic Scaling**: Handles any number of speakers automatically
- **🔄 Incremental Learning**: Builds speaker knowledge over time

## Project Structure
```
Improved-Notion-Meeting-Notes/
├── backend/              # FastAPI backend with speaker diarization & AI
├── frontend/             # Next.js frontend with Notion-like UI
├── frontend-backup/      # Original standalone React frontend (archived)
├── docs/                 # Project documentation
└── data/                 # Audio samples and processing results
```

## Phase Plan
- ✅ Phase 1: Core backend pipeline with diarization and transcription
- ✅ Phase 2: LLM integration for summaries and action items
- ✅ Phase 3: Frontend integration and UI polish

## Features
- 🎯 **AUTO Speaker Detection**: Automatic speaker identification
- 🗄️ **Speaker Database**: Persistent voice embeddings
- 📝 **Rich Text Editor**: BlockNote-powered document editor
- 🎤 **Live Recording**: Browser-based audio recording
- 📤 **File Upload**: Process existing audio files
- 🤖 **AI Insights**: GPT-4 powered summaries and action items
- 👥 **Participant Management**: Add and track meeting participants
- 📊 **Real-time Processing**: FastAPI backend processes audio in real-time