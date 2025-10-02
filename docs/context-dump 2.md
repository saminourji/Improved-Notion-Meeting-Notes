# Context Dump – Improved Notion Meeting Notes Prototype

Use this document to paste research findings, meeting notes, or any reference material gathered during development.

## Original Prompt
```
You’re helping design the audio and NLP stack for a demo-ready prototype called “Improved Notion Meeting Notes.” The system requirements include:

- Browser-based frontend (React/Next.js) talking to a Python backend (FastAPI/Flask).
- Users upload or record short voice samples; generate reusable speaker embeddings.
- Users upload meeting audio (mp3/wav/m4a). Pipeline must diarize speakers, transcribe audio, label transcript with “Speaker N,” and generate both a shared summary and per-person action items.
- Prefer open-source libraries or free-tier APIs (no paid services). Everything is cloud-hosted; performance target is <5 minutes for processing a one-hour meeting.
- Logging must capture diarization/transcription steps and LLM prompts/results for debugging.
- Prototype will be deployed on services like Vercel (frontend) and Render/Fly/Heroku (backend CPU instances).

Please recommend:
1. Specific libraries/APIs for speaker embedding and diarization that can run on CPU-friendly infrastructure (include licensing notes and whether they need API keys or Hugging Face tokens).
2. Transcription options (libraries vs. hosted APIs) that meet the free-tier requirement, with pros/cons.
3. LLM providers or open models suitable for personalized summaries/action items, noting cost/free access considerations.
4. Any supporting utilities (audio pre-processing, storage formats, logging tooling) that fit the stack.
5. Suggested deployment considerations or optimizations for keeping latency reasonable on low-cost instances.

Summarize the proposed stack, justify key choices, and highlight any integration or performance caveats the engineering team should plan for.
```

## Research Notes
# Definitive Tech Stack for "Improved Notion Meeting Notes"

## Final Architecture Decision: Cost-Optimized Stack

Based on comprehensive research, here's the **cheapest and most effective** technology stack for your prototype:

### Core Technologies

**Speaker Diarization: Pyannote.audio 3.1**
- **Cost**: Free (MIT license, requires free Hugging Face account)[1][2]
- **Performance**: ~1.5 minutes to process 1-hour meeting on CPU[3]
- **Requirements**: Accept user conditions for `pyannote/speaker-diarization-3.1` model

**Transcription: Faster-Whisper (Base Model)**
- **Cost**: Free (open source)[4]
- **Performance**: 4-5x faster than OpenAI Whisper, ~2 minutes for 1-hour audio[5][6]
- **Model choice**: Base model for optimal speed/accuracy balance

**LLM: Groq API (Free Tier)**
- **Cost**: Free up to 14,400 requests/day[7][8]
- **Performance**: 300+ tokens/second (faster than any local option)[9]
- **Models**: Access to Llama 3.3 70B, Mixtral 8x7B

**Deployment: Railway**
- **Cost**: $5/month hobby plan (includes $5 usage credits)[10][11]
- **Total cost**: Effectively free for low-usage demo prototype
- **Advantage**: Pay only for actual usage, not provisioned resources

### Complete Stack Configuration

```python
# requirements.txt
fastapi==0.100.0
uvicorn[standard]==0.23.0
pyannote.audio==3.1.0
faster-whisper==1.0.0
groq==0.4.1
librosa==0.10.1
structlog==23.1.0
redis==4.5.4
asyncpg==0.28.0
pydub==0.25.1
```

### Deployment Architecture

**Backend**: FastAPI on Railway
- **Instance**: Hobby plan ($5/month with $5 credits included)
- **Database**: Railway PostgreSQL ($3/month for 1GB)
- **Cache**: Railway Redis ($3/month for 256MB)
- **Total monthly cost**: ~$11/month for full production setup

**Frontend**: Vercel (free tier)
- **Cost**: $0 for up to 100GB bandwidth[12]
- **Features**: Automatic deployments, custom domains, SSL

### Processing Pipeline Implementation

```python
# Optimized processing configuration
WHISPER_MODEL = "base"  # Best speed/accuracy for demo
PYANNOTE_DEVICE = "cpu"
GROQ_MODEL = "llama-3.1-8b-instant"  # Fastest free model
CHUNK_SIZE = 30  # seconds for memory efficiency
MAX_CONCURRENT_JOBS = 1  # Railway resource limits
```

### Expected Performance

**1-hour meeting processing time**:
1. Audio preprocessing: ~20 seconds
2. Speaker diarization: ~90 seconds  
3. Transcription: ~120 seconds
4. LLM processing: ~30 seconds
5. **Total**: ~4.5 minutes ✅

