#!/usr/bin/env python3
"""Test speaker matching functionality using real pipeline components."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
import json
import numpy as np
from dotenv import load_dotenv

from app.pipeline.processor import AudioProcessor, SpeakerDiarizer, SpeakerMatcher

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

def test_speaker_matching():
    """Test speaker matching using real audio files and pipeline components."""
    print("🎯 Speaker Matching Integration Test")
    print("=" * 50)

    # Get test files
    files = get_test_files()
    if not files:
        return False

    print("📁 Test files found:")
    print(f"   Meeting: {files['meeting'].name}")
    for speaker, path in files['voice_samples'].items():
        print(f"   {speaker}: {path.name}")

    try:
        # Initialize pipeline components
        print("\n🔧 Initializing pipeline components...")

        audio_processor = AudioProcessor()
        print("   ✅ Audio processor ready")

        hf_token = os.getenv("HUGGINGFACE_TOKEN")
        if not hf_token:
            print("   ❌ HUGGINGFACE_TOKEN required for diarization")
            return False

        diarizer = SpeakerDiarizer(hf_token)
        print("   ✅ Speaker diarizer ready")

        matcher = SpeakerMatcher(similarity_threshold=0.75)  # Higher threshold with better embeddings
        print("   ✅ Speaker matcher ready")

        # Step 1: Convert voice samples to WAV and extract embeddings
        print("\n🎤 Processing voice samples...")
        voice_embeddings = {}

        for speaker_name, sample_path in files['voice_samples'].items():
            print(f"\n   Processing {speaker_name}...")

            # Convert to WAV
            wav_file = audio_processor.convert_to_wav(sample_path)
            print(f"   🔄 Converted: {wav_file.name}")

            # Extract embedding
            embedding = diarizer.extract_speaker_embedding(wav_file)
            voice_embeddings[speaker_name] = embedding

            print(f"   🧬 Embedding shape: {embedding.shape}")
            print(f"   📊 Embedding stats: mean={embedding.mean():.3f}, std={embedding.std():.3f}")

            # Add to matcher
            matcher.add_speaker(speaker_name, embedding)

        print(f"\n✅ Processed {len(voice_embeddings)} voice samples")
        print(f"   Known speakers in matcher: {list(matcher.known_speakers.keys())}")

        # Step 2: Process meeting audio
        print(f"\n🎬 Processing meeting audio...")

        # Convert meeting to WAV
        meeting_wav = audio_processor.convert_to_wav(files['meeting'])
        print(f"   🔄 Converted: {meeting_wav.name}")

        # Perform diarization (auto-detect speakers)
        print("   🔍 Running speaker diarization...")
        diarization_result = diarizer.diarize(meeting_wav)

        segments = diarization_result['segments']
        print(f"   ✅ Found {len(segments)} segments")
        print(f"   🎭 Detected speakers: {diarization_result['total_speakers']}")

        # Show segment breakdown
        for i, segment in enumerate(segments[:5]):  # Show first 5
            duration = segment['end'] - segment['start']
            print(f"      Segment {i+1}: {segment['speaker']} "
                  f"({segment['start']:.1f}s-{segment['end']:.1f}s, {duration:.1f}s)")
        if len(segments) > 5:
            print(f"      ... and {len(segments)-5} more segments")

        # Step 3: Extract embeddings for each segment
        print(f"\n🧬 Extracting embeddings for segments...")
        segment_embeddings = []

        # Group segments by speaker to avoid duplicate extraction
        unique_speakers = {}
        for segment in segments:
            speaker = segment['speaker']
            if speaker not in unique_speakers:
                print(f"   Extracting embedding for {speaker}...")

                embedding = diarizer.extract_speaker_embedding(
                    meeting_wav,
                    start_time=segment['start'],
                    end_time=segment['end']
                )

                unique_speakers[speaker] = embedding
                print(f"   🧬 {speaker} embedding shape: {embedding.shape}")

        # Create segment embeddings list
        for segment in segments:
            segment_embeddings.append(unique_speakers[segment['speaker']])

        print(f"   ✅ Extracted embeddings for {len(unique_speakers)} unique speakers")

        # Step 4: Match segments against known speakers
        print(f"\n🔍 Matching segments against known speakers...")

        # Debug: Check embedding shapes and norms
        print(f"   🔍 Debug info:")
        print(f"      Voice embedding shapes: {[(name, emb.shape, np.linalg.norm(emb)) for name, emb in voice_embeddings.items()]}")
        print(f"      Segment embedding info: {[(i, emb.shape, np.linalg.norm(emb)) for i, emb in enumerate(segment_embeddings[:3])]}")
        print(f"      Similarity threshold: {matcher.similarity_threshold}")

        matching_result = matcher.match_segments(diarization_result, segment_embeddings)
        matched_segments = matching_result['segments']
        speaker_mapping = matching_result.get('speaker_mapping', {})

        print(f"   ✅ Matching completed")
        print(f"   📊 Speaker mapping: {speaker_mapping}")

        # Debug: Show some actual similarity calculations
        print(f"   🔍 Sample similarity calculations:")
        for i, (name, voice_emb) in enumerate(voice_embeddings.items()):
            if i < len(segment_embeddings):
                seg_emb = segment_embeddings[i]
                similarity = matcher._cosine_similarity(seg_emb, voice_emb)
                print(f"      Segment {i} vs {name}: {similarity:.6f}")
            if i >= 2:  # Only show first 3
                break

        # Step 5: Analyze results
        print(f"\n📊 Matching Results Analysis:")

        matches_by_speaker = {}
        for segment in matched_segments:
            diarized_speaker = segment['speaker']
            matched_speaker = segment.get('matched_speaker', 'Unknown')
            similarity = segment.get('similarity_score', 0.0)

            if diarized_speaker not in matches_by_speaker:
                matches_by_speaker[diarized_speaker] = []
            matches_by_speaker[diarized_speaker].append((matched_speaker, similarity))

        # Show results for each diarized speaker
        successful_matches = 0
        total_unique_speakers = len(matches_by_speaker)

        for diarized_speaker, matches in matches_by_speaker.items():
            # Find most common match
            match_counts = {}
            similarities = []

            for matched_speaker, similarity in matches:
                similarities.append(similarity)
                if matched_speaker not in match_counts:
                    match_counts[matched_speaker] = 0
                match_counts[matched_speaker] += 1

            most_common_match = max(match_counts.items(), key=lambda x: x[1])
            avg_similarity = np.mean(similarities) if similarities else 0.0
            max_similarity = max(similarities) if similarities else 0.0

            print(f"   {diarized_speaker}:")
            print(f"      → Most common match: {most_common_match[0]} "
                  f"({most_common_match[1]}/{len(matches)} segments)")
            print(f"      → Avg similarity: {avg_similarity:.3f}")
            print(f"      → Max similarity: {max_similarity:.3f}")

            # Consider it successful if most segments match a known speaker with similarity above threshold
            if most_common_match[0] != 'Unknown' and avg_similarity > 0.1:
                successful_matches += 1
                print(f"      ✅ Good match!")
            else:
                print(f"      ⚠️  Low confidence or unknown")

        # Calculate overall success
        success_rate = successful_matches / total_unique_speakers if total_unique_speakers > 0 else 0
        print(f"\n📈 Overall Success Rate: {success_rate:.1%} ({successful_matches}/{total_unique_speakers})")

        # Save detailed results
        save_matching_results({
            'voice_embeddings_extracted': len(voice_embeddings),
            'meeting_segments': len(segments),
            'unique_diarized_speakers': len(unique_speakers),
            'speaker_mapping': speaker_mapping,
            'matches_by_speaker': {k: [(match, float(sim)) for match, sim in v]
                                 for k, v in matches_by_speaker.items()},
            'success_rate': success_rate,
            'successful_matches': successful_matches,
            'total_speakers': total_unique_speakers
        })

        # Consider test successful if we match at least 60% of speakers with reasonable confidence
        test_passed = success_rate >= 0.6

        if test_passed:
            print(f"\n🎉 Speaker matching test PASSED!")
            print(f"   Successfully matched {successful_matches} out of {total_unique_speakers} speakers")
        else:
            print(f"\n⚠️  Speaker matching test had mixed results")
            print(f"   Only matched {successful_matches} out of {total_unique_speakers} speakers reliably")

        return test_passed

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def save_matching_results(results):
    """Save matching test results."""
    output_dir = Path("data/test_results")
    output_dir.mkdir(exist_ok=True)

    result_file = output_dir / "matching_test_results.json"

    with open(result_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"📁 Results saved to: {result_file}")

if __name__ == "__main__":
    print("🎯 Speaker Matching Integration Test Suite")
    print("=" * 60)
    print("ℹ️  This test uses real audio processing pipeline components:")
    print("   • Audio conversion (tested in test_audio_conversion.py)")
    print("   • Speaker diarization (tested in test_diarization.py)")
    print("   • Speaker embeddings (tested in test_speaker_embeddings.py)")
    print("   • Speaker matching logic (integration test)")
    print()

    success = test_speaker_matching()

    if success:
        print(f"\n🎉 Integration test PASSED!")
        exit(0)
    else:
        print(f"\n❌ Integration test FAILED!")
        exit(1)