#!/usr/bin/env python3
"""generate_subject_manifest.py

Standalone writer for Option B manifests.

Writes subject_manifest.json (schema a360_subject_manifest_v2) for a given subject timeline folder,
injecting notes from subject_notes.json if present.

Example:
  python generate_subject_manifest.py \
    --subject S021 \
    --timelineDir "D:/A360/A360_AgingDataset/Subjects/subject021/TimelineA" \
    --timelineCode A

If --out is omitted, writes to <subjectRoot>/subject_manifest.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Tuple

MANIFEST_SCHEMA_VERSION = "a360_subject_manifest_v2"
DEFAULT_EXPECTED_AGES = list(range(20, 71, 5))
NOTES_JSON_FILENAME = "subject_notes.json"
MANIFEST_JSON_FILENAME = "subject_manifest.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_subject_notes(subject_root: Path) -> Tuple[str, Dict[str, Any]]:
    p = subject_root / NOTES_JSON_FILENAME
    if not p.exists():
        return "", {}
    try:
        obj = json.loads(p.read_text(encoding="utf-8"))
        notes = str(obj.get("notes") or "")
        meta = obj.get("notes_meta") if isinstance(obj.get("notes_meta"), dict) else {}
        if not meta and isinstance(obj.get("meta"), dict):
            # Back-compat
            meta = obj.get("meta")
        return notes, meta
    except Exception:
        return "", {}


def parse_age_from_filename(stem: str) -> int | None:
    m = re.search(r"_A(\d{1,3})", stem, re.IGNORECASE)
    if not m:
        m = re.match(r"A(\d{1,3})", stem, re.IGNORECASE)
    if not m:
        return None
    try:
        return int(m.group(1))
    except Exception:
        return None


def write_subject_manifest_v2(
    *,
    subject_id: str,
    timeline_code: str,
    timeline_dir: Path,
    expected_ages: list[int],
    out_path: Path,
    dry_run: bool = False,
) -> Path:
    subject_root = timeline_dir.parent

    notes, notes_meta = read_subject_notes(subject_root)

    images = []
    for png in sorted(timeline_dir.glob("*.png")):
        if not png.is_file():
            continue
        age = parse_age_from_filename(png.stem)
        if age is None:
            continue
        images.append(
            {
                "age": age,
                "filename": png.name,
                "sha256": "dry-run" if dry_run else sha256_file(png),
                "bytes": 0 if dry_run else png.stat().st_size,
            }
        )

    images.sort(key=lambda x: int(x.get("age", 0)))

    found_ages = {int(i["age"]) for i in images if isinstance(i.get("age"), int)}
    missing_ages = [a for a in expected_ages if a not in found_ages]

    manifest = {
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "generated_utc": utc_now(),
        "subject_id": subject_id,
        "timeline": timeline_code,
        "complete": len(missing_ages) == 0,
        "missing_ages": missing_ages,
        "notes": notes,
        "notes_meta": notes_meta,
        "images": images,
    }

    subject_root.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(out_path)
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True, help="SubjectID, e.g., S021")
    ap.add_argument("--timelineDir", required=True, help="Path to the timeline folder (e.g., .../subject021/TimelineA)")
    ap.add_argument("--timelineCode", default="A", help="Timeline code, default A")
    ap.add_argument(
        "--expectedAgesCsv",
        required=False,
        help="Optional CSV list of ages (e.g. 20,25,30,...,70). If omitted, defaults to 20..70 step 5",
    )
    ap.add_argument("--out", required=False, help="Output path for subject_manifest.json")
    ap.add_argument("--dryRun", action="store_true")
    args = ap.parse_args()

    subject_id = str(args.subject).strip()
    timeline_dir = Path(args.timelineDir).expanduser().resolve()
    timeline_code = str(args.timelineCode).strip() or "A"

    if args.expectedAgesCsv:
        try:
            expected_ages = [int(x.strip()) for x in str(args.expectedAgesCsv).split(",") if x.strip()]
        except Exception:
            expected_ages = DEFAULT_EXPECTED_AGES
    else:
        expected_ages = DEFAULT_EXPECTED_AGES

    if not timeline_dir.exists() or not timeline_dir.is_dir():
        raise SystemExit(f"timelineDir does not exist: {timeline_dir}")

    out_path = Path(args.out).expanduser().resolve() if args.out else (timeline_dir.parent / MANIFEST_JSON_FILENAME)

    out = write_subject_manifest_v2(
        subject_id=subject_id,
        timeline_code=timeline_code,
        timeline_dir=timeline_dir,
        expected_ages=expected_ages,
        out_path=out_path,
        dry_run=bool(args.dryRun),
    )

    print(json.dumps({"ok": True, "manifestPath": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
