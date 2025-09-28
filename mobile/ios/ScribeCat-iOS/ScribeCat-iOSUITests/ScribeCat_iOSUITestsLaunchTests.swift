//
//  ScribeCat_iOSUITestsLaunchTests.swift
//  ScribeCat-iOSUITests
//
//  Created by ScribeCat Team on 2024.
//

import XCTest

final class ScribeCat_iOSUITestsLaunchTests: XCTestCase {

    override class var runsForEachTargetApplicationUIConfiguration: Bool {
        true
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunch() throws {
        let app = XCUIApplication()
        app.launch()

        // Insert steps here to perform after app launch but before taking a screenshot
        // For example, logging into a test account or navigating to a specific screen
        
        // Take a screenshot of the app's launch screen
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Launch Screen"
        attachment.lifetime = .keepAlways
        add(attachment)
        
        // Basic launch test - verify the app launches and shows the tab bar
        XCTAssertTrue(app.tabBars.firstMatch.exists, "Tab bar should be visible on launch")
        
        // Verify all main tabs are present
        XCTAssertTrue(app.tabBars.buttons["Home"].exists, "Home tab should exist")
        XCTAssertTrue(app.tabBars.buttons["Record"].exists, "Record tab should exist")
        XCTAssertTrue(app.tabBars.buttons["Notes"].exists, "Notes tab should exist")
        XCTAssertTrue(app.tabBars.buttons["Settings"].exists, "Settings tab should exist")
        
        // Verify the welcome message is shown on Home tab (default)
        XCTAssertTrue(app.staticTexts["Welcome to ScribeCat"].waitForExistence(timeout: 3), 
                     "Welcome message should be visible on launch")
    }
}

extension XCUIElement {
    func waitForExistence(timeout: TimeInterval) -> Bool {
        let predicate = NSPredicate(format: "exists == true")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: self)
        let result = XCTWaiter().wait(for: [expectation], timeout: timeout)
        return result == .completed
    }
}