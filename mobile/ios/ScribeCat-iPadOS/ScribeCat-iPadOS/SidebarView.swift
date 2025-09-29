//
//  SidebarView.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  iPad sidebar navigation with desktop-like functionality
//

import SwiftUI

struct SidebarView: View {
    @Binding var selectedTheme: AppTheme
    @State private var selectedSection: SidebarSection = .home
    
    var body: some View {
        List {
            // Home Section
            NavigationLink(
                destination: HomeView(theme: selectedTheme),
                tag: SidebarSection.home,
                selection: $selectedSection
            ) {
                Label("Home", systemImage: "house")
            }
            
            // Recording & Transcription Section
            Section("Recording") {
                NavigationLink(
                    destination: RecordingView(theme: selectedTheme),
                    tag: SidebarSection.recording,
                    selection: $selectedSection
                ) {
                    Label("Record Audio", systemImage: "waveform")
                }
                
                NavigationLink(
                    destination: TranscriptionHistoryView(theme: selectedTheme),
                    tag: SidebarSection.transcriptionHistory,
                    selection: $selectedSection
                ) {
                    Label("Transcription History", systemImage: "doc.text")
                }
            }
            
            // Notes & Editor Section
            Section("Notes & Editor") {
                NavigationLink(
                    destination: NotesLibraryView(theme: selectedTheme),
                    tag: SidebarSection.notesLibrary,
                    selection: $selectedSection
                ) {
                    Label("Notes Library", systemImage: "folder")
                }
                
                NavigationLink(
                    destination: EditorView(theme: selectedTheme),
                    tag: SidebarSection.editor,
                    selection: $selectedSection
                ) {
                    Label("Rich Text Editor", systemImage: "doc.richtext")
                }
            }
            
            // AI Features Section
            Section("AI Features") {
                NavigationLink(
                    destination: AIChatView(theme: selectedTheme),
                    tag: SidebarSection.aiChat,
                    selection: $selectedSection
                ) {
                    Label("Ask AI", systemImage: "brain.head.profile")
                }
                
                NavigationLink(
                    destination: AIPolishView(theme: selectedTheme),
                    tag: SidebarSection.aiPolish,
                    selection: $selectedSection
                ) {
                    Label("AI Polish", systemImage: "wand.and.stars")
                }
            }
            
            // Integration Section
            Section("Integrations") {
                NavigationLink(
                    destination: GoogleDriveView(theme: selectedTheme),
                    tag: SidebarSection.googleDrive,
                    selection: $selectedSection
                ) {
                    Label("Google Drive", systemImage: "icloud")
                }
                
                NavigationLink(
                    destination: CanvasIntegrationView(theme: selectedTheme),
                    tag: SidebarSection.canvas,
                    selection: $selectedSection
                ) {
                    Label("Canvas Integration", systemImage: "graduationcap")
                }
            }
            
            // Settings & Customization
            Section("Settings") {
                NavigationLink(
                    destination: ThemeSelectionView(selectedTheme: $selectedTheme),
                    tag: SidebarSection.themes,
                    selection: $selectedSection
                ) {
                    Label("Themes", systemImage: "paintbrush")
                }
                
                NavigationLink(
                    destination: SettingsView(theme: selectedTheme),
                    tag: SidebarSection.settings,
                    selection: $selectedSection
                ) {
                    Label("Settings", systemImage: "gear")
                }
            }
        }
        .navigationTitle("ScribeCat")
        .listStyle(SidebarListStyle())
        .background(selectedTheme.surfaceColor)
    }
}

enum SidebarSection {
    case home
    case recording
    case transcriptionHistory
    case notesLibrary
    case editor
    case aiChat
    case aiPolish
    case googleDrive
    case canvas
    case themes
    case settings
}

// Theme Selection View
struct ThemeSelectionView: View {
    @Binding var selectedTheme: AppTheme
    
    var body: some View {
        List {
            ForEach(AppTheme.allThemes, id: \.name) { theme in
                ThemePreviewRow(
                    theme: theme,
                    isSelected: theme.name == selectedTheme.name
                )
                .onTapGesture {
                    selectedTheme = theme
                }
            }
        }
        .navigationTitle("Choose Theme")
        .background(selectedTheme.backgroundColor)
    }
}

struct ThemePreviewRow: View {
    let theme: AppTheme
    let isSelected: Bool
    
    var body: some View {
        HStack {
            // Color preview
            HStack(spacing: 4) {
                Rectangle()
                    .fill(theme.primaryColor)
                    .frame(width: 20, height: 20)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(theme.secondaryColor)
                    .frame(width: 20, height: 20)
                    .cornerRadius(4)
                
                Rectangle()
                    .fill(theme.accentColor)
                    .frame(width: 20, height: 20)
                    .cornerRadius(4)
            }
            
            VStack(alignment: .leading) {
                Text(theme.name)
                    .font(.headline)
                    .foregroundColor(theme.textPrimary)
                
                Text("Primary • Secondary • Accent")
                    .font(.caption)
                    .foregroundColor(theme.textSecondary)
            }
            
            Spacer()
            
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(theme.primaryColor)
            }
        }
        .padding(.vertical, 4)
        .background(theme.surfaceColor)
        .cornerRadius(8)
    }
}

struct SidebarView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            SidebarView(selectedTheme: .constant(.defaultTheme))
        }
        .previewDevice("iPad Pro (12.9-inch) (6th generation)")
    }
}