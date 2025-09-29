//
//  PlaceholderViews.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  Placeholder views for features to be implemented
//

import SwiftUI

// MARK: - Recording View
struct RecordingView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack {
            Text("Audio Recording")
                .font(.title)
                .foregroundColor(theme.textPrimary)
            Text("Advanced recording features coming soon")
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.backgroundColor)
        .navigationTitle("Recording")
    }
}

// MARK: - Transcription History View
struct TranscriptionHistoryView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack {
            Text("Transcription History")
                .font(.title)
                .foregroundColor(theme.textPrimary)
            Text("View and manage all transcriptions")
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.backgroundColor)
        .navigationTitle("Transcription History")
    }
}

// MARK: - Notes Library View
struct NotesLibraryView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack {
            Text("Notes Library")
                .font(.title)
                .foregroundColor(theme.textPrimary)
            Text("Organize and browse all your notes")
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.backgroundColor)
        .navigationTitle("Notes Library")
    }
}

// MARK: - AI Polish View
struct AIPolishView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack {
            Text("AI Polish")
                .font(.title)
                .foregroundColor(theme.textPrimary)
            Text("Enhance your text with AI assistance")
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.backgroundColor)
        .navigationTitle("AI Polish")
    }
}

// MARK: - Google Drive View
struct GoogleDriveView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack {
            Text("Google Drive Integration")
                .font(.title)
                .foregroundColor(theme.textPrimary)
            Text("Sync your files with Google Drive")
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.backgroundColor)
        .navigationTitle("Google Drive")
    }
}

// MARK: - Canvas Integration View
struct CanvasIntegrationView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack {
            Text("Canvas Integration")
                .font(.title)
                .foregroundColor(theme.textPrimary)
            Text("Connect with your Canvas courses")
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.backgroundColor)
        .navigationTitle("Canvas Integration")
    }
}

// MARK: - Settings View
struct SettingsView: View {
    let theme: AppTheme
    
    var body: some View {
        List {
            Section("Appearance") {
                HStack {
                    Text("Current Theme")
                    Spacer()
                    Text(theme.name)
                        .foregroundColor(theme.textSecondary)
                }
            }
            
            Section("Recording") {
                Toggle("High Quality Audio", isOn: .constant(true))
                Toggle("Real-time Transcription", isOn: .constant(true))
            }
            
            Section("AI") {
                HStack {
                    Text("Model")
                    Spacer()
                    Text("Claude 3.5 Sonnet")
                        .foregroundColor(theme.textSecondary)
                }
                Toggle("Include Context", isOn: .constant(true))
            }
            
            Section("Sync") {
                Toggle("Google Drive Sync", isOn: .constant(false))
                Toggle("Canvas Integration", isOn: .constant(false))
            }
            
            Section("About") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundColor(theme.textSecondary)
                }
            }
        }
        .navigationTitle("Settings")
        .background(theme.backgroundColor)
    }
}