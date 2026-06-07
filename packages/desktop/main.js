const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// The packaged desktop app is a thin wrapper window around the hosted web app.
// Set APP_URL at build time (or here) to your public Railway URL.
const APP_URL = process.env.APP_URL || 'https://YOUR-APP-NAME.up.railway.app';

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // security: isolate renderer from Node
      nodeIntegration: false, // security: no Node in renderer
      sandbox: true,
    },
  });

  if (isDev) {
    // In dev, point at the local Vite server.
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the hosted messenger (same app, public URL).
    win.loadURL(APP_URL);
  }

  // Open external links in the OS browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
