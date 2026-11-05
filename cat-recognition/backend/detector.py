"""Cat face detection and alignment using YOLOv5-Face (deepcam-cn/yolov5-face)."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, TypedDict

import cv2
import numpy as np
import torch
from PIL import Image

# Pretrained yolov5s face weights (Google Drive ID from project README)
_YOLOV5S_FACE_GDRIVE_ID = "1zxaHeLDyID9YU4-hqK7KNepXIwbTkRIO"
_DEFAULT_WEIGHTS = (
    Path(os.environ.get("MODELS_DIR", Path(__file__).resolve().parent / "models"))
    / "yolov5s-face.pt"
)
_HUB_REPO = "deepcam-cn/yolov5-face"

IMG_SIZE = 640
CONF_THRES = 0.6
IOU_THRES = 0.5
ALIGN_SIZE = 224

# Template landmarks for 224×224 aligned cat face (eyes + nose)
_REF_LEFT_EYE = np.array([56.0, 88.0], dtype=np.float32)
_REF_RIGHT_EYE = np.array([168.0, 88.0], dtype=np.float32)
_REF_NOSE = np.array([112.0, 152.0], dtype=np.float32)


class BBox(TypedDict):
    x1: float
    y1: float
    x2: float
    y2: float


class Landmarks(TypedDict):
    """Five keypoints: eyes, nose, and ear proxies (from YOLOv5-Face mouth corners)."""

    left_eye: tuple[float, float]
    right_eye: tuple[float, float]
    nose: tuple[float, float]
    left_ear: tuple[float, float]
    right_ear: tuple[float, float]


class FaceDetection(TypedDict):
    bbox: BBox
    confidence: float
    landmarks: Landmarks


_model: Any | None = None
_device: torch.device | None = None
_yolo_utils: tuple[Any, ...] | None = None


def get_device() -> torch.device:
    """Prefer Apple Silicon MPS, then CUDA, then CPU."""
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _hub_dir() -> Path:
    return Path(torch.hub.get_dir()) / "deepcam-cn_yolov5-face_master"


def _ensure_hub_on_path() -> Path:
    hub_dir = _hub_dir()
    hub_str = str(hub_dir)
    if hub_str not in sys.path:
        sys.path.insert(0, hub_str)
    return hub_dir


def _download_weights(dest: Path) -> None:
    """Download yolov5s-face.pt from Google Drive if missing."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return

    try:
        import gdown
    except ImportError:
        gdown = None

    url = f"https://drive.google.com/uc?id={_YOLOV5S_FACE_GDRIVE_ID}"
    if gdown is not None:
        gdown.download(url, str(dest), quiet=False)
    else:
        torch.hub.download_url_to_file(url, str(dest), progress=True)

    if not dest.exists() or dest.stat().st_size < 1_000_000:
        raise RuntimeError(
            f"Failed to download YOLOv5-Face weights to {dest}. "
            "Place yolov5s-face.pt manually or install gdown: pip install gdown"
        )


def _weights_path() -> Path:
    env_path = os.environ.get("YOLOV5_FACE_WEIGHTS")
    path = Path(env_path) if env_path else _DEFAULT_WEIGHTS
    _download_weights(path)
    return path


def _import_yolo_utils() -> tuple[Any, ...]:
    global _yolo_utils
    if _yolo_utils is not None:
        return _yolo_utils

    _ensure_hub_on_path()
    from utils.datasets import letterbox
    from utils.general import check_img_size, non_max_suppression_face, scale_coords

    _yolo_utils = (letterbox, check_img_size, non_max_suppression_face, scale_coords)
    return _yolo_utils


def _load_model() -> tuple[Any, torch.device]:
    global _model, _device

    if _model is not None and _device is not None:
        return _model, _device

    _device = get_device()
    weights = _weights_path()

    # Clone repo + load face checkpoint (autoshape=False — we run NMS manually)
    _model = torch.hub.load(
        _HUB_REPO,
        "custom",
        str(weights),  # Pass as positional argument to support both 'path' and 'path_or_model' signatures
        source="github",
        trust_repo=True,
        autoshape=False,
    )
    _import_yolo_utils()
    _model.to(_device).eval()
    return _model, _device


