//
//  NotesView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI
import CoreData

struct NotesView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \Session.timestamp, ascending: false)],
        animation: .default)
    private var sessions: FetchedResults<Session>
    
    @State private var searchText = ""
    @State private var selectedSession: Session?
    @State private var showingSessionDetail = false
    
    var filteredSessions: [Session] {
        if searchText.isEmpty {
            return Array(sessions)
        } else {
            return sessions.filter { session in
                session.title?.localizedCaseInsensitiveContains(searchText) == true ||
                session.transcription?.localizedCaseInsensitiveContains(searchText) == true ||
                session.notes?.localizedCaseInsensitiveContains(searchText) == true
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Search bar
                SearchBar(text: $searchText)
                    .padding(.horizontal)
                
                if filteredSessions.isEmpty {
                    // Empty state
                    VStack(spacing: 16) {
                        Image(systemName: searchText.isEmpty ? "note.text" : "magnifyingglass")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        
                        Text(searchText.isEmpty ? "No notes yet" : "No results found")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Text(searchText.isEmpty ? 
                             "Your recorded sessions and notes will appear here" :
                             "Try searching with different keywords")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    // Sessions list
                    List(filteredSessions, id: \.self) { session in
                        SessionDetailRow(session: session)
                            .onTapGesture {
                                selectedSession = session
                                showingSessionDetail = true
                            }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Notes & Sessions")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingSessionDetail) {
                if let session = selectedSession {
                    SessionDetailView(session: session)
                }
            }
        }
    }
    
    private func deleteSession(at offsets: IndexSet) {
        withAnimation {
            offsets.map { filteredSessions[$0] }.forEach(viewContext.delete)
            
            do {
                try viewContext.save()
            } catch {
                print("Error deleting session: \(error)")
            }
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField("Search notes and transcriptions", text: $text)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
    }
}

struct SessionDetailRow: View {
    let session: Session
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.title ?? "Untitled Session")
                        .font(.headline)
                        .lineLimit(2)
                    
                    if let timestamp = session.timestamp {
                        Text(DateFormatter.shortDateTime.string(from: timestamp))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    if session.hasAudio {
                        Label("Audio", systemImage: "waveform")
                            .font(.caption2)
                            .foregroundColor(.green)
                    }
                    
                    if session.hasNotes {
                        Label("Notes", systemImage: "note.text")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                }
            }
            
            // Preview of transcription or notes
            if let transcription = session.transcription, !transcription.isEmpty {
                Text(transcription)
                    .font(.body)
                    .lineLimit(3)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            } else if let notes = session.notes, !notes.isEmpty {
                Text(notes)
                    .font(.body)
                    .lineLimit(3)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            }
        }
        .padding(.vertical, 8)
    }
}

struct SessionDetailView: View {
    let session: Session
    @Environment(\.presentationMode) var presentationMode
    @Environment(\.managedObjectContext) private var viewContext
    @State private var editingNotes = false
    @State private var notesText: String
    
    init(session: Session) {
        self.session = session
        self._notesText = State(initialValue: session.notes ?? "")
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Session info
                    VStack(alignment: .leading, spacing: 8) {
                        Text(session.title ?? "Untitled Session")
                            .font(.title)
                            .fontWeight(.bold)
                        
                        if let timestamp = session.timestamp {
                            Text("Recorded: \(DateFormatter.longDateTime.string(from: timestamp))")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        if let duration = session.duration, duration > 0 {
                            Text("Duration: \(formatDuration(duration))")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.horizontal)
                    
                    Divider()
                    
                    // Transcription section
                    if let transcription = session.transcription, !transcription.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Transcription")
                                .font(.headline)
                                .padding(.horizontal)
                            
                            Text(transcription)
                                .font(.body)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                                .padding(.horizontal)
                        }
                    }
                    
                    // Notes section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Notes")
                                .font(.headline)
                            
                            Spacer()
                            
                            Button(editingNotes ? "Done" : "Edit") {
                                if editingNotes {
                                    saveNotes()
                                }
                                editingNotes.toggle()
                            }
                            .font(.subheadline)
                        }
                        .padding(.horizontal)
                        
                        if editingNotes {
                            TextEditor(text: $notesText)
                                .frame(minHeight: 200)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                                .padding(.horizontal)
                        } else {
                            Text(notesText.isEmpty ? "No notes yet. Tap Edit to add notes." : notesText)
                                .font(.body)
                                .foregroundColor(notesText.isEmpty ? .secondary : .primary)
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                                .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .navigationBarItems(
                leading: Button("Close") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
    
    private func saveNotes() {
        session.notes = notesText
        do {
            try viewContext.save()
        } catch {
            print("Error saving notes: \(error)")
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

extension DateFormatter {
    static let longDateTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter
    }()
}

struct NotesView_Previews: PreviewProvider {
    static var previews: some View {
        NotesView()
            .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
    }
}