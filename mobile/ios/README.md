# ScribeCat iOS - Mobile Companion App

Welcome to the ScribeCat iOS mobile companion app! This SwiftUI-based application provides a native iOS experience for audio transcription and note-taking, designed to complement the ScribeCat desktop application.

## 🚀 Quick Start

### Prerequisites

- **Xcode 15.0+** (for iOS 15+ deployment target)
- **macOS 14.0+** (for development)
- **Apple Developer Account** (for device testing and App Store deployment)
- **iOS Device or Simulator** running iOS 15.0+

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/lmdrew96/ScribeCat.git
   cd ScribeCat/mobile/ios
   ```

2. **Open the Xcode Project**
   ```bash
   open ScribeCat-iOS.xcodeproj
   ```

3. **Configure Development Team**
   - In Xcode, select the `ScribeCat-iOS` project
   - Go to **Signing & Capabilities**
   - Select your **Development Team**
   - Ensure **Automatically manage signing** is checked

4. **Build and Run**
   - Select a simulator or connected device
   - Press `Cmd+R` to build and run

## 📱 App Architecture

### Technology Stack

- **SwiftUI** - Modern declarative UI framework
- **Combine** - Reactive programming for data flow
- **Core Data** - Local data persistence
- **CloudKit** - Cross-device synchronization
- **AVFoundation** - Audio recording and processing
- **Swift Package Manager** - Dependency management

### Project Structure

```
ScribeCat-iOS/
├── ScribeCat-iOS/
│   ├── ScribeCat_iOSApp.swift        # App entry point
│   ├── ContentView.swift             # Main TabView container
│   ├── Views/
│   │   ├── HomeView.swift            # Overview and recent sessions
│   │   ├── RecordView.swift          # Audio recording interface
│   │   ├── NotesView.swift           # Notes and session management
│   │   └── SettingsView.swift        # App configuration
│   ├── Models/
│   │   ├── DataModel.swift           # Core Data extensions
│   │   ├── DataController.swift      # Core Data + CloudKit setup
│   │   └── ScribeCat.xcdatamodeld/   # Core Data model
│   ├── Managers/
│   │   ├── AudioRecordingManager.swift  # Audio recording logic
│   │   └── MockAPI.swift             # API interface (mock implementation)
│   ├── Resources/
│   │   ├── Assets.xcassets/          # App icons and images
│   │   ├── Localizable.strings       # English strings
│   │   └── ScribeCat-iOS.entitlements # CloudKit and background permissions
│   └── Preview Content/              # SwiftUI preview assets
├── ScribeCat-iOSTests/              # Unit tests
├── ScribeCat-iOSUITests/            # UI tests
└── fastlane/                       # Deployment automation
```

### Key Features

- **📱 Native iOS Interface** - TabView with Home, Record, Notes, and Settings
- **🎙️ Background Audio Recording** - Power-optimized recording with AVAudioSession
- **☁️ CloudKit Sync** - Seamless synchronization across devices
- **💾 Core Data Storage** - Local data persistence with CloudKit integration
- **🌍 Multi-language Support** - English, Spanish, and Romanian
- **🔄 Mock API Integration** - Ready to switch to real ScribeCat API
- **🧪 Comprehensive Testing** - Unit tests and UI tests included
- **🚀 CI/CD Ready** - GitHub Actions and Fastlane configuration

## 🛠️ Development

### Running Tests

```bash
# Run all tests
xcodebuild test -project ScribeCat-iOS.xcodeproj -scheme ScribeCat-iOS -destination 'platform=iOS Simulator,name=iPhone 15'

# Run specific test suite
xcodebuild test -project ScribeCat-iOS.xcodeproj -scheme ScribeCat-iOS -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:ScribeCat-iOSTests

# Run UI tests
xcodebuild test -project ScribeCat-iOS.xcodeproj -scheme ScribeCat-iOS -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:ScribeCat-iOSUITests
```

### Using Fastlane

```bash
# Install Fastlane
gem install fastlane

