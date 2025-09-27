/**
 * ScribeCat Canvas Integration - Popup Script
 * Handles user interaction and data display
 */

class CanvasExtensionPopup {
  constructor() {
    this.courses = [];
    this.isCanvasTab = false;
    this.currentTabUrl = '';
    this.init();
  }

  async init() {
    console.log('[ScribeCat Canvas Popup] Initializing...');
    
    // Initialize UI elements
    this.initializeElements();
    this.attachEventListeners();
    
    // Check current tab and load data
    await this.checkCurrentTab();
    await this.loadStoredData();
    
    console.log('[ScribeCat Canvas Popup] Initialized');
  }

  initializeElements() {
    // Status elements
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.canvasUrl = document.getElementById('canvas-url');
    
    // Action buttons
    this.scrapeBtn = document.getElementById('scrape-btn');
    this.refreshBtn = document.getElementById('refresh-btn');
    
    // Course display
    this.courseCount = document.getElementById('course-count');
    this.courseList = document.getElementById('course-list');
    this.emptyState = document.getElementById('empty-state');
    
    // Export section and buttons
    this.exportSection = document.getElementById('export-section');
    this.exportJsonBtn = document.getElementById('export-json');
    this.exportCsvBtn = document.getElementById('export-csv');
    this.exportScribecatBtn = document.getElementById('export-scribecat');
    
    // Settings
    this.autoScrapeCheck = document.getElementById('auto-scrape');
    this.debugModeCheck = document.getElementById('debug-mode');
    this.clearDataBtn = document.getElementById('clear-data');
    this.testConnectionBtn = document.getElementById('test-connection');
    
    // Footer
    this.lastUpdate = document.getElementById('last-update');
    
    // Modal elements
    this.helpModal = document.getElementById('help-modal');
    this.privacyModal = document.getElementById('privacy-modal');
    this.helpLink = document.getElementById('help-link');
    this.privacyLink = document.getElementById('privacy-link');
    this.helpClose = document.getElementById('help-close');
    this.privacyClose = document.getElementById('privacy-close');
  }

