from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from structlog import get_logger

from ..api.deps import (
    get_app_settings,
    get_meeting_srv,
    get_pipeline,
    get_speaker_srv,
    get_task_manager,
)
from ..core.config import Settings
from ..core.task_queue import BackgroundTaskManager
from ..models.api import (
    HealthResponse,
    MeetingProcessRequest,
    MeetingResultsResponse,
    MeetingStatusResponse,
    SpeakerEnrollRequest,
    SpeakerEnrollResponse,
)
from ..models.meeting import MeetingRecord, MeetingStatus
from ..models.speaker import SpeakerProfile
from ..pipeline.processor import MeetingPipeline
from ..services.meeting_service import MeetingService
from ..services.speaker_service import SpeakerService

_logger = get_logger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(_settings: Settings = Depends(get_app_settings)) -> HealthResponse:
    return HealthResponse(status="ok", timestamp=datetime.utcnow())


@router.post("/api/speakers/enroll", response_model=SpeakerEnrollResponse, status_code=status.HTTP_201_CREATED)
async def enroll_speaker(
    payload: SpeakerEnrollRequest,
    speaker_service: SpeakerService = Depends(get_speaker_srv),
) -> SpeakerEnrollResponse:
    profile = SpeakerProfile(label=payload.label, metadata=payload.metadata)
    if payload.audio_path:
        profile.metadata["audio_path"] = str(payload.audio_path)
    speaker_service.create_profile(profile)
    _logger.info("speaker_enrolled", speaker_id=str(profile.id), label=profile.label)
    return SpeakerEnrollResponse(speaker_id=profile.id, label=profile.label, created_at=profile.created_at)


@router.post("/api/meetings/process", response_model=MeetingStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def process_meeting(
    payload: MeetingProcessRequest,
    meeting_service: MeetingService = Depends(get_meeting_srv),
    pipeline: MeetingPipeline = Depends(get_pipeline),
    task_manager: BackgroundTaskManager = Depends(get_task_manager),
) -> MeetingStatusResponse:
    record = MeetingRecord(metadata={
        "meeting_name": payload.meeting_name,
        "speaker_ids": [str(sid) for sid in payload.speaker_ids],
    })
    if payload.audio_path:
        record.metadata["audio_path"] = str(payload.audio_path)
    if payload.agenda:
        record.metadata["agenda"] = payload.agenda

    meeting_service.create(record)

    async def task() -> None:
        await pipeline.run(record.id, agenda=payload.agenda, speaker_ids=payload.speaker_ids)

    await task_manager.submit(str(record.id), task)
    _logger.info("meeting_job_submitted", meeting_id=str(record.id))
    return MeetingStatusResponse(
        meeting_id=record.id,
        status=record.status,
        status_message=record.status_message,
        updated_at=record.updated_at,
    )


@router.get("/api/meetings/{meeting_id}/status", response_model=MeetingStatusResponse)
async def get_meeting_status(
    meeting_id: UUID,
    meeting_service: MeetingService = Depends(get_meeting_srv),
) -> MeetingStatusResponse:
    record = meeting_service.get_record(meeting_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return MeetingStatusResponse(
        meeting_id=record.id,
        status=record.status,
        status_message=record.status_message,
        updated_at=record.updated_at,
    )


@router.get("/api/meetings/{meeting_id}/results", response_model=MeetingResultsResponse)
async def get_meeting_results(
    meeting_id: UUID,
    meeting_service: MeetingService = Depends(get_meeting_srv),
) -> MeetingResultsResponse:
    record = meeting_service.get_record(meeting_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    result = meeting_service.get_result(meeting_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Results not ready")
    return MeetingResultsResponse(
        meeting_id=meeting_id,
        status=record.status,
        summary=result.summary,
        transcript=result.transcript,
        action_items=result.action_items,
        artifacts={"results_path": record.results_path} if record.results_path else {},
    )
