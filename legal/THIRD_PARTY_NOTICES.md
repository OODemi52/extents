# Third-Party Notices

Extents' original source code is licensed under the MIT License. Distributed
Extents builds also include third-party software that remains subject to its
own license terms.

## Rawler

Extents uses Rawler for RAW image decoding and metadata extraction. Rawler is
licensed under the GNU Lesser General Public License, version 2.1
(`LGPL-2.1`). Rawler is compiled into the Rust application binaries currently
distributed by Extents.

The exact Rawler version used by a build is recorded in
`src-tauri/Cargo.lock`. Each Extents binary release provides:

- A copy of the LGPL-2.1 license.
- The corresponding Rawler source archive for the resolved version.
- The exact Extents source used to produce the release.
- Instructions for rebuilding Extents with a modified Rawler source tree.

Rawler source and project information:

- <https://github.com/dnglab/dnglab>
- <https://crates.io/crates/rawler>

The complete LGPL-2.1 text is available in [`LGPL-2.1.txt`](LGPL-2.1.txt).
Rebuild instructions are available in [`RELINKING.md`](RELINKING.md).

## Other Components

Extents includes additional third-party Rust and JavaScript dependencies under
their respective licenses. The package manifests and lockfiles record the exact
dependency graph used for each release. No third-party license grants any rights
to the Extents name, branding, or artwork.
