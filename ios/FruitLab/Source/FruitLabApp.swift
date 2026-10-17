import SwiftUI

@main
struct FruitLabApp: App {
    private let content = Result { try FruitCatalog.load() }
    var body: some Scene {
        WindowGroup {
            switch content {
            case .success(let lessons): OrchardView(lessons:lessons)
            case .failure:
                // A missing bundled file is a build error, never an invitation to fetch child data.
                ContentUnavailableView("Howloop", systemImage:"leaf", description:Text("Please update the app."))
            }
        }
    }
}

@MainActor
final class OrchardUIState: ObservableObject {
    @Published var languageCode: String
    @Published var selectedFruit = "lemon"
    @Published var path: [String] = []
    @Published var shakes = 0
    init(languageCode: String) { self.languageCode = languageCode }
}

@MainActor
final class ExplorationUIState: ObservableObject {
    @Published var showGuide = false
    @Published var showLearning = false
}

struct OrchardView: View {
    let lessons: [FruitLesson]
    @StateObject private var ui: OrchardUIState
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    private let ink = Color(red:0.12,green:0.25,blue:0.25)
    init(lessons: [FruitLesson]) {
        self.lessons = lessons
        _ui = StateObject(wrappedValue:OrchardUIState(languageCode:lessons[0].languageCode()))
    }
    private var lesson: FruitLesson { lessons.first { $0.id == ui.selectedFruit } ?? lessons[0] }
    private var words: FruitLesson.Language { lesson.language(ui.languageCode) }
    var body: some View {
        NavigationStack(path:$ui.path) {
            ScrollView {
                VStack(spacing:18) {
                    Text(words["orchard"]).font(.system(.largeTitle,design:.rounded,weight:.bold)).multilineTextAlignment(.center)
                    Text(words["treeHint"]).font(.system(.body,design:.rounded)).multilineTextAlignment(.center)
                    Picker(words["fruit"],selection:$ui.selectedFruit) {
                        ForEach(lessons,id:\.id) { fruit in Text(fruit.language(ui.languageCode).fruitName).tag(fruit.id) }
                    }.pickerStyle(.segmented).frame(maxWidth:330).accessibilityIdentifier("fruitPicker")
                    OrchardTree(fruitID:lesson.id, label:words["pick"]) {
                        ui.path.append(lesson.id)
                    }.frame(height:360).accessibilityIdentifier("orchardTree")
                        .keyframeAnimator(initialValue:0.0,trigger:ui.shakes) { tree, angle in
                            tree.rotationEffect(.degrees(reducedMotion ? 0 : angle),anchor:.bottom)
                        } keyframes: { _ in
                            KeyframeTrack {
                                LinearKeyframe(-3.0,duration:0.10)
                                LinearKeyframe(3.0,duration:0.16)
                                LinearKeyframe(-2.0,duration:0.13)
                                LinearKeyframe(0.0,duration:0.10)
                            }
                        }
                    Button { ui.shakes += 1 } label: {
                        Label(words["shake"],systemImage:"hand.wave.fill").padding(12)
                    }.buttonStyle(.plain).accessibilityIdentifier("shakeTree")
                    Button { ui.path.append(lesson.id) } label: {
                        Label(words["play"],systemImage:"hand.tap.fill")
                            .font(.system(.title3,design:.rounded,weight:.bold))
                            .padding(.vertical,18).frame(maxWidth:330)
                            .background(Color(red:1,green:0.83,blue:0.32),in:Capsule())
                    }.buttonStyle(.plain).accessibilityIdentifier("exploreFruit")
                    Text(words.label("playgroundTagline",fallback:"subtitle")).font(.system(.callout,design:.rounded)).multilineTextAlignment(.center)
                }.padding(24).frame(maxWidth:650).frame(maxWidth:.infinity)
            }.background(Color(red:0.98,green:0.97,blue:0.90).ignoresSafeArea())
                .navigationTitle("Howloop").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement:.principal) {
                        HStack(spacing:8) {
                            Image("apple-touch-icon").resizable().scaledToFit().frame(width:32,height:32).accessibilityHidden(true)
                            Text("Howloop").font(.system(.headline,design:.rounded,weight:.bold))
                        }.accessibilityElement(children:.combine)
                    }
                    ToolbarItem(placement:.topBarTrailing) { languageMenu }
                }
                .navigationDestination(for:String.self) { id in
                    if let fruit = lessons.first(where:{ $0.id == id }) {
                        ExplorationView(lesson:fruit,languageCode:$ui.languageCode)
                    }
                }
        }.tint(ink).foregroundStyle(ink)
    }
    private var languageMenu: some View {
        Menu {
            Picker(words["language"],selection:$ui.languageCode) {
                ForEach(["en","ko","es"],id:\.self) { code in
                    Text(lesson.language(code)["name"]).tag(code)
                }
            }
        } label: { Image(systemName:"globe").font(.title3).frame(width:44,height:44) }
            .accessibilityLabel(words["language"]).accessibilityIdentifier("languageMenu")
    }
}

