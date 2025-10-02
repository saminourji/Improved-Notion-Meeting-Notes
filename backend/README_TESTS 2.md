# Pipeline Testing Guide

This directory contains comprehensive tests for each component of the meeting processing pipeline.

## 🧪 Individual Test Files

### 1. **test_audio_conversion.py** - Audio Processing Tests
Tests the audio format conversion functionality.

**What it tests:**
- Converting m4a/mp3/wav files to standardized 16kHz mono WAV
- File format detection and handling
- Audio properties validation (sample rate, channels)
- File size and duration analysis

**Run:**
```bash
python backend/tests/test_audio_conversion.py
```

**Expected:** ✅ All 4 audio files converted successfully with correct properties

---

### 2. **test_diarization.py** - Speaker Diarization Tests
Tests the core speaker diarization pipeline using pyannote.audio.

**What it tests:**
- Loading pyannote.audio models (requires HuggingFace token)
- Speaker diarization on single and multi-speaker audio
- Segment detection and speaker labeling
- Different parameter configurations (speaker count)

**Run:**
```bash
python backend/tests/test_diarization.py
```

**Expected:** ✅ Segments identified with speaker labels (may require model access)

---

### 3. **test_speaker_embeddings.py** - Voice Embedding Tests
Tests speaker embedding extraction and similarity calculations.

**What it tests:**
- Extracting voice embeddings from audio samples
- Embedding consistency across multiple extractions
- Similarity calculations between different speakers
- Embedding properties (shape, statistics)

**Run:**
```bash
python backend/tests/test_speaker_embeddings.py
```


---

### 4. **test_speaker_matching.py** - Speaker Recognition Tests
Tests matching diarized speakers against known voice samples.

**What it tests:**
- SpeakerMatcher initialization and configuration
- Cosine similarity calculations between embeddings
- Speaker identification with confidence thresholds
- Handling unknown speakers

**Run:**
```bash
python backend/tests/test_speaker_matching.py
```

**Expected:** ✅ Uses dummy embeddings but tests matching logic correctly

---

### 5. **test_transcription.py** - Speech-to-Text Tests
Tests the Whisper-based transcription functionality.

**What it tests:**
- Whisper model loading (uses 'tiny' model for speed)
- Single and multi-segment transcription
- Transcription quality metrics
- Text processing and formatting

**Run:**
```bash
python backend/tests/test_transcription.py
```

**Expected:** ✅ Transcriptions generated with reasonable quality scores

## 🏃‍♂️ Running Tests

### Run All Tests
```bash
# Full test suite (takes ~5-10 minutes)
python backend/tests/run_all_tests.py

# Quick tests only (takes ~1-2 minutes)
python backend/tests/run_all_tests.py --quick
```

### Run Individual Tests
```bash
# Test specific component
python backend/tests/test_audio_conversion.py
python backend/tests/test_transcription.py
# ... etc
```

### From Project Root
```bash
cd /path/to/Notion-Meeting-Notes

# Activate environment
source .venv/bin/activate

# Run tests
python backend/tests/run_all_tests.py
```

## 📊 Test Results

Test results are saved to `data/test_results/`:
- `all_tests_summary.json` - Complete test run summary
- `audio_conversion_results.json` - Audio conversion details
- `diarization_test_results.json` - Diarization segment data
- `embedding_test_results.json` - Embedding analysis
- `matching_test_results.json` - Speaker matching results
- `transcription_test_results.json` - Transcription outputs

## 🔧 Test Configuration

### Environment Requirements
```bash
# Required environment variables
HUGGINGFACE_TOKEN=your_token_here
OPENAI_API_KEY=your_key_here
```

### Test Data
Tests use audio files from `data/audio_test_files_1/`:
- `voice_sample_sami.m4a`
- `voice_sample_aadil.m4a`
- `voice_sample_sparsh.m4a`
- `sample_meeting_sparsh_aadil_sami.m4a`

## 🎯 Expected Results

### ✅ Working Components
- **Audio Conversion**: Should pass 100% (no external dependencies)
- **Transcription**: Should pass with 'tiny' Whisper model
- **Speaker Matching**: Should pass with dummy embeddings

### ⚠️ Limited Components
- **Diarization**: May fail due to HuggingFace model access
- **Speaker Embeddings**: May use dummy data due to model restrictions

### 📈 Success Criteria
- **Full Pipeline**: 60%+ success rate (due to model access issues)
- **Core Logic**: 80%+ success rate (audio, matching, transcription)
- **Quick Tests**: 90%+ success rate (no model dependencies)

## 🐛 Troubleshooting

### Model Access Issues
```
Error: 'NoneType' object has no attribute 'eval'
```
**Solution:** HuggingFace model access restricted. Tests will use dummy data.

### Audio Conversion Fails
```
Error: ffmpeg not found
```
**Solution:** Install FFmpeg: `brew install ffmpeg` (macOS)

### Whisper Model Download
```
Downloading model...
```
**Expected:** First run downloads ~40MB model file

### Permission Errors
```
PermissionError: [Errno 13]
```
**Solution:** Check file permissions and virtual environment activation

## 📋 Test Status Summary

| Component | Test File | Status | Notes |
|-----------|-----------|---------|-------|
| Audio Conversion | `test_audio_conversion.py` | ✅ Working | No dependencies |
| Speaker Diarization | `test_diarization.py` | ⚠️ Limited | Needs HF access |
| Speaker Embeddings | `test_speaker_embeddings.py` | ⚠️ Limited | Uses dummy data |
| Speaker Matching | `test_speaker_matching.py` | ✅ Working | Logic tests pass |
| Transcription | `test_transcription.py` | ✅ Working | Uses tiny model |

## 🎉 Next Steps

1. **Run quick tests** to verify basic functionality
2. **Check individual failing tests** for specific issues
3. **Review test results** in `data/test_results/`
4. **Fix model access issues** for full pipeline testing
5. **Add integration tests** once all components work