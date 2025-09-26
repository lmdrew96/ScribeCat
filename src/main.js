const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Fix electron-store import for both CJS and ESM
const ElectronStore = require('electron-store');
const Store = ElectronStore.default || ElectronStore;
const store = new Store({
  name: 'settings'
});

let mainWindow;

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload', 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'images', 'icon.png')
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for Google Drive integration
ipcMain.handle('drive:ensure-target', async (event, targetPath) => {
  try {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    return { success: true, path: targetPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Vosk/Whisper transcription IPC handlers
let voskRecognizer = null;
let voskModel = null;
let transcriptionSession = null;

ipcMain.handle('transcription:start-vosk', async (event, { stream, modelPath }) => {
  // TODO: Integrate Vosk Node.js binding here
  // Placeholder: Simulate Vosk result
  setTimeout(() => {
    mainWindow.webContents.send('transcription:vosk-result', { text: 'Simulated Vosk transcription.' });
  }, 2000);
  transcriptionSession = 'vosk-session';
  return transcriptionSession;
});

ipcMain.handle('transcription:start-whisper', async (event, { stream }) => {
  // TODO: Integrate Whisper backend here
  // Placeholder: Simulate Whisper result
  setTimeout(() => {
    mainWindow.webContents.send('transcription:whisper-result', { text: 'Simulated Whisper transcription.' });
  }, 2000);
  transcriptionSession = 'whisper-session';
  return transcriptionSession;
});

ipcMain.handle('transcription:stop', async (event, session) => {
  // TODO: Stop Vosk/Whisper session
  transcriptionSession = null;
  return true;
});

ipcMain.handle('drive:save-html', async (event, { filePath, content, fileName }) => {
  try {
    const fullPath = path.join(filePath, `${fileName}.html`);
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true, path: fullPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Settings storage
ipcMain.handle('store:get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
  return true;
});

// File dialog handlers
ipcMain.handle('show-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

// Audio file saving
ipcMain.handle('save-audio-file', async (event, { audioData, fileName, folderPath }) => {
  try {
    const filePath = path.join(folderPath, `${fileName}.wav`);
    const buffer = Buffer.from(audioData);
    fs.writeFileSync(filePath, buffer);
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Menu setup
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Recording',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-recording');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
});