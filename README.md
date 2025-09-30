# ScribeCat 📝🐱

**ScribeCat scribes and is cat** - A powerful desktop application for real-time audio transcription and intelligent note-taking, built with modern web technologies and clean architecture.

## Features

### Core Features ✨
- **Real-time Audio Transcription**: Live transcription with timestamps using Vosk (offline) or Whisper
- **Rich Text Editor**: Full-featured note-taking with comprehensive formatting toolbar
- **30 Font Options**: Extensive typography selection including serif, sans-serif, and display fonts
- **Audio Recording**: High-quality recording from microphone or connected devices
- **Canvas Integration**: Connect to Canvas LMS for course numbers and titles
- **AI-Powered Chat**: Intelligent "Ask AI" feature using Claude API with context from your notes
- **Google Drive Integration**: Save recordings and notes directly to Google Drive folders

### Advanced Features 🎨
- **Clean Architecture**: Modern, maintainable codebase with TypeScript
- **Vite Bundler**: Fast development and optimized production builds
- **Multiple Themes**: 15 preset themes with customizable color schemes
- **Auto-Polish**: AI-powered transcription improvement in real-time
- **Smart Summaries**: Generate concise summaries of your sessions
- **Title Generation**: Automatic descriptive filenames for recordings

## Download ScribeCat 🚀

Get ScribeCat for your platform:

<div align="center">

### Quick Install

[![Download for Windows](https://img.shields.io/badge/Download%20for-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/lmdrew96/ScribeCat/releases/latest/download/ScribeCat%20Setup.exe)
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
2. Run the downloaded `ScribeCat Setup.exe` file
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
- Node.js (v18 or higher)
- npm package manager
- Git

### Development Setup
```bash
# Clone the repository
git clone https://github.com/lmdrew96/ScribeCat.git
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

### Development Features
- **Hot Reload**: Instant updates during development
- **TypeScript**: Full type safety and IntelliSense
- **Vite**: Fast build tool and development server
- **Clean Architecture**: Well-organized, maintainable codebase

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

### AI Integration
ScribeCat uses Claude API for AI features:
- **Developer Key**: Included by default - works out of the box
- **Your Own Key**: Optional - get from [Anthropic Console](https://console.anthropic.com/)
- **Features**: AI chat, auto-polish, smart summaries, title generation

### Transcription Backend
Choose your preferred transcription engine:

1. **Vosk (Offline - Default)**:
   - Download a model from [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models)
   - Works completely offline
   - Privacy-focused (audio stays local)

2. **Whisper (Optional)**:
   - Cloud-based transcription
   - Higher accuracy
   - Requires internet connection

### Cloud Integration
- **Google Drive**: Save files directly to synced folders
- **Canvas LMS**: Connect for course information and organization

## Architecture

### Technology Stack
- **Electron**: Cross-platform desktop framework
- **TypeScript**: Type-safe JavaScript with modern features
- **Vite**: Fast build tool and development server
- **Node.js**: Backend runtime
- **Vosk**: Offline speech transcription (primary)
- **Whisper**: Optional cloud-based transcription
- **Claude API**: AI chat and analysis functionality

### Clean Architecture
ScribeCat follows clean architecture principles:
- **Domain Layer**: Pure business logic
- **Application Layer**: Use cases and services
- **Infrastructure Layer**: External integrations
- **UI Layer**: User interface and presentation

### Project Structure
```
ScribeCat/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload/
│   │   └── preload.ts       # Preload script for IPC
│   ├── renderer/
│   │   ├── index.html       # Main UI
│   │   ├── styles.css       # Application styles
│   │   └── app.ts           # Frontend logic
│   ├── domain/              # Business logic
│   ├── application/         # Use cases and services
│   ├── infrastructure/      # External integrations
│   └── ui/                  # User interface
├── docs/                    # Comprehensive documentation
├── assets/                  # Images, fonts, and static assets
└── test/                    # Test files
```

## Testing

### Test Suite
Run the comprehensive test suite:
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run with coverage report
npm run test:e2e        # Run end-to-end tests
```

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Complete user workflow testing
- **Type Checking**: TypeScript type safety validation

### Manual Testing Checklist
- [ ] Application launches successfully
- [ ] Recording functionality works
- [ ] Transcription displays properly
- [ ] AI features respond correctly
- [ ] Settings persist between sessions
- [ ] Cross-platform compatibility

## Documentation

Complete documentation is available in the [docs/](docs/) folder:

- **[Installation Guide](docs/setup/installation.md)** - Download and setup
- **[Development Setup](docs/setup/development-setup.md)** - Developer environment
- **[Architecture Overview](docs/architecture/overview.md)** - System design
- **[AI Integration](docs/features/ai-integration.md)** - Claude API features
- **[Troubleshooting](docs/development/troubleshooting.md)** - Common issues

## Development

### Quick Start
```bash
git clone https://github.com/lmdrew96/ScribeCat.git
cd ScribeCat
npm install
npm run dev
```

### Development Features
- **Hot Reload**: Instant updates during development
- **TypeScript**: Full type safety and IntelliSense
- **Vite**: Fast build tool and development server
- **Clean Architecture**: Well-organized, maintainable codebase

### Adding New Features
1. Follow clean architecture patterns
2. Add domain logic in `src/domain/`
3. Implement use cases in `src/application/`
4. Add infrastructure in `src/infrastructure/`
5. Update UI in `src/ui/`
6. Add tests for new functionality

## Troubleshooting

### Common Issues

**App Won't Start**
- Check Node.js version (requires v18+)
- Clear cache: `rm -rf node_modules dist && npm install`
- Check system permissions

**Audio Not Working**
- Grant microphone permissions in system settings
- Check audio device selection in ScribeCat
- Test with different applications

**AI Features Not Working**
- Check internet connection
- Verify API key configuration
- Check rate limits and quotas

### Getting Help
- Check the [Troubleshooting Guide](docs/development/troubleshooting.md)
- Search [GitHub Issues](https://github.com/lmdrew96/ScribeCat/issues)
- Create a new issue with system details and error messages

## Contributing

We welcome contributions! Please see our [Development Guide](docs/setup/development-setup.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

ISC License - See [package.json](package.json) for details

## Support

- **Documentation**: [docs/](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/lmdrew96/ScribeCat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lmdrew96/ScribeCat/discussions)

---

**Made with ❤️ for better note-taking and transcription**

*ScribeCat v1.6.2 - Built with Electron, TypeScript, and Claude AI*