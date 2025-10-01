"""Core audio processing pipeline for speaker diarization and transcription."""

from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
import numpy as np
from pydub import AudioSegment
import torch
from pyannote.audio import Pipeline
from speechbrain.inference.speaker import EncoderClassifier
from faster_whisper import WhisperModel
import structlog
from .speaker_database import SpeakerDatabase
from ..services.llm_service import LLMService

logger = structlog.get_logger(__name__)


class AudioProcessor:
    """Handles audio file conversion and preprocessing."""

    def __init__(self):
        pass

    def convert_to_wav(self, input_path: Path, output_path: Optional[Path] = None) -> Path:
        """Convert audio file to 16kHz mono WAV format."""
        if output_path is None:
            output_path = input_path.with_suffix('.wav')

        logger.info("converting_audio", input=str(input_path), output=str(output_path))

        # Load and convert audio
        audio = AudioSegment.from_file(str(input_path))
        audio = audio.set_frame_rate(16000).set_channels(1)
        audio.export(str(output_path), format="wav")

        logger.info("audio_converted", duration_seconds=len(audio) / 1000.0)
        return output_path


class SpeakerDiarizer:
    """Handles speaker diarization using pyannote.audio and SpeechBrain embeddings."""

    def __init__(self, hf_token: str):
        self.hf_token = hf_token
        self.pipeline = None
        self.embedding_model = None

    def _load_models(self):
        """Lazy load the models to avoid startup delays."""
        if self.pipeline is None:
            logger.info("loading_diarization_pipeline")
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=self.hf_token
            )

        if self.embedding_model is None:
            logger.info("loading_speechbrain_embedding_model")
            self.embedding_model = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                savedir="pretrained_models/spkrec-ecapa-voxceleb"
            )

    def diarize(self, audio_path: Path, num_speakers: Optional[int] = None) -> Dict:
        """Perform speaker diarization on audio file with automatic speaker detection."""
        self._load_models()

        logger.info("starting_diarization", audio_path=str(audio_path), auto_speakers=num_speakers is None)

        # Run diarization - default is AUTO speaker detection
        if num_speakers:
            logger.info("using_fixed_speaker_count", count=num_speakers)
            diarization = self.pipeline(str(audio_path), num_speakers=num_speakers)
        else:
            logger.info("using_automatic_speaker_detection")
            diarization = self.pipeline(str(audio_path))  # AUTO detection

        # Convert to simple format
        segments = []
        unique_speakers = set()

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                'start': turn.start,
                'end': turn.end,
                'speaker': speaker,
                'duration': turn.end - turn.start
            })
            unique_speakers.add(speaker)

        logger.info("diarization_complete",
                   num_segments=len(segments),
                   unique_speakers=len(unique_speakers),
                   speakers_found=list(unique_speakers))

        return {
            'segments': segments,
            'unique_speakers': list(unique_speakers),
            'total_speakers': len(unique_speakers)
        }

    def extract_speaker_embedding(self, audio_path: Path, start_time: float = None, end_time: float = None) -> np.ndarray:
        """Extract speaker embedding from voice sample or audio segment using SpeechBrain."""
        self._load_models()

        logger.info("extracting_speaker_embedding",
                   audio_path=str(audio_path),
                   start_time=start_time,
                   end_time=end_time)

        try:
            # Load audio using torchaudio (as per SpeechBrain docs)
            import torchaudio
            logger.info("loading_audio_with_torchaudio")
            waveform, sample_rate = torchaudio.load(str(audio_path))

            # Ensure single channel
            if waveform.shape[0] > 1:
                waveform = torch.mean(waveform, dim=0, keepdim=True)

            logger.info("audio_loaded",
                       shape=waveform.shape,
                       sample_rate=sample_rate,
                       duration=waveform.shape[1] / sample_rate)

            # Extract specific time segment if specified
            if start_time is not None and end_time is not None:
                start_sample = int(start_time * sample_rate)
                end_sample = int(end_time * sample_rate)

                # Ensure we don't go out of bounds
                start_sample = max(0, start_sample)
                end_sample = min(waveform.shape[1], end_sample)

                if start_sample < end_sample:
                    waveform = waveform[:, start_sample:end_sample]
                    logger.info("extracted_audio_segment",
                               duration=end_time-start_time,
                               samples=end_sample-start_sample)

            # Extract embedding using SpeechBrain's encode_batch method
            logger.info("extracting_embedding_with_speechbrain")
            with torch.no_grad():
                embeddings = self.embedding_model.encode_batch(waveform)

            # Convert to numpy array
            if torch.is_tensor(embeddings):
                embedding = embeddings.squeeze().cpu().numpy()
            else:
                embedding = np.array(embeddings).squeeze()

            # Ensure 1D embedding
            if embedding.ndim > 1:
                embedding = np.mean(embedding, axis=0)

            logger.info("embedding_extracted",
                       embedding_shape=embedding.shape,
                       embedding_type=type(embedding).__name__)

            return embedding

        except Exception as e:
            logger.error("embedding_extraction_failed",
                        audio_path=str(audio_path),
                        error=str(e))
            raise


