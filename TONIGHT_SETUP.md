# A360 Tonight Setup (Manual ComfyUI)

## 1) Configure paths
Edit `a360.config.json`:
- `projectRoot`: folder that contains `Aging/Male` and `Aging/Female`
- `excelPath`: your master workbook
- `comfyOutputDir`: your ComfyUI `output` folder

Close Excel before proceeding.

## 2) Install dependencies
From the repo root:

```bash
npm install
pip install -r python/requirements.txt
```

## 3) Start the system
Option A (recommended):
- Run `start_a360_tonight.bat`

Option B (manual):

Terminal 1:
```bash
python python/A360_auto_move_with_excel.py
```

Terminal 2:
```bash
npm run start
```

## 4) Workflow (what you actually do)
1. In the UI: **Create Subject** (this appends to `Subjects` and creates `TimelineA`).
2. Use the UI’s **Anchor prompts** to generate A20/A70 in Gemini.
3. In the UI: upload A20 and A70 and click **Save Anchors to TimelineA**.
4. In ComfyUI: run your aging workflow using those anchors as inputs.
5. Make sure Comfy output filenames include subject + age, e.g.
   - `S004_A45_00001_.png` (preferred)
   - `subject004_age045_00001_.png` (supported)
6. The watcher will:
   - copy outputs into the subject’s `TimelineA`
   - rename them to `S###_A##.png`
   - update the `Images` sheet
   - regenerate `Prompts_Auto`
   - push live updates to the UI monitor

