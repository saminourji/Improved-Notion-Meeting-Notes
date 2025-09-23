#!/usr/bin/env python3
"""CLI tool for managing the speaker database."""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path
import argparse
import json
from dotenv import load_dotenv
from app.pipeline.speaker_database import SpeakerDatabase
from app.pipeline.processor import SpeakerDiarizer, AudioProcessor

# Load environment variables
load_dotenv()

def list_speakers(db_path: Path = None):
    """List all speakers in the database."""
    db = SpeakerDatabase(db_path)
    speakers = db.list_speakers()

    if not speakers:
        print("📭 No speakers in database")
        return

    print(f"👥 Speakers in database ({len(speakers)}):")
    for speaker in speakers:
        speaker_data = db.get_speaker(speaker)
        metadata = speaker_data['metadata']

        print(f"\n  🎤 {speaker}")
        print(f"     Created: {metadata.get('created_at', 'Unknown')}")
        print(f"     Embedding: {metadata.get('embedding_shape', 'Unknown')}")

        if 'source_audio' in metadata:
            print(f"     Source: {Path(metadata['source_audio']).name}")

def add_speaker(name: str, audio_file: Path, db_path: Path = None):
    """Add a speaker to the database from an audio file."""
    if not audio_file.exists():
        print(f"❌ Audio file not found: {audio_file}")
        return False

    # Check for required tokens
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        print("❌ HUGGINGFACE_TOKEN required")
        return False

    try:
        print(f"🔄 Adding speaker: {name}")
        print(f"📁 Audio file: {audio_file}")

        # Initialize components
        db = SpeakerDatabase(db_path)
        audio_processor = AudioProcessor()
        diarizer = SpeakerDiarizer(hf_token)

        # Convert audio
        wav_file = audio_processor.convert_to_wav(audio_file)
        print(f"🔄 Converted to: {wav_file}")

        # Extract embedding
        print("🧠 Extracting speaker embedding...")
        embedding = diarizer.extract_speaker_embedding(wav_file)

        # Add to database
        metadata = {
            'source_audio': str(audio_file),
            'processed_audio': str(wav_file),
            'added_via': 'cli'
        }

        success = db.add_speaker(name, embedding, metadata)

        if success:
            print(f"✅ Speaker '{name}' added to database")
            print(f"   Embedding shape: {embedding.shape}")
            return True
        else:
            print(f"❌ Failed to add speaker '{name}'")
            return False

    except Exception as e:
        print(f"❌ Error adding speaker: {e}")
        return False

def remove_speaker(name: str, db_path: Path = None):
    """Remove a speaker from the database."""
    db = SpeakerDatabase(db_path)

    if name not in db.list_speakers():
        print(f"❌ Speaker '{name}' not found in database")
        return False

    success = db.remove_speaker(name)
    if success:
        print(f"✅ Speaker '{name}' removed from database")
        return True
    else:
        print(f"❌ Failed to remove speaker '{name}'")
        return False

def show_stats(db_path: Path = None):
    """Show database statistics."""
    db = SpeakerDatabase(db_path)
    stats = db.get_database_stats()

    print("📊 Speaker Database Statistics")
    print("=" * 40)
    print(f"Total speakers: {stats['total_speakers']}")
    print(f"Database path: {stats['database_path']}")
    print(f"Database size: {stats.get('database_size_mb', 0):.2f} MB")

    if stats['speakers']:
        print(f"\nSpeakers:")
        for speaker in stats['speakers']:
            print(f"  • {speaker}")

def backup_database(backup_path: Path = None, db_path: Path = None):
    """Backup the speaker database."""
    db = SpeakerDatabase(db_path)

    try:
        backup_file = db.backup_database(backup_path)
        print(f"✅ Database backed up to: {backup_file}")
        return True
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return False

def test_similarity(speaker1: str, speaker2: str, db_path: Path = None):
    """Test similarity between two speakers."""
    db = SpeakerDatabase(db_path)

    if speaker1 not in db.list_speakers():
        print(f"❌ Speaker '{speaker1}' not found")
        return False

    if speaker2 not in db.list_speakers():
        print(f"❌ Speaker '{speaker2}' not found")
        return False

    embedding1 = db.get_speaker_embedding(speaker1)
    embedding2 = db.get_speaker_embedding(speaker2)

    # Calculate similarity
    import numpy as np
    similarity = np.dot(embedding1, embedding2) / (
        np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
    )

    print(f"🔍 Similarity between '{speaker1}' and '{speaker2}': {similarity:.3f}")

    if similarity > 0.8:
        print("   ✅ Very similar (likely same person)")
    elif similarity > 0.6:
        print("   ⚠️  Somewhat similar")
    else:
        print("   ❌ Different speakers")

    return True

def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description="Speaker Database Manager")
    parser.add_argument("--db-path", type=Path, help="Path to speaker database")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # List command
    subparsers.add_parser("list", help="List all speakers")

    # Add command
    add_parser = subparsers.add_parser("add", help="Add a speaker")
    add_parser.add_argument("name", help="Speaker name")
    add_parser.add_argument("audio_file", type=Path, help="Path to audio file")

    # Remove command
    remove_parser = subparsers.add_parser("remove", help="Remove a speaker")
    remove_parser.add_argument("name", help="Speaker name")

    # Stats command
    subparsers.add_parser("stats", help="Show database statistics")

    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Backup database")
    backup_parser.add_argument("--output", type=Path, help="Backup file path")

    # Similarity command
    sim_parser = subparsers.add_parser("similarity", help="Test speaker similarity")
    sim_parser.add_argument("speaker1", help="First speaker name")
    sim_parser.add_argument("speaker2", help="Second speaker name")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Execute commands
    if args.command == "list":
        list_speakers(args.db_path)
    elif args.command == "add":
        add_speaker(args.name, args.audio_file, args.db_path)
    elif args.command == "remove":
        remove_speaker(args.name, args.db_path)
    elif args.command == "stats":
        show_stats(args.db_path)
    elif args.command == "backup":
        backup_database(args.output, args.db_path)
    elif args.command == "similarity":
        test_similarity(args.speaker1, args.speaker2, args.db_path)

if __name__ == "__main__":
    main()