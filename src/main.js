const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const keytar = require('keytar');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const cheerio = require('cheerio');

// electron-store works as a default export in recent versions
const ElectronStore = require('electron-store');
const Store = ElectronStore.default || ElectronStore;
const store = new Store({ name: 'settings' });

let mainWindow;

// Enable live reload for development (optional)
if (process.env.NODE_ENV === 'development' && !process.env.E2E) {
  try {
    require('electron-reload')(__dirname, {
      hardResetMethod: 'exit'
      // electron: require('electron') // optional
    });
  } catch (e) {
    console.warn('electron-reload not installed; skipping live reload');
  }
}

function createWindow() {
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

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (process.env.E2E) console.log('E2E:WINDOW_LOADED');
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  if (process.env.E2E) console.log('E2E:MAIN_READY');
  createWindow();
  createMenu();

  // During E2E, collect markers sent by preload/renderer and echo to stdout
  if (process.env.E2E) {
    ipcMain.on('e2e:marker', (_e, message) => {
      try { console.log(message); } catch (_) {}
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
let transcriptionSession = null;

ipcMain.handle('transcription:start-vosk', async () => {
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.webContents.send('transcription:vosk-result', { text: 'Simulated Vosk transcription.' });
    }
  }, 2000);
  transcriptionSession = 'vosk-session';
  return transcriptionSession;
});

ipcMain.handle('transcription:start-whisper', async () => {
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.webContents.send('transcription:whisper-result', { text: 'Simulated Whisper transcription.' });
    }
  }, 2000);
  transcriptionSession = 'whisper-session';
  return transcriptionSession;
});

ipcMain.handle('transcription:stop', async () => {
  transcriptionSession = null;
  return true;
});

ipcMain.handle('drive:save-html', async (event, { filePath, content, fileName }) => {
  try {
    const $ = cheerio.load(content);
    
    // Extract header information
    const courseNumber = $('.course-info').first().text().replace('Course: ', '').trim() || 'N/A';
    const courseTitle = $('.course-info').eq(1).text().replace('Title: ', '').trim() || 'Untitled';
    const date = $('.date').text().replace('Date: ', '').trim() || new Date().toLocaleDateString();
    
    // Extract content and create paragraphs
    const contentDiv = $('.content');
    const paragraphs = [];
    
    // Add header paragraphs
    paragraphs.push(
      new Paragraph({
        text: `Course: ${courseNumber}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: `Title: ${courseTitle}`,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Date: ${date}`,
        spacing: { after: 400 },
      })
    );
    
    // Process content
    if (contentDiv.length > 0) {
      // Handle different content types
      contentDiv.find('p, div.entry').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          // Check if this is a transcription entry with timestamp
          const strongText = $(elem).find('strong').text();
          if (strongText) {
            // This is likely a transcription entry
            const remainingText = text.replace(strongText, '').trim();
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: strongText, bold: true }),
                  new TextRun({ text: remainingText ? `: ${remainingText}` : '' })
                ],
                spacing: { after: 200 }
              })
            );
          } else {
            // Regular paragraph
            paragraphs.push(
              new Paragraph({
                text: text,
                spacing: { after: 200 }
              })
            );
          }
        }
      });
    }
    
    // If no content was found, add a default message
    if (paragraphs.length === 3) { // Only header paragraphs
      paragraphs.push(
        new Paragraph({
          text: 'No content available.',
          spacing: { after: 200 }
        })
      );
    }
    
    // Create DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });
    
    // Generate DOCX buffer and save
    const buffer = await Packer.toBuffer(doc);
    const fullPath = path.join(filePath, `${fileName}.docx`);
    fs.writeFileSync(fullPath, buffer);
    
    return { success: true, path: fullPath };
  } catch (error) {
    console.error('Error creating DOCX file:', error);
    return { success: false, error: error.message };
  }
});

// Settings storage
ipcMain.handle('store:get', (event, key) => store.get(key));
ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
  return true;
});

// Keytar (secure storage)
ipcMain.handle('keytar:get', async (_e, { service, account }) => {
  try {
    const result = await keytar.getPassword(service, account);
    return result || null;
  } catch (err) {
    return null;
  }
});
ipcMain.handle('keytar:set', async (_e, { service, account, password }) => {
  try {
    await keytar.setPassword(service, account, password);
    return true;
  } catch (err) {
    return false;
  }
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
    const outPath = path.join(folderPath, `${fileName}.wav`);
    const buffer = Buffer.from(audioData);
    fs.writeFileSync(outPath, buffer);
    return { success: true, path: outPath };
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
          click: () => mainWindow?.webContents.send('menu:new-recording')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }]
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