//
//  HelpAboutView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI

struct HelpAboutView: View {
    @State private var showingAbout = false
    @State private var showingHelp = false
    
    var body: some View {
        NavigationView {
            List {
                // Quick Help Section
                Section("Quick Help") {
                    HelpRow(
                        icon: "house.fill",
                        title: "Home Tab",
                        description: "View your recent recording sessions and notes"
                    )
                    
                    HelpRow(
                        icon: "note.text",
                        title: "Sessions/Notes",
                        description: "Browse and edit your session notes and transcriptions"
                    )
                    
                    HelpRow(
                        icon: "icloud.and.arrow.up",
                        title: "Google Drive Sync",
                        description: "Sign in to Google Drive to sync your sessions across devices"
                    )
                    
                    HelpRow(
                        icon: "brain.head.profile",
                        title: "AskAI Lite",
                        description: "Use AI to ask questions about your sessions (100/month limit)"
                    )
                }
                
                // Getting Started Section
                Section("Getting Started") {
                    NavigationLink("Setup Guide") {
                        SetupGuideView()
                    }
                    
                    NavigationLink("Sync Settings") {
                        SyncHelpView()
                    }
                    
                    NavigationLink("AskAI Setup") {
                        AskAIHelpView()
                    }
                }
                
                // Support Section
                Section("Support") {
                    Button("About ScribeCat") {
                        showingAbout = true
                    }
                    .foregroundColor(.blue)
                    
                    Link("Contact Support", destination: URL(string: "mailto:support@scribecat.com")!)
                        .foregroundColor(.blue)
                    
                    Link("Visit Website", destination: URL(string: "https://scribecat.com")!)
                        .foregroundColor(.blue)
                }
                
                // Version Info Section
                Section("Version Information") {
                    HStack {
                        Text("App Version")
                        Spacer()
                        Text("1.0.0 (M4)")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                    
                    HStack {
                        Text("iOS Requirement")
                        Spacer()
                        Text("iOS 16.0+")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                    
                    HStack {
                        Text("Recording & Transcription")
                        Spacer()
                        Text("Coming in M5")
                            .foregroundColor(.orange)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Help & About")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingAbout) {
                AboutView()
            }
        }
    }
}

struct HelpRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 30)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct SetupGuideView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Setup Guide")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("Welcome to ScribeCat iOS!")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 12) {
                    SetupStep(
                        number: 1,
                        title: "Connect Google Drive",
                        description: "Go to Settings and sign in to your Google account to enable session sync."
                    )
                    
                    SetupStep(
                        number: 2,
                        title: "Configure Sync Settings",
                        description: "Choose your sync preferences - by default, sync only occurs on Wi-Fi while charging."
                    )
                    
                    SetupStep(
                        number: 3,
                        title: "Set up AskAI (Optional)",
                        description: "Add your OpenAI API key in Settings to enable AI-powered session analysis."
                    )
                    
                    SetupStep(
                        number: 4,
                        title: "Start Using Sessions",
                        description: "Browse existing sessions from your desktop or wait for M5 to record new ones."
                    )
                }
                
                Text("Note: Recording and transcription features will be available in M5 (coming soon).")
                    .font(.caption)
                    .foregroundColor(.orange)
                    .padding()
                    .background(Color(.systemOrange).opacity(0.1))
                    .cornerRadius(8)
            }
            .padding()
        }
        .navigationTitle("Setup Guide")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SetupStep: View {
    let number: Int
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top) {
            Text("\(number)")
                .font(.headline)
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Color.blue)
                .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct SyncHelpView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Google Drive Sync")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("ScribeCat syncs your sessions with Google Drive to keep your notes accessible across all devices.")
                    .font(.body)
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Sync Behavior:")
                        .font(.headline)
                    
                    Text("• Automatic sync occurs when on Wi-Fi and charging")
                    Text("• Manual sync available anytime via 'Sync Now' button")
                    Text("• Background sync respects battery and network conditions")
                    Text("• Offline changes are queued and synced when online")
                }
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Data Usage:")
                        .font(.headline)
                    
                    Text("• Sessions are cached locally up to 200MB total")
                    Text("• Individual sessions limited to 50-75MB cache")
                    Text("• Least recently used sessions are removed when cache is full")
                    Text("• Full sessions always available from Drive when needed")
                }
            }
            .padding()
        }
        .navigationTitle("Sync Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AskAIHelpView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("AskAI Lite")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("AskAI Lite allows you to use AI to analyze and ask questions about your recording sessions.")
                    .font(.body)
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Setup:")
                        .font(.headline)
                    
                    Text("1. Get an OpenAI API key from platform.openai.com")
                    Text("2. Go to Settings > AskAI Lite")
                    Text("3. Enter your API key (stored securely in Keychain)")
                    Text("4. Start asking questions about your sessions!")
                }
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Usage Limits:")
                        .font(.headline)
                    
                    Text("• 100 queries per month (hard limit)")
                    Text("• 10 queries per day (soft limit with warning)")
                    Text("• Counters reset monthly")
                    Text("• Clear usage tracking in Settings")
                }
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Example Questions:")
                        .font(.headline)
                    
                    Text("• 'Summarize the key points from this session'")
                    Text("• 'What action items were mentioned?'")
                    Text("• 'Find mentions of [specific topic]'")
                    Text("• 'Create a brief outline of this discussion'")
                }
            }
            .padding()
        }
        .navigationTitle("AskAI Lite")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct HelpAboutView_Previews: PreviewProvider {
    static var previews: some View {
        HelpAboutView()
    }
}