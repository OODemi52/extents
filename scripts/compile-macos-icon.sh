#!/usr/bin/env bash

set -euo pipefail

icon_name="ExtentsIcon"
minimum_deployment_target="10.13"
script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(dirname "$script_directory")"
icon_source="$repository_root/src-tauri/mac-assets/$icon_name.icon"
generated_directory="$repository_root/src-tauri/mac-assets/generated"
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/extents-icon.XXXXXX")"

cleanup() {
  rm -rf "$temporary_directory"
}

trap cleanup EXIT

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Icon Composer assets can only be compiled on macOS" >&2
  exit 1
fi

if [[ ! -d "$icon_source" ]]; then
  echo "Icon Composer source not found: $icon_source" >&2
  exit 1
fi

if ! xcrun --find actool >/dev/null; then
  echo "Xcode's asset compiler is unavailable" >&2
  exit 1
fi

xcrun actool "$icon_source" \
  --compile "$temporary_directory" \
  --platform macosx \
  --minimum-deployment-target "$minimum_deployment_target" \
  --app-icon "$icon_name" \
  --output-partial-info-plist "$temporary_directory/partial-info.plist" \
  >/dev/null

for generated_file in Assets.car "$icon_name.icns"; do
  if [[ ! -f "$temporary_directory/$generated_file" ]]; then
    echo "Icon compilation did not produce $generated_file" >&2
    exit 1
  fi
done

compiled_icon_name="$(
  /usr/libexec/PlistBuddy \
    -c "Print :CFBundleIconName" \
    "$temporary_directory/partial-info.plist"
)"

if [[ "$compiled_icon_name" != "$icon_name" ]]; then
  echo "Compiled icon name $compiled_icon_name does not match $icon_name" >&2
  exit 1
fi

mkdir -p "$generated_directory"
install -m 0644 "$temporary_directory/Assets.car" "$generated_directory/Assets.car"
install -m 0644 \
  "$temporary_directory/$icon_name.icns" \
  "$generated_directory/$icon_name.icns"

echo "Prepared macOS app icon assets for $icon_name"
