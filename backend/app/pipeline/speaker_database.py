"""Speaker database for managing known voice embeddings."""

from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
import numpy as np
import structlog
from datetime import datetime

logger = structlog.get_logger(__name__)


class SpeakerDatabase:
    """Manages a database of known speaker embeddings."""

    def __init__(self, database_path: Optional[Path] = None):
        self.database_path = database_path or Path("data/speakers")
        self.database_path.mkdir(parents=True, exist_ok=True)

        self.speakers: Dict[str, Dict] = {}
        self._load_database()

    def _get_speaker_file(self, speaker_name: str) -> Path:
        """Get the file path for a speaker's data."""
        return self.database_path / f"{speaker_name}.npz"

    def _get_metadata_file(self, speaker_name: str) -> Path:
        """Get the metadata file path for a speaker."""
        return self.database_path / f"{speaker_name}_metadata.json"

    def _load_database(self):
        """Load all speakers from database files."""
        logger.info("loading_speaker_database", path=str(self.database_path))

        loaded_count = 0
        for speaker_file in self.database_path.glob("*.npz"):
            speaker_name = speaker_file.stem

            try:
                # Load embedding
                data = np.load(speaker_file)
                embedding = data['embedding']

                # Load metadata if exists
                metadata_file = self._get_metadata_file(speaker_name)
                metadata = {}
                if metadata_file.exists():
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)

                self.speakers[speaker_name] = {
                    'embedding': embedding,
                    'metadata': metadata,
                    'loaded_from': str(speaker_file)
                }

                loaded_count += 1
                logger.info("speaker_loaded", name=speaker_name, embedding_shape=embedding.shape)

            except Exception as e:
                logger.error("failed_to_load_speaker", name=speaker_name, error=str(e))

        logger.info("database_loaded", speakers_loaded=loaded_count, total_speakers=len(self.speakers))

    def add_speaker(self, speaker_name: str, embedding: np.ndarray, metadata: Optional[Dict] = None) -> bool:
        """Add or update a speaker in the database."""
        try:
            # Validate embedding
            if not isinstance(embedding, np.ndarray):
                raise ValueError("Embedding must be numpy array")

            if embedding.ndim != 1:
                raise ValueError(f"Embedding must be 1D, got shape {embedding.shape}")

            # Prepare metadata
            full_metadata = {
                'created_at': datetime.now().isoformat(),
                'embedding_shape': embedding.shape,
                'embedding_dtype': str(embedding.dtype),
                **(metadata or {})
            }

            # Update existing speaker metadata if they exist
            if speaker_name in self.speakers:
                full_metadata['updated_at'] = datetime.now().isoformat()
                full_metadata['created_at'] = self.speakers[speaker_name]['metadata'].get('created_at')

            # Save embedding to file
            speaker_file = self._get_speaker_file(speaker_name)
            np.savez_compressed(speaker_file, embedding=embedding)

            # Save metadata
            metadata_file = self._get_metadata_file(speaker_name)
            with open(metadata_file, 'w') as f:
                json.dump(full_metadata, f, indent=2)

            # Update in-memory database
            self.speakers[speaker_name] = {
                'embedding': embedding.copy(),
                'metadata': full_metadata,
                'loaded_from': str(speaker_file)
            }

            logger.info("speaker_added", name=speaker_name, embedding_shape=embedding.shape)
            return True

        except Exception as e:
            logger.error("failed_to_add_speaker", name=speaker_name, error=str(e))
            return False

    def get_speaker(self, speaker_name: str) -> Optional[Dict]:
        """Get a speaker's data."""
        return self.speakers.get(speaker_name)

    def get_speaker_embedding(self, speaker_name: str) -> Optional[np.ndarray]:
        """Get a speaker's embedding."""
        speaker_data = self.get_speaker(speaker_name)
        return speaker_data['embedding'] if speaker_data else None

    def list_speakers(self) -> List[str]:
        """List all known speakers."""
        return list(self.speakers.keys())

    def remove_speaker(self, speaker_name: str) -> bool:
        """Remove a speaker from the database."""
        if speaker_name not in self.speakers:
            return False

        try:
            # Remove files
            speaker_file = self._get_speaker_file(speaker_name)
            metadata_file = self._get_metadata_file(speaker_name)

            if speaker_file.exists():
                speaker_file.unlink()
            if metadata_file.exists():
                metadata_file.unlink()

            # Remove from memory
            del self.speakers[speaker_name]

            logger.info("speaker_removed", name=speaker_name)
            return True

        except Exception as e:
            logger.error("failed_to_remove_speaker", name=speaker_name, error=str(e))
            return False

    def get_all_embeddings(self) -> Dict[str, np.ndarray]:
        """Get all speaker embeddings."""
        return {name: data['embedding'] for name, data in self.speakers.items()}

    def find_similar_speakers(self, query_embedding: np.ndarray, threshold: float = 0.75) -> List[Tuple[str, float]]:
        """Find speakers similar to the query embedding."""
        if not self.speakers:
            return []

        similarities = []

        for speaker_name, speaker_data in self.speakers.items():
            known_embedding = speaker_data['embedding']

            # Calculate cosine similarity
            similarity = self._cosine_similarity(query_embedding, known_embedding)

            if similarity >= threshold:
                similarities.append((speaker_name, similarity))

        # Sort by similarity (highest first)
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings."""
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def get_database_stats(self) -> Dict:
        """Get database statistics."""
        if not self.speakers:
            return {
                'total_speakers': 0,
                'database_path': str(self.database_path)
            }

        embeddings = [data['embedding'] for data in self.speakers.values()]
        embedding_shapes = [emb.shape for emb in embeddings]

        return {
            'total_speakers': len(self.speakers),
            'database_path': str(self.database_path),
            'speakers': list(self.speakers.keys()),
            'embedding_shapes': embedding_shapes,
            'database_size_mb': sum(
                file.stat().st_size for file in self.database_path.glob("*")
            ) / (1024 * 1024)
        }

    def backup_database(self, backup_path: Optional[Path] = None) -> Path:
        """Create a backup of the speaker database."""
        if backup_path is None:
            backup_path = Path("data/backups/speakers_backup.json")

        backup_path.parent.mkdir(parents=True, exist_ok=True)

        # Create backup data
        backup_data = {
            'created_at': datetime.now().isoformat(),
            'speakers': {}
        }

        for speaker_name, speaker_data in self.speakers.items():
            backup_data['speakers'][speaker_name] = {
                'metadata': speaker_data['metadata'],
                'embedding_shape': speaker_data['embedding'].shape,
                'embedding_file': str(self._get_speaker_file(speaker_name))
            }

        # Save backup metadata
        with open(backup_path, 'w') as f:
            json.dump(backup_data, f, indent=2)

        logger.info("database_backed_up", backup_path=str(backup_path))
        return backup_path