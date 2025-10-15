# Backend - Improved Notion Meeting Notes

FastAPI backend for meeting processing with speaker diarization, transcription, and AI-powered analysis.

## Tech Stack

- **FastAPI** - Modern Python web framework
- **pyannote.audio** - Speaker diarization and voice embeddings
- **faster-whisper** - Speech-to-text transcription
- **OpenAI API** - GPT-4 for summaries and action items
- **Pydantic** - Data validation and settings
- **Uvicorn** - ASGI server

## Setup

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Add HUGGINGFACE_TOKEN and OPENAI_API_KEY

# Start server
uvicorn app.main:app --reload
```

## API Endpoints

- `POST /process` - Process complete meeting with speaker identification
- `GET /health` - Backend health check
- `POST /summarize` - Generate summary from transcript
- `POST /action-items` - Extract action items (general or speaker-specific)
- `POST /insights` - Comprehensive meeting insights

## Environment Variables

- `HUGGINGFACE_TOKEN` - Required for pyannote.audio speaker diarization
- `OPENAI_API_KEY` - Required for GPT-4 summaries and action items
- `APP_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (INFO/DEBUG)

## Testing

Run the complete test suite:
```bash
python tests/run_all_tests.py
```

For detailed testing information, see [README_TESTS.md](README_TESTS.md).

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── core/                # Configuration and settings
│   ├── pipeline/            # Audio processing pipeline
│   ├── services/            # Business logic services
│   └── utils/               # Utility functions
├── tests/                   # Test suite
├── requirements.txt         # Python dependencies
└── README_TESTS.md         # Testing documentation
```

## Documentation

For complete setup instructions and project overview, see the [main README](../README.md).

For frontend documentation, see [frontend/README.md](../frontend/README.md).
