import pandas as pd
from pathlib import Path

EXCEL_PATH = Path(r"D:\A360\A360_AgingDataset\A360_AgingDataset_Mirror.xlsx")
SUBJECTS_SHEET = "Subjects"

def fix_paths():
    if not EXCEL_PATH.exists():
        print(f"Excel not found at {EXCEL_PATH}")
        return

    print(f"Reading {EXCEL_PATH}...")
    df = pd.read_excel(EXCEL_PATH, sheet_name=SUBJECTS_SHEET)
    
    # Target S003
    mask = df["SubjectID"].astype(str).str.strip().str.upper() == "S003"
    if mask.any():
        old_path = df.loc[mask, "Base_Path"].iloc[0]
        new_path = "Female/Norwegian/subject003"
        print(f"Found S003. Changing path from '{old_path}' to '{new_path}'")
        df.loc[mask, "Base_Path"] = new_path
        df.loc[mask, "Last_Updated_Utc"] = pd.Timestamp.now(tz='UTC').isoformat()
        
        with pd.ExcelWriter(EXCEL_PATH, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df.to_excel(writer, sheet_name=SUBJECTS_SHEET, index=False)
        print("Update successful.")
    else:
        print("S003 not found in Excel.")

if __name__ == "__main__":
    fix_paths()
