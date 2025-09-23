# Improved-Notion-Meeting-Notes

Improving Notion's beta AI Meeting Notes by adding speaker recognition and personalized action items.

## Overview
This prototype aims to deliver a Notion-like meeting notes experience that can identify speakers, annotate transcripts, and tailor action items per participant. The end goal is a demo-ready web app for sharing with Notion engineers.

## Documentation
- [Project Requirements](docs/project-requirements.md)
- [Progress Log](docs/progress-log.md)

## Getting Started
- Ensure Python 3.10+ and FFmpeg are installed (`ffmpeg -version`).
- Create a virtual environment with `python3 -m venv .venv` (Windows: `py -3 -m venv .venv`).
- Activate it (`source .venv/bin/activate` or `.venv\\Scripts\\activate`).
- Upgrade pip and install backend dependencies: `pip install --upgrade pip` then `pip install -r backend/requirements.txt`.
- Copy `.env.example` to `.env` and add real Hugging Face, OpenAI, PostgreSQL, and Redis credentials.
- Launch the backend API locally with `uvicorn backend.app.main:app --reload` (defaults to `http://127.0.0.1:8000`).
- Run backend smoke tests with `pytest backend/tests` after dependencies are installed.
- Explore the CLI helpers via `python -m backend.app.cli list-speakers` or `python -m backend.app.cli process-meeting ...`.
- TODO: Frontend installation steps
- TODO: Sample data preparation

## Usage _(to be completed)_
### Profile Setup
- `POST /api/speakers/enroll` accepts basic metadata today; audio upload + embedding extraction hooks will follow.

### Meeting Processing
- `POST /api/meetings/process` queues a meeting for processing (currently stub pipeline). Poll `GET /api/meetings/{id}/status` for progress.

### Reviewing Results
- Retrieve meeting artifacts via `GET /api/meetings/{id}/results` once status is `completed`. CLI `process-meeting` command mirrors the HTTP flow for local testing.

### Logs & Troubleshooting
- Structured pipeline logs are written to `logs/pipeline.log` (rotates at ~2 MB). Tail this file while running the CLI or API to inspect pipeline stages.

## Deployment Notes _(to be completed)_
- TODO: Hosting strategy and environment configuration steps

## Phase Plan Snapshot
- Phase 1: Backend pipeline implementation
- Phase 2: Frontend integration and UI polish
- Phase 3: Demo preparation and optional enhancements
