import openpyxl
from pathlib import Path

EXCEL_PATH = Path(r"D:\A360\A360_AgingDataset\A360_AgingDataset_Mirror.xlsx")

def list_rows():
    if not EXCEL_PATH.exists():
        print(f"Excel not found at {EXCEL_PATH}")
        return

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb["Subjects"]
    for row in ws.iter_rows(values_only=True):
        print(row)

if __name__ == "__main__":
    list_rows()
