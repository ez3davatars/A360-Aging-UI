import pandas as pd
import json
import os

config_path = r"d:\A360_App\a360.config.json"
with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

excel_path = config.get("excelPath")
print(f"Checking Excel file: {excel_path}")
print(f"File size: {os.path.getsize(excel_path)} bytes")

try:
    with pd.ExcelFile(excel_path) as xls:
        print(f"Sheet names: {xls.sheet_names}")
        for sheet in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet)
            print(f"\nSheet: {sheet} (Shape: {df.shape})")
            if not df.empty:
                print(df.tail(10))
            else:
                print("Sheet is empty.")
except Exception as e:
    print(f"Error reading Excel: {e}")
