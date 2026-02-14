require("dotenv").config();

const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
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
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
