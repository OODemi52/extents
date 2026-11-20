# Offscreen render experiment

This is the first backend step toward an external agent inspecting a photograph,
requesting an exposure change, and inspecting the result. Its API and JSON output
are experimental. It uses the desktop's source decoder, GPU processing graph,
output transform, and image readback; it does not initialize a Tauri application,
window, database, or frontend.

## Try a preview

From the repository root:

```sh
cargo run --manifest-path src-tauri/Cargo.toml --bin extents-cli -- \
  render /absolute/path/photo.ARW --output /tmp/extents-candidate.png \
  --exposure-ev 0.75 --max-long-edge 1200
```

The command loads the image's saved `.exts` recipe, or the default recipe if no
sidecar exists, then applies the exposure override. To supply a complete recipe
instead, pass `--recipe /path/recipe.json`, for example a file containing
`{"exposure_ev": 0.75}`. A malformed existing sidecar or recipe is an error.
The recipe fields use the existing Extents model and are absolute settings,
not changes added to the previous render.

The output must be a new `.png` path in an existing directory. The source,
sidecar, and existing output files are never overwritten. The command prints
JSON to stdout with:

- The canonical source path, file size, and modification time observed at load.
  These identify the decoded file but are not a content hash. The loaded image
  stays in memory if the file is subsequently changed on disk.
- The complete applied recipe and render settings, source/RAW inspection data,
  display intent, and baseline exposure selected by the existing pipeline.
- Preview dimensions, sRGB color encoding, output path, MIME type, and byte size.
- Separate wall-clock timings for source decoding/packing, GPU setup, initial
  development, exposure processing, readback, PNG encoding, and file writing.

The default maximum long edge is provisionally 1600 pixels. `--max-long-edge`
can change that; fitted outputs preserve aspect ratio and do not upscale the source.
Use `--full-resolution` to retain the source dimensions instead. The two flags
are mutually exclusive. Both modes currently produce display-referred 8-bit
sRGB, rather than a scene-linear or high-bit-depth export. Resolution, color
space, and bit depth are separate choices; only resolution is configurable here.

These settings are independent of the Inspector's 1600-pixel checkpoint policy.
Inspector capture now uses the shared `renderer::output` sizing/readback code;
only its checkpoint policy and file writing remain in `renderer::inspection`.
Development still runs at source resolution, so a small preview does not remove
the memory cost of full-resolution RAW processing.

## Save an editing recipe

To persist the selected recipe without rendering or producing a PNG:

```sh
cargo run --manifest-path src-tauri/Cargo.toml --bin extents-cli -- \
  save-recipe /absolute/path/photo.CR3 --recipe /path/selected-recipe.json
```

Or update exposure directly with `save-recipe /absolute/path/photo.CR3
--exposure-ev -0.75`. Exposure values are absolute, not cumulative. At least one
of `--recipe` or `--exposure-ev` is required; an exposure override takes precedence
over the supplied recipe. Without `--recipe`, the current sidecar recipe supplies
the other settings.

This loads the existing sidecar or its default document, validates and replaces
the recipe, and uses `core::sidecar::save_sidecar` to update the sibling `.exts`
file atomically. For example, `photo.CR3` uses `photo.exts`. The source must exist
and be a regular file, but it is not decoded and no GPU is initialized. The CLI
rejects a sidecar path that resolves to the source itself. The source and supplied
recipe JSON are not changed. A malformed existing sidecar is an error even when
an explicit recipe is supplied. Output JSON reports `saved`, the canonical source
and sidecar paths, and the complete saved recipe.

A subsequent `render` without recipe or exposure overrides reads the saved edits.
The desktop also reads them when the image is next loaded. Saving does not refresh
an already-open desktop recipe; reload the image to verify the result. Concurrent
desktop and CLI writes are not coordinated in this experiment; perform this check
with the image closed in the desktop. The existing sidecar naming and schema are
unchanged, including the shared sidecar for sources with the same stem.

The separate save command is a proof-of-concept entry point. An eventual editing
tool can invoke this same backend writer automatically within an edit operation,
without requiring another model call. Candidate `render` calls remain read-only
with respect to the source and sidecar.

## Pixels and encoded bytes in memory

`renderer::offscreen::OffscreenImage::open` loads and develops one image.
`render(&recipe, &RenderSettings)` returns a `RenderedImage` with owned RGBA8
pixels and associated metadata. `RenderSettings::size` chooses either
`RenderSize::Full` or `RenderSize::Fit { max_long_edge }`. A caller can inspect
the pixel bytes directly or call
`png_bytes()` to obtain an encoded PNG without writing a file. An eventual
model adapter can send those encoded bytes in the format its image interface
accepts.

Keep the same `OffscreenImage` to render several candidate recipes. Its decoded
source and developed GPU textures are retained; each request reruns exposure
and the output transform. The CLI currently performs one render per process,
so separate CLI invocations each pay setup and loading costs. This resource
holder does not establish an interactive editing-session or acceptance model.

The load timings describe `open` and repeat in each result as context. Adjustment
and readback timings describe that individual preview. GPU work is explicitly
waited on for these measurements; these are CPU wall-clock measurements rather
than GPU timestamp queries. Readback includes downsampling and sRGB conversion.
Encoding and writing are timed separately by the CLI. No performance target is
claimed before measurements on real photographs.

## Verification

```sh
cargo test --manifest-path src-tauri/Cargo.toml --bin extents-cli
cargo test --manifest-path src-tauri/Cargo.toml --lib \
  renderer::offscreen::tests -- --include-ignored --nocapture
```

