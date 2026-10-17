# Howloop for iPhone and iPad

This is the native part of the Howloop food playground. The Xcode project and existing prototype bundle identifier retain the internal name `FruitLab`; the provisional visible app name is **Howloop**. The website remains Howloop; the final app name will be chosen separately.

## Shared learning content

The native app and website author lessons in the same files:

- `../../shared/lemon.json`
- `../../shared/apple.json`

Xcode bundles these files directly through `SOURCE_ROOT` resource references. The header also bundles `../../web/apple-touch-icon.png` directly, so it uses the exact smiling yellow-lemon logo shown on the website without an independently authored copy. The launcher icon asset catalog is not changed by this header update. Do not copy or separately translate the lessons inside `Source/`. `FruitContent.swift` decodes and validates the schema, selects English, Korean or Spanish, and supplies every fact and growth-story card. Unsupported system languages fall back to English. The in-app language choice lasts only for the current session.

The prototype contains a lemon-first orchard, tappable fruit, a shake action, a close-up SceneKit exploration with turn/spread/pinch and button alternatives, five discoverable seeds, and short learning cards including the shared fruit-origin explanation, model note and playground subtitle. Models are stylised learning illustrations, not scans or an assertion that every real fruit contains five seeds. No account, analytics SDK, microphone, network request, advertising SDK or persistent child profile is included.

## Verify

`./verify_core.sh` compiles and executes the shared-content decoder and actual native interaction state on macOS. It checks locale fallback, malformed schema rejection, facts/stories, seed uniqueness, bounds, reset, gesture ownership and progressive opening.

`./build_simulator.sh` builds the app and test binaries for the generic iOS Simulator SDK without signing or installing anything. It writes only to `/private/tmp/howloop-native-build` by default; set `HOWLOOP_DERIVED_DATA` to choose another build folder.

When a simulator runtime is available, `./test_simulator.sh <simulator-UDID>` runs the unit-test target. Unit tests include closed-mesh checks for apple and lemon and verify that shared files are bundled. `UITests/` contains an optional developer-run smoke test. A build-for-testing result does not mean these simulator tests were executed.

Open `FruitLab.xcodeproj` from this monorepo, keeping the `shared/` directory in place. The original standalone prototype was left untouched. No signing identities, provisioning profiles, device build products or personal Xcode workspace data were copied into this project.
