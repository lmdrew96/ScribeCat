# Canvas Integration Methods

This document outlines various approaches for integrating with Canvas LMS to automatically retrieve course information.

## Current Implementation

The application currently supports:
- Manual course entry with dropdown selection
- Predefined course management
- Course information used in file naming and AI context

## Canvas Course Scraping Methods

### Method 1: Canvas API (Recommended)

**Pros:**
- Official API with reliable data format
- No DOM parsing required
- Stable across Canvas updates
- Rich course metadata available

**Cons:**
- Requires user to generate API access token
- Need institution-specific Canvas URL

**Implementation:**
```javascript
async function fetchCanvasCourses(canvasUrl, accessToken) {
  const response = await fetch(`${canvasUrl}/api/v1/courses`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const courses = await response.json();
  return courses.map(course => ({
    id: course.id.toString(),
    courseNumber: course.course_code,
    courseTitle: course.name
  }));
}
```

**API Endpoints:**
- `GET /api/v1/courses` - List user's courses
- `GET /api/v1/courses/:id` - Get specific course details
- Authentication: Bearer token in Authorization header

### Method 2: Browser Extension

**Pros:**
- Runs in user's authenticated browser session
- Can access Canvas pages directly
- No need for API tokens

**Cons:**
- Requires separate extension installation
- Limited to when user is on Canvas
- Different DOM structure across institutions

**Implementation Approach:**
1. Create Chrome/Firefox extension
2. Inject content script on Canvas course pages
3. Parse course list from DOM elements
4. Send data to Electron app via native messaging

**DOM Selectors (Common):**
- Course list: `.course-list-item`, `.ic-DashboardCard`
- Course names: `.course-name`, `.ic-DashboardCard__header-title`
- Course codes: `.course-code`, `.ic-DashboardCard__header-subtitle`

### Method 3: Web Scraping with Authentication

**Pros:**
- Can work without user API token setup
- Full control over data extraction

**Cons:**
- Requires handling login credentials
- Fragile to Canvas UI changes
- More complex error handling
- May violate terms of service

**Implementation:**
```javascript
async function scrapeCanvasCourses(canvasUrl, username, password) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Login
  await page.goto(`${canvasUrl}/login`);
  await page.type('#pseudonym_session_unique_id', username);
  await page.type('#pseudonym_session_password', password);
  await page.click('button[type="submit"]');
  
  // Navigate to courses
  await page.waitForSelector('.course-list-item');
  
  // Extract course data
  const courses = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.course-list-item')).map(el => ({
      name: el.querySelector('.course-name')?.textContent,
      code: el.querySelector('.course-code')?.textContent
    }));
  });
  
  await browser.close();
  return courses;
}
```

### Method 4: LTI (Learning Tools Interoperability) Integration

**Pros:**
- Official educational technology standard
- Automatic course context
- Deep Canvas integration

**Cons:**
- Requires institutional approval
- Complex setup and certification process
- Not suitable for personal use applications

## Recommended Implementation Plan

### Phase 1: Canvas API Integration
1. Add API token field to Canvas settings
2. Add "Import from Canvas" button
3. Implement Canvas API course fetching
4. Handle authentication errors gracefully

### Phase 2: Enhanced Course Management
1. Bulk import/export of course lists
2. Course synchronization with Canvas
3. Automatic course detection from Canvas URL

### Phase 3: Advanced Features
1. Browser extension for seamless integration
2. Course-specific settings and templates
3. Integration with Canvas assignments and calendars

## Security Considerations

- Store Canvas API tokens securely using keytar
- Never store Canvas login credentials
- Use HTTPS for all Canvas API requests
- Implement proper error handling for authentication failures
- Respect Canvas API rate limits

## Testing Canvas Integration

1. Set up test Canvas instance or use demo environment
2. Test with various Canvas themes and layouts
3. Verify with different institutions' Canvas setups
4. Test API rate limiting and error scenarios
5. Validate course data parsing accuracy

## Resources

- [Canvas API Documentation](https://canvas.instructure.com/doc/api/)
- [Canvas LTI Documentation](https://canvas.instructure.com/doc/api/tools_intro.html)
- [Canvas Developer Resources](https://community.canvaslms.com/t5/Developers-Group/gh-p/developers)