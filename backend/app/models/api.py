from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .meeting import MeetingStatus


class SpeakerEnrollRequest(BaseModel):
    label: str = Field(..., description="Human-readable speaker label, e.g. 'Sami'")
    audio_path: Optional[Path] = Field(
        default=None,
        description="Path to pre-uploaded audio sample; file upload support will be added later.",
    )
    metadata: Dict[str, str] = Field(default_factory=dict)


class SpeakerEnrollResponse(BaseModel):
    speaker_id: UUID
    label: str
    created_at: datetime


class MeetingProcessRequest(BaseModel):
    meeting_name: str
    audio_path: Optional[Path] = Field(default=None, description="Path to meeting audio on disk")
    agenda: Optional[str] = Field(default=None, description="Optional agenda/notes to feed the LLM")
    speaker_ids: List[UUID] = Field(default_factory=list)


class MeetingStatusResponse(BaseModel):
    meeting_id: UUID
    status: MeetingStatus
    status_message: Optional[str] = None
    updated_at: datetime


class MeetingResultsResponse(BaseModel):
    meeting_id: UUID
    status: MeetingStatus
    summary: Optional[str]
    transcript: Optional[Dict[str, str]]
    action_items: Optional[Dict[str, str]]
    artifacts: Dict[str, str] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
