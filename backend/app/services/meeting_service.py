from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from uuid import UUID

from structlog import get_logger

from ..core.config import Settings
from ..models.meeting import MeetingRecord, MeetingResult, MeetingStatus

_logger = get_logger(__name__)


class MeetingService:
    """Tracks meeting processing metadata and results."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._meetings_dir = self._settings.data_dir / "meetings"
        self._meetings_dir.mkdir(parents=True, exist_ok=True)
        self._records: Dict[UUID, MeetingRecord] = {}
        self._results: Dict[UUID, MeetingResult] = {}
        self._load_existing()

    def _load_existing(self) -> None:
        for metadata_path in self._meetings_dir.glob("*/metadata.json"):
            try:
                data = json.loads(metadata_path.read_text())
                record = MeetingRecord.parse_obj(data)
                self._records[record.id] = record
                results_path = metadata_path.parent / "results.json"
                if results_path.exists():
                    result_data = json.loads(results_path.read_text())
                    self._results[record.id] = MeetingResult.parse_obj(result_data)
            except Exception as exc:  # noqa: BLE001
                _logger.exception("failed_to_load_meeting", file=str(metadata_path), error=str(exc))

    def _meeting_dir(self, meeting_id: UUID) -> Path:
        meeting_dir = self._meetings_dir / str(meeting_id)
        meeting_dir.mkdir(parents=True, exist_ok=True)
        return meeting_dir

    def create(self, record: MeetingRecord) -> MeetingRecord:
        self._records[record.id] = record
        self._persist_record(record)
        return record

    def update_status(self, meeting_id: UUID, status: MeetingStatus, message: Optional[str] = None) -> None:
        record = self._records.get(meeting_id)
        if record is None:
            raise KeyError(f"Unknown meeting ID: {meeting_id}")
        record.status = status
        record.status_message = message
        record.updated_at = datetime.utcnow()
        self._persist_record(record)
        _logger.info("meeting_status_updated", meeting_id=str(meeting_id), status=status)

    def store_results(self, meeting_id: UUID, results: MeetingResult) -> None:
        self._results[meeting_id] = results
        record = self._records.get(meeting_id)
        if record:
            record.status = MeetingStatus.COMPLETED
            record.updated_at = datetime.utcnow()
            self._persist_record(record)
        meeting_dir = self._meeting_dir(meeting_id)
        results_path = meeting_dir / "results.json"
        results_path.write_text(results.json(indent=2))
        if record:
            record.results_path = str(results_path)
            self._persist_record(record)
        _logger.info("meeting_results_saved", meeting_id=str(meeting_id))

    def get_record(self, meeting_id: UUID) -> Optional[MeetingRecord]:
        return self._records.get(meeting_id)

    def get_result(self, meeting_id: UUID) -> Optional[MeetingResult]:
        return self._results.get(meeting_id)

    def _persist_record(self, record: MeetingRecord) -> None:
        meeting_dir = self._meeting_dir(record.id)
        (meeting_dir / "metadata.json").write_text(record.json(indent=2))


_meeting_service: Optional[MeetingService] = None


def get_meeting_service(settings: Settings) -> MeetingService:
    global _meeting_service
    if _meeting_service is None:
        _meeting_service = MeetingService(settings)
    return _meeting_service
