import Foundation

/// These values are decoded directly from the same files used by the web build.
/// The Xcode resources point outside ios/ to shared/; no authored copy lives here.
struct FruitLesson: Decodable {
    struct Fact: Decodable, Identifiable {
        let id: String
        let title: String
        let text: String
    }
    struct StoryStep: Decodable {
        let title: String
        let text: String
    }
    struct Language: Decodable {
        let strings: [String: String]
        let facts: [Fact]
        let story: [StoryStep]
        private struct Key: CodingKey {
            var stringValue: String
            var intValue: Int? { nil }
            init(stringValue: String) { self.stringValue = stringValue }
            init?(intValue: Int) { return nil }
        }
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: Key.self)
            var values: [String: String] = [:]
            for key in container.allKeys {
                if let value = try? container.decode(String.self, forKey: key) { values[key.stringValue] = value }
            }
            strings = values
            facts = try container.decode([Fact].self, forKey: Key(stringValue: "facts"))
            story = try container.decode([StoryStep].self, forKey: Key(stringValue: "story"))
        }
        subscript(_ key: String) -> String { strings[key] ?? "" }
        var fruitName: String { strings["fruit"] ?? strings["apple"] ?? "" }
        func found(_ count: Int, total: Int) -> String {
            self["found"].replacingOccurrences(of: "{count}", with: String(count))
                .replacingOccurrences(of: "{total}", with: String(total))
        }
        func label(_ key: String, fallback: String) -> String { strings[key] ?? self[fallback] }
    }
    let schemaVersion: Int
    let id: String
    let version: String
    let seedCount: Int
    let languages: [String: Language]

    enum ContentError: Error { case unsupportedSchema, invalidLesson, missingResource(String) }
    static func decode(_ data: Data) throws -> FruitLesson {
        let lesson = try JSONDecoder().decode(FruitLesson.self, from: data)
        guard lesson.schemaVersion == 1 else { throw ContentError.unsupportedSchema }
        guard ["apple", "lemon"].contains(lesson.id), lesson.seedCount == 5,
              Set(["en", "ko", "es"]).isSubset(of: Set(lesson.languages.keys)),
              lesson.languages.values.allSatisfy({ language in
                  !language.fruitName.isEmpty && language.facts.count == 3 && !language.story.isEmpty &&
                  ["name", "title", "subtitle", "rotate", "open", "close", "seeds", "reset", "seed", "found", "hintRotate", "hintOpen", "hintSeeds"].allSatisfy { !language[$0].isEmpty }
              }) else { throw ContentError.invalidLesson }
        return lesson
    }
    func languageCode(preferred: [String] = Locale.preferredLanguages) -> String {
        for locale in preferred {
            let code = locale.lowercased().split(whereSeparator: { $0 == "-" || $0 == "_" }).first.map(String.init) ?? "en"
            if languages[code] != nil { return code }
        }
        return "en"
    }
    func language(_ code: String) -> Language { languages[code] ?? languages["en"]! }
}

enum FruitCatalog {
    static let identifiers = ["lemon", "apple"]
    static func load(bundle: Bundle = .main) throws -> [FruitLesson] {
        try identifiers.map { id in
            guard let url = bundle.url(forResource: id, withExtension: "json") else {
                throw FruitLesson.ContentError.missingResource(id)
            }
            let lesson = try FruitLesson.decode(Data(contentsOf: url))
            guard lesson.id == id else { throw FruitLesson.ContentError.invalidLesson }
            return lesson
        }
    }
}
