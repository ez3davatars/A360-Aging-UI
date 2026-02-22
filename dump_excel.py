import openpyxl
from pathlib import Path

EXCEL_PATH = Path(r"D:\A360\A360_AgingDataset\A360_AgingDataset_Mirror.xlsx")
OUT_PATH = Path(r"d:\A360_App\excel_dump.txt")

def dump_rows():
    if not EXCEL_PATH.exists():
        print(f"Excel not found at {EXCEL_PATH}")
        return

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb["Subjects"]
    with OUT_PATH.open("w", encoding="utf-8") as f:
        for row in ws.iter_rows(values_only=True):
            f.write(str(row) + "\n")
    print(f"Dumped to {OUT_PATH}")

if __name__ == "__main__":
    dump_rows()
