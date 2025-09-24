#!/usr/bin/env python3
"""Test transcription functionality including full meeting transcription and speaker annotation."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
import json
from dotenv import load_dotenv
from app.pipeline.processor import Transcriber, AudioProcessor, SpeakerDiarizer, SpeakerMatcher

# Load environment variables
load_dotenv()

def get_test_files():
    """Get paths to test audio files."""
    data_dir = Path("data/audio_test_files_1")

    files = {
        'voice_samples': {
            'sami': data_dir / "voice_sample_sami.m4a",
            'aadil': data_dir / "voice_sample_aadil.m4a",
            'sparsh': data_dir / "voice_sample_sparsh.m4a"
        },
        'meeting': data_dir / "sample_meeting_sparsh_aadil_sami.m4a"
    }

    # Check files exist
    for speaker, file_path in files['voice_samples'].items():
        if not file_path.exists():
            print(f"❌ Missing voice sample: {file_path}")
            return None

    if not files['meeting'].exists():
        print(f"❌ Missing meeting file: {files['meeting']}")
        return None

    return files

def test_full_meeting_transcription():
    """Test full meeting transcription without segmentation."""
    print("🎯 Full Meeting Transcription Test")
    print("=" * 50)

    files = get_test_files()
    if not files:
        return False

    try:
        # Initialize components
        audio_processor = AudioProcessor()
        transcriber = Transcriber(model_name="base")  # Better model for full transcription

        print("🔧 Initializing transcription components...")
        print("   ✅ Audio processor ready")
        print("   ✅ Transcriber ready (using 'base' model)")

        # Convert meeting to WAV
        meeting_wav = audio_processor.convert_to_wav(files['meeting'])
        print(f"   🔄 Converted: {meeting_wav.name}")

        print("\n🎤 Running full meeting transcription...")

        # Create mock matched segments for testing (normally from speaker matching)
        mock_matched_segments = [
            {'start': 0.0, 'end': 20.0, 'matched_speaker': 'sparsh'},
            {'start': 20.0, 'end': 40.0, 'matched_speaker': 'sami'},
            {'start': 40.0, 'end': 60.0, 'matched_speaker': 'aadil'},
            {'start': 60.0, 'end': 81.0, 'matched_speaker': 'sparsh'}
        ]

        # Transcribe full meeting
        transcription_result = transcriber.transcribe_full_meeting(meeting_wav, mock_matched_segments)

        # Analyze results
        full_text = transcription_result['full_text']
        speaker_transcript = transcription_result['speaker_annotated_transcript']
        word_count = transcription_result['word_count']
        duration = transcription_result['duration']

        print(f"   ✅ Transcription completed")
        print(f"   📊 Duration: {duration:.1f} seconds")
        print(f"   📝 Word count: {word_count}")
        print(f"   📄 Text length: {len(full_text)} characters")

        # Show full text preview
        print(f"\n📄 Full Text Preview:")
        preview = full_text[:300] + "..." if len(full_text) > 300 else full_text
        print(f"   \"{preview}\"")

        # Show speaker-annotated transcript preview
        print(f"\n🎭 Speaker-Annotated Transcript Preview:")
        lines = speaker_transcript.split('\n\n')[:3]  # First 3 speaker turns
        for line in lines:
            print(f"   {line}")
        if len(speaker_transcript.split('\n\n')) > 3:
            print(f"   ... and more")

        # Quality checks
        print(f"\n✅ Quality Checks:")
        checks_passed = 0
        total_checks = 5

        if word_count > 50:
            print(f"   ✅ Reasonable word count ({word_count})")
            checks_passed += 1
        else:
            print(f"   ⚠️  Low word count ({word_count})")

        if len(full_text) > 200:
            print(f"   ✅ Reasonable text length ({len(full_text)} chars)")
            checks_passed += 1
        else:
            print(f"   ⚠️  Short text ({len(full_text)} chars)")

        if duration > 60:
            print(f"   ✅ Full meeting duration ({duration:.1f}s)")
            checks_passed += 1
        else:
            print(f"   ⚠️  Short audio ({duration:.1f}s)")

        speaker_lines = speaker_transcript.count(':')
        if speaker_lines >= 3:
            print(f"   ✅ Multiple speakers detected ({speaker_lines} speaking turns)")
            checks_passed += 1
        else:
            print(f"   ⚠️  Few speaker turns ({speaker_lines})")

        if 'sparsh' in speaker_transcript.lower() or 'sami' in speaker_transcript.lower():
            print(f"   ✅ Speaker names present in transcript")
            checks_passed += 1
        else:
            print(f"   ⚠️  No speaker names found")

        print(f"\n📈 Quality Score: {checks_passed}/{total_checks}")

        # Save results
        save_transcription_results({
            'test_type': 'full_meeting_transcription',
            'duration': duration,
            'word_count': word_count,
            'text_length': len(full_text),
            'speaker_turns': speaker_lines,
            'quality_score': checks_passed,
            'full_text_preview': full_text[:500],
            'speaker_transcript_preview': '\n'.join(lines)
        })

        return checks_passed >= 3

    except Exception as e:
        print(f"\n❌ Full meeting transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_speaker_annotated_transcription():
    """Test speaker-annotated transcription with real speaker matching."""
    print("\n🎭 Speaker-Annotated Transcription Integration Test")
    print("=" * 60)

    files = get_test_files()
    if not files:
        return False

    try:
        hf_token = os.getenv("HUGGINGFACE_TOKEN")
        if not hf_token:
            print("   ❌ HUGGINGFACE_TOKEN required for diarization")
            return False

        # Initialize full pipeline
        audio_processor = AudioProcessor()
        diarizer = SpeakerDiarizer(hf_token)
        matcher = SpeakerMatcher(similarity_threshold=0.75)
        transcriber = Transcriber(model_name="base")

        print("🔧 Initializing full pipeline...")
        print("   ✅ Audio processor ready")
        print("   ✅ Speaker diarizer ready")
        print("   ✅ Speaker matcher ready")
        print("   ✅ Transcriber ready")

        # Add voice samples to matcher
        print("\n🎤 Processing voice samples...")
        for speaker_name, sample_path in files['voice_samples'].items():
            wav_file = audio_processor.convert_to_wav(sample_path)
            embedding = diarizer.extract_speaker_embedding(wav_file)
            matcher.add_speaker(speaker_name, embedding)
            print(f"   ✅ Added {speaker_name}")

        # Process meeting
        meeting_wav = audio_processor.convert_to_wav(files['meeting'])
        print(f"\n🎬 Processing meeting audio...")

        # Diarize
        diarization_result = diarizer.diarize(meeting_wav)
        print(f"   ✅ Diarization: {len(diarization_result['segments'])} segments")

        # Extract embeddings and match speakers using centralized function
        matching_result = matcher.extract_and_match_speakers(meeting_wav, diarization_result, diarizer)
        matched_segments = matching_result['segments']
        print(f"   ✅ Speaker matching: {len([s for s in matched_segments if not s['matched_speaker'].startswith('Unknown')])} identified")

        # Full transcription with real speaker assignment
        print(f"\n📝 Creating speaker-annotated transcript...")
        transcription_result = transcriber.transcribe_full_meeting(meeting_wav, matched_segments)

        # Analyze results
        speaker_transcript = transcription_result['speaker_annotated_transcript']
        word_count = transcription_result['word_count']

        print(f"   ✅ Full transcription completed")
        print(f"   📝 Word count: {word_count}")

        # Show the actual speaker-annotated transcript
        print(f"\n🎭 Full Speaker-Annotated Transcript:")
        lines = speaker_transcript.split('\n\n')
        for i, line in enumerate(lines[:8]):  # Show first 8 turns
            print(f"   {line}")
        if len(lines) > 8:
            print(f"   ... and {len(lines) - 8} more speaking turns")

        # Count identified vs unknown speakers
        identified_lines = len([line for line in lines if not line.startswith('Unknown')])
        unknown_lines = len(lines) - identified_lines

        print(f"\n📊 Speaker Analysis:")
        print(f"   🎯 Identified speaker turns: {identified_lines}")
        print(f"   ❓ Unknown speaker turns: {unknown_lines}")
        print(f"   📈 Identification rate: {identified_lines/len(lines)*100:.1f}%")

        # Save detailed results
        save_transcription_results({
            'test_type': 'speaker_annotated_transcription',
            'word_count': word_count,
            'total_speaker_turns': len(lines),
            'identified_turns': identified_lines,
            'unknown_turns': unknown_lines,
            'identification_rate': identified_lines/len(lines),
            'full_transcript': speaker_transcript
        })

        return identified_lines > 0 and word_count > 50

    except Exception as e:
        print(f"\n❌ Speaker-annotated transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def save_transcription_results(results):
    """Save transcription test results."""
    output_dir = Path("data/test_results")
    output_dir.mkdir(exist_ok=True)

    result_file = output_dir / f"transcription_{results['test_type']}_results.json"

    with open(result_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"📁 Results saved to: {result_file}")

if __name__ == "__main__":
    print("🎯 Advanced Transcription Test Suite")
    print("=" * 70)
    print("ℹ️  Testing full meeting transcription and speaker annotation")
    print()

    # Test 1: Full meeting transcription
    full_meeting_success = test_full_meeting_transcription()

    # Test 2: Speaker-annotated transcription with real pipeline
    speaker_annotated_success = test_speaker_annotated_transcription()

    # Summary
    print(f"\n📊 Test Summary:")
    print(f"   Full meeting transcription: {'✅' if full_meeting_success else '❌'}")
    print(f"   Speaker-annotated transcription: {'✅' if speaker_annotated_success else '❌'}")

    if full_meeting_success and speaker_annotated_success:
        print(f"\n🎉 All advanced transcription tests PASSED!")
        exit(0)
    else:
        print(f"\n❌ Some advanced transcription tests FAILED!")
        exit(1)