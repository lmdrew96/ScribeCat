//
//  AskAISettingsView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI

struct AskAISettingsView: View {
    @ObservedObject var askAIManager: AskAIManager
    @State private var apiKeyInput = ""
    @State private var showingAPIKeyAlert = false
    @State private var showingUsageResetConfirmation = false
    @State private var isAPIKeyVisible = false
    
    var body: some View {
        List {
            // API Key Section
            Section("OpenAI API Key") {
                if askAIManager.hasAPIKey {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("API Key Configured")
                            .foregroundColor(.green)
                        Spacer()
                        Button("Update") {
                            showingAPIKeyAlert = true
                        }
                        .foregroundColor(.blue)
                    }
                } else {
                    HStack {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundColor(.orange)
                        Text("No API Key")
                            .foregroundColor(.orange)
                        Spacer()
                        Button("Add Key") {
                            showingAPIKeyAlert = true
                        }
                        .foregroundColor(.blue)
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Setup Instructions")
                        .font(.headline)
                    Text("1. Visit platform.openai.com")
                    Text("2. Create an account or sign in")
                    Text("3. Go to API Keys section")
                    Text("4. Create a new API key")
                    Text("5. Copy and paste the key here")
                }
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.vertical, 4)
                
                if askAIManager.hasAPIKey {
                    Button("Remove API Key") {
                        askAIManager.removeAPIKey()
                    }
                    .foregroundColor(.red)
                }
            }
            
            // Usage Statistics Section
            Section("Usage Statistics") {
                let usageInfo = askAIManager.getUsageInfo()
                
                VStack(alignment: .leading, spacing: 12) {
                    // Monthly Usage
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Monthly Usage")
                                .fontWeight(.semibold)
                            Spacer()
                            Text("\(usageInfo.monthlyUsage)/\(usageInfo.monthlyLimit)")
                                .foregroundColor(usageInfo.monthlyUsage >= usageInfo.monthlyLimit ? .red : .primary)
                        }
                        
                        ProgressView(value: usageInfo.monthlyUsagePercentage / 100.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: usageInfo.monthlyUsage >= usageInfo.monthlyLimit ? .red : .blue))
                        
                        HStack {
                            Text("\(usageInfo.remainingMonthlyQueries) remaining")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("Resets in \(usageInfo.daysUntilReset) days")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Divider()
                    
                    // Daily Usage
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Daily Usage")
                                .fontWeight(.semibold)
                            Spacer()
                            Text("\(usageInfo.dailyUsage)/\(usageInfo.dailyLimit)")
                                .foregroundColor(usageInfo.dailyUsage >= usageInfo.dailyLimit ? .red : .primary)
                        }
                        
                        ProgressView(value: usageInfo.dailyUsagePercentage / 100.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: usageInfo.dailyUsage >= usageInfo.dailyLimit ? .red : .green))
                        
                        HStack {
                            Text("\(usageInfo.remainingDailyQueries) remaining today")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("Resets in \(usageInfo.hoursUntilDailyReset) hours")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.vertical, 4)
                
                if askAIManager.isOverMonthlyLimit {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        VStack(alignment: .leading) {
                            Text("Monthly Limit Reached")
                                .fontWeight(.semibold)
                                .foregroundColor(.red)
                            Text("No more queries available this month")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } else if askAIManager.isOverDailyLimit {
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading) {
                            Text("Daily Limit Reached")
                                .fontWeight(.semibold)
                                .foregroundColor(.orange)
                            Text("Try again tomorrow")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            // Usage Management Section
            Section("Usage Management") {
                Button("Reset Usage Counters") {
                    showingUsageResetConfirmation = true
                }
                .foregroundColor(.orange)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("About Usage Limits")
                        .font(.headline)
                    Text("AskAI Lite enforces usage limits to prevent unexpected charges:")
                    Text("• 100 queries per month (hard limit)")
                    Text("• 10 queries per day (soft limit)")
                    Text("• Counters reset automatically")
                    Text("• Usage is tracked locally for privacy")
                }
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.vertical, 4)
            }
            
            // Feature Information Section
            Section("AskAI Lite Features") {
                VStack(alignment: .leading, spacing: 8) {
                    FeatureRow(
                        icon: "brain.head.profile",
                        title: "Session Analysis",
                        description: "Ask questions about your recorded sessions"
                    )
                    
                    FeatureRow(
                        icon: "list.bullet",
                        title: "Summarization",
                        description: "Get summaries and key points from sessions"
                    )
                    
                    FeatureRow(
                        icon: "checkmark.circle",
                        title: "Action Items",
                        description: "Extract action items and tasks from discussions"
                    )
                    
                    FeatureRow(
                        icon: "magnifyingglass",
                        title: "Content Search",
                        description: "Find specific topics or mentions in your sessions"
                    )
                }
            }
            
            // Privacy & Security Section
            Section("Privacy & Security") {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "lock.fill")
                            .foregroundColor(.green)
                        Text("API Key stored in iOS Keychain")
                    }
                    
                    HStack {
                        Image(systemName: "chart.bar")
                            .foregroundColor(.blue)
                        Text("Usage tracked locally on device")
                    }
                    
                    HStack {
                        Image(systemName: "shield.fill")
                            .foregroundColor(.blue)
                        Text("No session data stored by OpenAI")
                    }
                    
                    HStack {
                        Image(systemName: "person.fill.xmark")
                            .foregroundColor(.green)
                        Text("Queries are anonymous")
                    }
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            
            // Error Display Section
            if let error = askAIManager.lastError {
                Section("Recent Error") {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }
        }
        .navigationTitle("AskAI Lite")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Enter OpenAI API Key", isPresented: $showingAPIKeyAlert) {
            SecureField("API Key (sk-...)", text: $apiKeyInput)
            Button("Cancel", role: .cancel) {
                apiKeyInput = ""
            }
            Button("Save") {
                askAIManager.setAPIKey(apiKeyInput)
                apiKeyInput = ""
            }
        } message: {
            Text("Enter your OpenAI API key. It will be stored securely in the iOS Keychain.")
        }
        .alert("Reset Usage Counters?", isPresented: $showingUsageResetConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Reset", role: .destructive) {
                askAIManager.resetUsageCounters()
            }
        } message: {
            Text("This will reset your monthly and daily usage counters to zero. This action cannot be undone.")
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

struct AskAISettingsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            AskAISettingsView(askAIManager: AskAIManager())
        }
    }
}