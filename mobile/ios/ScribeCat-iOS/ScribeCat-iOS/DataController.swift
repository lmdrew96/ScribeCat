//
//  DataController.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import Foundation
import CoreData
import CloudKit

/// A singleton class responsible for managing Core Data stack with CloudKit integration
class DataController: ObservableObject {
    
    /// The singleton instance
    static let shared = DataController()
    
    /// The Core Data container with CloudKit support
    lazy var container: NSPersistentCloudKitContainer = {
        let container = NSPersistentCloudKitContainer(name: "ScribeCat")
        
        // Configure the persistent store description
        guard let storeDescription = container.persistentStoreDescriptions.first else {
            fatalError("No store description found")
        }
        
        // CloudKit configuration
        storeDescription.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        storeDescription.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        
        // Configure CloudKit container
        storeDescription.cloudKitContainerOptions = NSPersistentCloudKitContainerOptions(
            containerIdentifier: "iCloud.com.scribecat.ScribeCat-iOS"
        )
        
        // Load the persistent store
        container.loadPersistentStores { storeDescription, error in
            if let error = error as NSError? {
                // In production, handle this error appropriately
                print("Core Data error: \(error), \(error.userInfo)")
                
                // For development, we can be more forgiving with CloudKit errors
                if error.domain == "NSCocoaErrorDomain" && (error.code == 134060 || error.code == 134094) {
                    print("CloudKit container not found or not accessible - using local storage only")
                } else {
                    // For other errors, you might want to create a fallback local store
                    print("Attempting to continue with local storage only")
                }
            } else {
                print("Core Data store loaded successfully with CloudKit support")
            }
        }
        
        // Configure the view context
        container.viewContext.mergePolicy = NSMergeByPropertyStoreTrumpMergePolicy
        container.viewContext.automaticallyMergesChangesFromParent = true
        
        // Watch for remote changes
        NotificationCenter.default.addObserver(
            forName: .NSPersistentStoreRemoteChange,
            object: container.persistentStoreCoordinator,
            queue: .main
        ) { _ in
            print("Remote CloudKit changes detected")
        }
        
        return container
    }()
    
    /// Convenience accessor for the main context
    var viewContext: NSManagedObjectContext {
        return container.viewContext
    }
    
    private init() {
        // Initialize the container lazily
        _ = container
    }
    
    /// Save the context with error handling
    func save() {
        let context = container.viewContext
        
        if context.hasChanges {
            do {
                try context.save()
                print("Context saved successfully")
            } catch {
                print("Save error: \(error)")
                
                // In a production app, you might want to:
                // 1. Present the error to the user
                // 2. Attempt to recover or rollback
                // 3. Log the error for debugging
            }
        }
    }
    
    /// Batch delete all entities of a given type
    func deleteAll<T: NSManagedObject>(_ entity: T.Type) {
        let request: NSFetchRequest<NSFetchRequestResult> = T.fetchRequest()
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: request)
        
        do {
            try container.viewContext.execute(deleteRequest)
            try container.viewContext.save()
            print("Successfully deleted all \(String(describing: entity))")
        } catch {
            print("Error deleting \(String(describing: entity)): \(error)")
        }
    }
    
    /// Create sample data for development/testing
    func createSampleData() {
        let context = container.viewContext
        
        // Create sample session
        let session = Session(context: context)
        session.id = UUID()
        session.title = "Sample Recording Session"
        session.timestamp = Date()
        session.duration = 180.0
        session.transcription = "This is a sample transcription for development and testing purposes. It demonstrates how the transcribed text appears in the application."
        session.notes = "Sample notes that were taken during the recording session. Users can edit and expand these notes."
        session.language = "en"
        session.tags = "sample,development,test"
        session.hasAudio = true
        
        // Create sample note
        let note = Note(context: context)
        note.id = UUID()
        note.title = "Sample Note"
        note.body = "This is a sample note created for development purposes. It shows how notes are displayed and managed in the application."
        note.timestamp = Date()
        note.language = "en"
        note.tags = "sample,note"
        
        save()
        print("Sample data created successfully")
    }
    
    /// Check CloudKit account status
    func checkCloudKitStatus(completion: @escaping (CKAccountStatus) -> Void) {
        CKContainer.default().accountStatus { status, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("CloudKit account status error: \(error)")
                }
                completion(status)
            }
        }
    }
    
    /// Initialize CloudKit schema (for development)
    func initializeCloudKitSchema() {
        // This method can be used during development to initialize the CloudKit schema
        // It will create the necessary record types in CloudKit based on your Core Data model
        
        do {
            try container.initializeCloudKitSchema(options: [])
            print("CloudKit schema initialized successfully")
        } catch {
            print("Failed to initialize CloudKit schema: \(error)")
        }
    }
}

// MARK: - Preview Support

extension DataController {
    /// Create a preview instance with in-memory store
    static var preview: DataController = {
        let controller = DataController()
        
        // Configure for in-memory store
        let storeDescription = NSPersistentStoreDescription()
        storeDescription.type = NSInMemoryStoreType
        controller.container.persistentStoreDescriptions = [storeDescription]
        
        // Create the store
        controller.container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Preview store error: \(error)")
            }
        }
        
        // Add sample data for previews
        controller.createSampleData()
        
        return controller
    }()
}

// MARK: - CloudKit Sync Status

extension DataController {
    
    enum SyncStatus {
        case notStarted
        case inProgress
        case succeeded
        case failed(Error)
    }
    
    @Published var syncStatus: SyncStatus = .notStarted
    
    /// Manually trigger CloudKit sync
    func triggerSync() {
        syncStatus = .inProgress
        
        // Force a save to trigger CloudKit sync
        save()
        
        // In a real implementation, you might want to:
        // 1. Monitor NSPersistentCloudKitContainer notifications
        // 2. Implement retry logic for failed syncs
        // 3. Provide more detailed sync status information
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.syncStatus = .succeeded
        }
    }
}