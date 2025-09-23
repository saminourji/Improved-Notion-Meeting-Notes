from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class MeetingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MeetingRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: MeetingStatus = MeetingStatus.PENDING
    status_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    results_path: Optional[str] = None

    class Config:
        orm_mode = True


class MeetingResult(BaseModel):
    summary: Optional[str]
    transcript: Optional[Dict[str, Any]]
    action_items: Optional[Dict[str, Any]]
    extra: Dict[str, Any] = Field(default_factory=dict)
