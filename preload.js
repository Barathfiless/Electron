const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConnectionInfo: (peerId) => ipcRenderer.invoke('get-connection-info', peerId),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setOrientation: (orientation) => ipcRenderer.send('set-orientation', orientation)
});
