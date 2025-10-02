"""
Unit test for Transcriber.transcribe_segments to verify word-to-segment assignment.
Tests the optimized single-pass transcription logic.
"""

import unittest
from unittest.mock import Mock, patch
from pathlib import Path
from backend.app.pipeline.processor import Transcriber


class TestTranscriberSegments(unittest.TestCase):
    
    def setUp(self):
        self.transcriber = Transcriber()
        
    def test_word_to_segment_assignment(self):
        """Test that words are correctly assigned to segments using midpoint/IoU logic."""
        
        # Mock segments
        segments = [
            {'start': 1.0, 'end': 3.0, 'speaker': 'SPEAKER_00'},
            {'start': 3.5, 'end': 5.5, 'speaker': 'SPEAKER_01'},
            {'start': 6.0, 'end': 8.0, 'speaker': 'SPEAKER_00'},
        ]
        
        # Mock Whisper transcription result with word timestamps
        mock_transcript_segment = Mock()
        mock_transcript_segment.words = [
            Mock(word="Hello", start=1.2, end=1.5),      # Should match segment 1
            Mock(word="world", start=1.5, end=1.8),      # Should match segment 1
            Mock(word="this", start=2.0, end=2.3),       # Should match segment 1
            Mock(word="is", start=2.3, end=2.5),         # Should match segment 1
            Mock(word="a", start=3.8, end=4.0),          # Should match segment 2
            Mock(word="test", start=4.0, end=4.3),       # Should match segment 2
            Mock(word="of", start=4.3, end=4.5),         # Should match segment 2
            Mock(word="the", start=4.5, end=4.7),        # Should match segment 2
            Mock(word="system", start=6.2, end=6.7),     # Should match segment 3
            Mock(word="working", start=6.7, end=7.2),    # Should match segment 3
            Mock(word="properly", start=7.2, end=7.8),   # Should match segment 3
        ]
        
        mock_transcription_result = [mock_transcript_segment]
        
        with patch.object(self.transcriber, '_load_model'), \
             patch.object(self.transcriber, 'model') as mock_model:
            
            # Mock the model.transcribe call
            mock_model.transcribe.return_value = (mock_transcription_result, None)
            
            # Call the method
            result = self.transcriber.transcribe_segments(Path("/fake/path.wav"), segments)
            
            # Verify model.transcribe was called exactly once
            self.assertEqual(mock_model.transcribe.call_count, 1)
            
            # Verify we got 3 segments back
            self.assertEqual(len(result), 3)
            
            # Verify segments have text
            self.assertTrue(len(result[0]['text'].strip()) > 0, "Segment 1 should have text")
            self.assertTrue(len(result[1]['text'].strip()) > 0, "Segment 2 should have text") 
            self.assertTrue(len(result[2]['text'].strip()) > 0, "Segment 3 should have text")
            
            # Verify specific word assignments
            segment1_text = result[0]['text'].lower()
            self.assertIn("hello", segment1_text)
            self.assertIn("world", segment1_text)
            self.assertIn("this", segment1_text)
            self.assertIn("is", segment1_text)
            
            segment2_text = result[1]['text'].lower()
            self.assertIn("a", segment2_text)
            self.assertIn("test", segment2_text)
            self.assertIn("of", segment2_text)
            self.assertIn("the", segment2_text)
            
            segment3_text = result[2]['text'].lower()
            self.assertIn("system", segment3_text)
            self.assertIn("working", segment3_text)
            self.assertIn("properly", segment3_text)
    
    def test_overlap_calculation(self):
        """Test the IoU overlap calculation method."""
        
        # Test perfect overlap
        overlap = self.transcriber._calculate_overlap(1.0, 3.0, 1.0, 3.0)
        self.assertAlmostEqual(overlap, 1.0, places=3)
        
        # Test partial overlap
        overlap = self.transcriber._calculate_overlap(1.0, 3.0, 2.0, 4.0)
        self.assertAlmostEqual(overlap, 0.333, places=2)
        
        # Test no overlap
        overlap = self.transcriber._calculate_overlap(1.0, 2.0, 3.0, 4.0)
        self.assertEqual(overlap, 0.0)
        
        # Test edge case: adjacent intervals
        overlap = self.transcriber._calculate_overlap(1.0, 2.0, 2.0, 3.0)
        self.assertEqual(overlap, 0.0)
    
    def test_empty_segments_fallback(self):
        """Test that empty segments get populated through fallback mechanisms."""
        
        # Mock segments with gaps
        segments = [
            {'start': 0.1, 'end': 0.2, 'speaker': 'SPEAKER_00'},  # Very short segment
            {'start': 5.0, 'end': 5.1, 'speaker': 'SPEAKER_01'},  # Another short segment
        ]
        
        # Mock words that are near but not exactly in segments
        mock_transcript_segment = Mock()
        mock_transcript_segment.words = [
            Mock(word="nearby", start=0.05, end=0.15),   # Should be caught by expanded window
            Mock(word="word", start=5.05, end=5.15),     # Should be caught by expanded window
        ]
        
        mock_transcription_result = [mock_transcript_segment]
        
        with patch.object(self.transcriber, '_load_model'), \
             patch.object(self.transcriber, 'model') as mock_model:
            
            mock_model.transcribe.return_value = (mock_transcription_result, None)
            
            result = self.transcriber.transcribe_segments(Path("/fake/path.wav"), segments)
            
            # Both segments should have text due to fallback mechanisms
            self.assertTrue(len(result[0]['text'].strip()) > 0, "Segment 1 should have text via fallback")
            self.assertTrue(len(result[1]['text'].strip()) > 0, "Segment 2 should have text via fallback")


if __name__ == '__main__':
    unittest.main()
