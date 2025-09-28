//
//  RecordView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI
import AVFoundation

struct RecordView: View {
    @StateObject private var audioManager = AudioRecordingManager()
    @Environment(\.managedObjectContext) private var viewContext
    
    @State private var recordingTitle = ""
    @State private var showingTitleAlert = false
    @State private var currentTranscription = ""
    @State private var isShowingSettings = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // Header
                VStack(spacing: 8) {
                    Text("Audio Recording")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text(audioManager.isRecording ? "Recording in progress..." : "Ready to record")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Waveform visualization placeholder
                VStack {
                    if audioManager.isRecording {
                        WaveformView(isRecording: audioManager.isRecording, audioLevel: audioManager.audioLevel)
                            .frame(height: 100)
                    } else {
                        Image(systemName: "waveform")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                    }
                }
                .frame(height: 120)
                
                // Recording timer
                Text(formatDuration(audioManager.recordingDuration))
                    .font(.system(size: 48, family: .monospaced))
                    .fontWeight(.light)
                    .foregroundColor(audioManager.isRecording ? .red : .primary)
                
                Spacer()
                
                // Real-time transcription (mock for now)
                if audioManager.isRecording && !currentTranscription.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Live Transcription")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        ScrollView {
                            Text(currentTranscription)
                                .font(.body)
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                        }
                        .frame(maxHeight: 120)
                        .padding(.horizontal)
                    }
                }
                
                Spacer()
                
                // Recording controls
                HStack(spacing: 40) {
                    if audioManager.isRecording {
                        // Stop button
                        Button(action: stopRecording) {
                            Image(systemName: "stop.circle.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.red)
                        }
                    } else {
                        // Record button
                        Button(action: startRecording) {
                            Image(systemName: "record.circle")
                                .font(.system(size: 80))
                                .foregroundColor(.red)
                        }
                    }
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("")
            .navigationBarHidden(true)
            .alert("Recording Title", isPresented: $showingTitleAlert) {
                TextField("Enter title", text: $recordingTitle)
                Button("Save") { saveRecording() }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Give your recording a title")
            }
            .onReceive(audioManager.$isRecording) { isRecording in
                if isRecording {
                    startMockTranscription()
                } else {
                    stopMockTranscription()
                }
            }
        }
    }
    
    private func startRecording() {
        audioManager.startRecording()
    }
    
    private func stopRecording() {
        audioManager.stopRecording()
        showingTitleAlert = true
    }
    
    private func saveRecording() {
        let session = Session(context: viewContext)
        session.id = UUID()
        session.title = recordingTitle.isEmpty ? "Recording \(Date())" : recordingTitle
        session.timestamp = Date()
        session.duration = audioManager.recordingDuration
        session.hasAudio = true
        session.hasNotes = false
        session.transcription = currentTranscription
        
        do {
            try viewContext.save()
            recordingTitle = ""
            currentTranscription = ""
        } catch {
            print("Error saving recording: \(error)")
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    // Mock transcription for demo purposes
    private func startMockTranscription() {
        let mockTexts = [
            "This is a demonstration of real-time transcription.",
            "ScribeCat is processing your audio in the background.",
            "The mobile app provides efficient audio recording.",
            "Transcription happens with minimal battery impact.",
            "Your notes and audio are stored locally."
        ]
        
        var textIndex = 0
        Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { timer in
            if !audioManager.isRecording {
                timer.invalidate()
                return
            }
            
            if textIndex < mockTexts.count {
                currentTranscription += (currentTranscription.isEmpty ? "" : " ") + mockTexts[textIndex]
                textIndex += 1
            } else {
                timer.invalidate()
            }
        }
    }
    
    private func stopMockTranscription() {
        // Mock transcription will stop automatically when recording stops
    }
}

struct WaveformView: View {
    let isRecording: Bool
    let audioLevel: Float
    
    var body: some View {
        HStack(alignment: .center, spacing: 2) {
            ForEach(0..<20, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.blue)
                    .frame(width: 3, height: isRecording ? CGFloat.random(in: 10...60) : 20)
                    .animation(.easeInOut(duration: 0.5).repeatForever(), value: isRecording)
            }
        }
    }
}

struct RecordView_Previews: PreviewProvider {
    static var previews: some View {
        RecordView()
            .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
    }
}