# Improved-Notion-Meeting-Notes

Improving Notion's beta AI Meeting Notes by adding speaker recognition and personalized action items.

## Overview
This prototype delivers a meeting notes experience that can identify speakers, annotate transcripts, and process audio through a complete diarization pipeline. Built for demo-ready deployment.

## Documentation
- [Project Requirements](docs/project-requirements.md)
- [Progress Log](docs/progress-log.md)
- [Technical Stack](docs/technical-stack.md)

## Getting Started
- Ensure Python 3.10+ and FFmpeg are installed (`ffmpeg -version`).
- Create a virtual environment with `python3 -m venv .venv` (Windows: `py -3 -m venv .venv`).
- Activate it (`source .venv/bin/activate` or `.venv\\Scripts\\activate`).
- Upgrade pip and install backend dependencies: `pip install --upgrade pip` then `pip install -r backend/requirements.txt`.
- **Note**: First run will download SpeechBrain models (~100MB) to `pretrained_models/` directory.
- Copy `.env.example` to `.env` and add your `HUGGINGFACE_TOKEN` and `OPENAI_API_KEY`.
- Test the pipeline with your audio samples: `python backend/test_pipeline.py`
- Launch the backend API locally with `uvicorn backend.app.main:app --reload` (defaults to `http://127.0.0.1:8000`).

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

## Phase Plan
- ✅ Phase 1: Core backend pipeline with diarization and transcription
- 🔄 Phase 2: LLM integration for summaries and action items
- 📋 Phase 3: Frontend integration and UI polish