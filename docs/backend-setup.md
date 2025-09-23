# Backend Setup Guide

This guide outlines the steps required to bootstrap the `backend` service locally and prepare it for deployment on Railway.

## 1. Prerequisites
- Python 3.10+
- FFmpeg installed and available on PATH (`ffmpeg -version`)
- Git, Make (optional), and curl/wget for dependency installation

## 2. Repository Structure
```
backend/
  requirements.txt
.env.example
```

## 3. Create & Activate Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

## 4. Environment Variables
1. Copy `.env.example` to `.env` and supply real credentials:
   ```bash
   cp .env.example .env
   ```
2. Required entries:
   - `HUGGINGFACE_TOKEN`
   - `OPENAI_API_KEY`
   - `POSTGRES_URL`
   - `REDIS_URL`
3. Optional overrides:
   - `RAILWAY_STATIC_URL`
   - `LOG_LEVEL`

## 5. External Services
- **Hugging Face**: create account, generate token, accept model terms for `pyannote/speaker-diarization-3.1`.
- **OpenAI**: create account (platform.openai.com) and generate an API key.
- **Railway**: create account, link GitHub repository.

## 6. Local Development Checklist
- Configure FastAPI app entry point in `backend/` (e.g., `backend/main.py`).
- Provide startup script (e.g., `uvicorn backend.main:app --reload`).
- Implement CLI smoke test command once pipeline scaffolding exists.

## 7. Deployment Notes
- Add `railway.toml` at repo root with service build/run commands.
- Provision PostgreSQL and Redis add-ons via Railway UI; copy connection strings into environment variables.
- Expose `/health` endpoint for deployment checks.

Keep this document updated as the backend evolves.