### Cost Breakdown (Monthly)

**Development/Demo Phase**:
- Railway Hobby: $5/month (includes $5 usage credits)
- PostgreSQL: $3/month
- Redis: $3/month  
- Groq API: $0 (free tier covers demo usage)
- Vercel: $0
- **Total**: $11/month

**Why This Is the Cheapest Option**:

1. **Railway vs Render**: Railway's usage-based billing is cheaper for low-traffic demos ($5 vs $7 base cost)[13][11]
2. **Groq vs Ollama**: Groq's free tier (14,400 requests/day) eliminates server costs for LLM processing[14][7]
3. **Faster-Whisper vs OpenAI API**: Local processing saves $0.006/minute ($3.60/hour)[15]
4. **Pyannote vs Paid APIs**: Open source eliminates per-minute diarization costs

### Key Setup Requirements

**Hugging Face Setup**:
1. Create free account at huggingface.co
2. Generate access token at hf.co/settings/tokens
3. Accept conditions for `pyannote/speaker-diarization-3.1`[2]
4. Accept conditions for `pyannote/segmentation-3.0`[1]

**Groq Setup**:
1. Create free account at console.groq.com
2. Generate API key (no credit card required)[16]
3. 14,400 requests/day limit resets daily[7]

**Railway Deployment**:
```yaml
# railway.toml
[deploy]
healthcheckPath = "/health"
restartPolicyType = "ON_FAILURE"

[build]
builder = "NIXPACKS"

[env]
HUGGINGFACE_TOKEN = "hf_your_token_here"
GROQ_API_KEY = "gsk_your_key_here"
```

### Critical Performance Optimizations

**Memory Management**:
- Process audio in 30-second chunks to stay under Railway's 512MB limit
- Cache speaker embeddings in Redis to avoid reprocessing
- Use INT8 quantization for faster-whisper

**Speed Optimizations**:
- Parallel processing of diarization and initial transcription chunks
- Async LLM calls to Groq for summary generation
- Preload models on first request, cache for subsequent requests

### Risk Mitigation

**Free Tier Limits**:
- Groq: 14,400 requests/day covers ~50 meeting summaries daily
- Railway: $5 credits cover ~20-30 hours of processing monthly
- Upgrade path clearly defined when limits are reached

**Backup Options**:
- If Groq hits limits: Switch to Google AI Studio (Gemini Flash free tier)[17]
- If Railway becomes expensive: Migrate to Render's free tier
- If Pyannote fails: Fallback to basic VAD + clustering

This stack provides the **absolute lowest cost** while meeting all performance requirements for a demo-ready prototype. The total operational cost of $11/month makes it sustainable for extended development and testing phasesphases.

