const { contextBridge } = require('electron');

// Minimal, safe bridge. The renderer keeps the E2E private key in memory only;
// expose just enough metadata. Extend with secure OS keychain storage if needed.
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  version: process.versions.electron,
});
