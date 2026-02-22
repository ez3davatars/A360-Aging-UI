
import os
from pathlib import Path

def find_dir(name, root):
    print(f"Searching for {name} in {root}...")
    for r, dirs, files in os.walk(root):
        if name in dirs:
            print(f"FOUND: {os.path.join(r, name)}")
        if name in files:
            print(f"FOUND FILE: {os.path.join(r, name)}")

find_dir("subject003", "D:\\")
find_dir("S003_A70.png", "D:\\")
