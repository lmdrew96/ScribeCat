//
//  ContentView.swift
//  ScribeCat-iOS
//
//  Created by ScribeCat Team on 2024.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Image(systemName: "house")
                    Text("Home")
                }
            
            RecordView()
                .tabItem {
                    Image(systemName: "record.circle")
                    Text("Record")
                }
            
            NotesView()
                .tabItem {
                    Image(systemName: "note.text")
                    Text("Notes")
                }
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gear")
                    Text("Settings")
                }
        }
        .accentColor(.blue)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}