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
    
    // All 15 themes from desktop app
    static let allThemes: [AppTheme] = [
        defaultTheme,
        
        // 1. Ocean
        AppTheme(
            name: "Ocean",
            primaryColor: Color(hex: "#0ea5e9"),
            secondaryColor: Color(hex: "#14b8a6"),
            accentColor: Color(hex: "#06b6d4"),
            backgroundColor: Color(hex: "#f0f9ff"),
            surfaceColor: Color(hex: "#e0f2fe"),
            borderColor: Color(hex: "#7dd3fc"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 2. Forest
        AppTheme(
            name: "Forest",
            primaryColor: Color(hex: "#059669"),
            secondaryColor: Color(hex: "#10b981"),
            accentColor: Color(hex: "#65a30d"),
            backgroundColor: Color(hex: "#f0fdf4"),
            surfaceColor: Color(hex: "#dcfce7"),
            borderColor: Color(hex: "#86efac"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 3. Sunset
        AppTheme(
            name: "Sunset",
            primaryColor: Color(hex: "#ea580c"),
            secondaryColor: Color(hex: "#dc2626"),
            accentColor: Color(hex: "#ec4899"),
            backgroundColor: Color(hex: "#fff7ed"),
            surfaceColor: Color(hex: "#fed7aa"),
            borderColor: Color(hex: "#fb923c"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 4. Royal
        AppTheme(
            name: "Royal",
            primaryColor: Color(hex: "#8b5cf6"),
            secondaryColor: Color(hex: "#6366f1"),
            accentColor: Color(hex: "#a855f7"),
            backgroundColor: Color(hex: "#faf5ff"),
            surfaceColor: Color(hex: "#ede9fe"),
            borderColor: Color(hex: "#c4b5fd"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 5. Rose
        AppTheme(
            name: "Rose",
            primaryColor: Color(hex: "#f43f5e"),
            secondaryColor: Color(hex: "#e11d48"),
            accentColor: Color(hex: "#ef4444"),
            backgroundColor: Color(hex: "#fff1f2"),
            surfaceColor: Color(hex: "#fecdd3"),
            borderColor: Color(hex: "#fb7185"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 6. Tropical
        AppTheme(
            name: "Tropical",
            primaryColor: Color(hex: "#14b8a6"),
            secondaryColor: Color(hex: "#059669"),
            accentColor: Color(hex: "#06b6d4"),
            backgroundColor: Color(hex: "#f0fdfa"),
            surfaceColor: Color(hex: "#ccfbf1"),
            borderColor: Color(hex: "#5eead4"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 7. Cosmic
        AppTheme(
            name: "Cosmic",
            primaryColor: Color(hex: "#6366f1"),
            secondaryColor: Color(hex: "#8b5cf6"),
            accentColor: Color(hex: "#3b82f6"),
            backgroundColor: Color(hex: "#eef2ff"),
            surfaceColor: Color(hex: "#e0e7ff"),
            borderColor: Color(hex: "#a5b4fc"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 8. Autumn
        AppTheme(
            name: "Autumn",
            primaryColor: Color(hex: "#f59e0b"),
            secondaryColor: Color(hex: "#ea580c"),
            accentColor: Color(hex: "#eab308"),
            backgroundColor: Color(hex: "#fffbeb"),
            surfaceColor: Color(hex: "#fef3c7"),
            borderColor: Color(hex: "#fcd34d"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 9. Emerald
        AppTheme(
            name: "Emerald",
            primaryColor: Color(hex: "#10b981"),
            secondaryColor: Color(hex: "#14b8a6"),
            accentColor: Color(hex: "#059669"),
            backgroundColor: Color(hex: "#ecfdf5"),
            surfaceColor: Color(hex: "#d1fae5"),
            borderColor: Color(hex: "#6ee7b7"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 10. Arctic
        AppTheme(
            name: "Arctic",
            primaryColor: Color(hex: "#06b6d4"),
            secondaryColor: Color(hex: "#0ea5e9"),
            accentColor: Color(hex: "#64748b"),
            backgroundColor: Color(hex: "#ecfeff"),
            surfaceColor: Color(hex: "#cffafe"),
            borderColor: Color(hex: "#67e8f9"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 11. Berry
        AppTheme(
            name: "Berry",
            primaryColor: Color(hex: "#ec4899"),
            secondaryColor: Color(hex: "#8b5cf6"),
            accentColor: Color(hex: "#d946ef"),
            backgroundColor: Color(hex: "#fdf2f8"),
            surfaceColor: Color(hex: "#fce7f3"),
            borderColor: Color(hex: "#f9a8d4"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 12. Monochrome
        AppTheme(
            name: "Monochrome",
            primaryColor: Color(hex: "#64748b"),
            secondaryColor: Color(hex: "#6b7280"),
            accentColor: Color(hex: "#71717a"),
            backgroundColor: Color(hex: "#f8fafc"),
            surfaceColor: Color(hex: "#f1f5f9"),
            borderColor: Color(hex: "#cbd5e1"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 13. Midnight (Dark)
        AppTheme(
            name: "Midnight",
            primaryColor: Color(hex: "#1e40af"),
            secondaryColor: Color(hex: "#4338ca"),
            accentColor: Color(hex: "#7c3aed"),
            backgroundColor: Color(hex: "#020617"),
            surfaceColor: Color(hex: "#0f172a"),
            borderColor: Color(hex: "#334155"),
            textPrimary: Color(hex: "#f1f5f9"),
            textSecondary: Color(hex: "#cbd5e1"),
            colorScheme: .dark
        ),
        
        // 14. Neon
        AppTheme(
            name: "Neon",
            primaryColor: Color(hex: "#65a30d"),
            secondaryColor: Color(hex: "#eab308"),
            accentColor: Color(hex: "#16a34a"),
            backgroundColor: Color(hex: "#f7fee7"),
            surfaceColor: Color(hex: "#ecfccb"),
            borderColor: Color(hex: "#bef264"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
            colorScheme: .light
        ),
        
        // 15. Volcano
        AppTheme(
            name: "Volcano",
            primaryColor: Color(hex: "#dc2626"),
            secondaryColor: Color(hex: "#ea580c"),
            accentColor: Color(hex: "#f59e0b"),
            backgroundColor: Color(hex: "#fef2f2"),
            surfaceColor: Color(hex: "#fecaca"),
            borderColor: Color(hex: "#f87171"),
            textPrimary: Color(hex: "#1e293b"),
            textSecondary: Color(hex: "#64748b"),
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