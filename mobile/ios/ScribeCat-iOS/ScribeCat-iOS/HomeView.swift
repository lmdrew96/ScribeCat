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
    
    var body: some View {
        NavigationView {
            VStack {
                // App overview section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Welcome to ScribeCat")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("Your mobile companion for transcription and note-taking")
                        .font(.body)
                        .foregroundColor(.secondary)
                    
                    // Quick stats
                    HStack(spacing: 20) {
                        StatCard(title: "Sessions", count: sessions.count, icon: "waveform")
                        StatCard(title: "Notes", count: sessions.filter { !($0.notes?.isEmpty ?? true) }.count, icon: "note.text")
                    }
                    .padding(.top)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
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
                            Image(systemName: "mic.slash")
                                .font(.system(size: 40))
                                .foregroundColor(.secondary)
                            Text("No sessions yet")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Text("Tap the Record tab to start your first session")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, 40)
                    } else {
                        List(sessions.prefix(5), id: \.self) { session in
                            SessionRowView(session: session)
                        }
                        .listStyle(PlainListStyle())
                        .frame(maxHeight: 300)
                    }
                }
                
                Spacer()
            }
            .navigationTitle("")
            .navigationBarHidden(true)
        }
    }
}

struct StatCard: View {
    let title: String
    let count: Int
    let icon: String
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
            Text("\(count)")
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
                
                if let duration = session.duration, duration > 0 {
                    Text("Duration: \(Int(duration))s")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            if session.hasNotes {
                Image(systemName: "note.text")
                    .foregroundColor(.blue)
                    .font(.caption)
            }
            
            if session.hasAudio {
                Image(systemName: "waveform")
                    .foregroundColor(.green)
                    .font(.caption)
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