/// A child can pick an actual fruit target instead of having to read a menu.
struct OrchardTree: View {
    let fruitID: String
    let label: String
    let pick: () -> Void
    private let positions: [CGPoint] = [.init(x:0.28,y:0.35),.init(x:0.65,y:0.28),.init(x:0.48,y:0.50),.init(x:0.72,y:0.56),.init(x:0.23,y:0.63)]
    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            ZStack {
                Ellipse().fill(Color(red:0.80,green:0.86,blue:0.65)).frame(width:size.width*0.7,height:30).position(x:size.width/2,y:size.height*0.94)
                RoundedRectangle(cornerRadius:20).fill(Color(red:0.56,green:0.34,blue:0.20)).frame(width:45,height:size.height*0.58).position(x:size.width/2,y:size.height*0.65)
                ForEach(0..<3,id:\.self) { n in
                    Circle().fill(Color(red:0.28+Double(n)*0.025,green:0.51+Double(n)*0.03,blue:0.30))
                        .frame(width:size.width*0.55,height:size.width*0.55)
                        .position(x:size.width*(n == 0 ? 0.33 : n == 1 ? 0.65 : 0.5),y:size.height*(n == 2 ? 0.26 : 0.47))
                }
                ForEach(positions.indices,id:\.self) { index in
                    Button(action:pick) {
                        FruitMark(lemon:fruitID == "lemon").frame(width:57,height:62).padding(3)
                    }.buttonStyle(.plain).accessibilityLabel(label)
                        .accessibilityIdentifier("treeFruit\(index)")
                        .position(x:size.width*positions[index].x,y:size.height*positions[index].y)
                }
            }.accessibilityElement(children:.contain)
        }
    }
}

struct FruitMark: View {
    let lemon: Bool
    var body: some View {
        ZStack {
            Ellipse().fill(lemon ? Color(red:1,green:0.82,blue:0.22) : Color(red:0.90,green:0.30,blue:0.23))
                .frame(width:lemon ? 51 : 53,height:lemon ? 41 : 48).rotationEffect(.degrees(lemon ? -24 : 0))
                .overlay { Ellipse().stroke(Color.black.opacity(0.08),lineWidth:2).frame(width:lemon ? 51 : 53,height:lemon ? 41 : 48).rotationEffect(.degrees(lemon ? -24 : 0)) }
            Ellipse().fill(Color(red:0.19,green:0.40,blue:0.23)).frame(width:24,height:12).rotationEffect(.degrees(-35)).offset(x:12,y:-23)
            Capsule().fill(Color.white.opacity(0.40)).frame(width:7,height:18).rotationEffect(.degrees(24)).offset(x:-13,y:-4)
        }.accessibilityHidden(true)
    }
}

