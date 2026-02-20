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
  // 1) Env var (absolute path recommended)
  // 2) In app CWD
  // 3) Next to this preload
  // 4) One/two levels above preload
  const envPath = process.env.A360_CONFIG_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const names = ["a360.config.json", "a360_config.json"];
  const dirs = [
    process.cwd(),
    __dirname,
    path.join(__dirname, ".."),
    path.join(__dirname, "..", ".."),
  ];

  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  // Last resort (keeps behavior close to previous versions)
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
// Python bridge (Option B safe)
// --------------------
function resolveScriptPath(script, cfg) {
  // Force scripts to resolve inside a known root.
  // Prevents renderer from executing arbitrary local files outside the project.
  const scriptsRoot = cfg?.scriptsRoot || cfg?.datasetRoot || cfg?.subjectRoot;
  const base = scriptsRoot ? path.resolve(String(scriptsRoot)) : process.cwd();

  const resolved = path.isAbsolute(script)
    ? path.resolve(script)
    : path.resolve(base, script);

  // Enforce containment within base (best-effort safety)
  const rel = path.relative(base, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to execute script outside scriptsRoot: ${resolved}`);
  }

  return resolved;
}

function runPython(script, args = []) {
  return new Promise((resolve, reject) => {
    const cfg = readConfig() || {};

    // Prefer explicit datasetRoot; fall back to parent of excelPath.
    const datasetRoot =
      cfg.datasetRoot ||
      (cfg.excelPath ? path.dirname(String(cfg.excelPath)) : null) ||
      process.cwd();

    const cwd = path.resolve(String(datasetRoot));

    let scriptPath;
    try {
      scriptPath = resolveScriptPath(String(script), cfg);
    } catch (e) {
      return reject(String(e?.message || e));
    }

    const py = cfg.pythonPath || "py"; // prefer Windows launcher
    const timeoutMs = Number(cfg.pythonTimeoutMs ?? 120000);

    // Unbuffered output so UI can see logs immediately.
    const pyArgs =
      String(py).toLowerCase() === "py"
        ? ["-3", "-u", scriptPath, ...args]
        : ["-u", scriptPath, ...args];

    const proc = spawn(py, pyArgs, {
      windowsHide: true,
      cwd,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    let out = "";
    let err = "";

    proc.on("error", (e) => {
      reject(`Failed to start Python (${py}): ${e.message}`);
    });

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");

    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));

    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch (_) {}
      reject(`Python timed out after ${timeoutMs}ms\n${(err || out).trim()}`);
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve((out || "").trim());
      else reject(((err || out) || `Python exited with code ${code}`).trim());
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
