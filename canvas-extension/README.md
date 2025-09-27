# ScribeCat Canvas Integration Browser Extension

A browser extension to intelligently scrape Canvas course data for integration with the ScribeCat desktop application.

## Features

- **Smart Course Detection**: Automatically detects and extracts course numbers and titles from Canvas dashboard
- **Multiple Canvas Layouts**: Compatible with various Canvas themes and institutional customizations
- **Privacy-Focused**: No personal data collection, only course metadata
- **Export Options**: JSON, CSV, and ScribeCat-specific formats
- **Real-time Scraping**: Updates course data as you navigate Canvas
- **Error Handling**: Robust fallback methods for different Canvas layouts

## Installation

### Chrome/Chromium-based browsers

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `canvas-extension` folder
5. The extension should now appear in your extensions list

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `canvas-extension` folder
5. The extension will be loaded temporarily

## Usage

### Basic Workflow

1. **Navigate to Canvas**: Go to your institution's Canvas dashboard
2. **Open Extension**: Click the ScribeCat extension icon in your browser toolbar
3. **Scrape Courses**: Click "Scrape Courses" to collect course data from the current page
4. **Export Data**: Choose your preferred export format:
   - **JSON**: For manual import or data analysis
   - **CSV**: For spreadsheet applications
   - **ScribeCat**: Optimized format for direct import into ScribeCat desktop app
5. **Import to ScribeCat**: Use the exported file in ScribeCat's course management

### Supported Canvas URLs

- `*.instructure.com` (most educational institutions)
- `*.canvas.com` (some custom Canvas domains)

### Auto-Scraping

The extension can automatically scrape course data when you visit Canvas dashboard pages. This feature is enabled by default but can be disabled in the extension settings.

## Data Collection

### What is Collected

- Course numbers/codes (e.g., "CS 101", "MATH 2301")
- Course titles (e.g., "Introduction to Computer Science")
- Canvas course IDs (for reference)
- Course URLs (for navigation)

### What is NOT Collected

- Personal information
- Grades or student data
- Canvas login credentials
- Content from course pages
- Any data outside of basic course metadata

## Privacy & Security

- **Local Storage Only**: All data is stored locally in your browser
- **No External Servers**: No data is sent to third-party servers
- **Minimal Permissions**: Only requests access to Canvas domains
- **Open Source**: All code is available for review
- **Secure**: Uses Chrome/Firefox extension security model

## Troubleshooting

### No Courses Found

1. Ensure you're logged into Canvas
2. Navigate to your Canvas dashboard (main courses page)
3. Wait for the page to fully load
4. Try clicking "Refresh" in the extension popup
5. Try manually clicking "Scrape Courses"

### Different Canvas Layout

Canvas institutions use different themes and layouts. If scraping fails:

1. Enable "Debug mode" in extension settings
2. Open browser developer tools (F12)
3. Check console for ScribeCat Canvas logs
4. Try scraping multiple times
5. Report the issue with your institution's Canvas URL format

### Extension Not Working

1. Ensure you're on a Canvas domain (*.instructure.com or *.canvas.com)
2. Check that the extension is enabled in your browser
3. Refresh the Canvas page
4. Reload the extension in your browser's extension manager
5. Check browser console for error messages

### Data Export Issues

1. Ensure your browser allows downloads
2. Check your default download folder
3. Try different export formats
4. Clear extension data and scrape again

## Technical Details

### Supported Canvas Elements

The extension looks for course data in various DOM structures:

**Modern Canvas Dashboard:**
- `.ic-DashboardCard` - Main course cards
- `.ic-DashboardCard__header-title` - Course titles
- `.ic-DashboardCard__header-subtitle` - Course codes

**Legacy Canvas Layouts:**
- `.course-list-item` - Course list items
- `.course-name` - Course name elements
- `.course-code` - Course code elements

**Alternative Selectors:**
- `.course-card` - Alternative card layout
- `[data-testid="DashboardCard"]` - Test ID based selection
- Various fallback selectors for different themes

### Export Formats

**JSON Format:**
```json
{
  "courses": [
    {
      "id": "12345",
      "courseNumber": "CS 101",
      "courseTitle": "Introduction to Computer Science",
      "url": "https://canvas.university.edu/courses/12345"
    }
  ],
  "exportedAt": "2024-01-01T12:00:00.000Z",
  "source": "ScribeCat Canvas Extension"
}
```

**CSV Format:**
```csv
Course Number,Course Title,Canvas ID,URL
"CS 101","Introduction to Computer Science","12345","https://canvas.university.edu/courses/12345"
```

**ScribeCat Format:**
```json
{
  "version": "1.0",
  "type": "canvas-courses",
  "importedAt": "2024-01-01T12:00:00.000Z",
  "courses": [
    {
      "id": "12345",
      "courseNumber": "CS 101",
      "courseTitle": "Introduction to Computer Science",
      "canvasId": "12345",
      "source": "canvas-extension"
    }
  ]
}
```

## Development

### File Structure

```
canvas-extension/
├── manifest.json          # Extension manifest
├── scripts/
│   ├── content.js         # Content script for Canvas scraping
│   └── background.js      # Background service worker
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── icons/
│   ├── icon16.png         # 16x16 extension icon
│   ├── icon48.png         # 48x48 extension icon
│   └── icon128.png        # 128x128 extension icon
└── README.md              # This file
```

### Testing

1. Load the extension in development mode
2. Navigate to a Canvas dashboard
3. Open browser developer tools
4. Check console for debug messages
5. Test scraping functionality
6. Verify export formats

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on different Canvas instances
5. Submit a pull request

## Integration with ScribeCat Desktop App

The extension generates data in a format compatible with ScribeCat's course management system. To import:

1. Export courses using "ScribeCat" format
2. In ScribeCat desktop app, go to Canvas Integration settings
3. Use the "Manage Courses" functionality
4. Import the JSON file (feature may need to be implemented in desktop app)

## Limitations

- Requires manual navigation to Canvas dashboard
- Some Canvas customizations may not be detected
- Export requires manual download and import process
- No real-time sync with ScribeCat desktop app (yet)

## Future Enhancements

- Native messaging to ScribeCat desktop app
- Automatic course synchronization
- Support for more Canvas page types
- Course schedule and assignment integration
- Bulk course management features

## Support

For issues, suggestions, or contributions:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Report issues with specific Canvas URL patterns
4. Include browser and Canvas version information

## License

This extension is part of the ScribeCat project and follows the same licensing terms.