<div align="center">

# Extents

Extents is a GPU-accelerated, high-performance photo browser and RAW editor built with Rust, `wgpu`, React, and Tauri.

![Extents application interface](public/ui-01.png)

</div>

> [!WARNING]
> Extents is under active development and is not yet a production-ready photo editor. Processing behavior, persisted data, and application architecture may change between releases.

## Downloads

> [!IMPORTANT]
> Builds are available from [GitHub Releases](https://github.com/OODemi52/extents/releases). These builds are not currently code-signed or notarized, so macOS and Windows may display security warnings during installation or first launch. Follow the platform-specific instructions included with each release, and only install artifacts published through the official Extents repository.

## Current Capabilities

- Browse folders using a thumbnail grid, filmstrip, and detail workspace.
- Load raster images and supported Bayer RAW files (currently only Bayer 2x2 supported).
- Develop images through a staged GPU processing graph.
- Apply non-destructive exposure adjustments and an SDR output transform.
- Pan, zoom, rate, and flag images.
- Persist edit recipes in sidecar files.
- Inspect source metadata, processing stages, textures, and timing information through the optional Inspector workspace.
- Capture exposure-bracketed Inspector checkpoint sets for visual comparison.

## Processing Architecture

The full-resolution display path is structured around a linear Rec. 2020 scene-referred GPU pipeline:

```text
File ingest
  -> CPU decode
  -> GPU source upload
  -> Raw Development
  -> Adjustments
  -> Output transform
  -> Presentation
```

## RAW Development Progress

- [x] Sensor normalization (black/white level calibration)
- [ ] Bad pixel correction
- [ ] Noise reduction
- [ ] Highlight reconstruction
- [x] Bayer demosaicing (currently only Bayer 2x2 supported; RCD + VNG-style smooth pass)
- [x] White balance
- [ ] Lens corrections (distortion, chromatic aberration, vignetting/shading)
- [x] Camera → working color space conversion
- [ ] Capture sharpening

## Current Focus

Near-term development is centered on:

- Reworking image loading, preview generation, cancellation, and resource scheduling.
- Improving RAW color correctness, demosaicing, highlight handling, denoising, and capture sharpening.
- Expanding the non-destructive adjustment set.
- Building a shared offscreen rendering path for export and inspection captures.
- Adding automated tests, profiling, and visual regression coverage.

## Known Issues

- RAW support is currently limited to supported one-plane, 2x2 RGB Bayer sources.
- RAW color rendering and highlight handling are still experimental.
- Exposure is the only fully connected user adjustment.
- Export controls have not yet been implemented.

## Technology

- [Tauri](https://tauri.app/) for the desktop application shell
- [Rust](https://www.rust-lang.org/) for decoding, metadata, persistence, orchestration, and renderer ownership
- [wgpu](https://wgpu.rs/) and WGSL for image development, adjustments, output transforms, and presentation
- [Rawler](https://github.com/dnglab/dnglab) for RAW decoding
- [React](https://react.dev/) and [Vite](https://vite.dev/) for the interface
- [HeroUI](https://heroui.com/) and [Tailwind CSS](https://tailwindcss.com/) for UI components and styling
- SQLite for image annotations, metadata, and Inspector checkpoints

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- [Rust](https://rustup.rs/) and Cargo
- The [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system

### Run Locally

```sh
git clone https://github.com/OODemi52/extents.git
cd extents
npm install
npm run tauri dev
```

## Contribution

Extents is not currently accepting external code contributions while its core architecture is changing substantially. Bug reports, reproducible processing issues, and focused feature discussions are welcome through GitHub Issues.

Unsolicited pull requests may be closed without review. This policy will be revisited once the application architecture and contribution process are stable enough to support external changes responsibly.

## License

Extents' original source code is distributed under the MIT License. See [`LICENSE`](LICENSE) for details. Third-party dependencies and bundled components remain subject to their respective licenses. See [`legal/THIRD_PARTY_NOTICES.md`](legal/THIRD_PARTY_NOTICES.md) and [`legal/LICENSING.md`](legal/LICENSING.md) for dependency notices and release-source information.
