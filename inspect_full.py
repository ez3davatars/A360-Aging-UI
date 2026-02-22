import pandas as pd
from pathlib import Path

EXCEL_PATH = Path(r"D:\A360\A360_AgingDataset\A360_AgingDataset_Mirror.xlsx")

def inspect_full():
    if not EXCEL_PATH.exists():
        print(f"Excel not found at {EXCEL_PATH}")
        return

    df = pd.read_excel(EXCEL_PATH, sheet_name="Subjects")
    print("Full Subjects Table:")
    print(df.to_string())

if __name__ == "__main__":
    inspect_full()
