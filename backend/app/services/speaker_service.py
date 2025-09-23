from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional
from uuid import UUID

from structlog import get_logger

from ..core.config import Settings
from ..models.speaker import SpeakerProfile

_logger = get_logger(__name__)


class SpeakerService:
    """Manages speaker profiles. Persistence is filesystem-based for now."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._profiles_path = self._settings.data_dir / "profiles"
        self._profiles_path.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[UUID, SpeakerProfile] = {}
        self._load_profiles()

    def _load_profiles(self) -> None:
        for profile_json in self._profiles_path.glob("*.json"):
            try:
                data = json.loads(profile_json.read_text())
                profile = SpeakerProfile.parse_obj(data)
                self._cache[profile.id] = profile
            except Exception as exc:  # noqa: BLE001
                _logger.exception("failed_to_load_profile", file=str(profile_json), error=str(exc))

    def _profile_path(self, profile_id: UUID) -> Path:
        return self._profiles_path / f"{profile_id}.json"

    def create_profile(self, profile: SpeakerProfile) -> SpeakerProfile:
        self._cache[profile.id] = profile
        self._profile_path(profile.id).write_text(profile.json(indent=2))
        _logger.info("speaker_profile_saved", speaker_id=str(profile.id), label=profile.label)
        return profile

    def get_profile(self, profile_id: UUID) -> Optional[SpeakerProfile]:
        return self._cache.get(profile_id)

    def list_profiles(self) -> Dict[UUID, SpeakerProfile]:
        return self._cache.copy()


_speaker_service: Optional[SpeakerService] = None


def get_speaker_service(settings: Settings) -> SpeakerService:
    global _speaker_service
    if _speaker_service is None:
        _speaker_service = SpeakerService(settings)
    return _speaker_service