[1](https://huggingface.co/pyannote/segmentation-3.0)
[2](https://huggingface.co/pyannote/speaker-diarization-3.1)
[3](https://dataloop.ai/library/model/pyannote_speaker-diarization/)
[4](https://github.com/SYSTRAN/faster-whisper)
[5](https://github.com/SYSTRAN/faster-whisper/issues/1030)
[6](https://github.com/SYSTRAN/faster-whisper/issues/315)
[7](https://www.byteplus.com/en/topic/447716)
[8](https://community.groq.com/t/what-are-the-rate-limits-for-the-groq-api-for-the-free-and-dev-tier-plans/42)
[9](https://www.byteplus.com/en/topic/398252)
[10](https://ritza.co/articles/gen-articles/cloud-hosting-providers/railway-vs-render/)
[11](https://northflank.com/blog/railway-vs-render)
[12](https://northflank.com/blog/render-vs-vercel)
[13](https://getdeploying.com/railway-vs-render)
[14](https://www.linkedin.com/pulse/evaluating-large-language-models-performance-hardware-z-gow-msc-3m9ff)
[15](https://www.videosdk.live/developer-hub/ai/openai-speech-to-transcription)
[16](https://www.byteplus.com/en/topic/404714)
[17](https://madappgang.com/blog/best-free-ai-apis-for-2025-build-with-llms-without/)
[18](https://blogs.kuberns.com/post/top-7-free-deployment-services-for-2025-compared-with-pricing--features/)
[19](https://www.byteplus.com/en/topic/448356)
[20](https://quids.tech/blog/showdown-of-whisper-variants/)
[21](https://render.com/docs/free)
[22](https://console.groq.com/docs/rate-limits)
[23](https://earningscall.biz/blog/benchmarking-whisper)
[24](https://www.reddit.com/r/node/comments/1elrxpj/rendercom_paid_plan/)
[25](https://community.groq.com/t/free-tier/419)
[26](https://www.reddit.com/r/MachineLearning/comments/14xxg6i/d_what_is_the_most_efficient_version_of_openai/)
[27](https://render.com/pricing)
[28](https://www.reddit.com/r/LocalLLaMA/comments/1eabwvr/this_is_the_freetier_rate_limits_for_llama31_405b/)
[29](https://www.youtube.com/watch?v=yA78DUIFvWs)
[30](https://northflank.com/blog/render-alternatives)
[31](https://community.groq.com/t/free-tier-time-limit/397)
[32](https://towardsai.net/p/machine-learning/whisper-variants-comparison-what-are-their-features-and-how-to-implement-them)
[33](https://pydigger.com/pypi/pyannote.audio)
[34](https://slashdot.org/software/comparison/Groq-vs-Ollama/)
[35](https://www.linkedin.com/pulse/open-source-win-llm-war-how-groq-ollama-hugging-face-meta-kumud-raj-nymec)
[36](https://www.reddit.com/r/webdev/comments/1j8vace/price_comparison_calculator_for_flyio_heroku/)
[37](https://huggingface.co/pyannote/speaker-diarization-3.0)
[38](https://www.reddit.com/r/ollama/comments/1ib6toj/same_model_on_ollama_performing_worse_than_cloud/)
[39](https://blog.boltops.com/2025/05/01/heroku-vs-render-vs-vercel-vs-fly-io-vs-railway-meet-blossom-an-alternative/)
[40](https://huggingface.co/pyannote/speech-separation-ami-1.0)
[41](https://www.youtube.com/watch?v=E9ZrI0uEK2U)
[42](https://dev.to/alex_aslam/deploy-nodejs-apps-like-a-boss-railway-vs-render-vs-heroku-zero-server-stress-5p3/comments)
[43](https://huggingface.co/pyannote/speaker-diarization/blob/main/LICENSE)
[44](https://getstream.io/blog/best-local-llm-tools/)
[45](https://northflank.com/blog/railway-alternatives)


--- 
Here's how each component of the chosen stack specifically implements the steps in your detailed speaker diarization and speaker recognition pipeline:

***

## 1. Sliding-Window Embedding Extraction

**How it works:**  
- Pyannote.audio divides the input waveform into short fixed-length overlapping frames (typically 1–2 seconds with 50% overlap).[1][8]
- Each frame is passed to the pretrained **ECAPA-TDNN** model (the default in pyannote.audio 3.1) that outputs a high-dimensional embedding vector describing the speaker-specific features while normalizing for noise and channel conditions.[3][10]

**Stack elements:**  
- **Library:** pyannote.audio  
- **Model:** ECAPA-TDNN  
- **Execution:** Runs on CPU in the backend, requires Hugging Face access token for pretrained weights

***

## 2. Clustering of Embeddings

**How it works:**  
- The set of embeddings from all windows are clustered.  
- Pyannote.audio uses **agglomerative hierarchical clustering** (other supported methods include spectral clustering or Bayesian HMM/PLDA backends), which groups embeddings such that within-cluster variance is minimized and between-cluster variance is maximized.[5][10][3]

**Stack elements:**  
- **Library:** pyannote.audio  
- **Algorithm:** Agglomerative clustering  
- **Configuration:** You can pass the number of expected speakers to guide clustering if known (optional).[4][6]

***

## 3. Temporal Smoothing / Re-segmentation

**How it works:**  
- Post-processing corrects for noisy, window-level assignment flips by enforcing temporal continuity.  
- Pyannote.audio applies Hidden Markov Model (HMM) or majority voting post-processing methods to smooth out speaker labels over time, preventing rapid unphysical speaker switches and improving segment reliability.[8][5]

**Stack elements:**  
- **Library:** pyannote.audio  
- **Method:** HMM-based/VB (Variational Bayes) smoothing—default in pipeline

***

## 4. Segment Consolidation

**How it works:**  
- Pyannote.audio merges adjacent windows/frames with the same cluster/speaker label into continuous, longer segments.[10][1][4]
- Each segment gets clear start and end timestamps and an anonymous label: "Speaker 1," "Speaker 2," etc.

**Stack elements:**  
- **Library:** pyannote.audio  
- **Output:** Segments (turns) with speaker labels, available as a Python object or saved as RTTM file  
- **Format:**  
  ```
  start=0.2s stop=1.5s speaker_0
  start=1.8s stop=3.9s speaker_1
  ```

***

## 5. Cluster-Level Speaker Representations

**How it works:**  
- For each cluster, embeddings are pooled (averaged) to form a robust cluster centroid or voiceprint, which summarizes speaker characteristics across the entire segment for later matching or recognition.[7][10]

**Stack elements:**  
- **Library:** pyannote.audio  
- **Operation:** Centroid pooling via numpy, torch, or provided helper methods

***

## 6. Enrollment & Matching Against Known Speakers

**How it works:**  
- When users enroll, their voice samples are converted into embeddings using the same ECAPA-TDNN model.[7]
- When diarizing a meeting, each cluster centroid is compared to all enrolled embeddings using **cosine similarity** (alternatively: PLDA distance).
- If the similarity exceeds a set threshold, the system assigns the known identity; otherwise, it remains anonymous.

**Stack elements:**  
- **Speaker embedding:** pyannote.audio, ECAPA-TDNN  
- **Matching:** Cosine similarity (scikit-learn, numpy, or PyTorch methods) in backend  
- **Config:** Enrollment and inference use matching model and parameters for consistency

***

## 7. Automatic Speech Recognition (ASR)

**How it works:**  
- Each diarized segment (continuous window of a single speaker) is passed to the **faster-whisper** ASR engine.[11][12]
- Transcription is computed per segment, preserving timestamps and speaker labels.

**Stack elements:**  
- **Library:** faster-whisper (Python)  
- **Model:** OpenAI Whisper (base model, quantized for speed)
- **Process:** Each segment is transcribed independently (optionally, in parallel)

***

## 8. Identity-Aware Transcript Assembly

**How it works:**  
- The final pipeline collates outputs from diarization (segment times and speakers), speaker recognition (where possible), and ASR.
- Each transcript line is assembled as:  
  `[start–end] Name/Unknown: Transcribed Text`

**Stack elements:**  
- **Backend logic:** Python (FastAPI)
- **Data structure:** List of segment dicts (timestamp, speaker label or identity, transcript)
- **Frontend:** Displays speaker-attributed transcript, can personalize labels once recognition succeeds

***

**Summary Table**

| Step                            | Stack Element           | Library/Model             | Backend Action                       |
|----------------------------------|------------------------|---------------------------|--------------------------------------|
| Sliding-window embedding         | pyannote.audio         | ECAPA-TDNN                | Frame-level embedding extraction     |
| Clustering                      | pyannote.audio         | Agglomerative clustering  | Group embeddings                     |
| Temporal smoothing              | pyannote.audio         | HMM/majority vote         | Re-segment, fix rapid label flips    |
| Segment consolidation           | pyannote.audio         | -                         | Merge frames into segments           |
| Cluster speaker representations | pyannote.audio         | Centroid pooling          | Average embeddings                   |
| Speaker recognition             | pyannote.audio         | Cosine/PLDA, ECAPA-TDNN   | Match centroids to enrolled voices   |
| ASR                             | faster-whisper         | Whisper (base, quantized) | Per-segment transcription            |
| Transcript assembly             | Python backend logic   | -                         | Combine and format output            |

***

This step-by-step outline shows exactly how each core technology fits into your diarization and recognition workflow, delivering both anonymous and identity-aware transcripts with high reliability and full transparency for debugging or extension.[2][1][3][4][5][7]

[1](https://vast.ai/article/speaker-diarization-with-pyannote-on-vast)
[2](https://dev.to/gracezzhang/speaker-diarization-in-python-235i)
[3](https://github.com/pyannote/pyannote-audio)
[4](https://huggingface.co/pyannote/speaker-diarization)
[5](https://docs.openvino.ai/2023.3/notebooks/212-pyannote-speaker-diarization-with-output.html)
[6](https://dataloop.ai/library/model/philschmid_pyannote-speaker-diarization-endpoint/)
[7](https://www.gladia.io/blog/build-a-speaker-identification-system-for-online-meetings)
[8](https://www.isca-archive.org/interspeech_2023/bredin23_interspeech.pdf)
[9](https://github.com/pyannote/pyannote-audio/discussions/763)
[10](https://huggingface.co/pyannote/speaker-diarization-3.1)
[11](https://github.com/SYSTRAN/faster-whisper)
[12](https://quids.tech/blog/showdown-of-whisper-variants/)


## Decisions & Follow-ups
- 2025-09-22: Primary LLM provider switched from Groq to OpenAI API (`gpt-4o-mini` planned).
- Track OpenAI usage costs versus demo expectations; update deployment budgeting accordingly.