struct ExplorationView: View {
    let lesson: FruitLesson
    @Binding var languageCode: String
    @StateObject private var state: ExplorationState
    @StateObject private var ui = ExplorationUIState()
    private let ink = Color(red:0.12,green:0.25,blue:0.25)
    private let cream = Color(red:0.97,green:0.95,blue:0.89)
    init(lesson: FruitLesson, languageCode: Binding<String>) {
        self.lesson = lesson; _languageCode = languageCode
        _state = StateObject(wrappedValue:ExplorationState(seedCount:lesson.seedCount))
    }
    private var words: FruitLesson.Language { lesson.language(languageCode) }
    var body: some View {
        GeometryReader { geometry in
            let landscape = geometry.size.width > geometry.size.height
            VStack(spacing:12) {
                if landscape {
                    HStack(spacing:20) { stage; controls.frame(maxWidth:260) }
                } else { stage; controls }
            }.padding(landscape ? 14 : 18)
                .frame(maxWidth:1000,maxHeight:.infinity).frame(maxWidth:.infinity,maxHeight:.infinity)
                .foregroundStyle(ink).background(cream.ignoresSafeArea())
                .navigationTitle(words.fruitName).navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItemGroup(placement:.topBarTrailing) {
                        iconButton("questionmark",label:words["help"],id:"helpButton") { ui.showGuide = true }
                        iconButton("arrow.counterclockwise",label:words["reset"],id:"resetButton") { state.reset() }
                    }
                }
                .sheet(isPresented:$ui.showGuide) { guide }
                .sheet(isPresented:$ui.showLearning) { learning }
        }
    }
    private var stage: some View {
        ZStack {
            RoundedRectangle(cornerRadius:30).fill(.white.opacity(0.82))
            VStack(spacing:0) {
                Text(words["title"]).font(.system(.title3,design:.rounded,weight:.semibold))
                    .padding(.top,18).padding(.horizontal,18).multilineTextAlignment(.center)
                FruitSceneView(state:state,lesson:lesson,language:words)
                SeedDots(state:state,words:words).padding(.horizontal,12)
                Text(state.foundSeeds.count == state.seedCount ? words["allFound"] : words.found(state.foundSeeds.count,total:state.seedCount))
                    .font(.system(.callout,design:.rounded,weight:.semibold)).padding(.bottom,14)
                    .accessibilityIdentifier("seedProgress")
            }
        }.frame(maxWidth:.infinity,maxHeight:.infinity).clipShape(RoundedRectangle(cornerRadius:30))
    }
    private var controls: some View {
        VStack(spacing:10) {
            HStack(spacing:10) {
                Button {
                    state.beginRotation(touches:1); state.rotate(dx:75,dy:0,touches:1); state.end(.rotating)
                } label: {
                    Label(words["rotate"],systemImage:"arrow.triangle.2.circlepath")
                        .font(.system(.headline,design:.rounded)).frame(maxWidth:.infinity,minHeight:54)
                        .background(.white.opacity(0.75),in:RoundedRectangle(cornerRadius:18))
                }.buttonStyle(.plain).accessibilityIdentifier("turnButton").accessibilityHint(words["hintRotate"])
                Button { state.toggleOpen() } label: {
                    HStack { SplitSymbol(open:state.isOpen).frame(width:29,height:26)
                        Text(words[state.isOpen ? "close" : "open"]).font(.system(.headline,design:.rounded))
                    }.frame(maxWidth:.infinity,minHeight:54).background(Color(red:0.98,green:0.79,blue:0.29),in:RoundedRectangle(cornerRadius:18))
                }.buttonStyle(.plain).accessibilityIdentifier("splitButton").accessibilityHint(words["hintOpen"])
            }
            Text(words[state.isOpen ? "hintSeeds" : "hintRotate"]).font(.system(.caption,design:.rounded)).multilineTextAlignment(.center)
            Button { ui.showLearning = true } label: {
                Label(words["factsTitle"],systemImage:"book.pages.fill")
                    .font(.system(.headline,design:.rounded)).frame(maxWidth:.infinity,minHeight:48)
            }.buttonStyle(.plain).accessibilityIdentifier("learnButton")
        }.frame(maxWidth:600)
    }
    private func iconButton(_ symbol: String,label: String,id: String,action: @escaping () -> Void) -> some View {
        Button(action:action) { Image(systemName:symbol).font(.headline).frame(width:44,height:44) }
            .accessibilityLabel(label).accessibilityIdentifier(id)
    }
    private var guide: some View {
        ScrollView {
            VStack(spacing:22) {
                HStack { Text(words["help"]).font(.system(.title2,design:.rounded,weight:.bold)); Spacer()
                    iconButton("xmark",label:words["dismiss"],id:"dismissGuide") { ui.showGuide = false }
                }
                GestureDemo(kind:.rotate).frame(height:94)
                Text(words["hintRotate"]).font(.system(.body,design:.rounded))
                GestureDemo(kind:.split).frame(height:94)
                Text(words["hintOpen"]).font(.system(.body,design:.rounded))
                Label(words["hintSeeds"],systemImage:"hand.tap.fill").font(.system(.body,design:.rounded))
            }.padding(26)
        }.foregroundStyle(ink).presentationDetents([.medium,.large]).presentationDragIndicator(.visible)
    }
    private var learning: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    ForEach(Array(words.facts.enumerated()),id:\.element.id) { index, fact in
                        learningCard(symbol:["circle.lefthalf.filled","circle.grid.2x2.fill","leaf.fill"][index],title:fact.title,text:fact.text)
                    }
                    if !words["modelNote"].isEmpty {
                        Text(words["modelNote"]).font(.system(.caption,design:.rounded)).foregroundStyle(.secondary)
                    }
                    Text(words["storyTitle"]).font(.system(.title2,design:.rounded,weight:.bold)).padding(.top,12)
                    ForEach(Array(words.story.enumerated()),id:\.offset) { index, step in
                        learningCard(symbol:["tree.fill","camera.macro","sun.max.fill","fork.knife"][index%4],title:step.title,text:step.text)
                    }
                    if !words["origin"].isEmpty {
                        learningCard(symbol:"globe",title:words["originTitle"],text:words["origin"])
                    }
                }.padding(22)
            }.background(cream).navigationTitle(words["factsTitle"]).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement:.topBarTrailing) { Button(words["dismiss"]) { ui.showLearning = false } } }
        }.foregroundStyle(ink)
    }
    private func learningCard(symbol: String,title: String,text: String) -> some View {
        HStack(alignment:.top,spacing:16) {
            Image(systemName:symbol).font(.system(size:32)).frame(width:48,height:48).foregroundStyle(Color(red:0.33,green:0.53,blue:0.32)).accessibilityHidden(true)
            VStack(alignment:.leading,spacing:6) {
                Text(title).font(.system(.title3,design:.rounded,weight:.bold))
                Text(text).font(.system(.body,design:.rounded)).fixedSize(horizontal:false,vertical:true)
            }
        }.padding(18).frame(maxWidth:.infinity,alignment:.leading).background(.white,in:RoundedRectangle(cornerRadius:22))
    }
}

