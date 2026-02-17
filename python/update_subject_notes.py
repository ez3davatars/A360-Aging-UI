#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

from openpyxl import load_workbook


def norm(s: Any) -> str:
  return str(s).strip().lower()


def find_sheet(wb):
  # Prefer "Subjects", else first sheet.
  if "Subjects" in wb.sheetnames:
    return wb["Subjects"]
  return wb[wb.sheetnames[0]]


def find_header_row_and_cols(ws, max_rows=30) -> Tuple[int, Dict[str, int]]:
  """
  Scan top rows for a header row that contains a Subject id column and Notes column.
  Returns (header_row_index_1based, col_map: key -> col_index_1based)
  """
  # Candidate header names (lowercase)
  subject_keys = {"subject", "subject_id", "subjectid", "subject key", "id"}
  notes_keys = {"notes", "subject notes", "subjects.notes", "note"}
  fitz_keys = {"fitz", "fitzpatrick", "fitzpatrick scale", "subjects.fitzpatrick"}

  for r in range(1, max_rows + 1):
    values = [ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
    if not any(v is not None and str(v).strip() for v in values):
      continue

    cols = {}
    for c, v in enumerate(values, start=1):
      if v is None:
        continue
      h = norm(v)

      if h in subject_keys and "subject" not in cols:
        cols["subject"] = c
      if h in notes_keys and "notes" not in cols:
        cols["notes"] = c
      if h in fitz_keys and "fitz" not in cols:
        cols["fitz"] = c

    if "subject" in cols and "notes" in cols:
      return r, cols

  raise RuntimeError("Could not find header row with Subject and Notes columns.")


def find_subject_row(ws, header_row: int, subject_col: int, subject_id: str) -> Optional[int]:
  target = norm(subject_id)
  for r in range(header_row + 1, ws.max_row + 1):
    v = ws.cell(row=r, column=subject_col).value
    if v is None:
      continue
    if norm(v) == target:
      return r
  return None


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--excel", required=True, help="Path to Excel workbook")
  ap.add_argument("--subject", required=True, help="Subject ID (must match the Subjects sheet value)")
  ap.add_argument("--notes", required=True, help="Notes text to write into Subjects.Notes")
  ap.add_argument("--fitz", required=False, default=None, help="Optional Fitzpatrick value to write")
  args = ap.parse_args()

  excel_path = Path(args.excel).expanduser()
  if not excel_path.exists():
    print(f"ERROR: Excel file not found: {excel_path}", file=sys.stderr)
    sys.exit(2)

  try:
    wb = load_workbook(excel_path)
    ws = find_sheet(wb)
    header_row, cols = find_header_row_and_cols(ws)

    subject_col = cols["subject"]
    notes_col = cols["notes"]
    fitz_col = cols.get("fitz")

    row = find_subject_row(ws, header_row, subject_col, args.subject)
    if row is None:
      print(f"ERROR: Subject '{args.subject}' not found in sheet '{ws.title}'.", file=sys.stderr)
      sys.exit(3)

    ws.cell(row=row, column=notes_col).value = args.notes
    if args.fitz is not None and fitz_col is not None:
      ws.cell(row=row, column=fitz_col).value = args.fitz

    wb.save(excel_path)

    print(f"OK: Updated {ws.title} row {row} for subject={args.subject}")
  except PermissionError:
    print("ERROR: Permission denied writing Excel file. Close it in Excel and try again.", file=sys.stderr)
    sys.exit(4)
  except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
  main()
