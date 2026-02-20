import pandas as pd
import json

config_path = r"d:\A360_App\a360.config.json"
with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

excel_path = config.get("excelPath")

try:
    df_subj = pd.read_excel(excel_path, sheet_name="Subjects")
    print(f"Columns: {df_subj.columns.tolist()}")
    print(f"Shape: {df_subj.shape}")
    print("\nFirst row raw:")
    print(df_subj.iloc[0].to_dict() if not df_subj.empty else "Empty")
    
    # Check for empty/NaN rows
    nan_rows = df_subj.isna().all(axis=1).sum()
    print(f"\nAll-NaN rows: {nan_rows}")
    
    # Check for S001
    s001_mask = df_subj["SubjectID"].astype(str).str.contains("S001", na=False)
    print(f"S001 found: {s001_mask.any()}")
    if s001_mask.any():
        print(df_subj[s001_mask])

except Exception as e:
    print(f"Error: {e}")