The GPU test is opt-in because it requires a working graphics adapter. It uses
a generated raster fixture and checks linear-light exposure, absolute rather
than accumulated edits, restored neutral pixels, alpha preservation, configurable
downsampling, lossless in-memory PNG encoding, and preservation of source and
sidecar bytes. It also compares shared readback against an Inspector checkpoint
and checks full-resolution output. Real-camera RAW validation and a native
desktop comparison should also be performed before considering the experiment
validated for RAW editing.

Initial local verification on November 15, 2026 passed both CLI argument tests,
the opt-in GPU test on Metal, builds of the desktop and CLI binaries, the frontend
production build, formatting, and whitespace checks. Additional CLI checks using
a temporary copy of the repository's raster screenshot verified saved-sidecar
loading, explicit recipes, exposure overrides, output dimensions, malformed-input
errors, refusal to overwrite files, and unchanged source/sidecar hashes. The
resulting PNG was visually inspected. These checks do not establish camera RAW
correctness or native desktop visual parity. The frontend build retains its
existing large-chunk and stale Browserslist warnings.

The owner subsequently ran the original CLI on a Canon EOS R6 Mark II CR3 at
+0.75, +2, and -2 EV. Each request produced a 1200-by-800 PNG from the
6000-by-4000 developed source. This confirms real-camera offscreen execution;
it is not yet a visual parity check against the desktop.

The November 19 refactor adds the `extents-cli render` command and typed full/fitted
render settings. CLI and sizing tests pass, the Metal test verifies both sizing
modes and agreement with the Inspector checkpoint wrapper, and both desktop and
CLI binaries build. A single Canon CR3 check also passes with the renamed command
and settings metadata. These are correctness checks; performance tuning and
benchmarking remain deferred for the proof of concept.

Persistence checks exercise saving supplied recipes and exposure overrides,
reloading through the same recipe-selection path as rendering, absolute repeated
edits, and unchanged source/recipe-input bytes without decoding or rendering.
They also check that invalid recipes and malformed existing sidecars are not
saved, that missing/directory/self-sidecar source paths are rejected, and that
no PNG or temporary file is produced by a successful save.

The November 19 persistence check also saved the selected -0.75 EV recipe beside
a temporary copy of the owner's Canon CR3, without GPU access or PNG output.
A fresh Metal render with no recipe/exposure overrides loaded the saved sidecar
and produced a 1600-by-1067 PNG byte-identical to the previously selected
candidate. Rendering left the copied RAW and sidecar unchanged; the Desktop
original and its sidecar state were untouched. The six CLI tests and library
CPU test pass, and both desktop and CLI binaries build. At this point native
desktop reopening and visual parity had not been verified.

The owner subsequently confirmed persistence in the running desktop application
using the RAW copy in `~/Desktop/Extents Comparison.E4xCAP`: switching to another
image and back picked up the CLI-saved exposure and changed the displayed image.
This verifies manual sidecar reload in the desktop. It does not establish live
external-update synchronization or pixel-level desktop/offscreen parity.

## Exposure range behavior and possible UI improvements

The owner also saved -10 EV through the CLI and observed it applied in the
desktop. They clarified that dragging the slider then changed the value to
approximately -4.99 EV: it jumped back inside the slider range rather than
remaining stuck. The exposure control in `basic-adjustments-panel.tsx` has a
-5 to +5 EV range.
`EditRecipe::validate` checks for a finite exposure and a finite, positive
multiplier; it does not impose that UI range, and accepts both -10 and +10 EV.
Those values are examples, not configured backend limits.

The current `CenteredSlider` accepts a recipe value into local state even when
it is outside its track range, while numeric entry clamps to the track range.
The reported jump has not been independently reproduced. Follow up on how to
display and edit supported values outside the slider range. Treat the engine's
supported parameter domain and the slider's convenient drag range as separate
decisions; avoid silently changing a saved recipe merely because the UI loads it.

Future UI ideas raised by the owner, not selected implementation requirements:

- Expand the slider range to include an externally supplied or numerically
  entered value, such as -10 EV, instead of jumping into the original range on
  the next drag. Symmetric versus asymmetric expansion remains undecided.
- Allow user-selected slider ranges, including asymmetric ranges for workflows
  that mostly darken or mostly brighten images.

These are interaction preferences, separate from recipe values and processing
limits. Changing a preferred slider range should not itself change the image.
No range policy or implementation is changed here.

## First perception-loop walkthrough

The first agent can be the coding assistant in this conversation. Give it the
source path and a photographic instruction. It can render a baseline using the
CLI, view the resulting image, choose an exposure, invoke another render, view
that result, and revise the recipe. No separate model API integration or MCP
server is required for this manual proof of concept. Each candidate should
have its own output file and retain the recipe reported by that invocation.

For the desktop comparison, open the original image and set the same absolute
exposure value, then compare with the CLI output. The source and automatic
RAW output settings must match; compare equivalent image regions/sizes rather
than comparing the full application window. The existing Inspector checkpoint
can provide a desktop graph-output PNG; command-line output can be fitted to
the same 1600-pixel long edge. Ordinary desktop viewing is scaled through the
window surface and is not expected to be pixel-identical to a smaller PNG.

After inspecting candidates, use `save-recipe` with the selected recipe JSON.
Render again without recipe overrides to check that the saved edits are loaded,
then reopen the original image in the desktop to check the same result. Writing
a sidecar alone does not refresh the frontend's active recipe. Native desktop
visual parity remains a manual check.

MCP transport, agent orchestration, automatic desktop updates,
and edit acceptance/history are follow-up work.
