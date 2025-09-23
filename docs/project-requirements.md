# Project Requirements – Improved Notion Meeting Notes Prototype

## Objective
Build a standalone, browser-based prototype that mirrors Notion's AI meeting notes experience while showcasing speaker recognition, transcript augmentation, and per-person action item generation. The prototype must be demo-ready for Notion engineers and support end-to-end processing of meeting audio using third-party/open-source tooling.

## Target Audience
- Demo facilitators (e.g. Sami) who prepare voice profiles and meeting recordings.
- Notion engineers evaluating the concept via a hosted playground.
- No public end users; authentication and multi-tenant concerns are out of scope.

## Success Criteria
- UI resembles Notion's meeting notes layout (summary, notes, transcript) with persona-based action items.
- Speaker diarization correctly tags the majority of speaking time for provided samples and gracefully falls back to `Person N` labels.
- Full processing flow (profile setup → meeting audio upload → annotated transcript + personalized action items) runs within ~5 minutes for a one-hour recording.
- Logs capture each pipeline stage for future debugging.
- Prototype can be deployed (frontend + backend) for others to experiment using supplied API keys and sample audio.

## Assumptions
- All processing is cloud-powered; no offline requirement.
- Voice embeddings and audio files can be stored on the hosted backend without additional compliance constraints.
- Free-tier APIs or open-source libraries are preferred; paid services are avoided.
- You will provide testing material: voice profiles (3 speakers) and a sample conversation for validation.

## User Journeys
1. **Voice Profile Setup**
   - Navigate to profile page.
   - Follow guided script (<1 minute) to record via microphone or upload audio clip.
   - Save derived speaker embedding under an editable label.

2. **Meeting Processing**
   - Upload meeting audio file (mp3, wav, m4a supported) and optional agenda/notes.
   - System preprocesses audio, diarizes speakers, generates transcript, and produces summary + action items.
   - User views outputs in Notion-like layout, toggles action items per speaker, and reviews logs if needed.

3. **Demo Review**
   - Download/view structured logs outlining diarization segments, matching scores, and LLM prompts/results.
   - Optionally rename `Person N` labels for presentation clarity.

## Functional Requirements
### Profile Management
- Provide dedicated `Profile` page with explanatory copy.
- Generate recording script similar to Siri setup:
  1. "Hi, this is {name}. I’m setting up my voice profile."
  2. "I like to [favorite activity]."
  3. "During meetings, I usually focus on [team/goal]."
  4. "Let’s see how well you recognize me."
- Allow microphone recording and audio upload; convert audio to 16 kHz mono internally.
- Create speaker embedding using third-party libraries and store locally (filesystem or lightweight DB).
- Support multiple profiles and manual relabeling.

### Meeting Ingestion & Processing
- Accept meeting audio upload (mp3/wav/m4a); internally normalize format.
- Optional agenda/notes input stored and passed as context into LLM prompts.
- Pipeline stages:
  1. Audio preprocessing (normalization, silence trimming as needed).
  2. Speaker diarization using stored embeddings; fallback to `Person N` for unknown voices.
  3. Transcription via open-source Whisper variant or similar library.
  4. Transcript augmentation with `Speaker: utterance` format and timestamps.
  5. Summary generation combining transcript + notes/agenda.
  6. Persona-specific action item generation: maintain base analysis and apply system prompt per speaker button/dropdown.
- Expose REST endpoints for starting processing, checking status, and retrieving outputs/artifacts.

### Frontend Experience
- Landing page with navigation to Profile setup and Meeting processor.
- Meeting output screen matching Notion layout:
  - Summary panel (top-left).
  - Notes/agenda panel (top-right or inline card).
  - Transcript pane spanning width with scroll, timestamp chips, and speaker labels.
  - Action item selector (buttons or dropdown) to switch persona view.
- Display processing status, success/failure states, and helpful instructions.
- Allow optional renaming of `Person N` labels post-processing; transcript itself remains read-only.

