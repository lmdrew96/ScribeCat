// ScribeCat Application Logic
// Keytar via preload bridge for security
const keytar = {
  getPassword: async (service, account) => window.electronAPI.keytarGet({ service, account }),
  setPassword: async (service, account, password) => window.electronAPI.keytarSet(service, account, password)
};
const SERVICE_NAME = 'ScribeCat';
const CLAUDE_KEY = 'claude-api-key';

// Developer's Claude API key as fallback (for all users)
// Note: In production, this should be loaded from environment variables or secure config.
// In the isolated renderer (nodeIntegration: false), `process` is not defined; guard access.
const DEVELOPER_CLAUDE_KEY = (typeof process !== 'undefined' && process.env && process.env.SCRIBECAT_CLAUDE_KEY)
  ? process.env.SCRIBECAT_CLAUDE_KEY
  : 'sk-ant-placeholder-developer-key-needs-to-be-set';

class ScribeCatApp {
  constructor() {
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingInterval = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.transcriptionSocket = null;
    this.voskModelPath = null;
    this.whisperEnabled = false;
    this.claudeApiKey = null;
    this.isUsingDeveloperKey = false;
    this.simulationMode = true; // Default to simulation mode enabled
    this.currentTheme = 'default';
    this.simulationMode = true; // Default to simulation mode enabled
    this.simulatedTranscriptionInterval = null;
    // Audio analysis for VU meter
    this.audioContext = null;
    this.analyserNode = null;
    this.vuMeterInterval = null;
    this.init();
  }

  initializeElements() {
    // Core UI elements
    this.recordBtn = document.getElementById('record-btn');
    this.saveBtn = document.getElementById('save-btn');
    this.recordingTime = document.getElementById('recording-time');
    this.notesEditor = document.getElementById('notes-editor');
    this.transcriptionDisplay = document.getElementById('transcription-display');
    this.generateSummaryBtn = document.getElementById('generate-summary');
    this.aiSummary = document.getElementById('ai-summary');
    // Recording controls
    this.pauseBtn = document.getElementById('pause-btn');
    this.resumeBtn = document.getElementById('resume-btn');
    this.stopBtn = document.getElementById('stop-btn');
    // VU Meter
    this.vuMeter = document.getElementById('vu-meter');
    this.vuBar = document.getElementById('vu-bar');
    // Sidebar
    this.sidebar = document.getElementById('sidebar');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.sidebarScrim = document.getElementById('sidebar-scrim');
    
    // Settings elements
    this.saveClaudeKeyBtn = document.getElementById('save-claude-key');
    this.claudeKeyInput = document.getElementById('claude-key');
    this.themeGrid = document.getElementById('theme-grid');
    this.canvasUrl = document.getElementById('canvas-url');
    this.courseSelect = document.getElementById('course-select');
    this.manualCourseFields = document.getElementById('manual-course-fields');
    this.courseNumber = document.getElementById('course-number');
    this.courseTitle = document.getElementById('course-title');
    this.saveCanvasBtn = document.getElementById('save-canvas');
    this.manageCoursesBtn = document.getElementById('manage-courses');
    // Drive folder inputs - separate for notes and transcriptions
    this.notesDriveFolderInput = document.getElementById('notes-drive-folder');
    this.selectNotesDriveFolderBtn = document.getElementById('select-notes-drive-folder');
    this.transcriptionDriveFolderInput = document.getElementById('transcription-drive-folder');
    this.selectTranscriptionDriveFolderBtn = document.getElementById('select-transcription-drive-folder');
    this.driveDownloadLink = document.getElementById('drive-download-link');
    // Local audio folder
    this.localAudioFolderInput = document.getElementById('local-audio-folder');
    this.selectLocalAudioFolderBtn = document.getElementById('select-local-audio-folder');
    // Audio destination controls
    this.audioDestLocalRadio = document.getElementById('audio-dest-local');
    this.audioDestDriveRadio = document.getElementById('audio-dest-drive');
    
    // Transcription controls
    this.clearTranscriptionBtn = document.getElementById('clear-transcription');
    this.jumpLatestBtn = document.getElementById('jump-latest');
    this.transcriptionBackendSelect = document.getElementById('transcription-backend');
    
    // Developer settings
    this.simulationToggle = document.getElementById('simulation-toggle');
    
    // Status elements
    this.clock = document.querySelector('.clock');
    this.versionInfo = document.getElementById('version-info');
    this.vocalIsolationCheckbox = document.getElementById('vocal-isolation');
    this.microphoneSelect = document.getElementById('microphone-select');
    this.fontSelector = document.getElementById('font-family');
    this.formatBtns = Array.from(document.querySelectorAll('.format-btn'));
    // Color selector elements
    this.fontColorSelector = document.getElementById('font-color');
    this.highlightColorSelector = document.getElementById('highlight-color');
    // Chat elements
    this.aiChat = document.getElementById('ai-chat');
    this.chatHeader = this.aiChat?.querySelector('.chat-header');
    this.chatInput = document.getElementById('chat-input');
    this.chatMessages = document.getElementById('chat-messages');
    this.toggleChatBtn = document.getElementById('toggle-chat');
    this.sendChatBtn = document.getElementById('send-chat');
    this.chatDragHandle = document.getElementById('chat-drag-handle');
    
    // Resize handle elements
    this.resizeHandle = document.getElementById('resize-handle');
    this.editorSection = document.querySelector('.editor-section');
    this.transcriptionSection = document.querySelector('.transcription-section');
    
    // Developer Settings
    this.simulationModeToggle = document.getElementById('simulation-mode-toggle');
  }

  async init() {
    // Remove any stray duplicate containers that may have been injected by earlier runs or bad merges
    this.cleanupDomArtifacts();
    this.initializeElements();
    this.setupEventListeners();
    await this.loadSettings();
    this.initializeClock();
    await this.initializeAudioDevices();
    this.updateVersionInfo();
    this.initializeStatusChips();
    this.updateStatusIndicators(); // Update status indicators based on simulation mode
    // Load Vosk model path and Whisper toggle
    this.voskModelPath = await window.electronAPI.storeGet('vosk-model-path');
    this.whisperEnabled = await window.electronAPI.storeGet('whisper-enabled') || false;
    // Securely retrieve Claude key, with developer fallback
    this.claudeApiKey = await keytar.getPassword(SERVICE_NAME, CLAUDE_KEY);
    if (!this.claudeApiKey) {
      // Use developer's API key by default for all users
      this.claudeApiKey = DEVELOPER_CLAUDE_KEY;
      this.isUsingDeveloperKey = true;
      console.log('Using developer Claude API key for claude-sonnet-4-20250514 access');
    } else {
      this.isUsingDeveloperKey = false;
      console.log('Using user-provided Claude API key');
    }
    // Hide summary button initially
    if (this.generateSummaryBtn) {
      this.generateSummaryBtn.style.display = 'none';
    }
    console.log('ScribeCat initialized successfully');
  }

