#!/usr/bin/env python3
"""
ระบบ AI ตรวจจับและค้นหาคู่ใบหน้าแมว (Cat Face Detection & Vector Search System)
รองรับการรันบนชิป Apple Silicon M4 ด้วย MPS (Metal Performance Shaders)
"""

from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path
from typing import Any, TypedDict, Sequence

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
import torchvision.models as models
from torchvision.models import resnet18, ResNet18_Weights
import faiss

# -------------------------------------------------------------------------
# 1. Device Configuration (MPS for Apple Silicon M4, fallback to CPU)
# -------------------------------------------------------------------------
device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
print(f"[System] Using device: {device}")

# -------------------------------------------------------------------------
# YOLOv5-Face Setup Configuration
# -------------------------------------------------------------------------
_YOLOV5S_FACE_GDRIVE_ID = "1zxaHeLDyID9YU4-hqK7KNepXIwbTkRIO"
_HUB_REPO = "deepcam-cn/yolov5-face"
IMG_SIZE = 640
CONF_THRES = 0.5
IOU_THRES = 0.4
ALIGN_SIZE = 224
DIM = 128

# Reference coordinates for aligned 224x224 face (left eye, right eye, nose)
_REF_LEFT_EYE = np.array([56.0, 88.0], dtype=np.float32)
_REF_RIGHT_EYE = np.array([168.0, 88.0], dtype=np.float32)
_REF_NOSE = np.array([112.0, 152.0], dtype=np.float32)


class BBox(TypedDict):
    x1: float
    y1: float
    x2: float
    y2: float


class Landmarks(TypedDict):
    left_eye: tuple[float, float]
    right_eye: tuple[float, float]
    nose: tuple[float, float]
    left_ear: tuple[float, float]
    right_ear: tuple[float, float]


class FaceDetection(TypedDict):
    bbox: BBox
    confidence: float
    landmarks: Landmarks


