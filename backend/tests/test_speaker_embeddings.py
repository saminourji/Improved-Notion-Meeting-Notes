#!/usr/bin/env python3
"""Test speaker embedding extraction functionality."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
from dotenv import load_dotenv
import json
import numpy as np
from app.pipeline.processor import SpeakerDiarizer, AudioProcessor

# Load environment variables
load_dotenv()

def test_embedding_extraction():
    """Test speaker embedding extraction."""
    print("🔊 Testing Speaker Embedding Extraction")
    print("=" * 45)

    # Check environment
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        print("❌ HUGGINGFACE_TOKEN not found in environment")
        return False

    print("✅ HuggingFace token found")

    # Test files
    data_dir = Path("data/audio_test_files_1")
    voice_samples = [
        "voice_sample_sami.m4a",
        "voice_sample_aadil.m4a",
        "voice_sample_sparsh.m4a"
    ]

    audio_processor = AudioProcessor()
    diarizer = SpeakerDiarizer(hf_token)

    embeddings = {}
    results = []

    for filename in voice_samples:
        test_file = data_dir / filename
        speaker_name = filename.replace("voice_sample_", "").replace(".m4a", "")

        if not test_file.exists():
            print(f"❌ Missing voice sample: {filename}")
            continue

        try:
            print(f"\n👤 Processing: {speaker_name}")

            # Convert to WAV first
            wav_file = audio_processor.convert_to_wav(test_file)
            print(f"🔄 Converted to: {wav_file.name}")

            # Extract embedding
            print("🧠 Extracting speaker embedding...")

            # Test SpeechBrain embedding extraction
            try:
                print("🧠 Attempting SpeechBrain embedding extraction...")
                embedding = diarizer.extract_speaker_embedding(wav_file)

                print(f"✅ Embedding extracted")
                print(f"   Shape: {embedding.shape}")
                print(f"   Data type: {embedding.dtype}")
                print(f"   Range: [{embedding.min():.3f}, {embedding.max():.3f}]")
                print(f"   Mean: {embedding.mean():.3f}")
                print(f"   Std: {embedding.std():.3f}")

                embeddings[speaker_name] = embedding

                status = 'success'
                note = 'SpeechBrain embedding extracted'

                results.append({
                    'speaker': speaker_name,
                    'file': filename,
                    'status': status,
                    'embedding_shape': embedding.shape,
                    'embedding_stats': {
                        'min': float(embedding.min()),
                        'max': float(embedding.max()),
                        'mean': float(embedding.mean()),
                        'std': float(embedding.std())
                    },
                    'note': note
                })

                print(f"   Status: {note}")

            except Exception as embed_error:
                print(f"❌ Embedding extraction failed: {embed_error}")
                print(f"   Error details: {type(embed_error).__name__}")
                raise embed_error

        except Exception as e:
            print(f"❌ Processing failed: {e}")
            results.append({
                'speaker': speaker_name,
                'file': filename,
                'status': 'error',
                'error': str(e)
            })

    return embeddings, results

def test_embedding_similarity():
    """Test embedding similarity calculations."""
    print("\n🔍 Testing Embedding Similarity")
    print("=" * 40)

    embeddings, _ = test_embedding_extraction()

    if len(embeddings) < 2:
        print("❌ Need at least 2 embeddings for similarity testing")
        return False

    print("🧮 Computing pairwise similarities...")

    speakers = list(embeddings.keys())
    similarities = {}

    # Cosine similarity function
    def cosine_similarity(a, b):
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    for i, speaker_a in enumerate(speakers):
        similarities[speaker_a] = {}
        for j, speaker_b in enumerate(speakers):
            similarity = cosine_similarity(embeddings[speaker_a], embeddings[speaker_b])
            similarities[speaker_a][speaker_b] = similarity

            if i <= j:  # Print upper triangle + diagonal
                if speaker_a == speaker_b:
                    print(f"   {speaker_a} ↔ {speaker_b}: {similarity:.3f} (self)")
                else:
                    print(f"   {speaker_a} ↔ {speaker_b}: {similarity:.3f}")

    # Analysis
    print("\n📊 Similarity Analysis:")

    # Self-similarities (should be 1.0)
    self_similarities = [similarities[s][s] for s in speakers]
    print(f"   Self-similarity range: [{min(self_similarities):.3f}, {max(self_similarities):.3f}]")

    # Cross-similarities
    cross_similarities = []
    for i, speaker_a in enumerate(speakers):
        for j, speaker_b in enumerate(speakers):
            if i < j:
                cross_similarities.append(similarities[speaker_a][speaker_b])

    if cross_similarities:
        avg_cross_sim = np.mean(cross_similarities)
        print(f"   Average cross-similarity: {avg_cross_sim:.3f}")
        print(f"   Cross-similarity range: [{min(cross_similarities):.3f}, {max(cross_similarities):.3f}]")

        # Check if embeddings are distinguishable
        if avg_cross_sim < 0.5:
            print("   ✅ Embeddings appear distinguishable")
        else:
            print("   ⚠️  Embeddings may be too similar")

    return similarities

def test_embedding_consistency():
    """Test embedding consistency for the same speaker."""
    print("\n🔄 Testing Embedding Consistency")
    print("=" * 40)

    # Check environment
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        print("❌ HUGGINGFACE_TOKEN not found")
        return False

    data_dir = Path("data/audio_test_files_1")
    test_file = data_dir / "voice_sample_sami.m4a"

    if not test_file.exists():
        print("❌ Test file not found")
        return False

    audio_processor = AudioProcessor()
    diarizer = SpeakerDiarizer(hf_token)

    # Convert audio
    wav_file = audio_processor.convert_to_wav(test_file)

    try:
        print("🔄 Extracting embedding multiple times...")

        # Extract embeddings multiple times
        embeddings = []
        for i in range(3):
            print(f"   Attempt {i+1}...")
            embedding = diarizer.extract_speaker_embedding(wav_file)
            embeddings.append(embedding)

        if len(embeddings) >= 2:
            # Compare consistency
            similarity_1_2 = np.dot(embeddings[0], embeddings[1]) / (
                np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
            )

            print(f"✅ Consistency test completed")
            print(f"   Similarity between attempts: {similarity_1_2:.3f}")

            if similarity_1_2 > 0.95:
                print("   ✅ Very consistent embeddings")
            elif similarity_1_2 > 0.8:
                print("   ✅ Reasonably consistent embeddings")
            else:
                print("   ⚠️  Embeddings may be inconsistent")

            return True

    except Exception as e:
        print(f"❌ Consistency test failed: {e}")

    return False

def save_embedding_results(results, similarities):
    """Save embedding test results."""
    output_dir = Path("data/test_results")
    output_dir.mkdir(exist_ok=True)

    # Save results
    result_file = output_dir / "embedding_test_results.json"
    with open(result_file, 'w') as f:
        json.dump({
            'extraction_results': results,
            'similarities': similarities
        }, f, indent=2, default=str)

    print(f"\n📊 Results saved to: {result_file}")

if __name__ == "__main__":
    print("🎯 Speaker Embedding Test Suite")
    print("=" * 50)

    # Run tests
    embeddings, extraction_results = test_embedding_extraction()
    similarities = test_embedding_similarity()
    consistency_test = test_embedding_consistency()

    # Save results
    if extraction_results and similarities:
        save_embedding_results(extraction_results, similarities)

    # Summary
    successful = len([r for r in extraction_results if r['status'] == 'success'])
    total = len(extraction_results)

    print(f"\n📊 Test Summary:")
    print(f"   Voice samples processed: {total}")
    print(f"   Embeddings extracted: {successful}")
    print(f"   Success rate: {successful/total*100:.1f}%" if total > 0 else "   No samples processed")

    if successful > 0 and similarities and consistency_test:
        print("\n🎉 Speaker embedding tests completed!")
        print("   Note: Tests require proper model access to function correctly")
        exit(0)
    else:
        print("\n❌ Some embedding tests failed")
        exit(1)