from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import List, Optional
import uuid
import os
import json
from dotenv import load_dotenv
import structlog

from .pipeline.processor import MeetingProcessor
from .pipeline.processor import SpeakerDiarizer
from .pipeline.processor import AudioProcessor
from .pipeline.speaker_database import SpeakerDatabase
from .core.config import get_settings
from .core.logging import setup_logging

# Load environment variables
load_dotenv()

app = FastAPI(title="Notion Meeting Notes", version="1.0.0")

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://your-frontend-domain.com"  # Update this with your production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global processor instance
processor: Optional[MeetingProcessor] = None
speaker_db: Optional[SpeakerDatabase] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the application."""
    print("🔧 Initializing application...")
    
    try:
        settings = get_settings()
        print("✅ Settings loaded")
        
        setup_logging(settings)
        print("✅ Logging configured")
        
        logger = structlog.get_logger(__name__)
        
        # Validate environment variables but don't initialize processor yet (lazy loading)
        hf_token = os.getenv("HUGGINGFACE_TOKEN")
        openai_key = os.getenv("OPENAI_API_KEY")

        if not hf_token:
            print("⚠️  HUGGINGFACE_TOKEN not set")
            logger.warning("HUGGINGFACE_TOKEN environment variable not set - processor will fail if used")
        else:
            print("✅ HUGGINGFACE_TOKEN configured")
        
        if not openai_key:
            print("⚠️  OPENAI_API_KEY not set")
            logger.warning("OPENAI_API_KEY environment variable not set - processor will fail if used")
        else:
            print("✅ OPENAI_API_KEY configured")
        
        logger.info("application_startup_complete", 
                    env_vars_configured=bool(hf_token and openai_key))
        print("✅ Application startup complete!")
        
    except Exception as e:
        print(f"❌ Startup failed: {e}")
        import traceback
        traceback.print_exc()
        raise

def get_processor():
    """Lazy initialization of processor."""
    global processor
    if processor is None:
        logger = structlog.get_logger(__name__)
        hf_token = os.getenv("HUGGINGFACE_TOKEN")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if not hf_token:
            raise RuntimeError("HUGGINGFACE_TOKEN not configured")
        if not openai_key:
            raise RuntimeError("OPENAI_API_KEY not configured")
            
        logger.info("initializing_meeting_processor")
        processor = MeetingProcessor(hf_token, openai_key)
        logger.info("meeting_processor_initialized")
    return processor

def get_speaker_db() -> SpeakerDatabase:
    """Lazy initialization of speaker database."""
    global speaker_db
    if speaker_db is None:
        speaker_db = SpeakerDatabase()
    return speaker_db

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Meeting Notes API is running"}

@app.get("/speakers")
async def list_speakers_endpoint():
    """List all registered speakers and their metadata."""
    logger = structlog.get_logger(__name__)
    try:
        db = get_speaker_db()
        names = db.list_speakers()
        speakers = []
        for name in names:
            data = db.get_speaker(name) or {}
            speakers.append({
                "id": name,
                "name": name,
                "metadata": data.get("metadata", {})
            })
        return JSONResponse(content={"speakers": speakers})
    except Exception as e:
        logger.exception("list_speakers_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list speakers: {str(e)}")

@app.get("/speakers/{name}")
async def get_speaker_endpoint(name: str):
    """Get details for a specific speaker."""
    db = get_speaker_db()
    data = db.get_speaker(name)
    if not data:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return JSONResponse(content={"name": name, "metadata": data.get("metadata", {})})

@app.post("/speakers")
async def add_speaker_endpoint(
    name: str = Form(...),
    voice_sample: UploadFile = File(...)
):
    """Register a speaker with a voice sample. Extracts embedding and persists to DB."""
    logger = structlog.get_logger(__name__)
    try:
        # Normalize speaker name
        clean_name = name.strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="Speaker name cannot be empty")
            
        # Ensure we can embed
        proc = get_processor()
        db = get_speaker_db()

        # Save uploaded sample to temp
        request_id = str(uuid.uuid4())
        temp_dir = Path("data/temp") / f"speaker_{request_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            raw_path = temp_dir / voice_sample.filename
            with open(raw_path, "wb") as f:
                content = await voice_sample.read()
                f.write(content)

            audio_processor = proc.audio_processor if hasattr(proc, "audio_processor") else AudioProcessor()
            diarizer = proc.diarizer if hasattr(proc, "diarizer") else SpeakerDiarizer(os.getenv("HUGGINGFACE_TOKEN"))

            wav_path = audio_processor.convert_to_wav(raw_path)
            embedding = diarizer.extract_speaker_embedding(wav_path)

            success = db.add_speaker(clean_name, embedding, {
                "source_audio": str(raw_path),
                "processed_audio": str(wav_path),
                "added_via": "api"
            })

            if not success:
                raise RuntimeError("Failed to persist speaker")

            return JSONResponse(content={"id": clean_name, "name": clean_name, "metadata": db.get_speaker(clean_name).get("metadata", {})})
        finally:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        logger.exception("add_speaker_failed", speaker=clean_name if 'clean_name' in locals() else None, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to add speaker: {str(e)}")

@app.delete("/speakers/{name}")
async def delete_speaker_endpoint(name: str):
    """Delete a speaker from the database."""
    logger = structlog.get_logger(__name__)
    try:
        db = get_speaker_db()
        if name not in db.list_speakers():
            raise HTTPException(status_code=404, detail="Speaker not found")
        if not db.remove_speaker(name):
            raise HTTPException(status_code=500, detail="Failed to remove speaker")
        return JSONResponse(content={"success": True})
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("delete_speaker_failed", speaker=name, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete speaker: {str(e)}")

@app.post("/process")
async def process_meeting_endpoint(
    meeting_audio: UploadFile = File(...),
    speaker_names: Optional[str] = Form(None),
    voice_sample_1: Optional[UploadFile] = File(None),
    voice_sample_2: Optional[UploadFile] = File(None),
    voice_sample_3: Optional[UploadFile] = File(None),
    generate_insights: bool = Form(True),
    generate_all_action_views: bool = Form(False)
):
    """Process a meeting with optional voice samples for speaker identification."""
    logger = structlog.get_logger(__name__)

    try:
        proc = get_processor()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Create temporary directory for this request
    request_id = str(uuid.uuid4())
    temp_dir = Path("data/temp") / request_id
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Save meeting audio
        meeting_path = temp_dir / f"meeting_{meeting_audio.filename}"
        with open(meeting_path, "wb") as f:
            content = await meeting_audio.read()
            f.write(content)

        logger.info("meeting_audio_uploaded",
                   filename=meeting_audio.filename,
                   size_bytes=len(content))

        # Handle voice samples
        voice_samples = {}
        speaker_list = [name.strip() for name in speaker_names.split(",")] if speaker_names else []
        speaker_list = [name for name in speaker_list if name]  # Remove empty names

        voice_files = [voice_sample_1, voice_sample_2, voice_sample_3]
        for i, (voice_file, speaker_name) in enumerate(zip(voice_files, speaker_list)):
            if voice_file and speaker_name:
                voice_path = temp_dir / f"voice_{speaker_name}_{voice_file.filename}"
                with open(voice_path, "wb") as f:
                    voice_content = await voice_file.read()
                    f.write(voice_content)

                voice_samples[speaker_name] = voice_path
                logger.info("voice_sample_uploaded",
                           speaker=speaker_name,
                           filename=voice_file.filename,
                           size_bytes=len(voice_content))

        # Reload speaker database to ensure we have latest registered speakers
        proc.speaker_db.reload()
        logger.info("speakers_loaded_for_matching", count=len(proc.speaker_db.list_speakers()), names=proc.speaker_db.list_speakers())
        
        # Process the meeting
        logger.info("starting_meeting_processing",
                   request_id=request_id,
                   generate_insights=generate_insights,
                   generate_all_action_views=generate_all_action_views)
        result = proc.process_meeting(meeting_path, voice_samples,
                                         generate_insights=generate_insights,
                                         generate_all_action_views=generate_all_action_views)

        # Save results
        results_dir = Path("data/results")
        results_dir.mkdir(exist_ok=True)
        result_file = results_dir / f"meeting_{request_id}.json"

        with open(result_file, 'w') as f:
            json.dump(result, f, indent=2, default=str)

        logger.info("meeting_processing_complete",
                   request_id=request_id,
                   result_file=str(result_file))

        # Clean up temporary files
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

        # Extract speaker information for frontend display
        detected_speakers = []
        known_speakers = set(proc.speaker_db.list_speakers())
        
        # Clean segments to ensure JSON serializable values
        clean_segments = []
        for segment in result['segments']:
            speaker_name = segment.get('matched_speaker', 'Unknown')
            if speaker_name not in [s['name'] for s in detected_speakers]:
                detected_speakers.append({
                    "name": speaker_name,
                    "matched": speaker_name in known_speakers
                })
            
            # Convert numpy types to native Python types for JSON serialization
            clean_segment = {}
            for key, value in segment.items():
                if hasattr(value, 'item'):  # numpy scalar
                    clean_segment[key] = value.item()
                elif isinstance(value, (list, tuple)):
                    clean_segment[key] = [v.item() if hasattr(v, 'item') else v for v in value]
                else:
                    clean_segment[key] = value
            clean_segments.append(clean_segment)
        
        # Flatten response structure to match frontend expectations
        response_data = {
            "success": True,
            "request_id": request_id,
            "transcription": {
                "segments": clean_segments
            },
            "speakers": detected_speakers,
            "metadata": {
                "segments": len(clean_segments),
                "speakers": result['processing_metadata']['speakers_identified'],
                "duration": result['processing_metadata']['total_duration']
            }
        }
        
        # Add LLM insights if available
        if 'llm_insights' in result and isinstance(result['llm_insights'], dict):
            if 'summary' in result['llm_insights']:
                response_data['summary'] = result['llm_insights']['summary']
            if 'action_items_by_speaker' in result['llm_insights']:
                response_data['action_items_by_speaker'] = result['llm_insights']['action_items_by_speaker']
            if 'participants' in result['llm_insights']:
                response_data['participants'] = result['llm_insights']['participants']
        
        return JSONResponse(content=response_data)

    except Exception as e:
        logger.exception("meeting_processing_failed",
                        request_id=request_id,
                        error=str(e))

        # Clean up on error
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/summarize")
async def generate_summary_endpoint(
    transcript: str = Form(...),
    duration_minutes: Optional[float] = Form(None),
    user_notes: Optional[str] = Form(None)
):
    """Generate a meeting summary from a speaker-annotated transcript."""
    logger = structlog.get_logger(__name__)

    try:
        proc = get_processor()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        logger.info("generating_summary_from_transcript",
                   transcript_length=len(transcript))

        metadata = {}
        if duration_minutes:
            metadata['duration'] = duration_minutes

        summary_result = proc.llm_service.generate_meeting_summary(transcript, metadata, user_notes)

        return JSONResponse(content={
            "success": True,
            "summary": summary_result["summary"],
            "participants": summary_result["participants"],
            "metadata": summary_result["metadata"]
        })

    except Exception as e:
        logger.exception("summary_generation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

@app.post("/action-items")
async def extract_action_items_endpoint(
    transcript: str = Form(...),
    speaker: Optional[str] = Form(None),
    user_notes: Optional[str] = Form(None)
):
    """Extract action items from a speaker-annotated transcript.

    Args:
        transcript: Speaker-annotated meeting transcript
        speaker: Optional speaker name for personalized view (if not provided, returns general view)
        user_notes: Optional user-provided notes to incorporate into action items
    """
    logger = structlog.get_logger(__name__)

    try:
        proc = get_processor()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        logger.info("extracting_action_items_from_transcript",
                   transcript_length=len(transcript),
                   target_speaker=speaker)

        action_items_result = proc.llm_service.extract_action_items_by_speaker(
            transcript, target_speaker=speaker, user_notes=user_notes
        )

        return JSONResponse(content={
            "success": True,
            "action_items_by_speaker": action_items_result["action_items"],
            "metadata": action_items_result["metadata"]
        })

    except Exception as e:
        logger.exception("action_items_extraction_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Action items extraction failed: {str(e)}")

@app.post("/action-items/all-views")
async def extract_all_action_items_views_endpoint(
    transcript: str = Form(...),
    user_notes: Optional[str] = Form(None)
):
    """Extract all action item views: general + speaker-specific views for each participant."""
    logger = structlog.get_logger(__name__)

    try:
        proc = get_processor()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        logger.info("extracting_all_action_item_views_from_transcript",
                   transcript_length=len(transcript))

        all_views_result = proc.llm_service.extract_all_action_item_views(transcript, user_notes)

        return JSONResponse(content={
            "success": True,
            "general_view": all_views_result["general_view"],
            "speaker_views": all_views_result["speaker_views"],
            "metadata": all_views_result["metadata"]
        })

    except Exception as e:
        logger.exception("all_action_items_views_extraction_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"All action items views extraction failed: {str(e)}")

@app.post("/insights")
async def generate_insights_endpoint(
    transcript: str = Form(...),
    duration_minutes: Optional[float] = Form(None),
    user_notes: Optional[str] = Form(None)
):
    """Generate comprehensive meeting insights (summary + action items) from a transcript."""
    logger = structlog.get_logger(__name__)

    try:
        proc = get_processor()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        logger.info("generating_comprehensive_insights_from_transcript",
                   transcript_length=len(transcript))

        metadata = {}
        if duration_minutes:
            metadata['duration'] = duration_minutes

        insights = proc.llm_service.generate_meeting_insights(transcript, metadata, user_notes)

        return JSONResponse(content={
            "success": True,
            "summary": insights["summary"],
            "action_items_by_speaker": insights["action_items_by_speaker"],
            "participants": insights["participants"],
            "metadata": insights["metadata"]
        })

    except Exception as e:
        logger.exception("insights_generation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)