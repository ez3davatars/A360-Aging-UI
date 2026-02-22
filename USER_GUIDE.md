# A360 Aging UI User Guide

Welcome to the **A360 Aging UI**, your central dashboard for managing AI-driven aging simulations. This guide provides step-by-step instructions to set up the system on your PC and navigate the complete workflow.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or newer)
- **Python** (v3.10 or newer)
- **ComfyUI** (with IPAdapter and FaceID nodes)
- **Microsoft Excel** (for metadata management)

---

## 🚀 Initial Setup

### 1. Install Dependencies
Open your terminal in the project root directory (`A360_App`) and run:

```bash
# Install frontend dependencies
npm install

# Install backend Python dependencies
pip install -r python/requirements.txt
```

### 2. Configure Your Environment
Rename `a360.config.template.json` to `a360.config.json` and edit it with your local paths:

```json
{
  "projectRoot": "D:/A360/A360_AgingDataset",
  "excelPath": "D:/A360/A360_AgingDataset/A360_AgingDataset_Master_v3.xlsx",
  "comfyOutputDir": "C:/ComfyUI/output"
}
```
> [!IMPORTANT]
> Ensure the `excelPath` points to the **Master Registry** file. Always close the Excel file before starting the application to prevent sync errors.

---

## 🛠️ Running the Application

### Option A: The Simple Way (Recommended)
Double-click `start_a360_tonight.bat` in the root folder. This launches both the file watcher and the UI dashboard simultaneously. **This script automatically cleans up any old, hanging A360 processes before starting.**

### Option B: Manual Startup
If you prefer manual control, open two terminals:

**Terminal 1 (File Watcher):**
```bash
python python/A360_auto_move_with_excel.py
```

**Terminal 2 (Web UI):**
```bash
npm run start
```

---

## 🔄 The Complete Workflow

### Step 1: Create a New Subject
1. Navigate to the **Create Subject** screen in the UI.
2. Enter the Subject ID (e.g., `S005`).
3. Click "Create Subject". This adds a row to your Excel `Subjects` sheet and creates a `TimelineA` directory.

### Step 2: Build Anchor Prompts
1. Go to **Anchor Prompt Builder**.
2. Select your subject.
3. Use the **Gemini AI** integration to generate highly descriptive prompts for the A20 (Young) and A70 (Old) anchors based on the subject's phenotype.

### Step 3: Generate & Save Anchors
1. Send the generated prompts to ComfyUI or your preferred generator.
2. Once you have the A20 and A70 images, upload them in the UI.
3. Click **Save Anchors to TimelineA**.

### Step 4: Run Aging in ComfyUI
1. Load your A360 Aging Workflow in ComfyUI.
2. Use the A20/A70 images as IPAdapter inputs.
3. Ensure your output filenames include the subject ID and age (e.g., `S005_A45.png`).

### Step 5: Live Monitoring
1. Open the **Live Subject Monitor** in the UI.
2. As ComfyUI saves images, the **File Watcher** will automatically:
   - Rename and move files to the correct subject folder.
   - Update the Excel database.
   - Push a real-time update to your UI dashboard view.

### Step 6: Export Results
1. Once the sequence is complete, click **Export Subject**.
2. The system generates a `subject_manifest.json` and bundles all high-res results into a `.zip` file located in the subject's root folder.

---

## ❓ Troubleshooting

- **Address already in use (Error 10048)?** This means an old instance of the app is still running in the background. Run `cleanup_a360.bat` to clear all hanging processes.
- **Port 5173 / 5174 in use?** Similar to above, multiple UI instances are competing for the same entry point. Use `cleanup_a360.bat`.
- **Images not appearing?** Check that `comfyOutputDir` in `a360.config.json` matches your actual ComfyUI output path.

---
*Powered by Nanobanana Pro | A360 Aging Dataset Pipeline*
