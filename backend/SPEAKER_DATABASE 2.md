# Speaker Database System

The pipeline includes a persistent speaker database that automatically learns and recognizes speakers over time.

## 🗄️ **Key Features**

### ✅ **Core Capabilities:**
1. **🎯 AUTO speaker detection** - No need to specify speaker count
2. **🗄️ Persistent speaker database** - Learn once, recognize forever
3. **🔄 Automatic learning** - Builds speaker knowledge dynamically

## 🎯 **Auto Speaker Detection**

The diarization automatically detects the number of speakers:

```python
# Automatic detection (default)
diarization = pipeline(audio)  # AUTO detects 2, 3, 4, or any number

# Optional: Specify if known
diarization = pipeline(audio, num_speakers=3)  # Fixed count
```

**Benefits:**
- No need to know speaker count in advance
- Works with any meeting size
- Robust for real-world scenarios

## 🗄️ **Speaker Database**

### **Database Structure**
```
data/speakers/
├── alice.npz              # Embedding file
├── alice_metadata.json    # Metadata
├── bob.npz
├── bob_metadata.json
└── charlie.npz
    charlie_metadata.json
```

### **Automatic Learning**
When you provide voice samples, they're automatically added to the database:

```python
# Voice samples get stored permanently
voice_samples = {
    "alice": "voice_sample_alice.m4a",
    "bob": "voice_sample_bob.m4a"
}

processor.process_meeting(meeting_audio, voice_samples=voice_samples)
# → Alice and Bob are now in the database forever
```

### **Persistent Recognition**
Once speakers are in the database, they're recognized in future meetings automatically:

```python
# First meeting: Provide voice samples
result1 = processor.process_meeting("meeting1.m4a", voice_samples)

# Future meetings: No voice samples needed
result2 = processor.process_meeting("meeting2.m4a")  # Recognizes Alice & Bob
result3 = processor.process_meeting("meeting3.m4a")  # Still recognizes them
```

## 🔧 **Speaker Manager CLI**

Manage the speaker database with the CLI tool:

### **List Speakers**
```bash
python backend/speaker_manager.py list
```

### **Add Speaker**
```bash
python backend/speaker_manager.py add alice /path/to/alice_sample.m4a
```

### **Remove Speaker**
```bash
python backend/speaker_manager.py remove alice
```

### **Database Stats**
```bash
python backend/speaker_manager.py stats
```

### **Test Similarity**
```bash
python backend/speaker_manager.py similarity alice bob
```

### **Backup Database**
```bash
python backend/speaker_manager.py backup --output speakers_backup.json
```

## 📊 **Enhanced Pipeline Output**

The pipeline now provides much more detailed information:

```json
{
  "diarization_metadata": {
    "unique_speakers": ["SPEAKER_00", "SPEAKER_01", "SPEAKER_02"],
    "total_speakers": 3,
    "auto_detection_used": true
  },
  "speaker_database_stats": {
    "total_speakers": 5,
    "speakers": ["alice", "bob", "charlie", "diana", "eve"],
    "database_size_mb": 2.1
  },
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "speaker": "SPEAKER_00",
      "matched_speaker": "alice",
      "similarity_score": 0.87,
      "text": "Hello everyone, let's start the meeting."
    }
  ]
}
```

## 🧪 **Testing the Pipeline**

### **Test Components**
```bash
# Test individual components
python backend/tests/run_all_tests.py

# Test speaker database functionality
python backend/tests/test_speaker_embeddings.py

# Test diarization with auto-detection
python backend/tests/test_diarization.py
```

## ⚡ **Performance Features**

### **Segment-Specific Embeddings**
- Extracts embeddings from specific time segments
- Better speaker matching accuracy
- Optimized for speaker recognition

### **Embedding Caching**
- Extracts embedding once per diarized speaker
- Reuses cached embeddings for multiple segments
- Faster processing for long meetings

### **Lazy Loading**
- Models loaded only when needed
- Database loaded at startup
- Efficient memory usage

## 🔄 **Data Management**

The system automatically manages speaker data:

1. **Voice samples**: Automatically added to database
2. **Persistent storage**: Speakers remembered across sessions
3. **Incremental learning**: Database grows with usage

## 🎉 **Real-World Usage**

### **Meeting Series**
```python
# Week 1: Add team members
processor.process_meeting("standup_week1.m4a", {
    "alice": "alice_intro.m4a",
    "bob": "bob_intro.m4a",
    "charlie": "charlie_intro.m4a"
})

# Week 2-N: Just process meetings
processor.process_meeting("standup_week2.m4a")  # Recognizes everyone
processor.process_meeting("standup_week3.m4a")  # Still works
```

### **Growing Teams**
```python
# Q1: 3 people
processor.process_meeting("q1_meeting.m4a")  # AUTO detects 3

# Q2: 5 people (2 new hires)
processor.process_meeting("q2_meeting.m4a", {
    "diana": "diana_sample.m4a",
    "eve": "eve_sample.m4a"
})  # AUTO detects 5, learns 2 new speakers

# Q3: Still 5 people
processor.process_meeting("q3_meeting.m4a")  # Recognizes all 5
```

This system scales naturally with your organization and gets better over time!