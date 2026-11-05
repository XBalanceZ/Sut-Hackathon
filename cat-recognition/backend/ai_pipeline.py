"""AI & Image Processing pipeline for MEOW MATCH.

Components:
- YOLOv5(-Face) for cat face detection/landmarks
- OpenCV for video frame extraction
- Torch/Torchvision for embeddings
- FAISS for K-NN vector search
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import torch
from PIL import Image

from face_pipeline import distance_to_confidence, prepare_face_image
from searcher import get_searcher
from video_utils import BestFrame, extract_best_face_frame

# Required by prompt: prefer Apple Silicon MPS
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")


@dataclass(frozen=True)
class FaceParts:
    """Keypoints for UX overlays: ears/eyes/nose (if available)."""

    left_ear: tuple[float, float] | None = None
    right_ear: tuple[float, float] | None = None
    left_eye: tuple[float, float] | None = None
    right_eye: tuple[float, float] | None = None
    nose: tuple[float, float] | None = None


def load_yolov5_model() -> Any:
    """
    YOLOv5 model is loaded lazily inside `detector.detect_cat_face`.
    This function exists to make the loading step explicit for callers.
    """
    from detector import _load_model  # noqa: PLC0415

    model, _ = _load_model()
    return model


def detect_cat_face_parts(image: Image.Image) -> FaceParts | None:
    """Detect face and return (ears/eyes/nose) keypoints if found."""
    from detector import detect_cat_face  # noqa: PLC0415

    faces = detect_cat_face(image)
    if not faces:
        return None
    lm = faces[0]["landmarks"]
    return FaceParts(
        left_ear=lm.get("left_ear"),
        right_ear=lm.get("right_ear"),
        left_eye=lm.get("left_eye"),
        right_eye=lm.get("right_eye"),
        nose=lm.get("nose"),
    )


def extract_best_frame_from_video(video_path: str) -> BestFrame:
    """OpenCV frame extraction + best-face selection."""
    return extract_best_face_frame(video_path, max_samples=24)


def image_to_embedding(image_bytes: bytes) -> list[float]:
    """Detect/align/crop then embed to 128-d vector."""
    _, _, embedding = prepare_face_image(image_bytes)
    return embedding


def knn_search_top5(embedding: list[float]) -> list[dict]:
    """Return top-5 matches with confidence %."""
    matches = get_searcher().search(embedding, k=5)
    results: list[dict] = []
    for cat_id, dist in matches:
        results.append(
            {
                "pet_id": int(cat_id),
                "distance": float(dist),
                "confidence": float(distance_to_confidence(dist)),
            }
        )
    return results


def add_embedding_to_index(pet_id: int, embedding: list[float]) -> None:
    """Insert embedding and persist FAISS index."""
    searcher = get_searcher()
    searcher.add_embedding(pet_id, np.asarray(embedding, dtype=np.float32))
    searcher.save_index()

