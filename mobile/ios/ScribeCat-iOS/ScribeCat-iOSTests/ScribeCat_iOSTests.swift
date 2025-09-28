//
//  ScribeCat_iOSTests.swift
//  ScribeCat-iOSTests
//
//  Created by ScribeCat Team on 2024.
//

import XCTest
import CoreData
@testable import ScribeCat_iOS

final class ScribeCat_iOSTests: XCTestCase {
    
    var dataController: DataController!
    var context: NSManagedObjectContext!
    
    override func setUpWithError() throws {
        // Create an in-memory data controller for testing
        dataController = DataController()
        
        // Configure for in-memory store
        let storeDescription = NSPersistentStoreDescription()
        storeDescription.type = NSInMemoryStoreType
        dataController.container.persistentStoreDescriptions = [storeDescription]
        
        // Load the store
        let expectation = XCTestExpectation(description: "Store loads")
        dataController.container.loadPersistentStores { _, error in
            XCTAssertNil(error)
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 5.0)
        
        context = dataController.container.viewContext
    }
    
    override func tearDownWithError() throws {
        dataController = nil
        context = nil
    }
    
    // MARK: - Core Data Model Tests
    
    func testSessionCreation() throws {
        // Test creating a Session entity
        let session = Session(context: context)
        session.id = UUID()
        session.title = "Test Session"
        session.timestamp = Date()
        session.duration = 120.0
        session.hasAudio = true
        session.transcription = "Test transcription"
        session.notes = "Test notes"
        session.language = "en"
        session.tags = "test,unit"
        
        try context.save()
        
        // Verify the session was created
        let request: NSFetchRequest<Session> = Session.fetchRequest()
        let sessions = try context.fetch(request)
        
        XCTAssertEqual(sessions.count, 1)
        let savedSession = sessions.first!
        XCTAssertEqual(savedSession.title, "Test Session")
        XCTAssertEqual(savedSession.duration, 120.0)
        XCTAssertTrue(savedSession.hasAudio)
        XCTAssertEqual(savedSession.language, "en")
    }
    
    func testNoteCreation() throws {
        // Test creating a Note entity
        let note = Note(context: context)
        note.id = UUID()
        note.title = "Test Note"
        note.body = "This is a test note body"
        note.timestamp = Date()
        note.language = "en"
        note.tags = "test,unit"
        
        try context.save()
        
        // Verify the note was created
        let request: NSFetchRequest<Note> = Note.fetchRequest()
        let notes = try context.fetch(request)
        
        XCTAssertEqual(notes.count, 1)
        let savedNote = notes.first!
        XCTAssertEqual(savedNote.title, "Test Note")
        XCTAssertEqual(savedNote.body, "This is a test note body")
        XCTAssertEqual(savedNote.language, "en")
    }
    
    func testSessionHasNotes() throws {
        // Test the hasNotes computed property
        let session1 = Session(context: context)
        session1.notes = "Some notes"
        XCTAssertTrue(session1.hasNotes)
        
        let session2 = Session(context: context)
        session2.notes = ""
        XCTAssertFalse(session2.hasNotes)
        
        let session3 = Session(context: context)
        session3.notes = nil
        XCTAssertFalse(session3.hasNotes)
    }
    
    // MARK: - MockAPI Tests
    
