//
//  AskAISessionView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI

struct AskAISessionView: View {
    let session: Session
    @StateObject private var askAIManager = AskAIManager()
    
    @State private var queryText = ""
    @State private var responses: [AIResponse] = []
    @State private var showingUsageLimitAlert = false
    @State private var limitAlertMessage = ""
    
    var body: some View {
        VStack {
            // Header with usage info
            HStack {
                VStack(alignment: .leading) {
                    Text("Ask AI about this session")
                        .font(.headline)
                    
                    if askAIManager.hasAPIKey {
                        let usage = askAIManager.getUsageInfo()
                        Text("\(usage.remainingMonthlyQueries) monthly, \(usage.remainingDailyQueries) daily remaining")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Configure API key in Settings")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                
                Spacer()
                
                if askAIManager.hasAPIKey {
                    let usage = askAIManager.getUsageInfo()
                    VStack {
                        CircularProgressView(
                            progress: usage.monthlyUsagePercentage / 100.0,
                            color: usage.monthlyUsage >= usage.monthlyLimit ? .red : .blue
                        )
                        .frame(width: 30, height: 30)
                        
                        Text("\(usage.monthlyUsage)/\(usage.monthlyLimit)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding()
            
            // Response history
            if !responses.isEmpty {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(responses) { response in
                            AIResponseCard(response: response)
                        }
                    }
                    .padding()
                }
            } else {
                // Suggestion prompts
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Try asking:")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .padding(.horizontal)
                        
                        LazyVStack(spacing: 8) {
                            SuggestionButton(
                                icon: "list.bullet",
                                title: "Summarize this session",
                                query: "Summarize the key points from this session"
                            ) { query in
                                queryText = query
                                performQuery()
                            }
                            
                            SuggestionButton(
                                icon: "checkmark.circle",
                                title: "Find action items",
                                query: "What action items were mentioned in this session?"
                            ) { query in
                                queryText = query
                                performQuery()
                            }
                            
                            SuggestionButton(
                                icon: "magnifyingglass",
                                title: "Find specific topics",
                                query: "What topics were discussed in this session?"
                            ) { query in
                                queryText = query
                                performQuery()
                            }
                            
                            SuggestionButton(
                                icon: "doc.text",
                                title: "Create an outline",
                                query: "Create a brief outline of this discussion"
                            ) { query in
                                queryText = query
                                performQuery()
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            
            Spacer()
            
            // Input area
            VStack(spacing: 8) {
                HStack {
                    TextField("Ask about this session...", text: $queryText, axis: .vertical)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .lineLimit(3)
                    
                    Button(action: performQuery) {
                        if askAIManager.isProcessingQuery {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "paperplane.fill")
                        }
                    }
                    .disabled(!canPerformQuery())
                    .foregroundColor(canPerformQuery() ? .blue : .gray)
                }
                
                if let error = askAIManager.lastError {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.red)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Ask AI")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Usage Limit", isPresented: $showingUsageLimitAlert) {
            Button("OK") { }
            Button("Settings") {
                // Navigate to settings - would need navigation coordinator in production
            }
        } message: {
            Text(limitAlertMessage)
        }
    }
    
    private func canPerformQuery() -> Bool {
        return !queryText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
               askAIManager.canMakeQuery() &&
               !askAIManager.isProcessingQuery
    }
    
    private func performQuery() {
        guard canPerformQuery() else {
            if !askAIManager.hasAPIKey {
                limitAlertMessage = "Please configure your OpenAI API key in Settings first."
                showingUsageLimitAlert = true
            } else if askAIManager.isOverMonthlyLimit {
                limitAlertMessage = "Monthly usage limit reached. You've used all 100 queries for this month."
                showingUsageLimitAlert = true
            } else if askAIManager.isOverDailyLimit {
                limitAlertMessage = "Daily usage limit reached. You've used all 10 queries for today."
                showingUsageLimitAlert = true
            }
            return
        }
        
        let query = queryText.trimmingCharacters(in: .whitespacesAndNewlines)
        let sessionContext = createSessionContext()
        
        queryText = ""
        
        Task {
            let result = await askAIManager.makeQuery(query, sessionContext: sessionContext)
            
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    self.responses.append(AIResponse(
                        id: UUID(),
                        query: query,
                        response: response,
                        timestamp: Date()
                    ))
                    
                case .failure(let error):
                    // Error is already handled by askAIManager.lastError
                    print("AI Query failed: \(error)")
                }
            }
        }
    }
    
    private func createSessionContext() -> String {
        var context = ""
        
        if let title = session.title {
            context += "Session Title: \(title)\n"
        }
        
        if let timestamp = session.timestamp {
            context += "Date: \(timestamp.formatted(date: .abbreviated, time: .shortened))\n"
        }
        
        context += "Duration: \(Int(session.duration / 60)) minutes\n\n"
        
        if let transcription = session.transcription {
            context += "Transcription:\n\(transcription)\n\n"
        }
        
        if let notes = session.notes {
            context += "Notes:\n\(notes)\n\n"
        }
        
        return context
    }
}

struct AIResponse: Identifiable {
    let id: UUID
    let query: String
    let response: String
    let timestamp: Date
}

struct AIResponseCard: View {
    let response: AIResponse
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "person.circle.fill")
                    .foregroundColor(.blue)
                Text("You")
                    .fontWeight(.semibold)
                Spacer()
                Text(response.timestamp, style: .time)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(response.query)
                .padding(.vertical, 4)
                .font(.body)
            
            Divider()
            
            HStack {
                Image(systemName: "brain.head.profile")
                    .foregroundColor(.purple)
                Text("AI")
                    .fontWeight(.semibold)
                Spacer()
            }
            
            Text(response.response)
                .font(.body)
                .foregroundColor(.primary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct SuggestionButton: View {
    let icon: String
    let title: String
    let query: String
    let action: (String) -> Void
    
    var body: some View {
        Button(action: {
            action(query)
        }) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.blue)
                    .frame(width: 24)
                
                Text(title)
                    .font(.body)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct CircularProgressView: View {
    let progress: Double
    let color: Color
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(.systemGray5), lineWidth: 3)
            
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut, value: progress)
        }
    }
}

struct AskAISessionView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            AskAISessionView(session: createSampleSession())
        }
    }
    
    static func createSampleSession() -> Session {
        let context = PersistenceController.preview.container.viewContext
        let session = Session(context: context)
        session.id = UUID()
        session.title = "Sample Session"
        session.timestamp = Date()
        session.duration = 1800
        session.transcription = "This is a sample transcription for testing."
        session.notes = "Sample notes for the session."
        return session
    }
}