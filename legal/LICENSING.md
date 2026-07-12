# Licensing and Third-Party Software

Extents' original source code is distributed under the MIT License. The MIT
license text is available in the repository's root [`LICENSE`](../LICENSE)
file.

Third-party dependencies bundled with or compiled into Extents remain subject
to their own licenses. [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
identifies dependencies that require additional distribution materials.

## Rawler

Extents currently uses Rawler for RAW sensor decoding and metadata extraction.
Rawler is licensed under the GNU Lesser General Public License, version 2.1.
The Extents Rust application currently links Rawler into its distributed
application binaries.

Every Extents binary release is intended to include or accompany:

- The LGPL-2.1 license text.
- The corresponding source archive for the exact Rawler version selected by
  `src-tauri/Cargo.lock`.
- An archive of the exact Extents source used for the build.
- Instructions for rebuilding Extents against a modified Rawler source tree.

These materials are attached to the same GitHub release as the application
binaries and are also included in the installed application's legal resources
where applicable.

See [`RELINKING.md`](RELINKING.md) for the rebuild procedure.

## Dependency Records

The resolved Rust dependency graph is recorded in `src-tauri/Cargo.lock`, and
the resolved JavaScript dependency graph is recorded in `package-lock.json`.
Release source archives preserve both files so dependency versions can be tied
to a specific distributed build.

## Existing Releases

Existing releases that distribute Extents binaries must retain matching source
and license materials. Generate the materials from the release tag and upload
them to that release:

```sh
./scripts/prepare-release-legal-artifacts.sh <tag> <tag>
gh release upload <tag> legal-dist/* --clobber
```

Use a clean output directory for each release. If matching materials cannot be
provided for an older binary, remove that binary from distribution until they
can be restored.

This document describes the project's distribution process and is not legal
advice.