### Logging & Observability
- Append structured entries to local `logs/pipeline.log` (JSON lines or easily parseable text).
- Capture timestamps, segment boundaries, match scores, LLM prompt IDs, and generation summaries.
- Provide UI link or button to download latest log set for a meeting run.

## Non-Functional Requirements
- **Performance:** End-to-end processing within ~5 minutes for 60-minute audio on demo infrastructure; streaming UX can show progress.
- **Reliability:** Gracefully handle diarization uncertainty (default to `Unknown`/`Person N`). Provide clear error states with retry guidance.
- **Security & Privacy:** Inform demo users that recordings are stored; enforce HTTPS in deployment environments where possible.
- **Accessibility:** Ensure keyboard navigation and basic ARIA roles for key interactive elements (buttons/dropdowns).
- **Maintainability:** Modular backend pipeline enabling substitution of diarization/transcription providers.

## Technical Approach
### Frontend
- Framework: React or Next.js (favored for Vercel/GitHub Pages deployment).
- Styling: Tailwind CSS or Chakra UI for Notion-like appearance; Headless UI/ Radix for accessible dropdowns.
- State management: React Query/SWR for API interaction, minimal global state.

### Backend
- Framework: FastAPI (preferred for async support) or Flask.
- Background processing: simple task queue (Celery/RQ) or async tasks for long-running transcription.
- Storage: local filesystem or SQLite for profiles, processed outputs, and log metadata.

### Speech & NLP Stack
- Transcription: `faster-whisper` (small/en models) deployed on CPU-friendly environment.
- Speaker embeddings: `resemblyzer` or `pyannote.audio` voice embedding models.
- Diarization: `pyannote.audio` pipeline or combination of spectral clustering with embeddings; allow fallback heuristics.
- LLM Summaries & Action Items: leverage available API (OpenAI GPT-4o mini or comparable) with persona-specific system prompts.

### Deployment
- Frontend: GitHub Pages (if feasible with static export) or Vercel.
- Backend: Render, Railway, Fly.io, or Heroku free tier; configure environment variables for API keys and HF tokens.
- Continuous logging stored on server-side filesystem with download endpoint.

## Data & Logging Strategy
- Store voice embeddings and metadata in `data/profiles/` (per speaker file) or SQLite table.
- Persist meeting artifacts (audio, transcript, summary, action items) under `data/meetings/{id}/`.
- Maintain `logs/pipeline.log` with JSON lines capturing stage, duration, message, and related identifiers.

## Evaluation Plan
- Use provided three speaker samples + single conversation to validate diarization accuracy and persona action items.
- Record demo video once outputs are acceptable.
- Track metrics: diarization match percentage, WER from transcription, qualitative review of summary/action item relevance.

## Phase Plan
1. **Phase 1 – Backend Pipeline**
   - Implement profile ingestion, diarization, transcription, summary/action generation, and logging.
   - Validate pipeline via CLI scripts using sample data.
   - Expose REST endpoints for frontend integration.

2. **Phase 2 – Frontend Prototype**
   - Build Notion-like interface, integrate API endpoints, and implement persona-switching action items.
   - Add profile setup wizard, meeting upload form, and log download link.
   - Polish UI copy and responsive layout.

3. **Phase 3 – Demo Polish (Optional)**
   - Support manual renaming of `Person N` labels across summary/action items.
   - Add shareable usage instructions and troubleshooting tips.
   - Finalize deployment pipeline and monitor logs.

## Open Questions
- Which LLM/API key will be used for summaries and action items (OpenAI, Anthropic, other)?
- Are there retention rules for stored audio/embeddings (auto-delete after demo)?
- Do we need export formats (Markdown/PDF/Notion import) for summaries and action items, or is in-app view sufficient?
- Should we allow optional upload of human-prepared transcripts as a fallback?
