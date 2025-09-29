//
//  ThemeSystem.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  Complete theme system matching desktop app's 15 themes
//

import SwiftUI

struct AppTheme {
    let name: String
    let primaryColor: Color
    let secondaryColor: Color
    let accentColor: Color
    let backgroundColor: Color
    let surfaceColor: Color
    let borderColor: Color
    let textPrimary: Color
    let textSecondary: Color
    let colorScheme: ColorScheme
    
    // Default theme
    static let defaultTheme = AppTheme(
        name: "Default",
        primaryColor: Color(hex: "#6366f1"),
        secondaryColor: Color(hex: "#10b981"),
        accentColor: Color(hex: "#f59e0b"),
        backgroundColor: Color(hex: "#ffffff"),
        surfaceColor: Color(hex: "#f8fafc"),
        borderColor: Color(hex: "#e2e8f0"),
        textPrimary: Color(hex: "#1e293b"),
        textSecondary: Color(hex: "#64748b"),
        colorScheme: .light
    )
    
    // All 15 themes from desktop app - Updated with new emotional designs
    static let allThemes: [AppTheme] = [
        defaultTheme,
        
        // FOCUS THEMES
        // 1. Arctic Focus
        AppTheme(
            name: "Arctic Focus",
            primaryColor: Color(hex: "#0f172a"),
            secondaryColor: Color(hex: "#3b82f6"),
            accentColor: Color(hex: "#64748b"),
            backgroundColor: Color(hex: "#f8fafc"),
            surfaceColor: Color(hex: "#f1f5f9"),
            borderColor: Color(hex: "#cbd5e1"),
            textPrimary: Color(hex: "#0f172a"),
            textSecondary: Color(hex: "#475569"),
            colorScheme: .light
        ),
        
        // 2. Forest Study
        AppTheme(
            name: "Forest Study",
            primaryColor: Color(hex: "#14532d"),
            secondaryColor: Color(hex: "#22c55e"),
            accentColor: Color(hex: "#84cc16"),
            backgroundColor: Color(hex: "#f7fef7"),
            surfaceColor: Color(hex: "#f0fdf4"),
            borderColor: Color(hex: "#bbf7d0"),
            textPrimary: Color(hex: "#14532d"),
            textSecondary: Color(hex: "#15803d"),
            colorScheme: .light
        ),
        
        // 3. Midnight Scholar
        AppTheme(
            name: "Midnight Scholar",
            primaryColor: Color(hex: "#1e1b4b"),
            secondaryColor: Color(hex: "#6366f1"),
            accentColor: Color(hex: "#8b5cf6"),
            backgroundColor: Color(hex: "#020617"),
            surfaceColor: Color(hex: "#0f172a"),
            borderColor: Color(hex: "#334155"),
            textPrimary: Color(hex: "#f8fafc"),
            textSecondary: Color(hex: "#cbd5e1"),
            colorScheme: .dark
        ),
        
        // CREATIVE THEMES
        // 4. Sunset Canvas
        AppTheme(
            name: "Sunset Canvas",
            primaryColor: Color(hex: "#ea580c"),
            secondaryColor: Color(hex: "#ec4899"),
            accentColor: Color(hex: "#8b5cf6"),
            backgroundColor: Color(hex: "#fffbf0"),
            surfaceColor: Color(hex: "#fed7aa"),
            borderColor: Color(hex: "#fb923c"),
            textPrimary: Color(hex: "#9a3412"),
            textSecondary: Color(hex: "#c2410c"),
            colorScheme: .light
        ),
        
        // 5. Aurora Dream
        AppTheme(
            name: "Aurora Dream",
            primaryColor: Color(hex: "#14b8a6"),
            secondaryColor: Color(hex: "#a855f7"),
            accentColor: Color(hex: "#ec4899"),
            backgroundColor: Color(hex: "#f0fdfa"),
            surfaceColor: Color(hex: "#ccfbf1"),
            borderColor: Color(hex: "#5eead4"),
            textPrimary: Color(hex: "#0f766e"),
            textSecondary: Color(hex: "#0f766e"),
            colorScheme: .light
        ),
        
        // 6. Coral Reef
        AppTheme(
            name: "Coral Reef",
            primaryColor: Color(hex: "#f97316"),
            secondaryColor: Color(hex: "#06b6d4"),
            accentColor: Color(hex: "#eab308"),
            backgroundColor: Color(hex: "#fff7ed"),
            surfaceColor: Color(hex: "#fed7aa"),
            borderColor: Color(hex: "#fb923c"),
            textPrimary: Color(hex: "#9a3412"),
            textSecondary: Color(hex: "#c2410c"),
            colorScheme: .light
        ),
        
        // FRIENDLY THEMES
        // 7. Warm Welcome
        AppTheme(
            name: "Warm Welcome",
            primaryColor: Color(hex: "#f59e0b"),
            secondaryColor: Color(hex: "#eab308"),
            accentColor: Color(hex: "#fed7aa"),
            backgroundColor: Color(hex: "#fffbeb"),
            surfaceColor: Color(hex: "#fef3c7"),
            borderColor: Color(hex: "#fcd34d"),
            textPrimary: Color(hex: "#92400e"),
            textSecondary: Color(hex: "#b45309"),
            colorScheme: .light
        ),
        
        // 8. Cozy Corner
        AppTheme(
            name: "Cozy Corner",
            primaryColor: Color(hex: "#92400e"),
            secondaryColor: Color(hex: "#f59e0b"),
            accentColor: Color(hex: "#fed7aa"),
            backgroundColor: Color(hex: "#fefdf8"),
            surfaceColor: Color(hex: "#fef3c7"),
            borderColor: Color(hex: "#fcd34d"),
            textPrimary: Color(hex: "#78350f"),
            textSecondary: Color(hex: "#92400e"),
            colorScheme: .light
        ),
        
        // 9. Friendly Chat
        AppTheme(
            name: "Friendly Chat",
            primaryColor: Color(hex: "#0ea5e9"),
            secondaryColor: Color(hex: "#22c55e"),
            accentColor: Color(hex: "#eab308"),
            backgroundColor: Color(hex: "#f0f9ff"),
            surfaceColor: Color(hex: "#e0f2fe"),
            borderColor: Color(hex: "#7dd3fc"),
            textPrimary: Color(hex: "#0c4a6e"),
            textSecondary: Color(hex: "#0369a1"),
            colorScheme: .light
        ),
        
        // CONFIDENCE THEMES
        // 10. Bold Leader
        AppTheme(
            name: "Bold Leader",
            primaryColor: Color(hex: "#dc2626"),
            secondaryColor: Color(hex: "#1f2937"),
            accentColor: Color(hex: "#f59e0b"),
            backgroundColor: Color(hex: "#fef2f2"),
            surfaceColor: Color(hex: "#fecaca"),
            borderColor: Color(hex: "#f87171"),
            textPrimary: Color(hex: "#7f1d1d"),
            textSecondary: Color(hex: "#991b1b"),
            colorScheme: .light
        ),
        
        // 11. Power Hour
        AppTheme(
            name: "Power Hour",
            primaryColor: Color(hex: "#1e40af"),
            secondaryColor: Color(hex: "#64748b"),
            accentColor: Color(hex: "#f8fafc"),
            backgroundColor: Color(hex: "#f8fafc"),
            surfaceColor: Color(hex: "#f1f5f9"),
            borderColor: Color(hex: "#cbd5e1"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#475569"),
            colorScheme: .light
        ),
        
        // 12. Champion
        AppTheme(
            name: "Champion",
            primaryColor: Color(hex: "#059669"),
            secondaryColor: Color(hex: "#f59e0b"),
            accentColor: Color(hex: "#1f2937"),
            backgroundColor: Color(hex: "#f0fdf4"),
            surfaceColor: Color(hex: "#dcfce7"),
            borderColor: Color(hex: "#86efac"),
            textPrimary: Color(hex: "#14532d"),
            textSecondary: Color(hex: "#166534"),
            colorScheme: .light
        ),
        
        // COZY THEMES
        // 13. Fireside
        AppTheme(
            name: "Fireside",
            primaryColor: Color(hex: "#92400e"),
            secondaryColor: Color(hex: "#ea580c"),
            accentColor: Color(hex: "#fed7aa"),
            backgroundColor: Color(hex: "#fffbf0"),
            surfaceColor: Color(hex: "#fef3c7"),
            borderColor: Color(hex: "#fcd34d"),
            textPrimary: Color(hex: "#78350f"),
            textSecondary: Color(hex: "#92400e"),
            colorScheme: .light
        ),
        
        // 14. Rainy Day
        AppTheme(
            name: "Rainy Day",
            primaryColor: Color(hex: "#64748b"),
            secondaryColor: Color(hex: "#3b82f6"),
            accentColor: Color(hex: "#8b5cf6"),
            backgroundColor: Color(hex: "#f8fafc"),
            surfaceColor: Color(hex: "#f1f5f9"),
            borderColor: Color(hex: "#cbd5e1"),
            textPrimary: Color(hex: "#334155"),
            textSecondary: Color(hex: "#475569"),
            colorScheme: .light
        ),
        
        // 15. Tea Time
        AppTheme(
            name: "Tea Time",
            primaryColor: Color(hex: "#a16207"),
            secondaryColor: Color(hex: "#f43f5e"),
            accentColor: Color(hex: "#fef3c7"),
            backgroundColor: Color(hex: "#fefdf8"),
            surfaceColor: Color(hex: "#fef3c7"),
            borderColor: Color(hex: "#fcd34d"),
            textPrimary: Color(hex: "#78350f"),
            textSecondary: Color(hex: "#92400e"),
            colorScheme: .light
        )
    ]
}

// Color extension to create colors from hex strings
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}