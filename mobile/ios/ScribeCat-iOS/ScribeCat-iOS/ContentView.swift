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
            
            NotesView()
                .tabItem {
                    Image(systemName: "note.text")
                    Text("Sessions/Notes")
                }
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gear")
                    Text("Settings")
                }
            
            HelpAboutView()
                .tabItem {
                    Image(systemName: "questionmark.circle")
                    Text("Help/About")
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