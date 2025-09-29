# ScribeCat iPadOS - Desktop-Level Functionality

This is the iPadOS version of ScribeCat that provides full desktop app functionality optimized for iPad devices.

## Key Features

- **Full Desktop Feature Parity**: All features from the desktop Electron app
- **Split View Support**: Editor on one side, transcription/AI chat on other
- **Apple Pencil Integration**: Handwritten notes and annotations
- **Keyboard Shortcuts**: Standard iPad shortcuts (⌘S, ⌘N, formatting)
- **Multi-Screen Support**: Optimized for iPad sizes from 9.7" to 12.9"
- **Multitasking**: Split View and Slide Over support
- **Touch-Optimized**: Proper UI scaling for larger screens

## Architecture

Built using SwiftUI with the following key components:
- Real-time transcription using SFSpeechRecognizer
- Rich text editor with full formatting toolbar
- AI-powered chat interface
- Canvas integration
- Google Drive sync
- Theme system (15 presets)
- Settings management

## Development Status

This iPadOS app is separate from the iOS companion app and provides a full desktop replacement experience for iPad users.