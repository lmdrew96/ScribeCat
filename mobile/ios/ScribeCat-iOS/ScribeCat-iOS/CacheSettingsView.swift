//
//  CacheSettingsView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI

struct CacheSettingsView: View {
    @ObservedObject var cacheManager: CacheManager
    @State private var showingClearConfirmation = false
    
    var body: some View {
        List {
            // Cache Usage Section
            Section("Cache Usage") {
                let config = cacheManager.getCacheConfiguration()
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Current Usage")
                        Spacer()
                        Text(config.formattedCurrentSize)
                            .fontWeight(.semibold)
                    }
                    
                    ProgressView(value: config.usagePercentage / 100.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: config.usagePercentage > 90 ? .red : .blue))
                    
                    HStack {
                        Text("0 MB")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(config.formattedMaxSize)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
                
                HStack {
                    Text("Sessions Cached")
                    Spacer()
                    Text("\(config.sessionCount)")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Usage Percentage")
                    Spacer()
                    Text("\(Int(config.usagePercentage))%")
                        .foregroundColor(config.usagePercentage > 90 ? .red : .secondary)
                }
            }
            
            // Cache Configuration Section
            Section("Cache Configuration") {
                let config = cacheManager.getCacheConfiguration()
                
                HStack {
                    Text("Total Limit")
                    Spacer()
                    Text(config.formattedMaxSize)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Per Session Limit")
                    Spacer()
                    Text(config.formattedMaxSessionSize)
                        .foregroundColor(.secondary)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Cache Policy")
                    Text("Least Recently Used (LRU) eviction when cache is full")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Cache Behavior Section
            Section("Cache Behavior") {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "arrow.down.circle")
                        Text("Automatic Downloads")
                    }
                    Text("Sessions are cached when opened from Google Drive")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "trash.circle")
                        Text("Automatic Cleanup")
                    }
                    Text("Least recently used sessions are removed when cache is full")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "clock.circle")
                        Text("Background Cleanup")
                    }
                    Text("Cache is cleaned up when app starts or becomes active")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Cache Management Section
            Section("Cache Management") {
                if cacheManager.isCleaningUp {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Cleaning up cache...")
                            .foregroundColor(.secondary)
                    }
                } else {
                    Button("Clean Up Now") {
                        cacheManager.performManualCleanup()
                    }
                    .foregroundColor(.blue)
                }
                
                Button("Clear All Cache") {
                    showingClearConfirmation = true
                }
                .foregroundColor(.red)
            }
            
            // Cache Status Section
            Section("Cache Status") {
                let config = cacheManager.getCacheConfiguration()
                
                if config.usagePercentage > 90 {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        VStack(alignment: .leading) {
                            Text("Cache Nearly Full")
                                .fontWeight(.semibold)
                                .foregroundColor(.red)
                            Text("Consider clearing some sessions or perform cleanup")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } else if config.usagePercentage > 75 {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading) {
                            Text("Cache Getting Full")
                                .fontWeight(.semibold)
                                .foregroundColor(.orange)
                            Text("Automatic cleanup will begin soon")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } else {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        VStack(alignment: .leading) {
                            Text("Cache Healthy")
                                .fontWeight(.semibold)
                                .foregroundColor(.green)
                            Text("Plenty of space available")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Cache Settings")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            cacheManager.updateCacheStats()
        }
        .alert("Clear All Cache?", isPresented: $showingClearConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Clear Cache", role: .destructive) {
                cacheManager.clearAllCache()
            }
        } message: {
            Text("This will remove all cached sessions. You can re-download them from Google Drive when needed.")
        }
    }
}

struct CacheSettingsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            CacheSettingsView(cacheManager: CacheManager(context: PersistenceController.preview.container.viewContext))
        }
    }
}