# Frontend Shell Exploration

## Starting Point

The previous frontend and performance overhaul is preserved at `f66c45e` on
`feature/ui-perf-overhaul`. The experimental foundation is on
`design/ui-next-foundation`. This exploration changes the frontend composition,
not the Rust backend, image pipeline, or Tauri configuration.

The previous `src/App.tsx`, layouts, sidebar, and toolbar remain available as
references. `src/main.tsx` now imports `src/app-next/app.tsx` instead.

## Three Directions

| Direction          | Branch                        | Working Directory       | Design Question                                                                           |
| ------------------ | ----------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Unified workspace  | `design/ui-unified-shell`     | `.worktrees/ui-unified` | Does a quiet outer shell and one inset workspace make browsing and editing feel coherent? |
| Photo-first editor | `design/ui-photo-editor`      | `.worktrees/ui-editor`  | Do separate library and tool surfaces leave the photograph feeling less boxed in?         |
| Modular workspace  | `design/ui-modular-workspace` | `.worktrees/ui-modular` | Is a persistent activity rail a better home for navigation and panel controls?            |

The references are Linear, Slack, VS Code, ReUI/shadcn, and Slackshots. These are
initial interactive layouts, not three separate implementations of photo logic.
`src/app-next/experiment.ts` selects the shell for each branch. Semantic surface,
text, spacing, and interaction styles live under `src/app-next/styles` so the
chosen direction can be formalized after visual iteration.

No decorative document tabs or agent controls have been added. Their behavior
needs a product decision before they occupy permanent workspace space.

## What Remains Real

- Folder picking and the existing folder tree/scanner.
- Virtualized grid browsing, single and multiple selection, preview preparation,
  ratings, flags, filtering, and sorting.
- Detail view using the existing native GPU renderer and interaction viewport.
- Shared filmstrip navigation and resizing.
- Library, information, and adjustment panel toggles and resizing.
- Information temporarily replacing adjustments, then restoring them on close.
- Existing application keyboard navigation, native menu accelerators, and zoom.
- Settings and the optional inspector, using the existing implementations.

The primary adjustments are presented without the old outer panel/card chrome.
Secondary editing views and the inspector are carried forward rather than
redesigned in this iteration.

## Frontend Structure

`app-next` owns the application shell. Existing feature modules continue owning
their data and behavior. The experimental modules are grouped into `shell`,
`workspace`, `panels`, `components`, `hooks`, `store`, and `styles`. This is a
temporary composition boundary, not a replacement for feature-based organization.

New styles are scoped to the experimental shell. Selection and sash accents are
neutral rather than blue. Typography uses the system UI stack with restrained
sizes and tabular numeric readouts. Search remains centered, and folder context
is always visible in the workspace header where space permits. Folder context
is a readout, not yet an interactive breadcrumb navigator.

## Performance Decisions

- The grid and interaction viewport stay mounted but only the active view does
  gallery/renderer work. Hidden views are also invisible and inert.
- There is one primary filmstrip shared by grid and detail, rather than separate
  filmstrips in retained workspace layouts. The existing inspector keeps its own.
- Existing panel width/filmstrip height animations and fixed-size grid reflow are
  reused. Continuous thumbnail growth is not reintroduced.
- Side-panel drag updates are coalesced to animation frames. Width preferences
  are persisted when a drag ends, not on every pointer event.
- Settings and the inspector are loaded lazily. The initial production JS chunk
  decreased from about 955 kB to about 872 kB before gzip in the final build;
  this is a bundle-size observation, not a measured startup or FPS improvement.
- New shell components use focused Zustand selectors. Image transforms remain
  in the existing imperative viewport path.

## Running and Comparing

From the repository root, the unified direction is the default:

```sh
npm run tauri dev
```

To try another direction, enter its worktree and start the native app:

```sh
cd .worktrees/ui-editor
CARGO_TARGET_DIR=/Users/oodemi/Code/extents/src-tauri/target npm run tauri dev
```

Use the equivalent command in `ui-unified` or `ui-modular`. Stop the current
Tauri/dev process with Ctrl+C before starting the next one. These worktrees share
the same application identifier and existing preferences; they are not isolated
catalogs or simultaneous app instances.

The worktrees share the root `node_modules` through symlinks because their
dependencies are identical. This saves disk space, but dependency changes should
not be made independently without replacing that arrangement. The shared Rust
target directory also saves space; build these prototypes one at a time. Source
changes and Git commits remain independent between worktrees.

For comparison, try the same folder and photograph in each direction. Compare
grid selection, detail switching, panel toggles, Tab, resizing both panels and the
filmstrip, wheel zoom, panning, and the 900-by-600 minimum window size. Note what
feels better or worse before deciding which design to develop further.

## Validation and Limits

Validated on October 9, 2026:

- `npm run build` and `npx tsc --noEmit` pass. The production entry chunk is
  872.03 kB before gzip and 265.12 kB after gzip. Existing large-chunk and stale
  Browserslist warnings remain.
- `npx eslint src/app-next` reports zero errors and one `no-console` warning for
  reporting renderer suspension failures. Formatting and `git diff --check` pass.
- Local Playwright checks cover all three shell variants at 1280-by-800 and
  900-by-600. Fixtures use actual JPEG thumbnails and 120 image records, with
  mocked Tauri IPC rather than claiming browser access tests native rendering.
- Browser checks pass for thumbnail display, grid selection, arrow navigation,
  detail switching, click-to-zoom/fit, information-panel restoration, Tab,
  library resizing, filmstrip resizing, filter toggles, and tooltip shortcuts.
  Filmstrip item heights remain stable on vertical window resizing. At minimum
  width, search is centered, buttons stay on screen, and settled grid tiles do
  not overlap. Screenshots were inspected at both sizes.
- A separate native Tauri pass on the unified shell uses the real Rust scanner,
  cache, and renderer with four JPEGs. It verifies scanning, thumbnail display,
  GPU image loading, panel toggles, adjustment restoration, retaining GPU image
  resources in grid mode, and restoring detail presentation. Rust logs confirm
  progression from thumbnail to preview to full-resolution input.
- The browser QA blocks the external React Scan script, producing expected
  resource errors. No application JavaScript exceptions were observed. Native
  checks reported no errors.

The test scripts and resized personal-photo fixtures live outside the repository
and are not committed. Native screenshot capture was unavailable, so the native
pass verifies behavior and renderer state, not final GPU compositing appearance.
The other two shells share those workflows but have not had separate native
visual acceptance passes. This is not a RAW stress test or a performance profile;
smoothness with large folders still needs owner testing.

The shell uses translucent tint over the native image surface in detail view.
Blur is deliberately not advertised as working: CSS backdrop filters may not
sample a native WGPU surface outside the WebView's own compositing tree. A native
visual check is required before deciding how to achieve that treatment. No
renderer/backend changes are being introduced to fake it during this pass.
