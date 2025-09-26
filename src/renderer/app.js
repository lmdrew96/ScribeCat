// ScribeCat Application Logic
class ScribeCatApp {
  constructor() {
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingInterval = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.transcriptionSocket = null;
    this.assemblyAIApiKey = null;
    this.openAIApiKey = null;
    this.currentTheme = 'default';
    
    this.init();
  }

  async init() {
    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
    this.initializeClock();
    this.initializeAudioDevices();
    this.updateVersionInfo();
    this.initializeStatusChips();
    
    // Load API keys from settings
    this.assemblyAIApiKey = await window.electronAPI.storeGet('assemblyai-key');
    this.openAIApiKey = await window.electronAPI.storeGet('openai-key');
    
    console.log('ScribeCat initialized successfully');
  }

  initializeElements() {
    // Main UI elements
    this.sidebar = document.getElementById('sidebar');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.recordBtn = document.getElementById('record-btn');
    this.saveBtn = document.getElementById('save-btn');
    this.recordingTime = document.getElementById('recording-time');
    this.notesEditor = document.getElementById('notes-editor');
    this.transcriptionDisplay = document.getElementById('transcription-display');
    
    // Settings elements
    this.themeSelect = document.getElementById('theme-select');
    this.canvasUrl = document.getElementById('canvas-url');
    this.courseNumber = document.getElementById('course-number');
    this.courseTitle = document.getElementById('course-title');
    this.saveCanvasBtn = document.getElementById('save-canvas');
    this.driveFolderInput = document.getElementById('drive-folder');
    this.selectDriveFolderBtn = document.getElementById('select-drive-folder');
    this.vocalIsolationCheckbox = document.getElementById('vocal-isolation');
    this.microphoneSelect = document.getElementById('microphone-select');
    
    // Formatting toolbar
    this.fontFamilySelect = document.getElementById('font-family');
    this.formatBtns = document.querySelectorAll('.format-btn');
    
    // AI Chat elements
    this.aiChat = document.getElementById('ai-chat');
    this.toggleChatBtn = document.getElementById('toggle-chat');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendChatBtn = document.getElementById('send-chat');
    
    // Clock and status elements
    this.clock = document.getElementById('clock');
    this.audioStatus = document.getElementById('audio-status');
    this.transcriptionStatus = document.getElementById('transcription-status');
    this.driveStatus = document.getElementById('drive-status');
    
    // Other elements
    this.clearTranscriptionBtn = document.getElementById('clear-transcription');
    this.versionInfo = document.getElementById('version-info');
  }

