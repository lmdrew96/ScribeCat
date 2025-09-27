/**
 * ScribeCat Canvas Integration - Background Script
 * Handles data persistence and communication
 */

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ScribeCat Canvas] Extension installed/updated', details.reason);
  
  // Set default settings
  chrome.storage.local.set({
    extensionEnabled: true,
    autoScrape: true,
    debugMode: false,
    scrapedCourses: [],
    settings: {
      exportFormat: 'json',
      includePastCourses: false,
      autoRefresh: true
    }
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[ScribeCat Canvas] Message received:', request.action);
  
  switch (request.action) {
    case 'courseDataScraped':
      handleCourseDataScraped(request.data, sendResponse);
      break;
      
    case 'getStoredCourses':
      getStoredCourses(sendResponse);
      break;
      
    case 'clearStoredData':
      clearStoredData(sendResponse);
      break;
      
    case 'updateSettings':
      updateSettings(request.settings, sendResponse);
      break;
      
    case 'exportData':
      exportData(request.format, sendResponse);
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async responses
});

/**
 * Handle course data scraped from content script
 */
async function handleCourseDataScraped(data, sendResponse) {
  try {
    console.log('[ScribeCat Canvas] Processing scraped course data:', data.courses.length, 'courses');
    
    // Store the scraped data
    await chrome.storage.local.set({
      scrapedCourses: data.courses,
      lastScrapedUrl: data.url,
      lastScrapedTime: data.timestamp,
      scrapeCount: (await chrome.storage.local.get('scrapeCount')).scrapeCount + 1 || 1
    });
    
    // Update extension badge
    if (data.courses.length > 0) {
      chrome.action.setBadgeText({ text: data.courses.length.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    }
    
    sendResponse({ success: true, message: 'Data processed successfully' });
  } catch (error) {
    console.error('[ScribeCat Canvas] Error handling scraped data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get stored course data
 */
async function getStoredCourses(sendResponse) {
  try {
    const data = await chrome.storage.local.get([
      'scrapedCourses',
      'lastScrapedUrl',
      'lastScrapedTime',
      'scrapeCount'
    ]);
    
    sendResponse({
      success: true,
      data: {
        courses: data.scrapedCourses || [],
        lastUrl: data.lastScrapedUrl || '',
        lastTime: data.lastScrapedTime || '',
        scrapeCount: data.scrapeCount || 0
      }
    });
  } catch (error) {
    console.error('[ScribeCat Canvas] Error getting stored courses:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Clear all stored data
 */
async function clearStoredData(sendResponse) {
  try {
    await chrome.storage.local.clear();
    chrome.action.setBadgeText({ text: '' });
    
    sendResponse({ success: true, message: 'Data cleared successfully' });
  } catch (error) {
    console.error('[ScribeCat Canvas] Error clearing data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Update extension settings
 */
async function updateSettings(settings, sendResponse) {
  try {
    await chrome.storage.local.set({ settings });
    sendResponse({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('[ScribeCat Canvas] Error updating settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Export course data in specified format
 */
async function exportData(format, sendResponse) {
  try {
    const data = await chrome.storage.local.get('scrapedCourses');
    const courses = data.scrapedCourses || [];
    
    let exportContent;
    let filename;
    let mimeType;
    
    switch (format) {
      case 'json':
        exportContent = JSON.stringify({
          courses: courses,
          exportedAt: new Date().toISOString(),
          source: 'ScribeCat Canvas Extension'
        }, null, 2);
        filename = `scribecat-courses-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
        break;
        
      case 'csv':
        const csvHeader = 'Course Number,Course Title,Canvas ID,URL\n';
        const csvRows = courses.map(course => 
          `"${course.courseNumber}","${course.courseTitle}","${course.id}","${course.url}"`
        ).join('\n');
        exportContent = csvHeader + csvRows;
        filename = `scribecat-courses-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'scribecat':
        // ScribeCat-specific format for direct import
        const scribecatFormat = {
          version: '1.0',
          type: 'canvas-courses',
          importedAt: new Date().toISOString(),
          courses: courses.map(course => ({
            id: course.id,
            courseNumber: course.courseNumber,
            courseTitle: course.courseTitle,
            canvasId: course.id,
            source: 'canvas-extension'
          }))
        };
        exportContent = JSON.stringify(scribecatFormat, null, 2);
        filename = `scribecat-import-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
        break;
        
      default:
        throw new Error('Unknown export format');
    }
    
    sendResponse({
      success: true,
      data: {
        content: exportContent,
        filename: filename,
        mimeType: mimeType
      }
    });
  } catch (error) {
    console.error('[ScribeCat Canvas] Error exporting data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle tab updates to refresh badge if on Canvas
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.includes('instructure.com') || tab.url.includes('canvas.com'))) {
    console.log('[ScribeCat Canvas] Canvas tab loaded:', tab.url);
    // Badge will be updated by content script after scraping
  }
});

// Clear badge when tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Could implement logic to clear badge if last Canvas tab is closed
});

console.log('[ScribeCat Canvas] Background script loaded');