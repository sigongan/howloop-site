#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
if [[ $# -ne 1 ]]; then
  print -u2 'Usage: ./test_simulator.sh <available simulator UDID>'
  exit 2
fi
build_dir="${HOWLOOP_DERIVED_DATA:-/private/tmp/howloop-native-build}"
xcodebuild -project FruitLab.xcodeproj -scheme FruitLab -configuration Debug \
  -destination "platform=iOS Simulator,id=$1" -derivedDataPath "$build_dir" \
  -only-testing:FruitLabTests -parallel-testing-enabled NO \
  ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO test
