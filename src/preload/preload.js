const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Google Drive operations
  driveEnsureTarget: (targetPath) => ipcRenderer.invoke('drive:ensure-target', targetPath),
  driveSaveHtml: (data) => ipcRenderer.invoke('drive:save-html', data),
  
  // Settings storage
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store:set', key, value),
  
  // File dialogs
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),
  
  // Audio file operations
  saveAudioFile: (data) => ipcRenderer.invoke('save-audio-file', data),
  
  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:new-recording', callback);
    ipcRenderer.on('menu:save', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Version info
contextBridge.exposeInMainWorld('appInfo', {
  version: '1.0.0',
  platform: process.platform
});