    func testMockAPITranscription() throws {
        let mockAPI = MockAPI.shared
        let expectation = XCTestExpectation(description: "Transcription completes")
        
        let request = TranscriptionRequest(
            audioFileURL: URL(fileURLWithPath: "/tmp/test.m4a"),
            language: "en",
            userId: "test-user"
        )
        
        let cancellable = mockAPI.transcribeAudio(request)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        XCTFail("Transcription failed: \(error)")
                    }
                    expectation.fulfill()
                },
                receiveValue: { response in
                    XCTAssertFalse(response.transcription.isEmpty)
                    XCTAssertEqual(response.language, "en")
                    XCTAssertGreaterThan(response.confidence, 0.0)
                    XCTAssertLessThanOrEqual(response.confidence, 1.0)
                }
            )
        
        wait(for: [expectation], timeout: 5.0)
        cancellable.cancel()
    }
    
    func testMockAPISync() throws {
        let mockAPI = MockAPI.shared
        let expectation = XCTestExpectation(description: "Sync completes")
        
        let request = SyncRequest(
            sessions: [],
            notes: [],
            lastSyncTimestamp: nil
        )
        
        let cancellable = mockAPI.syncData(request)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        XCTFail("Sync failed: \(error)")
                    }
                    expectation.fulfill()
                },
                receiveValue: { response in
                    XCTAssertNotNil(response.syncTimestamp)
                    XCTAssertTrue(response.conflicts.isEmpty)
                }
            )
        
        wait(for: [expectation], timeout: 3.0)
        cancellable.cancel()
    }
    
    // MARK: - Audio File Manager Tests
    
    func testAudioFileManager() throws {
        let audioManager = AudioFileManager.shared
        let sessionID = UUID()
        let testData = "test audio data".data(using: .utf8)!
        
        // Test saving audio file
        let savedURL = audioManager.saveAudioFile(data: testData, for: sessionID)
        XCTAssertNotNil(savedURL)
        
        // Test file exists
        if let url = savedURL {
            XCTAssertTrue(FileManager.default.fileExists(atPath: url.path))
            
            // Test file content
            let loadedData = try Data(contentsOf: url)
            XCTAssertEqual(testData, loadedData)
            
            // Clean up
            audioManager.deleteAudioFile(at: url)
            XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
        }
    }
    
    // MARK: - Settings Manager Tests
    
    func testSettingsManager() throws {
        let settingsManager = SettingsManager.shared
        
        // Test default values
        XCTAssertTrue(settingsManager.realtimeTranscription)
        XCTAssertEqual(settingsManager.audioQuality, "High")
        XCTAssertTrue(settingsManager.syncEnabled)
        XCTAssertEqual(settingsManager.selectedLanguage, "en")
        XCTAssertFalse(settingsManager.analyticsEnabled)
        
        // Test setting values
        settingsManager.realtimeTranscription = false
        settingsManager.audioQuality = "Low"
        settingsManager.selectedLanguage = "es"
        
        XCTAssertFalse(settingsManager.realtimeTranscription)
        XCTAssertEqual(settingsManager.audioQuality, "Low")
        XCTAssertEqual(settingsManager.selectedLanguage, "es")
    }
    
    // MARK: - Performance Tests
    
    func testPerformanceExample() throws {
        // Test the performance of creating and saving multiple sessions
        measure {
            for i in 0..<100 {
                let session = Session(context: context)
                session.id = UUID()
                session.title = "Performance Test Session \(i)"
                session.timestamp = Date()
                session.duration = Double.random(in: 30...300)
                session.hasAudio = Bool.random()
            }
            
            do {
                try context.save()
                // Reset for next iteration
                let request: NSFetchRequest<NSFetchRequestResult> = Session.fetchRequest()
                let deleteRequest = NSBatchDeleteRequest(fetchRequest: request)
                try context.execute(deleteRequest)
            } catch {
                XCTFail("Performance test failed: \(error)")
            }
        }
    }
}

// MARK: - Test Extensions

extension Session {
    static func createTestSession(context: NSManagedObjectContext) -> Session {
        let session = Session(context: context)
        session.id = UUID()
        session.title = "Test Session"
        session.timestamp = Date()
        session.duration = 60.0
        session.hasAudio = true
        session.transcription = "Test transcription"
        session.language = "en"
        return session
    }
}

extension Note {
    static func createTestNote(context: NSManagedObjectContext) -> Note {
        let note = Note(context: context)
        note.id = UUID()
        note.title = "Test Note"
        note.body = "Test note body"
        note.timestamp = Date()
        note.language = "en"
        return note
    }
}