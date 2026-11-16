const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qr', {
  generate: (texts) => ipcRenderer.invoke('qr:generate', texts),
});
