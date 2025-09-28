//
//  SettingsView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI
import CloudKit

struct SettingsView: View {
    @AppStorage("realtimeTranscription") private var realtimeTranscription = true
    @AppStorage("audioQuality") private var audioQuality = "High"
    @AppStorage("syncEnabled") private var syncEnabled = true
    @AppStorage("analyticsEnabled") private var analyticsEnabled = false
    @AppStorage("selectedLanguage") private var selectedLanguage = "en"
    
    @State private var cloudKitStatus = "Checking..."
    @State private var storageUsed = "Calculating..."
    @State private var showingLanguagePicker = false
    @State private var showingPrivacyPolicy = false
    @State private var showingAbout = false
    
    let languages = [
        ("en", "English"),
        ("es", "Español"),
        ("ro", "Română")
    ]
    
    let qualityOptions = ["Low", "Medium", "High"]
    
    var body: some View {
        NavigationView {
            List {
                // Sync & Storage Section
                Section("Sync & Storage") {
                    HStack {
                        Label("CloudKit Sync", systemImage: "icloud")
                        Spacer()
                        Toggle("", isOn: $syncEnabled)
                            .labelsHidden()
                    }
                    
                    HStack {
                        Text("Sync Status")
                        Spacer()
                        Text(cloudKitStatus)
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                    
                    HStack {
                        Text("Storage Used")
                        Spacer()
                        Text(storageUsed)
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                    
                    Button("Sync Now") {
                        performSync()
                    }
                    .disabled(!syncEnabled)
                }
                
                // Recording Settings Section  
                Section("Recording Settings") {
                    HStack {
                        Label("Real-time Transcription", systemImage: "waveform.path")
                        Spacer()
                        Toggle("", isOn: $realtimeTranscription)
                            .labelsHidden()
                    }
                    
                    HStack {
                        Text("Audio Quality")
                        Spacer()
                        Picker("Audio Quality", selection: $audioQuality) {
                            ForEach(qualityOptions, id: \.self) { quality in
                                Text(quality).tag(quality)
                            }
                        }
                        .pickerStyle(MenuPickerStyle())
                    }
                    
                    if !realtimeTranscription {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.blue)
                            Text("Disabling real-time transcription saves battery")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
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
                
                // Debug Section (for scaffold)
                Section("Debug & Development") {
                    Button("Add Sample Data") {
                        addSampleData()
                    }
                    .foregroundColor(.blue)
                    
                    Button("Clear All Data") {
                        clearAllData()
                    }
                    .foregroundColor(.red)
                    
                    HStack {
                        Text("API Endpoint")
                        Spacer()
                        Text("Mock API")
                            .foregroundColor(.orange)
                            .font(.caption)
                    }
                    
                    Button("Switch to Real API") {
                        // Placeholder for switching to real API
                        print("Switch to real API - see README for instructions")
                    }
                    .foregroundColor(.blue)
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
                        Text("1.0.0 (Scaffold)")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                checkCloudKitStatus()
                calculateStorageUsed()
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
    
    private func performSync() {
        cloudKitStatus = "Syncing..."
        
        // Mock sync operation
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            cloudKitStatus = "Last synced: Now"
        }
    }
    
    private func checkCloudKitStatus() {
        // Mock CloudKit status check
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            cloudKitStatus = syncEnabled ? "Available" : "Disabled"
        }
    }
    
    private func calculateStorageUsed() {
        // Mock storage calculation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            storageUsed = "1.2 MB"
        }
    }
    
    private func addSampleData() {
        // Add sample data for testing
        let context = PersistenceController.shared.container.viewContext
        
        let sampleSession = Session(context: context)
        sampleSession.id = UUID()
        sampleSession.title = "Sample Recording"
        sampleSession.timestamp = Date()
        sampleSession.duration = 120
        sampleSession.hasAudio = true
        sampleSession.hasNotes = true
        sampleSession.transcription = "This is a sample transcription for testing purposes."
        sampleSession.notes = "These are sample notes that were taken during the recording session."
        
        do {
            try context.save()
        } catch {
            print("Error adding sample data: \(error)")
        }
    }
    
    private func clearAllData() {
        // Clear all data - this is for development/testing
        let context = PersistenceController.shared.container.viewContext
        let fetchRequest: NSFetchRequest<NSFetchRequestResult> = Session.fetchRequest()
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
        
        do {
            try context.execute(deleteRequest)
            try context.save()
        } catch {
            print("Error clearing data: \(error)")
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