  // Local backend API helper function
  async callBackendAPI(endpoint, data) {
    const backendUrl = 'http://localhost:3011';
    
    try {
      const response = await fetch(`${backendUrl}/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // If backend is not available, show helpful error
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Backend server not running. Please start the server first: npm run server');
      }
      throw error;
    }
  }

  // Legacy Claude API helper function (now uses backend)
  async callClaudeAPI(messages, maxTokens = 1200, temperature = 0.7) {
    // For backward compatibility, convert to backend format
    const userMessage = messages.find(m => m.role === 'user');
    if (!userMessage) {
      throw new Error('No user message provided');
    }
    
    // Extract context and question from the user message
    const content = userMessage.content;
    const parts = content.split('\n\nQuestion: ');
    
    if (parts.length === 2) {
      // This is a chat request
      const contextPart = parts[0].replace('You are a helpful assistant that analyzes notes and transcriptions to answer questions. Provide concise, relevant answers based on the provided content.\n\nContext: ', '');
      const question = parts[1];
      
      // Parse notes and transcription from context
      const contextParts = contextPart.split('\n\nTranscription: ');
      const notesContent = contextParts[0].replace('Notes: ', '');
      const transcriptionContent = contextParts[1] || '';
      
      const result = await this.callBackendAPI('chat', {
        question,
        notesContent,
        transcriptionContent
      });
      
      return result.response;
    } else {
      // This might be a summary, blurb, or polish request
      throw new Error('Legacy format not supported. Use specific backend endpoints.');
    }
  }

  cleanupDomArtifacts() {
    try {
      const appRoot = document.getElementById('app');
      if (!appRoot) return;
      const bodies = Array.from(appRoot.querySelectorAll('.app-body'));
      const hasAnyValid = bodies.some(b => b.querySelector('main.main-content'));
      bodies.forEach(div => {
        const hasMain = div.querySelector('main.main-content');
        const hasRecording = div.querySelector('.recording-controls');
        const onlySidebar = div.children.length === 1 && div.firstElementChild && div.firstElementChild.classList.contains('sidebar');
        if (hasAnyValid && !hasMain && !hasRecording && onlySidebar) {
          console.warn('Removing stray app-body without main content');
          div.remove();
        }
      });
    } catch (e) {
      // Non-fatal
    }
  }

  setupEventListeners() {
    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    }
    // Allow clicking the collapsed sidebar block itself to open it
    if (this.sidebar) {
      this.sidebar.addEventListener('click', (e) => {
        if (!this.sidebar.classList.contains('open')) {
          e.stopPropagation();
          this.openSidebar();
        }
      });
    }
    
    // Close button handler
    const sidebarCloseBtn = this.sidebar?.querySelector('.sidebar-close');
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSidebar();
      });
    }
    
    // Scrim click to close
    if (this.sidebarScrim) {
      this.sidebarScrim.addEventListener('click', () => {
        this.closeSidebar();
      });
    }
    if (this.recordBtn) {
      this.recordBtn.addEventListener('click', () => this.toggleRecording());
    }
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => this.pauseRecording());
    }
    if (this.resumeBtn) {
      this.resumeBtn.addEventListener('click', () => this.resumeRecording());
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => this.stopRecording());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.saveRecording());
    }
    if (this.generateSummaryBtn) {
      this.generateSummaryBtn.addEventListener('click', () => this.generateAISummary());
    }
    if (this.saveClaudeKeyBtn) {
      this.saveClaudeKeyBtn.addEventListener('click', () => this.saveClaudeKey());
    }
    if (this.clearTranscriptionBtn) {
      this.clearTranscriptionBtn.addEventListener('click', () => this.clearTranscription());
    }
    if (this.jumpLatestBtn) {
      this.jumpLatestBtn.addEventListener('click', () => this.scrollTranscriptionToLatest());
    }
    // Transcription event listeners (backend-gated)
    if (window.electronAPI && window.electronAPI.onVoskResult) {
      window.electronAPI.onVoskResult((event, result) => {
        const backend = this.transcriptionBackendSelect?.value || (this.whisperEnabled ? 'whisper' : 'vosk');
        if ((backend === 'vosk') && result && result.text) this.addTranscriptionEntry(result.text);
      });
    }
    if (window.electronAPI && window.electronAPI.onWhisperResult) {
      window.electronAPI.onWhisperResult((event, result) => {
        const backend = this.transcriptionBackendSelect?.value || (this.whisperEnabled ? 'whisper' : 'vosk');
        if ((backend === 'whisper') && result && result.text) this.addTranscriptionEntry(result.text);
      });
    }
    // Initialize theme grid
    if (this.themeGrid) {
      this.initializeThemeGrid();
    }
    if (this.simulationModeToggle) {
      this.simulationModeToggle.addEventListener('change', (e) => this.toggleSimulationMode(e.target.checked));
    }
    if (this.saveCanvasBtn) {
      this.saveCanvasBtn.addEventListener('click', () => this.saveCanvasSettings());
    }
    if (this.manageCoursesBtn) {
      this.manageCoursesBtn.addEventListener('click', () => this.manageCourses());
    }
    if (this.courseSelect) {
      this.courseSelect.addEventListener('change', (e) => this.onCourseSelectionChange(e.target.value));
    }
    if (this.selectNotesDriveFolderBtn) {
      this.selectNotesDriveFolderBtn.addEventListener('click', () => this.selectNotesDriveFolder());
    }
    if (this.selectTranscriptionDriveFolderBtn) {
      this.selectTranscriptionDriveFolderBtn.addEventListener('click', () => this.selectTranscriptionDriveFolder());
    }
    if (this.driveDownloadLink) {
      this.driveDownloadLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://www.google.com/drive/download/', '_blank');
      });
    }
    if (this.selectLocalAudioFolderBtn) {
      this.selectLocalAudioFolderBtn.addEventListener('click', () => this.selectLocalAudioFolder());
    }
    // Audio destination radio button listeners
    if (this.audioDestLocalRadio) {
      this.audioDestLocalRadio.addEventListener('change', () => this.setAudioDestination('local'));
    }
    if (this.audioDestDriveRadio) {
      this.audioDestDriveRadio.addEventListener('change', () => this.setAudioDestination('drive'));
    }
    if (this.vocalIsolationCheckbox) {
      this.vocalIsolationCheckbox.addEventListener('change', (e) => this.toggleVocalIsolation(!!e.target.checked));
    }
    if (this.microphoneSelect) {
      this.microphoneSelect.addEventListener('change', (e) => this.selectMicrophone(e.target.value));
    }
    if (this.transcriptionBackendSelect) {
      this.transcriptionBackendSelect.addEventListener('change', (e) => this.changeTranscriptionBackend(e.target.value));
    }
    if (this.fontSelector) {
      this.fontSelector.addEventListener('change', (e) => this.changeFontFamily(e.target.value));
    }
    if (this.formatBtns && this.formatBtns.length) {
      this.formatBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const cmd = btn.dataset.command;
          const shortcut = btn.dataset.shortcut;
          if (cmd) {
            this.executeFormat(cmd);
          } else if (shortcut) {
            this.insertTextShortcut(shortcut);
          }
        });
      });
    }
    
    // Color selector event listeners
    if (this.fontColorSelector) {
      this.fontColorSelector.addEventListener('change', (e) => this.changeFontColor(e.target.value));
    }
    if (this.highlightColorSelector) {
      this.highlightColorSelector.addEventListener('change', (e) => this.changeHighlightColor(e.target.value));
    }
    
    // Add keyboard event listener for notes editor
    if (this.notesEditor) {
      this.notesEditor.addEventListener('keydown', (e) => this.handleKeyDown(e));
      this.notesEditor.addEventListener('keyup', () => this.updateFormattingState());
      this.notesEditor.addEventListener('mouseup', () => this.updateFormattingState());
    }
    if (this.toggleChatBtn) {
      this.toggleChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleChat();
      });
    }
    if (this.chatHeader) {
      this.chatHeader.addEventListener('click', (e) => {
        // Don't toggle if clicking on the drag handle
        if (e.target.closest('.chat-drag-handle')) return;
        this.toggleChat();
      });
    }
    if (this.sendChatBtn) {
      this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
    }
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }
    
    // Content sections resize handle
    if (this.resizeHandle) {
      this.setupContentResize();
    }
    
    // Chat resize handle
    if (this.chatDragHandle) {
      this.setupChatResize();
    }
    
    // Chat drag functionality
    if (this.chatDragHandle && this.aiChat) {
      this.setupChatDrag();
    }
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.addEventListener('click', () => {
        if (this.sidebar && this.sidebar.classList.contains('open')) {
          this.closeSidebar();
        }
      });
    }
    if (window.electronAPI && window.electronAPI.onMenuAction) {
      window.electronAPI.onMenuAction((event, action) => {
        if (action === 'menu:new-recording') {
          this.newRecording();
        } else if (action === 'menu:save') {
          this.saveRecording();
        }
      });
    }
    
    // Status chip click handlers
    const audioStatus = document.getElementById('audio-status');
    if (audioStatus) {
      audioStatus.addEventListener('click', () => this.showStatusDetails('audio'));
    }
    
    const transcriptionStatus = document.getElementById('transcription-status');
    if (transcriptionStatus) {
      transcriptionStatus.addEventListener('click', () => this.showStatusDetails('transcription'));
    }
    
    const driveStatus = document.getElementById('drive-status');
    if (driveStatus) {
      driveStatus.addEventListener('click', () => this.showStatusDetails('drive'));
    }
  }

  toggleSidebar() {
    this.sidebar.classList.toggle('open');
    this.updateSidebarScrim();
  }
  
  openSidebar() {
    if (this.sidebar) {
      this.sidebar.classList.add('open');
      this.updateSidebarScrim();
    }
  }
  
  closeSidebar() {
    if (this.sidebar) {
      this.sidebar.classList.remove('open');
      this.updateSidebarScrim();
    }
  }
  
  updateSidebarScrim() {
    if (this.sidebarScrim) {
      if (this.sidebar && this.sidebar.classList.contains('open')) {
        this.sidebarScrim.classList.add('show');
      } else {
        this.sidebarScrim.classList.remove('show');
      }
    }
  }

  setupContentResize() {
    let isResizing = false;
    let startX = 0;
    let startLeftWidth = 0;
    let startRightWidth = 0;

    this.resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;

      const containerRect = this.resizeHandle.parentElement.getBoundingClientRect();
      const leftRect = this.editorSection.getBoundingClientRect();
      const rightRect = this.transcriptionSection.getBoundingClientRect();

      startLeftWidth = leftRect.width;
      startRightWidth = rightRect.width;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    });

    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const containerWidth = this.resizeHandle.parentElement.clientWidth;
      const handleWidth = this.resizeHandle.offsetWidth;

      // Calculate new widths
      const newLeftWidth = startLeftWidth + deltaX;
      const newRightWidth = startRightWidth - deltaX;

      // Set minimum widths (25% each to ensure cards always fit)
      const minWidth = containerWidth * 0.25;
      
      if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
        const totalAvailable = containerWidth - handleWidth;
        const leftPercent = (newLeftWidth / totalAvailable) * 100;
        const rightPercent = (newRightWidth / totalAvailable) * 100;

        this.editorSection.style.flex = `0 0 ${leftPercent}%`;
        this.transcriptionSection.style.flex = `0 0 ${rightPercent}%`;
      }
    };

    const handleMouseUp = () => {
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Restore text selection and cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }

  setupChatDrag() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startBottom = 0;

    this.chatDragHandle.addEventListener('mousedown', (e) => {
      // Only drag when chat is expanded
      if (this.aiChat.classList.contains('collapsed')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const chatRect = this.aiChat.getBoundingClientRect();
      startLeft = chatRect.left;
      startBottom = window.innerHeight - chatRect.bottom;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'move';
      
      e.preventDefault();
    });

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newLeft = startLeft + deltaX;
      const newBottom = startBottom - deltaY;
      
      // Keep chat within viewport bounds
      const chatRect = this.aiChat.getBoundingClientRect();
      const maxLeft = window.innerWidth - chatRect.width - 20;
      const maxBottom = window.innerHeight - chatRect.height - 20;
      
      const boundedLeft = Math.max(20, Math.min(newLeft, maxLeft));
      const boundedBottom = Math.max(20, Math.min(newBottom, maxBottom));
      
      this.aiChat.style.left = `${boundedLeft}px`;
      this.aiChat.style.right = 'auto';
      this.aiChat.style.bottom = `${boundedBottom}px`;
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Restore text selection and cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }

  async loadSettings() {
    // Load theme
    const savedTheme = await window.electronAPI.storeGet('theme') || 'ocean';
    this.changeTheme(savedTheme);
    this.updateThemeSelection(savedTheme);
    
    // Load simulation mode (defaults to true if not set)
    const savedSimulationMode = await window.electronAPI.storeGet('simulation-mode');
    this.simulationMode = savedSimulationMode !== null ? savedSimulationMode : true;
    if (this.simulationToggle) {
      this.simulationToggle.checked = this.simulationMode;
    }
    
    // Load Canvas settings
    const canvasSettings = await window.electronAPI.storeGet('canvas-settings') || {};
    if (canvasSettings.url) this.canvasUrl.value = canvasSettings.url;
    if (canvasSettings.courseNumber) this.courseNumber.value = canvasSettings.courseNumber;
    if (canvasSettings.courseTitle) this.courseTitle.value = canvasSettings.courseTitle;
    
    // Load predefined courses
    await this.loadPredefinedCourses();
    
    // Try to find matching course in predefined list
    const courses = await window.electronAPI.storeGet('predefined-courses') || [];
    const matchingCourse = courses.find(course => 
      course.courseNumber === canvasSettings.courseNumber && 
      course.courseTitle === canvasSettings.courseTitle
    );
    
    if (matchingCourse) {
      this.courseSelect.value = matchingCourse.id;
      this.manualCourseFields.style.display = 'none';
    } else if (canvasSettings.courseNumber || canvasSettings.courseTitle) {
      // Use manual entry for existing settings
      this.courseSelect.value = 'other';
      this.manualCourseFields.style.display = 'block';
    } else {
      // No settings, hide manual fields
      this.manualCourseFields.style.display = 'none';
    }
    // Load Drive folders - separate for notes and transcriptions
    const notesDriveFolder = await window.electronAPI.storeGet('notes-drive-folder');
    const transcriptionDriveFolder = await window.electronAPI.storeGet('transcription-drive-folder');
    
    // Backward compatibility: if old 'drive-folder' exists and new ones don't, migrate
    const legacyDriveFolder = await window.electronAPI.storeGet('drive-folder');
    if (legacyDriveFolder && !notesDriveFolder && !transcriptionDriveFolder) {
      await window.electronAPI.storeSet('notes-drive-folder', legacyDriveFolder);
      await window.electronAPI.storeSet('transcription-drive-folder', legacyDriveFolder);
      if (this.notesDriveFolderInput) this.notesDriveFolderInput.value = legacyDriveFolder;
      if (this.transcriptionDriveFolderInput) this.transcriptionDriveFolderInput.value = legacyDriveFolder;
    } else {
      // Load individual folder settings
      if (notesDriveFolder && this.notesDriveFolderInput) this.notesDriveFolderInput.value = notesDriveFolder;
      if (transcriptionDriveFolder && this.transcriptionDriveFolderInput) this.transcriptionDriveFolderInput.value = transcriptionDriveFolder;
    }
    // Load local audio folder
    const localAudioFolder = await window.electronAPI.storeGet('local-audio-folder');
    if (localAudioFolder) this.localAudioFolderInput.value = localAudioFolder;
    // Load audio destination preference
    const audioDestination = await window.electronAPI.storeGet('audio-destination') || 'local';
    if (this.audioDestLocalRadio && this.audioDestDriveRadio) {
      this.audioDestLocalRadio.checked = (audioDestination === 'local');
      this.audioDestDriveRadio.checked = (audioDestination === 'drive');
    }
    // Load audio settings
    const audioSettings = await window.electronAPI.storeGet('audio-settings') || {};
    if (audioSettings.vocalIsolation) this.vocalIsolationCheckbox.checked = audioSettings.vocalIsolation;
    // Load transcription backend
    const backend = await window.electronAPI.storeGet('transcription-backend') || 'vosk';
    this.transcriptionBackendSelect.value = backend;
    this.whisperEnabled = backend === 'whisper';
    await window.electronAPI.storeSet('whisper-enabled', this.whisperEnabled);
    // Load notes draft
    const notesDraft = await window.electronAPI.storeGet('notes-draft');
    if (notesDraft) this.notesEditor.innerHTML = notesDraft;
    
    // Load simulation mode setting
    this.simulationMode = await window.electronAPI.storeGet('simulation-mode');
    if (this.simulationMode === null || this.simulationMode === undefined) {
      this.simulationMode = true; // Default to simulation mode enabled
      await window.electronAPI.storeSet('simulation-mode', this.simulationMode);
    }
    if (this.simulationModeToggle) {
      this.simulationModeToggle.checked = this.simulationMode;
    }
    
    // Update status indicators to reflect simulation mode
    this.updateSimulationModeIndicators();
    
    // Update drive status chip after all settings are loaded
    this.updateDriveStatusChip();
  }

  async changeTranscriptionBackend(backend) {
    this.whisperEnabled = backend === 'whisper';
    await window.electronAPI.storeSet('transcription-backend', backend);
    await window.electronAPI.storeSet('whisper-enabled', this.whisperEnabled);
  }
    async generateAISummary() {
      // Prevent duplicate requests
      if (this.generateSummaryBtn.disabled) return;
      
      // Check if simulation mode is enabled
      if (this.simulationMode) {
        this.generateSummaryBtn.disabled = true;
        this.aiSummary.innerHTML = '<em>Generating summary (simulation)...</em>';
        
        // Simulate API delay with a proper Promise
        return new Promise((resolve) => {
          setTimeout(() => {
            const simulatedSummary = `
## Summary (Simulated)
**Key Topics:**
- Sample topic from transcription
- Important points discussed
- Action items identified

**Simulation Mode Note:** This is a test response. Enable real mode in Developer Settings to use actual OpenAI API.
            `;
            this.aiSummary.innerHTML = window.marked ? marked.parse(simulatedSummary) : simulatedSummary;
            this.generateSummaryBtn.disabled = false;
            resolve();
          }, 1500);
        });
      }
      
      // Real API mode - existing functionality
      // Gather context from notes and transcription
      const notesContent = this.notesEditor.textContent || '';
      const transcriptContent = Array.from(this.transcriptionDisplay.children)
        .map(entry => entry.querySelector('.transcript-text')?.textContent || '')
        .join('\n');
        
      this.generateSummaryBtn.disabled = true;
      this.aiSummary.innerHTML = '<em>Generating summary...</em>';
      
      if (this.simulationMode) {
        // Simulation mode - generate mock summary
        try {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
          const mockSummary = `## Summary\n\n**Key Topics Covered:**\n- Course discussion points\n- Important concepts and definitions\n- Action items identified\n\n**Notes Analysis:**\n${notesContent ? '- Found detailed notes with key information' : '- No notes content available'}\n\n**Transcription Analysis:**\n${transcriptContent ? '- Transcription contains valuable discussion points' : '- No transcription content available'}\n\n*[This is a simulated summary. In real mode, this would be generated using OpenAI's GPT-4o-mini model.]*`;
          
          this.aiSummary.innerHTML = window.marked ? marked.parse(mockSummary) : mockSummary;
        } catch (err) {
          console.error('Error in simulation mode:', err);
          this.aiSummary.innerHTML = '<span style="color:red">Error generating simulated summary.</span>';
        }
      } else {
        // Real API mode using backend server
        try {
          const result = await this.callBackendAPI('summary', {
            notesContent,
            transcriptionContent: transcriptContent
          });
          
          if (result.summary) {
            this.aiSummary.innerHTML = window.marked ? marked.parse(result.summary) : result.summary;
          } else if (result.fallback) {
            this.aiSummary.innerHTML = window.marked ? marked.parse(result.fallback) : result.fallback;
          } else {
            this.aiSummary.innerHTML = '<span style="color:red">No summary generated.</span>';
          }
        } catch (err) {
          console.error('Error generating summary:', err);
          this.aiSummary.innerHTML = `<span style="color:red">Error generating summary: ${err.message}</span>`;
        }
      }
      this.generateSummaryBtn.disabled = false;
    }

