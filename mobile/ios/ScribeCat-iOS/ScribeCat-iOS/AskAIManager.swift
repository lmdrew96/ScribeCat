//
//  AskAIManager.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import Foundation
import Security
import Combine

class AskAIManager: ObservableObject {
    @Published var hasAPIKey = false
    @Published var monthlyUsage = 0
    @Published var dailyUsage = 0
    @Published var isOverMonthlyLimit = false
    @Published var isOverDailyLimit = false
    @Published var lastResetDate = Date()
    @Published var isProcessingQuery = false
    @Published var lastError: String?
    
    // Usage limits
    private let monthlyLimit = 100
    private let dailyLimit = 10
    
    // Keychain service and keys
    private let keychainService = "com.scribecat.ScribeCat-iOS"
    private let apiKeyKeychainKey = "openai-api-key"
    private let usageDataKeychainKey = "askai-usage-data"
    
    // Usage tracking
    private struct UsageData: Codable {
        var monthlyUsage: Int
        var dailyUsage: Int
        var lastResetDate: Date
        var lastDailyResetDate: Date
    }
    
    init() {
        loadUsageData()
        checkForAPIKey()
        checkForResets()
    }
    
    // MARK: - API Key Management
    
    func setAPIKey(_ key: String) {
        guard !key.isEmpty else {
            removeAPIKey()
            return
        }
        
        let success = saveToKeychain(key: apiKeyKeychainKey, data: key.data(using: .utf8)!)
        if success {
            hasAPIKey = true
            lastError = nil
        } else {
            lastError = "Failed to save API key to Keychain"
        }
    }
    
    func removeAPIKey() {
        deleteFromKeychain(key: apiKeyKeychainKey)
        hasAPIKey = false
    }
    
    private func checkForAPIKey() {
        hasAPIKey = getFromKeychain(key: apiKeyKeychainKey) != nil
    }
    
    private func getAPIKey() -> String? {
        guard let data = getFromKeychain(key: apiKeyKeychainKey),
              let key = String(data: data, encoding: .utf8) else {
            return nil
        }
        return key
    }
    
    // MARK: - Usage Tracking
    
    private func loadUsageData() {
        guard let data = getFromKeychain(key: usageDataKeychainKey),
              let usageData = try? JSONDecoder().decode(UsageData.self, from: data) else {
            // Initialize with default values
            resetUsageData()
            return
        }
        
        monthlyUsage = usageData.monthlyUsage
        dailyUsage = usageData.dailyUsage
        lastResetDate = usageData.lastResetDate
        
        updateLimitStatus()
    }
    
    private func saveUsageData() {
        let usageData = UsageData(
            monthlyUsage: monthlyUsage,
            dailyUsage: dailyUsage,
            lastResetDate: lastResetDate,
            lastDailyResetDate: Calendar.current.startOfDay(for: Date())
        )
        
        guard let data = try? JSONEncoder().encode(usageData) else { return }
        saveToKeychain(key: usageDataKeychainKey, data: data)
    }
    
    private func checkForResets() {
        let calendar = Calendar.current
        let now = Date()
        
        // Check for monthly reset
        if !calendar.isDate(lastResetDate, equalTo: now, toGranularity: .month) {
            monthlyUsage = 0
            lastResetDate = now
            saveUsageData()
        }
        
        // Check for daily reset
        if !calendar.isDate(lastResetDate, equalTo: now, toGranularity: .day) {
            dailyUsage = 0
            saveUsageData()
        }
        
        updateLimitStatus()
    }
    
    private func updateLimitStatus() {
        isOverMonthlyLimit = monthlyUsage >= monthlyLimit
        isOverDailyLimit = dailyUsage >= dailyLimit
    }
    
    private func resetUsageData() {
        monthlyUsage = 0
        dailyUsage = 0
        lastResetDate = Date()
        saveUsageData()
        updateLimitStatus()
    }
    
    func resetUsageCounters() {
        resetUsageData()
    }
    
    // MARK: - AI Query Processing
    
    func canMakeQuery() -> Bool {
        checkForResets()
        return hasAPIKey && !isOverMonthlyLimit && !isOverDailyLimit
    }
    
    func makeQuery(_ query: String, sessionContext: String?) async -> Result<String, AskAIError> {
        guard canMakeQuery() else {
            if !hasAPIKey {
                return .failure(.noAPIKey)
            } else if isOverMonthlyLimit {
                return .failure(.monthlyLimitExceeded)
            } else if isOverDailyLimit {
                return .failure(.dailyLimitExceeded)
            }
            return .failure(.unknown)
        }
        
        guard let apiKey = getAPIKey() else {
            return .failure(.noAPIKey)
        }
        
        DispatchQueue.main.async {
            self.isProcessingQuery = true
            self.lastError = nil
        }
        
        let result = await performOpenAIQuery(query: query, context: sessionContext, apiKey: apiKey)
        
        DispatchQueue.main.async {
            self.isProcessingQuery = false
            
            switch result {
            case .success:
                // Increment usage counters
                self.monthlyUsage += 1
                self.dailyUsage += 1
                self.saveUsageData()
                self.updateLimitStatus()
                
            case .failure(let error):
                self.lastError = error.localizedDescription
            }
        }
        
        return result
    }
    
