# ScribeCat Canvas Extension Installation Guide

This guide provides step-by-step instructions for installing and using the ScribeCat Canvas Integration browser extension.

## Prerequisites

- Chrome, Firefox, or other Chromium-based browser
- Access to your institution's Canvas LMS
- ScribeCat desktop application (for importing course data)

## Installation

### Google Chrome / Chromium-based Browsers

1. **Enable Developer Mode**
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" toggle in the top right corner

2. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `canvas-extension` folder
   - The extension should appear in your extensions list

3. **Pin the Extension (Optional)**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "ScribeCat Canvas Integration"
   - Click the pin icon to add it to your toolbar

### Mozilla Firefox

1. **Access Debug Mode**
   - Open Firefox
   - Navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar

2. **Load Temporary Add-on**
   - Click "Load Temporary Add-on..." button
   - Navigate to the `canvas-extension` folder
   - Select the `manifest.json` file
   - The extension will be loaded temporarily

**Note**: In Firefox, the extension will be removed when you restart the browser. For permanent installation, you would need to package and sign the extension through Mozilla's process.

### Microsoft Edge

1. **Enable Developer Mode**
   - Open Edge
   - Navigate to `edge://extensions/`
   - Enable "Developer mode" toggle

2. **Load Extension**
   - Click "Load unpacked"
   - Select the `canvas-extension` folder
   - Extension should appear in your extensions list

## Usage Workflow

### 1. Navigate to Canvas
- Log into your institution's Canvas LMS
- Go to your Canvas dashboard (main courses page)
- Ensure all courses are visible (you may need to scroll or click "Show all courses")

### 2. Use the Extension
- Click the ScribeCat extension icon in your browser toolbar
- The popup will indicate if Canvas is detected
- Click "Scrape Courses" to collect course data
- Review the found courses in the extension popup

### 3. Export Course Data
- Choose your export format:
  - **ScribeCat**: Optimized for direct import (recommended)
  - **JSON**: Generic format for manual processing
  - **CSV**: Spreadsheet-compatible format
- File will be downloaded to your default download folder

### 4. Import to ScribeCat Desktop App
- Open ScribeCat desktop application
- Go to Canvas Integration settings
- Click "Manage Courses"
- Type `import` and press Enter
- Select the downloaded file from the extension
- Confirm the course import

## Troubleshooting

### Extension Not Visible
- Verify developer mode is enabled
- Check browser's extension management page
- Try reloading the extension
- Ensure manifest.json is valid

### Canvas Not Detected
- Verify you're on a Canvas domain (*.instructure.com)
- Ensure you're logged into Canvas
- Try refreshing the Canvas page
- Check if your institution uses a custom Canvas domain

### No Courses Found
- Ensure you're on the Canvas dashboard/courses page
- Make sure all courses are loaded (scroll down if needed)
- Try enabling "Debug mode" in extension settings
- Check browser console for error messages
- Try clicking "Scrape Courses" multiple times

### Course Data Issues
- Some Canvas themes may display courses differently
- Course numbers may not be detected if not displayed prominently
- Try different Canvas pages (dashboard, course list, etc.)
- Manual course entry in ScribeCat may be needed for edge cases

### Import Errors in ScribeCat
- Ensure you're using the correct file format (ScribeCat recommended)
- Check that the downloaded file isn't corrupted
- Verify ScribeCat desktop app is up to date
- Try different export formats if one doesn't work

## Supported Canvas Layouts

The extension is designed to work with various Canvas themes and layouts:

- **Modern Canvas Dashboard**: Card-based course layout
- **Classic Canvas**: List-based course display
- **Institution-specific themes**: Most customizations supported
- **Mobile Canvas**: Limited support (desktop browser recommended)

## Privacy and Security

- Extension only accesses Canvas course information
- No personal data, grades, or login credentials are collected
- All data is stored locally in your browser
- No data is transmitted to external servers
- You can clear all stored data anytime using extension settings

## Updating the Extension

Since this is a development installation:

1. Download/update the extension files
2. Go to your browser's extension management page
3. Click "Reload" on the ScribeCat Canvas Integration extension
4. Extension will use the updated files

## Uninstallation

### Chrome/Edge
1. Go to extensions page (`chrome://extensions/` or `edge://extensions/`)
2. Find "ScribeCat Canvas Integration"
3. Click "Remove"

### Firefox
1. Go to `about:addons`
2. Find the extension in Extensions tab
3. Click "Remove" or wait for browser restart (temporary add-ons)

## Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Enable debug mode and check browser console
3. Try different Canvas pages and layouts
4. Report issues with specific Canvas URL patterns
5. Include browser and Canvas version information

## Next Steps

After successfully importing courses:

1. Verify courses appear in ScribeCat course dropdown
2. Test recording with course information
3. Check that file naming includes course data
4. Explore other ScribeCat features for course-specific workflows

The extension provides a seamless way to connect your Canvas courses with ScribeCat's note-taking and transcription capabilities!