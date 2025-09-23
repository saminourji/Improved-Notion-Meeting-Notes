from __future__ import annotations

import asyncio
from typing import Dict, List
from uuid import UUID

from structlog import get_logger

from ..models.meeting import MeetingResult, MeetingStatus
from ..services.meeting_service import MeetingService
from ..services.speaker_service import SpeakerService

_logger = get_logger(__name__)


class MeetingPipeline:
    """Placeholder meeting processing pipeline.

    Replace stubbed stages with real integrations (audio normalization,
    diarization, transcription, LLM prompts)."""

    def __init__(
        self,
        meeting_service: MeetingService,
        speaker_service: SpeakerService,
    ) -> None:
        self._meeting_service = meeting_service
        self._speaker_service = speaker_service

    async def run(self, meeting_id: UUID, agenda: str | None, speaker_ids: List[UUID]) -> None:
        _logger.info(
            "pipeline_started", meeting_id=str(meeting_id), agenda_provided=bool(agenda), speakers=len(speaker_ids)
        )
        try:
            self._meeting_service.update_status(meeting_id, MeetingStatus.PROCESSING, message="pipeline running")
            await self._simulate_stage(meeting_id, "normalize_audio")
            await self._simulate_stage(meeting_id, "diarization")
            await self._simulate_stage(meeting_id, "transcription")
            await self._simulate_stage(meeting_id, "llm_generation")

            summary = "Pipeline stub summary."
            transcript: Dict[str, str] = {"Speaker 1": "Transcript placeholder."}
            action_items: Dict[str, str] = {"Speaker 1": "Follow up with project updates."}

            result = MeetingResult(
                summary=summary,
                transcript=transcript,
                action_items=action_items,
                extra={"agenda": agenda},
            )
            self._meeting_service.store_results(meeting_id, result)
            _logger.info("pipeline_completed", meeting_id=str(meeting_id))
        except Exception as exc:  # noqa: BLE001
            _logger.exception("pipeline_failed", meeting_id=str(meeting_id), error=str(exc))
            self._meeting_service.update_status(
                meeting_id,
                MeetingStatus.FAILED,
                message=str(exc),
            )

    async def _simulate_stage(self, meeting_id: UUID, stage: str) -> None:
        _logger.info("pipeline_stage_start", meeting_id=str(meeting_id), stage=stage)
        await asyncio.sleep(0)  # Placeholder for async work
        _logger.info("pipeline_stage_end", meeting_id=str(meeting_id), stage=stage)
