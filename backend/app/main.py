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
    voice_sample_3: Optional[UploadFile] = File(None)
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
        logger.info("starting_meeting_processing", request_id=request_id)
        result = processor.process_meeting(meeting_path, voice_samples)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)