# -------------------------------------------------------------------------
# 2. YOLOv5 Face Landmark Detector
# -------------------------------------------------------------------------
class CatFaceDetector:
    def __init__(self, weights_path: str | Path | None = None):
        self.device = device
        self.weights_path = self._find_or_download_weights(weights_path)
        self.model = self._load_yolov5_model()
        self._import_yolo_utils()

    def _find_or_download_weights(self, path: str | Path | None) -> Path:
        """Find weights locally or download if not present."""
        possible_paths = [
            Path("cat-recognition/backend/models/yolov5s-face.pt"),
            Path("backend/models/yolov5s-face.pt"),
            Path("models/yolov5s-face.pt"),
            Path("weights/yolov5s-face.pt"),
            Path("./yolov5s-face.pt"),
        ]
        if path:
            possible_paths.insert(0, Path(path))

        for p in possible_paths:
            if p.exists() and p.stat().st_size > 1_000_000:
                print(f"[Detector] Found local weights at: {p}")
                return p.resolve()

        # Download if not found
        dest = Path("models/yolov5s-face.pt")
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"[Detector] Weights not found. Downloading to {dest}...")
        url = f"https://drive.google.com/uc?id={_YOLOV5S_FACE_GDRIVE_ID}"
        try:
            import gdown
            gdown.download(url, str(dest), quiet=False)
        except Exception:
            print("[Detector] gdown import failed or error, attempting torch download...")
            torch.hub.download_url_to_file(url, str(dest), progress=True)

        if not dest.exists() or dest.stat().st_size < 1_000_000:
            raise RuntimeError(
                f"Failed to obtain YOLOv5-Face weights. Place yolov5s-face.pt at {dest} manually."
            )
        return dest.resolve()

    def _ensure_hub_on_path(self) -> Path:
        hub_dir = Path(torch.hub.get_dir()) / "deepcam-cn_yolov5-face_master"
        hub_str = str(hub_dir)
        if hub_str not in sys.path:
            sys.path.insert(0, hub_str)
        return hub_dir

    def _import_yolo_utils(self) -> None:
        self._ensure_hub_on_path()
        try:
            from utils.datasets import letterbox
            from utils.general import check_img_size, non_max_suppression_face, scale_coords
            self.letterbox = letterbox
            self.check_img_size = check_img_size
            self.non_max_suppression_face = non_max_suppression_face
            self.scale_coords = scale_coords
        except ImportError as exc:
            raise ImportError(
                "Could not import YOLOv5 utility functions. Ensure deepcam-cn/yolov5-face is in torch hub."
            ) from exc

    def _load_yolov5_model(self) -> Any:
        print("[Detector] Loading YOLOv5-Face model...")
        
        # Monkeypatch torch.load to force map_location='cpu' because YOLOv5-Face's hubconf.py
        # does not pass it, causing runtime errors on CPU/MPS machines.
        original_load = torch.load
        def patched_load(f, *args, **kwargs):
            if 'map_location' not in kwargs:
                kwargs['map_location'] = 'cpu'
            return original_load(f, *args, **kwargs)
        
        torch.load = patched_load
        try:
            model = torch.hub.load(
                _HUB_REPO,
                "custom",
                str(self.weights_path),  # Pass as positional argument to support both 'path' and 'path_or_model' signatures
                source="github",
                trust_repo=True,
                autoshape=False,
            )
        finally:
            torch.load = original_load

        model.to(self.device).eval()
        return model

    def _scale_coords_landmarks(
        self, img1_shape: tuple[int, ...], coords: torch.Tensor, img0_shape: tuple[int, ...]
    ) -> torch.Tensor:
        """Rescale landmark coordinates to original image sizes."""
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

    def detect(self, image: Image.Image) -> list[FaceDetection]:
        """Detect cat faces and return list of detections with coordinates and landmarks."""
        img_rgb = np.array(image.convert("RGB"))
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        h0, w0 = img_bgr.shape[:2]

        r = IMG_SIZE / max(h0, w0)
        if r != 1:
            interp = cv2.INTER_AREA if r < 1 else cv2.INTER_LINEAR
            img_resized = cv2.resize(img_bgr, (int(w0 * r), int(h0 * r)), interpolation=interp)
        else:
            img_resized = img_bgr

        stride = int(self.model.stride.max())
        imgsz = self.check_img_size(IMG_SIZE, s=stride)
        img_in = self.letterbox(img_resized, new_shape=imgsz)[0]
        
        img_tensor = img_in.transpose(2, 0, 1).copy()
        img_tensor = torch.from_numpy(img_tensor).to(self.device)
        img_tensor = img_tensor.float() / 255.0
        if img_tensor.ndimension() == 3:
            img_tensor = img_tensor.unsqueeze(0)

        with torch.no_grad():
            pred = self.model(img_tensor)[0]

        pred = self.non_max_suppression_face(pred, CONF_THRES, IOU_THRES)
        detections: list[FaceDetection] = []

        for det in pred:
            if det is None or len(det) == 0:
                continue

            det = det.clone()
            det[:, :4] = self.scale_coords(img_tensor.shape[2:], det[:, :4], img_bgr.shape).round()
            det[:, 5:15] = self._scale_coords_landmarks(
                img_tensor.shape[2:], det[:, 5:15], img_bgr.shape
            ).round()

            for row in det:
                xyxy = row[:4].tolist()
                conf = float(row[4].item())
                lm = row[5:15].tolist()
                detections.append(
                    FaceDetection(
                        bbox=BBox(x1=xyxy[0], y1=xyxy[1], x2=xyxy[2], y2=xyxy[3]),
                        confidence=conf,
                        landmarks=Landmarks(
                            left_eye=(float(lm[0]), float(lm[1])),
                            right_eye=(float(lm[2]), float(lm[3])),
                            nose=(float(lm[4]), float(lm[5])),
                            left_ear=(float(lm[6]), float(lm[7])),
                            right_ear=(float(lm[8]), float(lm[9])),
                        ),
                    )
                )

        detections.sort(key=lambda d: d["confidence"], reverse=True)
        return detections

    def align_face_image(self, image: Image.Image, landmarks: Landmarks) -> Image.Image:
        """Affine-align the face using eyes and nose, then resize to 224x224."""
        src = np.array(
            [landmarks["left_eye"], landmarks["right_eye"], landmarks["nose"]],
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


# -------------------------------------------------------------------------
# 3. Video Frame Extraction & focus/sharpness checking with OpenCV
# -------------------------------------------------------------------------
def estimate_sharpness(frame_bgr: np.ndarray, bbox: BBox | None = None) -> float:
    """Calculate focus sharpness using Laplacian variance (higher is sharper)."""
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    if bbox:
        # Crop to the face area to calculate local sharpness
        x1, y1 = max(0, int(bbox["x1"])), max(0, int(bbox["y1"]))
        x2, y2 = min(gray.shape[1], int(bbox["x2"])), min(gray.shape[0], int(bbox["y2"]))
        if x2 > x1 and y2 > y1:
            gray = gray[y1:y2, x1:x2]
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def extract_clearest_cat_face(
    video_path: str | Path,
    detector: CatFaceDetector,
    sample_rate: int = 5,
) -> tuple[Image.Image, dict] | tuple[None, None]:
    """
    Extract frames from a video, select the frame with the clearest cat face,
    and return the cropped & aligned Pillow face image along with detection info.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[Error] Cannot open video: {video_path}")
        return None, None

    best_frame_rgb = None
    best_detection = None
    best_score = -1.0
    frame_count = 0
    analyzed_count = 0

    print(f"[Video] Analyzing video {video_path} (sampling every {sample_rate} frames)...")

    while True:
        ret, frame_bgr = cap.read()
        if not ret:
            break

        if frame_count % sample_rate == 0:
            analyzed_count += 1
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(frame_rgb)
            
            # Detect faces in frame
            detections = detector.detect(pil_image)
            if detections:
                det = detections[0] # Highest confidence detection
                conf = det["confidence"]
                
                # Estimate sharpness within the bounding box
                sharpness = estimate_sharpness(frame_bgr, det["bbox"])
                
                # Combined score: prioritize confidence and clear features
                # Sharpness acts as a tiebreaker for high-confidence detections
                score = conf * 1000.0 + sharpness

                if score > best_score:
                    best_score = score
                    best_frame_rgb = frame_rgb.copy()
                    best_detection = det
                    print(f"  Frame {frame_count}: Face found! Conf={conf:.3f}, Sharpness={sharpness:.1f}, Score={score:.1f} (New Best)")

        frame_count += 1

    cap.release()
    print(f"[Video] Finished. Analyzed {analyzed_count}/{frame_count} frames.")

    if best_frame_rgb is None:
        print("[Video] No cat face detected in the video.")
        return None, None

    # Process and crop the clearest face
    best_pil_image = Image.fromarray(best_frame_rgb)
    aligned_face = detector.align_face_image(best_pil_image, best_detection["landmarks"])
    
    return aligned_face, {
        "bbox": best_detection["bbox"],
        "confidence": best_detection["confidence"],
        "landmarks": best_detection["landmarks"],
        "score": best_score
    }


# -------------------------------------------------------------------------
# 4. torchvision Feature Extraction
# -------------------------------------------------------------------------
class CatFaceEmbedder:
    def __init__(self):
        self.device = device
        weights = ResNet18_Weights.DEFAULT
        self.transform = weights.transforms()
        
        # Load backbone
        backbone = resnet18(weights=weights)
        backbone.fc = nn.Identity() # Remove final fc classification layer (outputs 512-d features)
        backbone.eval()
        self.backbone = backbone.to(self.device)

        # 128-dimensional orthogonal projection to match backend requirements
        torch.manual_seed(42)
        self.projector = nn.Linear(512, DIM, bias=False)
        nn.init.orthogonal_(self.projector.weight)
        self.projector.eval().to(self.device)

    def extract(self, image: Image.Image) -> list[float]:
        """Convert PIL image to 128-dimensional normalized embedding."""
        with torch.no_grad():
            tensor = self.transform(image).unsqueeze(0).to(self.device)
            features = self.backbone(tensor)
            projected = self.projector(features).squeeze(0)
            
            # L2 Normalization
            norm = torch.norm(projected)
            if norm > 0:
                projected = projected / norm
            
            return projected.cpu().numpy().astype(np.float32).tolist()


# -------------------------------------------------------------------------
# 5. FAISS-CPU Index and K-NN Search
# -------------------------------------------------------------------------
class CatFaceSearchIndex:
    def __init__(self, dimension: int = DIM):
        self.dim = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.cat_metadata: list[dict] = []

    def add_cat(self, cat_id: int, name: str, embedding: list[float], additional_info: dict | None = None) -> None:
        """Add a cat embedding and its metadata to the index."""
        vec = np.array([embedding], dtype=np.float32)
        self.index.add(vec)
        
        meta = {
            "cat_id": cat_id,
            "name": name,
            **(additional_info or {})
        }
        self.cat_metadata.append(meta)

    def search(self, query_embedding: list[float], k: int = 5) -> list[dict]:
        """Perform K-NN search and return top-k matches with similarity confidence score."""
        if self.index.ntotal == 0:
            return []

        q_vec = np.array([query_embedding], dtype=np.float32)
        k = min(k, self.index.ntotal)
        distances, indices = self.index.search(q_vec, k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.cat_metadata):
                continue
            
            meta = self.cat_metadata[idx]
            
            # Map L2 distance to confidence score (percentage similarity)
            # For normalized vectors, L2 distance is between 0 and 2.
            # Using exponential mapping matches the project mapping: confidence = 100 * exp(-2 * dist)
            confidence = float(max(0.0, min(100.0, 100.0 * np.exp(-2.0 * dist))))
            
            results.append({
                "cat_id": meta["cat_id"],
                "name": meta["name"],
                "distance": float(dist),
                "confidence_score": round(confidence, 2),
                "meta": meta
            })
        return results


# -------------------------------------------------------------------------
# 6. Verification and Testing Entrypoint
# -------------------------------------------------------------------------
def create_mock_video(path: str | Path, duration_sec: int = 3, fps: int = 15) -> None:
    """Create a mock video with a moving face shape and varying focus for testing."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(path), fourcc, fps, (640, 480))
    
    num_frames = duration_sec * fps
    print(f"[Test] Generating synthetic video ({num_frames} frames) to {path}...")

    for i in range(num_frames):
        # Create dark background frame
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (60, 60, 60) # dark grey

        # Move the face slightly across frames
        center_x = 320 + int(50 * np.sin(2 * np.pi * i / num_frames))
        center_y = 240 + int(30 * np.cos(2 * np.pi * i / num_frames))

        # Draw face base
        cv2.circle(frame, (center_x, center_y), 90, (220, 220, 220), -1)
        # Ears
        cv2.fillConvexPoly(frame, np.array([
            [center_x - 80, center_y - 40],
            [center_x - 90, center_y - 120],
            [center_x - 30, center_y - 80]
        ]), (180, 180, 180))
        cv2.fillConvexPoly(frame, np.array([
            [center_x + 80, center_y - 40],
            [center_x + 90, center_y - 120],
            [center_x + 30, center_y - 80]
        ]), (180, 180, 180))
        # Eyes
        cv2.circle(frame, (center_x - 35, center_y - 20), 12, (20, 20, 20), -1)
        cv2.circle(frame, (center_x + 35, center_y - 20), 12, (20, 20, 20), -1)
        # Nose
        cv2.circle(frame, (center_x, center_y + 15), 10, (100, 100, 255), -1)

        # Vary focus blur: clearest in the middle frames (frame 22)
        dist_from_mid = abs(i - num_frames // 2)
        blur_val = dist_from_mid * 4 + 1
        if blur_val > 1:
            if blur_val % 2 == 0:
                blur_val += 1
            frame = cv2.GaussianBlur(frame, (blur_val, blur_val), 0)

        # Write info text
        cv2.putText(
            frame, 
            f"Test Frame {i+1}/{num_frames} Blur={blur_val}", 
            (20, 40), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.8, 
            (0, 255, 0), 
            2
        )
        out.write(frame)

    out.release()
    print("[Test] Mock video created.")


if __name__ == "__main__":
    print("=" * 70)
    print("ระบบทดสอบ AI Cat Face Detection & Vector Search (Apple Silicon M4)")
    print("=" * 70)

    # 1. Initialize detector & embedder
    detector = CatFaceDetector()
    embedder = CatFaceEmbedder()
    search_index = CatFaceSearchIndex()

    # 2. Build mock database (index 6 cats with ResNet embeddings)
    print("\n[Step 1] Building Mock Cat Face Search Database...")
    mock_cats = [
        {"id": 101, "name": "Som-O (ส้มโอ)", "path": "cat-recognition/backend/uploads/cat_1_0d27352426.jpg"},
        {"id": 102, "name": "Kati (กะทิ)", "path": "cat-recognition/backend/uploads/cat_2_23cd5465c8.jpg"},
        {"id": 103, "name": "Chao-Kway (เฉาก๊วย)", "path": "cat-recognition/backend/uploads/cat_3_0e77d68677.jpg"},
        {"id": 104, "name": "Mali (มะลิ)", "path": None},
        {"id": 105, "name": "Tiger (ไทเกอร์)", "path": None},
        {"id": 106, "name": "Siri (สิริ)", "path": None},
    ]

    for cat in mock_cats:
        # If an image exists, extract features, otherwise generate a random vector
        if cat["path"] and Path(cat["path"]).exists():
            print(f"  Indexing real cat: {cat['name']} from {cat['path']}")
            img = Image.open(cat["path"])
            # Run detector to align and crop
            dets = detector.detect(img)
            if dets:
                aligned = detector.align_face_image(img, dets[0]["landmarks"])
                emb = embedder.extract(aligned)
            else:
                aligned = img.resize((224, 224))
                emb = embedder.extract(aligned)
        else:
            print(f"  Indexing mock cat: {cat['name']} (Synthetic Vector)")
            # Generate dummy normalized vector
            dummy_vec = np.random.randn(DIM).astype(np.float32)
            dummy_vec /= np.linalg.norm(dummy_vec)
            emb = dummy_vec.tolist()

        search_index.add_cat(cat["id"], cat["name"], emb)

    # 3. Create and process mock video
    mock_video_path = Path("data/test_cat_video.mp4")
    create_mock_video(mock_video_path)

    print("\n[Step 2] Processing Video & Frame Extraction...")
    clearest_face, detection_info = extract_clearest_cat_face(
        mock_video_path, detector, sample_rate=3
    )

    if clearest_face is not None:
        print(f"\n[Step 3] Face extracted from video successfully!")
        print(f"  Confidence: {detection_info['confidence']:.4f}")
        print(f"  Landmarks: {detection_info['landmarks']}")
        
        # Save face image
        output_face_path = Path("data/extracted_face.jpg")
        output_face_path.parent.mkdir(parents=True, exist_ok=True)
        clearest_face.save(output_face_path)
        print(f"  Saved clearest face to: {output_face_path}")

        # 4. Extract embedding from extracted face
        print("\n[Step 4] Extracting Vector Embedding using torchvision model...")
        query_embedding = embedder.extract(clearest_face)
        print(f"  Vector size: {len(query_embedding)} dimensions (Normalized)")

        # 5. Search Top 5 in FAISS
        print("\n[Step 5] Performing K-NN Search in FAISS index (Top 5 matches)...")
        results = search_index.search(query_embedding, k=5)

        for rank, res in enumerate(results, 1):
            print(f"  Rank {rank}: Cat ID={res['cat_id']}, Name={res['name']}, "
                  f"L2 Distance={res['distance']:.4f}, Confidence Score={res['confidence_score']}%")
    else:
        print("\n[Error] Could not extract face from mock video. (Synthetic shapes are not real cat faces)")
        print("  Generating fallback search using index image...")
        # Search with the first cat in database to verify search pipeline works
        if Path(mock_cats[0]["path"]).exists():
            img = Image.open(mock_cats[0]["path"])
            dets = detector.detect(img)
            aligned = detector.align_face_image(img, dets[0]["landmarks"])
            query_embedding = embedder.extract(aligned)
            results = search_index.search(query_embedding, k=5)
            print("\n  [Fallback Results] Top 5 matches for indexing image:")
            for rank, res in enumerate(results, 1):
                print(f"    Rank {rank}: Cat ID={res['cat_id']}, Name={res['name']}, "
                      f"Distance={res['distance']:.4f}, Confidence Score={res['confidence_score']}%")

    # Clean up test files
    if mock_video_path.exists():
        os.remove(mock_video_path)
        print("\n[Test] Cleaned up temporary test video.")