class SpeakerMatcher:
    """Matches diarized speakers against known voice samples."""

    def __init__(self, similarity_threshold: float = 0.75, diarizer=None):
        self.similarity_threshold = similarity_threshold
        self.known_speakers: Dict[str, np.ndarray] = {}
        self._diarizer = diarizer

    def add_speaker(self, speaker_name: str, embedding: np.ndarray):
        """Add a known speaker embedding."""
        self.known_speakers[speaker_name] = embedding
        logger.info("speaker_added", name=speaker_name, embedding_shape=embedding.shape)

    def load_speakers_from_dir(self, speakers_dir: Path):
        """Load all speaker embeddings from a directory."""
        for embedding_file in speakers_dir.glob("*.npy"):
            speaker_name = embedding_file.stem
            embedding = np.load(embedding_file)
            self.add_speaker(speaker_name, embedding)

    def extract_and_match_speakers(self, audio_path: Path, diarization_result: Dict, diarizer) -> Dict:
        """Extract speaker embeddings using equal-weight averaging and match to known speakers.

        This consolidates the logic that was previously scattered across test files.
        """
        import numpy as np

        segments = diarization_result['segments']

        # Group segments by speaker
        segments_by_speaker = {}
        for segment in segments:
            speaker = segment['speaker']
            duration = segment['end'] - segment['start']

            if speaker not in segments_by_speaker:
                segments_by_speaker[speaker] = []

            segments_by_speaker[speaker].append({
                'start': segment['start'],
                'end': segment['end'],
                'duration': duration
            })

        # Extract embeddings using equal-weight averaging for each speaker
        unique_speaker_embeddings = {}
        segment_details = {}  # For debugging/logging

        for speaker, speaker_segments in segments_by_speaker.items():
            segment_embeddings = []
            segment_details[speaker] = []

            for i, seg in enumerate(speaker_segments):
                # Skip extremely short segments that would cause model errors
                if seg['duration'] < 0.1:
                    segment_details[speaker].append(f"Segment {i+1}: SKIPPED (too short)")
                    continue

                embedding = diarizer.extract_speaker_embedding(
                    audio_path,
                    start_time=seg['start'],
                    end_time=seg['end']
                )
                segment_embeddings.append(embedding)

                # Calculate similarities to known speakers for this segment (for debugging)
                similarities = []
                for voice_name, known_embedding in self.known_speakers.items():
                    similarity = self._cosine_similarity(embedding, known_embedding)
                    similarities.append(f"{voice_name}:{similarity:.3f}")

                similarities_str = " | ".join(similarities)
                segment_details[speaker].append(f"Segment {i+1}: {seg['start']:.1f}-{seg['end']:.1f}s ({seg['duration']:.2f}s) → {similarities_str}")

            if segment_embeddings:
                # Calculate simple average embedding (equal weights)
                if len(segment_embeddings) == 1:
                    final_embedding = segment_embeddings[0]
                else:
                    final_embedding = np.mean(segment_embeddings, axis=0)

                unique_speaker_embeddings[speaker] = final_embedding

                # Calculate similarities for the averaged embedding
                averaged_similarities = []
                for voice_name, known_embedding in self.known_speakers.items():
                    similarity = self._cosine_similarity(final_embedding, known_embedding)
                    averaged_similarities.append(f"{voice_name}:{similarity:.3f}")

                averaged_str = " | ".join(averaged_similarities)
                segment_details[speaker].append(f"Final averaged embedding → {averaged_str}")

        # Create segment embeddings list (reuse speaker embeddings for all segments)
        segment_embeddings = []
        for segment in segments:
            if segment['speaker'] in unique_speaker_embeddings:
                segment_embeddings.append(unique_speaker_embeddings[segment['speaker']])
            else:
                # Fallback for very short speakers with no valid embeddings
                segment_embeddings.append(np.zeros(192))  # Placeholder

        # Now match using the existing logic
        matching_result = self.match_segments(diarization_result, segment_embeddings)

        # Add debugging info to the result
        matching_result['segment_details'] = segment_details
        matching_result['unique_speaker_embeddings'] = unique_speaker_embeddings

        return matching_result

    def match_segments(self, diarization_result: Dict, segment_embeddings: List[np.ndarray]) -> Dict:
        """Match diarized segments to known speakers."""
        segments = diarization_result['segments']

        if len(segment_embeddings) != len(segments):
            raise ValueError(f"Mismatch: {len(segments)} segments but {len(segment_embeddings)} embeddings")

        matched_segments = []
        speaker_mapping = {}

        for i, (segment, embedding) in enumerate(zip(segments, segment_embeddings)):
            # Calculate similarities to all known speakers
            similarities = []
            for speaker_name, known_embedding in self.known_speakers.items():
                similarity = self._cosine_similarity(embedding, known_embedding)
                similarities.append((speaker_name, similarity))

            # Sort by similarity (highest first)
            similarities.sort(key=lambda x: x[1], reverse=True)

            best_match = None
            if similarities:
                best_speaker, best_similarity = similarities[0]
                second_best_similarity = similarities[1][1] if len(similarities) > 1 else 0.0

                # Apply new matching criteria:
                # 1. Best similarity >= 0.1
                # 2. Best similarity is at least 0.1 higher than second best
                if best_similarity >= 0.1 and (best_similarity - second_best_similarity) >= 0.1:
                    best_match = best_speaker

            # Use original speaker ID if no match found
            if best_match is None:
                original_speaker = segment['speaker']
                if original_speaker not in speaker_mapping:
                    speaker_mapping[original_speaker] = f"Unknown_{len(speaker_mapping) + 1}"
                matched_speaker = speaker_mapping[original_speaker]
                final_similarity = similarities[0][1] if similarities else 0.0
            else:
                matched_speaker = best_match
                final_similarity = similarities[0][1]

            matched_segments.append({
                **segment,
                'matched_speaker': matched_speaker,
                'similarity_score': final_similarity
            })

        logger.info("speaker_matching_complete",
                   total_segments=len(matched_segments),
                   matched_speakers=len([s for s in matched_segments if not s['matched_speaker'].startswith('Unknown')]))

        return {
            'segments': matched_segments,
            'speaker_mapping': speaker_mapping
        }

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings."""
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)


class Transcriber:
    """Handles speech-to-text transcription."""

    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self.model = None

    def _load_model(self):
        """Lazy load Whisper model."""
        if self.model is None:
            logger.info("loading_whisper_model", model=self.model_name)
            self.model = WhisperModel(self.model_name, device="cpu", compute_type="int8")

    def transcribe_segments(self, audio_path: Path, segments: List[Dict]) -> List[Dict]:
        """Transcribe each diarized segment."""
        self._load_model()

        logger.info("starting_transcription", audio_path=str(audio_path), num_segments=len(segments))

        transcribed_segments = []

        for segment in segments:
            start_time = segment['start']
            end_time = segment['end']

            # Transcribe the segment
            transcription_result, _ = self.model.transcribe(
                str(audio_path),
                initial_prompt=None,
                word_timestamps=False
            )

            # Extract text for this time segment
            segment_text = ""
            for transcript_segment in transcription_result:
                if (transcript_segment.start >= start_time and
                    transcript_segment.end <= end_time):
                    segment_text += transcript_segment.text + " "

            # If no exact match, use the whole transcription (simplified approach)
            if not segment_text.strip():
                full_transcription = " ".join([s.text for s in transcription_result])
                segment_text = full_transcription

            transcribed_segments.append({
                **segment,
                'text': segment_text.strip(),
                'confidence': 0.8  # Placeholder confidence
            })

        logger.info("transcription_complete", segments_transcribed=len(transcribed_segments))
        return transcribed_segments

    def transcribe_full_meeting(self, audio_path: Path, matched_segments: List[Dict]) -> Dict:
        """Transcribe entire meeting and create speaker-annotated transcript."""
        self._load_model()

        logger.info("starting_full_meeting_transcription", audio_path=str(audio_path))

        # Get full transcription with word timestamps
        segments_result, info = self.model.transcribe(
            str(audio_path),
            word_timestamps=True
        )

        # Extract all words with timestamps
        words_with_speakers = []
        for segment in segments_result:
            for word in segment.words:
                speaker = self._assign_word_to_speaker(word, matched_segments)
                words_with_speakers.append({
                    'word': word.word,
                    'start': word.start,
                    'end': word.end,
                    'speaker': speaker
                })

        # Format as conversation
        formatted_transcript = self._format_as_conversation(words_with_speakers)

        # Get full text
        full_text = " ".join([word_info['word'] for word_info in words_with_speakers])

        result = {
            'full_text': full_text.strip(),
            'speaker_annotated_transcript': formatted_transcript,
            'word_count': len(words_with_speakers),
            'duration': info.duration,
            'language': info.language,
            'words_with_speakers': words_with_speakers
        }

        logger.info("full_meeting_transcription_complete",
                   word_count=len(words_with_speakers),
                   duration=info.duration)

        return result

    def _assign_word_to_speaker(self, word, diarization_segments, tolerance=0.3):
        """Assign a word to a speaker based on timestamp and sentence context."""
        timestamp = word.start
        word_text = word.word

        # First: try direct hit (word timestamp within a segment)
        for segment in diarization_segments:
            if segment['start'] <= timestamp <= segment['end']:
                return segment.get('matched_speaker', 'Unknown')

        # Second: find all segments within tolerance
        nearby_segments = []
        for segment in diarization_segments:
            distance = None

            if timestamp < segment['start']:
                distance = segment['start'] - timestamp
                direction = 'next'
            elif timestamp > segment['end']:
                distance = timestamp - segment['end']
                direction = 'previous'

            if distance is not None and distance <= tolerance:
                nearby_segments.append((direction, segment, distance))

        if not nearby_segments:
            return "UNASSIGNED"

        # Third: Apply assignment rules
        is_sentence_end = word_text.rstrip().endswith(('.', '!', '?'))

        if is_sentence_end:
            # Rule 1: End of sentence → assign to previous speaker
            previous_segments = [(s, d) for direction, s, d in nearby_segments if direction == 'previous']
            if previous_segments:
                closest_previous = min(previous_segments, key=lambda x: x[1])[0]
                return closest_previous.get('matched_speaker', 'Unknown')

        # Rule 2: Otherwise → assign to closest segment
        closest_segment = min(nearby_segments, key=lambda x: x[2])[1]
        return closest_segment.get('matched_speaker', 'Unknown')

    def _format_as_conversation(self, words_with_speakers):
        """Group words by speaker and format as natural conversation."""
        utterances = []
        current_speaker = None
        current_words = []

        for word_info in words_with_speakers:
            speaker = word_info['speaker']
            word = word_info['word']

            # Speaker change
            if speaker != current_speaker:
                if current_words and current_speaker:
                    text = ''.join(current_words).strip()
                    if text:
                        utterances.append(f"{current_speaker}: \"{text}\"")
                current_words = []
                current_speaker = speaker

            current_words.append(word)

        # Don't forget the last utterance
        if current_words and current_speaker:
            text = ''.join(current_words).strip()
            if text:
                utterances.append(f"{current_speaker}: \"{text}\"")

        return '\n\n'.join(utterances)


class MeetingProcessor:
    """Main meeting processing pipeline orchestrator."""

    def __init__(self, hf_token: str, openai_api_key: str, speaker_db_path: Optional[Path] = None):
        self.audio_processor = AudioProcessor()
        self.diarizer = SpeakerDiarizer(hf_token)
        self.matcher = SpeakerMatcher()
        self.transcriber = Transcriber()
        self.llm_service = LLMService(openai_api_key)

        # Initialize speaker database
        self.speaker_db = SpeakerDatabase(speaker_db_path)
        logger.info("meeting_processor_initialized",
                   known_speakers=len(self.speaker_db.list_speakers()))

    def process_meeting(self, audio_path: Path, voice_samples: Optional[Dict[str, Path]] = None,
                       num_speakers: Optional[int] = None, generate_insights: bool = True,
                       generate_all_action_views: bool = False) -> Dict:
        """Process a complete meeting: diarize, match speakers, transcribe."""
        logger.info("processing_meeting_start",
                   audio_path=str(audio_path),
                   voice_samples_provided=len(voice_samples) if voice_samples else 0,
                   known_speakers_in_db=len(self.speaker_db.list_speakers()))

        # Convert audio to proper format
        wav_path = self.audio_processor.convert_to_wav(audio_path)

        # Add new voice samples to database if provided
        if voice_samples:
            for speaker_name, sample_path in voice_samples.items():
                try:
                    sample_wav = self.audio_processor.convert_to_wav(sample_path)
                    embedding = self.diarizer.extract_speaker_embedding(sample_wav)

                    # Add to database
                    success = self.speaker_db.add_speaker(speaker_name, embedding, {
                        'source_audio': str(sample_path),
                        'processed_audio': str(sample_wav)
                    })

                    if success:
                        logger.info("speaker_added_to_database", speaker=speaker_name)
                    else:
                        logger.warning("failed_to_add_speaker_to_database", speaker=speaker_name)

                except Exception as e:
                    logger.error("speaker_processing_failed", speaker=speaker_name, error=str(e))

        # Load all known speakers from database into matcher
        known_embeddings = self.speaker_db.get_all_embeddings()
        for speaker_name, embedding in known_embeddings.items():
            self.matcher.add_speaker(speaker_name, embedding)

        logger.info("loaded_speakers_for_matching", count=len(known_embeddings))

        # Perform diarization with AUTO speaker detection (unless specified)
        diarization_result = self.diarizer.diarize(wav_path, num_speakers=num_speakers)

        # Extract embeddings for each unique speaker segment
        segment_embeddings = []
        unique_speaker_embeddings = {}  # Cache embeddings per diarized speaker

        for segment in diarization_result['segments']:
            diarized_speaker = segment['speaker']

            # Only extract embedding once per diarized speaker
            if diarized_speaker not in unique_speaker_embeddings:
                try:
                    # Extract embedding from specific time segment
                    embedding = self.diarizer.extract_speaker_embedding(
                        wav_path,
                        start_time=segment['start'],
                        end_time=segment['end']
                    )
                    unique_speaker_embeddings[diarized_speaker] = embedding
                except Exception as e:
                    logger.error("segment_embedding_failed",
                                 speaker=diarized_speaker,
                                 segment=f"{segment['start']:.1f}-{segment['end']:.1f}",
                                 error=str(e))
                    raise

            # Use the cached embedding for this segment
            segment_embeddings.append(unique_speaker_embeddings[diarized_speaker])

        logger.info("extracted_segment_embeddings",
                   total_segments=len(segment_embeddings),
                   unique_diarized_speakers=len(unique_speaker_embeddings))

        # Match speakers against database
        matching_result = self.matcher.match_segments(diarization_result, segment_embeddings)

        # Transcribe segments
        transcribed_segments = self.transcriber.transcribe_segments(wav_path, matching_result['segments'])
        
        # Get full meeting transcription with speaker annotations
        transcription_result = self.transcriber.transcribe_full_meeting(wav_path, matching_result['segments'])

        # Compile final result
        result = {
            'audio_path': str(audio_path),
            'processed_audio_path': str(wav_path),
            'segments': transcribed_segments,
            'speaker_mapping': matching_result.get('speaker_mapping', {}),
            'diarization_metadata': {
                'unique_speakers': diarization_result.get('unique_speakers', []),
                'total_speakers': diarization_result.get('total_speakers', 0),
                'auto_detection_used': num_speakers is None
            },
            'speaker_database_stats': self.speaker_db.get_database_stats(),
            'processing_metadata': {
                'total_segments': len(transcribed_segments),
                'total_duration': sum(s['duration'] for s in transcribed_segments),
                'speakers_identified': len(set(s.get('matched_speaker', 'Unknown') for s in transcribed_segments))
            }
        }

        # Generate LLM insights if requested
        if generate_insights and transcription_result.get('speaker_annotated_transcript'):
            logger.info("generating_llm_insights",
                       generate_all_views=generate_all_action_views)
            try:
                if generate_all_action_views:
                    # Generate summary separately
                    summary_result = self.llm_service.generate_meeting_summary(
                        transcription_result['speaker_annotated_transcript'],
                        {
                            'duration': transcription_result['duration'] / 60,
                            'participants_count': result['processing_metadata']['speakers_identified'],
                            'segments_count': len(transcribed_segments)
                        }
                    )

                    # Generate all action item views (general + speaker-specific)
                    all_action_views = self.llm_service.extract_all_action_item_views(
                        transcription_result['speaker_annotated_transcript']
                    )

                    # Combine results
                    insights = {
                        'summary': summary_result['summary'],
                        'participants': summary_result['participants'],
                        'action_items_all_views': all_action_views,
                        'metadata': {
                            'summary_metadata': summary_result['metadata'],
                            'action_views_metadata': all_action_views['metadata'],
                            'total_tokens_used': (
                                (summary_result['metadata'].get('tokens_used', 0) or 0) +
                                (all_action_views['metadata'].get('total_tokens_used', 0) or 0)
                            ),
                            'generation_type': 'summary_plus_all_action_views'
                        }
                    }
                else:
                    # Use existing comprehensive insights method (summary + general action items)
                    insights = self.llm_service.generate_meeting_insights(
                        transcription_result['speaker_annotated_transcript'],
                        {
                            'duration': transcription_result['duration'] / 60,  # Convert to minutes
                            'participants_count': result['processing_metadata']['speakers_identified'],
                            'segments_count': len(transcribed_segments)
                        }
                    )

                result['llm_insights'] = insights
                logger.info("llm_insights_generated",
                           total_tokens=insights['metadata']['total_tokens_used'],
                           generation_type=insights['metadata'].get('generation_type', 'standard'))

            except Exception as e:
                logger.error("llm_insights_generation_failed", error=str(e))
                result['llm_insights'] = {
                    'error': str(e),
                    'message': 'LLM processing failed - meeting data is still available'
                }

        logger.info("meeting_processing_complete",
                   segments=len(transcribed_segments),
                   diarized_speakers=result['diarization_metadata']['total_speakers'],
                   identified_speakers=result['processing_metadata']['speakers_identified'],
                   database_speakers=len(self.speaker_db.list_speakers()),
                   llm_insights_generated=generate_insights and 'llm_insights' in result)

        return result