import SceneKit
import UIKit

/// Indexed, closed half-apple geometry. Both skin and cut face exist at all times.
/// The two material groups share boundary positions; no clipping/hiding is used.
@MainActor
enum AppleMesh {
    struct MeshData {
        var vertices: [SCNVector3]
        var normals: [SCNVector3]
        var uv: [CGPoint]
        var skin: [Int32]
        var flesh: [Int32]
    }
    static func surface(theta: Double, phi: Double, lemon: Bool = false) -> SCNVector3 {
        if lemon {
            let radius = sin(theta) * (0.91 + 0.07 * sin(theta))
            let y = 1.32 * cos(theta)
            return SCNVector3(radius * cos(phi), y, radius * sin(phi))
        }
        let s = sin(theta)
        let radius = s * (1.02 + 0.11 * s + 0.055 * cos(theta))
            * (1 + 0.035 * cos(5 * phi) * s * s)
        let y = 1.12 * cos(theta) - 0.20 * exp(-theta * theta / 0.10)
            + 0.075 * exp(-pow(theta - .pi, 2) / 0.08)
        return SCNVector3(radius * cos(phi), y, radius * sin(phi))
    }
    static func data(right: Bool, vertical: Int = 56, around: Int = 64, lemon: Bool = false) -> MeshData {
        precondition(vertical >= 4 && around >= 4)
        var m = MeshData(vertices: [], normals: [], uv: [], skin: [], flesh: [])
        let start = right ? -Double.pi / 2 : Double.pi / 2
        func add(_ v: SCNVector3, _ n: SCNVector3, _ uv: CGPoint) -> Int32 {
            let i = Int32(m.vertices.count)
            m.vertices.append(v); m.normals.append(n); m.uv.append(uv); return i
        }
        func normal(_ t: Double, _ p: Double) -> SCNVector3 {
            let a = surface(theta: max(0, t - 0.0001), phi: p, lemon:lemon)
            let b = surface(theta: min(.pi, t + 0.0001), phi: p, lemon:lemon)
            let c = surface(theta: t, phi: p - 0.0001, lemon:lemon)
            let d = surface(theta: t, phi: p + 0.0001, lemon:lemon)
            let u = SCNVector3(b.x-a.x, b.y-a.y, b.z-a.z)
            let v = SCNVector3(d.x-c.x, d.y-c.y, d.z-c.z)
            let n = SCNVector3(v.y*u.z-v.z*u.y, v.z*u.x-v.x*u.z, v.x*u.y-v.y*u.x)
            let len = sqrt(n.x*n.x+n.y*n.y+n.z*n.z)
            return SCNVector3(n.x/len, n.y/len, n.z/len)
        }
        let top = add(surface(theta: 0, phi: start, lemon:lemon), SCNVector3(0,1,0), CGPoint(x:0.5,y:0))
        var rings: [[Int32]] = []
        for j in 1..<vertical {
            let t = Double(j) / Double(vertical) * .pi
            var ring: [Int32] = []
            for k in 0...around {
                let p = start + Double(k) / Double(around) * .pi
                ring.append(add(surface(theta: t, phi: p, lemon:lemon), normal(t,p),
                                CGPoint(x:(p + .pi/2)/(2 * .pi),y:t / .pi)))
            }
            rings.append(ring)
        }
        let bottom = add(surface(theta: .pi, phi: start, lemon:lemon), SCNVector3(0,-1,0), CGPoint(x:0.5,y:1))
        for k in 0..<around { m.skin += [top, rings[0][k], rings[0][k+1]] }
        for j in 0..<(rings.count-1) {
            for k in 0..<around {
                let a = rings[j][k], b = rings[j+1][k], c = rings[j+1][k+1], d = rings[j][k+1]
                m.skin += [a,b,c,a,c,d]
            }
        }
        for k in 0..<around { m.skin += [rings.last![k], bottom, rings.last![k+1]] }
        // Duplicate edge vertices for the flat cut normal and independent flesh UVs.
        let capNormal = SCNVector3(right ? -1 : 1, 0, 0)
        let center = add(SCNVector3Zero, capNormal, CGPoint(x:0.5,y:0.5))
        let outline = [top] + rings.map { $0[0] } + [bottom] + rings.reversed().map { $0[around] }
        let edge: [Int32] = outline.map { i in
            let v = m.vertices[Int(i)]
            return add(v, capNormal, CGPoint(x:CGFloat(v.z)/2.5+0.5,y:0.5-CGFloat(v.y)/2.5))
        }
        for i in edge.indices { m.flesh += [center, edge[(i+1)%edge.count], edge[i]] }
        // The parameterization winds inward. Reverse every triangle for a
        // consistent outward orientation (also useful for future mesh exports).
        for i in stride(from:0,to:m.skin.count,by:3) { m.skin.swapAt(i+1,i+2) }
        for i in stride(from:0,to:m.flesh.count,by:3) { m.flesh.swapAt(i+1,i+2) }
        return m
    }
    static func geometry(right: Bool, lemon: Bool = false) -> SCNGeometry {
        let d = data(right: right, lemon:lemon)
        func element(_ indices: [Int32]) -> SCNGeometryElement {
            SCNGeometryElement(data: indices.withUnsafeBytes { Data($0) }, primitiveType: .triangles,
                               primitiveCount: indices.count/3, bytesPerIndex: MemoryLayout<Int32>.size)
        }
        let g = SCNGeometry(sources: [SCNGeometrySource(vertices:d.vertices),
                                     SCNGeometrySource(normals:d.normals), SCNGeometrySource(textureCoordinates:d.uv)],
                            elements:[element(d.skin),element(d.flesh)])
        let skin = SCNMaterial()
        skin.diffuse.contents = lemon ? lemonTextures.skin : textures.skin
        skin.lightingModel = .physicallyBased
        skin.roughness.contents = 0.48
        skin.metalness.contents = 0
        skin.isDoubleSided = true
        let flesh = SCNMaterial()
        flesh.diffuse.contents = lemon ? lemonTextures.flesh : textures.flesh
        // Preserve the ivory grain and vascular fibers under every rotation.
        // This matte cut face uses its baked color; skin/seeds retain 3D lighting.
        flesh.lightingModel = .constant
        flesh.roughness.contents = 0.85
        flesh.isDoubleSided = true
        g.materials = [skin,flesh]
        return g
    }
    @MainActor static let textures = AppleTextures()
    @MainActor static let lemonTextures = LemonTextures()
}

