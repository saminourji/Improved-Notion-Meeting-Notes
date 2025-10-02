from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import List, Optional
import uuid
import os
import json
from dotenv import load_dotenv
import structlog

from .pipeline.processor import MeetingProcessor
from .core.config import get_settings
from .core.logging import setup_logging

# Load environment variables
load_dotenv()

app = FastAPI(title="Notion Meeting Notes", version="1.0.0")

# Global processor instance
processor: Optional[MeetingProcessor] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the application."""
    global processor

    settings = get_settings()
    setup_logging(settings)
    logger = structlog.get_logger(__name__)

    # Initialize processor with environment variables
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not hf_token:
        logger.error("HUGGINGFACE_TOKEN environment variable required")
        raise RuntimeError("HUGGINGFACE_TOKEN not configured")

    if not openai_key:
        logger.error("OPENAI_API_KEY environment variable required")
        raise RuntimeError("OPENAI_API_KEY not configured")

    processor = MeetingProcessor(hf_token, openai_key)
    logger.info("application_startup_complete")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Meeting Notes API is running"}

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

    if processor is None:
        raise HTTPException(status_code=500, detail="Processor not initialized")

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
        speaker_list = speaker_names.split(",") if speaker_names else []

        voice_files = [voice_sample_1, voice_sample_2, voice_sample_3]
        for i, (voice_file, speaker_name) in enumerate(zip(voice_files, speaker_list)):
            if voice_file and speaker_name.strip():
                voice_path = temp_dir / f"voice_{speaker_name.strip()}_{voice_file.filename}"
                with open(voice_path, "wb") as f:
                    voice_content = await voice_file.read()
                    f.write(voice_content)

                voice_samples[speaker_name.strip()] = voice_path
                logger.info("voice_sample_uploaded",
                           speaker=speaker_name.strip(),
                           filename=voice_file.filename,
                           size_bytes=len(voice_content))

        # Process the meeting
        logger.info("starting_meeting_processing",
                   request_id=request_id,
                   generate_insights=generate_insights,
                   generate_all_action_views=generate_all_action_views)
        result = processor.process_meeting(meeting_path, voice_samples,
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

        return JSONResponse(content={
            "success": True,
            "request_id": request_id,
            "result": result,
            "metadata": {
                "segments": len(result['segments']),
                "speakers": result['processing_metadata']['speakers_identified'],
                "duration": result['processing_metadata']['total_duration']
            }
        })

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

    if processor is None:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    try:
        logger.info("generating_summary_from_transcript",
                   transcript_length=len(transcript))

        metadata = {}
        if duration_minutes:
            metadata['duration'] = duration_minutes

        summary_result = processor.llm_service.generate_meeting_summary(transcript, metadata, user_notes)

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

    if processor is None:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    try:
        logger.info("extracting_action_items_from_transcript",
                   transcript_length=len(transcript),
                   target_speaker=speaker)

        action_items_result = processor.llm_service.extract_action_items_by_speaker(
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

    if processor is None:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    try:
        logger.info("extracting_all_action_item_views_from_transcript",
                   transcript_length=len(transcript))

        all_views_result = processor.llm_service.extract_all_action_item_views(transcript, user_notes)

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

    if processor is None:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    try:
        logger.info("generating_comprehensive_insights_from_transcript",
                   transcript_length=len(transcript))

        metadata = {}
        if duration_minutes:
            metadata['duration'] = duration_minutes

        insights = processor.llm_service.generate_meeting_insights(transcript, metadata, user_notes)

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