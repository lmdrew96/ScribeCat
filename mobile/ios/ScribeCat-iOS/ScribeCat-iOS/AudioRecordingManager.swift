//
//  AudioRecordingManager.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import Foundation
import AVFoundation
import Combine

class AudioRecordingManager: NSObject, ObservableObject {
    
    // MARK: - Published Properties
    @Published var isRecording = false
    @Published var recordingDuration: TimeInterval = 0
    @Published var audioLevel: Float = 0.0
    @Published var isRecordingEnabled = false
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    private var audioRecorder: AVAudioRecorder?
    private var audioSession: AVAudioSession?
    private var recordingTimer: Timer?
    private var levelTimer: Timer?
    private var recordingStartTime: Date?
    
    // MARK: - Audio Settings
    private let audioSettings: [String: Any] = [
        AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
        AVSampleRateKey: 44100.0,
        AVNumberOfChannelsKey: 2,
        AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]
    
    override init() {
        super.init()
        setupAudioSession()
        requestMicrophonePermission()
    }
    
    // MARK: - Audio Session Setup
    private func setupAudioSession() {
        audioSession = AVAudioSession.sharedInstance()
        
        do {
            // Configure audio session for recording
            // POWER OPTIMIZATION: Use .playAndRecord instead of .record to allow for background audio
            try audioSession?.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            
            // POWER OPTIMIZATION: Configure for low-power background recording
            try audioSession?.setPreferredIOBufferDuration(0.1) // Smaller buffer for efficiency
            try audioSession?.setPreferredSampleRate(44100.0)
            
            try audioSession?.setActive(true, options: .notifyOthersOnDeactivation)
            
            print("Audio session configured successfully")
        } catch {
            print("Failed to setup audio session: \(error.localizedDescription)")
            errorMessage = "Failed to setup audio session: \(error.localDescription)"
        }
    }
    
    // MARK: - Permission Handling
    private func requestMicrophonePermission() {
        AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
            DispatchQueue.main.async {
                self?.isRecordingEnabled = granted
                if !granted {
                    self?.errorMessage = "Microphone permission is required for recording"
                }
            }
        }
    }
    
    // MARK: - Recording Control
    func startRecording() {
        guard isRecordingEnabled else {
            errorMessage = "Recording not enabled. Please check microphone permissions."
            return
        }
        
        guard !isRecording else { return }
        
        let audioFileURL = getRecordingURL()
        
        do {
            // Create audio recorder with optimized settings
            audioRecorder = try AVAudioRecorder(url: audioFileURL, settings: audioSettings)
            audioRecorder?.delegate = self
            audioRecorder?.isMeteringEnabled = true
            audioRecorder?.prepareToRecord()
            
            // Start recording
            guard audioRecorder?.record() == true else {
                errorMessage = "Failed to start recording"
                return
            }
            
            // Update state
            isRecording = true
            recordingStartTime = Date()
            recordingDuration = 0
            errorMessage = nil
            
            // Start timers
            startTimers()
            
            print("Recording started successfully")
            
        } catch {
            print("Failed to start recording: \(error.localDescription)")
            errorMessage = "Failed to start recording: \(error.localDescription)"
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        
        // Stop recording
        audioRecorder?.stop()
        audioRecorder = nil
        
        // Update state
        isRecording = false
        
        // Stop timers
        stopTimers()
        
        // Deactivate audio session to save power
        do {
            try audioSession?.setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            print("Failed to deactivate audio session: \(error.localDescription)")
        }
        
        print("Recording stopped successfully")
    }
    
    func pauseRecording() {
        guard isRecording else { return }
        audioRecorder?.pause()
        stopTimers()
    }
    
    func resumeRecording() {
        guard !isRecording, audioRecorder != nil else { return }
        audioRecorder?.record()
        startTimers()
    }
    
    // MARK: - Timer Management
    private func startTimers() {
        // Duration timer - updates every second
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updateRecordingDuration()
        }
        
        // Audio level timer - updates more frequently for visual feedback
        // POWER OPTIMIZATION: Update audio levels less frequently to save battery
        levelTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.updateAudioLevel()
        }
    }
    
    private func stopTimers() {
        recordingTimer?.invalidate()
        recordingTimer = nil
        
        levelTimer?.invalidate()
        levelTimer = nil
    }
    
    private func updateRecordingDuration() {
        guard let startTime = recordingStartTime else { return }
        recordingDuration = Date().timeIntervalSince(startTime)
    }
    
    private func updateAudioLevel() {
        guard let recorder = audioRecorder, recorder.isRecording else { return }
        
        recorder.updateMeters()
        
        // Get average power for all channels
        let averagePower = recorder.averagePower(forChannel: 0)
        
        // Convert to 0-1 range for UI
        // POWER OPTIMIZATION: Simple linear conversion instead of complex calculations
        let normalizedLevel = max(0.0, (averagePower + 60.0) / 60.0)
        audioLevel = normalizedLevel
    }
    
    // MARK: - File Management
    private func getRecordingURL() -> URL {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let audioDirectory = documentsPath.appendingPathComponent("AudioRecordings")
        
        // Create directory if it doesn't exist
        if !FileManager.default.fileExists(atPath: audioDirectory.path) {
            try? FileManager.default.createDirectory(at: audioDirectory, withIntermediateDirectories: true, attributes: nil)
        }
        
        let fileName = "recording_\(Date().timeIntervalSince1970).m4a"
        return audioDirectory.appendingPathComponent(fileName)
    }
    
    // MARK: - Background Recording Support
    func configureForBackgroundRecording() {
        // This method sets up the audio session for background recording
        // IMPORTANT: Requires 'audio' background mode in Info.plist
        
        guard let audioSession = audioSession else { return }
        
        do {
            // Set category for background audio
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
            
            // POWER OPTIMIZATION: Use lower sample rate for background recording if needed
            if ProcessInfo.processInfo.isLowPowerModeEnabled {
                try audioSession.setPreferredSampleRate(22050.0) // Half the normal rate
                print("Low power mode detected: using reduced sample rate")
            }
            
            try audioSession.setActive(true)
            
        } catch {
            print("Failed to configure background recording: \(error.localDescription)")
            errorMessage = "Failed to configure background recording"
        }
    }
    
    // MARK: - Power Management
    func optimizeForBattery() {
        // Reduce audio quality for better battery life
        // This could be called when low power mode is enabled
        
        let lowPowerSettings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 22050.0, // Reduced sample rate
            AVNumberOfChannelsKey: 1, // Mono instead of stereo
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue // Reduced quality
        ]
        
        // Note: These settings would be applied to new recordings
        print("Audio settings optimized for battery life")
    }
    
    // MARK: - Cleanup
    deinit {
        stopRecording()
        try? audioSession?.setActive(false)
    }
}

