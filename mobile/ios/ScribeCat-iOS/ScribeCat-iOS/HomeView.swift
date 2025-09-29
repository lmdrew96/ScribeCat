//
//  HomeView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI
import CoreData

struct HomeView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \Session.timestamp, ascending: false)],
        animation: .default)
    private var sessions: FetchedResults<Session>
    
    @StateObject private var driveManager = GoogleDriveManager()
    @StateObject private var cacheManager = CacheManager(context: PersistenceController.shared.container.viewContext)
    
    var body: some View {
        NavigationView {
            VStack {
                // App overview section with sync status
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Welcome to ScribeCat")
                                .font(.title)
                                .fontWeight(.bold)
                            
                            Text("M4: Drive sync, caching, and AskAI")
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        // Sync status indicator
                        VStack(alignment: .trailing, spacing: 4) {
                            if driveManager.isSignedIn {
                                HStack {
                                    Circle()
                                        .fill(driveManager.syncStatus == .online ? Color.green : Color.orange)
                                        .frame(width: 8, height: 8)
                                    Text(driveManager.syncStatus.displayText)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                if let lastSync = driveManager.lastSyncDate {
                                    Text("Last sync: \(lastSync, style: .relative)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            } else {
                                HStack {
                                    Circle()
                                        .fill(Color.gray)
                                        .frame(width: 8, height: 8)
                                    Text("Not signed in")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    
                    // Quick stats with cache info
                    HStack(spacing: 20) {
                        StatCard(title: "Sessions", count: sessions.count, icon: "waveform")
                        StatCard(title: "Notes", count: sessions.filter { !($0.notes?.isEmpty ?? true) }.count, icon: "note.text")
                        StatCard(title: "Cache", count: Int(cacheManager.totalCacheSize / (1024 * 1024)), icon: "internaldrive", suffix: "MB")
                    }
                    .padding(.top)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)
                
                // Quick actions for M4
                HStack(spacing: 12) {
                    if driveManager.isSignedIn {
                        Button(action: {
                            driveManager.performManualSync()
                        }) {
                            HStack {
                                Image(systemName: driveManager.isManualSyncInProgress ? "arrow.triangle.2.circlepath" : "icloud.and.arrow.down")
                                Text(driveManager.isManualSyncInProgress ? "Syncing..." : "Sync Now")
                            }
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .disabled(driveManager.isManualSyncInProgress)
                    } else {
                        NavigationLink(destination: SettingsView()) {
                            HStack {
                                Image(systemName: "icloud.slash")
                                Text("Sign in to Drive")
                            }
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        cacheManager.performManualCleanup()
                    }) {
                        HStack {
                            Image(systemName: cacheManager.isCleaningUp ? "arrow.triangle.2.circlepath" : "trash")
                            Text(cacheManager.isCleaningUp ? "Cleaning..." : "Clean Cache")
                        }
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                    .disabled(cacheManager.isCleaningUp)
                }
                .padding(.horizontal)
                
                Spacer()
                
                // Recent sessions list
                VStack(alignment: .leading) {
                    HStack {
                        Text("Recent Sessions")
                            .font(.headline)
                        Spacer()
                        if !sessions.isEmpty {
                            NavigationLink("See All", destination: NotesView())
                                .font(.caption)
                        }
                    }
                    .padding(.horizontal)
                    
                    if sessions.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "icloud")
                                .font(.system(size: 40))
                                .foregroundColor(.secondary)
                            Text("No sessions yet")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            if driveManager.isSignedIn {
                                Text("Sessions from Google Drive will appear here")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            } else {
                                Text("Sign in to Google Drive to sync your sessions")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                        .padding(.vertical, 40)
                    } else {
                        List(sessions.prefix(5), id: \.self) { session in
                            SessionRowView(session: session)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    cacheManager.recordSessionAccess(session.id ?? UUID())
                                }
                        }
                        .listStyle(PlainListStyle())
                        .frame(maxHeight: 300)
                    }
                }
                
                Spacer()
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .onAppear {
                cacheManager.updateCacheStats()
                if driveManager.isSignedIn {
                    driveManager.performBackgroundSync()
                }
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let count: Int
    let icon: String
    let suffix: String
    
    init(title: String, count: Int, icon: String, suffix: String = "") {
        self.title = title
        self.count = count
        self.icon = icon
        self.suffix = suffix
    }
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
            Text("\(count)\(suffix)")
                .font(.title2)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

struct SessionRowView: View {
    let session: Session
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.title ?? "Untitled Session")
                    .font(.headline)
                    .lineLimit(1)
                
                if let timestamp = session.timestamp {
                    Text(DateFormatter.shortDateTime.string(from: timestamp))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if session.duration > 0 {
                    Text("Duration: \(Int(session.duration / 60))m")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // M4 indicators
            if session.hasNotes {
                Image(systemName: "note.text")
                    .foregroundColor(.blue)
                    .font(.caption)
            }
            
            if !session.transcription?.isEmpty ?? true {
                Image(systemName: "text.quote")
                    .foregroundColor(.green)
                    .font(.caption)
            }
            
            // AskAI button for sessions with content
            if !(session.transcription?.isEmpty ?? true) || !(session.notes?.isEmpty ?? true) {
                NavigationLink(destination: AskAISessionView(session: session)) {
                    Image(systemName: "brain.head.profile")
                        .foregroundColor(.purple)
                        .font(.caption)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(.vertical, 4)
    }
}

extension DateFormatter {
    static let shortDateTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter
    }()
}

struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
            .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
    }
}