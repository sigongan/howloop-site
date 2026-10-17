#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
verification_dir="$(mktemp -d /private/tmp/howloop-native-core.XXXXXX)"
trap 'rm -rf "$verification_dir"' EXIT
xcrun swiftc -module-cache-path "$verification_dir/ModuleCache" \
  Source/FruitContent.swift Source/ExplorationState.swift scripts/verify_core.swift \
  -o "$verification_dir/verify-core"
"$verification_dir/verify-core" ../../shared