# Setup development environment
fastlane ios setup

# Run tests
fastlane ios test

# Build for simulator
fastlane ios build_simulator

# Clean build artifacts
fastlane ios clean
```

### Debug Menu

The app includes a debug menu in Settings for development:

- **Add Sample Data** - Creates test sessions and notes
- **Clear All Data** - Removes all local data
- **Switch to Real API** - Instructions for production API integration

## ☁️ CloudKit Setup

### Apple Developer Configuration

1. **Enable CloudKit**
   - Go to [Apple Developer Console](https://developer.apple.com)
   - Select your app identifier
   - Enable **CloudKit** capability
   - Configure CloudKit container: `iCloud.com.scribecat.ScribeCat-iOS`

2. **CloudKit Console Setup**
   - Open [CloudKit Console](https://icloud.developer.apple.com)
   - Create record types that match your Core Data entities:
     - `Session` with fields: title, timestamp, duration, transcription, notes, etc.
     - `Note` with fields: title, body, timestamp, language, tags

3. **Entitlements Configuration**
   The app is pre-configured with necessary entitlements in `ScribeCat-iOS.entitlements`:
   ```xml
   <key>com.apple.developer.icloud-services</key>
   <array>
       <string>CloudKit</string>
   </array>
   <key>com.apple.developer.icloud-container-identifiers</key>
   <array>
       <string>iCloud.com.scribecat.ScribeCat-iOS</string>
   </array>
   ```

### Troubleshooting CloudKit

- **Development vs Production**: CloudKit has separate development and production environments
- **Schema Initialization**: Use `DataController.initializeCloudKitSchema()` during development
- **Account Status**: The app checks CloudKit availability and gracefully falls back to local-only storage

## 🔄 API Integration

### Current Status: Mock API

The app currently uses `MockAPI.swift` which simulates the ScribeCat desktop API for development and testing.

### Switching to Real API

1. **Create RealAPI Implementation**
   ```swift
   class RealAPI: APIClientProtocol, ObservableObject {
       private let baseURL = "https://api.scribecat.com"
       // Implement real HTTP requests
   }
   ```

2. **Update Dependency Injection**
   ```swift
   // In your views, replace:
   @StateObject private var api = MockAPI.shared
   // With:
   @StateObject private var api = RealAPI.shared
   ```

3. **Configure Endpoints**
   ```swift
   struct APIEndpoints {
       static let base = "https://api.scribecat.com"
       static let transcription = "/v1/transcribe"
       static let sync = "/v1/sync"
       static let auth = "/v1/auth"
   }
   ```

4. **Add Authentication**
   - Implement OAuth or API key authentication
   - Store credentials securely in Keychain
   - Handle token refresh logic

### API Interface

The app implements these key endpoints:

- **`transcribeAudio(_:)`** - Upload audio for transcription
- **`syncData(_:)`** - Synchronize notes and sessions
- **`authenticate(username:password:)`** - User authentication
- **`refreshToken()`** - Refresh authentication tokens

## 🌍 Localization

### Supported Languages

- **English** (`en`) - Default
- **Spanish** (`es`) - `es.lproj/Localizable.strings`
- **Romanian** (`ro`) - `ro.lproj/Localizable.strings`

### Adding New Languages

1. **Create Language Directory**
   ```bash
   mkdir mobile/ios/[language-code].lproj
   ```

2. **Add Localized Strings**
   ```bash
   cp mobile/ios/Localizable.strings mobile/ios/[language-code].lproj/
   # Translate the strings in the new file
   ```

3. **Update Xcode Project**
   - In Xcode, select `Localizable.strings`
   - In the File Inspector, click **Localize**
   - Add the new language

### Editing Localizations

All user-facing strings use the localization system:

```swift
Text("home.welcome")  // Displays localized welcome message
```

String keys are organized by feature area (e.g., `home.*`, `record.*`, `settings.*`).

## 🔋 Battery & Memory Optimization

### Audio Recording Optimizations

The app implements several battery and memory optimizations:

1. **Efficient Audio Session Configuration**
   ```swift
   // Use smaller buffer sizes for efficiency
   try audioSession.setPreferredIOBufferDuration(0.1)
   
   // Deactivate session when not recording
   try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
   ```

2. **Adaptive Quality Settings**
   ```swift
   // Reduce quality in low power mode
   if ProcessInfo.processInfo.isLowPowerModeEnabled {
       // Use lower sample rate and mono audio
   }
   ```

3. **Background Recording Configuration**
   ```swift
   // Proper background audio setup
   try audioSession.setCategory(.playAndRecord, mode: .default, 
                               options: [.defaultToSpeaker, .allowBluetooth])
   ```

### Power-Conscious Features

- **Configurable real-time transcription** - Can be disabled to save battery
- **Compressed audio formats** - AAC compression by default
- **Efficient timer usage** - Minimal UI update frequency
- **Smart buffer management** - Write to disk periodically instead of large in-memory buffers

### Settings for Battery Life

Users can optimize battery life through Settings:

- **Disable Real-time Transcription** - Saves CPU during recording
- **Lower Audio Quality** - Reduces processing overhead
- **Disable CloudKit Sync** - Reduces network usage

## 🚀 Deployment

### GitHub Actions CI/CD

The repository includes automated CI/CD with `.github/workflows/ios-build.yml`:

- **Build Validation** - Ensures code compiles for iOS simulator
- **Automated Testing** - Runs unit and UI tests
- **TestFlight Deployment** - (requires Apple Developer secrets)
- **Build Size Analysis** - Tracks app bundle size changes

### Required GitHub Secrets

For full CI/CD functionality, configure these secrets:

```
FASTLANE_USER                              # Apple ID email
FASTLANE_PASSWORD                          # Apple ID password
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD  # App-specific password
MATCH_PASSWORD                             # Certificate management password
```

### Fastlane Lanes

```bash
# Development
fastlane ios setup           # Setup development environment
fastlane ios test            # Run all tests
fastlane ios build_simulator # Build for simulator

