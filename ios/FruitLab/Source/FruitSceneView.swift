import SwiftUI
import SceneKit

struct FruitSceneView: UIViewRepresentable {
    @ObservedObject var state: ExplorationState
    let lesson: FruitLesson
    let language: FruitLesson.Language
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    func makeCoordinator() -> Coordinator { Coordinator(state:state, fruitID:lesson.id, seedCount:lesson.seedCount) }
    func makeUIView(context: Context) -> StageView {
        let view = StageView()
        view.scene = context.coordinator.renderer.scene
        view.pointOfView = context.coordinator.renderer.cameraNode
        view.backgroundColor = .clear
        view.antialiasingMode = .multisampling4X
        view.preferredFramesPerSecond = 60
        view.isPlaying = true
        view.allowsCameraControl = false
        view.isAccessibilityElement = true
        view.accessibilityIdentifier = "fruitStage"
        view.accessibilityLabel = language.label("stageLabel", fallback:"title")
        view.accessibilityHint = language.label("stageHint", fallback:"hintRotate")
        view.onResize = { [weak coordinator = context.coordinator] size in coordinator?.renderer.resize(size) }
        let pan = UIPanGestureRecognizer(target:context.coordinator,action:#selector(Coordinator.pan(_:)))
        pan.minimumNumberOfTouches = 1; pan.maximumNumberOfTouches = 1
        let pinch = UIPinchGestureRecognizer(target:context.coordinator,action:#selector(Coordinator.pinch(_:)))
        let tap = UITapGestureRecognizer(target:context.coordinator,action:#selector(Coordinator.tap(_:)))
        pan.delegate = context.coordinator; pinch.delegate = context.coordinator
        tap.require(toFail:pan); tap.require(toFail:pinch)
        view.addGestureRecognizer(pan); view.addGestureRecognizer(pinch); view.addGestureRecognizer(tap)
        context.coordinator.view = view
        return view
    }
    func updateUIView(_ view: StageView, context: Context) {
        context.coordinator.state = state
        context.coordinator.renderer.update(state,reducedMotion:reducedMotion)
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            let coordinates = (0..<state.seedCount).compactMap { id -> String? in
                guard let node = context.coordinator.renderer.food.root.childNode(withName:"seed-\(id)",recursively:true),
                      view.bounds.width > 0, view.bounds.height > 0 else { return nil }
                let p = view.projectPoint(node.worldPosition)
                return String(format:"seed%d=%.4f,%.4f",id,Double(p.x)/view.bounds.width,Double(p.y)/view.bounds.height)
            }.joined(separator:";")
            view.accessibilityValue = coordinates
        } else {
            view.accessibilityLabel = language.label("stageLabel", fallback:"title")
            view.accessibilityHint = language.label("stageHint", fallback:"hintRotate")
            view.accessibilityValue = language.found(state.foundSeeds.count,total:state.seedCount)
        }
    }
    final class StageView: SCNView {
        var onResize: ((CGSize) -> Void)?
        override func layoutSubviews() { super.layoutSubviews(); onResize?(bounds.size) }
    }
    @MainActor final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var state: ExplorationState
        let renderer: FoodScene
        weak var view: StageView?
        init(state: ExplorationState, fruitID: String, seedCount: Int) {
            self.state = state
            self.renderer = FoodScene(food: AppleFood(fruitID:fruitID,seedCount:seedCount))
        }
        @objc func pan(_ g: UIPanGestureRecognizer) {
            switch g.state {
            case .began: state.beginRotation(touches:g.numberOfTouches)
            case .changed:
                let d = g.translation(in:g.view)
                state.rotate(dx:d.x,dy:d.y,touches:g.numberOfTouches)
            case .ended,.cancelled,.failed: state.end(.rotating)
            default: break
            }
            g.setTranslation(.zero,in:g.view)
        }
        @objc func pinch(_ g: UIPinchGestureRecognizer) {
            switch g.state {
            case .began: state.beginSplit()
            case .changed: state.scale(by:g.scale)
            case .ended,.cancelled,.failed: state.end(.splitting)
            default: break
            }
            g.scale = 1
        }
        @objc func tap(_ g: UITapGestureRecognizer) {
            guard state.isOpen, let view else { return }
            let point = g.location(in:view)
            // Allow a small touch halo around seeds without selecting hidden/back-facing seeds.
            var candidates: [(Int,CGFloat)] = []
            for dx in stride(from:-18,through:18,by:9) {
                for dy in stride(from:-18,through:18,by:9) {
                    let p = CGPoint(x:point.x+CGFloat(dx),y:point.y+CGFloat(dy))
                    guard let first = view.hitTest(p,options:[.searchMode:SCNHitTestSearchMode.closest.rawValue]).first,
                          let name = first.node.name, name.hasPrefix("seed-"), let id = Int(name.dropFirst(5)) else { continue }
                    candidates.append((id,CGFloat(dx*dx+dy*dy)))
                }
            }
            if let candidate = candidates.min(by:{ $0.1 < $1.1 }) { state.findSeed(candidate.0) }
        }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool { false }
    }
}

