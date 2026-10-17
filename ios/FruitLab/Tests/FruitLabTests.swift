import XCTest
import SceneKit
@testable import FruitLab

@MainActor
final class FruitLabTests: XCTestCase {
    func testSpreadIsProgressiveFromClosedAndPinchCloses() {
        let state = ExplorationState()
        state.beginSplit(); state.scale(by:1.5)
        XCTAssertEqual(state.split,log(1.5)*0.85,accuracy:0.00001)
        state.scale(by:1.5)
        XCTAssertGreaterThan(state.split,0.6)
        state.scale(by:0.1); XCTAssertEqual(state.split,0)
    }
    func testGestureOwnershipPreventsRotationDuringSplit() {
        let state = ExplorationState()
        state.beginRotation(touches:1); state.rotate(dx:50,dy:20,touches:1)
        let yaw = state.yaw, pitch = state.pitch
        state.beginSplit()
        state.beginRotation(touches:1); state.rotate(dx:100,dy:100,touches:1)
        state.rotate(dx:100,dy:100,touches:2)
        state.end(.rotating) // cancellation of an old pan must not cancel the pinch
        XCTAssertEqual(state.mode,.splitting)
        XCTAssertEqual(state.yaw,yaw); XCTAssertEqual(state.pitch,pitch)
        state.scale(by:2); XCTAssertGreaterThan(state.split,0)
    }
    func testBoundsAndInvalidScale() {
        let state = ExplorationState(); state.beginSplit()
        state.scale(by:.nan); state.scale(by:.infinity); state.scale(by:-1)
        XCTAssertEqual(state.split,0)
        state.scale(by:100); XCTAssertEqual(state.split,1)
        state.end(.splitting); state.beginRotation(touches:1)
        state.rotate(dx:1,dy:10000,touches:1); XCTAssertEqual(state.pitch,0.9)
    }
    func testSeedsAreUniqueAndOnlyAvailableWhenOpen() {
        let state = ExplorationState(); state.findSeed(0); XCTAssertTrue(state.foundSeeds.isEmpty)
        state.toggleOpen(); state.findSeed(0); state.findSeed(0); state.findSeed(99)
        XCTAssertEqual(state.foundSeeds,[0])
        state.reset(); XCTAssertEqual(state.split,0); XCTAssertTrue(state.foundSeeds.isEmpty)
    }
    func testEveryHalfIsWatertightWithRealCutFaces() {
        for lemon in [false,true] { for right in [false,true] {
            let mesh = AppleMesh.data(right:right,vertical:16,around:20,lemon:lemon)
            XCTAssertFalse(mesh.flesh.isEmpty)
            func key(_ index: Int32) -> String {
                let v = mesh.vertices[Int(index)]
                return "\(Int((v.x*100000).rounded())),\(Int((v.y*100000).rounded())),\(Int((v.z*100000).rounded()))"
            }
            var edges: [String:Int] = [:]
            let indices = mesh.skin + mesh.flesh
            var volume: Float = 0
            for i in stride(from:0,to:indices.count,by:3) {
                let ids = Array(indices[i..<i+3])
                for j in 0..<3 {
                    let pair = [key(ids[j]),key(ids[(j+1)%3])].sorted().joined(separator:"|")
                    edges[pair,default:0] += 1
                }
                let a = mesh.vertices[Int(ids[0])],b = mesh.vertices[Int(ids[1])],c = mesh.vertices[Int(ids[2])]
                volume += (a.x*(b.y*c.z-b.z*c.y)+a.y*(b.z*c.x-b.x*c.z)+a.z*(b.x*c.y-b.y*c.x))/6
            }
            XCTAssertTrue(edges.values.allSatisfy { $0 == 2 },"Each welded geometric edge must have two incident faces")
            XCTAssertGreaterThan(volume,1,"Half is a closed, outward oriented solid")
            XCTAssertTrue(mesh.normals.allSatisfy { $0.x.isFinite && $0.y.isFinite && $0.z.isFinite })
        }}
    }
    func testSharedCatalogContainsBothFruitsAndAllLanguages() throws {
        let lessons = try FruitCatalog.load()
        XCTAssertEqual(lessons.map(\.id),["lemon","apple"])
        for lesson in lessons {
            XCTAssertEqual(lesson.schemaVersion,1)
            XCTAssertEqual(lesson.seedCount,5)
            XCTAssertEqual(Set(lesson.languages.keys),Set(["en","ko","es"]))
            XCTAssertEqual(lesson.languageCode(preferred:["ko-KR"]),"ko")
            XCTAssertEqual(lesson.languageCode(preferred:["fr-FR","es-MX"]),"es")
            XCTAssertEqual(lesson.languageCode(preferred:["fr-FR"]),"en")
            for language in lesson.languages.values {
                XCTAssertEqual(language.facts.count,3)
                XCTAssertEqual(language.story.count,4)
                XCTAssertFalse(language.found(2,total:5).contains("{"))
                XCTAssertFalse(language["origin"].isEmpty)
                XCTAssertFalse(language["modelNote"].isEmpty)
                XCTAssertFalse(language["playgroundTagline"].isEmpty)
            }
            let food = AppleFood(fruitID:lesson.id,seedCount:lesson.seedCount)
            XCTAssertEqual(food.seedCount,lesson.seedCount)
            for index in 0..<lesson.seedCount {
                XCTAssertNotNil(food.root.childNode(withName:"seed-\(index)",recursively:true))
            }
        }
    }
    func testSharedLemonBrandAssetIsBundled() throws {
        let url = try XCTUnwrap(Bundle.main.url(forResource:"apple-touch-icon",withExtension:"png"))
        let data = try Data(contentsOf:url)
        XCTAssertNotNil(UIImage(data:data))
    }
    func testSharedSchemaRejectsUnexpectedVersion() throws {
        let url = try XCTUnwrap(Bundle.main.url(forResource:"lemon",withExtension:"json"))
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with:Data(contentsOf:url)) as? [String:Any])
        object["schemaVersion"] = 99
        XCTAssertThrowsError(try FruitLesson.decode(JSONSerialization.data(withJSONObject:object)))
    }
}
