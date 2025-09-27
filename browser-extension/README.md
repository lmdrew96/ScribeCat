# ScribeCat Canvas Course Collector Browser Extension

A browser extension that automatically collects course information from Canvas Instructure dashboards for use with the ScribeCat desktop application.

## Features

- **Automatic Course Detection**: Automatically detects and scrapes course data when visiting Canvas dashboard pages
- **Cross-Browser Support**: Compatible with Chrome and Firefox (Manifest V3)
- **Privacy-Focused**: Only accesses Canvas domains, minimal permissions required
- **Multiple Export Formats**: Export course data as JSON or CSV
- **ScribeCat Integration**: Direct integration with ScribeCat desktop app via clipboard import
- **User-Friendly Interface**: Clean popup interface for course management and export

## Installation

### Chrome/Chromium

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `browser-extension` folder
4. The extension icon should appear in your toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `browser-extension` folder

## Usage

### Collecting Courses

1. Navigate to your Canvas dashboard (e.g., `https://[your-institution].instructure.com`)
2. Click the ScribeCat extension icon in your browser toolbar
3. Click "Collect Courses" to scan the current page for course information
4. The extension will automatically detect course cards and extract:
   - Course numbers/codes
   - Course titles
   - Canvas course IDs

### Exporting Data

**Option 1: File Export**
1. After collecting courses, choose your preferred format (JSON or CSV)
2. Click "Export" to download the course data file
3. Import the file into ScribeCat using the course management feature

**Option 2: Direct Copy**
1. Click "Copy for ScribeCat" to prepare import data
2. Copy the formatted JSON data to your clipboard
3. Paste directly into ScribeCat's course import feature

### Supported Canvas Layouts

The extension supports multiple Canvas dashboard layouts:
- Modern Canvas dashboard cards (`.ic-DashboardCard`)
- Legacy course list items (`.course-list-item`)  
- Custom institutional themes
- Accessibility-enhanced layouts

## Technical Details

### DOM Selectors

The extension uses multiple selector strategies to handle different Canvas configurations:

```javascript
// Course cards
'.ic-DashboardCard', '.course-list-item', '[data-testid="DashboardCard"]'

// Course titles  
'.ic-DashboardCard__header-title', '.course-name'

// Course codes
'.ic-DashboardCard__header-subtitle', '.course-code'
```

### Data Format

Exported course data follows this structure:

```json
{
  "source": "ScribeCat Canvas Course Collector",
  "exported": "2024-01-15T10:30:00.000Z",
  "courses": [
    {
      "id": "course_1",
      "courseNumber": "CS 101",
      "courseTitle": "Introduction to Computer Science",
      "canvasId": "12345",
      "collected": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Privacy & Security

- **Domain Restriction**: Only activates on `*.instructure.com` domains
- **Minimal Permissions**: Requests only `activeTab` and `storage` permissions
- **Local Storage**: All data stored locally in browser, never sent to external servers
- **No Personal Data**: Only collects publicly visible course information
- **User Control**: All data collection and export initiated by user action

## Troubleshooting

### Extension Not Working
- Ensure you're on a Canvas dashboard page
- Refresh the page and try again
- Check that Canvas has fully loaded before collecting courses

### No Courses Found
- Verify you're on the main dashboard page, not a specific course page
- Some Canvas configurations may use different DOM structures
- Try refreshing the page and collecting again

### Export Issues
- Ensure you have collected courses first
- Check browser's download permissions
- Try a different export format

### ScribeCat Integration
- Copy the formatted JSON data using "Copy for ScribeCat"
- In ScribeCat, use the course management feature to import
- Paste the JSON data when prompted

## Development

### File Structure
```
browser-extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── scripts/
│   ├── content-script.js     # Main course collection logic
│   └── background.js         # Background service worker
├── popup/
│   ├── popup.html           # Extension popup interface
│   ├── popup.css            # Popup styling
│   └── popup.js             # Popup functionality
└── README.md                # This file
```

### Building/Testing
- Load extension in developer mode
- Test on various Canvas institutions
- Verify course data extraction accuracy
- Test export functionality

## Compatibility

- **Chrome**: Version 88+ (Manifest V3 support)
- **Firefox**: Version 109+ (Manifest V3 support)
- **Canvas**: All modern Canvas Instructure installations
- **ScribeCat**: Version 1.0.0+

## Contributing

When modifying the extension:
1. Test on multiple Canvas institutions
2. Verify DOM selector robustness
3. Ensure privacy compliance
4. Update documentation as needed

## License

This extension is part of the ScribeCat project and follows the same licensing terms.