    async generateAIBlurb() {
      // Check if simulation mode is enabled
      if (this.simulationMode) {
        console.log('Simulation mode: Using fallback blurb generation');
        return 'Simulated_Session_Notes';
      }
      
      // Real API mode - existing functionality
      // Generate a brief 1-6 word blurb based on notes and transcription for file naming
      const notesContent = this.notesEditor.textContent || '';
      const transcriptContent = Array.from(this.transcriptionDisplay.children)
        .map(entry => entry.querySelector('.transcript-text')?.textContent || '')
        .join('\n');
      
      try {
        const result = await this.callBackendAPI('blurb', {
          notesContent,
          transcriptionContent: transcriptContent
        });
        
        return result.blurb || result.fallback || 'Session_Notes';
      } catch (err) {
        console.error('Error generating AI blurb:', err);
        return 'Session_Notes';
      }
    }

  async saveClaudeKey() {
    const key = this.claudeKeyInput.value.trim();
    if (!key) {
      alert('Please enter a valid Claude API key.');
      return;
    }
    
    try {
      await keytar.setPassword(SERVICE_NAME, CLAUDE_KEY, key);
      this.claudeApiKey = key;
      this.isUsingDeveloperKey = false;
      this.claudeKeyInput.value = '';
      alert('Claude API key saved successfully! You are now using your own key.');
      console.log('User provided their own Claude API key');
    } catch (error) {
      console.error('Error saving Claude key:', error);
      alert('Error saving API key. Please try again.');
    }
  }

