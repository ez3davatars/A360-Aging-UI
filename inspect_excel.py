import pandas as pd
from pathlib import Path

EXCEL_PATH = Path(r"D:\A360\A360_AgingDataset\A360_AgingDataset_Mirror.xlsx")

def inspect_excel():
    if not EXCEL_PATH.exists():
        print(f"Excel not found at {EXCEL_PATH}")
        return

    xl = pd.ExcelFile(EXCEL_PATH)
    print(f"Sheets: {xl.sheet_names}")
    
    if "Subjects" in xl.sheet_names:
        df = pd.read_excel(EXCEL_PATH, sheet_name="Subjects")
        print("Subjects Sheet Columns:", df.columns.tolist())
        print("First 10 Subject IDs:")
        print(df["SubjectID"].tolist()[:10])
    else:
        print("Subjects sheet missing!")

if __name__ == "__main__":
    inspect_excel()
