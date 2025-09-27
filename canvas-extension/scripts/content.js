/**
 * ScribeCat Canvas Integration - Content Script
 * Scrapes course data from Canvas dashboard
 */

class CanvasCourseScraper {
  constructor() {
    this.courses = [];
    this.debug = true;
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[ScribeCat Canvas] ${message}`, data || '');
    }
  }

  /**
   * Detect if we're on a Canvas dashboard page
   */
  isCanvasDashboard() {
    const url = window.location.href;
    const isDashboard = url.includes('/dashboard') || 
                       url.includes('/courses') || 
                       document.querySelector('.ic-DashboardCard') !== null ||
                       document.querySelector('.course-list-item') !== null;
    
    this.log('Dashboard detection', { url, isDashboard });
    return isDashboard;
  }

  /**
   * Extract course data from various Canvas dashboard layouts
   */
  scrapeCourses() {
    this.courses = [];
    
    // Method 1: Modern Canvas dashboard cards
    const dashboardCards = document.querySelectorAll('.ic-DashboardCard');
    this.log('Found dashboard cards', dashboardCards.length);
    
    dashboardCards.forEach((card, index) => {
      try {
        const titleElement = card.querySelector('.ic-DashboardCard__header-title, .ic-DashboardCard__link');
        const subtitleElement = card.querySelector('.ic-DashboardCard__header-subtitle');
        const linkElement = card.querySelector('a[href*="/courses/"]');
        
        if (titleElement) {
          const title = titleElement.textContent?.trim() || '';
          const subtitle = subtitleElement?.textContent?.trim() || '';
          const link = linkElement?.href || '';
          const courseId = this.extractCourseIdFromUrl(link);
          
          // Try to parse course number from subtitle or title
          const courseNumber = this.extractCourseNumber(subtitle, title);
          
          const course = {
            id: courseId || `card-${index}`,
            courseNumber: courseNumber,
            courseTitle: title,
            subtitle: subtitle,
            url: link,
            source: 'dashboard-card'
          };
          
          this.courses.push(course);
          this.log('Extracted course from dashboard card', course);
        }
      } catch (error) {
        this.log('Error processing dashboard card', error);
      }
    });

    // Method 2: Legacy course list items
    if (this.courses.length === 0) {
      const courseItems = document.querySelectorAll('.course-list-item, .course-list li');
      this.log('Found course list items', courseItems.length);
      
      courseItems.forEach((item, index) => {
        try {
          const nameElement = item.querySelector('.course-name, .name a, h3 a');
          const codeElement = item.querySelector('.course-code, .subtitle, .course-info');
          const linkElement = item.querySelector('a[href*="/courses/"]');
          
          if (nameElement) {
            const title = nameElement.textContent?.trim() || '';
            const code = codeElement?.textContent?.trim() || '';
            const link = linkElement?.href || '';
            const courseId = this.extractCourseIdFromUrl(link);
            
            const courseNumber = this.extractCourseNumber(code, title);
            
            const course = {
              id: courseId || `item-${index}`,
              courseNumber: courseNumber,
              courseTitle: title,
              subtitle: code,
              url: link,
              source: 'course-list-item'
            };
            
            this.courses.push(course);
            this.log('Extracted course from list item', course);
          }
        } catch (error) {
          this.log('Error processing course item', error);
        }
      });
    }

    // Method 3: Alternative selectors for different Canvas themes
    if (this.courses.length === 0) {
      const alternativeSelectors = [
        '.course-card',
        '.dashboard-card',
        '[data-testid="DashboardCard"]',
        '.course-item'
      ];
      
      for (const selector of alternativeSelectors) {
        const elements = document.querySelectorAll(selector);
        this.log(`Trying selector ${selector}`, elements.length);
        
        if (elements.length > 0) {
          elements.forEach((element, index) => {
            try {
              const title = this.extractTextFromElement(element, ['h3', 'h2', '.title', '.name']);
              const subtitle = this.extractTextFromElement(element, ['.subtitle', '.code', '.info']);
              const link = element.querySelector('a')?.href || '';
              const courseId = this.extractCourseIdFromUrl(link);
              
              if (title) {
                const courseNumber = this.extractCourseNumber(subtitle, title);
                
                const course = {
                  id: courseId || `alt-${index}`,
                  courseNumber: courseNumber,
                  courseTitle: title,
                  subtitle: subtitle,
                  url: link,
                  source: selector
                };
                
                this.courses.push(course);
                this.log('Extracted course from alternative selector', course);
              }
            } catch (error) {
              this.log('Error processing alternative element', error);
            }
          });
          break; // Stop after finding courses with one selector
        }
      }
    }

    this.log('Total courses found', this.courses.length);
    return this.courses;
  }

  /**
   * Extract course ID from Canvas URL
   */
  extractCourseIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/\/courses\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract course number from subtitle or title
   */
  extractCourseNumber(subtitle, title) {
    // Try subtitle first (usually contains course code)
    if (subtitle) {
      // Look for patterns like "CS 101", "MATH-2301", "ENG_101", etc.
      const codeMatch = subtitle.match(/([A-Za-z]{2,5}[\s\-_]?\d{2,4}[A-Za-z]?)/);
      if (codeMatch) {
        return codeMatch[1].replace(/[\s\-_]+/g, ' ').toUpperCase();
      }
    }
    
    // Try title if subtitle doesn't have course code
    if (title) {
      const codeMatch = title.match(/([A-Za-z]{2,5}[\s\-_]?\d{2,4}[A-Za-z]?)/);
      if (codeMatch) {
        return codeMatch[1].replace(/[\s\-_]+/g, ' ').toUpperCase();
      }
    }
    
    // Fallback: use subtitle as-is if it looks like a course code
    if (subtitle && subtitle.length < 20 && /[A-Za-z].*\d/.test(subtitle)) {
      return subtitle.trim().toUpperCase();
    }
    
    return '';
  }

  /**
   * Extract text from element using multiple selectors
   */
  extractTextFromElement(parent, selectors) {
    for (const selector of selectors) {
      const element = parent.querySelector(selector);
      if (element && element.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    // Fallback to parent element text if no child found
    return parent.textContent?.trim() || '';
  }

  /**
   * Send scraped data to extension popup
   */
  sendDataToPopup() {
    chrome.runtime.sendMessage({
      action: 'courseDataScraped',
      data: {
        courses: this.courses,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    }, (response) => {
      this.log('Data sent to popup', response);
    });
  }

  /**
   * Store scraped data in extension storage
   */
  async storeData() {
    try {
      await chrome.storage.local.set({
        scrapedCourses: this.courses,
        lastScrapedUrl: window.location.href,
        lastScrapedTime: new Date().toISOString()
      });
      this.log('Data stored successfully');
    } catch (error) {
      this.log('Error storing data', error);
    }
  }

  /**
   * Main scraping function
   */
  async performScraping() {
    if (!this.isCanvasDashboard()) {
      this.log('Not on Canvas dashboard, skipping scrape');
      return;
    }

    this.log('Starting course scraping');
    
    // Wait a bit for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.scrapeCourses();
    
    if (this.courses.length > 0) {
      await this.storeData();
      this.sendDataToPopup();
    } else {
      this.log('No courses found, trying fallback methods');
      
      // Try again after more delay for slow-loading pages
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.scrapeCourses();
      
      if (this.courses.length > 0) {
        await this.storeData();
        this.sendDataToPopup();
      }
    }
  }
}

// Initialize scraper
const scraper = new CanvasCourseScraper();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeCourses') {
    scraper.performScraping().then(() => {
      sendResponse({ success: true, courses: scraper.courses });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
});

// Auto-scrape when page loads (if on dashboard)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => scraper.performScraping(), 2000);
  });
} else {
  setTimeout(() => scraper.performScraping(), 2000);
}

// Monitor for dynamic content changes
const observer = new MutationObserver((mutations) => {
  const hasRelevantChanges = mutations.some(mutation => 
    mutation.type === 'childList' && 
    (mutation.target.className?.includes('dashboard') || 
     mutation.target.className?.includes('course'))
  );
  
  if (hasRelevantChanges) {
    setTimeout(() => scraper.performScraping(), 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});