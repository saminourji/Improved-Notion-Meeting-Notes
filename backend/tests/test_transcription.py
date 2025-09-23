#!/usr/bin/env python3
"""Test transcription functionality."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
import json
from app.pipeline.processor import Transcriber, AudioProcessor

def test_transcriber_creation():
    """Test Transcriber initialization."""
    print("🎯 Testing Transcriber Creation")
    print("=" * 40)

    # Test default model
    transcriber = Transcriber()
    print(f"✅ Created transcriber with default model: {transcriber.model_name}")

    # Test custom model
    custom_transcriber = Transcriber(model_name="tiny")
    print(f"✅ Created transcriber with tiny model: {custom_transcriber.model_name}")

    return transcriber

def test_model_loading():
    """Test Whisper model loading."""
    print("\n🧠 Testing Model Loading")
    print("=" * 30)

    transcriber = Transcriber(model_name="tiny")  # Use smallest model for speed

    try:
        print("🔄 Loading Whisper model...")
        transcriber._load_model()

        if transcriber.model is not None:
            print("✅ Model loaded successfully")
            print(f"   Model type: {type(transcriber.model).__name__}")
            return True
        else:
            print("❌ Model is None after loading")
            return False

    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return False

def test_basic_transcription():
    """Test basic transcription functionality."""
    print("\n🎤 Testing Basic Transcription")
    print("=" * 35)

    # Test files
    data_dir = Path("data/audio_test_files_1")
    test_files = [
        "voice_sample_sami.m4a",
        "voice_sample_aadil.m4a"  # Test with 2 files for speed
    ]

    audio_processor = AudioProcessor()
    transcriber = Transcriber(model_name="tiny")  # Use tiny for speed

    results = []

    for filename in test_files:
        test_file = data_dir / filename
        speaker_name = filename.replace("voice_sample_", "").replace(".m4a", "")

        if not test_file.exists():
            print(f"❌ Missing test file: {filename}")
            continue

        try:
            print(f"\n👤 Transcribing: {speaker_name}")

            # Convert to WAV
            wav_file = audio_processor.convert_to_wav(test_file)
            print(f"🔄 Converted: {wav_file.name}")

            # Create test segments for transcription
            segments = [{
                'start': 0.0,
                'end': 30.0,  # Limit to first 30 seconds
                'speaker': f'SPEAKER_{speaker_name.upper()}',
                'duration': 30.0
            }]

            print(f"🎯 Running transcription...")

            # Transcribe
            transcribed_segments = transcriber.transcribe_segments(wav_file, segments)

            if transcribed_segments:
                segment = transcribed_segments[0]
                text = segment.get('text', '').strip()

                print(f"✅ Transcription completed")
                print(f"   Duration: {segment['duration']:.1f}s")
                print(f"   Text length: {len(text)} characters")
                print(f"   Text preview: {text[:100]}{'...' if len(text) > 100 else ''}")
                print(f"   Confidence: {segment.get('confidence', 'N/A')}")

                results.append({
                    'speaker': speaker_name,
                    'file': filename,
                    'status': 'success',
                    'text_length': len(text),
                    'text_preview': text[:200],
                    'duration': segment['duration'],
                    'confidence': segment.get('confidence')
                })

            else:
                print("❌ No transcription results")
                results.append({
                    'speaker': speaker_name,
                    'file': filename,
                    'status': 'no_results'
                })

        except Exception as e:
            print(f"❌ Transcription failed: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                'speaker': speaker_name,
                'file': filename,
                'status': 'error',
                'error': str(e)
            })

    return results

def test_segment_transcription():
    """Test transcription with multiple segments."""
    print("\n📝 Testing Multi-Segment Transcription")
    print("=" * 40)

    data_dir = Path("data/audio_test_files_1")
    test_file = data_dir / "sample_meeting_sparsh_aadil_sami.m4a"

    if not test_file.exists():
        print("❌ Meeting audio file not found")
        return False

    audio_processor = AudioProcessor()
    transcriber = Transcriber(model_name="tiny")

    try:
        # Convert to WAV
        wav_file = audio_processor.convert_to_wav(test_file)
        print(f"🔄 Converted: {wav_file.name}")

        # Create test segments (simulating diarization output)
        segments = [
            {'start': 0.0, 'end': 1.0, 'speaker': 'SPEAKER_00', 'duration': 1.0},
            {'start': 1.0, 'end': 2.0, 'speaker': 'SPEAKER_01', 'duration': 1.0},
            {'start': 2.0, 'end': 3.0, 'speaker': 'SPEAKER_00', 'duration': 1.0}
        ]

        print(f"🎯 Transcribing {len(segments)} segments...")

        # Transcribe
        transcribed_segments = transcriber.transcribe_segments(wav_file, segments)

        print(f"✅ Multi-segment transcription completed")
        print(f"   Segments processed: {len(transcribed_segments)}")

        # Show results
        total_text_length = 0
        for i, segment in enumerate(transcribed_segments):
            text = segment.get('text', '').strip()
            total_text_length += len(text)

            print(f"   Segment {i+1} [{segment['start']:.1f}s-{segment['end']:.1f}s]: "
                  f"{len(text)} chars")

            if text:
                preview = text[:50] + "..." if len(text) > 50 else text
                print(f"      \"{preview}\"")

        print(f"   Total text length: {total_text_length} characters")

        return len(transcribed_segments) > 0 and total_text_length > 0

    except Exception as e:
        print(f"❌ Multi-segment transcription failed: {e}")
        return False

def test_transcription_quality():
    """Test transcription quality metrics."""
    print("\n📊 Testing Transcription Quality")
    print("=" * 40)

    # This is a basic quality test - in a real scenario you'd compare against
    # ground truth transcripts

    data_dir = Path("data/audio_test_files_1")
    test_file = data_dir / "voice_sample_sami.m4a"  # Clear single speaker

    if not test_file.exists():
        print("❌ Test file not found")
        return False

    audio_processor = AudioProcessor()
    transcriber = Transcriber(model_name="tiny")

    try:
        wav_file = audio_processor.convert_to_wav(test_file)

        # Single segment for full audio
        segments = [{
            'start': 0.0,
            'end': 60.0,  # Up to 1 minute
            'speaker': 'SPEAKER_TEST',
            'duration': 60.0
        }]

        print("🔍 Analyzing transcription quality...")

        transcribed_segments = transcriber.transcribe_segments(wav_file, segments)

        if transcribed_segments:
            segment = transcribed_segments[0]
            text = segment.get('text', '').strip()

            # Basic quality metrics
            word_count = len(text.split())
            char_count = len(text)
            sentence_count = text.count('.') + text.count('!') + text.count('?')

            print(f"✅ Quality analysis completed")
            print(f"   Character count: {char_count}")
            print(f"   Word count: {word_count}")
            print(f"   Sentence count: {sentence_count}")

            if word_count > 0:
                avg_word_length = char_count / word_count
                print(f"   Average word length: {avg_word_length:.1f} chars")

            # Basic quality checks
            quality_score = 0
            checks = []

            if word_count > 10:
                quality_score += 1
                checks.append("✅ Reasonable word count")
            else:
                checks.append("⚠️  Low word count")

            if char_count > 50:
                quality_score += 1
                checks.append("✅ Reasonable text length")
            else:
                checks.append("⚠️  Short text")

            if sentence_count > 0:
                quality_score += 1
                checks.append("✅ Contains sentences")
            else:
                checks.append("⚠️  No sentence structure")

            print(f"\n📈 Quality Score: {quality_score}/3")
            for check in checks:
                print(f"   {check}")

            return quality_score >= 2

    except Exception as e:
        print(f"❌ Quality test failed: {e}")
        return False

    return False

def save_transcription_results(results):
    """Save transcription test results."""
    output_dir = Path("data/test_results")
    output_dir.mkdir(exist_ok=True)

    result_file = output_dir / "transcription_test_results.json"

    with open(result_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n📊 Results saved to: {result_file}")

if __name__ == "__main__":
    print("🎯 Transcription Test Suite")
    print("=" * 50)

    # Run tests
    print("ℹ️  Note: Using 'tiny' Whisper model for faster testing")

    # Test transcriber creation
    transcriber = test_transcriber_creation()

    # Test model loading
    model_loaded = test_model_loading()

    # Test basic transcription
    transcription_results = []
    if model_loaded:
        transcription_results = test_basic_transcription()

        # Test multi-segment transcription
        multi_segment_success = test_segment_transcription()

        # Test quality
        quality_success = test_transcription_quality()
    else:
        multi_segment_success = False
        quality_success = False

    # Save results
    if transcription_results:
        save_transcription_results(transcription_results)

    # Summary
    successful_transcriptions = len([r for r in transcription_results if r['status'] == 'success'])
    total_transcriptions = len(transcription_results)

    print(f"\n📊 Test Summary:")
    print(f"   Transcriber creation: ✅")
    print(f"   Model loading: {'✅' if model_loaded else '❌'}")
    print(f"   Basic transcriptions: {successful_transcriptions}/{total_transcriptions}")
    print(f"   Multi-segment test: {'✅' if multi_segment_success else '❌'}")
    print(f"   Quality test: {'✅' if quality_success else '❌'}")

    if (model_loaded and successful_transcriptions > 0 and
        multi_segment_success and quality_success):
        print("\n🎉 All transcription tests passed!")
        exit(0)
    else:
        print("\n❌ Some transcription tests failed")
        exit(1)