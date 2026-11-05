"""Video frame extraction utilities (opencv-python-headless)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import cv2
import numpy as np
from PIL import Image


@dataclass(frozen=True)
class BestFrame:
    image: Image.Image
    score: float
    frame_index: int


def _iter_sampled_frames(
    video_path: str,
    *,
    max_samples: int = 24,
) -> Iterable[tuple[int, np.ndarray]]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("ไม่สามารถเปิดไฟล์วิดีโอได้")

    try:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        step = max(1, (total // max_samples) if total else 5)
        idx = 0
        read_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if read_idx % step == 0:
                yield idx, frame
                idx += 1
            read_idx += 1
            if idx >= max_samples:
                break
    finally:
        cap.release()


def _sharpness_score(bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def extract_best_face_frame(
    video_path: str,
    *,
    max_samples: int = 24,
) -> BestFrame:
    """
    Pick the best frame to represent a cat face.

    Heuristic:
    - Prefer frames where YOLOv5-Face detects a face with high confidence.
    - Within detected frames, prefer sharper frames.
    - Fallback: choose the sharpest sampled frame.
    """
    best_detected: BestFrame | None = None
    best_any: BestFrame | None = None

    try:
        from detector import detect_cat_face
    except Exception:
        detect_cat_face = None

    for frame_index, bgr in _iter_sampled_frames(video_path, max_samples=max_samples):
        sharp = _sharpness_score(bgr)
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        pil = Image.fromarray(rgb)

        if best_any is None or sharp > best_any.score:
            best_any = BestFrame(image=pil, score=sharp, frame_index=frame_index)

        if detect_cat_face is None:
            continue

        try:
            faces = detect_cat_face(pil)
        except Exception:
            continue

        if not faces:
            continue

        det_conf = float(faces[0]["confidence"])
        combined = det_conf * 10_000.0 + sharp  # dominate by detection confidence
        if best_detected is None or combined > best_detected.score:
            best_detected = BestFrame(image=pil, score=combined, frame_index=frame_index)

    if best_detected is not None:
        return best_detected
    if best_any is not None:
        return best_any
    raise ValueError("ไม่พบเฟรมในวิดีโอ")