  setupEventListeners() {
    // Sidebar toggle
    this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    
    // Recording controls
    this.recordBtn.addEventListener('click', () => this.toggleRecording());
    this.saveBtn.addEventListener('click', () => this.saveRecording());
    
    // Settings
    this.themeSelect.addEventListener('change', (e) => this.changeTheme(e.target.value));
    this.saveCanvasBtn.addEventListener('click', () => this.saveCanvasSettings());
    this.selectDriveFolderBtn.addEventListener('click', () => this.selectDriveFolder());
    this.vocalIsolationCheckbox.addEventListener('change', (e) => this.toggleVocalIsolation(e.target.checked));
    this.microphoneSelect.addEventListener('change', (e) => this.selectMicrophone(e.target.value));
    
    // Text formatting
    this.fontFamilySelect.addEventListener('change', (e) => this.changeFontFamily(e.target.value));
    this.formatBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.executeFormat(e.target.dataset.command));
    });
    
    // Notes editor events
    this.notesEditor.addEventListener('input', () => this.saveNotesDraft());
    this.notesEditor.addEventListener('keyup', () => this.updateFormattingState());
    this.notesEditor.addEventListener('mouseup', () => this.updateFormattingState());
    
    // AI Chat
    this.toggleChatBtn.addEventListener('click', () => this.toggleChat());
    this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage();
      }
    });
    
    // Other controls
    this.clearTranscriptionBtn.addEventListener('click', () => this.clearTranscription());
    
    // Menu event listeners
    window.electronAPI.onMenuAction((event, action) => {
      switch(action) {
        case 'menu:new-recording':
          this.newRecording();
          break;
        case 'menu:save':
          this.saveRecording();
          break;
      }
    });
  }

  toggleSidebar() {
    this.sidebar.classList.toggle('open');
  }

  async loadSettings() {
    // Load theme
    const savedTheme = await window.electronAPI.storeGet('theme') || 'default';
    this.changeTheme(savedTheme);
    this.themeSelect.value = savedTheme;
    
    // Load Canvas settings
    const canvasSettings = await window.electronAPI.storeGet('canvas-settings') || {};
    if (canvasSettings.url) this.canvasUrl.value = canvasSettings.url;
    if (canvasSettings.courseNumber) this.courseNumber.value = canvasSettings.courseNumber;
    if (canvasSettings.courseTitle) this.courseTitle.value = canvasSettings.courseTitle;
    
    // Load Drive folder
    const driveFolder = await window.electronAPI.storeGet('drive-folder');
    if (driveFolder) this.driveFolderInput.value = driveFolder;
    
    // Load audio settings
    const audioSettings = await window.electronAPI.storeGet('audio-settings') || {};
    if (audioSettings.vocalIsolation) this.vocalIsolationCheckbox.checked = audioSettings.vocalIsolation;
    
    // Load notes draft
    const notesDraft = await window.electronAPI.storeGet('notes-draft');
    if (notesDraft) this.notesEditor.innerHTML = notesDraft;
  }

  changeTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    window.electronAPI.storeSet('theme', theme);
  }

  initializeClock() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  updateClock() {
    const now = new Date();
    const timeOptions = { 
      hour: '2-digit', 
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
    const driveFolder = await window.electronAPI.storeGet('drive-folder');
    if (driveFolder) {
      this.updateStatusChip('drive', 'active');
    } else {
      this.updateStatusChip('drive', 'inactive');
    }
  }

  async toggleRecording() {
    if (!this.isRecording) {
      await this.startRecording();
    } else {
      await this.stopRecording();
    }
  }

  async startRecording() {
    try {
      const constraints = {
        audio: {
          deviceId: this.microphoneSelect.value || undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      // Update UI
      this.recordBtn.textContent = 'Stop Recording';
      this.recordBtn.classList.add('recording');
      this.saveBtn.disabled = true;
      
      // Start timer
      this.recordingInterval = setInterval(() => this.updateRecordingTime(), 1000);
      
      // Start transcription if API key is available
      if (this.assemblyAIApiKey) {
        this.startRealTimeTranscription(stream);
      }
      
      this.updateStatusChip('audio', 'active');
      console.log('Recording started');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateStatusChip('audio', 'error');
      alert('Error accessing microphone. Please check permissions.');
    }
  }

  async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Update UI
      this.recordBtn.textContent = 'Start Recording';
      this.recordBtn.classList.remove('recording');
      this.saveBtn.disabled = false;
      
      // Stop timer
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }
      
      // Stop transcription
      this.stopRealTimeTranscription();
      
      this.updateStatusChip('audio', 'inactive');
      console.log('Recording stopped');
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

  async startRealTimeTranscription(stream) {
    // This would integrate with AssemblyAI's real-time transcription
    // For now, we'll simulate transcription
    this.updateStatusChip('transcription', 'active');
    
    // Simulate periodic transcription updates
    this.transcriptionInterval = setInterval(() => {
      this.addTranscriptionEntry("This is a simulated transcription entry. In a real implementation, this would connect to AssemblyAI's real-time transcription service.");
    }, 5000);
  }

  stopRealTimeTranscription() {
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
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
      const driveFolder = await window.electronAPI.storeGet('drive-folder');
      if (!driveFolder) {
        alert('Please select a Google Drive folder first.');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const courseInfo = await this.getCanvasInfo();
      const fileName = `${courseInfo.courseNumber || 'Recording'}_${timestamp}`;

      // Ensure target directory exists
      await window.electronAPI.driveEnsureTarget(driveFolder);

      // Save audio file
      if (this.audioChunks.length > 0) {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioArray = new Uint8Array(audioBuffer);
        
        await window.electronAPI.saveAudioFile({
          audioData: Array.from(audioArray),
          fileName: `${fileName}_audio`,
          folderPath: driveFolder
        });
      }

      // Save notes as HTML
      const notesContent = this.generateNotesHTML();
      await window.electronAPI.driveSaveHtml({
        filePath: driveFolder,
        content: notesContent,
        fileName: `${fileName}_notes`
      });

      // Save transcription as HTML
      const transcriptionContent = this.generateTranscriptionHTML();
      await window.electronAPI.driveSaveHtml({
        filePath: driveFolder,
        content: transcriptionContent,
        fileName: `${fileName}_transcription`
      });

      alert('Recording saved successfully!');
      console.log('Recording saved to:', driveFolder);

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
    return {
      url: this.canvasUrl.value,
      courseNumber: this.courseNumber.value,
      courseTitle: this.courseTitle.value
    };
  }

  async saveCanvasSettings() {
    const settings = this.getCanvasInfo();
    await window.electronAPI.storeSet('canvas-settings', settings);
    alert('Canvas settings saved!');
  }

  async selectDriveFolder() {
    const result = await window.electronAPI.showFolderDialog();
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      this.driveFolderInput.value = folderPath;
      await window.electronAPI.storeSet('drive-folder', folderPath);
      this.updateStatusChip('drive', 'active');
      console.log('Drive folder selected:', folderPath);
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

  changeFontFamily(fontFamily) {
    document.execCommand('fontName', false, fontFamily);
    this.notesEditor.style.fontFamily = fontFamily;
    this.saveNotesDraft();
  }

  executeFormat(command) {
    document.execCommand(command, false, null);
    this.updateFormattingState();
    this.saveNotesDraft();
  }

  updateFormattingState() {
    this.formatBtns.forEach(btn => {
      const command = btn.dataset.command;
      if (command) {
        const isActive = document.queryCommandState(command);
        btn.classList.toggle('active', isActive);
      }
    });
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