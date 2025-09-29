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

// Import subscription manager
const SubscriptionManager = require('./shared/subscription-manager.js');
const subscriptionManager = new SubscriptionManager();

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
    icon: path.join(__dirname, '..', 'assets', 'images', 'nugget.png')
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
  const simulationMode = store.get('simulation-mode', true); // Default to true if not set
  
  if (simulationMode) {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('transcription:vosk-result', { text: 'Simulated Vosk transcription.' });
      }
    }, 2000);
    transcriptionSession = 'vosk-session';
    return transcriptionSession;
  } else {
    // Real Vosk implementation would go here
    // For now, return an error indicating real Vosk is not implemented
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('transcription:vosk-result', { 
          text: 'Real Vosk transcription not implemented yet. Please enable simulation mode in Developer Settings.' 
        });
      }
    }, 1000);
    transcriptionSession = 'vosk-session-real';
    return transcriptionSession;
  }
});

ipcMain.handle('transcription:start-whisper', async () => {
  const simulationMode = store.get('simulation-mode', true); // Default to true if not set
  
  if (simulationMode) {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('transcription:whisper-result', { text: 'Simulated Whisper transcription.' });
      }
    }, 2000);
    transcriptionSession = 'whisper-session';
    return transcriptionSession;
  } else {
    // Real Whisper implementation would go here
    // For now, return an error indicating real Whisper is not implemented
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('transcription:whisper-result', { 
          text: 'Real Whisper transcription not implemented yet. Please enable simulation mode in Developer Settings.' 
        });
      }
    }, 1000);
    transcriptionSession = 'whisper-session-real';
    return transcriptionSession;
  }
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

