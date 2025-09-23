from __future__ import annotations

from fastapi import Depends

from ..core.config import Settings, get_settings
from ..core.task_queue import BackgroundTaskManager, get_background_tasks, init_background_tasks
from ..pipeline.processor import MeetingPipeline
from ..services.meeting_service import MeetingService, get_meeting_service
from ..services.speaker_service import SpeakerService, get_speaker_service


async def get_app_settings() -> Settings:
    return get_settings()


async def get_speaker_srv(settings: Settings = Depends(get_app_settings)) -> SpeakerService:
    return get_speaker_service(settings)


async def get_meeting_srv(settings: Settings = Depends(get_app_settings)) -> MeetingService:
    return get_meeting_service(settings)


async def get_pipeline(
    meeting_service: MeetingService = Depends(get_meeting_srv),
    speaker_service: SpeakerService = Depends(get_speaker_srv),
) -> MeetingPipeline:
    return MeetingPipeline(meeting_service=meeting_service, speaker_service=speaker_service)


async def get_task_manager(settings: Settings = Depends(get_app_settings)) -> BackgroundTaskManager:
    manager = get_background_tasks()
    return manager


def setup_background_tasks(settings: Settings) -> None:
    init_background_tasks(max_concurrent_tasks=settings.max_concurrent_jobs)
