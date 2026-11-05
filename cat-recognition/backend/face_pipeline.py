"""Detect, align, and embed a cat face from an image."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image

from embedder import compute_embedding

ALIGN_SIZE = 224


def _align_fallback(image: Image.Image) -> Image.Image:
    w, h = image.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    cropped = image.crop((left, top, left + side, top + side))
    return cropped.resize((ALIGN_SIZE, ALIGN_SIZE), Image.Resampling.LANCZOS)


def prepare_face_image(image_bytes: bytes) -> tuple[Image.Image, Image.Image, list[float]]:
    """
    Returns (original RGB image, aligned face image, 128-d embedding).
  """
    original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    aligned = _align_fallback(original)

    try:
        from detector import align_face, detect_cat_face

        faces = detect_cat_face(original)
        if faces:
            aligned = align_face(original, faces[0]["landmarks"])
    except Exception:
        pass

    embedding = compute_embedding(aligned)
    return original, aligned, embedding


def distance_to_confidence(distance: float) -> float:
    """Map L2 distance on unit vectors to 0–100 confidence."""
    return float(max(0.0, min(100.0, 100.0 * np.exp(-2.0 * distance))))
