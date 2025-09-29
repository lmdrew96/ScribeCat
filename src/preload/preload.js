const { contextBridge, ipcRenderer } = require('electron');

if (process.env.E2E) {
  // Preload starts before exposeInMainWorld. Good early marker.
  console.log('E2E:PRELOAD_START');
  // Forward to main so tests can observe via stdout
  try { ipcRenderer.send('e2e:marker', 'E2E:PRELOAD_START'); } catch (_) {}
}

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

  // Keytar (secure credential storage)
  keytarGet: ({ service, account }) => ipcRenderer.invoke('keytar:get', { service, account }),
  keytarSet: (service, account, password) => ipcRenderer.invoke('keytar:set', { service, account, password }),

  // Vosk/Whisper transcription
  startVoskTranscription: (params) => ipcRenderer.invoke('transcription:start-vosk', params),
  onVoskResult: (callback) => ipcRenderer.on('transcription:vosk-result', callback),
  startWhisperTranscription: (params) => ipcRenderer.invoke('transcription:start-whisper', params),
  onWhisperResult: (callback) => ipcRenderer.on('transcription:whisper-result', callback),
  stopTranscription: (session) => ipcRenderer.invoke('transcription:stop', session),

  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:new-recording', (e) => callback(e, 'menu:new-recording'));
    ipcRenderer.on('menu:save', (e) => callback(e, 'menu:save'));
    ipcRenderer.on('menu:find', (e) => callback(e, 'menu:find'));
    ipcRenderer.on('menu:find-next', (e) => callback(e, 'menu:find-next'));
    ipcRenderer.on('menu:find-previous', (e) => callback(e, 'menu:find-previous'));
    ipcRenderer.on('menu:format', (e, format) => callback(e, 'menu:format', format));
    ipcRenderer.on('menu:insert-timestamp', (e) => callback(e, 'menu:insert-timestamp'));
    ipcRenderer.on('menu:toggle-recording', (e) => callback(e, 'menu:toggle-recording'));
    ipcRenderer.on('menu:pause-resume', (e) => callback(e, 'menu:pause-resume'));
    ipcRenderer.on('menu:quick-restart', (e) => callback(e, 'menu:quick-restart'));
    ipcRenderer.on('menu:ai-summary', (e) => callback(e, 'menu:ai-summary'));
    ipcRenderer.on('menu:toggle-highlighter', (e) => callback(e, 'menu:toggle-highlighter'));
    ipcRenderer.on('menu:clear-notes', (e) => callback(e, 'menu:clear-notes'));
    ipcRenderer.on('menu:focus-panel', (e, panel) => callback(e, 'menu:focus-panel', panel));
    ipcRenderer.on('menu:settings', (e) => callback(e, 'menu:settings'));
    ipcRenderer.on('menu:keyboard-shortcuts', (e) => callback(e, 'menu:keyboard-shortcuts'));
  },

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // E2E healthcheck (safe, no IPC)
  healthCheck: () => 'ok'
});

if (process.env.E2E) {
  console.log('E2E:PRELOAD_EXPOSED');
  // Forward to main so tests can observe via stdout
  try { ipcRenderer.send('e2e:marker', 'E2E:PRELOAD_EXPOSED'); } catch (_) {}
}

// Version info
contextBridge.exposeInMainWorld('appInfo', {
  version: '1.0.0',
  platform: process.platform,
  isDev: process.env.NODE_ENV !== 'production',
  isFull: process.env.DEV_FULL === '1'
});