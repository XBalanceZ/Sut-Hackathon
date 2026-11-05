"""Async file storage helpers (aiofiles)."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import aiofiles

_BACKEND_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", _BACKEND_DIR / "uploads"))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


async def save_upload_bytes(*, content: bytes, prefix: str, ext: str = ".jpg") -> str:
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}{ext}"
    path = UPLOADS_DIR / filename
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)
    return f"/uploads/{filename}"

