//
//  AIChatView.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  AI-powered chat interface with full desktop functionality
//

import SwiftUI

struct AIChatView: View {
    let theme: AppTheme
    @StateObject private var aiManager = AIManager()
    @State private var messageText = ""
    @State private var messages: [ChatMessage] = []
    @State private var isProcessing = false
    @State private var showingContextMenu = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with AI status and context options
            VStack {
                HStack {
                    Text("Ask AI")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(theme.textPrimary)
                    
                    Spacer()
                    
                    // AI model indicator
                    HStack(spacing: 4) {
                        Circle()
                            .fill(aiManager.isConnected ? Color.green : Color.red)
                            .frame(width: 8, height: 8)
                        
                        Text(aiManager.currentModel)
                            .font(.caption)
                            .foregroundColor(theme.textSecondary)
                    }
                    
                    Button(action: { showingContextMenu.toggle() }) {
                        Image(systemName: "ellipsis.circle")
                            .foregroundColor(theme.primaryColor)
                    }
                }
                
                // Context options
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ContextButton("Current Notes", isSelected: aiManager.includeNotes, theme: theme) {
                            aiManager.includeNotes.toggle()
                        }
                        
                        ContextButton("Transcription", isSelected: aiManager.includeTranscription, theme: theme) {
                            aiManager.includeTranscription.toggle()
                        }
                        
                        ContextButton("Canvas Info", isSelected: aiManager.includeCanvas, theme: theme) {
                            aiManager.includeCanvas.toggle()
                        }
                        
                        ContextButton("Drive Files", isSelected: aiManager.includeDriveFiles, theme: theme) {
                            aiManager.includeDriveFiles.toggle()
                        }
                    }
                    .padding(.horizontal)
                }
                
                // Quick prompts
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        QuickPromptButton("Summarize", theme: theme) {
                            sendQuickPrompt("Please summarize the key points from my notes and transcription.")
                        }
                        
                        QuickPromptButton("Polish Text", theme: theme) {
                            sendQuickPrompt("Please polish and improve the writing in my current notes.")
                        }
                        
                        QuickPromptButton("Create Quiz", theme: theme) {
                            sendQuickPrompt("Create a quiz based on the content in my notes.")
                        }
                        
                        QuickPromptButton("Explain", theme: theme) {
                            sendQuickPrompt("Explain any complex concepts mentioned in my notes in simpler terms.")
                        }
                        
                        QuickPromptButton("Action Items", theme: theme) {
                            sendQuickPrompt("Extract action items and to-dos from my notes and transcription.")
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding()
            .background(theme.surfaceColor)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(theme.borderColor),
                alignment: .bottom
            )
            
            // Chat messages
            ScrollView {
                ScrollViewReader { proxy in
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            EmptyStateView(theme: theme)
                        } else {
                            ForEach(messages) { message in
                                ChatMessageView(message: message, theme: theme)
                                    .id(message.id)
                            }
                        }
                        
                        if isProcessing {
                            TypingIndicatorView(theme: theme)
                                .id("typing")
                        }
                    }
                    .padding()
                    .onChange(of: messages.count) { _ in
                        withAnimation {
                            if let lastMessage = messages.last {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                    .onChange(of: isProcessing) { processing in
                        if processing {
                            withAnimation {
                                proxy.scrollTo("typing", anchor: .bottom)
                            }
                        }
                    }
                }
            }
            .background(theme.backgroundColor)
            
            // Message input
            VStack(spacing: 0) {
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(theme.borderColor)
                
                HStack(spacing: 12) {
                    // Text input
                    TextField("Ask me anything about your notes...", text: $messageText, axis: .vertical)
                        .textFieldStyle(PlainTextFieldStyle())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(theme.backgroundColor)
                        .cornerRadius(20)
                        .lineLimit(1...4)
                        .onSubmit {
                            sendMessage()
                        }
                    
                    // Send button
                    Button(action: sendMessage) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(messageText.isEmpty ? theme.textSecondary : theme.primaryColor)
                    }
                    .disabled(messageText.isEmpty || isProcessing)
                }
                .padding()
                .background(theme.surfaceColor)
            }
        }
        .navigationTitle("AI Assistant")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            setupAI()
        }
    }
    
    private func sendMessage() {
        guard !messageText.isEmpty else { return }
        
        let userMessage = ChatMessage(
            content: messageText,
            isFromUser: true,
            timestamp: Date()
        )
        
        messages.append(userMessage)
        let currentMessage = messageText
        messageText = ""
        isProcessing = true
        
        Task {
            do {
                let response = try await aiManager.sendMessage(
                    currentMessage,
                    context: aiManager.buildContext()
                )
                
                DispatchQueue.main.async {
                    let aiMessage = ChatMessage(
                        content: response,
                        isFromUser: false,
                        timestamp: Date()
                    )
                    self.messages.append(aiMessage)
                    self.isProcessing = false
                }
            } catch {
                DispatchQueue.main.async {
                    let errorMessage = ChatMessage(
                        content: "Sorry, I encountered an error: \(error.localizedDescription)",
                        isFromUser: false,
                        timestamp: Date(),
                        isError: true
                    )
                    self.messages.append(errorMessage)
                    self.isProcessing = false
                }
            }
        }
    }
    
    private func sendQuickPrompt(_ prompt: String) {
        messageText = prompt
        sendMessage()
    }
    
    private func setupAI() {
        aiManager.initialize()
    }
}

