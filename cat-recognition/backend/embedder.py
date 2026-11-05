"""128-dim face embedding via ResNet18 backbone."""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision.models import ResNet18_Weights, resnet18

DIM = 128

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
_backbone: nn.Module | None = None
_transform = None
_projector: nn.Linear | None = None


def _init() -> None:
    global _backbone, _transform, _projector
    weights = ResNet18_Weights.DEFAULT
    _transform = weights.transforms()
    backbone = resnet18(weights=weights)
    backbone.fc = nn.Identity()
    backbone.eval()
    _backbone = backbone.to(device)

    torch.manual_seed(42)
    _projector = nn.Linear(512, DIM, bias=False)
    nn.init.orthogonal_(_projector.weight)
    _projector.eval().to(device)


def compute_embedding(image: Image.Image) -> list[float]:
    if _backbone is None:
        _init()

    with torch.no_grad():
        tensor = _transform(image).unsqueeze(0).to(device)
        features = _backbone(tensor)
        vec = _projector(features).squeeze(0).cpu().numpy()

    vec = vec.astype(np.float32)
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec /= norm
    return vec.tolist()
