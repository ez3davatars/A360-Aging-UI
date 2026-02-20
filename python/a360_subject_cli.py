#!/usr/bin/env python
"""
a360_subject_cli.py (robust)

Purpose:
- Provide a stable CLI for the A360 UI / Live Subject Monitor.
- Prefer Subjects sheet if populated; otherwise fall back to scanning subject_manifest.json files on disk.

Design goals:
- Never crash on common calls; always print JSON (even on errors).
- Works even when the Excel Subjects sheet is empty.

Default behavior:
- If no subcommand is provided, runs "list".

Examples:
  python a360_subject_cli.py
  python a360_subject_cli.py list --dataset-root "D:\A360\A360_AgingDataset"
  python a360_subject_cli.py list --excel "D:\A360\A360_AgingDataset\A360_AgingDataset_Master_Gemini_ComfyUI_v3_fullImages.xlsx"
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

DEFAULT_DATASET_ROOT = Path(r"D:\A360\A360_AgingDataset")
DEFAULT_EXCEL_NAME = "A360_AgingDataset_Master_Gemini_ComfyUI_v3_fullImages.xlsx"
DEFAULT_SUBJECTS_SHEET = "Subjects"

MANIFEST_FILENAME = "subject_manifest.json"
NOTES_FILENAME = "subject_notes.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_print_json(obj: Any) -> None:
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def pick_subject_root(dataset_root: Path) -> Path:
    candidates = [
        dataset_root / "Subjects",
        dataset_root / "CUI Workflows",
        dataset_root,
    ]
    for c in candidates:
        try:
            if c.exists():
                return c
        except Exception:
            continue
    return candidates[0]


def normalize_rel_path(p: str) -> str:
    s = str(p or "").replace("\\", "/").strip()
    return s.strip("/")


def try_read_subjects_from_excel(excel_path: Path, sheet_name: str) -> List[Dict[str, Any]]:
    if not excel_path.exists():
        return []
    try:
        df = pd.read_excel(excel_path, sheet_name=sheet_name)
    except Exception:
        return []
    if df is None or df.empty or "SubjectID" not in df.columns:
        return []
    # At least one real ID?
    ids = [
        str(x).strip().upper()
        for x in df["SubjectID"].tolist()
        if str(x).strip() and str(x).strip().lower() not in {"nan", "none"}
    ]
    if not ids:
        return []

    out: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        sid = str(row.get("SubjectID", "")).strip().upper()
        if not sid or sid.lower() in {"nan", "none"}:
            continue
        out.append(
            {
                "subject_id": sid,
                "base_path": str(row.get("Base_Path", "")).strip(),
                "sex": str(row.get("Sex", "")).strip(),
                "ethnicity_group": str(row.get("Ethnicity_Group", "")).strip(),
                "fitzpatrick_tone": str(row.get("Fitzpatrick_Tone", row.get("Fitzpatrick", ""))).strip(),
                "notes": str(row.get("Notes", "")).strip(),
                "status": str(row.get("Image_Set_Status", "")).strip(),
                "last_updated_utc": str(row.get("Last_Updated_Utc", "")).strip(),
                "source": "excel",
            }
        )
    return out


def scan_manifests(subject_root: Path, max_depth: int = 6) -> List[Dict[str, Any]]:
    """
    Scan for subject_manifest.json under subject_root.
    Depth limit prevents pathological walks on huge drives.
    """
    manifests: List[Dict[str, Any]] = []
    try:
        for root, dirs, files in os.walk(subject_root):
            try:
                rel_depth = len(Path(root).relative_to(subject_root).parts)
            except Exception:
                rel_depth = 0
            if rel_depth > max_depth:
                dirs[:] = []
                continue
            if MANIFEST_FILENAME in files:
                p = Path(root) / MANIFEST_FILENAME
                try:
                    obj = json.loads(p.read_text(encoding="utf-8"))
                except Exception:
                    continue
                sid = str(obj.get("subject_id") or obj.get("subjectId") or "").strip().upper()
                if not sid:
                    # fallback: infer from folder name
                    sid = Path(root).name.upper()
                base_path = ""
                try:
                    base_path = normalize_rel_path(Path(root).relative_to(subject_root).as_posix())
                except Exception:
                    base_path = ""
                manifests.append(
                    {
                        "subject_id": sid,
                        "base_path": base_path,
                        "status": "TimelineA complete" if bool(obj.get("complete")) else "In Progress",
                        "complete": bool(obj.get("complete")),
                        "missing_ages": obj.get("missing_ages", []),
                        "manifest_path": str(p),
                        "source": "manifest",
                    }
                )
    except Exception:
        return manifests

    # stable ordering
    manifests.sort(key=lambda x: x.get("subject_id", ""))
    return manifests


def cmd_list(args: argparse.Namespace) -> int:
    dataset_root = Path(args.dataset_root).expanduser()
    subject_root = Path(args.subject_root).expanduser() if args.subject_root else pick_subject_root(dataset_root)
    excel_path = Path(args.excel).expanduser() if args.excel else (dataset_root / DEFAULT_EXCEL_NAME)

    # 1) Prefer Excel subjects if populated
    excel_subjects = try_read_subjects_from_excel(excel_path, args.subjects_sheet)
    if excel_subjects:
        safe_print_json({"ok": True, "generated_utc": utc_now(), "subjects": excel_subjects})
        return 0

    # 2) Fall back to manifests
    manifest_subjects = scan_manifests(subject_root)
    safe_print_json({"ok": True, "generated_utc": utc_now(), "subjects": manifest_subjects})
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument("--dataset-root", dest="dataset_root", default=str(DEFAULT_DATASET_ROOT))
    p.add_argument("--subject-root", dest="subject_root", default="")
    p.add_argument("--excel", dest="excel", default="")
    p.add_argument("--subjects-sheet", dest="subjects_sheet", default=DEFAULT_SUBJECTS_SHEET)

    sub = p.add_subparsers(dest="cmd")
    sub.add_parser("list")
    return p


def main() -> int:
    parser = build_parser()

    # Be tolerant: if caller passes unknown args, ignore them and default to list.
    try:
        args, unknown = parser.parse_known_args()
    except SystemExit:
        safe_print_json({"ok": False, "error": "argparse_failed"})
        return 2

    cmd = args.cmd or "list"
    if cmd == "list":
        return cmd_list(args)

    # Unknown subcommand -> list
    return cmd_list(args)


if __name__ == "__main__":
    raise SystemExit(main())