// Context Button
struct ContextButton: View {
    let title: String
    let isSelected: Bool
    let theme: AppTheme
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .foregroundColor(isSelected ? .white : theme.primaryColor)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? theme.primaryColor : Color.clear)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(theme.primaryColor, lineWidth: 1)
                )
        }
    }
}

// Quick Prompt Button
struct QuickPromptButton: View {
    let title: String
    let theme: AppTheme
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .foregroundColor(theme.primaryColor)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(theme.backgroundColor)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(theme.borderColor, lineWidth: 1)
                )
        }
    }
}

// Chat Message View
struct ChatMessageView: View {
    let message: ChatMessage
    let theme: AppTheme
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.isFromUser {
                Spacer(minLength: 50)
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(message.content)
                        .font(.body)
                        .foregroundColor(.white)
                        .padding()
                        .background(theme.primaryColor)
                        .cornerRadius(16)
                    
                    Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                        .font(.caption)
                        .foregroundColor(theme.textSecondary)
                }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: "brain.head.profile")
                            .foregroundColor(message.isError ? .red : theme.primaryColor)
                            .font(.system(size: 16))
                            .frame(width: 20, height: 20)
                        
                        Text("AI Assistant")
                            .font(.caption)
                            .foregroundColor(theme.textSecondary)
                        
                        Spacer()
                        
                        Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                            .font(.caption)
                            .foregroundColor(theme.textSecondary)
                    }
                    
                    Text(message.content)
                        .font(.body)
                        .foregroundColor(message.isError ? .red : theme.textPrimary)
                        .padding()
                        .background(theme.surfaceColor)
                        .cornerRadius(16)
                        .textSelection(.enabled)
                }
                
                Spacer(minLength: 50)
            }
        }
    }
}

// Empty State View
struct EmptyStateView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 60))
                .foregroundColor(theme.textSecondary)
            
            VStack(spacing: 8) {
                Text("AI Assistant Ready")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(theme.textPrimary)
                
                Text("Ask me anything about your notes, transcriptions, or coursework. I can help with:")
                    .font(.body)
                    .foregroundColor(theme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Group {
                    Text("• Summarizing content")
                    Text("• Polishing text and notes")
                    Text("• Creating study materials")
                    Text("• Explaining complex concepts")
                    Text("• Extracting action items")
                    Text("• Answering questions")
                }
                .font(.body)
                .foregroundColor(theme.textSecondary)
            }
        }
        .padding()
    }
}

// Typing Indicator
struct TypingIndicatorView: View {
    let theme: AppTheme
    @State private var animationPhase = 0
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Image(systemName: "brain.head.profile")
                        .foregroundColor(theme.primaryColor)
                        .font(.system(size: 16))
                        .frame(width: 20, height: 20)
                    
                    Text("AI Assistant")
                        .font(.caption)
                        .foregroundColor(theme.textSecondary)
                }
                
                HStack(spacing: 4) {
                    ForEach(0..<3) { index in
                        Circle()
                            .fill(theme.primaryColor)
                            .frame(width: 8, height: 8)
                            .opacity(animationPhase == index ? 1.0 : 0.3)
                    }
                }
                .padding()
                .background(theme.surfaceColor)
                .cornerRadius(16)
            }
            
            Spacer(minLength: 50)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: false)) {
                animationPhase = 2
            }
        }
    }
}

// AI Manager
class AIManager: ObservableObject {
    @Published var isConnected = false
    @Published var currentModel = "Claude 3.5 Sonnet"
    @Published var includeNotes = true
    @Published var includeTranscription = true
    @Published var includeCanvas = false
    @Published var includeDriveFiles = false
    
    func initialize() {
        // Initialize AI connection
        isConnected = true // Simulated
    }
    
    func sendMessage(_ message: String, context: String) async throws -> String {
        // Simulate API delay
        try await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
        
        // This would be replaced with actual AI API call
        return "I understand you're asking about: \"\(message)\"\n\nBased on the context you've provided, here's my response:\n\n[This would be the actual AI response based on your notes, transcription, and other context. The AI would analyze the content and provide helpful insights, summaries, or answers to your questions.]"
    }
    
    func buildContext() -> String {
        var context = ""
        
        if includeNotes {
            context += "Current Notes: [User's current notes would be included here]\n\n"
        }
        
        if includeTranscription {
            context += "Recent Transcription: [Recent transcription content would be included here]\n\n"
        }
        
        if includeCanvas {
            context += "Canvas Course Info: [Canvas course information would be included here]\n\n"
        }
        
        if includeDriveFiles {
            context += "Google Drive Files: [Relevant Drive files would be included here]\n\n"
        }
        
        return context
    }
}

// Chat Message Model
struct ChatMessage: Identifiable {
    let id = UUID()
    let content: String
    let isFromUser: Bool
    let timestamp: Date
    let isError: Bool
    
    init(content: String, isFromUser: Bool, timestamp: Date, isError: Bool = false) {
        self.content = content
        self.isFromUser = isFromUser
        self.timestamp = timestamp
        self.isError = isError
    }
}

struct AIChatView_Previews: PreviewProvider {
    static var previews: some View {
        AIChatView(theme: .defaultTheme)
            .previewDevice("iPad Pro (12.9-inch) (6th generation)")
    }
}