/// Deterministic, original textures, generated offline on device.
@MainActor
struct AppleTextures {
    let skin: UIImage
    let flesh: UIImage
    init() {
        var seed: UInt64 = 314159
        func random() -> CGFloat {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            return CGFloat(seed >> 33) / CGFloat(UInt32.max >> 1)
        }
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        skin = UIGraphicsImageRenderer(size:CGSize(width:1024,height:512),format:format).image { ctx in
            let c = ctx.cgContext
            for x in 0..<1024 {
                let wave = sin(Double(x)*0.031) * sin(Double(x)*0.117)
                c.setFillColor(UIColor(red:0.71+wave*0.065,green:0.10+wave*0.035,blue:0.075,alpha:1).cgColor)
                c.fill(CGRect(x:x,y:0,width:1,height:512))
            }
            for _ in 0..<4800 {
                let x = random()*1024, y = random()*512, r = 0.45+random()*1.1
                c.setFillColor(UIColor(red:1,green:0.80,blue:0.43,alpha:0.18+random()*0.18).cgColor)
                c.fillEllipse(in:CGRect(x:x,y:y,width:r,height:r*1.4))
            }
        }
        flesh = UIGraphicsImageRenderer(size:CGSize(width:768,height:768),format:format).image { ctx in
            let c = ctx.cgContext
            c.setFillColor(UIColor(red:0.98,green:0.91,blue:0.72,alpha:1).cgColor)
            c.fill(CGRect(x:0,y:0,width:768,height:768))
            for _ in 0..<13000 {
                let x = random()*768,y = random()*768
                c.setFillColor(UIColor(red:0.70,green:0.53,blue:0.27,alpha:0.02+random()*0.055).cgColor)
                c.fillEllipse(in:CGRect(x:x,y:y,width:1+random()*3,height:1+random()*5))
            }
            // Fibrous vascular core drawn in the cut plane, rather than a white sphere.
            let core = UIBezierPath()
            core.move(to:CGPoint(x:384,y:98))
            core.addCurve(to:CGPoint(x:384,y:665),controlPoint1:CGPoint(x:310,y:265),controlPoint2:CGPoint(x:309,y:504))
            core.addCurve(to:CGPoint(x:384,y:98),controlPoint1:CGPoint(x:463,y:509),controlPoint2:CGPoint(x:462,y:264))
            UIColor(red:0.84,green:0.73,blue:0.47,alpha:0.42).setFill(); core.fill()
            for _ in 0..<90 {
                let offset = random()*65-32
                let path = UIBezierPath(); path.move(to:CGPoint(x:384+offset*0.2,y:112))
                path.addCurve(to:CGPoint(x:384+offset*0.2,y:648),controlPoint1:CGPoint(x:384+offset,y:310),controlPoint2:CGPoint(x:384+offset,y:462))
                UIColor(red:0.64,green:0.48,blue:0.24,alpha:0.06).setStroke(); path.lineWidth = 1; path.stroke()
            }
        }
    }
}

/// A stylised lengthwise lemon section: yellow rind, pale pith and juicy segments.
@MainActor
struct LemonTextures {
    let skin: UIImage
    let flesh: UIImage
    init() {
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        skin = UIGraphicsImageRenderer(size:CGSize(width:512,height:512),format:format).image { ctx in
            UIColor(red:0.98,green:0.78,blue:0.16,alpha:1).setFill()
            ctx.fill(CGRect(x:0,y:0,width:512,height:512))
            for row in 0..<45 { for col in 0..<45 {
                UIColor(red:0.76,green:0.57,blue:0.06,alpha:0.14).setFill()
                ctx.cgContext.fillEllipse(in:CGRect(x:col*12+(row%2)*5,y:row*12,width:2,height:3))
            }}
        }
        flesh = UIGraphicsImageRenderer(size:CGSize(width:768,height:768),format:format).image { ctx in
            let c = ctx.cgContext
            UIColor(red:1,green:0.97,blue:0.76,alpha:1).setFill(); ctx.fill(CGRect(x:0,y:0,width:768,height:768))
            UIColor(red:1,green:0.86,blue:0.34,alpha:1).setFill()
            c.fillEllipse(in:CGRect(x:112,y:18,width:544,height:732))
            for side in [-1.0,1.0] {
                for line in 0..<21 {
                    let y = 62.0 + Double(line)*31
                    let path = UIBezierPath(); path.move(to:CGPoint(x:384,y:y))
                    path.addQuadCurve(to:CGPoint(x:384+side*230,y:y+35),controlPoint:CGPoint(x:384+side*120,y:y-12))
                    UIColor(red:1,green:0.97,blue:0.75,alpha:0.48).setStroke(); path.lineWidth = 2; path.stroke()
                }
            }
            UIColor(red:1,green:0.97,blue:0.76,alpha:1).setFill()
            c.fillEllipse(in:CGRect(x:365,y:16,width:38,height:736))
        }
    }
}