  attachEventListeners() {
    // Action buttons
    this.scrapeBtn.addEventListener('click', () => this.scrapeCourses());
    this.refreshBtn.addEventListener('click', () => this.refreshData());
    
    // Export buttons
    this.exportJsonBtn.addEventListener('click', () => this.exportData('json'));
    this.exportCsvBtn.addEventListener('click', () => this.exportData('csv'));
    this.exportScribecatBtn.addEventListener('click', () => this.exportData('scribecat'));
    
    // Settings
    this.autoScrapeCheck.addEventListener('change', (e) => this.updateSettings());
    this.debugModeCheck.addEventListener('change', (e) => this.updateSettings());
    this.clearDataBtn.addEventListener('click', () => this.clearData());
    this.testConnectionBtn.addEventListener('click', () => this.testScribeCatConnection());
    
    // Modal links
    this.helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal('help');
    });
    this.privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal('privacy');
    });
    this.helpClose.addEventListener('click', () => this.hideModal('help'));
    this.privacyClose.addEventListener('click', () => this.hideModal('privacy'));
    
    // Close modals on background click
    this.helpModal.addEventListener('click', (e) => {
      if (e.target === this.helpModal) this.hideModal('help');
    });
    this.privacyModal.addEventListener('click', (e) => {
      if (e.target === this.privacyModal) this.hideModal('privacy');
    });
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTabUrl = tab.url || '';
      this.isCanvasTab = this.currentTabUrl.includes('instructure.com') || 
                       this.currentTabUrl.includes('canvas.com');
      
      this.updateStatus();
    } catch (error) {
      console.error('[ScribeCat Canvas Popup] Error checking current tab:', error);
      this.updateStatus(false, 'Error checking tab');
    }
  }

  updateStatus(isCanvas = null, customMessage = null) {
    const canvasActive = isCanvas !== null ? isCanvas : this.isCanvasTab;
    
    if (customMessage) {
      this.statusText.textContent = customMessage;
      this.statusDot.className = 'status-dot error';
    } else if (canvasActive) {
      this.statusText.textContent = 'Canvas detected';
      this.statusDot.className = 'status-dot active';
      this.scrapeBtn.disabled = false;
    } else {
      this.statusText.textContent = 'Not on Canvas';
      this.statusDot.className = 'status-dot';
      this.scrapeBtn.disabled = true;
    }
    
    // Update URL display
    if (this.currentTabUrl) {
      const url = new URL(this.currentTabUrl);
      this.canvasUrl.textContent = `${url.hostname}${url.pathname}`;
    } else {
      this.canvasUrl.textContent = 'No active tab URL';
    }
  }

  async loadStoredData() {
    try {
      const response = await this.sendMessageToBackground('getStoredCourses');
      if (response.success) {
        this.courses = response.data.courses || [];
        this.updateCourseDisplay();
        this.updateLastUpdate(response.data.lastTime);
        this.updateSettings(response.data.settings);
      }
    } catch (error) {
      console.error('[ScribeCat Canvas Popup] Error loading stored data:', error);
    }
  }

  async scrapeCourses() {
    if (!this.isCanvasTab) {
      this.showNotification('Please navigate to a Canvas page first', 'error');
      return;
    }

    try {
      this.scrapeBtn.disabled = true;
      this.scrapeBtn.innerHTML = '<span class="btn-icon">⏳</span>Scraping...';
      
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeCourses' });
      
      if (response.success) {
        this.courses = response.courses || [];
        this.updateCourseDisplay();
        this.updateLastUpdate(new Date().toISOString());
        this.showNotification(`Found ${this.courses.length} courses`, 'success');
      } else {
        this.showNotification(`Scraping failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('[ScribeCat Canvas Popup] Error scraping courses:', error);
      this.showNotification('Scraping failed: Extension communication error', 'error');
    } finally {
      this.scrapeBtn.disabled = this.isCanvasTab ? false : true;
      this.scrapeBtn.innerHTML = '<span class="btn-icon">🔍</span>Scrape Courses';
    }
  }

  async refreshData() {
    await this.checkCurrentTab();
    await this.loadStoredData();
    this.showNotification('Data refreshed', 'info');
  }

  updateCourseDisplay() {
    this.courseCount.textContent = this.courses.length.toString();
    
    if (this.courses.length === 0) {
      this.courseList.innerHTML = `
        <div class="empty-state">
          <p>No courses found yet.</p>
          <p class="help-text">Navigate to your Canvas dashboard and click "Scrape Courses".</p>
        </div>
      `;
      this.exportSection.style.display = 'none';
    } else {
      this.courseList.innerHTML = this.courses.map(course => `
        <div class="course-item">
          <div class="course-number">${course.courseNumber || 'No code'}</div>
          <div class="course-title">${course.courseTitle}</div>
          <div class="course-meta">
            <span>ID: ${course.id}</span>
            <span>Source: ${course.source}</span>
          </div>
        </div>
      `).join('');
      this.exportSection.style.display = 'block';
    }
  }

  async exportData(format) {
    if (this.courses.length === 0) {
      this.showNotification('No courses to export', 'error');
      return;
    }

    try {
      const response = await this.sendMessageToBackground('exportData', format);
      if (response.success) {
        this.downloadFile(response.data.content, response.data.filename, response.data.mimeType);
        this.showNotification(`Exported as ${format.toUpperCase()}`, 'success');
      } else {
        this.showNotification(`Export failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('[ScribeCat Canvas Popup] Error exporting data:', error);
      this.showNotification('Export failed', 'error');
    }
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  async updateSettings() {
    const settings = {
      autoScrape: this.autoScrapeCheck.checked,
      debugMode: this.debugModeCheck.checked
    };
    
    try {
      await this.sendMessageToBackground('updateSettings', settings);
    } catch (error) {
      console.error('[ScribeCat Canvas Popup] Error updating settings:', error);
    }
  }

  async clearData() {
    if (!confirm('Clear all stored course data? This cannot be undone.')) {
      return;
    }

    try {
      const response = await this.sendMessageToBackground('clearStoredData');
      if (response.success) {
        this.courses = [];
        this.updateCourseDisplay();
        this.updateLastUpdate('');
        this.showNotification('Data cleared successfully', 'success');
      } else {
        this.showNotification(`Clear failed: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('[ScribeCat Canvas Popup] Error clearing data:', error);
      this.showNotification('Clear failed', 'error');
    }
  }

  async testScribeCatConnection() {
    // This would attempt to communicate with ScribeCat desktop app
    // For now, just show a placeholder message
    this.showNotification('ScribeCat connection test: Not implemented yet', 'info');
  }

  updateLastUpdate(timestamp) {
    if (!timestamp) {
      this.lastUpdate.textContent = 'Never scraped';
      return;
    }

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);
      
      if (diffMinutes < 1) {
        this.lastUpdate.textContent = 'Just now';
      } else if (diffMinutes < 60) {
        this.lastUpdate.textContent = `${diffMinutes}m ago`;
      } else if (diffMinutes < 1440) {
        this.lastUpdate.textContent = `${Math.floor(diffMinutes / 60)}h ago`;
      } else {
        this.lastUpdate.textContent = date.toLocaleDateString();
      }
    } catch (error) {
      this.lastUpdate.textContent = 'Unknown';
    }
  }

  showModal(modalName) {
    const modal = modalName === 'help' ? this.helpModal : this.privacyModal;
    modal.style.display = 'flex';
  }

  hideModal(modalName) {
    const modal = modalName === 'help' ? this.helpModal : this.privacyModal;
    modal.style.display = 'none';
  }

  showNotification(message, type = 'info') {
    // Simple notification system - you could enhance this with a proper toast system
    const statusText = this.statusText;
    const originalText = statusText.textContent;
    
    statusText.textContent = message;
    
    // Reset after 3 seconds
    setTimeout(() => {
      statusText.textContent = originalText;
    }, 3000);
  }

  async sendMessageToBackground(action, data = null) {
    return new Promise((resolve) => {
      const message = { action };
      if (data !== null) {
        if (action === 'updateSettings') {
          message.settings = data;
        } else if (action === 'exportData') {
          message.format = data;
        }
      }
      
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CanvasExtensionPopup();
});