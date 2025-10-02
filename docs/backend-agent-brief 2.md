# Backend Automation Brief

This brief captures the end-to-end responsibilities for an autonomous coding agent implementing the backend.

## Objectives
- Deliver a FastAPI-based backend under the `backend/` directory.
- Support speaker enrollment, meeting audio processing, result retrieval, and health monitoring.
- Integrate diarization, transcription, and LLM generation using the selected stack (see `docs/technical-stack.md`).
- Deploy automatically to Railway with PostgreSQL and Redis add-ons.

## Required Knowledge & Inputs
1. **Secrets**
   - `HUGGINGFACE_TOKEN`: Hugging Face access token with permissions for `pyannote/speaker-diarization-3.1`.
   - `OPENAI_API_KEY`: OpenAI API key for LLM requests.
   - `POSTGRES_URL`: connection string from Railway PostgreSQL add-on.
   - `REDIS_URL`: connection string from Railway Redis add-on.
2. **Services & Terms**
   - Accept Hugging Face model usage terms; ensure tokens stored securely.
   - Understand OpenAI rate limits and pricing (monitor token usage for `gpt-4o-mini` or chosen model).
3. **Infrastructure**
   - Railway deployment workflow (`railway.toml`, GitHub integration, environment variables).
   - Optional local Dockerization for parity.

## Implementation Requirements
- Create FastAPI project structure (`backend/app/__init__.py`, `backend/app/main.py`, etc.).
- Define routes:
  - `POST /api/speakers/enroll`
  - `POST /api/meetings/process`
  - `GET /api/meetings/{meeting_id}/status`
  - `GET /api/meetings/{meeting_id}/results`
  - `GET /health`
- Implement background job handling (async worker or Redis-backed queue) to process audio tasks without blocking HTTP requests.
- Persist metadata in PostgreSQL; cache embeddings/results in Redis.
- Wrap pipeline stages in structured logging with `structlog`, capturing inputs, outputs, and timing.
- Follow pipeline order: audio normalization → diarization & clustering → speaker matching → transcription → summary/action-item generation.
- Use OpenAI LLM prompts configured per persona; cache responses to minimize duplicate calls.
- Provide error reporting in API responses and log full traces.
- Ship smoke tests (Pytest or simple scripts) to validate endpoints and pipeline flow.

## Deployment Automation
- Configure `railway.toml`:
  - Build command: `pip install -r backend/requirements.txt`
  - Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- Ensure migrations or schema setup runs on deploy (Alembic/SQL scripts).
- Monitor service via Railway logs; surface metrics for processing time.

## Deliverables Checklist
- Codebase with modular pipeline components.
- Tests verifying diarization/transcription with sample audio.
- Documentation updates: README usage, setup steps, troubleshooting.
- Deployment pipeline validated on Railway.

Keep this brief updated as requirements evolve.
