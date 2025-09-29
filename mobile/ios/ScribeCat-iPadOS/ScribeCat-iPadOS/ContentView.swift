//
//  ContentView.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  Main iPadOS interface with Split View support
//

import SwiftUI

struct ContentView: View {
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @State private var selectedTheme: AppTheme = .defaultTheme
    @State private var showingSidebar = true
    
    var body: some View {
        NavigationView {
            // Sidebar for navigation (iPad specific)
            SidebarView(selectedTheme: $selectedTheme)
                .navigationBarTitleDisplayMode(.inline)
                .frame(minWidth: 250)
            
            // Main content area - Split View between Editor and Transcription/AI
            if horizontalSizeClass == .regular {
                iPadMainView(selectedTheme: selectedTheme)
            } else {
                // Fallback for compact size class
                iPhoneMainView(selectedTheme: selectedTheme)
            }
        }
        .navigationViewStyle(DoubleColumnNavigationViewStyle())
        .preferredColorScheme(selectedTheme.colorScheme)
    }
}

// iPad-optimized main view with Split View
struct iPadMainView: View {
    let selectedTheme: AppTheme
    @State private var showingTranscriptionPanel = true
    
    var body: some View {
        HSplitView {
            // Left side - Rich Text Editor
            EditorView(theme: selectedTheme)
                .frame(minWidth: 400)
            
            // Right side - Transcription & AI Chat
            VStack {
                TranscriptionView(theme: selectedTheme)
                    .frame(maxHeight: .infinity)
                
                AIChatView(theme: selectedTheme)
                    .frame(maxHeight: .infinity)
            }
            .frame(minWidth: 350)
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingTranscriptionPanel.toggle() }) {
                    Image(systemName: showingTranscriptionPanel ? "sidebar.right" : "sidebar.left")
                }
            }
        }
    }
}

// Fallback for iPhone/compact view (though this is iPadOS focused)
struct iPhoneMainView: View {
    let selectedTheme: AppTheme
    
    var body: some View {
        TabView {
            EditorView(theme: selectedTheme)
                .tabItem {
                    Image(systemName: "doc.text")
                    Text("Editor")
                }
            
            TranscriptionView(theme: selectedTheme)
                .tabItem {
                    Image(systemName: "waveform")
                    Text("Transcription")
                }
            
            AIChatView(theme: selectedTheme)
                .tabItem {
                    Image(systemName: "brain.head.profile")
                    Text("AI Chat")
                }
        }
        .preferredColorScheme(selectedTheme.colorScheme)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .previewDevice("iPad Pro (12.9-inch) (6th generation)")
    }
}