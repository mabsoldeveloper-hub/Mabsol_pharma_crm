const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  activateKey: (key) => ipcRenderer.invoke('activate-key', key),
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),
  openBrowserSso: () => ipcRenderer.invoke('open-browser-sso'),
  onSsoCompleted: (callback) => ipcRenderer.on('sso-completed', (event, data) => callback(data)),
});