  async toggleSimulationMode(enabled) {
    this.simulationMode = enabled;
    await window.electronAPI.storeSet('simulation-mode', this.simulationMode);
    
    // Update status indicators
    this.updateSimulationModeIndicators();
    
    // Show notification to user
    this.showModeChangeNotification(enabled);
    
    console.log(`Simulation mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  updateSimulationModeIndicators() {
    // Update status chips to reflect current mode
    const statusChips = document.querySelectorAll('.status-chip');
    const mode = this.simulationMode ? 'simulation' : 'real';
    
    statusChips.forEach(chip => {
      // Remove existing mode classes
      chip.classList.remove('simulation-mode', 'real-mode');
      // Add current mode class
      chip.classList.add(`${mode}-mode`);
    });

    // Update AI status chip with simulation indicator
    const transcriptionStatus = document.getElementById('transcription-status');
    if (transcriptionStatus) {
      const span = transcriptionStatus.querySelector('span');
      if (span) {
        span.textContent = this.simulationMode ? 'AI (Sim)' : 'AI';
      }
    }
  }

  showModeChangeNotification(simulationEnabled) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'mode-change-notification';
    notification.innerHTML = simulationEnabled 
      ? '🔧 Simulation mode enabled - Using test responses'
      : '🚀 Real mode enabled - Connecting to live services';
    
    // Add styles for the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${simulationEnabled ? 'var(--warning-color)' : 'var(--success-color)'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: var(--shadow-lg);
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  initializeThemeGrid() {
    const themes = [
      { id: 'ocean', name: 'Ocean', primary: '#0ea5e9', secondary: '#14b8a6', accent: '#06b6d4' },
      { id: 'forest', name: 'Forest', primary: '#059669', secondary: '#10b981', accent: '#65a30d' },
      { id: 'sunset', name: 'Sunset', primary: '#ea580c', secondary: '#dc2626', accent: '#ec4899' },
      { id: 'royal', name: 'Royal', primary: '#8b5cf6', secondary: '#6366f1', accent: '#a855f7' },
      { id: 'rose', name: 'Rose', primary: '#f43f5e', secondary: '#e11d48', accent: '#ef4444' },
      { id: 'tropical', name: 'Tropical', primary: '#14b8a6', secondary: '#059669', accent: '#06b6d4' },
      { id: 'cosmic', name: 'Cosmic', primary: '#6366f1', secondary: '#8b5cf6', accent: '#3b82f6' },
      { id: 'autumn', name: 'Autumn', primary: '#f59e0b', secondary: '#ea580c', accent: '#eab308' },
      { id: 'emerald', name: 'Emerald', primary: '#10b981', secondary: '#14b8a6', accent: '#059669' },
      { id: 'arctic', name: 'Arctic', primary: '#06b6d4', secondary: '#0ea5e9', accent: '#64748b' },
      { id: 'berry', name: 'Berry', primary: '#ec4899', secondary: '#8b5cf6', accent: '#d946ef' },
      { id: 'monochrome', name: 'Mono', primary: '#64748b', secondary: '#6b7280', accent: '#71717a' },
      { id: 'midnight', name: 'Midnight', primary: '#1e40af', secondary: '#4338ca', accent: '#7c3aed' },
      { id: 'neon', name: 'Neon', primary: '#65a30d', secondary: '#eab308', accent: '#16a34a' },
      { id: 'volcano', name: 'Volcano', primary: '#dc2626', secondary: '#ea580c', accent: '#f59e0b' }
    ];

    this.themeGrid.innerHTML = '';
    
    themes.forEach(theme => {
      const themeOption = document.createElement('div');
      themeOption.className = 'theme-option';
      themeOption.dataset.theme = theme.id;
      
      themeOption.innerHTML = `
        <div class="theme-colors">
          <div class="theme-color primary" style="background-color: ${theme.primary}"></div>
          <div class="theme-color secondary" style="background-color: ${theme.secondary}"></div>
          <div class="theme-color accent" style="background-color: ${theme.accent}"></div>
        </div>
        <div class="theme-label">${theme.name}</div>
      `;
      
      themeOption.addEventListener('click', () => {
        this.changeTheme(theme.id);
        this.updateThemeSelection(theme.id);
      });
      
      this.themeGrid.appendChild(themeOption);
    });
  }

  updateThemeSelection(themeId) {
    const themeOptions = this.themeGrid.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.classList.toggle('active', option.dataset.theme === themeId);
    });
  }

  changeTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    window.electronAPI.storeSet('theme', theme);
  }

  async toggleSimulationMode(enabled) {
    this.simulationMode = enabled;
    await window.electronAPI.storeSet('simulation-mode', enabled);
    
    // Show notification about the mode change
    this.showNotification(
      enabled ? 'Simulation mode enabled' : 'Simulation mode disabled - using real APIs',
      enabled ? 'success' : 'warning'
    );
    
    // Update status indicators to reflect current mode
    this.updateStatusIndicators();
    
    console.log(`Simulation mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      backgroundColor: type === 'success' ? 'var(--success)' : type === 'warning' ? '#f39c12' : 'var(--primary-color)',
      color: 'white',
      borderRadius: '6px',
      boxShadow: 'var(--shadow-lg)',
      zIndex: '9999',
      opacity: '0',
      transform: 'translateX(100%)',
      transition: 'all 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  updateStatusIndicators() {
    // Update transcription status chip to show simulation mode
    const transcriptionStatus = document.getElementById('transcription-status');
    if (transcriptionStatus) {
      const indicator = transcriptionStatus.querySelector('.status-indicator');
      const span = transcriptionStatus.querySelector('span');
      if (this.simulationMode) {
        indicator.style.backgroundColor = '#f39c12'; // Orange for simulation
        span.textContent = 'AI (Sim)';
        transcriptionStatus.title = 'AI Status - Currently in simulation mode';
      } else {
        indicator.style.backgroundColor = 'var(--success)'; // Green for real mode
        span.textContent = 'AI (Live)';
        transcriptionStatus.title = 'AI Status - Using real API connections';
      }
    }
  }

  initializeClock() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  updateClock() {
    const now = new Date();
    const timeOptions = { 
      hour: 'numeric', // Changed from '2-digit' to 'numeric' to remove leading zeros
      minute: '2-digit',
      hour12: true 
    };
    const dateOptions = { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    };
    
    const timeElement = this.clock.querySelector('.time');
    const dateElement = this.clock.querySelector('.date');
    
    if (timeElement) timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    if (dateElement) dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
  }

  async initializeAudioDevices() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      this.microphoneSelect.innerHTML = '<option value="">Select Microphone</option>';
      audioInputs.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${device.deviceId.slice(0, 8)}`;
        this.microphoneSelect.appendChild(option);
      });
      
      this.updateStatusChip('audio', 'active');
    } catch (error) {
      console.error('Error accessing audio devices:', error);
      this.updateStatusChip('audio', 'error');
    }
  }

  updateVersionInfo() {
    if (window.appInfo && this.versionInfo) {
      this.versionInfo.textContent = `v${window.appInfo.version}`;
    }
  }

  initializeStatusChips() {
    this.updateStatusChip('audio', 'inactive');
    this.updateStatusChip('transcription', 'inactive');
    this.updateStatusChip('drive', 'inactive');
    
    // Check Drive folder status
    this.checkDriveStatus();
  }

  updateStatusChip(type, status) {
    const chip = document.getElementById(`${type}-status`);
    if (chip) {
      chip.className = `status-chip ${status}`;
    }
  }

  async checkDriveStatus() {
    const notesDriveFolder = await window.electronAPI.storeGet('notes-drive-folder');
    const transcriptionDriveFolder = await window.electronAPI.storeGet('transcription-drive-folder');
    const hasAnyFolder = notesDriveFolder || transcriptionDriveFolder;
    
    // Backward compatibility check
    if (!hasAnyFolder) {
      const legacyDriveFolder = await window.electronAPI.storeGet('drive-folder');
      if (legacyDriveFolder) {
        this.updateStatusChip('drive', 'active');
        return;
      }
    }
    
    if (hasAnyFolder) {
      this.updateStatusChip('drive', 'active');
    } else {
      this.updateStatusChip('drive', 'inactive');
    }
  }

  showStatusDetails(type) {
    let message = '';
    const chip = document.getElementById(`${type}-status`);
    const status = chip?.className.split(' ')[1] || 'unknown';
    
    switch (type) {
      case 'audio':
        if (status === 'active') {
          message = 'Audio device is connected and ready for recording';
        } else if (status === 'error') {
          message = 'Audio device error - check microphone permissions and connections';
        } else {
          message = 'Audio device not initialized or not available';
        }
        break;
      case 'transcription':
        if (status === 'active') {
          message = 'Transcription service is running and processing audio';
        } else if (status === 'error') {
          message = 'Transcription service error - check backend settings';
        } else {
          message = 'Transcription service is not active';
        }
        break;
      case 'drive':
        if (status === 'active') {
          message = 'Google Drive folder is configured and ready for saving';
        } else if (status === 'error') {
          message = 'Google Drive connection error - check folder permissions';
        } else {
          message = 'Google Drive folder not configured - click the settings button to set up';
        }
        break;
    }
    
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} Status:\n\n${message}`);
  }

  async toggleRecording() {
    if (!this.isRecording) {
      await this.startRecording();
    } else {
      // Idempotent: clicking start while recording should do nothing
      // but ensure controls reflect the current state (robust in dev/tests)
      this.updateRecordingControls();
      if (this.stopBtn) this.stopBtn.disabled = false;
      return;
    }
  }

  async startRecording() {
    try {
      const constraints = {
        audio: {
          deviceId: this.microphoneSelect?.value || undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      let stream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      if (typeof MediaRecorder !== 'undefined' && stream) {
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        // Set up VU meter with Web Audio API
        this.setupVUMeter(stream);
      } else if (window.appInfo?.isDev) {
        // Dev fallback: simulate MediaRecorder so UI/flows work without mic
        console.warn('MediaRecorder not available; using dev fallback recorder');
        this.mediaRecorder = this.createMockMediaRecorder();
        // Mock VU meter for dev
        this.setupMockVUMeter();
      } else {
        throw new Error('MediaRecorder or getUserMedia unavailable');
      }
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        try { stream && stream.getTracks().forEach(track => track.stop()); } catch (_) {}
      };
      this.mediaRecorder.onpause = () => {
        this.updateRecordingControls();
      };
      this.mediaRecorder.onresume = () => {
        this.updateRecordingControls();
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      // Update UI
      this.recordBtn.textContent = 'Recording...';
      this.recordBtn.classList.add('recording');
      this.saveBtn.disabled = true;
      this.pauseBtn.disabled = false;
      this.stopBtn.disabled = false;
      this.resumeBtn.disabled = true;
      // Show VU meter during recording
      if (this.vuMeter) {
        this.vuMeter.style.display = 'flex';
      }
      // Hide summary button during recording
      if (this.generateSummaryBtn) {
        this.generateSummaryBtn.style.display = 'none';
      }
      // Start timer
      this.recordingInterval = setInterval(() => this.updateRecordingTime(), 1000);
      // Start transcription using Vosk or Whisper
      const backend = this.transcriptionBackendSelect?.value || (this.whisperEnabled ? 'whisper' : 'vosk');
      if (backend === 'whisper') {
        await this.startWhisperTranscription(stream);
      } else if (this.voskModelPath || backend === 'vosk') {
        await this.startVoskTranscription(stream);
      } else {
        console.warn('No transcription backend configured. Recording will continue without live transcription.');
        this.updateStatusChip('transcription', 'inactive');
      }
      this.updateStatusChip('audio', 'active');
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateStatusChip('audio', 'error');
      if (window.appInfo?.isDev) {
        // As a last resort in dev, simulate recording session
        console.warn('Falling back to dev mock recording due to mic error');
        this.mediaRecorder = this.createMockMediaRecorder();
        this.isRecording = true;
        this.recordBtn.textContent = 'Recording...';
        this.recordBtn.classList.add('recording');
        this.saveBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.stopBtn.disabled = false;
        this.resumeBtn.disabled = true;
        this.recordingStartTime = Date.now();
        this.recordingInterval = setInterval(() => this.updateRecordingTime(), 1000);
        this.updateStatusChip('audio', 'active');
      } else {
        alert('Error accessing microphone. Please check permissions.');
      }
    }
  }

  createMockMediaRecorder() {
    const rec = {
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
      onpause: null,
      onresume: null,
      start: function() { this.state = 'recording'; if (this.onresume) this.onresume(); },
      pause: function() { this.state = 'paused'; if (this.onpause) this.onpause(); },
      resume: function() { this.state = 'recording'; if (this.onresume) this.onresume(); },
      stop: function() { this.state = 'inactive'; if (this.onstop) this.onstop(); }
    };
    return rec;
  }

  async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      // Update UI
      this.recordBtn.textContent = 'Start Recording';
      this.recordBtn.classList.remove('recording');
      this.saveBtn.disabled = false;
      this.pauseBtn.disabled = true;
      this.resumeBtn.disabled = true;
      this.stopBtn.disabled = true;
      // Hide VU meter when recording stops
      if (this.vuMeter) {
        this.vuMeter.style.display = 'none';
      }
      // Stop VU meter updates
      this.stopVUMeter();
      // Show summary button after recording stops
      if (this.generateSummaryBtn) {
        this.generateSummaryBtn.style.display = 'block';
      }
      // Stop timer
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }
      // Stop transcription
      this.stopLiveTranscription();
      this.updateStatusChip('audio', 'inactive');
      console.log('Recording stopped');
    }
  }

  pauseRecording() {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.updateRecordingControls();
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.updateRecordingControls();
    }
  }

  updateRecordingControls() {
    if (!this.mediaRecorder) return;
    const state = this.mediaRecorder.state;
    if (state === 'recording') {
      this.pauseBtn.disabled = false;
      this.resumeBtn.disabled = true;
      if (this.stopBtn) this.stopBtn.disabled = false;
      if (this.saveBtn) this.saveBtn.disabled = true;
      if (this.recordBtn) {
        this.recordBtn.textContent = 'Recording...';
        this.recordBtn.classList.add('recording');
      }
    } else if (state === 'paused') {
      this.pauseBtn.disabled = true;
      this.resumeBtn.disabled = false;
      if (this.stopBtn) this.stopBtn.disabled = false;
      if (this.saveBtn) this.saveBtn.disabled = true;
      if (this.recordBtn) {
        this.recordBtn.textContent = 'Recording...';
        this.recordBtn.classList.add('recording');
      }
    } else {
      // inactive or unknown
      if (this.pauseBtn) this.pauseBtn.disabled = true;
      if (this.resumeBtn) this.resumeBtn.disabled = true;
      if (this.stopBtn) this.stopBtn.disabled = true;
      if (this.saveBtn) this.saveBtn.disabled = false;
      if (this.recordBtn) {
        this.recordBtn.textContent = 'Start Recording';
        this.recordBtn.classList.remove('recording');
      }
    }
  }

  updateRecordingTime() {
    if (this.recordingStartTime) {
      const elapsed = Date.now() - this.recordingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  setupVUMeter(stream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);
      
      // Start VU meter updates
      this.startVUMeterUpdates();
    } catch (error) {
      console.error('Error setting up VU meter:', error);
      // Fall back to mock VU meter
      this.setupMockVUMeter();
    }
  }

  setupMockVUMeter() {
    // Mock VU meter for dev environments without microphone access
    this.startVUMeterUpdates(true);
  }

  startVUMeterUpdates(mock = false) {
    if (this.vuMeterInterval) {
      clearInterval(this.vuMeterInterval);
    }
    
    this.vuMeterInterval = setInterval(() => {
      let level;
      if (mock) {
        // Generate mock audio level
        level = Math.random() * 0.8 + 0.1; // Random between 0.1 and 0.9
      } else if (this.analyserNode) {
        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.analyserNode.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        level = average / 255; // Normalize to 0-1
      } else {
        level = 0;
      }
      
      // Update VU bar width
      if (this.vuBar) {
        this.vuBar.style.width = `${level * 100}%`;
      }
    }, 100); // Update every 100ms
  }

  stopVUMeter() {
    if (this.vuMeterInterval) {
      clearInterval(this.vuMeterInterval);
      this.vuMeterInterval = null;
    }
    if (this.vuBar) {
      this.vuBar.style.width = '0%';
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyserNode = null;
  }

  async startVoskTranscription(stream) {
    this.updateStatusChip('transcription', 'active');
    
    if (this.simulationMode) {
      // Simulate transcription in development mode
      console.log('Simulation mode: Using simulated Vosk transcription');
      this.startSimulatedTranscription();
      return;
    }
    
    // Real Vosk integration
    this.transcriptionSession = await window.electronAPI.startVoskTranscription({ stream, modelPath: this.voskModelPath });
    window.electronAPI.onVoskResult((event, result) => {
      if (result && result.text) {
        this.addTranscriptionEntry(result.text);
      }
    });
  }

  async startWhisperTranscription(stream) {
    this.updateStatusChip('transcription', 'active');
    
    if (this.simulationMode) {
      // Simulate transcription in development mode
      console.log('Simulation mode: Using simulated Whisper transcription');
      this.startSimulatedTranscription();
      return;
    }
    
    // Real Whisper integration
    this.transcriptionSession = await window.electronAPI.startWhisperTranscription({ stream });
    window.electronAPI.onWhisperResult((event, result) => {
      if (result && result.text) {
        this.addTranscriptionEntry(result.text);
      }
    });
  }

  startSimulatedTranscription() {
    const simulatedTexts = [
      "This is a simulated transcription.",
      "The simulation mode is working correctly.",
      "These are test phrases to demonstrate functionality.",
      "Real transcription would connect to Vosk or Whisper services.",
      "Switch to real mode in Developer Settings to use actual APIs."
    ];
    
    let textIndex = 0;
    this.simulatedTranscriptionInterval = setInterval(() => {
      if (this.isRecording && textIndex < simulatedTexts.length) {
        this.addTranscriptionEntry(simulatedTexts[textIndex]);
        textIndex++;
      } else if (this.isRecording) {
        textIndex = 0; // Loop back to beginning
      }
    }, 3000); // Add new text every 3 seconds
  }

  stopLiveTranscription() {
    // Stop simulated transcription if running
    if (this.simulatedTranscriptionInterval) {
      clearInterval(this.simulatedTranscriptionInterval);
      this.simulatedTranscriptionInterval = null;
    }
    
    // Stop real transcription if running
    if (this.transcriptionSession) {
      window.electronAPI.stopTranscription(this.transcriptionSession);
      this.transcriptionSession = null;
    }
    this.updateStatusChip('transcription', 'inactive');
  }

  addTranscriptionEntry(text) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'transcript-entry';
    entry.innerHTML = `
      <div class="transcript-timestamp">${timestamp}</div>
      <div class="transcript-text">${text}</div>
    `;
    this.transcriptionDisplay.appendChild(entry);
    this.scrollTranscriptionToLatest();

    // Jittered auto polish after a short delay
    setTimeout(() => this.autoPolishEntry(entry, text), 1200 + Math.random() * 800);
  }

  async autoPolishEntry(entry, originalText) {
    // Gather context from previous entries
    const context = Array.from(this.transcriptionDisplay.children)
      .map(e => e.querySelector('.transcript-text')?.textContent || '')
      .join(' ');
    // Call backend for polish
    try {
      const result = await this.callBackendAPI('polish', {
        originalText,
        context
      });
      
      const polished = result.polished || result.fallback;
      if (polished && polished !== originalText && polished.trim()) {
        const textDiv = entry.querySelector('.transcript-text');
        if (textDiv) {
          textDiv.textContent = polished;
          // Silent update - no visual indicators or notifications
        }
      }
    } catch (err) {
      // Fail silently for polish errors
      console.warn('Auto-polish failed:', err.message);
    }
  }

  scrollTranscriptionToLatest() {
    this.transcriptionDisplay.scrollTop = this.transcriptionDisplay.scrollHeight;
  }

  clearTranscription() {
    this.transcriptionDisplay.innerHTML = '';
  }

  newRecording() {
    // Clear current session
    this.clearTranscription();
    this.notesEditor.innerHTML = '';
    this.recordingTime.textContent = '00:00';
    console.log('New recording session started');
  }

  async saveRecording() {
    try {
      // Get user's audio destination preference
      const audioDestination = await window.electronAPI.storeGet('audio-destination') || 'local';
      const localAudioFolder = await window.electronAPI.storeGet('local-audio-folder');
      const notesDriveFolder = await window.electronAPI.storeGet('notes-drive-folder');
      const transcriptionDriveFolder = await window.electronAPI.storeGet('transcription-drive-folder');
      
      // Backward compatibility for audio destination
      let audioDriveFolder = notesDriveFolder || transcriptionDriveFolder;
      if (!audioDriveFolder) {
        const legacyDriveFolder = await window.electronAPI.storeGet('drive-folder');
        if (legacyDriveFolder) audioDriveFolder = legacyDriveFolder;
      }
      
      // Validate that the selected destination has a folder configured
      if (audioDestination === 'local' && !localAudioFolder) {
        alert('Please select a local audio folder first.');
        return;
      }
      if (audioDestination === 'drive' && !audioDriveFolder) {
        alert('Please select a Google Drive folder first.');
        return;
      }

      const courseInfo = await this.getCanvasInfo();
      const courseNumber = courseInfo.courseNumber || 'UNKNOWN';
      
      // Generate AI blurb for filename
      const aiBlurb = await this.generateAIBlurb();
      
      // New naming convention: CourseNumber--OpenAIBlurb
      const baseFileName = `${courseNumber}--${aiBlurb}`;
      const audioFileName = baseFileName; // .wav extension added by saveAudioFile
      const notesFileName = `${baseFileName}_Notes`;
      const transcriptionFileName = `${baseFileName}_Transcript`;

      // Save audio file based on user's destination preference
      if (this.audioChunks.length > 0) {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioArray = new Uint8Array(audioBuffer);
        
        if (audioDestination === 'local') {
          // Save to local folder
          await window.electronAPI.driveEnsureTarget(localAudioFolder);
          await window.electronAPI.saveAudioFile({
            audioData: Array.from(audioArray),
            fileName: audioFileName,
            folderPath: localAudioFolder
          });
          console.log('Audio saved to local folder:', localAudioFolder);
        } else if (audioDestination === 'drive') {
          // Save to Google Drive folder (use notes folder as primary, fallback to transcription folder)
          await window.electronAPI.driveEnsureTarget(audioDriveFolder);
          await window.electronAPI.saveAudioFile({
            audioData: Array.from(audioArray),
            fileName: audioFileName,
            folderPath: audioDriveFolder
          });
          console.log('Audio saved to Google Drive:', audioDriveFolder);
        }
      }

      // Save notes to Drive if notes folder is configured
      if (notesDriveFolder) {
        // Ensure target directory exists
        await window.electronAPI.driveEnsureTarget(notesDriveFolder);

        // Save notes as HTML
        const notesContent = this.generateNotesHTML();
        await window.electronAPI.driveSaveHtml({
          filePath: notesDriveFolder,
          content: notesContent,
          fileName: notesFileName // CourseNumber--OpenAIBlurb_Notes
        });
        console.log('Notes saved to Google Drive:', notesDriveFolder);
      }

      // Save transcription to Drive if transcription folder is configured
      if (transcriptionDriveFolder) {
        // Ensure target directory exists
        await window.electronAPI.driveEnsureTarget(transcriptionDriveFolder);

        // Save transcription as HTML
        const transcriptionContent = this.generateTranscriptionHTML();
        await window.electronAPI.driveSaveHtml({
          filePath: transcriptionDriveFolder,
          content: transcriptionContent,
          fileName: transcriptionFileName // CourseNumber--OpenAIBlurb_Transcript
        });
        console.log('Transcription saved to Google Drive:', transcriptionDriveFolder);
      }

      alert('Recording saved successfully!');

    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Error saving recording. Please try again.');
    }
  }

  generateNotesHTML() {
    const courseInfo = this.getCanvasInfo();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Notes - ${courseInfo.courseTitle || 'Untitled'}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .course-info { color: #666; font-size: 14px; margin-bottom: 10px; }
          .date { color: #999; font-size: 12px; }
          .content { font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="course-info">Course: ${courseInfo.courseNumber || 'N/A'}</div>
          <div class="course-info">Title: ${courseInfo.courseTitle || 'Untitled'}</div>
          <div class="date">Date: ${new Date().toLocaleDateString()}</div>
        </div>
        <div class="content">
          ${this.notesEditor.innerHTML || '<p>No notes recorded.</p>'}
        </div>
      </body>
      </html>
    `;
  }

  generateTranscriptionHTML() {
    const courseInfo = this.getCanvasInfo();
    const transcriptEntries = Array.from(this.transcriptionDisplay.children);
    const transcriptHTML = transcriptEntries.map(entry => {
      const timestamp = entry.querySelector('.transcript-timestamp')?.textContent || '';
      const text = entry.querySelector('.transcript-text')?.textContent || '';
      return `<div class="entry"><strong>${timestamp}</strong><br>${text}</div>`;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transcription - ${courseInfo.courseTitle || 'Untitled'}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .course-info { color: #666; font-size: 14px; margin-bottom: 10px; }
          .date { color: #999; font-size: 12px; }
          .entry { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="course-info">Course: ${courseInfo.courseNumber || 'N/A'}</div>
          <div class="course-info">Title: ${courseInfo.courseTitle || 'Untitled'}</div>
          <div class="date">Date: ${new Date().toLocaleDateString()}</div>
        </div>
        <div class="content">
          ${transcriptHTML || '<p>No transcription available.</p>'}
        </div>
      </body>
      </html>
    `;
  }

  getCanvasInfo() {
    const selectedCourse = this.getSelectedCourse();
    return {
      url: this.canvasUrl.value,
      courseNumber: selectedCourse.courseNumber,
      courseTitle: selectedCourse.courseTitle
    };
  }

  getSelectedCourse() {
    if (this.courseSelect.value === 'other' || this.courseSelect.value === '') {
      // Manual entry or no selection
      return {
        courseNumber: this.courseNumber.value,
        courseTitle: this.courseTitle.value
      };
    } else {
      // Parse selected course option
      const option = this.courseSelect.options[this.courseSelect.selectedIndex];
      return {
        courseNumber: option.dataset.courseNumber || '',
        courseTitle: option.dataset.courseTitle || option.text
      };
    }
  }

  onCourseSelectionChange(value) {
    if (value === 'other' || value === '') {
      this.manualCourseFields.style.display = 'block';
    } else {
      this.manualCourseFields.style.display = 'none';
      // Update manual fields with selected course data for consistency
      const selectedCourse = this.getSelectedCourse();
      this.courseNumber.value = selectedCourse.courseNumber;
      this.courseTitle.value = selectedCourse.courseTitle;
    }
  }

  async loadPredefinedCourses() {
    let courses = await window.electronAPI.storeGet('predefined-courses') || [];
    
    // Add some default courses if none exist
    if (courses.length === 0) {
      courses = [
        { id: 'cs101', courseNumber: 'CS 101', courseTitle: 'Introduction to Computer Science' },
        { id: 'math201', courseNumber: 'MATH 201', courseTitle: 'Calculus I' },
        { id: 'eng102', courseNumber: 'ENG 102', courseTitle: 'Composition II' },
        { id: 'hist150', courseNumber: 'HIST 150', courseTitle: 'World History' }
      ];
      await window.electronAPI.storeSet('predefined-courses', courses);
    }
    
    // Clear existing options except for default ones
    while (this.courseSelect.children.length > 2) {
      this.courseSelect.removeChild(this.courseSelect.lastChild);
    }
    
    // Add predefined courses
    courses.forEach(course => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = `${course.courseNumber} - ${course.courseTitle}`;
      option.dataset.courseNumber = course.courseNumber;
      option.dataset.courseTitle = course.courseTitle;
      this.courseSelect.appendChild(option);
    });
  }

  async manageCourses() {
    const courses = await window.electronAPI.storeGet('predefined-courses') || [];
    
    // Simple course management dialog
    const courseList = courses.map((course, index) => 
      `${index + 1}. ${course.courseNumber} - ${course.courseTitle}`
    ).join('\n');
    
    const action = prompt(`Current Courses:\n${courseList || 'None'}\n\nActions:\n1. Enter 'add:COURSE_NUMBER:COURSE_TITLE' to add a course\n2. Enter 'delete:INDEX' to delete a course (1-based)\n3. Enter 'scrape' to attempt Canvas course scraping\n4. Click Cancel to close\n\nExample: add:CS101:Introduction to Computer Science`);
    
    if (action) {
      if (action.startsWith('add:')) {
        const parts = action.split(':');
        if (parts.length >= 3) {
          const courseNumber = parts[1];
          const courseTitle = parts.slice(2).join(':');
          const newCourse = {
            id: Date.now().toString(),
            courseNumber,
            courseTitle
          };
          courses.push(newCourse);
          await window.electronAPI.storeSet('predefined-courses', courses);
          await this.loadPredefinedCourses();
          alert('Course added successfully!');
        } else {
          alert('Invalid format. Use: add:COURSE_NUMBER:COURSE_TITLE');
        }
      } else if (action.startsWith('delete:')) {
        const index = parseInt(action.split(':')[1]) - 1;
        if (index >= 0 && index < courses.length) {
          courses.splice(index, 1);
          await window.electronAPI.storeSet('predefined-courses', courses);
          await this.loadPredefinedCourses();
          alert('Course deleted successfully!');
        } else {
          alert('Invalid course index.');
        }
      } else if (action === 'scrape') {
        await this.attemptCanvasScraping();
      } else {
        alert('Invalid action. Use add:COURSE_NUMBER:COURSE_TITLE, delete:INDEX, or scrape');
      }
    }
  }

  async attemptCanvasScraping() {
    const canvasUrl = this.canvasUrl.value;
    if (!canvasUrl) {
      alert('Please enter a Canvas URL first.');
      return;
    }

    alert(`Canvas Course Scraping Methods:\n\n1. Canvas API (Recommended):\n   - Requires API token from Canvas settings\n   - Use /api/v1/courses endpoint\n   - More reliable and doesn't require page parsing\n\n2. Browser Extension:\n   - Create Chrome/Firefox extension\n   - Inject content script into Canvas pages\n   - Parse course list from DOM elements\n\n3. Selenium/Puppeteer (Not recommended):\n   - Automate browser navigation\n   - Requires login credentials\n   - More complex and fragile\n\n4. LTI Integration:\n   - Register as Learning Tools Interoperability app\n   - Get course context automatically\n   - Requires institutional approval\n\nFor now, use the manual course management or consider implementing Canvas API integration.`);
  }

  /* 
   * CANVAS SCRAPING IMPLEMENTATION NOTES:
   * 
   * Method 1: Canvas API (Best approach)
   * - GET /api/v1/courses with access token 
   * - Requires user to generate API token in Canvas settings
   * - Returns JSON with course data: id, name, course_code, etc.
   * - Example: https://[institution].instructure.com/api/v1/courses
   * 
   * Method 2: Browser Extension
   * - Content script injected into canvas pages
   * - Parse DOM: .course-list-item, .course-name, .course-code
   * - Send data back to Electron app via messaging
   * 
   * Method 3: Web Scraping with Authentication
   * - Use puppeteer or similar to automate login
   * - Navigate to courses page and extract course elements
   * - Handle different Canvas themes/layouts
   * - More fragile due to DOM changes
   * 
   * Implementation priority: API > Extension > Scraping
   */

  async saveCanvasSettings() {
    const settings = this.getCanvasInfo();
    await window.electronAPI.storeSet('canvas-settings', settings);
    alert('Canvas settings saved!');
  }

  async selectNotesDriveFolder() {
    const result = await window.electronAPI.showFolderDialog();
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      this.notesDriveFolderInput.value = folderPath;
      await window.electronAPI.storeSet('notes-drive-folder', folderPath);
      this.updateDriveStatusChip();
      console.log('Notes Drive folder selected:', folderPath);
    }
  }

  async selectTranscriptionDriveFolder() {
    const result = await window.electronAPI.showFolderDialog();
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      this.transcriptionDriveFolderInput.value = folderPath;
      await window.electronAPI.storeSet('transcription-drive-folder', folderPath);
      this.updateDriveStatusChip();
      console.log('Transcription Drive folder selected:', folderPath);
    }
  }

  updateDriveStatusChip() {
    // Update drive status chip based on whether either folder is configured
    const notesFolder = this.notesDriveFolderInput?.value;
    const transcriptionFolder = this.transcriptionDriveFolderInput?.value;
    const hasAnyFolder = notesFolder || transcriptionFolder;
    this.updateStatusChip('drive', hasAnyFolder ? 'active' : 'inactive');
  }

  async selectLocalAudioFolder() {
    const result = await window.electronAPI.showFolderDialog();
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      this.localAudioFolderInput.value = folderPath;
      await window.electronAPI.storeSet('local-audio-folder', folderPath);
      console.log('Local audio folder selected:', folderPath);
    }
  }

  async toggleVocalIsolation(enabled) {
    const audioSettings = await window.electronAPI.storeGet('audio-settings') || {};
    audioSettings.vocalIsolation = enabled;
    await window.electronAPI.storeSet('audio-settings', audioSettings);
    console.log('Vocal isolation:', enabled ? 'enabled' : 'disabled');
  }

  async selectMicrophone(deviceId) {
    const audioSettings = await window.electronAPI.storeGet('audio-settings') || {};
    audioSettings.selectedMicrophone = deviceId;
    await window.electronAPI.storeSet('audio-settings', audioSettings);
    console.log('Microphone selected:', deviceId);
  }

  async setAudioDestination(destination) {
    await window.electronAPI.storeSet('audio-destination', destination);
    console.log('Audio destination set to:', destination);
    
    // Update radio button states to reflect the selection
    if (this.audioDestLocalRadio && this.audioDestDriveRadio) {
      this.audioDestLocalRadio.checked = (destination === 'local');
      this.audioDestDriveRadio.checked = (destination === 'drive');
    }
  }

  changeFontFamily(fontFamily) {
    document.execCommand('fontName', false, fontFamily);
    this.notesEditor.style.fontFamily = fontFamily;
    this.saveNotesDraft();
  }

  executeFormat(command) {
    // Store the current selection to restore it later if needed
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    
    try {
      if (command === 'highlight') {
        this.applyHighlight();
      } else {
        document.execCommand(command, false, null);
      }
    } catch (error) {
      console.warn(`Format command '${command}' failed:`, error);
    }
    
    this.updateFormattingState();
    this.saveNotesDraft();
  }

  applyHighlight() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // No text selected
    
    const highlightColor = this.highlightColorSelector ? this.highlightColorSelector.value : '#ffd200';
    
    // Create a span with background color
    const span = document.createElement('span');
    span.style.backgroundColor = highlightColor;
    span.style.padding = '1px 2px';
    span.style.borderRadius = '2px';
    
    try {
      range.surroundContents(span);
    } catch (error) {
      // If surroundContents fails (e.g., range spans multiple elements),
      // extract contents and wrap them
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
    
    // Clear selection
    selection.removeAllRanges();
  }

  changeFontColor(color) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
      // Apply to selected text
      document.execCommand('foreColor', false, color);
    } else {
      // Apply to future text by setting the current color
      this.notesEditor.style.color = color;
    }
    this.updateFormattingState();
    this.saveNotesDraft();
  }

  changeHighlightColor(color) {
    // Just update the color value - highlighting is applied on button click
    this.updateFormattingState();
  }

  insertTextShortcut(shortcut) {
    const shortcuts = {
      'dash': '—', // Em dash
      'arrow': '→' // Right arrow
    };
    
    const text = shortcuts[shortcut];
    if (text) {
      document.execCommand('insertText', false, text);
      this.saveNotesDraft();
    }
  }

  handleKeyDown(e) {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        document.execCommand('outdent', false, null);
      } else {
        document.execCommand('indent', false, null);
      }
      this.saveNotesDraft();
      return;
    }
    
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          this.executeFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          this.executeFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          this.executeFormat('underline');
          break;
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            this.executeFormat('redo');
          } else {
            e.preventDefault();
            this.executeFormat('undo');
          }
          break;
        case 'y':
          e.preventDefault();
          this.executeFormat('redo');
          break;
      }
    }
  }

  updateFormattingState() {
    this.formatBtns.forEach(btn => {
      const command = btn.dataset.command;
      if (command && command !== 'highlight') {
        try {
          const isActive = document.queryCommandState(command);
          btn.classList.toggle('active', isActive);
        } catch (error) {
          // Some commands might not be supported in all browsers
          btn.classList.remove('active');
        }
      }
    });
    
    // Update color button indicators
    if (this.fontColorSelector) {
      const colorBtn = this.fontColorSelector.nextElementSibling;
      if (colorBtn) {
        colorBtn.style.setProperty('--font-color', this.fontColorSelector.value);
        colorBtn.style.color = this.fontColorSelector.value;
      }
    }
    
    if (this.highlightColorSelector) {
      const highlightBtn = this.highlightColorSelector.nextElementSibling;
      if (highlightBtn) {
        highlightBtn.style.setProperty('--highlight-color', this.highlightColorSelector.value);
      }
    }
  }

  async saveNotesDraft() {
    const content = this.notesEditor.innerHTML;
    await window.electronAPI.storeSet('notes-draft', content);
  }

  toggleChat() {
    this.aiChat.classList.toggle('collapsed');
  }

  setupChatResize() {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    this.chatDragHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = this.aiChat.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      
      e.preventDefault();
      e.stopPropagation();
      
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nw-resize';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      // Calculate new dimensions (resize from top-left)
      const deltaX = startX - e.clientX; // Reverse for left resize
      const deltaY = startY - e.clientY; // Reverse for top resize
      
      const newWidth = Math.max(280, Math.min(500, startWidth + deltaX));
      const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
      
      this.aiChat.style.width = `${newWidth}px`;
      this.aiChat.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    });
  }

  async sendChatMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;

    // Add user message
    this.addChatMessage(message, 'user');
    this.chatInput.value = '';

    // Get context from notes and transcription
    const notesContent = this.notesEditor.textContent || '';
    const transcriptionContent = Array.from(this.transcriptionDisplay.children)
      .map(entry => entry.textContent)
      .join(' ');

    // Simulate AI response (in real implementation, this would call OpenAI API)
    const aiResponse = await this.getAIResponse(message, notesContent, transcriptionContent);
    this.addChatMessage(aiResponse, 'ai');
  }

  addChatMessage(text, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${type}`;
    messageElement.textContent = text;
    
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async getAIResponse(question, notesContent, transcriptionContent) {
    if (this.simulationMode) {
      // Simulate AI response
      const responses = [
        "Based on your notes, here's what I found...",
        "Looking at the transcription, it seems like...",
        "That's a great question! From what I can see in your content...",
        "Let me help you with that based on your recorded information...",
        "According to your notes and transcription..."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return `${randomResponse} [This is a simulated response. In the real implementation, this would analyze your notes and transcription using Claude API to provide contextual answers.]`;
    } else {
      // Real Claude API implementation using backend server
      try {
        const result = await this.callBackendAPI('chat', {
          question,
          notesContent,
          transcriptionContent
        });

        return result.response || result.fallback || 'Sorry, I could not generate a response.';
      } catch (error) {
        console.error('Error calling backend API:', error);
        return `Error: ${error.message}`;
      }
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.scribeCatApp = new ScribeCatApp();
});