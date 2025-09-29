//
//  CacheManager.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import Foundation
import CoreData
import Combine

class CacheManager: ObservableObject {
    @Published var totalCacheSize: Int64 = 0
    @Published var sessionCount: Int = 0
    @Published var isCleaningUp = false
    
    // Cache configuration (in bytes)
    private let maxTotalCacheSize: Int64 = 200 * 1024 * 1024 // 200 MB
    private let maxSessionCacheSize: Int64 = 75 * 1024 * 1024 // 75 MB soft cap
    private let minSessionCacheSize: Int64 = 50 * 1024 * 1024 // 50 MB soft cap
    
    // Core Data context for cache management
    private let viewContext: NSManagedObjectContext
    
    // LRU tracking
    private var sessionAccessTimes: [UUID: Date] = [:]
    
    init(context: NSManagedObjectContext) {
        self.viewContext = context
        updateCacheStats()
    }
    
    // MARK: - Cache Management
    
    func updateCacheStats() {
        DispatchQueue.global(qos: .background).async {
            let totalSize = self.calculateTotalCacheSize()
            let count = self.getSessionCount()
            
            DispatchQueue.main.async {
                self.totalCacheSize = totalSize
                self.sessionCount = count
            }
        }
    }
    
    private func calculateTotalCacheSize() -> Int64 {
        // Mock implementation - in production would calculate actual file sizes
        return Int64(sessionCount * 10 * 1024 * 1024) // Mock 10MB per session
    }
    
    private func getSessionCount() -> Int {
        let request: NSFetchRequest<Session> = Session.fetchRequest()
        return (try? viewContext.count(for: request)) ?? 0
    }
    
    func recordSessionAccess(_ sessionId: UUID) {
        sessionAccessTimes[sessionId] = Date()
        
        // Check if cleanup is needed
        if totalCacheSize > maxTotalCacheSize {
            performLRUCleanup()
        }
    }
    
    func performLRUCleanup() {
        guard !isCleaningUp else { return }
        
        isCleaningUp = true
        
        DispatchQueue.global(qos: .background).async {
            self.performLRUCleanupInternal()
            
            DispatchQueue.main.async {
                self.isCleaningUp = false
                self.updateCacheStats()
            }
        }
    }
    
    private func performLRUCleanupInternal() {
        // Get all sessions sorted by last access time (least recently used first)
        let request: NSFetchRequest<Session> = Session.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(keyPath: \Session.timestamp, ascending: true)]
        
        guard let sessions = try? viewContext.fetch(request) else { return }
        
        var currentCacheSize = totalCacheSize
        var sessionsToRemove: [Session] = []
        
        // Calculate target size (remove 20% extra to avoid frequent cleanups)
        let targetSize = Int64(Double(maxTotalCacheSize) * 0.8)
        
        for session in sessions {
            if currentCacheSize <= targetSize { break }
            
            guard let sessionId = session.id else { continue }
            
            // Check if session was accessed recently (keep recently accessed sessions)
            if let lastAccess = sessionAccessTimes[sessionId],
               Date().timeIntervalSince(lastAccess) < 3600 { // Keep if accessed within 1 hour
                continue
            }
            
            sessionsToRemove.append(session)
            currentCacheSize -= estimateSessionSize(session)
        }
        
        // Remove least recently used sessions
        for session in sessionsToRemove {
            removeCachedSession(session)
        }
        
        // Save context
        try? viewContext.save()
    }
    
    private func estimateSessionSize(_ session: Session) -> Int64 {
        // Mock size calculation - in production would calculate actual file sizes
        var size: Int64 = 0
        
        // Base session data
        size += 1024 // 1KB for metadata
        
        // Transcription text
        if let transcription = session.transcription {
            size += Int64(transcription.utf8.count)
        }
        
        // Notes text
        if let notes = session.notes {
            size += Int64(notes.utf8.count)
        }
        
        // Mock audio file size
        if session.hasAudio {
            size += Int64(session.duration * 1000) // ~1KB per second of audio (very rough estimate)
        }
        
        return size
    }
    
    private func removeCachedSession(_ session: Session) {
        // Remove from access tracking
        if let sessionId = session.id {
            sessionAccessTimes.removeValue(forKey: sessionId)
        }
        
        // In production, would also remove associated cached files
        // For now, just remove the Core Data record
        viewContext.delete(session)
        
        print("Removed cached session: \(session.title ?? "Untitled")")
    }
    
    // MARK: - Cache Configuration
    
    func getCacheConfiguration() -> CacheConfiguration {
        return CacheConfiguration(
            maxTotalSize: maxTotalCacheSize,
            maxSessionSize: maxSessionCacheSize,
            minSessionSize: minSessionCacheSize,
            currentSize: totalCacheSize,
            sessionCount: sessionCount
        )
    }
    
    func performManualCleanup() {
        performLRUCleanup()
    }
    
    func clearAllCache() {
        isCleaningUp = true
        
        DispatchQueue.global(qos: .background).async {
            let request: NSFetchRequest<NSFetchRequestResult> = Session.fetchRequest()
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: request)
            
            try? self.viewContext.execute(deleteRequest)
            try? self.viewContext.save()
            
            self.sessionAccessTimes.removeAll()
            
            DispatchQueue.main.async {
                self.isCleaningUp = false
                self.updateCacheStats()
            }
        }
    }
    
    // MARK: - Background Cleanup
    
    func performBackgroundCleanup() {
        // Perform cleanup on app start or when app becomes active
        DispatchQueue.global(qos: .background).async {
            // Clean up old access times (remove entries older than 30 days)
            let cutoffDate = Date().addingTimeInterval(-30 * 24 * 3600)
            self.sessionAccessTimes = self.sessionAccessTimes.filter { $0.value > cutoffDate }
            
            // Check if cleanup is needed
            if self.totalCacheSize > self.maxTotalCacheSize {
                self.performLRUCleanup()
            }
        }
    }
}

// MARK: - Cache Configuration Model

struct CacheConfiguration {
    let maxTotalSize: Int64
    let maxSessionSize: Int64
    let minSessionSize: Int64
    let currentSize: Int64
    let sessionCount: Int
    
    var usagePercentage: Double {
        return Double(currentSize) / Double(maxTotalSize) * 100
    }
    
    var formattedCurrentSize: String {
        return ByteCountFormatter.string(fromByteCount: currentSize, countStyle: .file)
    }
    
    var formattedMaxSize: String {
        return ByteCountFormatter.string(fromByteCount: maxTotalSize, countStyle: .file)
    }
    
    var formattedMaxSessionSize: String {
        return ByteCountFormatter.string(fromByteCount: maxSessionSize, countStyle: .file)
    }
}