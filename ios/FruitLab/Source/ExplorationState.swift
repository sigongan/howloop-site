import Foundation
import Combine

/// Food-independent interaction state. A renderer only consumes these values.
@MainActor
final class ExplorationState: ObservableObject {
    enum GestureMode { case idle, rotating, splitting }
    @Published private(set) var split: Double = 0
    @Published private(set) var yaw: Double = -0.18
    @Published private(set) var pitch: Double = -0.08
    @Published private(set) var foundSeeds: Set<Int> = []
    private(set) var mode: GestureMode = .idle
    let seedCount: Int

    init(seedCount: Int = 5) { self.seedCount = seedCount }
    var isOpen: Bool { split >= 0.55 }
    var status: String {
        String(format: "split=%.3f;yaw=%.3f;pitch=%.3f;seeds=%d;mode=%@",
               split, yaw, pitch, foundSeeds.count, String(describing: mode))
    }
    func beginRotation(touches: Int) {
        guard touches == 1, mode != .splitting else { return }
        mode = .rotating
    }
    func rotate(dx: Double, dy: Double, touches: Int) {
        guard touches == 1, mode == .rotating else { return }
        yaw += dx * 0.008
        pitch = min(0.9, max(-0.9, pitch + dy * 0.006))
    }
    func beginSplit() { mode = .splitting }
    func scale(by scale: Double) {
        guard mode == .splitting, scale.isFinite, scale > 0 else { return }
        // Incremental logarithmic scale works even when starting fully closed.
        split = min(1, max(0, split + log(scale) * 0.85))
    }
    func end(_ endedMode: GestureMode) {
        if mode == endedMode { mode = .idle }
    }
    func toggleOpen() {
        split = isOpen ? 0 : 1
        yaw = -0.08
        pitch = -0.06
        mode = .idle
    }
    func findSeed(_ id: Int) {
        guard isOpen, (0..<seedCount).contains(id) else { return }
        foundSeeds.insert(id)
    }
    func reset() {
        split = 0; yaw = -0.18; pitch = -0.08
        foundSeeds.removeAll(); mode = .idle
    }
}
