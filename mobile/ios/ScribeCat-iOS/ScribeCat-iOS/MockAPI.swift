//
//  MockAPI.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import Foundation
import Network
import Combine

// MARK: - API Models

struct TranscriptionRequest: Codable {
    let audioFileURL: URL
    let language: String
    let userId: String?
}

struct TranscriptionResponse: Codable {
    let transcription: String
    let confidence: Double
    let language: String
    let timestamp: Date
    let processTime: TimeInterval
}

struct SyncRequest: Codable {
    let sessions: [SessionSyncData]
    let notes: [NoteSyncData]
    let lastSyncTimestamp: Date?
}

struct SyncResponse: Codable {
    let syncedSessions: [SessionSyncData]
    let syncedNotes: [NoteSyncData]
    let syncTimestamp: Date
    let conflicts: [SyncConflict]
}

struct SessionSyncData: Codable {
    let id: UUID
    let title: String
    let timestamp: Date
    let duration: TimeInterval
    let transcription: String?
    let notes: String?
    let language: String
    let tags: String?
    let audioFileURL: URL?
    let hasAudio: Bool
    let lastModified: Date
}

struct NoteSyncData: Codable {
    let id: UUID
    let title: String
    let body: String
    let timestamp: Date
    let language: String
    let tags: String?
    let lastModified: Date
}

struct SyncConflict: Codable {
    let id: UUID
    let type: String // "session" or "note"
    let localVersion: Date
    let remoteVersion: Date
    let conflictData: Data
}

// MARK: - API Error Types

enum APIError: Error, LocalizedError {
    case networkUnavailable
    case invalidRequest
    case serverError(String)
    case transcriptionFailed
    case authenticationRequired
    case rateLimitExceeded
    case unsupportedAudioFormat
    
    var errorDescription: String? {
        switch self {
        case .networkUnavailable:
            return "Network connection unavailable"
        case .invalidRequest:
            return "Invalid request format"
        case .serverError(let message):
            return "Server error: \(message)"
        case .transcriptionFailed:
            return "Transcription processing failed"
        case .authenticationRequired:
            return "Authentication required"
        case .rateLimitExceeded:
            return "Rate limit exceeded. Please try again later."
        case .unsupportedAudioFormat:
            return "Unsupported audio file format"
        }
    }
}

// MARK: - Mock API Implementation

class MockAPI: ObservableObject {
    
    static let shared = MockAPI()
    
    @Published var isConnected = false
    @Published var lastSyncTime: Date?
    @Published var pendingRequests = 0
    
