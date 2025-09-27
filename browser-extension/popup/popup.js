// ScribeCat Canvas Course Collector Popup Script

class PopupController {
  constructor() {
    this.courses = [];
    this.currentTab = null;
    this.initialize();
  }

  async initialize() {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
    
    // Bind event listeners
    this.bindEvents();
    
    // Initialize UI
    await this.updateStatus();
    await this.loadStoredCourses();
  }

  bindEvents() {
    // Main action buttons
    document.getElementById('collect-btn').addEventListener('click', () => this.collectCourses());
    document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
    document.getElementById('export-btn').addEventListener('click', () => this.exportCourses());
    document.getElementById('copy-btn').addEventListener('click', () => this.showCopyModal());
    
    // Modal controls
    document.getElementById('modal-close').addEventListener('click', () => this.hideCopyModal());
    document.getElementById('copy-to-clipboard').addEventListener('click', () => this.copyToClipboard());
    
    // Privacy link
    document.getElementById('privacy-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.showPrivacyInfo();
    });
    
    // Close modal when clicking outside
    document.getElementById('copy-modal').addEventListener('click', (e) => {
      if (e.target.id === 'copy-modal') {
        this.hideCopyModal();
      }
    });
  }

  async updateStatus() {
    const statusElement = document.getElementById('status');
    const countElement = document.getElementById('course-count');
    
    try {
      // Check if current tab is Canvas
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'checkDashboard'
      });
      
      if (response && response.success) {
        if (response.isDashboard) {
          statusElement.textContent = 'Canvas Dashboard Detected';
          statusElement.style.color = '#28a745';
        } else if (this.currentTab.url.includes('instructure.com')) {
          statusElement.textContent = 'Canvas Page (Not Dashboard)';
          statusElement.style.color = '#ffc107';
        } else {
          statusElement.textContent = 'Not on Canvas';
          statusElement.style.color = '#dc3545';
        }
      } else {
        statusElement.textContent = 'Page Not Loaded';
        statusElement.style.color = '#6c757d';
      }
    } catch (error) {
      console.log('Could not communicate with content script:', error);
      
      if (this.currentTab.url.includes('instructure.com')) {
        statusElement.textContent = 'Canvas Detected (Refresh if needed)';
        statusElement.style.color = '#ffc107';
      } else {
        statusElement.textContent = 'Not on Canvas';
        statusElement.style.color = '#dc3545';
      }
    }
    
    // Update course count
    countElement.textContent = this.courses.length;
  }

  async loadStoredCourses() {
    try {
      const result = await chrome.storage.local.get(['scribecat_courses']);
      this.courses = result.scribecat_courses || [];
      
      this.updateCourseList();
      this.updateExportButtons();
      
      // Update count
      document.getElementById('course-count').textContent = this.courses.length;
    } catch (error) {
      console.error('Failed to load stored courses:', error);
    }
  }

  updateCourseList() {
    const listElement = document.getElementById('course-list');
    const noCourses = document.getElementById('no-courses');
    
    if (this.courses.length === 0) {
      noCourses.style.display = 'block';
      return;
    }
    
    noCourses.style.display = 'none';
    
    // Clear existing items except the no-courses div
    const existingItems = listElement.querySelectorAll('.course-item');
    existingItems.forEach(item => item.remove());
    
    // Add course items
    this.courses.forEach(course => {
      const item = document.createElement('div');
      item.className = 'course-item';
      
      const courseNumber = document.createElement('div');
      courseNumber.className = 'course-number';
      courseNumber.textContent = course.courseNumber || 'No Course Code';
      
      const courseTitle = document.createElement('div');
      courseTitle.className = 'course-title';
      courseTitle.textContent = course.courseTitle || 'Untitled Course';
      
      item.appendChild(courseNumber);
      item.appendChild(courseTitle);
      listElement.appendChild(item);
    });
  }

  updateExportButtons() {
    const exportBtn = document.getElementById('export-btn');
    const copyBtn = document.getElementById('copy-btn');
    
    const hasData = this.courses.length > 0;
    exportBtn.disabled = !hasData;
    copyBtn.disabled = !hasData;
  }

  async collectCourses() {
    const collectBtn = document.getElementById('collect-btn');
    const originalText = collectBtn.innerHTML;
    
    // Show loading state
    collectBtn.innerHTML = '<span class="btn-icon">⏳</span> Collecting...';
    collectBtn.disabled = true;
    
    try {
      // Send message to content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'collectCourses'
      });
      
      if (response && response.success) {
        this.courses = response.courses;
        this.updateCourseList();
        this.updateExportButtons();
        document.getElementById('course-count').textContent = this.courses.length;
        
        // Show success message
        this.showMessage(`Successfully collected ${this.courses.length} courses!`, 'success');
      } else {
        throw new Error(response?.error || 'Failed to collect courses');
      }
    } catch (error) {
      console.error('Collection failed:', error);
      this.showMessage('Failed to collect courses. Make sure you\'re on a Canvas dashboard page.', 'error');
    } finally {
      // Restore button
      collectBtn.innerHTML = originalText;
      collectBtn.disabled = false;
    }
  }

  async refresh() {
    await this.updateStatus();
    await this.loadStoredCourses();
    this.showMessage('Refreshed successfully!', 'success');
  }

  async exportCourses() {
    const format = document.getElementById('export-format').value;
    const exportBtn = document.getElementById('export-btn');
    const originalText = exportBtn.innerHTML;
    
    // Show loading state
    exportBtn.innerHTML = '<span class="btn-icon">⏳</span> Exporting...';
    exportBtn.disabled = true;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportCourses',
        format: format,
        courses: this.courses
      });
      
      if (response && response.success) {
        this.showMessage(`Exported ${this.courses.length} courses to ${response.filename}`, 'success');
      } else {
        throw new Error(response?.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.showMessage('Export failed. Please try again.', 'error');
    } finally {
      // Restore button
      exportBtn.innerHTML = originalText;
      exportBtn.disabled = false;
    }
  }

  showCopyModal() {
    const modal = document.getElementById('copy-modal');
    const textarea = document.getElementById('copy-data');
    
    // Prepare data for ScribeCat
    const importData = {
      source: 'ScribeCat Canvas Browser Extension',
      format: 'scribecat_course_import',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      courses: this.courses.map(course => ({
        id: course.id,
        courseNumber: course.courseNumber || '',
        courseTitle: course.courseTitle || ''
      }))
    };
    
    textarea.value = JSON.stringify(importData, null, 2);
    modal.style.display = 'block';
  }

  hideCopyModal() {
    document.getElementById('copy-modal').style.display = 'none';
  }

  async copyToClipboard() {
    const textarea = document.getElementById('copy-data');
    const button = document.getElementById('copy-to-clipboard');
    const originalText = button.textContent;
    
    try {
      await navigator.clipboard.writeText(textarea.value);
      button.textContent = 'Copied!';
      button.style.background = '#28a745';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 2000);
      
      this.showMessage('Course data copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      
      // Fallback: select text
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      
      try {
        document.execCommand('copy');
        this.showMessage('Course data copied to clipboard!', 'success');
      } catch (fallbackError) {
        this.showMessage('Please manually copy the text above', 'error');
      }
    }
  }

  showMessage(message, type = 'info') {
    // Create a temporary message element
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
      border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      text-align: center;
    `;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  showPrivacyInfo() {
    const info = `
ScribeCat Canvas Course Collector Privacy Policy:

• Only accesses Canvas Instructure domains (*.instructure.com)
• Only collects course numbers and titles visible on your dashboard
• Does not collect personal information, grades, or private data
• Data is stored locally in your browser only
• No data is sent to external servers
• You control all data export and deletion

This extension requires minimal permissions and respects your privacy.
    `;
    alert(info);
  }
}

// Initialize popup when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Handle any errors
window.addEventListener('error', (event) => {
  console.error('Popup error:', event.error);
});