# Deployment
fastlane ios beta            # Deploy to TestFlight
fastlane ios release         # Deploy to App Store (placeholder)

# Maintenance
fastlane ios clean           # Clean build artifacts
fastlane ios certificates    # Update certificates (requires Match setup)
fastlane ios screenshots     # Generate App Store screenshots (placeholder)
```

### Manual TestFlight Deployment

1. **Configure Signing**
   - Set up proper development team and certificates
   - Configure provisioning profiles for App Store distribution

2. **Archive Build**
   ```bash
   xcodebuild archive \
     -project ScribeCat-iOS.xcodeproj \
     -scheme ScribeCat-iOS \
     -destination "generic/platform=iOS" \
     -archivePath ScribeCat-iOS.xcarchive
   ```

3. **Export IPA**
   ```bash
   xcodebuild -exportArchive \
     -archivePath ScribeCat-iOS.xcarchive \
     -exportPath . \
     -exportOptionsPlist ExportOptions.plist
   ```

4. **Upload to TestFlight**
   ```bash
   xcrun altool --upload-app \
     --type ios \
     --file ScribeCat-iOS.ipa \
     --username your@apple.id \
     --password your-app-specific-password
   ```

## 🧪 Testing

### Unit Tests (`ScribeCat-iOSTests`)

- **Core Data Model Tests** - Verify entity creation and relationships
- **MockAPI Tests** - Validate mock service behavior
- **Audio Manager Tests** - Test audio file operations
- **Settings Manager Tests** - Validate preference storage

### UI Tests (`ScribeCat-iOSUITests`)

- **Navigation Tests** - Verify tab bar and view transitions
- **Recording Flow Tests** - Test complete recording workflow
- **Settings Interaction Tests** - Validate settings UI functionality
- **Modal Presentation Tests** - Test modal views and dismissal

### Running Tests in Simulator

1. **Select Test Scheme**
   - Choose `ScribeCat-iOS` scheme in Xcode
   - Select iPhone 15 simulator (or your preferred device)

2. **Run Tests**
   - Press `Cmd+U` to run all tests
   - Use Test Navigator to run specific test suites

### Performance Testing

The test suite includes performance benchmarks:

- **Launch Performance** - App startup time measurement
- **Tab Switching Performance** - UI responsiveness testing
- **Data Creation Performance** - Core Data operation benchmarks

## 📖 Additional Resources

### Apple Documentation

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Core Data with CloudKit](https://developer.apple.com/documentation/coredata/mirroring_a_core_data_store_with_cloudkit)
- [AVFoundation Audio Recording](https://developer.apple.com/documentation/avfoundation/audio_playback_recording_and_processing)
- [Background App Refresh](https://developer.apple.com/documentation/backgroundtasks)

### Development Tools

- [Xcode](https://developer.apple.com/xcode/)
- [Fastlane](https://fastlane.tools/)
- [SwiftUI Previews](https://developer.apple.com/documentation/swiftui/previews-in-xcode)
- [Instruments](https://developer.apple.com/instruments/) - Performance profiling

### Community Resources

- [SwiftUI by Example](https://www.hackingwithswift.com/quick-start/swiftui)
- [Core Data by Example](https://www.hackingwithswift.com/books/core-data)
- [iOS Dev Weekly](https://iosdevweekly.com/)

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow SwiftUI and iOS best practices
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Changes**
   ```bash
   fastlane ios test
   ```

4. **Submit Pull Request**
   - Ensure CI/CD passes
   - Include description of changes
   - Reference related issues

### Code Style

- **SwiftUI Patterns** - Use declarative syntax and view composition
- **MVVM Architecture** - Separate UI, business logic, and data layers
- **Combine Publishers** - Use reactive patterns for data flow
- **Error Handling** - Implement proper error handling and user feedback

### Debugging Tips

1. **Core Data Issues**
   ```swift
   // Enable Core Data debugging
   -com.apple.CoreData.SQLDebug 1
   ```

2. **CloudKit Issues**
   ```swift
   // Enable CloudKit logging
   -com.apple.CoreData.CloudKitDebug 1
   ```

3. **Memory Issues**
   - Use Instruments to profile memory usage
   - Watch for retain cycles in Combine publishers
   - Monitor audio buffer memory usage

## 📝 Changelog

### Version 1.0.0 (Scaffold)

**Features:**
- ✅ SwiftUI TabView with Home, Record, Notes, Settings
- ✅ Core Data + CloudKit integration
- ✅ Background audio recording with power optimizations
- ✅ Mock API implementation ready for real integration
- ✅ Multi-language support (EN, ES, RO)
- ✅ Comprehensive test suite (unit + UI tests)
- ✅ GitHub Actions CI/CD pipeline
- ✅ Fastlane deployment automation
- ✅ Privacy-focused design with user controls

**Technical Notes:**
- iOS 15.0+ deployment target for broad compatibility
- Swift Package Manager for dependency management
- CloudKit container: `iCloud.com.scribecat.ScribeCat-iOS`
- Background modes: `audio` for recording capabilities
- Entitlements: CloudKit, App Groups, Push Notifications

---

**Need Help?** 

- 📧 Contact: [Insert contact information]
- 🐛 Issues: [GitHub Issues](https://github.com/lmdrew96/ScribeCat/issues)
- 📖 Documentation: See additional docs in the `/docs` folder
- 💬 Discussions: [GitHub Discussions](https://github.com/lmdrew96/ScribeCat/discussions)

---

*This iOS app is part of the ScribeCat ecosystem. For the desktop application, see the main repository documentation.*