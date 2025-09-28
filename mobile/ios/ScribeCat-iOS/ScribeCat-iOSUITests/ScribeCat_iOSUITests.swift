//
//  ScribeCat_iOSUITests.swift
//  ScribeCat-iOSUITests
//
//  Created by ScribeCat Team on 2024.
//

import XCTest

final class ScribeCat_iOSUITests: XCTestCase {
    
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    override func tearDownWithError() throws {
        app = nil
    }
    
    // MARK: - Basic Navigation Tests
    
    func testTabBarNavigation() throws {
        // Test that all tab bar items are present and functional
        
        // Test Home tab
        let homeTab = app.tabBars.buttons["Home"]
        XCTAssertTrue(homeTab.exists)
        homeTab.tap()
        XCTAssertTrue(app.staticTexts["Welcome to ScribeCat"].waitForExistence(timeout: 2))
        
        // Test Record tab
        let recordTab = app.tabBars.buttons["Record"]
        XCTAssertTrue(recordTab.exists)
        recordTab.tap()
        XCTAssertTrue(app.staticTexts["Audio Recording"].waitForExistence(timeout: 2))
        
        // Test Notes tab
        let notesTab = app.tabBars.buttons["Notes"]
        XCTAssertTrue(notesTab.exists)
        notesTab.tap()
        XCTAssertTrue(app.navigationBars["Notes & Sessions"].waitForExistence(timeout: 2))
        
        // Test Settings tab
        let settingsTab = app.tabBars.buttons["Settings"]
        XCTAssertTrue(settingsTab.exists)
        settingsTab.tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 2))
    }
    
    func testHomeViewContent() throws {
        // Test Home view displays expected content
        let homeTab = app.tabBars.buttons["Home"]
        homeTab.tap()
        
        // Check for main elements
        XCTAssertTrue(app.staticTexts["Welcome to ScribeCat"].exists)
        XCTAssertTrue(app.staticTexts["Your mobile companion for transcription and note-taking"].exists)
        XCTAssertTrue(app.staticTexts["Sessions"].exists)
        XCTAssertTrue(app.staticTexts["Notes"].exists)
        XCTAssertTrue(app.staticTexts["Recent Sessions"].exists)
    }
    
    func testRecordViewContent() throws {
        // Test Record view displays expected content
        let recordTab = app.tabBars.buttons["Record"]
        recordTab.tap()
        
        // Check for main elements
        XCTAssertTrue(app.staticTexts["Audio Recording"].exists)
        XCTAssertTrue(app.staticTexts["Ready to record"].exists)
        
        // Check for record button
        let recordButton = app.buttons.matching(identifier: "record.circle").firstMatch
        XCTAssertTrue(recordButton.exists)
    }
    
    func testNotesViewContent() throws {
        // Test Notes view displays expected content
        let notesTab = app.tabBars.buttons["Notes"]
        notesTab.tap()
        
        // Check for navigation bar
        XCTAssertTrue(app.navigationBars["Notes & Sessions"].exists)
        
        // Check for search functionality
        let searchField = app.textFields["Search notes and transcriptions"]
        XCTAssertTrue(searchField.exists)
        
        // Test search functionality
        searchField.tap()
        searchField.typeText("test")
        
        // The search should filter results (in this case, probably show "No results found")
        // This will depend on whether there's sample data in the app
    }
    
    func testSettingsViewContent() throws {
        // Test Settings view displays expected content
        let settingsTab = app.tabBars.buttons["Settings"]
        settingsTab.tap()
        
        // Check for main sections
        XCTAssertTrue(app.staticTexts["Sync & Storage"].exists)
        XCTAssertTrue(app.staticTexts["Recording Settings"].exists)
        XCTAssertTrue(app.staticTexts["Language & Localization"].exists)
        XCTAssertTrue(app.staticTexts["Privacy & Analytics"].exists)
        XCTAssertTrue(app.staticTexts["Debug & Development"].exists)
        XCTAssertTrue(app.staticTexts["About"].exists)
    }
    
    // MARK: - Settings Interaction Tests
    
    func testSettingsToggles() throws {
        let settingsTab = app.tabBars.buttons["Settings"]
        settingsTab.tap()
        
        // Test CloudKit Sync toggle
        let syncToggle = app.switches["CloudKit Sync"]
        if syncToggle.exists {
            let initialValue = syncToggle.value as? String
            syncToggle.tap()
            let newValue = syncToggle.value as? String
            XCTAssertNotEqual(initialValue, newValue)
        }
        
        // Test Real-time Transcription toggle
        let transcriptionToggle = app.switches["Real-time Transcription"]
        if transcriptionToggle.exists {
            let initialValue = transcriptionToggle.value as? String
            transcriptionToggle.tap()
            let newValue = transcriptionToggle.value as? String
            XCTAssertNotEqual(initialValue, newValue)
        }
        
        // Test Analytics toggle
        let analyticsToggle = app.switches["Analytics"]
        if analyticsToggle.exists {
            let initialValue = analyticsToggle.value as? String
            analyticsToggle.tap()
            let newValue = analyticsToggle.value as? String
            XCTAssertNotEqual(initialValue, newValue)
        }
    }
    
    func testDebugFunctions() throws {
        let settingsTab = app.tabBars.buttons["Settings"]
        settingsTab.tap()
        
        // Scroll down to debug section
        app.swipeUp()
        
        // Test Add Sample Data button
        let addSampleDataButton = app.buttons["Add Sample Data"]
        if addSampleDataButton.exists {
            addSampleDataButton.tap()
            
            // Go to Notes tab to verify sample data was added
            let notesTab = app.tabBars.buttons["Notes"]
            notesTab.tap()
            
            // There should now be some content (the exact content depends on the sample data)
            // We'll just check that we're not showing the "No notes yet" message
            let noNotesMessage = app.staticTexts["No notes yet"]
            XCTAssertFalse(noNotesMessage.exists)
        }
    }
    
    // MARK: - Modal Presentation Tests
    
    func testAboutModal() throws {
        let settingsTab = app.tabBars.buttons["Settings"]
        settingsTab.tap()
        
        // Scroll down to find About button
        app.swipeUp()
        
        let aboutButton = app.buttons["About ScribeCat"]
        if aboutButton.exists {
            aboutButton.tap()
            
            // Check that About view is presented
            XCTAssertTrue(app.staticTexts["ScribeCat"].waitForExistence(timeout: 2))
            XCTAssertTrue(app.staticTexts["iOS Mobile Companion"].exists)
            
            // Close the modal
            let closeButton = app.buttons["Close"]
            if closeButton.exists {
                closeButton.tap()
            }
        }
    }
    
    func testPrivacyPolicyModal() throws {
        let settingsTab = app.tabBars.buttons["Settings"]
        settingsTab.tap()
        
        let privacyButton = app.buttons["Privacy Policy"]
        if privacyButton.exists {
            privacyButton.tap()
            
            // Check that Privacy Policy view is presented
            XCTAssertTrue(app.staticTexts["Privacy Policy"].waitForExistence(timeout: 2))
            
            // Close the modal
            let closeButton = app.buttons["Close"]
            if closeButton.exists {
                closeButton.tap()
            }
        }
    }
    
    // MARK: - Recording Flow Test
    
    func testRecordingFlow() throws {
        let recordTab = app.tabBars.buttons["Record"]
        recordTab.tap()
        
        // Find and tap the record button
        let recordButton = app.buttons.matching(identifier: "record.circle").firstMatch
        XCTAssertTrue(recordButton.exists)
        
        // Note: This test might require microphone permissions
        // In a real test, you might want to handle permission dialogs
        recordButton.tap()
        
        // Check that recording state changes
        XCTAssertTrue(app.staticTexts["Recording in progress..."].waitForExistence(timeout: 3))
        
        // Wait a moment, then stop recording
        sleep(2)
        
        let stopButton = app.buttons.matching(identifier: "stop.circle.fill").firstMatch
        if stopButton.exists {
            stopButton.tap()
            
            // Should show title alert
            XCTAssertTrue(app.alerts["Recording Title"].waitForExistence(timeout: 2))
            
            // Enter a title and save
            let titleTextField = app.textFields["Enter title"]
            if titleTextField.exists {
                titleTextField.tap()
                titleTextField.typeText("Test Recording")
                
                let saveButton = app.buttons["Save"]
                saveButton.tap()
            }
        }
    }
    
    // MARK: - Performance Tests
    
    func testLaunchPerformance() throws {
        if #available(macOS 10.15, iOS 13.0, tvOS 13.0, watchOS 7.0, *) {
            // This measures how long it takes to launch your application.
            measure(metrics: [XCTApplicationLaunchMetric()]) {
                XCUIApplication().launch()
            }
        }
    }
    
    func testTabSwitchingPerformance() throws {
        measure {
            // Test the performance of switching between tabs
            for _ in 0..<10 {
                app.tabBars.buttons["Home"].tap()
                app.tabBars.buttons["Record"].tap()
                app.tabBars.buttons["Notes"].tap()
                app.tabBars.buttons["Settings"].tap()
            }
        }
    }
}

// MARK: - Test Helpers

extension XCUIElement {
    func waitForExistence(timeout: TimeInterval) -> Bool {
        return waitForExistence(timeout: timeout)
    }
}