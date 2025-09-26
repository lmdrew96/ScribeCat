# ScribeCat 📝🐱

**ScribeCat scribes and is cat** - A powerful desktop application for real-time audio transcription and intelligent note-taking.

## Features

### Main Features ✨
- **Real-time Audio Transcription**: Accumulate live transcription with timestamps via AssemblyAI API
- **Rich Text Editor**: Full-featured note-taking with comprehensive formatting toolbar
- **30 Font Options**: Extensive typography selection including:
  - 5 Traditional Serif fonts (Times New Roman, Georgia, Garamond, Book Antiqua, Palatino)
  - 5 Non-Traditional Serif fonts (Playfair Display, Crimson Text, Libre Baskerville, Merriweather, Vollkorn)
  - 10 Traditional Sans Serif fonts (Arial, Helvetica, Calibri, Tahoma, Verdana, Geneva, Lucida Sans, Trebuchet MS, Century Gothic, Franklin Gothic)
  - 10 Non-Traditional Sans Serif fonts (Inter, Roboto, Open Sans, Lato, Montserrat, Source Sans Pro, Nunito, Poppins, Raleway, Work Sans)
- **Audio Recording**: Record from device microphone or connected devices with vocal isolation
- **Canvas Integration**: Connect to Canvas Instructure for course numbers and titles (no OAuth required)
- **AI-Powered Chat**: Collapsible "Ask AI" window using OpenAI with context from notes and transcription
- **Google Drive Integration**: Save recordings and notes directly to Google Drive folders

### Additional Features 🎨
- **Immersive UI/UX**: Modern, vibrant interface with smooth animations
- **Multiple Themes**: 5+ preset themes with customizable color schemes
- **Real-time Clock**: Date and time display synced to user's timezone
- **Status Monitoring**: Color-coded health status chips for app functions
- **Version Tracking**: Version number display in bottom-left corner
- **Collapsible Sidebar**: Organized settings and tools management

## Download ScribeCat 🚀

Get ScribeCat for your platform:

<div align="center">

### Quick Install

[![Download for Windows](https://img.shields.io/badge/Download%20for-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/lmdrew96/ScribeCat/releases/latest/download/ScribeCat-Setup.exe)
&nbsp;&nbsp;&nbsp;
[![Download for macOS](https://img.shields.io/badge/Download%20for-macOS-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/lmdrew96/ScribeCat/releases/latest/download/ScribeCat.dmg)

**System Requirements:**
- Windows 10/11 (64-bit) or macOS 10.14+
- 4GB RAM minimum, 8GB recommended
- 500MB free disk space

</div>

### Installation Instructions

#### Windows
1. Click the **Download for Windows** button above
2. Run the downloaded `ScribeCat-Setup.exe` file
3. Follow the installation wizard
4. Launch ScribeCat from your Start Menu or Desktop

#### macOS
1. Click the **Download for macOS** button above
2. Open the downloaded `ScribeCat.dmg` file
3. Drag ScribeCat to your Applications folder
4. Launch ScribeCat from Applications or Launchpad

---

## Development Installation

> **Note for Developers:** The instructions below are for setting up a development environment. If you just want to use ScribeCat, use the download buttons above.

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd ScribeCat

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Building for Production

#### Build for Current Platform
```bash
npm run build
```

#### Build for Specific Platforms
```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Package without installer (for testing)
npm run pack
```

## Usage

### Getting Started
1. **Launch ScribeCat** - Start the application
2. **Configure Settings** - Open the sidebar to set up:
   - Canvas URL and course information
   - Google Drive folder for saving files
   - Audio device selection
   - Theme preferences

### Recording and Transcription
1. **Start Recording** - Click the red record button
2. **Take Notes** - Use the rich text editor with formatting options
3. **View Live Transcription** - Real-time transcription appears in the right panel
4. **Save Session** - Click save to export to Google Drive

### AI Assistant
- Click the "Ask AI" chat window to interact with context-aware AI
- Ask questions about your notes or transcription content
- Get intelligent insights and summaries

## Configuration

### API Keys Setup
Add your API keys through the application settings or environment variables:

- **AssemblyAI API Key**: For real-time transcription
- **OpenAI API Key**: For AI chat functionality

### Google Drive Integration
ScribeCat uses Drive-for-desktop folder sync:
1. Install Google Drive for Desktop
2. Select your Drive folder in ScribeCat settings
3. Files are saved directly to the selected folder

## Architecture

### Technology Stack
- **Electron**: Cross-platform desktop framework
- **Node.js**: Backend runtime
- **HTML/CSS/JavaScript**: Frontend interface
- **AssemblyAI**: Real-time speech transcription
- **OpenAI**: AI chat functionality

### Project Structure
```
ScribeCat/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload/
│   │   └── preload.js       # Preload script for IPC
│   └── renderer/
│       ├── index.html       # Main UI
│       ├── styles.css       # Application styles
│       └── app.js           # Frontend logic
├── assets/
│   ├── images/              # Application icons and images
│   └── fonts/               # Custom fonts
├── test/
│   └── smoke-test.js        # Basic functionality tests
└── package.json             # Project configuration
```

## Testing

### Smoke Tests
Run the comprehensive smoke test suite:
```bash
npm test
```

The smoke test validates:
- File structure integrity
- Configuration validity
- Required dependencies
- HTML/CSS/JS syntax
- Build system functionality

### Manual Testing Checklist
- [ ] Application launches successfully
- [ ] Recording functionality works
- [ ] Transcription displays properly
- [ ] Text editor formatting tools function
- [ ] Sidebar settings save correctly
- [ ] Google Drive integration saves files
- [ ] AI chat responds to queries
- [ ] Themes change appearance
- [ ] Cross-platform compatibility

## Development

### IPC Communication
The app uses Electron's IPC for secure communication between main and renderer processes:

- `drive:ensure-target` - Ensure target directory exists
- `drive:save-html` - Save HTML content to drive
- `store:get/set` - Persistent settings storage
- `save-audio-file` - Save recorded audio

### Adding New Features
1. Update the renderer UI (HTML/CSS)
2. Add frontend logic (app.js)
3. Implement IPC handlers (main.js)
4. Update preload script if needed
5. Add to smoke tests

## Troubleshooting

### Common Issues

**Sandbox Error on Linux**
```bash
# Use the no-sandbox flag for development
npm run dev
```

**Audio Permissions**
- Ensure microphone permissions are granted
- Check browser/system audio settings

**Build Issues**
- Clear node_modules and reinstall dependencies
- Ensure all required dependencies are installed

### Logs and Debugging
- Development: DevTools are automatically opened
- Production: Check console logs in the application
- Build errors: Check the builder-debug.yml file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

ISC License - See package.json for details

## Support

For issues and feature requests, please create an issue in the repository.

---

**Made with ❤️ for better note-taking and transcription**