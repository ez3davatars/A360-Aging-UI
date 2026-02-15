console.log("🔥 PRELOAD ACTIVE:", __filename);

const { contextBridge, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// --------------------
// Config
// --------------------
function resolveConfigPath() {
  // Priority:
  // 1) Env var
  // 2) a360.config.json in app CWD (repo root in dev)
  // 3) a360.config.json next to this preload (fallback)
  const envPath = process.env.A360_CONFIG_PATH;
  if (envPath) return envPath;

  const cwdCandidate = path.join(process.cwd(), "a360.config.json");
  if (fs.existsSync(cwdCandidate)) return cwdCandidate;

  return path.join(__dirname, "..", "a360.config.json");
}

function readConfig() {
  const configPath = resolveConfigPath();
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[A360] Failed to read config:", configPath, err);
    return null;
  }
}

// --------------------
// Python bridge
// --------------------
function runPython(script, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", [script, ...args], {
      windowsHide: true,
    });

    let out = "";
    let err = "";

    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));

    proc.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(err || `Python exited with code ${code}`);
    });
  });
}

// --------------------
// Save image + hash
// --------------------
function savePng(filePath, base64) {
  // base64 may be raw or a data URL
  const b64 = base64.includes(",") ? base64.split(",")[1] : base64;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buf = Buffer.from(b64, "base64");
  fs.writeFileSync(filePath, buf);

  return crypto.createHash("sha256").update(buf).digest("hex");
}

// --------------------
// Load image as base64
// --------------------
async function loadImageBase64(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = filePath.split(".").pop().toLowerCase();

    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
        ? "image/webp"
        : "image/png";

    return `data:${mime};base64,${data.toString("base64")}`;
  } catch (err) {
    // Silence missing-file errors; UI uses this to probe existence
    return null;
  }
}

// --------------------
// Save prompt text file
// --------------------
async function savePromptFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save prompt file:", err);
    return false;
  }
}

// --------------------
// Expose APIs
// --------------------
contextBridge.exposeInMainWorld("runPython", runPython);
contextBridge.exposeInMainWorld("savePng", savePng);

contextBridge.exposeInMainWorld("configAPI", {
  getConfigPath: resolveConfigPath,
  getConfig: readConfig,
});

contextBridge.exposeInMainWorld("shellAPI", {
  openPath: (p) => shell.openPath(p),
  openExternal: (url) => shell.openExternal(url),
});

contextBridge.exposeInMainWorld("imageAPI", {
  loadImageBase64,
});

contextBridge.exposeInMainWorld("promptAPI", {
  savePromptFile,

  pathExists: (filePath) => {
    return fs.existsSync(filePath);
  },

  ensureDir: (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  },

  readFile: (filePath) => {
    return fs.readFileSync(filePath, "utf-8");
  },
});
