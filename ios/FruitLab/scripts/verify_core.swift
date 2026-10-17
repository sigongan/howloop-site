import Foundation

@main
struct VerifySharedCore {
    @MainActor static func main() throws {
        let shared = URL(fileURLWithPath:CommandLine.arguments[1],isDirectory:true)
        var checks = 0
        func check(_ value: @autoclosure () -> Bool, _ message: String) {
            precondition(value(), message); checks += 1
        }
        for id in FruitCatalog.identifiers {
            let data = try Data(contentsOf:shared.appendingPathComponent("\(id).json"))
            let lesson = try FruitLesson.decode(data)
            check(lesson.id == id,"File identity")
            check(lesson.seedCount == 5,"Illustrative seed count")
            check(Set(lesson.languages.keys) == Set(["en","ko","es"]),"Shared locales")
            check(lesson.languageCode(preferred:["ko-KR"]) == "ko","Korean region fallback")
            check(lesson.languageCode(preferred:["fr-FR","es-MX"]) == "es","Preferred locale chain")
            check(lesson.languageCode(preferred:["ja-JP"]) == "en","Default locale")
            for language in lesson.languages.values {
                check(language.facts.count == 3,"Three part facts")
                check(Set(language.facts.map(\.id)) == Set(["skin","flesh","seed"]),"Same parts across platforms")
                check(language.story.count == 4,"Four short growth steps")
                check(!language.found(2,total:5).contains("{"),"Progress placeholders")
                check(!language["origin"].isEmpty,"Shared fruit origin survives native decoding")
                check(!language["modelNote"].isEmpty,"Illustrative-model explanation is shared")
                check(!language["playgroundTagline"].isEmpty,"Shared playground subtitle")
            }
            var malformed = try JSONSerialization.jsonObject(with:data) as! [String:Any]
            malformed["schemaVersion"] = 99
            do {
                _ = try FruitLesson.decode(JSONSerialization.data(withJSONObject:malformed))
                fatalError("An unknown content schema must not silently load")
            } catch FruitLesson.ContentError.unsupportedSchema { checks += 1 }
            let state = ExplorationState(seedCount:lesson.seedCount)
            state.findSeed(0); check(state.foundSeeds.isEmpty,"Closed fruit blocks seeds")
            state.beginRotation(touches:1); state.rotate(dx:25,dy:5,touches:1)
            let yaw = state.yaw
            state.beginSplit(); state.rotate(dx:50,dy:0,touches:1)
            check(state.yaw == yaw,"Split owns gesture")
            state.scale(by:.nan); check(state.split == 0,"Invalid pinch ignored")
            state.scale(by:2); check(state.isOpen,"Progressive spread opens")
            state.findSeed(0); state.findSeed(0); state.findSeed(999)
            check(state.foundSeeds == [0],"Seed discoveries are unique and bounded")
            state.reset(); check(state.foundSeeds.isEmpty && state.split == 0,"Reset clears progress")
        }
        print("PASS: \(checks) shared-content and native interaction checks")
    }
}
