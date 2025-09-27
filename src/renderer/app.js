// ScribeCat Application Logic
// Keytar via preload bridge for security
const keytar = {
  getPassword: async (service, account) => window.electronAPI.keytarGet({ service, account }),
  setPassword: async (service, account, password) => window.electronAPI.keytarSet(service, account, password)
};
const SERVICE_NAME = 'ScribeCat';
const OPENAI_KEY = 'openai-api-key';

// Developer's OpenAI API key as fallback (for all users)
// Note: In production, this should be loaded from environment variables or secure config.
// In the isolated renderer (nodeIntegration: false), `process` is not defined; guard access.
const DEVELOPER_OPENAI_KEY = (typeof process !== 'undefined' && process.env && process.env.SCRIBECAT_OPENAI_KEY)
  ? process.env.SCRIBECAT_OPENAI_KEY
  : 'sk-proj-placeholder-developer-key-needs-to-be-set';

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
    this.openAIApiKey = null;
    this.isUsingDeveloperKey = false;
    this.currentTheme = 'default';
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
    this.saveOpenAIKeyBtn = document.getElementById('save-openai-key');
    this.openAIKeyInput = document.getElementById('openai-key');
    this.themeSelect = document.getElementById('theme-select');
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
    this.chatInput = document.getElementById('chat-input');
    this.chatMessages = document.getElementById('chat-messages');
    this.toggleChatBtn = document.getElementById('toggle-chat');
    this.sendChatBtn = document.getElementById('send-chat');
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
    // Load Vosk model path and Whisper toggle
    this.voskModelPath = await window.electronAPI.storeGet('vosk-model-path');
    this.whisperEnabled = await window.electronAPI.storeGet('whisper-enabled') || false;
    // Securely retrieve OpenAI key, with developer fallback
    this.openAIApiKey = await keytar.getPassword(SERVICE_NAME, OPENAI_KEY);
    if (!this.openAIApiKey) {
      // Use developer's API key by default for all users
      this.openAIApiKey = DEVELOPER_OPENAI_KEY;
      this.isUsingDeveloperKey = true;
      console.log('Using developer OpenAI API key for GPT-4o mini access');
    } else {
      this.isUsingDeveloperKey = false;
      console.log('Using user-provided OpenAI API key');
    }
    // Hide summary button initially
    if (this.generateSummaryBtn) {
      this.generateSummaryBtn.style.display = 'none';
    }
    console.log('ScribeCat initialized successfully');
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
    if (this.saveOpenAIKeyBtn) {
      this.saveOpenAIKeyBtn.addEventListener('click', () => this.saveOpenAIKey());
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
    if (this.themeSelect) {
      this.themeSelect.addEventListener('change', (e) => this.changeTheme(e.target.value));
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
      this.toggleChatBtn.addEventListener('click', () => this.toggleChat());
    }
    if (this.sendChatBtn) {
      this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
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

  async loadSettings() {
    // Load theme
    const savedTheme = await window.electronAPI.storeGet('theme') || 'default';
    this.changeTheme(savedTheme);
    this.themeSelect.value = savedTheme;
    // Update theme preview on load
    this.updateThemePreview();
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
      if (!this.openAIApiKey) {
        this.aiSummary.innerHTML = '<span style="color:red">OpenAI API key required.</span>';
        return;
      }
      this.generateSummaryBtn.disabled = true;
      this.aiSummary.innerHTML = '<em>Generating summary...</em>';
      try {
        const prompt = `Summarize the following notes and transcript. Highlight key topics, phrases, and any due dates. Format the output in rich markdown.\nNotes:\n${notesContent}\nTranscript:\n${transcriptContent}`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openAIApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that summarizes notes and transcripts in rich markdown.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 256,
            temperature: 0.3
          })
        });
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content?.trim();
        if (summary) {
          this.aiSummary.innerHTML = window.marked ? marked.parse(summary) : summary;
        } else {
          this.aiSummary.innerHTML = '<span style="color:red">No summary generated.</span>';
        }
      } catch (err) {
        console.error('Error generating summary:', err);
        if (this.isUsingDeveloperKey) {
          this.aiSummary.innerHTML = '<span style="color:red">Error with developer API key. Please provide your own OpenAI API key in settings.</span>';
        } else {
          this.aiSummary.innerHTML = '<span style="color:red">Error generating summary. Please check your API key.</span>';
        }
      }
      this.generateSummaryBtn.disabled = false;
    }

    async generateAIBlurb() {
      // Generate a brief 1-6 word blurb based on notes and transcription for file naming
      const notesContent = this.notesEditor.textContent || '';
      const transcriptContent = Array.from(this.transcriptionDisplay.children)
        .map(entry => entry.querySelector('.transcript-text')?.textContent || '')
        .join('\n');
      
      if (!this.openAIApiKey) {
        console.warn('OpenAI API key not available for blurb generation, using fallback');
        return 'Session_Notes';
      }

      try {
        const prompt = `Generate a brief 1-6 word description suitable for a filename based on the following notes and transcript content. The response should be concise, descriptive, and use underscores instead of spaces. Focus on the main topic or subject matter.\nNotes:\n${notesContent}\nTranscript:\n${transcriptContent}`;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openAIApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that generates brief, descriptive filenames. Respond with only the filename-friendly phrase using underscores instead of spaces, no quotes or extra text.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 32,
            temperature: 0.3
          })
        });
        
        const data = await response.json();
        const blurb = data.choices?.[0]?.message?.content?.trim();
        
        if (blurb) {
          // Clean up the blurb for filename use
          const cleanBlurb = blurb
            .replace(/[^a-zA-Z0-9\s_-]/g, '') // Remove special characters except spaces, underscores, hyphens
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_+/g, '_') // Replace multiple underscores with single
            .replace(/^_|_$/g, '') // Remove leading/trailing underscores
            .substring(0, 50); // Limit length
          
          return cleanBlurb || 'Session_Notes';
        } else {
          return 'Session_Notes';
        }
      } catch (err) {
        console.error('Error generating AI blurb:', err);
        return 'Session_Notes';
      }
    }

  async saveOpenAIKey() {
    const key = this.openAIKeyInput.value.trim();
    if (!key) {
      alert('Please enter a valid OpenAI API key.');
      return;
    }
    
    try {
      await keytar.setPassword(SERVICE_NAME, OPENAI_KEY, key);
      this.openAIApiKey = key;
      this.isUsingDeveloperKey = false;
      this.openAIKeyInput.value = '';
      alert('OpenAI API key saved successfully! You are now using your own key.');
      console.log('User provided their own OpenAI API key');
    } catch (error) {
      console.error('Error saving OpenAI key:', error);
      alert('Error saving API key. Please try again.');
    }
  }

  changeTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    window.electronAPI.storeSet('theme', theme);
    
    // Update theme preview swatches
    this.updateThemePreview();
  }

  updateThemePreview() {
    const preview = document.getElementById('theme-preview');
    if (preview) {
      // Force a repaint to get the latest CSS custom property values
      setTimeout(() => {
        const primarySwatch = preview.querySelector('.theme-swatch.primary');
        const surfaceSwatch = preview.querySelector('.theme-swatch.surface');
        const backgroundSwatch = preview.querySelector('.theme-swatch.background');
        
        if (primarySwatch) {
          const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
          primarySwatch.style.backgroundColor = primaryColor;
        }
        
        if (surfaceSwatch) {
          const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
          surfaceSwatch.style.backgroundColor = surfaceColor;
        }
        
        if (backgroundSwatch) {
          const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
          backgroundSwatch.style.backgroundColor = backgroundColor;
        }
      }, 50);
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
    // Vosk integration via preload (IPC)
    this.transcriptionSession = await window.electronAPI.startVoskTranscription({ stream, modelPath: this.voskModelPath });
    window.electronAPI.onVoskResult((event, result) => {
      if (result && result.text) {
        this.addTranscriptionEntry(result.text);
      }
    });
  }

  async startWhisperTranscription(stream) {
    this.updateStatusChip('transcription', 'active');
    // Whisper integration via preload (IPC)
    this.transcriptionSession = await window.electronAPI.startWhisperTranscription({ stream });
    window.electronAPI.onWhisperResult((event, result) => {
      if (result && result.text) {
        this.addTranscriptionEntry(result.text);
      }
    });
  }

  stopLiveTranscription() {
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
    // Call GPT-4o mini (OpenAI API) for polish
    if (!this.openAIApiKey) return;
    try {
      const prompt = `Polish this transcript for clarity and grammar, keeping context in mind.\nContext: ${context}\nTranscript: ${originalText}`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAIApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that polishes transcripts for clarity.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 128,
          temperature: 0.3
        })
      });
      const data = await response.json();
      const polished = data.choices?.[0]?.message?.content?.trim();
      if (polished && polished !== originalText) {
        const textDiv = entry.querySelector('.transcript-text');
        if (textDiv) textDiv.textContent = polished;
        entry.classList.add('polished');
      }
    } catch (err) {
      // Fail silently for polish errors
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
    // Simulate AI response - in real implementation, this would call OpenAI API
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
    
    return `${randomResponse} [This is a simulated response. In the real implementation, this would analyze your notes and transcription using OpenAI's API to provide contextual answers.]`;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.scribeCatApp = new ScribeCatApp();
});