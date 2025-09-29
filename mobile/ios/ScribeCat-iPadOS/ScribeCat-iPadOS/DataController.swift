//
//  DataController.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  Core Data controller with CloudKit integration
//

import CoreData
import CloudKit

class PersistenceController {
    static let shared = PersistenceController()

    static var preview: PersistenceController = {
        let result = PersistenceController(inMemory: true)
        let viewContext = result.container.viewContext
        
        // Create sample data for previews
        let sampleSession = Session(context: viewContext)
        sampleSession.id = UUID()
        sampleSession.title = "Sample Lecture"
        sampleSession.date = Date()
        sampleSession.duration = 45
        sampleSession.transcriptionText = "This is a sample transcription..."
        
        do {
            try viewContext.save()
        } catch {
            // Handle the error appropriately in production
            let nsError = error as NSError
            fatalError("Unresolved error \(nsError), \(nsError.userInfo)")
        }
        return result
    }()

    let container: NSPersistentCloudKitContainer

    init(inMemory: Bool = false) {
        container = NSPersistentCloudKitContainer(name: "ScribeCatiPadOS")
        
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
                // Handle error appropriately in production
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        })
        
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyStoreTrumpMergePolicy
    }
}

// MARK: - Core Data Extensions

extension Session {
    static func fetchRequest() -> NSFetchRequest<Session> {
        NSFetchRequest<Session>(entityName: "Session")
    }
}

extension Note {
    static func fetchRequest() -> NSFetchRequest<Note> {
        NSFetchRequest<Note>(entityName: "Note")
    }
}

extension TranscriptionSegment {
    static func fetchRequest() -> NSFetchRequest<TranscriptionSegment> {
        NSFetchRequest<TranscriptionSegment>(entityName: "TranscriptionSegment")
    }
}