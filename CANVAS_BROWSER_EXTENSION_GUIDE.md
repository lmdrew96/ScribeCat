# Canvas Browser Extension Integration Guide

This guide explains how to use the ScribeCat Canvas Browser Extension to automatically collect course data from your Canvas Instructure dashboard.

## Quick Start

1. **Install the Browser Extension**
2. **Collect Course Data from Canvas**
3. **Import Data into ScribeCat**

---

## Step 1: Install the Browser Extension

### Chrome/Chromium Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** toggle in the top right corner
3. Click **"Load unpacked"**
4. Navigate to your ScribeCat installation folder
5. Select the `browser-extension` folder
6. The ScribeCat extension should now appear in your toolbar

### Firefox Installation

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on"**
4. Navigate to the `browser-extension` folder in your ScribeCat installation
5. Select the `manifest.json` file
6. The extension will be loaded temporarily

*Note: For permanent Firefox installation, the extension would need to be signed by Mozilla.*

---

## Step 2: Collect Course Data from Canvas

### Automatic Collection

1. Navigate to your Canvas dashboard (e.g., `https://[your-school].instructure.com`)
2. The extension will automatically scan for courses when the page loads
3. A badge on the extension icon will show the number of courses found

### Manual Collection

1. Click the ScribeCat extension icon in your browser toolbar
2. Click **"Collect Courses"** to scan the current page
3. View the collected courses in the extension popup
4. The extension will show course numbers and titles found on the page

### Supported Canvas Pages

- Main dashboard (`/dashboard`)
- Course listing pages (`/courses`)
- Institution home pages that display course cards

---

## Step 3: Import Data into ScribeCat

### Method 1: Copy and Import (Recommended)

1. In the browser extension popup, click **"Copy for ScribeCat"**
2. Copy the JSON data from the modal that appears
3. Open ScribeCat desktop app
4. Click **"Manage Courses"** in the Canvas Integration section
5. Type **"import"** and press Enter
6. Paste the JSON data when prompted
7. ScribeCat will import the courses and show a success message

### Method 2: File Export

1. In the browser extension popup, select your preferred format (JSON or CSV)
2. Click **"Export"** to download the course data file
3. Open ScribeCat desktop app
4. Use the file to manually add courses or future import features

---

## Troubleshooting

### Extension Not Appearing
- Ensure developer mode is enabled in Chrome
- Check that you selected the correct `browser-extension` folder
- Refresh the extensions page and try again

### No Courses Found
- Make sure you're on your Canvas dashboard page, not a specific course page
- Try refreshing the Canvas page and collecting again
- Some Canvas configurations may have different layouts - the extension handles most common formats

### Import Issues in ScribeCat
- Ensure you copied the complete JSON data from the extension
- The JSON should start with `{` and end with `}`
- Make sure you're using the "import" action in course management

### Extension Shows Wrong Course Count
- Click "Refresh" in the extension popup
- Navigate away from Canvas and back to update the detection
- Clear the extension's storage by clicking the extension options

---

## Privacy and Security

The ScribeCat Canvas Browser Extension:

- ✅ Only activates on Canvas Instructure domains (`*.instructure.com`)
- ✅ Only collects publicly visible course information (titles and codes)
- ✅ Stores all data locally in your browser - nothing sent to external servers
- ✅ Requires minimal permissions (`activeTab` and `storage` only)
- ✅ Does not collect personal information, grades, or private data
- ✅ Respects your Canvas authentication - uses your existing logged-in session

---

## Advanced Features

### Export Formats

**JSON Format** - Structured data perfect for ScribeCat import:
```json
{
  "source": "ScribeCat Canvas Browser Extension",
  "courses": [
    {
      "id": "course_1",
      "courseNumber": "CS 101",
      "courseTitle": "Introduction to Computer Science"
    }
  ]
}
```

**CSV Format** - Spreadsheet-compatible format:
```csv
Course Number,Course Title,Canvas ID,Collected Date
"CS 101","Introduction to Computer Science","12345","2024-01-15T10:30:00.000Z"
```

### Bulk Operations

- Import multiple semesters of courses at once
- Duplicate detection prevents adding the same course twice
- Merge courses from different Canvas instances

---

## Technical Notes

### Supported Canvas Layouts

The extension works with:
- Modern Canvas dashboard cards (`.ic-DashboardCard`)
- Legacy course list items (`.course-list-item`)
- Custom institutional Canvas themes
- High contrast and accessibility modes

### Browser Compatibility

- **Chrome**: Version 88+ (Manifest V3 support)
- **Firefox**: Version 109+ (Manifest V3 support)
- **Edge**: Version 88+ (Chromium-based)

---

## Getting Help

If you encounter issues:

1. **Check Browser Console**: Press F12 and look for ScribeCat-related errors
2. **Test on Different Canvas Page**: Try the dashboard vs. course listing pages
3. **Refresh Everything**: Refresh Canvas page, refresh extension, restart browser
4. **Check Canvas Layout**: Some institutions customize Canvas heavily

---

## What's Next?

After importing your courses into ScribeCat:

1. Select a course from the dropdown when creating recordings
2. Your course information will be included in generated notes and transcriptions
3. Files will be organized by course for better management
4. Use course context for AI-generated summaries and study materials

The browser extension makes ScribeCat even more powerful by automating the tedious task of course setup!