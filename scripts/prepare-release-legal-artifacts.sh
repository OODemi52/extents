#!/usr/bin/env bash

set -euo pipefail

release_name="${1:?usage: prepare-release-legal-artifacts.sh <release-name> [source-ref] [output-directory]}"
source_ref="${2:-HEAD}"
output_directory="${3:-legal-dist}"
repository_root="$(git rev-parse --show-toplevel)"
artifact_label="${release_name//\//-}"
archive_root="Extents-$artifact_label"

locked_rawler_field() {
  local field="$1"

  tar -xOzf "$extents_source_archive" "$archive_root/src-tauri/Cargo.lock" |
    awk -v requested_field="$field" '
      $0 == "[[package]]" { package_name = "" }
      $1 == "name" && $2 == "=" {
        package_name = $3
        gsub(/\"/, "", package_name)
      }
      package_name == "rawler" && $1 == requested_field && $2 == "=" {
        value = $3
        gsub(/\"/, "", value)
        print value
      }
    '
}

calculate_sha256() {
  local path="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{ print $1 }'
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$path" | awk '{ print $1 }'
    return
  fi

  echo "No SHA-256 checksum utility is available" >&2
  exit 1
}

if ! git -C "$repository_root" cat-file -e "$source_ref^{commit}"; then
  echo "Git source reference not found: $source_ref" >&2
  exit 1
fi

if [[ -e "$output_directory" ]]; then
  echo "Output directory already exists: $output_directory" >&2
  exit 1
fi

mkdir -p "$output_directory"

extents_source_archive="$output_directory/Extents-$artifact_label-source.tar.gz"

git -C "$repository_root" archive \
  --format=tar.gz \
  --prefix="$archive_root/" \
  --output="$extents_source_archive" \
  "$source_ref"

if ! tar -tzf "$extents_source_archive" "$archive_root/src-tauri/Cargo.lock" >/dev/null; then
  echo "Extents source archive does not contain src-tauri/Cargo.lock" >&2
  exit 1
fi

rawler_version="$(locked_rawler_field version)"
rawler_source="$(locked_rawler_field source)"
rawler_checksum="$(locked_rawler_field checksum)"

if [[ -z "$rawler_version" ]]; then
  echo "No resolved Rawler version was found in the release Cargo.lock" >&2
  exit 1
fi

if [[ "$rawler_source" != "registry+https://github.com/rust-lang/crates.io-index" ]]; then
  echo "Unsupported Rawler package source: $rawler_source" >&2
  echo "Update this script to package the exact configured Rawler source" >&2
  exit 1
fi

if [[ -z "$rawler_checksum" ]]; then
  echo "No crates.io checksum was recorded for Rawler $rawler_version" >&2
  exit 1
fi

rawler_source_archive="$output_directory/rawler-$rawler_version.crate"

curl \
  --fail \
  --location \
  --retry 3 \
  --show-error \
  --silent \
  --output "$rawler_source_archive" \
  "https://static.crates.io/crates/rawler/rawler-$rawler_version.crate"

downloaded_rawler_checksum="$(calculate_sha256 "$rawler_source_archive")"

if [[ "$downloaded_rawler_checksum" != "$rawler_checksum" ]]; then
  echo "Downloaded Rawler source does not match the Cargo.lock checksum" >&2
  exit 1
fi

if ! tar -tzf "$rawler_source_archive" "rawler-$rawler_version/LICENSE" >/dev/null; then
  echo "Downloaded Rawler source archive does not contain the expected license" >&2
  exit 1
fi

if ! cmp -s \
  <(tar -xOzf "$rawler_source_archive" "rawler-$rawler_version/LICENSE") \
  "$repository_root/legal/LGPL-2.1.txt"; then
  echo "Bundled LGPL-2.1 text does not match Rawler's distributed license" >&2
  exit 1
fi

cp "$repository_root/legal/THIRD_PARTY_NOTICES.md" \
  "$output_directory/THIRD_PARTY_NOTICES.md"
cp "$repository_root/legal/LICENSING.md" \
  "$output_directory/EXTENTS-LICENSING.md"
cp "$repository_root/legal/LGPL-2.1.txt" \
  "$output_directory/RAWLER-LGPL-2.1.txt"
cp "$repository_root/legal/RELINKING.md" \
  "$output_directory/RAWLER-RELINKING.md"

(
  cd "$output_directory"

  for artifact in ./*; do
    if [[ "$artifact" == "./SHA256SUMS.txt" ]]; then
      continue
    fi

    checksum="$(calculate_sha256 "$artifact")"
    printf '%s  %s\n' "$checksum" "${artifact#./}"
  done > SHA256SUMS.txt
)

echo "Prepared legal release artifacts for Extents $release_name with Rawler $rawler_version"
