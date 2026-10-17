import SceneKit
import UIKit

@MainActor
protocol ExplorableFood {
    var root: SCNNode { get }
    var seedCount: Int { get }
    func update(split: Double, foundSeeds: Set<Int>, reducedMotion: Bool)
}

@MainActor
final class AppleFood: ExplorableFood {
    let root = SCNNode()
    let seedCount: Int
    let left = SCNNode(), right = SCNNode()
    private var seedNodes: [Int: SCNNode] = [:]
    init(fruitID: String = "apple", seedCount: Int = 5) {
        self.seedCount = seedCount
        let lemon = fruitID == "lemon"
        left.geometry = AppleMesh.geometry(right:false, lemon:lemon)
        right.geometry = AppleMesh.geometry(right:true, lemon:lemon)
        root.addChildNode(left); root.addChildNode(right)
        // A softly rounded stem and procedural leaf, attached to their own half.
        let stem = SCNNode(geometry:SCNCapsule(capRadius:0.055,height:0.40))
        stem.geometry?.firstMaterial?.diffuse.contents = UIColor(red:0.30,green:0.17,blue:0.07,alpha:1)
        stem.position = SCNVector3(0.045,lemon ? 1.28 : 1.04,0)
        stem.eulerAngles.z = -0.18
        right.addChildNode(stem)
        let leaf = SCNNode(geometry:SCNSphere(radius:0.25))
        leaf.scale = SCNVector3(1.6,0.15,0.58)
        leaf.position = SCNVector3(0.34,lemon ? 1.39 : 1.15,-0.015)
        leaf.eulerAngles.z = 0.42
        leaf.geometry?.firstMaterial?.diffuse.contents = UIColor(red:0.20,green:0.40,blue:0.18,alpha:1)
        leaf.geometry?.firstMaterial?.roughness.contents = 0.65
        right.addChildNode(leaf)
        let positions: [(Float,Float)] = [(-0.29,-0.10),(0.02,-0.19),(0.29,-0.09),(-0.17,0.16),(0.20,0.17)]
        for (id, yz) in positions.prefix(seedCount).enumerated() {
            let parent = id < 3 ? left : right
            let direction: Float = id < 3 ? 1 : -1
            let pocket = SCNNode(geometry:SCNSphere(radius:0.14))
            pocket.scale = SCNVector3(0.065,1.2,0.82)
            pocket.position = SCNVector3(direction*0.008,yz.0,yz.1)
            pocket.geometry?.firstMaterial?.diffuse.contents = UIColor(red:0.66,green:0.46,blue:0.24,alpha:1)
            parent.addChildNode(pocket)
            let seed = SCNNode(geometry:SCNSphere(radius:0.105))
            seed.name = "seed-\(id)"
            seed.scale = SCNVector3(0.33,1.1,0.66)
            seed.position = SCNVector3(direction*0.036,yz.0,yz.1)
            seed.eulerAngles.x = id % 2 == 0 ? 0.25 : -0.30
            seed.geometry?.firstMaterial?.diffuse.contents = lemon ? UIColor(red:0.92,green:0.84,blue:0.55,alpha:1) : UIColor(red:0.24,green:0.10,blue:0.035,alpha:1)
            seed.geometry?.firstMaterial?.roughness.contents = 0.28
            parent.addChildNode(seed); seedNodes[id] = seed
        }
    }
    func update(split: Double, foundSeeds: Set<Int>, reducedMotion: Bool) {
        let v = Float(split)
        left.position.x = -v * 1.16; right.position.x = v * 1.16
        left.eulerAngles.y = -v * 1.05; right.eulerAngles.y = v * 1.05
        for (id,node) in seedNodes {
            let found = foundSeeds.contains(id)
            node.geometry?.firstMaterial?.emission.contents = found ? UIColor(red:0.86,green:0.63,blue:0.18,alpha:1) : UIColor.black
            // Shape changes as well as color, making discovery legible in grayscale.
            let scale: Float = found ? 1.22 : 1
            node.scale = SCNVector3(0.33*scale,1.1*scale,0.66*scale)
        }
    }
}

@MainActor
final class FoodScene {
    let scene = SCNScene()
    let food: any ExplorableFood
    let pivot = SCNNode()
    let cameraNode = SCNNode()
    private var viewport = CGSize(width:1,height:1)
    private var currentSplit = 0.0
    init(food suppliedFood: (any ExplorableFood)? = nil) {
        let food = suppliedFood ?? AppleFood()
        self.food = food
        scene.background.contents = UIColor.clear
        scene.rootNode.addChildNode(pivot); pivot.addChildNode(food.root)
        let camera = SCNCamera(); camera.usesOrthographicProjection = true
        camera.wantsHDR = true
        camera.wantsExposureAdaptation = false
        camera.exposureOffset = -0.4
        camera.orthographicScale = 3.05; camera.zNear = 0.1; camera.zFar = 30
        cameraNode.camera = camera; cameraNode.position = SCNVector3(0,0.10,7)
        scene.rootNode.addChildNode(cameraNode)
        func light(_ type: SCNLight.LightType, _ color: UIColor, _ intensity: CGFloat, _ position: SCNVector3) {
            let n = SCNNode(); n.light = SCNLight(); n.light?.type = type
            n.light?.color = color; n.light?.intensity = intensity; n.position = position
            if type == .omni { n.light?.attenuationStartDistance = 5; n.light?.attenuationEndDistance = 14 }
            scene.rootNode.addChildNode(n)
        }
        light(.ambient,UIColor(red:0.96,green:0.94,blue:0.88,alpha:1),150,SCNVector3Zero)
        light(.omni,.white,700,SCNVector3(-3,4,5))
        light(.omni,UIColor(red:1,green:0.83,blue:0.67,alpha:1),250,SCNVector3(3,1,-3))
    }
    func update(_ state: ExplorationState, reducedMotion: Bool) {
        SCNTransaction.begin()
        SCNTransaction.animationDuration = state.mode == .idle && !reducedMotion ? 0.35 : 0
        pivot.eulerAngles = SCNVector3(Float(state.pitch),Float(state.yaw),0)
        food.update(split:state.split,foundSeeds:state.foundSeeds,reducedMotion:reducedMotion)
        currentSplit = state.split
        fitCamera()
        SCNTransaction.commit()
    }
    func resize(_ size: CGSize) {
        guard size.width > 0 && size.height > 0 else { return }
        viewport = size
        fitCamera()
    }
    private func fitCamera() {
        let scale = 1.62 + currentSplit * 0.85
        cameraNode.camera?.orthographicScale = max(1.48,scale * Double(viewport.height/viewport.width))
    }
}
