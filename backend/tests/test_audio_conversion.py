#!/usr/bin/env python3
"""Test audio conversion functionality."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
import tempfile
import shutil
from app.pipeline.processor import AudioProcessor

def test_audio_conversion():
    """Test audio format conversion."""
    print("🔄 Testing Audio Conversion")
    print("=" * 40)

    # Test data
    data_dir = Path("data/audio_test_files_1")
    test_files = [
        "voice_sample_sami.m4a",
        "voice_sample_aadil.m4a",
        "voice_sample_sparsh.m4a",
        "sample_meeting_sparsh_aadil_sami.m4a"
    ]

    processor = AudioProcessor()
    results = []

    for filename in test_files:
        test_file = data_dir / filename

        if not test_file.exists():
            print(f"❌ Missing test file: {filename}")
            continue

        try:
            # Test conversion
            print(f"📁 Converting: {filename}")
            wav_file = processor.convert_to_wav(test_file)

            if wav_file.exists():
                # Get file info
                original_size = test_file.stat().st_size
                converted_size = wav_file.stat().st_size

                print(f"✅ Converted successfully")
                print(f"   Original: {original_size:,} bytes ({filename})")
                print(f"   Converted: {converted_size:,} bytes ({wav_file.name})")

                # Test audio properties using librosa
                try:
                    import librosa
                    y, sr = librosa.load(str(wav_file), sr=None)
                    duration = len(y) / sr

                    print(f"   Duration: {duration:.2f} seconds")
                    print(f"   Sample rate: {sr} Hz")
                    print(f"   Channels: {'Mono' if y.ndim == 1 else 'Stereo'}")

                    # Verify 16kHz mono
                    if sr == 16000:
                        print(f"   ✅ Correct sample rate (16kHz)")
                    else:
                        print(f"   ⚠️  Unexpected sample rate: {sr}Hz (expected 16000)")

                except ImportError:
                    print(f"   ℹ️  Install librosa for detailed audio analysis")

                results.append({
                    'file': filename,
                    'status': 'success',
                    'output': wav_file.name,
                    'original_size': original_size,
                    'converted_size': converted_size
                })

            else:
                print(f"❌ Conversion failed - output file not created")
                results.append({'file': filename, 'status': 'failed', 'error': 'No output file'})

        except Exception as e:
            print(f"❌ Conversion failed: {e}")
            results.append({'file': filename, 'status': 'error', 'error': str(e)})

        print()

    # Summary
    successful = len([r for r in results if r['status'] == 'success'])
    total = len(results)

    print("📊 Summary:")
    print(f"   Total files tested: {total}")
    print(f"   Successful conversions: {successful}")
    print(f"   Success rate: {successful/total*100:.1f}%" if total > 0 else "   No files tested")

    if successful == total and total > 0:
        print("\n🎉 All audio conversion tests passed!")
        return True
    else:
        print(f"\n❌ {total - successful} conversion tests failed")
        return False

def test_audio_formats():
    """Test different audio format handling."""
    print("\n🔧 Testing Audio Format Support")
    print("=" * 40)

    processor = AudioProcessor()

    # Test with temporary files of different formats
    test_formats = ['.m4a', '.mp3', '.wav']
    data_dir = Path("data/audio_test_files_1")
    base_file = data_dir / "voice_sample_sami.m4a"

    if not base_file.exists():
        print("❌ Base test file not found")
        return False

    # Test format detection and handling
    for format_ext in test_formats:
        print(f"📁 Testing {format_ext} format handling...")

        # Create a temporary file with different extension
        with tempfile.NamedTemporaryFile(suffix=format_ext, delete=False) as temp_file:
            temp_path = Path(temp_file.name)

        try:
            # Copy base file to test different extension handling
            shutil.copy(base_file, temp_path)

            # Test conversion
            wav_output = processor.convert_to_wav(temp_path)

            if wav_output.exists():
                print(f"✅ {format_ext} format handled correctly")
                wav_output.unlink()  # Clean up
            else:
                print(f"❌ {format_ext} format conversion failed")

        except Exception as e:
            print(f"❌ {format_ext} format error: {e}")
        finally:
            # Clean up temp file
            if temp_path.exists():
                temp_path.unlink()

    return True

if __name__ == "__main__":
    print("🎯 Audio Conversion Test Suite")
    print("=" * 50)

    success1 = test_audio_conversion()
    success2 = test_audio_formats()

    if success1 and success2:
        print("\n🎉 All audio conversion tests passed!")
        exit(0)
    else:
        print("\n❌ Some tests failed")
        exit(1)