def _scale_coords_landmarks(
    img1_shape: tuple[int, ...],
    coords: torch.Tensor,
    img0_shape: tuple[int, ...],
) -> torch.Tensor:
    """Rescale landmark coords from letterboxed input to original image size."""
    gain = min(img1_shape[0] / img0_shape[0], img1_shape[1] / img0_shape[1])
    pad_x = (img1_shape[1] - img0_shape[1] * gain) / 2
    pad_y = (img1_shape[0] - img0_shape[0] * gain) / 2

    coords = coords.clone()
    coords[:, [0, 2, 4, 6, 8]] -= pad_x
    coords[:, [1, 3, 5, 7, 9]] -= pad_y
    coords[:, :10] /= gain
    coords[:, 0].clamp_(0, img0_shape[1])
    coords[:, 1].clamp_(0, img0_shape[0])
    coords[:, 2].clamp_(0, img0_shape[1])
    coords[:, 3].clamp_(0, img0_shape[0])
    coords[:, 4].clamp_(0, img0_shape[1])
    coords[:, 5].clamp_(0, img0_shape[0])
    coords[:, 6].clamp_(0, img0_shape[1])
    coords[:, 7].clamp_(0, img0_shape[0])
    coords[:, 8].clamp_(0, img0_shape[1])
    coords[:, 9].clamp_(0, img0_shape[0])
    return coords


def _landmarks_from_tensor(lm: list[float]) -> Landmarks:
    """Map YOLOv5-Face 5-point output to cat-oriented landmark names."""
    return Landmarks(
        left_eye=(float(lm[0]), float(lm[1])),
        right_eye=(float(lm[2]), float(lm[3])),
        nose=(float(lm[4]), float(lm[5])),
        # Model outputs mouth corners; used as ear-region proxies for cat alignment.
        left_ear=(float(lm[6]), float(lm[7])),
        right_ear=(float(lm[8]), float(lm[9])),
    )


def detect_cat_face(image: Image.Image) -> list[FaceDetection]:
    """
    Detect cat faces in a PIL image.

    Returns a list of detections (highest confidence first), each with bbox,
    confidence, and landmarks (left/right eye, nose, left/right ear).
    """
    model, device = _load_model()
    letterbox, check_img_size, non_max_suppression_face, scale_coords = _import_yolo_utils()

    img_rgb = np.array(image.convert("RGB"))
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    h0, w0 = img_bgr.shape[:2]

    r = IMG_SIZE / max(h0, w0)
    if r != 1:
        interp = cv2.INTER_AREA if r < 1 else cv2.INTER_LINEAR
        img_resized = cv2.resize(
            img_bgr,
            (int(w0 * r), int(h0 * r)),
            interpolation=interp,
        )
    else:
        img_resized = img_bgr

    imgsz = check_img_size(IMG_SIZE, s=int(model.stride.max()))
    img_in = letterbox(img_resized, new_shape=imgsz)[0]
    img_tensor = img_in.transpose(2, 0, 1).copy()
    img_tensor = torch.from_numpy(img_tensor).to(device)
    img_tensor = img_tensor.float() / 255.0
    if img_tensor.ndimension() == 3:
        img_tensor = img_tensor.unsqueeze(0)

    with torch.no_grad():
        pred = model(img_tensor)[0]

    pred = non_max_suppression_face(pred, CONF_THRES, IOU_THRES)
    detections: list[FaceDetection] = []

    for det in pred:
        if det is None or len(det) == 0:
            continue

        det = det.clone()
        det[:, :4] = scale_coords(img_tensor.shape[2:], det[:, :4], img_bgr.shape).round()
        det[:, 5:15] = _scale_coords_landmarks(
            img_tensor.shape[2:],
            det[:, 5:15],
            img_bgr.shape,
        ).round()

        for row in det:
            xyxy = row[:4].tolist()
            conf = float(row[4].item())
            lm = row[5:15].tolist()
            detections.append(
                FaceDetection(
                    bbox=BBox(x1=xyxy[0], y1=xyxy[1], x2=xyxy[2], y2=xyxy[3]),
                    confidence=conf,
                    landmarks=_landmarks_from_tensor(lm),
                )
            )

    detections.sort(key=lambda d: d["confidence"], reverse=True)
    return detections


def align_face(image: Image.Image, landmarks: Landmarks) -> Image.Image:
    """
    Affine-align the face using eyes and nose, then resize to 224×224.
    """
    src = np.array(
        [
            landmarks["left_eye"],
            landmarks["right_eye"],
            landmarks["nose"],
        ],
        dtype=np.float32,
    )
    dst = np.stack([_REF_LEFT_EYE, _REF_RIGHT_EYE, _REF_NOSE])

    matrix = cv2.getAffineTransform(src, dst)
    img_bgr = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    aligned = cv2.warpAffine(
        img_bgr,
        matrix,
        (ALIGN_SIZE, ALIGN_SIZE),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )
    aligned_rgb = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)
    return Image.fromarray(aligned_rgb)
