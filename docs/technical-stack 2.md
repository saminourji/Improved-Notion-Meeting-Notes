# Technical Stack – Improved Notion Meeting Notes Prototype

This document distills the recommended tooling and configuration for delivering the prototype's audio processing, NLP workflow, and deployment footprint. It is grounded on the research captured in `docs/context-dump.md`.

## Stack Overview
- **Backend Language/Framework:** Python with FastAPI + Uvicorn.
- **Frontend:** React/Next.js (deployed separately; not covered here).
- **Core Audio Pipeline:**
  - Speaker diarization & embeddings: `pyannote.audio` 3.1 (ECAPA-TDNN models).
  - Transcription: `faster-whisper` (OpenAI Whisper base model, quantized as needed).
  - Speaker identification: cosine similarity between diarized centroids and stored profile embeddings.
- **LLM Layer:** OpenAI API (e.g., `gpt-4o-mini`) accessed via the official Python SDK for summaries/action items.
- **Data/Storage:** Local filesystem (prototype) or Railway PostgreSQL/Redis when deployed.
- **Deployment Targets:** Backend on Railway Hobby tier; frontend on Vercel or GitHub Pages.

## Dependencies & Versions
```txt
fastapi==0.100.0
uvicorn[standard]==0.23.0
pyannote.audio==3.1.0
faster-whisper==1.0.0
openai==1.40.3
librosa==0.10.1
structlog==23.1.0
redis==4.5.4
asyncpg==0.28.0
pydub==0.25.1
```
- **System requirements:** FFmpeg installed for audio conversions; PyTorch CPU wheels compatible with `pyannote.audio` (auto-installed).
- **Licensing:** Mixed Apache/MIT-friendly stack; `pyannote` models require accepting Hugging Face terms.

## Pipeline Configuration
| Stage | Tooling | Key Settings | Notes |
|-------|---------|--------------|-------|
| Audio ingestion | `pydub`, `librosa` | Normalize to 16 kHz mono | Handles uploads & mic captures |
| Speaker embeddings | `pyannote.audio` ECAPA-TDNN | `device="cpu"` | Reuse for profiles and diarization matching |
| Diarization | `pyannote/speaker-diarization-3.1` | Sliding window 1.5 s | Needs HF token; ~1.5 min/hr audio |
| Transcription | `faster-whisper` base | `compute_type="int8"`, chunk 30 s | ~2 min/hr audio on CPU |
| Transcript assembly | Custom Python | Combine timestamps + labels | Output `Speaker N` with optional rename mapping |
| Summaries/action items | OpenAI API | System prompt per persona | Latency depends on model; cache per persona |
| Logging | `structlog` | JSON lines to `logs/pipeline.log` | Include stage, duration, prompt metadata |

### Suggested Constants
```python
WHISPER_MODEL = "base"
WHISPER_COMPUTE_TYPE = "int8"
PYANNOTE_MODEL = "pyannote/speaker-diarization-3.1"
PYANNOTE_DEVICE = "cpu"
CHUNK_SECONDS = 30
OPENAI_MODEL = "gpt-4o-mini"
MAX_CONCURRENT_JOBS = 1
```

## Infrastructure & Deployment
- **Railway Backend:**
  - Hobby plan ($5/mo credit) covers FastAPI container running on shared CPU.
  - Add PostgreSQL (1 GB) for metadata + Redis (256 MB) for job queue/caching if concurrency expands.
  - Environment variables: `HUGGINGFACE_TOKEN`, `OPENAI_API_KEY`, `RAILWAY_STATIC_URL`, logging paths.
- **Frontend:**
  - Deploy on Vercel (free). Communicates with Railway API via HTTPS.
  - If static export required, use GitHub Pages and configure backend CORS.

## Data Management
- **Profiles:** Store embeddings under `data/profiles/{speaker_id}.npy` plus metadata JSON.
- **Meetings:** For each run, persist under `data/meetings/{meeting_id}/` (raw audio, diarization RTTM, transcript JSON, summaries).
- **Logs:** Append to `logs/pipeline.log`; consider rotation via `logging.handlers.RotatingFileHandler` or manual archival after each run.

## Performance Expectations
- 1-hour meeting processed in ~4.5 minutes (CPU-only):
  - Diarization ~90 seconds
  - Transcription ~120 seconds
  - LLM tasks ~30 seconds
  - Remaining time for preprocessing/post-processing ~60 seconds
- Set `MAX_CONCURRENT_JOBS = 1` on hobby-tier resources to avoid contention.

## Integration Notes
- Diarization requires accepting Hugging Face gated model terms; document setup in onboarding instructions.
- For speaker identification, maintain cosine similarity threshold (e.g., 0.75) to decide if diarized cluster aligns with stored profile.
- Cache OpenAI responses per meeting + persona to reduce duplicate calls when toggling UI.
- Implement retry/backoff for network calls to the OpenAI API.

## Risks & Mitigations
- **Compute spikes:** Long audio may exceed free-tier time; provide progress updates and allow offline batch processing.
- **Model access limits:** OpenAI billing is usage-based; monitor token consumption and apply persona toggle throttling.
- **Licensing:** Ensure Hugging Face terms for `pyannote` models remain compatible; keep token private.
- **Audio quality:** Poor recordings reduce diarization accuracy—expose manual relabel UI as future enhancement.

## Follow-ups
- Document detailed setup (FFmpeg install, HF token entry) in `README.md` once implementation begins.
- Prototype CLI script to validate pipeline end-to-end using sample voices and conversation before frontend integration.
