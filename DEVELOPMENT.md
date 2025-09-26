# ScribeCat Development Guide 🛠️

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```
This starts the app with DevTools open and hot reloading enabled.

### 3. Testing
```bash
npm test
```
Runs comprehensive smoke tests to validate the application structure.

## API Configuration

### AssemblyAI Setup
1. Get API key from [AssemblyAI Console](https://www.assemblyai.com/app)
2. In the app, go to Settings → API Keys
3. Enter your AssemblyAI key for real-time transcription

### OpenAI Setup  
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. In the app, go to Settings → API Keys
3. Enter your OpenAI key for AI chat functionality

## Google Drive Integration

### Setup Drive-for-Desktop
1. Install [Google Drive for Desktop](https://www.google.com/drive/download/)
2. Sign in and sync your Drive
3. In ScribeCat, select your Google Drive folder via Settings → Google Drive

### File Organization
ScribeCat saves three files per session:
- `CourseNumber_timestamp_audio.wav` - Audio recording
- `CourseNumber_timestamp_notes.html` - Formatted notes
- `CourseNumber_timestamp_transcription.html` - Full transcription

## Building and Distribution

### Development Builds
```bash
npm run pack          # Package without installer (testing)
npm run build         # Build for current platform
```

### Platform-Specific Builds
```bash
npm run build:win     # Windows (NSIS installer)
npm run build:mac     # macOS (DMG)
```

### Build Outputs
- Windows: `dist/ScribeCat Setup.exe`
- macOS: `dist/ScribeCat.dmg`
- Unpacked: `dist/platform-unpacked/`

## Architecture Deep Dive

### Process Communication
```
Main Process (main.js)
    ↕ IPC
Renderer Process (app.js)
    ↕ Context Bridge
Preload Script (preload.js)
```

### Key IPC Channels
- `drive:ensure-target` - Create directories
- `drive:save-html` - Save HTML files
- `save-audio-file` - Save WAV recordings
- `store:get/set` - Persistent settings
- `show-folder-dialog` - File picker

### Settings Storage
Uses `electron-store` for persistent configuration:
```javascript
{
  "theme": "default",
  "canvas-settings": { ... },
  "drive-folder": "/path/to/drive",
  "audio-settings": { ... },
  "assemblyai-key": "...",
  "openai-key": "..."
}
```

## Feature Development

### Adding New Themes
1. Add CSS variables in `styles.css`:
```css
[data-theme="mytheme"] {
  --primary-color: #your-color;
  --background: #your-bg;
  /* ... */
}
```
2. Add option to theme selector in `index.html`
3. Update theme change handler in `app.js`

### Adding Recording Features
1. Extend `MediaRecorder` configuration in `startRecording()`
2. Add new audio processing in `mediaRecorder.ondataavailable`
3. Update UI controls and status indicators

### Extending AI Chat
1. Update `getAIResponse()` method in `app.js`
2. Add OpenAI API integration with proper error handling
3. Enhance context building from notes and transcription

## Testing Strategy

### Automated Tests
- **Smoke Tests**: Basic structure and file validation
- **Build Tests**: Verify packaging works correctly
- **Integration Tests**: (Future) Test API integrations

### Manual Testing Checklist
```
Recording Functionality:
□ Start/stop recording works
□ Audio devices are detected
□ Recording timer updates correctly
□ Audio files save properly

Text Editor:
□ All 30 fonts load correctly
□ Formatting buttons work
□ Content persists between sessions
□ HTML export includes formatting

Transcription:
□ Real-time updates display
□ Timestamps are accurate
□ Content exports correctly
□ Clear function works

Settings:
□ All settings persist
□ Canvas info saves
□ Drive folder selection works
□ Theme changes apply

Cross-Platform:
□ Windows build works
□ macOS build works
□ UI scales properly
□ File paths handle correctly
```

## Debugging

### Common Issues

**App Won't Start**
```bash
# Check for dependency issues
npm install --force
npm run dev
```

**Build Fails**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**Audio Not Working**
- Check microphone permissions
- Verify HTTPS context (required for MediaRecorder)
- Test with different audio devices

**IPC Errors**
- Verify preload script is loaded
- Check context isolation settings
- Validate IPC channel names

### Debug Tools
- **Main Process**: Console logs in terminal
- **Renderer Process**: DevTools (automatically opens in dev mode)
- **Build Process**: Check `dist/builder-debug.yml`

## Contributing

### Code Style
- Use ES6+ features
- Follow Electron security best practices
- Comment complex functionality
- Update tests for new features

### Pull Request Process
1. Fork and create feature branch
2. Run `npm test` to ensure tests pass
3. Test on both Windows and macOS if possible
4. Update documentation for new features
5. Submit PR with clear description

## Security Considerations

### Best Practices Implemented
- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Secure IPC communication
- ✅ No remote module usage
- ✅ Content Security Policy ready

### API Key Security
- Keys stored in electron-store (encrypted)
- Never expose keys in renderer process
- Use environment variables for CI/CD

## Performance Optimization

### Current Optimizations
- Lazy loading of audio devices
- Efficient DOM updates for transcription
- Throttled auto-save for notes
- Minimal IPC calls

### Future Improvements
- Audio streaming optimization
- Transcription chunking
- Memory usage monitoring
- Background processing for large files

---

Happy coding! 🚀