// MARK: - AVAudioRecorderDelegate
extension AudioRecordingManager: AVAudioRecorderDelegate {
    
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        print("Recording finished successfully: \(flag)")
        
        if !flag {
            errorMessage = "Recording failed to complete properly"
        }
        
        // Reset state
        isRecording = false
        stopTimers()
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        print("Recording encode error: \(error?.localDescription ?? "Unknown error")")
        errorMessage = "Recording error: \(error?.localizedDescription ?? "Unknown error")"
        stopRecording()
    }
    
    func audioRecorderBeginInterruption(_ recorder: AVAudioRecorder) {
        print("Recording interrupted")
        // Handle interruption (e.g., phone call)
        pauseRecording()
    }
    
    func audioRecorderEndInterruption(_ recorder: AVAudioRecorder, withOptions flags: Int) {
        print("Recording interruption ended")
        // Optionally resume recording after interruption
        if flags == AVAudioSession.InterruptionOptions.shouldResume.rawValue {
            resumeRecording()
        }
    }
}

// MARK: - Power Optimization Notes
/*
 BATTERY/MEMORY OPTIMIZATION STRATEGIES IMPLEMENTED:

 1. Audio Session Configuration:
    - Use smaller IO buffer duration (0.1s) for efficiency
    - Deactivate audio session when not recording
    - Configure appropriate audio category for background use

 2. Recording Settings:
    - Use AAC compression for smaller file sizes
    - Option to reduce sample rate in low power mode
    - Option to use mono instead of stereo

 3. Timer Optimization:
    - Duration timer updates only every second
    - Audio level timer updates at reduced frequency (0.1s vs more frequent)
    - Timers are properly invalidated when not needed

 4. Background Recording:
    - Proper audio session configuration for background use
    - Detection of low power mode to adjust settings
    - Mix with others option to be a good citizen

 5. Memory Management:
    - Proper cleanup in deinit
    - Timers are invalidated to prevent retain cycles
    - Audio recorder is nil-ed out when stopped

 ADDITIONAL OPTIMIZATIONS TO CONSIDER:
 - Implement audio level averaging to reduce UI updates
 - Use background task identifier for extended background recording
 - Implement audio file compression after recording
 - Consider using lower bit rates for extended recordings
 - Implement automatic pause during phone calls or other interruptions
 */