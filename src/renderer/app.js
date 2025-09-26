// ScribeCat Application Logic
const keytar = require('keytar');
const SERVICE_NAME = 'ScribeCat';
const OPENAI_KEY = 'openai-api-key';
const ASSEMBLYAI_KEY = 'assemblyai-api-key';

// Developer's OpenAI API key as fallback (for all users)
// Note: In production, this should be loaded from environment variables or secure config
const DEVELOPER_OPENAI_KEY = process.env.SCRIBECAT_OPENAI_KEY || 'sk-proj-placeholder-developer-key-needs-to-be-set';

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
    
    // Settings elements
    this.saveOpenAIKeyBtn = document.getElementById('save-openai-key');
    this.openAIKeyInput = document.getElementById('openai-key');
    
    // Transcription controls
    this.clearTranscriptionBtn = document.getElementById('clear-transcription');
    this.jumpLatestBtn = document.getElementById('jump-latest');
    
    // Status elements
    this.clock = document.querySelector('.clock');
  }

  async init() {
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
    // Securely retrieve AssemblyAI key (if needed)
    this.assemblyAIApiKey = await keytar.getPassword(SERVICE_NAME, ASSEMBLYAI_KEY);
    // Hide summary button initially
    if (this.generateSummaryBtn) {
      this.generateSummaryBtn.style.display = 'none';
    }
    console.log('ScribeCat initialized successfully');
  }

  setupEventListeners() {
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
    if (window.electronAPI && window.electronAPI.onMenuAction) {
      window.electronAPI.onMenuAction((event, action) => {
        if (action === 'menu:new-recording') {
          this.newRecording();
        } else if (action === 'menu:save') {
          this.saveRecording();
        }
      });
    }
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
    // Load transcription backend
    const backend = await window.electronAPI.storeGet('transcription-backend') || 'vosk';
    this.transcriptionBackendSelect.value = backend;
    this.whisperEnabled = backend === 'whisper';
    await window.electronAPI.storeSet('whisper-enabled', this.whisperEnabled);
    // Load notes draft
    const notesDraft = await window.electronAPI.storeGet('notes-draft');
    if (notesDraft) this.notesEditor.innerHTML = notesDraft;
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
      // Hide summary button during recording
      if (this.generateSummaryBtn) {
        this.generateSummaryBtn.style.display = 'none';
      }
      // Start timer
      this.recordingInterval = setInterval(() => this.updateRecordingTime(), 1000);
      // Start transcription using Vosk or Whisper
      if (this.whisperEnabled) {
        this.startWhisperTranscription(stream);
      } else if (this.voskModelPath) {
        this.startVoskTranscription(stream);
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

  updateRecordingTime() {
    if (this.recordingStartTime) {
      const elapsed = Date.now() - this.recordingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  async startRealTimeTranscription(stream) {
    // Deprecated: AssemblyAI logic removed
    // Use Vosk or Whisper instead
    return;
  }

  stopRealTimeTranscription() {
    // Deprecated: AssemblyAI logic removed
    return;
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