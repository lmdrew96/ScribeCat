//
//  DataModel.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import Foundation
import CoreData
import SwiftUI

// MARK: - Core Data Model Extensions

extension Session {
    var hasNotes: Bool {
        return !(notes?.isEmpty ?? true)
    }
    
    var hasAudio: Bool {
        return audioFileURL != nil || hasAudio
    }
    
    static func sampleData(context: NSManagedObjectContext) -> Session {
        let session = Session(context: context)
        session.id = UUID()
        session.title = "Sample Recording Session"
        session.timestamp = Date()
        session.duration = 180.0
        session.hasAudio = true
        session.transcription = "This is a sample transcription of the recorded audio. It demonstrates how transcribed text would appear in the application."
        session.notes = "These are sample notes that were taken during the recording session. Users can edit and expand these notes as needed."
        session.language = "en"
        session.tags = "sample,demo,test"
        return session
    }
}

extension Note {
    static func sampleData(context: NSManagedObjectContext) -> Note {
        let note = Note(context: context)
        note.id = UUID()
        note.title = "Sample Note"
        note.body = "This is a sample note body with some content to demonstrate the note-taking functionality."
        note.timestamp = Date()
        note.language = "en"
        note.tags = "sample,note"
        return note
    }
}

// MARK: - Persistence Controller

struct PersistenceController {
    static let shared = PersistenceController()
    
    static var preview: PersistenceController = {
        let result = PersistenceController(inMemory: true)
        let viewContext = result.container.viewContext
        
        // Add sample data for previews
        let sampleSession = Session.sampleData(context: viewContext)
        let sampleNote = Note.sampleData(context: viewContext)
        
        do {
            try viewContext.save()
        } catch {
            let nsError = error as NSError
            fatalError("Unresolved error \(nsError), \(nsError.userInfo)")
        }
        return result
    }()
    
    let container: NSPersistentCloudKitContainer
    
    init(inMemory: Bool = false) {
        container = NSPersistentCloudKitContainer(name: "ScribeCat")
        
        if inMemory {
            container.persistentStoreDescriptions.first!.url = URL(fileURLWithPath: "/dev/null")
        } else {
            // Configure CloudKit
            let storeDescription = container.persistentStoreDescriptions.first
            storeDescription?.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
            storeDescription?.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        }
        
        container.loadPersistentStores(completionHandler: { (storeDescription, error) in
            if let error = error as NSError? {
                // In a production app, you should handle this error appropriately
                // For now, we'll just log it
                print("Core Data error: \(error), \(error.userInfo)")
                
                // For the scaffold, we can be more lenient with CloudKit errors
                if error.domain == "NSCocoaErrorDomain" && error.code == 134060 {
                    print("CloudKit not available - continuing with local storage only")
                } else {
                    fatalError("Unresolved error \(error), \(error.userInfo)")
                }
            }
        })
        
        container.viewContext.automaticallyMergesChangesFromParent = true
    }
}

// MARK: - Mock Data Structures

struct MockSession: Identifiable, Codable {
    let id = UUID()
    var title: String
    var timestamp: Date
    var duration: TimeInterval
    var transcription: String?
    var notes: String?
    var audioFileURL: URL?
    var language: String
    var tags: String?
    var hasAudio: Bool
    var hasNotes: Bool {
        return !(notes?.isEmpty ?? true)
    }
}

struct MockNote: Identifiable, Codable {
    let id = UUID()
    var title: String
    var body: String
    var timestamp: Date
    var language: String
    var tags: String?
}

// MARK: - Audio File Management

class AudioFileManager: ObservableObject {
    static let shared = AudioFileManager()
    
    private let documentsDirectory: URL
    private let audioDirectory: URL
    
    private init() {
        documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        audioDirectory = documentsDirectory.appendingPathComponent("AudioRecordings")
        
        // Create audio directory if it doesn't exist
        if !FileManager.default.fileExists(atPath: audioDirectory.path) {
            try? FileManager.default.createDirectory(at: audioDirectory, withIntermediateDirectories: true)
        }
    }
    
    func saveAudioFile(data: Data, for sessionID: UUID) -> URL? {
        let fileName = "\(sessionID.uuidString).m4a"
        let fileURL = audioDirectory.appendingPathComponent(fileName)
        
        do {
            try data.write(to: fileURL)
            return fileURL
        } catch {
            print("Error saving audio file: \(error)")
            return nil
        }
    }
    
    func deleteAudioFile(at url: URL) {
        try? FileManager.default.removeItem(at: url)
    }
    
    func getAudioFileURL(for sessionID: UUID) -> URL {
        let fileName = "\(sessionID.uuidString).m4a"
        return audioDirectory.appendingPathComponent(fileName)
    }
    
    func calculateStorageUsed() -> String {
        guard let enumerator = FileManager.default.enumerator(at: audioDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return "Unknown"
        }
        
        var totalSize: Int64 = 0
        
        for case let fileURL as URL in enumerator {
            guard let resourceValues = try? fileURL.resourceValues(forKeys: [.fileSizeKey]),
                  let fileSize = resourceValues.fileSize else {
                continue
            }
            totalSize += Int64(fileSize)
        }
        
        return ByteCountFormatter.string(fromByteCount: totalSize, countStyle: .file)
    }
}

// MARK: - Settings Management

class SettingsManager: ObservableObject {
    static let shared = SettingsManager()
    
    @Published var realtimeTranscription: Bool {
        didSet { UserDefaults.standard.set(realtimeTranscription, forKey: "realtimeTranscription") }
    }
    
    @Published var audioQuality: String {
        didSet { UserDefaults.standard.set(audioQuality, forKey: "audioQuality") }
    }
    
    @Published var syncEnabled: Bool {
        didSet { UserDefaults.standard.set(syncEnabled, forKey: "syncEnabled") }
    }
    
    @Published var selectedLanguage: String {
        didSet { UserDefaults.standard.set(selectedLanguage, forKey: "selectedLanguage") }
    }
    
    @Published var analyticsEnabled: Bool {
        didSet { UserDefaults.standard.set(analyticsEnabled, forKey: "analyticsEnabled") }
    }
    
    private init() {
        self.realtimeTranscription = UserDefaults.standard.object(forKey: "realtimeTranscription") as? Bool ?? true
        self.audioQuality = UserDefaults.standard.string(forKey: "audioQuality") ?? "High"
        self.syncEnabled = UserDefaults.standard.object(forKey: "syncEnabled") as? Bool ?? true
        self.selectedLanguage = UserDefaults.standard.string(forKey: "selectedLanguage") ?? "en"
        self.analyticsEnabled = UserDefaults.standard.object(forKey: "analyticsEnabled") as? Bool ?? false
    }
}