//
//  TranscriptionView.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  Real-time transcription using Apple Speech Framework
//

import SwiftUI
import Speech
import AVFoundation

struct TranscriptionView: View {
    let theme: AppTheme
    @StateObject private var transcriptionManager = TranscriptionManager()
    @State private var transcriptionText = ""
    @State private var isRecording = false
    @State private var showingPermissionAlert = false
    @State private var audioLevel: Float = 0.0
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with recording controls
            VStack {
                HStack {
                    Text("Live Transcription")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(theme.textPrimary)
                    
                    Spacer()
                    
                    // Audio level indicator
                    AudioLevelIndicator(level: audioLevel, theme: theme)
                }
                
                // Recording button and status
                HStack(spacing: 16) {
                    Button(action: toggleRecording) {
                        ZStack {
                            Circle()
                                .fill(isRecording ? Color.red : theme.primaryColor)
                                .frame(width: 60, height: 60)
                                .scaleEffect(isRecording ? 1.1 : 1.0)
                                .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: isRecording)
                            
                            Image(systemName: isRecording ? "stop.fill" : "mic.fill")
                                .foregroundColor(.white)
                                .font(.system(size: 24))
                        }
                    }
                    .disabled(!transcriptionManager.isAuthorized)
                    
                    VStack(alignment: .leading) {
                        Text(isRecording ? "Recording..." : "Ready to record")
                            .font(.headline)
                            .foregroundColor(theme.textPrimary)
                        
                        Text(transcriptionManager.isAuthorized ? "Tap to start" : "Permission required")
                            .font(.subheadline)
                            .foregroundColor(theme.textSecondary)
                    }
                    
                    Spacer()
                    
                    // Settings button
                    Button(action: {}) {
                        Image(systemName: "gear")
                            .foregroundColor(theme.primaryColor)
                            .font(.system(size: 20))
                    }
                }
                .padding(.vertical, 8)
            }
            .padding()
            .background(theme.surfaceColor)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(theme.borderColor),
                alignment: .bottom
            )
            
            // Transcription text area
            ScrollView {
                ScrollViewReader { proxy in
                    LazyVStack(alignment: .leading, spacing: 8) {
                        if transcriptionText.isEmpty && !isRecording {
                            VStack(spacing: 16) {
                                Image(systemName: "waveform.badge.mic")
                                    .font(.system(size: 60))
                                    .foregroundColor(theme.textSecondary)
                                
                                Text("Start recording to see live transcription")
                                    .font(.body)
                                    .foregroundColor(theme.textSecondary)
                                    .multilineTextAlignment(.center)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Features:")
                                        .font(.headline)
                                        .foregroundColor(theme.textPrimary)
                                    
                                    Group {
                                        Text("• Real-time speech recognition")
                                        Text("• Multiple language support")
                                        Text("• Automatic punctuation")
                                        Text("• Speaker identification")
                                        Text("• Export to notes or Drive")
                                    }
                                    .font(.body)
                                    .foregroundColor(theme.textSecondary)
                                }
                            }
                            .padding()
                            .background(theme.backgroundColor)
                            .cornerRadius(12)
                        } else {
                            // Display transcription segments
                            ForEach(transcriptionManager.transcriptionSegments.indices, id: \.self) { index in
                                TranscriptionSegment(
                                    segment: transcriptionManager.transcriptionSegments[index],
                                    theme: theme
                                )
                                .id(index)
                            }
                            
                            // Current live transcription
                            if !transcriptionText.isEmpty {
                                LiveTranscriptionSegment(
                                    text: transcriptionText,
                                    theme: theme
                                )
                                .id("live")
                            }
                        }
                    }
                    .padding()
                    .onChange(of: transcriptionManager.transcriptionSegments.count) { _ in
                        withAnimation {
                            proxy.scrollTo("live", anchor: .bottom)
                        }
                    }
                }
            }
            .background(theme.backgroundColor)
            
            // Bottom toolbar
            HStack {
                Button("Clear") {
                    clearTranscription()
                }
                .foregroundColor(theme.primaryColor)
                
                Spacer()
                
                Button("Export") {
                    exportTranscription()
                }
                .foregroundColor(theme.primaryColor)
                .disabled(transcriptionText.isEmpty && transcriptionManager.transcriptionSegments.isEmpty)
                
                Button("Send to AI") {
                    sendToAI()
                }
                .foregroundColor(theme.primaryColor)
                .disabled(transcriptionText.isEmpty && transcriptionManager.transcriptionSegments.isEmpty)
            }
            .padding()
            .background(theme.surfaceColor)
        }
        .onAppear {
            transcriptionManager.requestPermissions()
        }
        .onReceive(transcriptionManager.$currentTranscription) { text in
            transcriptionText = text
        }
        .onReceive(transcriptionManager.$audioLevel) { level in
            audioLevel = level
        }
        .alert("Permission Required", isPresented: $showingPermissionAlert) {
            Button("Settings") {
                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(settingsURL)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("ScribeCat needs microphone and speech recognition permissions to provide transcription.")
        }
    }
    
    private func toggleRecording() {
        if isRecording {
            transcriptionManager.stopRecording()
        } else {
            transcriptionManager.startRecording()
        }
        isRecording.toggle()
    }
    
    private func clearTranscription() {
        transcriptionText = ""
        transcriptionManager.clearTranscription()
    }
    
    private func exportTranscription() {
        // Implementation for exporting transcription
        print("Exporting transcription...")
    }
    
    private func sendToAI() {
        // Implementation for sending to AI chat
        print("Sending to AI...")
    }
}

