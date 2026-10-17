import XCTest

/// Optional developer-run smoke tests. The agent verifies UI only with CUA.
@MainActor
final class FruitLabUITests: XCTestCase {
    func testOrchardToLemonAndSeedReset() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages","(en)","-AppleLocale","en_US"]
        app.launch()
        XCTAssertTrue(app.buttons["exploreFruit"].waitForExistence(timeout:15))
        app.buttons["exploreFruit"].tap()
        XCTAssertTrue(app.otherElements["fruitStage"].waitForExistence(timeout:10))
        XCTAssertFalse(app.buttons["seedDot0"].isEnabled)
        app.buttons["splitButton"].tap()
        app.buttons["seedDot0"].tap()
        XCTAssertEqual(app.staticTexts["seedProgress"].label,"1 of 5")
        app.buttons["seedDot0"].tap()
        XCTAssertEqual(app.staticTexts["seedProgress"].label,"1 of 5")
        app.buttons["resetButton"].tap()
        XCTAssertEqual(app.staticTexts["seedProgress"].label,"0 of 5")
        app.buttons["learnButton"].tap()
        XCTAssertTrue(app.staticTexts["Peel"].waitForExistence(timeout:3))
    }
}
