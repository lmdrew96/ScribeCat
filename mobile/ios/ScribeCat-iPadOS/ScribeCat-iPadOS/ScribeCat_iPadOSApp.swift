//
//  ScribeCat_iPadOSApp.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  iPadOS app with full desktop functionality
//

import SwiftUI
import CoreData

@main
struct ScribeCat_iPadOSApp: App {
    let persistenceController = PersistenceController.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}