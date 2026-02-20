#!/usr/bin/env python
import argparse
import json
from pathlib import Path
from a360_manifest import export_subject_zip

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True)
    ap.add_argument("--timeline", required=True, help="Absolute path to TimelineA folder")
    ap.add_argument("--out", required=False, default=None, help="Optional output folder for the zip")
    args = ap.parse_args()

    out_dir = Path(args.out) if args.out else None
    zip_path = export_subject_zip(args.subject, Path(args.timeline), out_dir=out_dir)

    print(json.dumps({
        "ok": True,
        "zip_path": str(zip_path),
    }))

if __name__ == "__main__":
    main()
