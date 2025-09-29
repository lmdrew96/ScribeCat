//
//  HomeView.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  Home dashboard with overview of all features
//

import SwiftUI

struct HomeView: View {
    let theme: AppTheme
    @State private var recentSessions: [SessionData] = []
    @State private var todayStats = TodayStats()
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Welcome header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Welcome to ScribeCat")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(theme.textPrimary)
                    
                    Text("Your AI-powered transcription and note-taking companion")
                        .font(.body)
                        .foregroundColor(theme.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(theme.surfaceColor)
                .cornerRadius(12)
                
                // Today's stats
                StatsOverviewView(stats: todayStats, theme: theme)
                
                // Quick actions
                QuickActionsView(theme: theme)
                
                // Recent sessions
                RecentSessionsView(sessions: recentSessions, theme: theme)
                
                // Features overview
                FeaturesOverviewView(theme: theme)
            }
            .padding()
        }
        .background(theme.backgroundColor)
        .navigationTitle("Home")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadDashboardData()
        }
    }
    
    private func loadDashboardData() {
        // Load recent sessions and stats
        // This would connect to Core Data or API
    }
}

struct StatsOverviewView: View {
    let stats: TodayStats
    let theme: AppTheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Activity")
                .font(.headline)
                .foregroundColor(theme.textPrimary)
            
            HStack(spacing: 16) {
                StatCard(
                    title: "Minutes Recorded",
                    value: "\(stats.minutesRecorded)",
                    icon: "waveform",
                    color: theme.primaryColor
                )
                
                StatCard(
                    title: "Words Transcribed",
                    value: "\(stats.wordsTranscribed)",
                    icon: "doc.text",
                    color: theme.secondaryColor
                )
                
                StatCard(
                    title: "AI Queries",
                    value: "\(stats.aiQueries)",
                    icon: "brain.head.profile",
                    color: theme.accentColor
                )
            }
        }
        .padding()
        .background(theme.surfaceColor)
        .cornerRadius(12)
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

struct QuickActionsView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .foregroundColor(theme.textPrimary)
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12) {
                QuickActionButton(
                    title: "Start Recording",
                    icon: "mic.fill",
                    color: .red,
                    action: {}
                )
                
                QuickActionButton(
                    title: "New Note",
                    icon: "doc.badge.plus",
                    color: theme.primaryColor,
                    action: {}
                )
                
                QuickActionButton(
                    title: "Ask AI",
                    icon: "brain.head.profile",
                    color: theme.secondaryColor,
                    action: {}
                )
                
                QuickActionButton(
                    title: "Sync Drive",
                    icon: "icloud.and.arrow.up",
                    color: theme.accentColor,
                    action: {}
                )
            }
        }
        .padding()
        .background(theme.surfaceColor)
        .cornerRadius(12)
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(.white)
                    .frame(width: 50, height: 50)
                    .background(color)
                    .cornerRadius(12)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(color)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

struct RecentSessionsView: View {
    let sessions: [SessionData]
    let theme: AppTheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Sessions")
                .font(.headline)
                .foregroundColor(theme.textPrimary)
            
            if sessions.isEmpty {
                Text("No recent sessions")
                    .font(.body)
                    .foregroundColor(theme.textSecondary)
                    .frame(maxWidth: .infinity, minHeight: 100)
                    .background(theme.backgroundColor)
                    .cornerRadius(8)
            } else {
                ForEach(sessions) { session in
                    SessionRowView(session: session, theme: theme)
                }
            }
        }
        .padding()
        .background(theme.surfaceColor)
        .cornerRadius(12)
    }
}

struct SessionRowView: View {
    let session: SessionData
    let theme: AppTheme
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.title)
                    .font(.headline)
                    .foregroundColor(theme.textPrimary)
                
                Text(session.date.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundColor(theme.textSecondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(session.duration) min")
                    .font(.caption)
                    .foregroundColor(theme.textSecondary)
                
                Text("\(session.wordCount) words")
                    .font(.caption)
                    .foregroundColor(theme.textSecondary)
            }
        }
        .padding()
        .background(theme.backgroundColor)
        .cornerRadius(8)
    }
}

struct FeaturesOverviewView: View {
    let theme: AppTheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Features")
                .font(.headline)
                .foregroundColor(theme.textPrimary)
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12) {
                FeatureCard(
                    title: "Real-time Transcription",
                    description: "Apple Speech Framework",
                    icon: "waveform.badge.mic",
                    theme: theme
                )
                
                FeatureCard(
                    title: "Rich Text Editor",
                    description: "Full formatting toolbar",
                    icon: "doc.richtext",
                    theme: theme
                )
                
                FeatureCard(
                    title: "AI Assistant",
                    description: "Claude 3.5 Sonnet",
                    icon: "brain.head.profile",
                    theme: theme
                )
                
                FeatureCard(
                    title: "Apple Pencil",
                    description: "Handwritten notes",
                    icon: "pencil.tip",
                    theme: theme
                )
                
                FeatureCard(
                    title: "Google Drive",
                    description: "Cloud sync",
                    icon: "icloud",
                    theme: theme
                )
                
                FeatureCard(
                    title: "Canvas Integration",
                    description: "Course information",
                    icon: "graduationcap",
                    theme: theme
                )
            }
        }
        .padding()
        .background(theme.surfaceColor)
        .cornerRadius(12)
    }
}

struct FeatureCard: View {
    let title: String
    let description: String
    let icon: String
    let theme: AppTheme
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundColor(theme.primaryColor)
            
            Text(title)
                .font(.headline)
                .foregroundColor(theme.textPrimary)
                .multilineTextAlignment(.center)
            
            Text(description)
                .font(.caption)
                .foregroundColor(theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 120)
        .padding()
        .background(theme.backgroundColor)
        .cornerRadius(8)
    }
}

// Data models
struct TodayStats {
    let minutesRecorded: Int = 0
    let wordsTranscribed: Int = 0
    let aiQueries: Int = 0
}

struct SessionData: Identifiable {
    let id = UUID()
    let title: String
    let date: Date
    let duration: Int
    let wordCount: Int
}

struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView(theme: .defaultTheme)
            .previewDevice("iPad Pro (12.9-inch) (6th generation)")
    }
}