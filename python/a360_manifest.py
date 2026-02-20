#!/usr/bin/env python3
"""
a360_manifest.py

ML-oriented per-subject manifest builder.

Output (default): <timeline_dir>/subject_manifest.json

Includes:
- subjectId
- timelineFolderAbs
- timelineFolderRel (if projectRoot provided)
- expected ages list + per-age file records
- timelineComplete boolean
- notes + structured meta from subject_notes.json (if present)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, List


DEFAULT_MANIFEST_NAME = "subject_manifest.json"
DEFAULT_NOTES_JSON = "subject_notes.json"
DEFAULT_AGES = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _sha256_file(p: Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        while True:
            b = f.read(chunk_size)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def _safe_relpath(path: Path, root: Optional[Path]) -> Optional[str]:
    if not root:
        return None
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except Exception:
        return None


def _load_notes(subject_root: Path) -> Dict[str, Any]:
    # Prefer subject root; fallback to timeline dir if someone stores there.
    candidates = [
        subject_root / DEFAULT_NOTES_JSON,
        (subject_root / "TimelineA") / DEFAULT_NOTES_JSON,
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                return {}
    return {}


def generate_subject_manifest(subject_id: str, timeline_dir: Path, project_root: Optional[Path] = None, ages: Optional[List[int]] = None) -> Dict[str, Any]:
    timeline_dir = timeline_dir.expanduser().resolve()
    subject_root = timeline_dir.parent

    if ages is None:
        ages = DEFAULT_AGES

    notes_obj = _load_notes(subject_root)
    notes_text = notes_obj.get("notes") if isinstance(notes_obj, dict) else None
    notes_meta = notes_obj.get("meta") if isinstance(notes_obj, dict) else None

    images: Dict[str, Any] = {}
    missing: List[str] = []

    for age in ages:
        key = f"A{age}"
        filename = f"{subject_id}_A{age}.png"
        p = timeline_dir / filename
        rec: Dict[str, Any] = {
            "age": age,
            "filename": filename,
            "exists": p.exists(),
            "abs": str(p),
            "rel": _safe_relpath(p, project_root),
        }
        if p.exists():
            try:
                stat = p.stat()
                rec["bytes"] = stat.st_size
                rec["mtimeUtc"] = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(timespec="seconds")
                rec["sha256"] = _sha256_file(p)
            except Exception as e:
                rec["error"] = str(e)
        else:
            missing.append(key)

        images[key] = rec

    timeline_complete = len(missing) == 0

    manifest: Dict[str, Any] = {
        "schema": "a360.subject_manifest.v1",
        "generatedUtc": _utc_now_iso(),
        "subjectId": subject_id,
        "timelineFolderAbs": str(timeline_dir),
        "timelineFolderRel": _safe_relpath(timeline_dir, project_root),
        "expectedAges": ages,
        "timelineComplete": timeline_complete,
        "missing": missing,
        "notes": notes_text,
        "notesMeta": notes_meta,
        "images": images,
    }
    return manifest


def write_subject_manifest(subject_id: str, timeline_dir: Path, out_path: Optional[Path] = None, project_root: Optional[Path] = None) -> Path:
    timeline_dir = timeline_dir.expanduser().resolve()
    if out_path is None:
        out_path = timeline_dir / DEFAULT_MANIFEST_NAME

    manifest = generate_subject_manifest(subject_id, timeline_dir, project_root=project_root)
    out_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return out_path


def export_subject_zip(subject_id: str, timeline_dir: Path, out_dir: Optional[Path] = None) -> Path:
    """
    Creates a zip archive of the subject's timeline, including subject_manifest.json.
    """
    timeline_dir = timeline_dir.expanduser().resolve()
    if out_dir is None:
        out_dir = timeline_dir.parent  # Default to subject root

    out_dir.mkdir(parents=True, exist_ok=True)
    zip_filename = f"{subject_id}_export.zip"
    zip_path = out_dir / zip_filename

    # First, make sure manifest is fresh
    manifest_path = write_subject_manifest(subject_id, timeline_dir)
    manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add manifest
        zf.write(manifest_path, manifest_path.name)

        # Add all images mentioned in manifest that exist
        for img_key, img_rec in manifest_data.get("images", {}).items():
            if img_rec.get("exists"):
                img_path = Path(img_rec["abs"])
                if img_path.exists():
                    zf.write(img_path, img_path.name)

    return zip_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True)
    ap.add_argument("--timelineDir", required=True)
    ap.add_argument("--projectRoot", required=False)
    ap.add_argument("--out", required=False)
    args = ap.parse_args()

    subject = args.subject.strip()
    timeline_dir = Path(args.timelineDir)
    project_root = Path(args.projectRoot).expanduser().resolve() if args.projectRoot else None
    out_path = Path(args.out).expanduser().resolve() if args.out else None

    out = write_subject_manifest(subject, timeline_dir, out_path=out_path, project_root=project_root)
    print(json.dumps({"ok": True, "manifestPath": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
