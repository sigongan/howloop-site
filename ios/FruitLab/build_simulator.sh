#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
build_dir="${HOWLOOP_DERIVED_DATA:-/private/tmp/howloop-native-build}"
xcodebuild -project FruitLab.xcodeproj -scheme FruitLab -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$build_dir" CODE_SIGNING_ALLOWED=NO build-for-testing