// Course management IPC handlers
ipcMain.handle('courses:import-from-extension', async (event, importData) => {
  try {
    // Validate import data format
    if (!importData || importData.format !== 'scribecat_course_import_v1') {
      return { success: false, error: 'Invalid import format. Expected scribecat_course_import_v1.' };
    }
    
    if (!importData.courses || !Array.isArray(importData.courses)) {
      return { success: false, error: 'No courses found in import data.' };
    }
    
    // Get existing courses
    const existingCourses = store.get('predefined-courses', []);
    
    // Process imported courses
    const importedCourses = importData.courses.map(course => ({
      id: course.id || `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      canvasId: course.canvasId,
      courseNumber: course.courseNumber || '',
      courseTitle: course.courseTitle || '',
      institution: importData.institution || 'unknown',
      canvasUrl: importData.canvasUrl || '',
      imported: new Date().toISOString(),
      source: 'browser_extension'
    }));
    
    // Merge with existing courses (avoid duplicates)
    const courseMap = new Map();
    
    // Add existing courses
    existingCourses.forEach(course => {
      courseMap.set(course.id, course);
    });
    
    // Add imported courses (will overwrite if same ID)
    importedCourses.forEach(course => {
      courseMap.set(course.id, course);
    });
    
    // Convert back to array
    const allCourses = Array.from(courseMap.values());
    
    // Save to store
    store.set('predefined-courses', allCourses);
    
    return { 
      success: true, 
      imported: importedCourses.length,
      total: allCourses.length,
      courses: importedCourses
    };
  } catch (error) {
    console.error('Course import failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('courses:get-all', async () => {
  try {
    const courses = store.get('predefined-courses', []);
    return { success: true, courses: courses };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('courses:add', async (event, courseData) => {
  try {
    const courses = store.get('predefined-courses', []);
    const newCourse = {
      id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      courseNumber: courseData.courseNumber || '',
      courseTitle: courseData.courseTitle || '',
      institution: courseData.institution || 'manual',
      canvasUrl: courseData.canvasUrl || '',
      added: new Date().toISOString(),
      source: 'manual'
    };
    
    courses.push(newCourse);
    store.set('predefined-courses', courses);
    
    return { success: true, course: newCourse };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('courses:update', async (event, courseId, courseData) => {
  try {
    const courses = store.get('predefined-courses', []);
    const index = courses.findIndex(course => course.id === courseId);
    
    if (index === -1) {
      return { success: false, error: 'Course not found' };
    }
    
    courses[index] = {
      ...courses[index],
      ...courseData,
      updated: new Date().toISOString()
    };
    
    store.set('predefined-courses', courses);
    
    return { success: true, course: courses[index] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('courses:delete', async (event, courseId) => {
  try {
    const courses = store.get('predefined-courses', []);
    const filteredCourses = courses.filter(course => course.id !== courseId);
    
    if (filteredCourses.length === courses.length) {
      return { success: false, error: 'Course not found' };
    }
    
    store.set('predefined-courses', filteredCourses);
    
    return { success: true, remaining: filteredCourses.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
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

// Get Downloads directory
ipcMain.handle('get-downloads-path', async () => {
  try {
    const downloadsPath = app.getPath('downloads');
    return { success: true, path: downloadsPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save DOCX files for automatic local downloads
ipcMain.handle('save-docx-file', async (event, { content, fileName, folderPath, type }) => {
  try {
    const outPath = path.join(folderPath, `${fileName}.docx`);
    
    // Create DOCX document
    let paragraphs = [];
    
    if (type === 'notes') {
      // Parse HTML content for notes
      const $ = cheerio.load(content);
      const courseNumber = $('.course-info').first().text().replace('Course: ', '').trim() || 'N/A';
      const courseTitle = $('.course-info').eq(1).text().replace('Title: ', '').trim() || 'Untitled';
      const date = $('.date').text().replace('Date: ', '').trim() || new Date().toLocaleDateString();
      
      // Add header information
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `Course: ${courseNumber}`, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Title: ${courseTitle}`, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Date: ${date}`, bold: true })],
        }),
        new Paragraph({ children: [new TextRun("")] }) // Empty line
      );
      
      // Extract and add content
      const contentDiv = $('.content');
      if (contentDiv.length > 0) {
        const textContent = contentDiv.text().trim();
        if (textContent) {
          textContent.split('\n').forEach(line => {
            paragraphs.push(new Paragraph({
              children: [new TextRun(line.trim())],
            }));
          });
        } else {
          paragraphs.push(new Paragraph({
            children: [new TextRun("No notes recorded.")],
          }));
        }
      }
    } else if (type === 'transcription') {
      // Parse HTML content for transcription
      const $ = cheerio.load(content);
      const courseNumber = $('.course-info').first().text().replace('Course: ', '').trim() || 'N/A';
      const courseTitle = $('.course-info').eq(1).text().replace('Title: ', '').trim() || 'Untitled';
      const date = $('.date').text().replace('Date: ', '').trim() || new Date().toLocaleDateString();
      
      // Add header information
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `Course: ${courseNumber}`, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Title: ${courseTitle}`, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Date: ${date}`, bold: true })],
        }),
        new Paragraph({ children: [new TextRun("")] }) // Empty line
      );
      
      // Extract transcription entries
      const entries = $('.entry');
      if (entries.length > 0) {
        entries.each((i, entry) => {
          const $entry = $(entry);
          const timestamp = $entry.find('strong').text();
          const text = $entry.text().replace(timestamp, '').trim();
          
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({ text: timestamp, bold: true }),
              new TextRun({ text: ` ${text}` })
            ],
          }));
        });
      } else {
        paragraphs.push(new Paragraph({
          children: [new TextRun("No transcription available.")],
        }));
      }
    }
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });
    
    // Generate and save the document
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    
    return { success: true, path: outPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Subscription management IPC handlers
ipcMain.handle('subscription:get-status', async () => {
  try {
    await subscriptionManager.initialize(store);
    return { success: true, status: subscriptionManager.getSubscriptionStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('subscription:set-tier', async (event, tier) => {
  try {
    await subscriptionManager.initialize(store);
    await subscriptionManager.setSubscriptionTier(tier);
    return { success: true, status: subscriptionManager.getSubscriptionStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('subscription:add-unlock', async (event, unlockId) => {
  try {
    await subscriptionManager.initialize(store);
    await subscriptionManager.addPremiumUnlock(unlockId);
    return { success: true, status: subscriptionManager.getSubscriptionStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('subscription:can-use-feature', async (event, feature) => {
  try {
    await subscriptionManager.initialize(store);
    
    if (feature === 'askAI') {
      return { success: true, result: subscriptionManager.canUseAskAI() };
    } else if (feature === 'aiSummary') {
      return { success: true, result: subscriptionManager.canGenerateAISummary() };
    } else {
      return { 
        success: true, 
        result: { 
          allowed: subscriptionManager.hasFeatureAccess(feature),
          reason: subscriptionManager.getUpgradeMessage(feature)
        }
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('subscription:track-usage', async (event, feature, amount) => {
  try {
    await subscriptionManager.initialize(store);
    
    if (feature === 'askAI') {
      await subscriptionManager.trackAskAIUsage(amount);
    } else if (feature === 'aiSummary') {
      await subscriptionManager.trackAISummaryUsage();
    }
    
    return { success: true };
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
          label: 'Open Recording...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-recording'),
          enabled: false // Placeholder for future functionality
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
        },
        ...(process.platform === 'win32' ? [{
          label: 'Close',
          accelerator: 'Alt+F4',
          click: () => app.quit()
        }] : [])
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
        { role: 'paste' },
        { role: 'selectall' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu:find')
        },
        {
          label: 'Find Next',
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow?.webContents.send('menu:find-next')
        },
        {
          label: 'Find Previous',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWindow?.webContents.send('menu:find-previous')
        }
      ]
    },
    {
      label: 'Format',
      submenu: [
        {
          label: 'Bold',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu:format', 'bold')
        },
        {
          label: 'Italic',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('menu:format', 'italic')
        },
        {
          label: 'Underline',
          accelerator: 'CmdOrCtrl+U',
          click: () => mainWindow?.webContents.send('menu:format', 'underline')
        },
        { type: 'separator' },
        {
          label: 'Insert Timestamp',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('menu:insert-timestamp')
        }
      ]
    },
    {
      label: 'Recording',
      submenu: [
        {
          label: 'Start/Stop Recording',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.send('menu:toggle-recording')
        },
        {
          label: 'Pause/Resume Recording',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('menu:pause-resume')
        },
        {
          label: 'Quick Restart Recording',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow?.webContents.send('menu:quick-restart')
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Generate AI Summary',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:ai-summary')
        },
        {
          label: 'Toggle Highlighter',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => mainWindow?.webContents.send('menu:toggle-highlighter')
        },
        { type: 'separator' },
        {
          label: 'Clear All Notes',
          accelerator: 'CmdOrCtrl+Shift+Delete',
          click: () => mainWindow?.webContents.send('menu:clear-notes')
        }
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
        { 
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          role: 'togglefullscreen' 
        },
        { type: 'separator' },
        {
          label: 'Focus Notes Panel',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.webContents.send('menu:focus-panel', 1)
        },
        {
          label: 'Focus Transcription Panel',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow?.webContents.send('menu:focus-panel', 2)
        },
        {
          label: 'Focus AI Chat',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow?.webContents.send('menu:focus-panel', 3)
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu:settings')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+?',
          click: () => mainWindow?.webContents.send('menu:keyboard-shortcuts')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}