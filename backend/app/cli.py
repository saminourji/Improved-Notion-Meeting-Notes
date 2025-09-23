from __future__ import annotations

import argparse
import asyncio
from typing import List
from uuid import UUID

from structlog import get_logger

from .core.config import get_settings
from .core.logging import setup_logging
from .models.meeting import MeetingRecord
from .pipeline.processor import MeetingPipeline
from .services.meeting_service import MeetingService, get_meeting_service
from .services.speaker_service import SpeakerService, get_speaker_service

_logger = get_logger(__name__)


def _init_services() -> tuple[MeetingService, SpeakerService, MeetingPipeline]:
    settings = get_settings()
    setup_logging(settings)
    meeting_service = get_meeting_service(settings)
    speaker_service = get_speaker_service(settings)
    pipeline = MeetingPipeline(meeting_service=meeting_service, speaker_service=speaker_service)
    return meeting_service, speaker_service, pipeline


async def _run_process_meeting(
    meeting_name: str,
    audio_path: str | None,
    agenda: str | None,
    speaker_ids: List[str],
) -> None:
    meeting_service, speaker_service, pipeline = _init_services()

    parsed_speaker_ids = [UUID(sid) for sid in speaker_ids]

    record = MeetingRecord(metadata={"meeting_name": meeting_name, "cli": True})
    if audio_path:
        record.metadata["audio_path"] = audio_path
    if agenda:
        record.metadata["agenda"] = agenda

    meeting_service.create(record)
    await pipeline.run(record.id, agenda=agenda, speaker_ids=parsed_speaker_ids)

    result = meeting_service.get_result(record.id)
    if result:
        summary = result.summary or "No summary generated."
        print(f"Summary:
{summary}
")
        if result.action_items:
            print("Action Items:")
            for speaker, action_item in result.action_items.items():
                print(f"- {speaker}: {action_item}")
        else:
            print("No action items generated yet.")


def _handle_list_speakers() -> None:
    _, speaker_service, _ = _init_services()
    profiles = speaker_service.list_profiles()
    if not profiles:
        print("No speaker profiles found. Use the API or future CLI command to enroll speakers.")
        return
    for profile in profiles.values():
        print(f"{profile.id} -> {profile.label}")


def main() -> None:
    parser = argparse.ArgumentParser(description="CLI utilities for the Improved Notion Meeting Notes backend")
    subparsers = parser.add_subparsers(dest="command")

    process_parser = subparsers.add_parser("process-meeting", help="Run the meeting pipeline for a local audio file")
    process_parser.add_argument("meeting_name", help="Human-readable meeting name")
    process_parser.add_argument("--audio-path", help="Path to meeting audio file", default=None)
    process_parser.add_argument("--agenda", help="Optional agenda text", default=None)
    process_parser.add_argument(
        "--speaker-id",
        action="append",
        dest="speaker_ids",
        default=[],
        help="Speaker profile ID to associate with the meeting. Provide multiple times for multiple speakers.",
    )

    subparsers.add_parser("list-speakers", help="List enrolled speaker profiles")

    args = parser.parse_args()

    if args.command == "process-meeting":
        asyncio.run(
            _run_process_meeting(
                meeting_name=args.meeting_name,
                audio_path=args.audio_path,
                agenda=args.agenda,
                speaker_ids=args.speaker_ids,
            )
        )
    elif args.command == "list-speakers":
        _handle_list_speakers()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
