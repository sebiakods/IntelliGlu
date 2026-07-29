const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  getPythonStatus: () => ipcRenderer.invoke("get-python-status"),
});