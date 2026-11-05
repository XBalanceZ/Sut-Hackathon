"""FAISS-based cat face embedding search (128-dimensional vectors)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence

import faiss
import numpy as np

DIM = 128
DEFAULT_INDEX_PATH = Path("data/cat_face.faiss")


class CatFaceSearcher:
    """128-dim L2 FAISS index with parallel cat_id mapping."""

    def __init__(self, index_path: str | Path | None = None) -> None:
        self.index_path = Path(index_path) if index_path else DEFAULT_INDEX_PATH
        self._meta_path = self._meta_path_for(self.index_path)
        if self.index_path.exists():
            self.load_index(self.index_path)
        else:
            self._create_index()

    @staticmethod
    def _meta_path_for(index_path: Path) -> Path:
        return index_path.with_suffix(".meta.json")

    def _create_index(self) -> None:
        self.index = faiss.IndexFlatL2(DIM)
        self.cat_ids: list[int] = []

    @staticmethod
    def _to_vector(embedding: Sequence[float] | np.ndarray) -> np.ndarray:
        vec = np.asarray(embedding, dtype=np.float32).reshape(1, -1)
        if vec.shape[1] != DIM:
            raise ValueError(f"embedding must be {DIM}-dimensional, got {vec.shape[1]}")
        return vec

    def add_embedding(self, cat_id: int, embedding: Sequence[float] | np.ndarray) -> None:
        """Add one embedding vector and associate it with cat_id."""
        vec = self._to_vector(embedding)
        self.index.add(vec)
        self.cat_ids.append(int(cat_id))

    def search(
        self,
        embedding: Sequence[float] | np.ndarray,
        k: int = 5,
    ) -> list[tuple[int, float]]:
        """
        Find top-k nearest neighbors by L2 distance.

        Returns list of (cat_id, distance), best match first.
        """
        if self.index.ntotal == 0:
            return []

        vec = self._to_vector(embedding)
        k = min(k, self.index.ntotal)
        distances, indices = self.index.search(vec, k)

        results: list[tuple[int, float]] = []
        for idx, dist in zip(indices[0], distances[0]):
            if idx < 0:
                continue
            results.append((self.cat_ids[int(idx)], float(dist)))
        return results

    def save_index(self, path: str | Path | None = None) -> None:
        """Persist FAISS index and cat_id mapping to disk."""
        index_path = Path(path) if path else self.index_path
        meta_path = self._meta_path_for(index_path)
        index_path.parent.mkdir(parents=True, exist_ok=True)

        faiss.write_index(self.index, str(index_path))
        meta_path.write_text(
            json.dumps({"cat_ids": self.cat_ids, "dim": DIM}),
            encoding="utf-8",
        )
        self.index_path = index_path
        self._meta_path = meta_path

    def load_index(self, path: str | Path | None = None) -> None:
        """Load FAISS index and cat_id mapping from disk."""
        index_path = Path(path) if path else self.index_path
        meta_path = self._meta_path_for(index_path)

        if not index_path.exists():
            self.index_path = index_path
            self._meta_path = meta_path
            self._create_index()
            return

        self.index = faiss.read_index(str(index_path))
        if self.index.d != DIM:
            raise ValueError(f"index dimension is {self.index.d}, expected {DIM}")

        if meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            self.cat_ids = [int(x) for x in meta["cat_ids"]]
        else:
            self.cat_ids = []

        if len(self.cat_ids) != self.index.ntotal:
            raise ValueError(
                f"cat_id count ({len(self.cat_ids)}) does not match "
                f"index size ({self.index.ntotal})"
            )

        self.index_path = index_path
        self._meta_path = meta_path

    @property
    def size(self) -> int:
        return self.index.ntotal


_default_searcher: CatFaceSearcher | None = None


def get_searcher(index_path: str | Path | None = None) -> CatFaceSearcher:
    """Return a process-wide CatFaceSearcher (lazy init, auto-load or create)."""
    global _default_searcher
    path = Path(index_path) if index_path else DEFAULT_INDEX_PATH
    if _default_searcher is None or _default_searcher.index_path != path:
        _default_searcher = CatFaceSearcher(path)
    return _default_searcher


def add_embedding(cat_id: int, embedding: Sequence[float] | np.ndarray) -> None:
    get_searcher().add_embedding(cat_id, embedding)


def search(
    embedding: Sequence[float] | np.ndarray,
    k: int = 5,
) -> list[tuple[int, float]]:
    return get_searcher().search(embedding, k=k)


def save_index(path: str | Path | None = None) -> None:
    get_searcher().save_index(path)


def load_index(path: str | Path | None = None) -> None:
    get_searcher().load_index(path)
