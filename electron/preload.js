console.log("🔥 PRELOAD ACTIVE:", __filename);

const { contextBridge } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

// --------------------
// Python bridge
// --------------------
function runPython(script, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", [script, ...args]);
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
// Save PNG + hash
// --------------------
function savePng(filePath, base64) {
  const buf = Buffer.from(base64, "base64");
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
    console.error("Failed to load image:", filePath, err);
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
// Comfy WebSocket Runner
// --------------------
function runComfyWorkflow(workflow) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://127.0.0.1:8188/ws");

    ws.on("open", () => {
      console.log("🟢 Connected to Comfy WebSocket");

      // Load UI workflow (same as drag-drop)
      ws.send(
        JSON.stringify({
          type: "load",
          data: workflow
        })
      );

      // Queue execution
      ws.send(
        JSON.stringify({
          type: "queue_prompt",
          data: {}
        })
      );
    });

    ws.on("message", (msg) => {
      const message = msg.toString();

      // Comfy sends multiple status updates.
      // We resolve when execution is acknowledged.
      if (message.includes("execution_start") || message.includes("queue")) {
        resolve(message);
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      reject(err);
    });

    ws.on("close", () => {
      console.log("🔴 Comfy WebSocket closed");
    });
  });
}

// --------------------
// Expose APIs
// --------------------
contextBridge.exposeInMainWorld("runPython", runPython);
contextBridge.exposeInMainWorld("savePng", savePng);

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

contextBridge.exposeInMainWorld("comfyAPI", {
  runWorkflow: runComfyWorkflow,
});