struct SeedDots: View {
    @ObservedObject var state: ExplorationState
    let words: FruitLesson.Language
    var body: some View {
        HStack(spacing:4) {
            ForEach(0..<state.seedCount,id:\.self) { index in
                Button { state.findSeed(index) } label: {
                    ZStack {
                        Circle().fill(state.foundSeeds.contains(index) ? Color(red:0.32,green:0.53,blue:0.40) : Color(red:0.91,green:0.89,blue:0.81))
                        if state.foundSeeds.contains(index) { Image(systemName:"checkmark").font(.system(size:14,weight:.heavy)).foregroundStyle(.white) }
                        else { Ellipse().fill(Color(red:0.44,green:0.29,blue:0.16)).frame(width:8,height:12) }
                    }.frame(width:26,height:26).frame(width:44,height:44)
                }.buttonStyle(.plain).disabled(!state.isOpen).accessibilityIdentifier("seedDot\(index)")
                    .accessibilityLabel("\(words["seed"]) \(index+1)")
                    .accessibilityValue(words[state.foundSeeds.contains(index) ? "foundSeed" : "waitingSeed"])
                    .accessibilityHint(words["hintSeeds"])
            }
        }.opacity(state.isOpen ? 1 : 0.45)
    }
}

struct SplitSymbol: View {
    let open: Bool
    var body: some View {
        HStack(spacing:open ? 9 : 2) {
            UnevenRoundedRectangle(topLeadingRadius:16,bottomLeadingRadius:16,bottomTrailingRadius:2,topTrailingRadius:2)
                .fill(Color(red:0.63,green:0.20,blue:0.13))
            UnevenRoundedRectangle(topLeadingRadius:2,bottomLeadingRadius:2,bottomTrailingRadius:16,topTrailingRadius:16)
                .fill(Color(red:0.63,green:0.20,blue:0.13))
        }.accessibilityHidden(true)
    }
}

struct GestureDemo: View {
    enum Kind { case rotate, split }
    let kind: Kind
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    var body: some View {
        TimelineView(.animation(minimumInterval:1/30,paused:reducedMotion)) { context in
            let phase = reducedMotion ? 1.0 : (sin(context.date.timeIntervalSinceReferenceDate * 2.1)+1)/2
            GeometryReader { geometry in
                ZStack {
                    RoundedRectangle(cornerRadius:22).fill(Color.white.opacity(0.65))
                    if kind == .rotate {
                        Image(systemName:"arrow.left.and.right").font(.title3).offset(y:-17)
                        finger.offset(x:(phase-0.5)*34,y:12)
                    } else {
                        Image(systemName:"arrow.left").offset(x:-38,y:-15)
                        Image(systemName:"arrow.right").offset(x:38,y:-15)
                        finger.offset(x:-10-phase*18,y:12)
                        finger.offset(x:10+phase*18,y:12)
                    }
                }.frame(width:geometry.size.width,height:geometry.size.height)
            }
        }.accessibilityHidden(true)
    }
    private var finger: some View {
        Capsule().fill(Color(red:0.22,green:0.38,blue:0.35)).frame(width:13,height:27)
            .overlay(alignment:.top) { Circle().fill(.white.opacity(0.7)).frame(width:5,height:5).padding(.top,5) }
    }
}
