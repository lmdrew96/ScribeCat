//
//  SettingsView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI
import CloudKit

struct SettingsView: View {
    @StateObject private var driveManager = GoogleDriveManager()
    @StateObject private var cacheManager = CacheManager(context: PersistenceController.shared.container.viewContext)
    @StateObject private var askAIManager = AskAIManager()
    
    @AppStorage("syncEnabled") private var syncEnabled = true
    @AppStorage("analyticsEnabled") private var analyticsEnabled = false
    @AppStorage("selectedLanguage") private var selectedLanguage = "en"
    @AppStorage("syncOnlyOnWiFiAndCharging") private var syncOnlyOnWiFiAndCharging = true
    
    @State private var showingLanguagePicker = false
    @State private var showingPrivacyPolicy = false
    @State private var showingAbout = false
    @State private var showingAskAISettings = false
    @State private var showingCacheSettings = false
    
    let languages = [
        ("en", "English"),
        ("es", "Español"),
        ("ro", "Română")
    ]
    
    var body: some View {
        NavigationView {
            List {
                // Google Drive Sync Section
                Section("Google Drive Sync") {
                    HStack {
                        Label("Drive Sync", systemImage: "icloud")
                        Spacer()
                        Toggle("", isOn: $syncEnabled)
                            .labelsHidden()
                    }
                    
                    if syncEnabled {
                        if driveManager.isSignedIn {
                            HStack {
                                Text("Status")
                                Spacer()
                                Text(driveManager.syncStatus.displayText)
                                    .foregroundColor(driveManager.syncStatus == .online ? .green : .secondary)
                                    .font(.caption)
                            }
                            
                            if let lastSync = driveManager.lastSyncDate {
                                HStack {
                                    Text("Last Sync")
                                    Spacer()
                                    Text(lastSync, style: .relative)
                                        .foregroundColor(.secondary)
                                        .font(.caption)
                                }
                            }
                            
                            Button(driveManager.isManualSyncInProgress ? "Syncing..." : "Sync Now") {
                                driveManager.performManualSync()
                            }
                            .disabled(driveManager.isManualSyncInProgress)
                            
                            Button("Sign Out") {
                                driveManager.signOut()
                            }
                            .foregroundColor(.red)
                        } else {
                            HStack {
                                Text("Status")
                                Spacer()
                                Text("Not signed in")
                                    .foregroundColor(.orange)
                                    .font(.caption)
                            }
                            
                            Button("Sign in to Google Drive") {
                                driveManager.signIn()
                            }
                            .foregroundColor(.blue)
                        }
                        
                        if let error = driveManager.syncError {
                            HStack {
                                Image(systemName: "exclamationmark.triangle")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                    }
                }
                
                // Sync Preferences Section
                if syncEnabled {
                    Section("Sync Preferences") {
                        HStack {
                            Label("Wi-Fi + Charging Only", systemImage: "wifi")
                            Spacer()
                            Toggle("", isOn: $syncOnlyOnWiFiAndCharging)
                                .labelsHidden()
                        }
                        
                        if !syncOnlyOnWiFiAndCharging {
                            HStack {
                                Image(systemName: "info.circle")
                                    .foregroundColor(.orange)
                                Text("Background sync will use mobile data and battery")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                
                // Cache Management Section
                Section("Cache Management") {
                    NavigationLink("Cache Settings") {
                        CacheSettingsView(cacheManager: cacheManager)
                    }
                    
                    HStack {
                        Text("Cache Usage")
                        Spacer()
                        Text(cacheManager.totalCacheSize > 0 ? 
                             ByteCountFormatter.string(fromByteCount: cacheManager.totalCacheSize, countStyle: .file) : 
                             "Empty")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                    
                    HStack {
                        Text("Cached Sessions")
                        Spacer()
                        Text("\(cacheManager.sessionCount)")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                    
                    if cacheManager.isCleaningUp {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Cleaning up cache...")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Button("Clear Cache") {
                            cacheManager.clearAllCache()
                        }
                        .foregroundColor(.red)
                    }
                }
                
                // AskAI Lite Section
                Section("AskAI Lite") {
                    NavigationLink("AskAI Settings") {
                        AskAISettingsView(askAIManager: askAIManager)
                    }
                    
                    HStack {
                        Text("API Key")
                        Spacer()
                        Text(askAIManager.hasAPIKey ? "Configured" : "Not set")
                            .foregroundColor(askAIManager.hasAPIKey ? .green : .orange)
                            .font(.caption)
                    }
                    
                    let usageInfo = askAIManager.getUsageInfo()
                    HStack {
                        Text("Monthly Usage")
                        Spacer()
                        Text("\(usageInfo.monthlyUsage)/\(usageInfo.monthlyLimit)")
                            .foregroundColor(usageInfo.monthlyUsage >= usageInfo.monthlyLimit ? .red : .secondary)
                            .font(.caption)
                    }
                    
                    HStack {
                        Text("Daily Usage")
                        Spacer()
                        Text("\(usageInfo.dailyUsage)/\(usageInfo.dailyLimit)")
                            .foregroundColor(usageInfo.dailyUsage >= usageInfo.dailyLimit ? .red : .secondary)
                            .font(.caption)
                    }
                }
                
                // Language & Localization Section
                Section("Language & Localization") {
                    HStack {
                        Label("App Language", systemImage: "globe")
                        Spacer()
                        Text(languages.first { $0.0 == selectedLanguage }?.1 ?? "Unknown")
                            .foregroundColor(.secondary)
                    }
                    .onTapGesture {
                        showingLanguagePicker = true
                    }
                }
                
                // Privacy & Analytics Section
                Section("Privacy & Analytics") {
                    HStack {
                        Label("Analytics", systemImage: "chart.bar")
                        Spacer()
                        Toggle("", isOn: $analyticsEnabled)
                            .labelsHidden()
                    }
                    
                    Button("Privacy Policy") {
                        showingPrivacyPolicy = true
                    }
                    .foregroundColor(.blue)
                    
                    if analyticsEnabled {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.orange)
                            Text("Anonymous usage data helps improve the app")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Debug Section (for M4 development)
                Section("Debug & Development") {
                    Button("Add Sample Data") {
                        addSampleData()
                    }
                    .foregroundColor(.blue)
                    
                    HStack {
                        Text("API Endpoint")
                        Spacer()
                        Text("Google Drive + Mock AI")
                            .foregroundColor(.blue)
                            .font(.caption)
                    }
                    
                    HStack {
                        Text("Recording Features")
                        Spacer()
                        Text("Available in M5")
                            .foregroundColor(.orange)
                            .font(.caption)
                    }
                }
                
                // About Section
                Section("About") {
                    Button("About ScribeCat") {
                        showingAbout = true
                    }
                    .foregroundColor(.blue)
                    
                    HStack {
                        Text("Version")
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
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                cacheManager.updateCacheStats()
            }
            .actionSheet(isPresented: $showingLanguagePicker) {
                ActionSheet(
                    title: Text("Select Language"),
                    buttons: languages.map { code, name in
                        .default(Text(name)) {
                            selectedLanguage = code
                        }
                    } + [.cancel()]
                )
            }
            .sheet(isPresented: $showingPrivacyPolicy) {
                PrivacyPolicyView()
            }
            .sheet(isPresented: $showingAbout) {
                AboutView()
            }
        }
    }
    
    private func addSampleData() {
        // Add sample data for testing
        let context = PersistenceController.shared.container.viewContext
        
        let sampleSession = Session(context: context)
        sampleSession.id = UUID()
        sampleSession.title = "Sample M4 Session"
        sampleSession.timestamp = Date()
        sampleSession.duration = 120
        sampleSession.hasAudio = false // No audio in M4
        sampleSession.hasNotes = true
        sampleSession.transcription = "This is a sample session for M4 testing. Recording and transcription will be available in M5."
        sampleSession.notes = "Sample notes for M4. The app now focuses on Drive sync, caching, and AskAI Lite features."
        
        do {
            try context.save()
            cacheManager.updateCacheStats()
        } catch {
            print("Error adding sample data: \(error)")
        }
    }
}

struct PrivacyPolicyView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Privacy Policy")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("ScribeCat Mobile - Privacy Policy")
                        .font(.headline)
                    
                    Text("""
                    This is a scaffold version of ScribeCat for iOS. In the production version, this would contain the complete privacy policy.
                    
                    Key Points:
                    • Your recordings and notes are stored locally on your device
                    • CloudKit sync is used for cross-device synchronization
                    • No third-party analytics by default
                    • Optional anonymous usage statistics to improve the app
                    • No audio data is transmitted to external servers without your consent
                    
                    For the complete privacy policy, please visit: scribecat.com/privacy
                    """)
                    .font(.body)
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .navigationBarItems(
                leading: Button("Close") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
}

struct AboutView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "waveform")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                Text("ScribeCat")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("iOS Mobile Companion")
                    .font(.headline)
                    .foregroundColor(.secondary)
                
                Text("Version 1.0.0 (Scaffold)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("This is the initial iOS scaffold for ScribeCat. Features include:")
                        .font(.body)
                    
                    Text("• SwiftUI-based interface with TabView navigation")
                    Text("• Core Data + CloudKit integration")
                    Text("• Background audio recording capabilities")
                    Text("• Mock API integration (ready for real API)")
                    Text("• Multi-language support (EN, ES, RO)")
                    Text("• Privacy-focused design")
                        .font(.caption)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)
                
                Text("Built with ❤️ by the ScribeCat Team")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
            }
            .padding()
            .navigationTitle("")
            .navigationBarHidden(true)
            .navigationBarItems(
                leading: Button("Close") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
}