// Audio Level Indicator
struct AudioLevelIndicator: View {
    let level: Float
    let theme: AppTheme
    
    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<8) { index in
                RoundedRectangle(cornerRadius: 1)
                    .fill(level > Float(index) * 0.125 ? theme.primaryColor : theme.borderColor)
                    .frame(width: 3, height: CGFloat(8 + index * 2))
                    .animation(.easeInOut(duration: 0.1), value: level)
            }
        }
    }
}

// Transcription Segment View
struct TranscriptionSegment: View {
    let segment: TranscriptionSegmentData
    let theme: AppTheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(segment.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.caption)
                    .foregroundColor(theme.textSecondary)
                
                if segment.confidence < 0.5 {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
                
                Spacer()
                
                Text("\(Int(segment.confidence * 100))%")
                    .font(.caption)
                    .foregroundColor(theme.textSecondary)
            }
            
            Text(segment.text)
                .font(.body)
                .foregroundColor(theme.textPrimary)
                .textSelection(.enabled)
        }
        .padding()
        .background(theme.surfaceColor)
        .cornerRadius(8)
    }
}

// Live Transcription Segment (with typing indicator)
struct LiveTranscriptionSegment: View {
    let text: String
    let theme: AppTheme
    @State private var showingCursor = true
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Live")
                    .font(.caption)
                    .foregroundColor(theme.primaryColor)
                
                Circle()
                    .fill(Color.red)
                    .frame(width: 6, height: 6)
                    .opacity(showingCursor ? 1 : 0.3)
                    .animation(.easeInOut(duration: 0.5).repeatForever(), value: showingCursor)
                
                Spacer()
            }
            
            Text(text + (showingCursor ? "|" : ""))
                .font(.body)
                .foregroundColor(theme.textPrimary)
        }
        .padding()
        .background(theme.primaryColor.opacity(0.1))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(theme.primaryColor.opacity(0.3), lineWidth: 1)
        )
        .onAppear {
            showingCursor = true
        }
    }
}

// Transcription Manager
class TranscriptionManager: ObservableObject {
    @Published var currentTranscription = ""
    @Published var transcriptionSegments: [TranscriptionSegmentData] = []
    @Published var isAuthorized = false
    @Published var audioLevel: Float = 0.0
    
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    
    init() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        speechRecognizer?.delegate = self
    }
    
    func requestPermissions() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    self?.isAuthorized = true
                case .denied, .restricted, .notDetermined:
                    self?.isAuthorized = false
                @unknown default:
                    self?.isAuthorized = false
                }
            }
        }
    }
    
    func startRecording() {
        guard isAuthorized else { return }
        
        // Cancel previous task
        recognitionTask?.cancel()
        recognitionTask = nil
        
        // Create audio session
        let audioSession = AVAudioSession.sharedInstance()
        try? audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try? audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        
        recognitionRequest.shouldReportPartialResults = true
        
        // Create audio input node
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
            
            // Calculate audio level
            let channelData = buffer.floatChannelData?[0]
            let channelDataCount = Int(buffer.frameLength)
            
            if let channelData = channelData {
                var sum: Float = 0
                for i in 0..<channelDataCount {
                    sum += abs(channelData[i])
                }
                let average = sum / Float(channelDataCount)
                
                DispatchQueue.main.async {
                    self.audioLevel = min(average * 10, 1.0) // Scale and cap at 1.0
                }
            }
        }
        
        // Start audio engine
        audioEngine.prepare()
        try? audioEngine.start()
        
        // Start recognition task
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            DispatchQueue.main.async {
                if let result = result {
                    self?.currentTranscription = result.bestTranscription.formattedString
                    
                    if result.isFinal {
                        // Save finalized segment
                        let segment = TranscriptionSegmentData(
                            text: result.bestTranscription.formattedString,
                            timestamp: Date(),
                            confidence: result.bestTranscription.segments.last?.confidence ?? 0.0
                        )
                        self?.transcriptionSegments.append(segment)
                        self?.currentTranscription = ""
                    }
                }
                
                if error != nil {
                    self?.stopRecording()
                }
            }
        }
    }
    
    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        
        recognitionRequest = nil
        recognitionTask = nil
        
        audioLevel = 0.0
    }
    
    func clearTranscription() {
        transcriptionSegments.removeAll()
        currentTranscription = ""
    }
}

extension TranscriptionManager: SFSpeechRecognizerDelegate {
    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        DispatchQueue.main.async {
            self.isAuthorized = available
        }
    }
}

// Data model for transcription segments
struct TranscriptionSegmentData: Identifiable {
    let id = UUID()
    let text: String
    let timestamp: Date
    let confidence: Float
}

struct TranscriptionView_Previews: PreviewProvider {
    static var previews: some View {
        TranscriptionView(theme: .defaultTheme)
            .previewDevice("iPad Pro (12.9-inch) (6th generation)")
    }
}