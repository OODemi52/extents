# Rebuilding Extents With Modified Rawler

Extents is an MIT-licensed Rust/Tauri application that uses Rawler, which is
licensed under the GNU Lesser General Public License, version 2.1. This document
describes how to replace the Rawler source selected by Cargo and rebuild
Extents.

## Release Materials

Download these artifacts from the same GitHub release as the Extents binary:

- `Extents-<release>-source.tar.gz`
- `rawler-<version>.crate`
- `RAWLER-LGPL-2.1.txt`

The release-specific Extents source archive contains the manifests, lockfiles,
build configuration, and application source used for that release. The Rawler
`.crate` file is a gzip-compressed source archive published by crates.io.

## Prerequisites

Install the Rust and Node.js toolchains and the platform prerequisites listed
in the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Use the
toolchain versions documented by the matching Extents source release where
available.

## Replace Rawler

1. Extract the Extents and Rawler source archives into adjacent directories.

   ```text
   release-source/
     extents-<release>/
     rawler-<version>/
   ```

2. Modify the extracted Rawler source as needed without changing the package
   name expected by Extents.

3. Add a Cargo patch to `extents-<release>/src-tauri/Cargo.toml`. Adjust the
   relative path if the directories are arranged differently.

   ```toml
   [patch.crates-io]
   rawler = { path = "../../rawler-<version>" }
   ```

4. Update the lockfile so Cargo selects the local Rawler package.

   ```sh
   cargo update --manifest-path src-tauri/Cargo.toml -p rawler
   ```

5. Confirm that Cargo reports the local Rawler source.

   ```sh
   cargo tree --manifest-path src-tauri/Cargo.toml -i rawler
   ```

## Build Extents

From the Extents source directory, install the JavaScript dependencies and
build the Tauri application:

```sh
npm ci
npm run tauri build
```

Platform-specific bundle options and targets used by official builds are
recorded in `.github/workflows/release-please.yml` and
`.github/workflows/nightly.yml`.

The Extents source is provided under terms that permit modification and
reverse engineering for debugging changes to the included LGPL-covered
software. Rawler and modifications derived from Rawler remain subject to the
LGPL-2.1 license.