    private let networkMonitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "NetworkMonitor")
    
    // Mock data storage
    private var mockSessions: [SessionSyncData] = []
    private var mockNotes: [NoteSyncData] = []
    
    private init() {
        setupNetworkMonitoring()
        loadMockData()
    }
    
    // MARK: - Network Monitoring
    
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        networkMonitor.start(queue: monitorQueue)
    }
    
    // MARK: - Mock Data Management
    
    private func loadMockData() {
        // Initialize with some sample data
        mockSessions = [
            SessionSyncData(
                id: UUID(),
                title: "Sample Remote Session",
                timestamp: Date().addingTimeInterval(-86400), // Yesterday
                duration: 150.0,
                transcription: "This is a sample transcription from a remote session that was synced from another device.",
                notes: "Remote session notes that were synced.",
                language: "en",
                tags: "remote,sync,sample",
                audioFileURL: nil,
                hasAudio: false,
                lastModified: Date().addingTimeInterval(-86400)
            )
        ]
        
        mockNotes = [
            NoteSyncData(
                id: UUID(),
                title: "Sample Remote Note",
                body: "This is a sample note that was synced from another device or the desktop application.",
                timestamp: Date().addingTimeInterval(-43200), // 12 hours ago
                language: "en",
                tags: "remote,sync",
                lastModified: Date().addingTimeInterval(-43200)
            )
        ]
    }
    
    // MARK: - Transcription API
    
    func transcribeAudio(_ request: TranscriptionRequest) -> AnyPublisher<TranscriptionResponse, APIError> {
        return Future<TranscriptionResponse, APIError> { [weak self] promise in
            
            self?.incrementPendingRequests()
            
            // Simulate network delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                
                self?.decrementPendingRequests()
                
                // Mock transcription based on audio file
                let mockTranscriptions = [
                    "This is a mock transcription of your recorded audio. The actual implementation would connect to a speech-to-text service.",
                    "ScribeCat mobile is working correctly. This demonstrates the transcription API integration.",
                    "Your audio has been processed successfully. The transcription quality depends on audio clarity and background noise.",
                    "This mock API simulates the real transcription service. Replace this with actual API calls when ready."
                ]
                
                let response = TranscriptionResponse(
                    transcription: mockTranscriptions.randomElement() ?? "Mock transcription",
                    confidence: Double.random(in: 0.8...0.95),
                    language: request.language,
                    timestamp: Date(),
                    processTime: Double.random(in: 1.5...3.0)
                )
                
                promise(.success(response))
            }
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Sync API
    
    func syncData(_ request: SyncRequest) -> AnyPublisher<SyncResponse, APIError> {
        return Future<SyncResponse, APIError> { [weak self] promise in
            
            guard let self = self else {
                promise(.failure(.serverError("API instance unavailable")))
                return
            }
            
            self.incrementPendingRequests()
            
            // Simulate network delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                
                self.decrementPendingRequests()
                
                // Mock sync logic
                // In real implementation, this would:
                // 1. Upload local changes to server
                // 2. Download remote changes from server
                // 3. Handle conflicts
                
                // For mock, we'll just return what was sent plus some mock remote data
                var allSessions = request.sessions
                let remoteSessions = self.mockSessions.filter { remote in
                    !request.sessions.contains { local in local.id == remote.id }
                }
                allSessions.append(contentsOf: remoteSessions)
                
                var allNotes = request.notes
                let remoteNotes = self.mockNotes.filter { remote in
                    !request.notes.contains { local in local.id == remote.id }
                }
                allNotes.append(contentsOf: remoteNotes)
                
                let response = SyncResponse(
                    syncedSessions: allSessions,
                    syncedNotes: allNotes,
                    syncTimestamp: Date(),
                    conflicts: [] // No conflicts in mock
                )
                
                self.lastSyncTime = Date()
                promise(.success(response))
            }
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Authentication API (Mock)
    
    func authenticate(username: String, password: String) -> AnyPublisher<Bool, APIError> {
        return Future<Bool, APIError> { promise in
            // Mock authentication - always succeeds for demo
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                promise(.success(true))
            }
        }
        .eraseToAnyPublisher()
    }
    
    func refreshToken() -> AnyPublisher<String, APIError> {
        return Future<String, APIError> { promise in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                promise(.success("mock_refresh_token_\(Date().timeIntervalSince1970)"))
            }
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Utility Methods
    
    private func incrementPendingRequests() {
        DispatchQueue.main.async {
            self.pendingRequests += 1
        }
    }
    
    private func decrementPendingRequests() {
        DispatchQueue.main.async {
            self.pendingRequests = max(0, self.pendingRequests - 1)
        }
    }
    
    // MARK: - Real API Transition Helper
    
    func switchToRealAPI() {
        // This method provides a clear transition point to real API
        // When ready to use real API:
        // 1. Replace MockAPI with RealAPI
        // 2. Update base URLs and endpoints
        // 3. Implement proper authentication
        // 4. Handle real error responses
        
        print("""
        🔄 SWITCHING TO REAL API
        
        To switch from mock to real API:
        
        1. Create a new RealAPI class implementing the same interface
        2. Replace MockAPI.shared with RealAPI.shared in your view models
        3. Configure real endpoints in RealAPI:
           - baseURL = "https://api.scribecat.com"
           - transcriptionEndpoint = "/v1/transcribe"
           - syncEndpoint = "/v1/sync"
        4. Implement proper authentication headers
        5. Handle real HTTP status codes and error responses
        6. Add proper SSL certificate validation
        
        See README.md for detailed instructions.
        """)
    }
}

// MARK: - API Client Protocol

protocol APIClientProtocol {
    func transcribeAudio(_ request: TranscriptionRequest) -> AnyPublisher<TranscriptionResponse, APIError>
    func syncData(_ request: SyncRequest) -> AnyPublisher<SyncResponse, APIError>
    func authenticate(username: String, password: String) -> AnyPublisher<Bool, APIError>
    func refreshToken() -> AnyPublisher<String, APIError>
}

extension MockAPI: APIClientProtocol {}

// MARK: - Real API Implementation Template

/*
 When ready to implement the real API, create a class like this:

class RealAPI: APIClientProtocol, ObservableObject {
    private let baseURL = "https://api.scribecat.com"
    private let urlSession = URLSession.shared
    private var authToken: String?
    
    func transcribeAudio(_ request: TranscriptionRequest) -> AnyPublisher<TranscriptionResponse, APIError> {
        // Implement real HTTP request to transcription endpoint
        // Handle file upload, authentication headers, etc.
    }
    
    func syncData(_ request: SyncRequest) -> AnyPublisher<SyncResponse, APIError> {
        // Implement real sync with server
        // Handle authentication, conflict resolution, etc.
    }
    
    // ... implement other methods
}

Then in your app, replace:
@StateObject private var api = MockAPI.shared
with:
@StateObject private var api = RealAPI.shared
*/