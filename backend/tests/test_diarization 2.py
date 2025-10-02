#!/usr/bin/env python3
"""Test speaker diarization functionality."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
from dotenv import load_dotenv
import json
from app.pipeline.processor import SpeakerDiarizer, AudioProcessor

# Load environment variables
load_dotenv()

def test_diarization_basic():
    """Test basic diarization functionality."""
    print("🎯 Testing Speaker Diarization")
    print("=" * 40)

    # Check environment
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        print("❌ HUGGINGFACE_TOKEN not found in environment")
        return False

    print("✅ HuggingFace token found")

    # Test files
    data_dir = Path("data/audio_test_files_1")
    test_files = [
        "voice_sample_sami.m4a",  # Single speaker
        "sample_meeting_sparsh_aadil_sami.m4a"  # Multi-speaker
    ]

    audio_processor = AudioProcessor()
    diarizer = SpeakerDiarizer(hf_token)

    results = []

    for filename in test_files:
        test_file = data_dir / filename

        if not test_file.exists():
            print(f"❌ Missing test file: {filename}")
            continue

        try:
            print(f"\n📁 Processing: {filename}")

            # Convert to WAV first
            wav_file = audio_processor.convert_to_wav(test_file)
            print(f"🔄 Converted to: {wav_file.name}")

            # Perform diarization
            print("🎯 Running diarization...")
            diarization_result = diarizer.diarize(wav_file)

            segments = diarization_result['segments']
            print(f"✅ Diarization completed")
            print(f"   Segments found: {len(segments)}")

            if segments:
                total_duration = sum(seg['duration'] for seg in segments)
                speakers = set(seg['speaker'] for seg in segments)

                print(f"   Unique speakers: {len(speakers)}")
                print(f"   Total speech duration: {total_duration:.2f}s")
                print(f"   Average segment length: {total_duration/len(segments):.2f}s")

                # Show first few segments
                print("   First 3 segments:")
                for i, segment in enumerate(segments[:3]):
                    print(f"     {i+1}. [{segment['start']:.1f}s-{segment['end']:.1f}s] "
                          f"{segment['speaker']} ({segment['duration']:.1f}s)")

                results.append({
                    'file': filename,
                    'status': 'success',
                    'segments': len(segments),
                    'speakers': len(speakers),
                    'duration': total_duration
                })

            else:
                print("⚠️  No segments found")
                results.append({
                    'file': filename,
                    'status': 'no_segments',
                    'segments': 0
                })

        except Exception as e:
            print(f"❌ Diarization failed: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                'file': filename,
                'status': 'error',
                'error': str(e)
            })

    return results

def test_diarization_parameters():
    """Test diarization with different parameters."""
    print("\n🔧 Testing Diarization Parameters")
    print("=" * 40)

    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        print("❌ HUGGINGFACE_TOKEN not found")
        return False

    data_dir = Path("data/audio_test_files_1")
    test_file = data_dir / "sample_meeting_sparsh_aadil_sami.m4a"

    if not test_file.exists():
        print("❌ Test file not found")
        return False

    audio_processor = AudioProcessor()
    diarizer = SpeakerDiarizer(hf_token)

    # Convert audio
    wav_file = audio_processor.convert_to_wav(test_file)

    # Test with different speaker counts
    speaker_counts = [None, 2, 3, 4]

    for num_speakers in speaker_counts:
        try:
            print(f"\n🔢 Testing with {num_speakers or 'auto'} speakers...")

            result = diarizer.diarize(wav_file, num_speakers=num_speakers)
            segments = result['segments']
            unique_speakers = len(set(seg['speaker'] for seg in segments))

            print(f"   Segments: {len(segments)}")
            print(f"   Unique speakers found: {unique_speakers}")

            if num_speakers and unique_speakers != num_speakers:
                print(f"   ⚠️  Expected {num_speakers}, found {unique_speakers}")
            else:
                print(f"   ✅ Results look reasonable")

        except Exception as e:
            print(f"   ❌ Failed with {num_speakers} speakers: {e}")

    return True

def save_diarization_results(results):
    """Save detailed diarization results."""
    output_dir = Path("data/test_results")
    output_dir.mkdir(exist_ok=True)

    result_file = output_dir / "diarization_test_results.json"

    with open(result_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n📊 Results saved to: {result_file}")

if __name__ == "__main__":
    print("🎯 Speaker Diarization Test Suite")
    print("=" * 50)

    # Run tests
    basic_results = test_diarization_basic()
    param_test = test_diarization_parameters()

    if basic_results:
        save_diarization_results(basic_results)

        # Summary
        successful = len([r for r in basic_results if r['status'] == 'success'])
        total = len(basic_results)

        print(f"\n📊 Test Summary:")
        print(f"   Files tested: {total}")
        print(f"   Successful: {successful}")
        print(f"   Success rate: {successful/total*100:.1f}%" if total > 0 else "   No files tested")

        if successful == total and total > 0 and param_test:
            print("\n🎉 All diarization tests passed!")
            exit(0)

    print("\n❌ Some diarization tests failed")
    exit(1)