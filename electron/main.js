require("dotenv").config();

const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

function setConfigEnvIfPossible() {
  if (process.env.A360_CONFIG_PATH) return;

  const candidates = [
    path.join(process.cwd(), "a360.config.json"),
    path.join(__dirname, "a360.config.json"),
    path.join(__dirname, "..", "a360.config.json"),
    path.join(__dirname, "..", "..", "a360.config.json"),
  ];

  const found = candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (found) {
    process.env.A360_CONFIG_PATH = found;
    console.log("[A360] Using config:", found);
  } else {
    console.warn("[A360] a360.config.json not found. Set A360_CONFIG_PATH env var.");
  }
}

function createWindow() {
  setConfigEnvIfPossible();

  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),

      // REQUIRED for contextBridge to work
      contextIsolation: true,
      sandbox: false,

      // Explicit for safety
      nodeIntegration: false,
    },
  });

  win.loadURL("http://localhost:5173");

  // Debug aid — keep for now
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