    private func performOpenAIQuery(query: String, context: String?, apiKey: String) async -> Result<String, AskAIError> {
        // Mock implementation for M4
        // In production, this would make actual OpenAI API calls
        
        // Simulate network delay
        try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // Mock responses based on query content
        let mockResponse = generateMockResponse(for: query, context: context)
        
        return .success(mockResponse)
    }
    
    private func generateMockResponse(for query: String, context: String?) -> String {
        let lowercaseQuery = query.lowercased()
        
        if lowercaseQuery.contains("summary") || lowercaseQuery.contains("summarize") {
            return """
            Based on the session content, here are the key points:
            
            • Main discussion topics covered important project milestones
            • Action items were assigned to team members
            • Next meeting scheduled for next week
            • Budget considerations were reviewed
            
            This is a mock response for demonstration purposes in M4.
            """
        } else if lowercaseQuery.contains("action") {
            return """
            Action items from this session:
            
            1. Review project timeline - Due: End of week
            2. Prepare presentation materials - Assigned to: Project lead
            3. Schedule follow-up meeting - Due: Within 3 days
            4. Update stakeholders on progress
            
            This is a mock response for demonstration purposes in M4.
            """
        } else if lowercaseQuery.contains("topic") || lowercaseQuery.contains("mention") {
            return """
            Topics mentioned in this session:
            
            • Project planning and timeline
            • Resource allocation
            • Team coordination
            • Budget review
            • Quality assurance process
            
            This is a mock response for demonstration purposes in M4.
            """
        } else {
            return """
            I've analyzed the session content based on your query: "\(query)"
            
            Here's what I found relevant to your question. In the production version, this would be a detailed AI-generated response based on the actual session transcription and notes.
            
            This is a mock response for demonstration purposes in M4.
            """
        }
    }
    
    // MARK: - Usage Information
    
    func getUsageInfo() -> UsageInfo {
        checkForResets()
        return UsageInfo(
            monthlyUsage: monthlyUsage,
            monthlyLimit: monthlyLimit,
            dailyUsage: dailyUsage,
            dailyLimit: dailyLimit,
            daysUntilReset: daysUntilMonthlyReset(),
            hoursUntilDailyReset: hoursUntilDailyReset()
        )
    }
    
    private func daysUntilMonthlyReset() -> Int {
        let calendar = Calendar.current
        let now = Date()
        let startOfNextMonth = calendar.dateInterval(of: .month, for: now)?.end ?? now
        return calendar.dateComponents([.day], from: now, to: startOfNextMonth).day ?? 0
    }
    
    private func hoursUntilDailyReset() -> Int {
        let calendar = Calendar.current
        let now = Date()
        let startOfTomorrow = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? now
        return calendar.dateComponents([.hour], from: now, to: startOfTomorrow).hour ?? 0
    }
}

// MARK: - Keychain Helpers

extension AskAIManager {
    private func saveToKeychain(key: String, data: Data) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        // Delete existing item first
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    private func getFromKeychain(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess {
            return result as? Data
        }
        return nil
    }
    
    private func deleteFromKeychain(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Models and Errors

enum AskAIError: LocalizedError {
    case noAPIKey
    case monthlyLimitExceeded
    case dailyLimitExceeded
    case networkError
    case apiError(String)
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .noAPIKey:
            return "No OpenAI API key configured. Please add your API key in Settings."
        case .monthlyLimitExceeded:
            return "Monthly usage limit of 100 queries exceeded. Resets next month."
        case .dailyLimitExceeded:
            return "Daily usage limit of 10 queries exceeded. Resets tomorrow."
        case .networkError:
            return "Network error. Please check your connection and try again."
        case .apiError(let message):
            return "API Error: \(message)"
        case .unknown:
            return "An unknown error occurred. Please try again."
        }
    }
}

struct UsageInfo {
    let monthlyUsage: Int
    let monthlyLimit: Int
    let dailyUsage: Int
    let dailyLimit: Int
    let daysUntilReset: Int
    let hoursUntilDailyReset: Int
    
    var monthlyUsagePercentage: Double {
        return Double(monthlyUsage) / Double(monthlyLimit) * 100
    }
    
    var dailyUsagePercentage: Double {
        return Double(dailyUsage) / Double(dailyLimit) * 100
    }
    
    var remainingMonthlyQueries: Int {
        return max(0, monthlyLimit - monthlyUsage)
    }
    
    var remainingDailyQueries: Int {
        return max(0, dailyLimit - dailyUsage)
    }
}