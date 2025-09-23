from datetime import datetime
from typing import Dict, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class SpeakerProfile(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    label: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    embedding_path: Optional[str] = None
    metadata: Dict[str, str] = Field(default_factory=dict)

    class Config:
        orm_mode = True
