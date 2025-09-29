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
    
    // Mode management
    this.currentMode = 'capture'; // 'capture' or 'study'
    this.recordingsData = [];
    this.currentRecording = null;
    
    // Audio playback for study mode
    this.reviewAudio = null;
    this.isReviewPlaying = false;
    
    this.init();
  }

  initializeElements() {
    // Mode toggle elements
    this.captureModeBtn = document.getElementById('capture-mode-btn');
    this.studyModeBtn = document.getElementById('study-mode-btn');
    this.captureMode = document.getElementById('capture-mode');
    this.studyMode = document.getElementById('study-mode');
    
    // Study mode elements
    this.recordingsListView = document.getElementById('recordings-list-view');
    this.recordingReviewView = document.getElementById('recording-review-view');
    this.recordingsList = document.getElementById('recordings-list');
    this.recordingsLoading = document.getElementById('recordings-loading');
    this.recordingsEmpty = document.getElementById('recordings-empty');
    this.recordingsCount = document.getElementById('recordings-count');
    this.backToListBtn = document.getElementById('back-to-list');
    
    // Review elements
    this.reviewCourseTitle = document.getElementById('review-course-title');
    this.reviewSessionInfo = document.getElementById('review-session-info');
    this.reviewPlayPause = document.getElementById('review-play-pause');
    this.reviewSkipBack = document.getElementById('review-skip-back');
    this.reviewSkipForward = document.getElementById('review-skip-forward');
    this.reviewCurrentTime = document.getElementById('review-current-time');
    this.reviewTotalTime = document.getElementById('review-total-time');
    this.reviewSeekBar = document.getElementById('review-seek-bar');
    this.reviewNotes = document.getElementById('review-notes');
    this.reviewTranscription = document.getElementById('review-transcription');
    
    // Core UI elements
    this.recordBtn = document.getElementById('record-btn');
    this.saveBtn = document.getElementById('save-btn');
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
    
    // Clear notes functionality
    this.clearNotesBtn = document.getElementById('clear-notes');
    this.clearNotesModal = document.getElementById('clear-notes-modal');
    this.clearNotesConfirm = document.getElementById('clear-notes-confirm');
    this.clearNotesCancel = document.getElementById('clear-notes-cancel');
    this.clearNotesModalClose = document.getElementById('clear-notes-modal-close');
    
    // Developer settings
    this.simulationToggle = document.getElementById('simulation-toggle');
    
    // Status elements
    this.clock = document.querySelector('.clock');
    this.versionInfo = document.getElementById('version-info');
    this.statusChips = document.getElementById('status-chips');
    
    // Health system elements
    this.healthIndicator = document.getElementById('health-indicator');
    this.healthTooltip = document.getElementById('health-tooltip');
    this.healthDialog = document.getElementById('health-dialog');
    this.healthDialogClose = document.getElementById('health-dialog-close');
    this.healthReportBug = document.getElementById('health-report-bug');
    this.healthSearch = document.getElementById('health-search');
    this.healthStatusList = document.getElementById('health-status-list');
    this.criticalStatusList = document.getElementById('critical-status-list');
    
    this.vocalIsolationCheckbox = document.getElementById('vocal-isolation');
    this.microphoneSelect = document.getElementById('microphone-select');
    this.fontSelector = document.getElementById('font-family');
    this.formatBtns = Array.from(document.querySelectorAll('.format-btn'));
    // Color selector elements
    this.fontColorSelector = document.getElementById('font-color');
    this.highlightColorSelector = document.getElementById('highlight-color');
    // Chat elements
    this.claudeFab = document.getElementById('claude-fab');
    this.aiChatPanel = document.getElementById('ai-chat-panel');
    this.chatInput = document.getElementById('chat-input');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatCloseBtn = document.getElementById('chat-close');
    this.sendChatBtn = document.getElementById('send-chat');
    
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
    
    // Load Vosk model path and Whisper toggle (only in Electron environment)
    try {
      if (window.electronAPI && window.electronAPI.storeGet) {
        this.voskModelPath = await window.electronAPI.storeGet('vosk-model-path');
        this.whisperEnabled = await window.electronAPI.storeGet('whisper-enabled') || false;
      }
    } catch (error) {
      console.log('Storage not available, using defaults');
    }
    
    // Securely retrieve Claude key, with developer fallback (only in Electron environment)
    try {
      if (typeof keytar !== 'undefined' && keytar.getPassword) {
        this.claudeApiKey = await keytar.getPassword(SERVICE_NAME, CLAUDE_KEY);
      }
    } catch (error) {
      console.log('Keytar not available in browser environment');
    }
    
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
    
    // Initialize mode system
    await this.initializeModeSystem();
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
    
    // Mode toggle event listeners
    if (this.captureModeBtn) {
      this.captureModeBtn.addEventListener('click', () => this.switchToMode('capture'));
    }
    if (this.studyModeBtn) {
      this.studyModeBtn.addEventListener('click', () => this.switchToMode('study'));
    }
    
    // Study mode event listeners
    if (this.backToListBtn) {
      this.backToListBtn.addEventListener('click', () => this.showRecordingsList());
    }
    if (this.reviewPlayPause) {
      this.reviewPlayPause.addEventListener('click', () => this.toggleReviewPlayback());
    }
    if (this.reviewSkipBack) {
      this.reviewSkipBack.addEventListener('click', () => this.skipReviewAudio(-10));
    }
    if (this.reviewSkipForward) {
      this.reviewSkipForward.addEventListener('click', () => this.skipReviewAudio(30));
    }
    if (this.reviewSeekBar) {
      this.reviewSeekBar.addEventListener('input', (e) => this.seekReviewAudio(e.target.value));
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
    // Claude FAB click to expand
    if (this.claudeFab) {
      this.claudeFab.addEventListener('click', (e) => {
        e.stopPropagation();
        this.expandChatPanel();
      });
    }
    
    // Chat close button
    if (this.chatCloseBtn) {
      this.chatCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.collapseChatPanel();
      });
    }
    
    // Send chat message
    if (this.sendChatBtn) {
      this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
    }
    
    // Chat input enter key
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }
    
    // Click outside to close chat panel
    document.addEventListener('click', (e) => {
      if (this.aiChatPanel && this.aiChatPanel.classList.contains('expanded')) {
        if (!e.target.closest('.ai-chat-container')) {
          this.collapseChatPanel();
        }
      }
    });
    
    // Content sections resize handle
    if (this.resizeHandle) {
      this.setupContentResize();
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
      window.electronAPI.onMenuAction((event, action, param) => {
        switch (action) {
          case 'menu:new-recording':
            this.newRecording();
            break;
          case 'menu:open-recording':
            this.showStatus('Open Recording feature coming soon!');
            break;
          case 'menu:save':
            this.saveRecording();
            break;
          case 'menu:find':
            this.openFindDialog();
            break;
          case 'menu:find-next':
            this.findNext();
            break;
          case 'menu:find-previous':
            this.findPrevious();
            break;
          case 'menu:format':
            this.executeFormat(param);
            break;
          case 'menu:insert-timestamp':
            this.insertTimestamp();
            break;
          case 'menu:toggle-recording':
            this.toggleRecording();
            break;
          case 'menu:pause-resume':
            if (this.isRecording) {
              if (this.pauseBtn && !this.pauseBtn.disabled) {
                this.pauseRecording();
              } else if (this.resumeBtn && !this.resumeBtn.disabled) {
                this.resumeRecording();
              }
            }
            break;
          case 'menu:quick-restart':
            if (this.isRecording) {
              this.stopRecording();
              setTimeout(() => this.startRecording(), 100);
            } else {
              this.startRecording();
            }
            break;
          case 'menu:ai-summary':
            this.generateAISummary();
            break;
          case 'menu:toggle-highlighter':
            this.toggleHighlighterMode();
            break;
          case 'menu:clear-notes':
            this.showClearNotesModal();
            break;
          case 'menu:focus-panel':
            this.focusPanel(param);
            break;
          case 'menu:settings':
            this.openSettings();
            break;
          case 'menu:keyboard-shortcuts':
            this.showKeyboardShortcutsHelp();
            break;
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
    
    // Clear notes functionality
    if (this.clearNotesBtn) {
      this.clearNotesBtn.addEventListener('click', () => this.showClearNotesModal());
    }
    
    if (this.clearNotesConfirm) {
      this.clearNotesConfirm.addEventListener('click', () => this.confirmClearNotes());
    }
    
    if (this.clearNotesCancel) {
      this.clearNotesCancel.addEventListener('click', () => this.hideClearNotesModal());
    }
    
    if (this.clearNotesModalClose) {
      this.clearNotesModalClose.addEventListener('click', () => this.hideClearNotesModal());
    }
    
    // Health system event listeners
    if (this.healthIndicator) {
      this.healthIndicator.addEventListener('click', () => this.showHealthDialog());
      this.healthIndicator.addEventListener('mouseenter', () => this.showHealthTooltip());
      this.healthIndicator.addEventListener('mouseleave', () => this.hideHealthTooltip());
    }
    
    if (this.healthDialogClose) {
      this.healthDialogClose.addEventListener('click', () => this.hideHealthDialog());
    }
    
    if (this.healthReportBug) {
      this.healthReportBug.addEventListener('click', () => this.reportBugFromHealth());
    }
    
    if (this.healthSearch) {
      this.healthSearch.addEventListener('input', (e) => this.filterHealthStatus(e.target.value));
    }
    
    // Close health dialog when clicking outside
    if (this.healthDialog) {
      this.healthDialog.addEventListener('click', (e) => {
        if (e.target === this.healthDialog) {
          this.hideHealthDialog();
        }
      });
    }
    
    // Setup global keyboard shortcuts
    this.setupGlobalKeyboardShortcuts();
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

  setupGlobalKeyboardShortcuts() {
    // Global keyboard shortcut handler
    document.addEventListener('keydown', (e) => {
      // Check if we're in an input field (but not the contenteditable notes editor)
      const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
                       e.target.tagName === 'SELECT' || e.target.isContentEditable && e.target !== this.notesEditor;
      
      // Handle Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        this.handleEscapeKey();
        return;
      }

      // Handle Alt+F4 for Windows
      if (e.altKey && e.key === 'F4' && navigator.platform.toLowerCase().includes('win')) {
        e.preventDefault();
        this.quitApplication();
        return;
      }

      // Handle modifier-based shortcuts
      if (e.ctrlKey || e.metaKey) {
        const handled = this.handleGlobalShortcut(e, isInInput);
        if (handled) {
          e.preventDefault();
        }
      }
    });
  }

  handleEscapeKey() {
    // Close modals and dialogs
    if (this.clearNotesModal && this.clearNotesModal.style.display !== 'none') {
      this.hideClearNotesModal();
      return;
    }
    
    // Close chat panel if expanded
    if (this.aiChatPanel && this.aiChatPanel.classList.contains('expanded')) {
      this.collapseChatPanel();
      return;
    }

    // Close sidebar if open
    if (this.sidebar && this.sidebar.classList.contains('open')) {
      this.closeSidebar();
      return;
    }

    // If find dialog exists, close it
    if (this.findDialog && this.findDialog.style.display !== 'none') {
      this.closeFindDialog();
      return;
    }
  }

  handleGlobalShortcut(e, isInInput) {
    const key = e.key.toLowerCase();
    
    // Document Management Shortcuts
    if (key === 'n' && !e.shiftKey) {
      this.newRecording();
      return true;
    }
    
    if (key === 'o' && !e.shiftKey) {
      // Placeholder for open recording functionality
      this.showStatus('Open Recording feature coming soon!');
      return true;
    }
    
    if (key === 's' && !e.shiftKey) {
      this.saveRecording();
      this.showSaveIndicator();
      return true;
    }

    // Recording Control Shortcuts
    if (key === 'r' && !e.shiftKey) {
      this.toggleRecording();
      return true;
    }
    
    if (key === 'r' && e.shiftKey) {
      // Quick restart (stop current and start new)
      if (this.isRecording) {
        this.stopRecording();
        setTimeout(() => this.startRecording(), 100);
      } else {
        this.startRecording();
      }
      return true;
    }
    
    if (key === 'p' && !e.shiftKey) {
      if (this.isRecording) {
        if (this.pauseBtn && !this.pauseBtn.disabled) {
          this.pauseRecording();
        } else if (this.resumeBtn && !this.resumeBtn.disabled) {
          this.resumeRecording();
        }
      }
      return true;
    }

    // Navigation shortcuts
    if (key === 'f' && !e.shiftKey) {
      this.openFindDialog();
      return true;
    }

    if (key === 'g') {
      if (e.shiftKey) {
        this.findPrevious();
      } else {
        this.findNext();
      }
      return true;
    }

    if (key === 'tab' && !e.shiftKey && !isInInput) {
      this.switchToNextPanel();
      return true;
    }

    // Panel focus shortcuts (numbers 1-4)
    if (['1', '2', '3', '4'].includes(key) && !isInInput) {
      this.focusPanel(parseInt(key));
      return true;
    }

    // Special feature shortcuts
    if (key === 't' && !e.shiftKey && !isInInput) {
      this.insertTimestamp();
      return true;
    }

    if (key === 's' && e.shiftKey) {
      this.generateAISummary();
      return true;
    }

    if (key === 'h' && e.shiftKey && !isInInput) {
      this.toggleHighlighterMode();
      return true;
    }

    // Clear all notes (Ctrl+Shift+Delete)
    if (e.shiftKey && e.key === 'Delete') {
      this.showClearNotesModal();
      return true;
    }

    // Text editing shortcuts (only when not in input fields)
    if (!isInInput) {
      if (key === 'a' && !e.shiftKey) {
        this.selectAllNotes();
        return true;
      }

      if (key === 'x' && !e.shiftKey) {
        this.cutText();
        return true;
      }

      if (key === 'c' && !e.shiftKey) {
        this.copyText();
        return true;
      }

      if (key === 'v' && !e.shiftKey) {
        this.pasteText();
        return true;
      }

      if (key === 'd' && !e.shiftKey) {
        this.duplicateLine();
        return true;
      }
    }

    // Window and application shortcuts
    if (key === 'w' && !e.shiftKey) {
      // Close window (if multiple windows supported)
      this.closeWindow();
      return true;
    }

    if (key === 'q' && !e.shiftKey && (navigator.platform.toLowerCase().includes('mac') || e.metaKey)) {
      this.quitApplication();
      return true;
    }

    if (key === ',' && !e.shiftKey) {
      this.openSettings();
      return true;
    }

    // Help shortcut
    if ((key === '?' || key === '/') && e.shiftKey) {
      this.showKeyboardShortcutsHelp();
      return true;
    }

    // F11 for fullscreen
    if (e.key === 'F11') {
      this.toggleFullscreen();
      return true;
    }

    return false;
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

  expandChatPanel() {
    if (!this.aiChatPanel || !this.claudeFab) return;
    
    // Add expanding animation class to FAB
    this.claudeFab.classList.add('expanding');
    
    // Expand the chat panel with animation
    setTimeout(() => {
      this.aiChatPanel.classList.add('expanded');
    }, 150);
    
    // Focus the chat input after animation
    setTimeout(() => {
      if (this.chatInput) {
        this.chatInput.focus();
      }
    }, 400);
  }

  collapseChatPanel() {
    if (!this.aiChatPanel || !this.claudeFab) return;
    
    // Collapse the chat panel
    this.aiChatPanel.classList.remove('expanded');
    
    // Remove expanding class from FAB after panel is hidden
    setTimeout(() => {
      this.claudeFab.classList.remove('expanding');
    }, 400);
  }

  async loadSettings() {
    // Only load settings if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.storeGet) {
      console.log('Running in browser environment, skipping settings load');
      // Set default theme for browser testing
      this.changeTheme('ocean');
      return;
    }
    
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
      if (canvasSettings.url && this.canvasUrl) this.canvasUrl.value = canvasSettings.url;
      if (canvasSettings.courseNumber && this.courseNumber) this.courseNumber.value = canvasSettings.courseNumber;
      if (canvasSettings.courseTitle && this.courseTitle) this.courseTitle.value = canvasSettings.courseTitle;
      
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
    
    // Load highlighter color preference
    const savedHighlightColor = await window.electronAPI.storeGet('highlight-color');
    if (savedHighlightColor && this.highlightColorSelector) {
      this.highlightColorSelector.value = savedHighlightColor;
      this.updateHighlighterButtonColor(savedHighlightColor);
    }
    
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
      
      // Gather context from notes and transcription
      const notesContent = this.notesEditor.textContent || '';
      const transcriptContent = Array.from(this.transcriptionDisplay.children)
        .map(entry => entry.querySelector('.transcript-text')?.textContent || '')
        .join('\n');
        
      this.generateSummaryBtn.disabled = true;
      
      // Add loading indicator to the separate container
      this.aiSummary.innerHTML = '<em>Generating summary...</em>';
      
      let summaryMarkdown = '';
      let summaryHtml = '';
      
      if (this.simulationMode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate formatted simulated summary
        summaryMarkdown = `## **AI Summary**

**Key Topics:**
- *Sample topic from transcription*
- **Important concepts** and definitions
- Action items identified

**Notes Analysis:**
${notesContent ? '- Found detailed notes with **key information**' : '- No notes content available'}

**Transcription Analysis:**
${transcriptContent ? '- Transcription contains *valuable discussion points*' : '- No transcription content available'}

*[This is a simulated summary. Enable real mode in Developer Settings to use actual Claude API.]*

**Simulation Mode Note:** This is a test response. Enable real mode in Developer Settings to use actual OpenAI API.`;
        
        summaryHtml = window.marked ? marked.parse(summaryMarkdown) : summaryMarkdown;
      } else {
        // Real API mode using backend server
        try {
          const result = await this.callBackendAPI('summary', {
            notesContent,
            transcriptionContent: transcriptContent
          });
          
          if (result.summary) {
            summaryMarkdown = result.summary;
            summaryHtml = window.marked ? marked.parse(result.summary) : result.summary;
          } else if (result.fallback) {
            summaryMarkdown = result.fallback;
            summaryHtml = window.marked ? marked.parse(result.fallback) : result.fallback;
          } else {
            summaryMarkdown = '**Error:** No summary generated.';
            summaryHtml = '<span style="color:red">No summary generated.</span>';
          }
        } catch (err) {
          console.error('Error generating summary:', err);
          summaryMarkdown = `**Error:** ${err.message}`;
          summaryHtml = `<span style="color:red">Error generating summary: ${err.message}</span>`;
        }
      }
      
      // Place in both locations: the traditional container for compatibility and in notes editor for enhancement
      this.aiSummary.innerHTML = summaryHtml;
      
      // Insert horizontal line and summary into notes editor for new feature
      this.insertAISummaryIntoEditor(summaryMarkdown);
      
      this.generateSummaryBtn.disabled = false;
    }

    insertAISummaryIntoEditor(summaryMarkdown) {
      // Create cursor position at end of current content
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Move cursor to end of notes editor
      this.notesEditor.focus();
      range.selectNodeContents(this.notesEditor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Insert horizontal line separator
      const hr = document.createElement('hr');
      hr.style.margin = '20px 0';
      hr.style.border = 'none';
      hr.style.borderTop = '2px solid #ccc';
      
      // Create AI summary container with visual distinction
      const summaryDiv = document.createElement('div');
      summaryDiv.className = 'ai-generated-content';
      summaryDiv.style.padding = '15px';
      summaryDiv.style.marginTop = '10px';
      summaryDiv.style.backgroundColor = '#f8fafc';
      summaryDiv.style.border = '1px solid #e2e8f0';
      summaryDiv.style.borderRadius = '6px';
      summaryDiv.style.position = 'relative';
      
      // Add AI indicator badge
      const aiIndicator = document.createElement('div');
      aiIndicator.textContent = 'AI Generated';
      aiIndicator.style.position = 'absolute';
      aiIndicator.style.top = '-8px';
      aiIndicator.style.right = '10px';
      aiIndicator.style.fontSize = '10px';
      aiIndicator.style.backgroundColor = '#6366f1';
      aiIndicator.style.color = 'white';
      aiIndicator.style.padding = '2px 6px';
      aiIndicator.style.borderRadius = '3px';
      aiIndicator.style.fontWeight = '500';
      
      // Convert markdown to HTML and insert
      const summaryHtml = window.marked ? marked.parse(summaryMarkdown) : summaryMarkdown.replace(/\n/g, '<br>');
      summaryDiv.innerHTML = summaryHtml;
      summaryDiv.appendChild(aiIndicator);
      
      // Insert elements at cursor position
      const currentRange = selection.getRangeAt(0);
      currentRange.deleteContents();
      
      // Add some spacing before the HR if there's existing content
      if (this.notesEditor.textContent.trim()) {
        const spacer = document.createElement('div');
        spacer.innerHTML = '<br><br>';
        currentRange.insertNode(spacer);
        currentRange.collapse(false);
      }
      
      currentRange.insertNode(hr);
      currentRange.collapse(false);
      currentRange.insertNode(summaryDiv);
      
      // Move cursor to end and save
      range.selectNodeContents(this.notesEditor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      this.saveNotesDraft();
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
    if (window.electronAPI && window.electronAPI.storeSet) {
      window.electronAPI.storeSet('theme', theme);
    }
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
    // Show status chips only in development mode
    if (this.statusChips && window.appInfo?.isDev) {
      this.statusChips.style.display = 'flex';
      this.updateStatusChip('audio', 'inactive');
      this.updateStatusChip('transcription', 'inactive');
      this.updateStatusChip('drive', 'inactive');
      
      // Check Drive folder status
      this.checkDriveStatus();
    } else if (this.statusChips) {
      this.statusChips.style.display = 'none';
    }
    
    // Initialize health system
    this.initializeHealthSystem();
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
  
  showClearNotesModal() {
    if (this.clearNotesModal) {
      this.clearNotesModal.style.display = 'flex';
    }
  }
  
  hideClearNotesModal() {
    if (this.clearNotesModal) {
      this.clearNotesModal.style.display = 'none';
    }
  }
  
  confirmClearNotes() {
    if (this.notesEditor) {
      this.notesEditor.innerHTML = '';
      // Also clear the AI summary if it exists
      const aiSummary = document.getElementById('ai-summary');
      if (aiSummary) {
        aiSummary.innerHTML = '';
      }
    }
    this.hideClearNotesModal();
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

  async changeHighlightColor(color) {
    // Save color preference
    await window.electronAPI.storeSet('highlight-color', color);
    // Update button visual indicator
    this.updateHighlighterButtonColor(color);
    this.updateFormattingState();
  }

  updateHighlighterButtonColor(color) {
    if (this.highlightColorSelector) {
      const highlightBtn = this.highlightColorSelector.nextElementSibling;
      if (highlightBtn) {
        // Update the button's visual indicator and tooltip
        highlightBtn.style.setProperty('--highlight-color', color);
        const colorName = this.getColorName(color);
        highlightBtn.title = `Highlight text (current: ${colorName})`;
      }
    }
  }

  getColorName(hex) {
    const colorNames = {
      '#ffd200': 'Yellow',
      '#ffff00': 'Bright Yellow',
      '#ffa500': 'Orange',
      '#ff69b4': 'Pink',
      '#00ff00': 'Green',
      '#00ffff': 'Cyan',
      '#0000ff': 'Blue',
      '#8a2be2': 'Purple',
      '#ff0000': 'Red',
      '#ffffff': 'White',
      '#000000': 'Black'
    };
    return colorNames[hex.toLowerCase()] || hex.toUpperCase();
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
    // Handle Tab key for standard tab character insertion (like Word)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey) {
        // Insert a standard tab character at cursor position
        document.execCommand('insertText', false, '\t');
      } else {
        // For Shift+Tab, remove one tab character before cursor if present
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.collapsed && range.startOffset > 0) {
            const textNode = range.startContainer;
            if (textNode.nodeType === Node.TEXT_NODE) {
              const text = textNode.textContent;
              const cursorPos = range.startOffset;
              if (text[cursorPos - 1] === '\t') {
                range.setStart(textNode, cursorPos - 1);
                range.deleteContents();
              }
            }
          }
        }
      }
      this.saveNotesDraft();
      return;
    }
    
    // Handle keyboard shortcuts for text formatting when in notes editor
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
        case 'a':
          // Let selectAll work normally in notes editor
          break;
        case 'x':
          // Let cut work normally in notes editor
          setTimeout(() => this.saveNotesDraft(), 10);
          break;
        case 'v':
          // Let paste work normally in notes editor
          setTimeout(() => this.saveNotesDraft(), 10);
          break;
        case 'c':
          // Let copy work normally in notes editor
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

  // Keyboard Shortcut Handler Methods
  showSaveIndicator() {
    // Create a temporary save indicator
    const indicator = document.createElement('div');
    indicator.textContent = 'Saved!';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #22c55e;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 1000;
      font-size: 14px;
      font-weight: 500;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 1500);
  }

  showStatus(message, type = 'info') {
    // Create a temporary status indicator
    const colors = {
      info: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    
    const indicator = document.createElement('div');
    indicator.textContent = message;
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 1000;
      font-size: 14px;
      font-weight: 500;
      transition: opacity 0.3s ease;
      max-width: 300px;
    `;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 2500);
  }

  openFindDialog() {
    // Create find dialog if it doesn't exist
    if (!this.findDialog) {
      this.createFindDialog();
    }
    this.findDialog.style.display = 'flex';
    this.findInput.focus();
  }

  createFindDialog() {
    this.findDialog = document.createElement('div');
    this.findDialog.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      display: none;
      flex-direction: column;
      gap: 8px;
      min-width: 300px;
    `;

    this.findDialog.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="text" placeholder="Find in notes..." style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        <button type="button" style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Find</button>
        <button type="button" style="padding: 8px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
      <div style="display: flex; gap: 8px; font-size: 12px;">
        <label><input type="checkbox"> Case sensitive</label>
        <span id="find-results" style="margin-left: auto; color: #666;"></span>
      </div>
    `;

    this.findInput = this.findDialog.querySelector('input[type="text"]');
    this.findResults = this.findDialog.querySelector('#find-results');
    this.caseSensitiveCheckbox = this.findDialog.querySelector('input[type="checkbox"]');
    
    // Find button
    this.findDialog.querySelector('button:first-of-type').addEventListener('click', () => this.performFind());
    
    // Close button
    this.findDialog.querySelector('button:last-of-type').addEventListener('click', () => this.closeFindDialog());
    
    // Enter key in input
    this.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.performFind();
      } else if (e.key === 'Escape') {
        this.closeFindDialog();
      }
    });

    // Real-time search
    this.findInput.addEventListener('input', () => this.performFind());

    document.body.appendChild(this.findDialog);
  }

  closeFindDialog() {
    if (this.findDialog) {
      this.findDialog.style.display = 'none';
      this.clearHighlights();
    }
  }

  performFind() {
    if (!this.findInput.value.trim()) {
      this.clearHighlights();
      this.findResults.textContent = '';
      return;
    }

    const searchText = this.findInput.value;
    const caseSensitive = this.caseSensitiveCheckbox.checked;
    const content = this.notesEditor.textContent;
    
    if (!content) {
      this.findResults.textContent = 'No results';
      return;
    }

    // Clear previous highlights
    this.clearHighlights();

    // Find matches
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches = content.match(regex);
    
    if (matches) {
      this.findResults.textContent = `${matches.length} found`;
      this.highlightMatches(searchText, caseSensitive);
      this.currentFindIndex = 0;
      this.findMatches = matches;
    } else {
      this.findResults.textContent = 'No results';
      this.findMatches = [];
    }
  }

  highlightMatches(searchText, caseSensitive) {
    const walker = document.createTreeWalker(
      this.notesEditor,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      
      if (regex.test(text)) {
        const highlightedHTML = text.replace(regex, '<mark style="background: yellow; padding: 1px 2px;">$&</mark>');
        const span = document.createElement('span');
        span.innerHTML = highlightedHTML;
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
  }

  clearHighlights() {
    const marks = this.notesEditor.querySelectorAll('mark');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
  }

  findNext() {
    if (!this.findMatches || this.findMatches.length === 0) {
      this.openFindDialog();
      return;
    }
    // Implementation for cycling through find results
    console.log('Find next');
  }

  findPrevious() {
    if (!this.findMatches || this.findMatches.length === 0) {
      this.openFindDialog();
      return;
    }
    // Implementation for cycling through find results
    console.log('Find previous');
  }

  switchToNextPanel() {
    // Implementation for switching between panels (notes, transcription, AI chat)
    console.log('Switch to next panel');
  }

  focusPanel(panelNumber) {
    switch (panelNumber) {
      case 1:
        if (this.notesEditor) {
          this.notesEditor.focus();
        }
        break;
      case 2:
        if (this.transcriptionDisplay) {
          this.transcriptionDisplay.focus();
        }
        break;
      case 3:
        if (this.chatInput) {
          this.expandChatPanel();
          this.chatInput.focus();
        }
        break;
      case 4:
        this.openSettings();
        break;
    }
  }

  insertTimestamp() {
    if (!this.notesEditor) return;
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    const timestampLink = `<a href="#" onclick="return false;" style="color: #007bff; text-decoration: none;">[${timestamp}]</a> `;
    
    // Insert at cursor position
    document.execCommand('insertHTML', false, timestampLink);
    this.saveNotesDraft();
  }

  generateAISummary() {
    if (this.generateSummaryBtn) {
      this.generateSummaryBtn.click();
    }
  }

  toggleHighlighterMode() {
    // Toggle highlighter mode - find the highlight button and activate it
    const highlightBtn = document.querySelector('[data-command="highlight"]');
    if (highlightBtn) {
      highlightBtn.click();
    }
  }

  selectAllNotes() {
    if (this.notesEditor) {
      this.notesEditor.focus();
      document.execCommand('selectAll');
    }
  }

  cutText() {
    if (this.notesEditor && window.getSelection().toString()) {
      document.execCommand('cut');
      this.saveNotesDraft();
    }
  }

  copyText() {
    if (this.notesEditor && window.getSelection().toString()) {
      document.execCommand('copy');
    }
  }

  pasteText() {
    if (this.notesEditor) {
      this.notesEditor.focus();
      document.execCommand('paste');
      this.saveNotesDraft();
    }
  }

  duplicateLine() {
    if (!this.notesEditor) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Get the current line
      let lineStart = range.startContainer;
      let lineEnd = range.endContainer;
      
      // Find the start and end of the current line
      while (lineStart.previousSibling) {
        lineStart = lineStart.previousSibling;
      }
      while (lineEnd.nextSibling) {
        lineEnd = lineEnd.nextSibling;
      }
      
      // Select the line and duplicate it
      const lineRange = document.createRange();
      lineRange.setStartBefore(lineStart);
      lineRange.setEndAfter(lineEnd);
      
      const lineContent = lineRange.toString();
      lineRange.collapse(false);
      lineRange.insertNode(document.createTextNode('\n' + lineContent));
      
      this.saveNotesDraft();
    }
  }

  closeWindow() {
    // Close window functionality (placeholder for multi-window support)
    console.log('Close window');
  }

  quitApplication() {
    // Quit application
    if (window.electronAPI && window.electronAPI.quit) {
      window.electronAPI.quit();
    } else {
      window.close();
    }
  }

  openSettings() {
    this.openSidebar();
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  showKeyboardShortcutsHelp() {
    // Create or show keyboard shortcuts help dialog
    if (!this.shortcutsDialog) {
      this.createShortcutsDialog();
    }
    this.shortcutsDialog.style.display = 'flex';
  }

  createShortcutsDialog() {
    this.shortcutsDialog = document.createElement('div');
    this.shortcutsDialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 2000;
      display: none;
      align-items: center;
      justify-content: center;
    `;

    const isMac = navigator.platform.toLowerCase().includes('mac');
    const cmdKey = isMac ? '⌘' : 'Ctrl';

    this.shortcutsDialog.innerHTML = `
      <div style="background: white; border-radius: 8px; padding: 24px; max-width: 800px; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">Keyboard Shortcuts</h2>
          <button type="button" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <h3>Document Management</h3>
            <div class="shortcut-item"><kbd>${cmdKey}+N</kbd> New Recording</div>
            <div class="shortcut-item"><kbd>${cmdKey}+O</kbd> Open Recording</div>
            <div class="shortcut-item"><kbd>${cmdKey}+S</kbd> Save</div>
            
            <h3>Text Formatting</h3>
            <div class="shortcut-item"><kbd>${cmdKey}+B</kbd> Bold</div>
            <div class="shortcut-item"><kbd>${cmdKey}+I</kbd> Italic</div>
            <div class="shortcut-item"><kbd>${cmdKey}+U</kbd> Underline</div>
            
            <h3>Text Editing</h3>
            <div class="shortcut-item"><kbd>${cmdKey}+Z</kbd> Undo</div>
            <div class="shortcut-item"><kbd>${cmdKey}+Shift+Z</kbd> Redo</div>
            <div class="shortcut-item"><kbd>${cmdKey}+A</kbd> Select All</div>
            <div class="shortcut-item"><kbd>${cmdKey}+X</kbd> Cut</div>
            <div class="shortcut-item"><kbd>${cmdKey}+C</kbd> Copy</div>
            <div class="shortcut-item"><kbd>${cmdKey}+V</kbd> Paste</div>
            <div class="shortcut-item"><kbd>${cmdKey}+D</kbd> Duplicate Line</div>
          </div>
          <div>
            <h3>Recording Controls</h3>
            <div class="shortcut-item"><kbd>${cmdKey}+R</kbd> Start/Stop Recording</div>
            <div class="shortcut-item"><kbd>${cmdKey}+P</kbd> Pause/Resume</div>
            <div class="shortcut-item"><kbd>${cmdKey}+Shift+R</kbd> Quick Restart</div>
            
            <h3>Navigation</h3>
            <div class="shortcut-item"><kbd>${cmdKey}+F</kbd> Find in Notes</div>
            <div class="shortcut-item"><kbd>${cmdKey}+G</kbd> Find Next</div>
            <div class="shortcut-item"><kbd>${cmdKey}+Shift+G</kbd> Find Previous</div>
            <div class="shortcut-item"><kbd>${cmdKey}+Tab</kbd> Switch Panels</div>
            <div class="shortcut-item"><kbd>${cmdKey}+1</kbd> Focus Notes</div>
            <div class="shortcut-item"><kbd>${cmdKey}+2</kbd> Focus Transcription</div>
            <div class="shortcut-item"><kbd>${cmdKey}+3</kbd> Focus AI Chat</div>
            <div class="shortcut-item"><kbd>${cmdKey}+4</kbd> Open Settings</div>
            
            <h3>Special Features</h3>
            <div class="shortcut-item"><kbd>${cmdKey}+T</kbd> Insert Timestamp</div>
            <div class="shortcut-item"><kbd>${cmdKey}+Shift+S</kbd> Generate AI Summary</div>
            <div class="shortcut-item"><kbd>${cmdKey}+Shift+H</kbd> Toggle Highlighter</div>
            <div class="shortcut-item"><kbd>${cmdKey}+Shift+Delete</kbd> Clear All Notes</div>
            
            <h3>General</h3>
            <div class="shortcut-item"><kbd>Esc</kbd> Close Dialogs</div>
            <div class="shortcut-item"><kbd>${cmdKey}+,</kbd> Open Settings</div>
            <div class="shortcut-item"><kbd>${cmdKey}+?</kbd> Show This Help</div>
            <div class="shortcut-item"><kbd>F11</kbd> Toggle Fullscreen</div>
            ${navigator.platform.toLowerCase().includes('win') ? '<div class="shortcut-item"><kbd>Alt+F4</kbd> Exit Application</div>' : ''}
          </div>
        </div>
      </div>
    `;

    // Add CSS for shortcut items
    const style = document.createElement('style');
    style.textContent = `
      .shortcut-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 14px;
      }
      .shortcut-item kbd {
        background: #f1f1f1;
        border: 1px solid #ccc;
        border-radius: 3px;
        padding: 2px 6px;
        font-family: monospace;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);

    // Close button
    this.shortcutsDialog.querySelector('button').addEventListener('click', () => {
      this.shortcutsDialog.style.display = 'none';
    });

    // Close on backdrop click
    this.shortcutsDialog.addEventListener('click', (e) => {
      if (e.target === this.shortcutsDialog) {
        this.shortcutsDialog.style.display = 'none';
      }
    });

    document.body.appendChild(this.shortcutsDialog);
  }

  // Health System Methods
  initializeHealthSystem() {
    // Initialize health monitoring
    this.healthStatus = {
      audio: { status: 'inactive', message: 'Not initialized' },
      transcription: { status: 'inactive', message: 'Not initialized' },
      drive: { status: 'inactive', message: 'Not configured' },
      claude: { status: 'inactive', message: 'Not configured' },
      canvas: { status: 'inactive', message: 'Not configured' },
      general: { status: 'active', message: 'App running normally' }
    };
    
    // Start health monitoring
    this.updateHealthStatus();
    
    // Populate health status list
    this.populateHealthStatusList();
    
    // Set up periodic health checks
    setInterval(() => this.updateHealthStatus(), 5000); // Check every 5 seconds
  }

  async updateHealthStatus() {
    // Check audio status
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      if (audioInputs.length > 0) {
        this.healthStatus.audio = { status: 'active', message: 'Audio recording available' };
      } else {
        this.healthStatus.audio = { status: 'warning', message: 'No microphone detected' };
      }
    } catch (error) {
      this.healthStatus.audio = { status: 'error', message: 'Cannot access audio devices. Check permissions.' };
    }

    // Check transcription backend
    if (this.whisperEnabled || this.voskModelPath) {
      this.healthStatus.transcription = { status: 'active', message: 'Transcription engine ready' };
    } else {
      this.healthStatus.transcription = { status: 'warning', message: 'Transcription backend not configured' };
    }

    // Check Drive status
    const notesDriveFolder = await window.electronAPI?.storeGet('notes-drive-folder');
    const transcriptionDriveFolder = await window.electronAPI?.storeGet('transcription-drive-folder');
    if (notesDriveFolder || transcriptionDriveFolder) {
      this.healthStatus.drive = { status: 'active', message: 'Google Drive folders configured' };
    } else {
      this.healthStatus.drive = { status: 'inactive', message: 'Google Drive not configured' };
    }

    // Check Claude API
    if (this.claudeApiKey) {
      this.healthStatus.claude = { status: 'active', message: this.isUsingDeveloperKey ? 'Using developer API key' : 'Using your API key' };
    } else {
      this.healthStatus.claude = { status: 'warning', message: 'No Claude API key configured' };
    }

    // Check Canvas integration
    const canvasUrl = await window.electronAPI?.storeGet('canvas-url');
    if (canvasUrl) {
      this.healthStatus.canvas = { status: 'active', message: 'Canvas integration configured' };
    } else {
      this.healthStatus.canvas = { status: 'inactive', message: 'Canvas integration not configured' };
    }

    // Update overall health indicator
    this.updateHealthIndicator();
    
    // Update tooltip if visible
    if (this.healthTooltip && this.healthTooltip.classList.contains('show')) {
      this.populateCriticalStatusList();
    }

    // Update dialog if open
    if (this.healthDialog && this.healthDialog.style.display !== 'none') {
      this.populateHealthStatusList();
    }
  }

  updateHealthIndicator() {
    if (!this.healthIndicator) return;

    const criticalStatuses = [this.healthStatus.audio, this.healthStatus.transcription, this.healthStatus.drive];
    const hasError = criticalStatuses.some(status => status.status === 'error');
    const hasWarning = criticalStatuses.some(status => status.status === 'warning');

    // Remove existing classes
    this.healthIndicator.classList.remove('warning', 'error');

    if (hasError) {
      this.healthIndicator.classList.add('error');
      this.healthIndicator.title = 'Critical system issues detected - Click for details';
    } else if (hasWarning) {
      this.healthIndicator.classList.add('warning');
      this.healthIndicator.title = 'System warnings detected - Click for details';
    } else {
      this.healthIndicator.title = 'All systems operational - Click for details';
    }
  }

  showHealthTooltip() {
    if (!this.healthTooltip) return;
    
    this.populateCriticalStatusList();
    this.healthTooltip.classList.add('show');
  }

  hideHealthTooltip() {
    if (!this.healthTooltip) return;
    this.healthTooltip.classList.remove('show');
  }

  populateCriticalStatusList() {
    if (!this.criticalStatusList) return;

    const criticalSystems = [
      { name: 'Audio Recording', status: this.healthStatus.audio },
      { name: 'Transcription Engine', status: this.healthStatus.transcription },
      { name: 'Google Drive', status: this.healthStatus.drive }
    ];

    this.criticalStatusList.innerHTML = '';
    
    criticalSystems.forEach(system => {
      const item = document.createElement('div');
      item.className = 'critical-status-item';
      
      const statusText = system.status.status === 'active' ? 'Working' : 
                        system.status.status === 'warning' ? 'Warning' : 'Error';
      
      item.innerHTML = `
        <span class="status-name">${system.name}:</span>
        <span class="status-value ${system.status.status}">${statusText}</span>
      `;
      
      this.criticalStatusList.appendChild(item);
    });
  }

  showHealthDialog() {
    if (!this.healthDialog) return;
    
    this.populateHealthStatusList();
    this.healthDialog.style.display = 'flex';
  }

  hideHealthDialog() {
    if (!this.healthDialog) return;
    this.healthDialog.style.display = 'none';
  }

  populateHealthStatusList() {
    if (!this.healthStatusList) return;

    const allSystems = [
      { 
        title: 'Audio Recording', 
        description: 'Microphone access and audio capture functionality',
        status: this.healthStatus.audio,
        keywords: ['audio', 'microphone', 'recording', 'mic', 'sound']
      },
      { 
        title: 'Transcription Engine', 
        description: 'Speech-to-text conversion using Vosk or Whisper',
        status: this.healthStatus.transcription,
        keywords: ['transcription', 'speech', 'text', 'vosk', 'whisper', 'ai']
      },
      { 
        title: 'Google Drive Integration', 
        description: 'Cloud storage for notes and transcriptions',
        status: this.healthStatus.drive,
        keywords: ['drive', 'google', 'cloud', 'storage', 'save', 'sync']
      },
      { 
        title: 'Claude AI Assistant', 
        description: 'AI-powered chat and summary generation',
        status: this.healthStatus.claude,
        keywords: ['claude', 'ai', 'chat', 'summary', 'assistant', 'anthropic']
      },
      { 
        title: 'Canvas Integration', 
        description: 'Learning management system integration',
        status: this.healthStatus.canvas,
        keywords: ['canvas', 'lms', 'course', 'school', 'education']
      },
      { 
        title: 'Application Core', 
        description: 'Main application functionality and user interface',
        status: this.healthStatus.general,
        keywords: ['app', 'core', 'ui', 'interface', 'general', 'main']
      }
    ];

    this.healthStatusList.innerHTML = '';
    
    allSystems.forEach(system => {
      const item = document.createElement('div');
      item.className = 'health-status-item';
      item.dataset.keywords = system.keywords.join(' ').toLowerCase();
      
      const statusText = system.status.status === 'active' ? 'Working' : 
                        system.status.status === 'warning' ? 'Warning' : 
                        system.status.status === 'inactive' ? 'Inactive' : 'Error';
      
      let description = system.status.message;
      if (system.status.status === 'error' && system.title === 'Audio Recording') {
        description += ' Try refreshing the page or checking browser permissions in Settings > Privacy & Security > Microphone.';
      } else if (system.status.status === 'warning' && system.title === 'Transcription Engine') {
        description += ' Configure a transcription backend in the audio settings to enable speech-to-text.';
      } else if (system.status.status === 'inactive' && system.title === 'Google Drive Integration') {
        description += ' Set up Drive folder paths in the sidebar to automatically save your work to the cloud.';
      }
      
      item.innerHTML = `
        <div class="status-info">
          <h5 class="status-title">${system.title}</h5>
          <p class="status-description">${description}</p>
        </div>
        <div class="status-indicator-large">
          <div class="status-dot ${system.status.status}"></div>
          <span>${statusText}</span>
        </div>
      `;
      
      this.healthStatusList.appendChild(item);
    });
  }

  filterHealthStatus(query) {
    if (!this.healthStatusList) return;

    const items = this.healthStatusList.querySelectorAll('.health-status-item');
    const searchTerm = query.toLowerCase();

    items.forEach(item => {
      const keywords = item.dataset.keywords || '';
      const title = item.querySelector('.status-title')?.textContent.toLowerCase() || '';
      const description = item.querySelector('.status-description')?.textContent.toLowerCase() || '';
      
      const matches = keywords.includes(searchTerm) || 
                     title.includes(searchTerm) || 
                     description.includes(searchTerm);
      
      if (matches || searchTerm === '') {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  }

  reportBugFromHealth() {
    // Close health dialog first
    this.hideHealthDialog();
    
    // Trigger the existing bug report functionality
    // This would integrate with the existing error notification system
    if (window.electronAPI) {
      // Create a bug report with current health status
      const healthReport = Object.entries(this.healthStatus)
        .map(([system, status]) => `${system}: ${status.status} - ${status.message}`)
        .join('\n');
      
      console.log('Health Status Report for Bug Filing:\n', healthReport);
      
      // You could expand this to actually open a bug report dialog or form
      alert('Bug reporting system would open here with current health status attached.');
    }
  }

  // Mode Management Methods
  
  async initializeModeSystem() {
    // Restore last used mode from storage
    let savedMode = 'capture';
    try {
      if (window.electronAPI && window.electronAPI.storeGet) {
        savedMode = await window.electronAPI.storeGet('current-mode') || 'capture';
      }
    } catch (error) {
      console.log('Running in browser environment, using default mode');
    }
    await this.switchToMode(savedMode, false);
  }

  async switchToMode(mode, save = true) {
    if (mode === this.currentMode) return;
    
    this.currentMode = mode;
    
    // Save current mode to storage
    if (save) {
      try {
        if (window.electronAPI && window.electronAPI.storeSet) {
          await window.electronAPI.storeSet('current-mode', mode);
        }
      } catch (error) {
        console.log('Storage not available in browser environment');
      }
    }
    
    // Update UI
    this.updateModeToggleUI();
    this.showModeContent();
    
    // Load study mode data if switching to study mode
    if (mode === 'study') {
      await this.loadRecordingsList();
    }
  }

  updateModeToggleUI() {
    // Update button states
    if (this.captureModeBtn && this.studyModeBtn) {
      this.captureModeBtn.classList.toggle('active', this.currentMode === 'capture');
      this.studyModeBtn.classList.toggle('active', this.currentMode === 'study');
    }
  }

  showModeContent() {
    // Show/hide mode containers
    if (this.captureMode && this.studyMode) {
      if (this.currentMode === 'capture') {
        this.captureMode.style.display = 'flex';
        this.studyMode.style.display = 'none';
      } else {
        this.captureMode.style.display = 'none';
        this.studyMode.style.display = 'flex';
      }
    }
  }

  // Study Mode Methods
  
  async loadRecordingsList() {
    if (!this.recordingsList || !this.recordingsLoading) return;
    
    // Show loading state
    this.recordingsLoading.style.display = 'flex';
    this.recordingsEmpty.style.display = 'none';
    
    try {
      // Get recordings data - this will integrate with existing Google Drive functionality
      // For now, we'll simulate some recordings
      await this.simulateRecordingsData();
      
      if (this.recordingsData.length === 0) {
        this.recordingsLoading.style.display = 'none';
        this.recordingsEmpty.style.display = 'flex';
        this.recordingsCount.textContent = 'No recordings';
      } else {
        this.recordingsLoading.style.display = 'none';
        this.renderRecordingsList();
        this.recordingsCount.textContent = `${this.recordingsData.length} recording${this.recordingsData.length === 1 ? '' : 's'}`;
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
      this.recordingsLoading.style.display = 'none';
      this.recordingsEmpty.style.display = 'flex';
      this.recordingsCount.textContent = 'Error loading recordings';
    }
  }

  async simulateRecordingsData() {
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate some recordings for demo purposes
    this.recordingsData = [
      {
        id: '1',
        courseNumber: 'CS 101',
        courseTitle: 'Introduction to Computer Science',
        date: new Date('2024-09-25T10:00:00'),
        duration: 3600, // 1 hour in seconds
        notesPreview: 'Today we covered basic algorithms and data structures...',
        notesContent: 'Today we covered basic algorithms and data structures. The professor explained sorting algorithms including bubble sort, selection sort, and insertion sort.',
        transcription: '[10:05] Today we\'re going to talk about algorithms. [10:08] An algorithm is a step-by-step procedure for solving a problem...',
        audioPath: null // In real implementation, this would point to audio file
      },
      {
        id: '2',
        courseNumber: 'MATH 201',
        courseTitle: 'Calculus II',
        date: new Date('2024-09-24T14:00:00'),
        duration: 2700, // 45 minutes
        notesPreview: 'Integration by parts and substitution methods...',
        notesContent: 'Integration by parts and substitution methods. The formula for integration by parts is ∫u dv = uv - ∫v du.',
        transcription: '[14:02] Let\'s review integration by parts. [14:05] The formula is integral of u dv equals u times v minus integral of v du...',
        audioPath: null
      },
      {
        id: '3',
        courseNumber: 'HIST 150',
        courseTitle: 'World History',
        date: new Date('2024-09-23T09:00:00'),
        duration: 3300, // 55 minutes
        notesPreview: 'The Renaissance period and its impact on European culture...',
        notesContent: 'The Renaissance period and its impact on European culture. Key figures include Leonardo da Vinci, Michelangelo, and Machiavelli.',
        transcription: '[09:10] The Renaissance was a period of cultural rebirth. [09:15] It began in Italy during the 14th century...',
        audioPath: null
      }
    ];
  }

  renderRecordingsList() {
    if (!this.recordingsList) return;
    
    // Clear existing content except loading/empty states
    const existingItems = this.recordingsList.querySelectorAll('.recording-item');
    existingItems.forEach(item => item.remove());
    
    // Render recordings
    this.recordingsData.forEach(recording => {
      const recordingElement = this.createRecordingItem(recording);
      this.recordingsList.appendChild(recordingElement);
    });
  }

  createRecordingItem(recording) {
    const item = document.createElement('div');
    item.className = 'recording-item';
    item.dataset.recordingId = recording.id;
    
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    };
    
    item.innerHTML = `
      <div class="recording-item-main">
        <div class="recording-title">${recording.courseNumber}: ${recording.courseTitle}</div>
        <div class="recording-meta">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${formatDate(recording.date)}
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            ${formatTime(recording.date)}
          </span>
        </div>
        <div class="recording-preview">${recording.notesPreview}</div>
      </div>
      <div class="recording-item-actions">
        <div class="recording-duration">${formatDuration(recording.duration)}</div>
      </div>
    `;
    
    // Add click handler to open recording
    item.addEventListener('click', () => this.openRecording(recording));
    
    return item;
  }

  async openRecording(recording) {
    this.currentRecording = recording;
    
    // Update review view with recording data
    if (this.reviewCourseTitle) {
      this.reviewCourseTitle.textContent = `${recording.courseNumber}: ${recording.courseTitle}`;
    }
    if (this.reviewSessionInfo) {
      const dateStr = recording.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = recording.date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      this.reviewSessionInfo.textContent = `${dateStr} at ${timeStr}`;
    }
    
    // Load notes and transcription content
    if (this.reviewNotes) {
      this.reviewNotes.innerHTML = this.formatNotesContent(recording.notesContent);
    }
    if (this.reviewTranscription) {
      this.reviewTranscription.innerHTML = this.formatTranscriptionContent(recording.transcription);
    }
    
    // Setup audio (simulated for now)
    this.setupReviewAudio(recording);
    
    // Show review view
    this.showRecordingReview();
  }

  formatNotesContent(content) {
    // Basic HTML formatting for notes content
    return content.replace(/\n/g, '<br>');
  }

  formatTranscriptionContent(transcription) {
    // Format transcription with clickable timestamps
    return transcription.replace(/\[(\d{1,2}:\d{2})\]/g, (match, timestamp) => {
      return `<span class="timestamp-link" data-timestamp="${timestamp}">${match}</span>`;
    });
  }

  setupReviewAudio(recording) {
    // For demo purposes, we'll simulate audio duration
    // In real implementation, this would load the actual audio file
    const duration = recording.duration;
    
    if (this.reviewTotalTime) {
      this.reviewTotalTime.textContent = this.formatTime(duration);
    }
    if (this.reviewCurrentTime) {
      this.reviewCurrentTime.textContent = '0:00';
    }
    if (this.reviewSeekBar) {
      this.reviewSeekBar.value = 0;
      this.reviewSeekBar.max = duration;
    }
    
    // Reset playback state
    this.isReviewPlaying = false;
    this.updatePlayPauseButton();
    
    // Add timestamp click handlers
    const timestampLinks = this.reviewTranscription?.querySelectorAll('.timestamp-link');
    timestampLinks?.forEach(link => {
      link.addEventListener('click', (e) => {
        const timestamp = e.target.dataset.timestamp;
        this.jumpToTimestamp(timestamp);
      });
    });
  }

  showRecordingReview() {
    if (this.recordingsListView && this.recordingReviewView) {
      this.recordingsListView.style.display = 'none';
      this.recordingReviewView.style.display = 'flex';
    }
  }

  showRecordingsList() {
    if (this.recordingsListView && this.recordingReviewView) {
      this.recordingsListView.style.display = 'flex';
      this.recordingReviewView.style.display = 'none';
    }
    
    // Stop any playing audio
    if (this.isReviewPlaying) {
      this.toggleReviewPlayback();
    }
  }

  // Audio Playback Methods (Simulated)
  
  toggleReviewPlayback() {
    this.isReviewPlaying = !this.isReviewPlaying;
    this.updatePlayPauseButton();
    
    if (this.isReviewPlaying) {
      // Start simulated playback
      this.startSimulatedPlayback();
    } else {
      // Pause playback
      this.pauseSimulatedPlayback();
    }
  }

  updatePlayPauseButton() {
    if (!this.reviewPlayPause) return;
    
    const svg = this.reviewPlayPause.querySelector('svg');
    const text = this.reviewPlayPause.querySelector('svg').nextSibling;
    
    if (this.isReviewPlaying) {
      // Show pause icon
      svg.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      if (text) text.textContent = ' Pause';
    } else {
      // Show play icon
      svg.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
      if (text) text.textContent = ' Play';
    }
  }

  startSimulatedPlayback() {
    // Simulate audio playback with timer
    this.playbackInterval = setInterval(() => {
      if (this.reviewSeekBar && this.reviewCurrentTime) {
        const currentValue = parseInt(this.reviewSeekBar.value);
        const maxValue = parseInt(this.reviewSeekBar.max);
        
        if (currentValue < maxValue) {
          this.reviewSeekBar.value = currentValue + 1;
          this.reviewCurrentTime.textContent = this.formatTime(currentValue + 1);
        } else {
          // End of recording
          this.isReviewPlaying = false;
          this.updatePlayPauseButton();
          clearInterval(this.playbackInterval);
        }
      }
    }, 1000);
  }

  pauseSimulatedPlayback() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  skipReviewAudio(seconds) {
    if (!this.reviewSeekBar) return;
    
    const currentValue = parseInt(this.reviewSeekBar.value);
    const maxValue = parseInt(this.reviewSeekBar.max);
    const newValue = Math.max(0, Math.min(maxValue, currentValue + seconds));
    
    this.reviewSeekBar.value = newValue;
    if (this.reviewCurrentTime) {
      this.reviewCurrentTime.textContent = this.formatTime(newValue);
    }
  }

  seekReviewAudio(value) {
    if (this.reviewCurrentTime) {
      this.reviewCurrentTime.textContent = this.formatTime(parseInt(value));
    }
  }

  jumpToTimestamp(timestamp) {
    // Parse timestamp (e.g., "10:05" -> 605 seconds)
    const [minutes, seconds] = timestamp.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;
    
    if (this.reviewSeekBar) {
      this.reviewSeekBar.value = totalSeconds;
      this.seekReviewAudio(totalSeconds);
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.scribeCatApp = new ScribeCatApp();
});