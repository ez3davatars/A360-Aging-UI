# A360 Aging UI User Guide

Welcome to the **A360 Aging UI**, your central dashboard for managing AI-driven aging simulations. This guide provides step-by-step instructions to set up the system on your PC and navigate the complete workflow.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or newer - for development only)
- **Python** (v3.11 or newer)
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
Rename `a360.config.template.json` to `a360.config.json` and edit it with your local paths.

> [!TIP]
> **For Clients:** Most of the installation is handled by the pre-built application. You only need to ensure Python is installed and your paths are correctly set in the config file.

> [!IMPORTANT]
> Ensure the `excelPath` points to the **Master Registry** file. Always close the Excel file before starting the application to prevent sync errors.

---

## 🛠️ Running the Application

### Option A: The Production Way (Recommended)
If you are using the built application package, use these scripts:
- **`start_a360_aging_ui_production.bat`**: The recommended launcher for clients. It starts the `.exe` and the file watcher.
- **`cleanup_a360.bat`**: Run this to clear all hanging A360 processes if you encounter port errors.

### Option B: Developer Mode
If you are working with the source code, use:
- **`start_a360_aging_ui.bat`**: Launches the watcher and starts the UI via `npm run electron`.
- **Manual Control**:
  1. **File Watcher**: `python python/a360_watcher.py`
  2. **UI**: `npm run dev` (Vite) or `npm run electron`.

---

## 🔄 The Complete Workflow

### Step 1: Create a New Subject
1. Navigate to the **New Subject** screen in the UI.
2. Select the **Sex**, **Ethnicity**, and **Fitzpatrick Tone**.
3. Click **Create Subject**.
4. **Note your Subject ID**: The system automatically generates the next sequential ID (e.g., `S004`). You will see this ID displayed in the success message.

### Step 2: Build Anchor Prompts
1. Go to **Anchor Prompt Builder**.
2. Select your subject.
3. Use the **Gemini AI** integration to generate highly descriptive prompts.
4. **Exact Likeness Studio**: Selecting this style automatically optimizes settings for maximum fidelity (Identity Lock 100%, Stylization 0%).
5. **Categorized Presets**: Browse through the new structured dropdowns to quickly find phenotypes and styles.

### Step 3: Generate & Save Anchors
1. Send the generated prompts to ComfyUI or your preferred generator.
2. Once you have the A20 and A70 images, upload them in the UI.
3. Click **Save Anchors to TimelineA**.

### Step 4: Run Aging in ComfyUI
1. Load your A360 Aging Workflow in ComfyUI.
2. **CRITICAL**: Enter the generated **Subject ID** (e.g., `S004`) into the **String** node of your ComfyUI workflow. This ensures the output files are named correctly so the watcher can identify them.
3. Use the A20/A70 images as IPAdapter inputs.
4. The workflow must save images with the format `{subjectID}_A{age}` (e.g., `S004_A45.png`).

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

- **Address already in use (Error 10048)?** This means an old instance of the app is still running. Run `cleanup_a360.bat`.
- **Images not appearing?** Check that `comfyOutputDir` in `a360.config.json` matches your actual ComfyUI output path. The UI now uses a sleek **Glassmorphism design** with real-time status indicators; if a tile remains empty, the file watcher hasn't received the event from ComfyUI yet.
- **Excel path invalid?** Ensure your path uses forward slashes (e.g., `C:/Data/file.xlsx`) in the JSON config.

---
*Powered by Nanobanana Pro | A360 Aging Dataset Pipeline*
