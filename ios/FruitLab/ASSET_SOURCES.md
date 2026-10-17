# Asset sources and provenance

The header logo is bundled directly from the shared web brand asset. Native scene geometry and textures remain procedural; no downloaded models, photographs, fonts, sounds, or external asset packs are used.

| Asset | Origin | Location |
|---|---|---|
| Smiling yellow-lemon header logo | Same canonical web brand asset; copied by Xcode resources at build time | `../../web/apple-touch-icon.png` |
| Apple and lemon halves, closed flesh planes, UVs, surface normals | Original mathematical geometry authored for this prototype | `Source/AppleMesh.swift` |
| Red skin speckles and stripes | Original deterministic Core Graphics texture, random seed 314159 | `AppleTextures.skin` |
| Cream flesh, subtle grain, vascular core fibers | Original deterministic Core Graphics texture | `AppleTextures.flesh` |
| Lemon rind and lengthwise pulp texture | Original deterministic Core Graphics texture | `LemonTextures` |
| Orchard, leaves and fruit targets | Original SwiftUI shapes, no downloaded art | `OrchardTree`, `FruitMark` |
| Seeds, seed pockets, stem, leaf | Original scene composition of Apple SceneKit primitives | `Source/FoodScene.swift` |
| Gesture fingers and split illustration | Original SwiftUI shapes and movement | `Source/FruitLabApp.swift` |
| UI symbols | Apple SF Symbols, rendered by the system inside a native Apple-platform app | `Image(systemName:)` calls |
| Typography | Apple system rounded typeface | SwiftUI system font calls |

Apple framework references: [SceneKit](https://developer.apple.com/documentation/scenekit), [SwiftUI](https://developer.apple.com/documentation/swiftui), [SF Symbols](https://developer.apple.com/sf-symbols/). No third-party asset license or attribution is required by the original procedural assets. Apple framework and symbol usage remains subject to Apple's platform terms. No external software or assets were purchased.
