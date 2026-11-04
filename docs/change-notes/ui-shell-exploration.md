# Frontend Shell Exploration

## Starting Point

The previous frontend and performance overhaul is preserved at `f66c45e` on
`feature/ui-perf-overhaul`. The experimental foundation is on
`design/ui-next-foundation`. This exploration changes the frontend composition,
not the Rust backend, image pipeline, or production Tauri configuration.

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

Generated macOS icon assets are also shared through a local symlink from each
worktree's `src-tauri/mac-assets/generated` to the same directory in the root
checkout. These ignored files are required by the macOS resource configuration
even for `tauri dev`. The existing icon-generation hook runs before production
builds, not development launches. If the root assets are missing, run
`./scripts/compile-macos-icon.sh` from the root checkout before starting a
prototype. New worktrees need this asset link as well as the `node_modules` link.
All three worktree development commands were verified to compile and launch on
October 10, 2026, after linking these assets; the test apps and servers were stopped.

For comparison, try the same folder and photograph in each direction. Compare
grid selection, detail switching, panel toggles, Tab, resizing both panels and the
filmstrip, wheel zoom, panning, and the 900-by-600 minimum window size. Note what
feels better or worse before deciding which design to develop further.

### Side-by-Side Comparison

The normal commands above remain one-at-a-time launches. A macOS-only development
launcher opens all three native apps together:

```sh
node /Users/oodemi/Code/extents/scripts/compare-ui.mjs
```

To run only the Unified shell currently being refined:

```bash
node /Users/oodemi/Code/extents/scripts/compare-ui.mjs --variant unified
```

The optional selector also accepts `editor` or `modular`. Only the selected
shell's server and native app are started. Stop an existing session using the
same port with Ctrl+C before starting another; the launcher never takes over
another session's port.

Keep this terminal open. Ctrl+C stops all comparison apps and frontend servers,
including during startup. Stop a normal `tauri dev` session before launching
comparison mode, since Cargo may otherwise wait on its shared build-directory lock.
Quitting an individual app normally closes its server;
when all three apps have quit, the launcher exits. Ports 5181, 5182, and 5183 must
be available. A conflict fails startup rather than silently switching ports, and
a second comparison session is rejected without interrupting an existing one.

Each app has its own identifier under `com.extents.ui-comparison`, window title,
frontend port, and Vite dependency cache. Frontend changes in each worktree use
HMR. The launcher compiles the root checkout's unchanged Rust backend sequentially
with temporary `TAURI_CONFIG` overrides, then snapshots each executable under
`.worktrees/.ui-comparison` before building the next identity. Rust dependencies
still use the shared target directory. Backend changes need a launcher restart;
this launcher does not watch Rust sources or use worktree-specific Rust changes.

Dependency caches are generated under a new
`node_modules/.cache/ui-comparison/session-*` directory for each launch. Fresh
paths prevent persistent WebView caches from requesting obsolete optimized chunks
and avoid reusing incomplete caches after an abrupt shutdown. Dependencies are
pre-bundled again at startup; this does not change production builds or runtime
image processing. Normal shutdown removes the session cache after stopping its
servers. Leftover caches from interrupted launches are ignored on subsequent runs,
and a duplicate launcher does not modify an active session's cache.

Each server explicitly sets Tailwind's source-scan base to its own worktree,
using the existing Tailwind/PostCSS and Autoprefixer pipeline. Without this,
programmatic Vite inherits the terminal's working directory for Tailwind scanning.
Launching from the home folder can stall stylesheet compilation and leave the UI
looking unstyled. The launcher no longer depends on where the command is run.

Separate identifiers isolate normal app preferences, window state, and image
caches, but not the entire data model. The current backend uses the hard-coded
`com.extents.cache/extents.db` database for annotations and related metadata, and
sidecars still belong to the original photographs. Avoid concurrent edits to the
same photo; use photo copies when experimenting with edits. Three native GPU
renderers also increase memory use, especially with uncached RAW folders.

This is a development convenience, not a production configuration change. To undo
it, remove `scripts/compare-ui.mjs` and this section. Its generated executables and
Vite caches are ignored local artifacts in `.worktrees/.ui-comparison` and
`node_modules/.cache/ui-comparison`; they can be removed after stopping the
launcher. Normal development commands and backend source remain unchanged.

Validated on October 10, 2026: all three native processes ran concurrently with
distinct instance identifiers, and each frontend port served the expected shell.
Ctrl+C cleanup passed both after full launch and during Rust compilation. Duplicate
session rejection and partial-startup cleanup when the third port was occupied
also passed, without stopping the unrelated process occupying that port. No test
applications, compilers, or frontend servers were left running.

After correcting Tailwind source discovery, the comparison launcher was tested
from the home folder. Playwright checks passed against all three actual frontend
ports at 1280-by-800 and 900-by-600, covering the primary workflows listed below;
rendered screenshots were inspected. Read-only probes in all three native
WebViews also confirmed that shell typography, button spacing, and Tailwind
utilities were applied, with no JavaScript or security-policy errors. These probes
verify style application, not final native GPU compositing appearance.

Cache isolation was also tested on October 10 after a reported missing optimized
chunk on restart. All three browser interfaces passed their workflow checks with
zero failed optimized-dependency requests. A second launch used different cache
paths and loaded all three native WebViews successfully with their existing
profiles. Duplicate-launch rejection left the active session working, and normal
Ctrl+C shutdown removed its session cache. The older static caches were not
reused; no dependency exclusions or backend changes were required.

## Unified Refinement: October 10, 2026

The next iteration develops the Unified shell in `.worktrees/ui-unified`.
The root frontend and the Photo-First and Modular worktrees remain unchanged
as reference designs. The existing comparison launcher's first window picks up
these frontend changes through HMR.

### Interaction Hierarchy

- The left activity rail owns workspace navigation (Grid, Detail, and the
  optional Inspector) and the adjacent library toggle.
- A separate right tool rail owns Adjustments and Photo Information, beside
  the panel those buttons operate. Editing tools no longer require crossing
  the window to change a right-hand panel.
- Folder context, search, sorting, and the filter toggle share the top shell.
  Expanded filters appear directly below that row, outside the photo aperture.
  The separate workspace-header toolbar and duplicate in-view filters are
  removed from this composition.
- Filmstrip and side-panel toggles remain in the footer. The prominent Settings
  button is removed; the existing native application menu still opens Settings.
  No agent, document-tab, or unfinished tool navigation is added.

### Presentation

- The outer shell keeps the darker neutral palette with a more opaque tint.
  The central aperture has no border or additional surface fill in detail view.
  Grid mode still conceals the native renderer with the existing opaque window
  background; that renderer/WebView architectural boundary is not redesigned.
- Four small corner masks provide rounded framing without relying on CSS
  border radii to clip the native GPU surface. They occupy only the corners,
  avoiding overlap with library rows and neighboring controls.
- The filmstrip has no separate background band or container border. Photos
  float within the aperture, with captions appearing on hover, focus, or
  selection. Thumbnail dimensions, virtualization, and loading remain unchanged.
- Inter's upright variable font is bundled locally with its SIL Open Font
  License, including a license copy in the production frontend output.
  Navigation targets are larger than editing controls; headings, folder rows,
  labels, and numeric readouts have deliberate, distinct sizes and weights.
  Icon targets and neutral active indicators are consistent across both rails.
- A window-size-based panel-width budget keeps both rails visible and reserves
  at least 180 px for the workspace at the 900 px minimum window width.
  It does not observe animated panel widths or persist clamped preferences on
  window resize.

True blur of the photo underneath the shell is still unresolved. The image is
rendered into a native WGPU surface, not a DOM image that CSS backdrop filters
can reliably sample. This iteration changes tint and framing only, with no Rust,
renderer protocol, or orchestration changes. Native compositing needs its own
visual check before choosing a blur implementation.

### Verification

- Unified production build and TypeScript checks pass. The main JS chunk is
  862.39 kB before gzip / 262.64 kB after gzip; the local font is 352.24 kB.
  Existing Browserslist and large-chunk warnings remain. These sizes are not
  startup-time or FPS measurements.
- Focused ESLint checks report zero errors and the existing renderer-error
  `no-console` warning. Formatting and diff whitespace checks pass.
- Isolated browser checks against the running Unified comparison server cover
  thumbnail rendering, grid selection, keyboard navigation, detail switching,
  zoom/fit, panel restoration, panel and filmstrip resizing, filter placement,
  slider numeric editing/reset, font loading, and long folder names.
- Checks at 1280-by-800 and 900-by-600 confirm centered search, no off-screen
  buttons or settled grid overlaps, a transparent borderless aperture, and
  floating filmstrip styling. Maximum preferred panel widths clamp to 304 px
  each at 900 px, leaving a 180 px workspace and keeping the right rail visible.
- Screenshots were inspected. Browser IPC is mocked, so this is not verification
  of native GPU compositing, window dragging, RAW loading, or blur. No additional
  native app instances or frontend servers were started for this refinement;
  the owner's running comparison session was preserved.

## Viewport Alignment and Docking: October 11, 2026

This refinement still changes only the Unified worktree frontend. The other
prototypes and the root frontend remain reference implementations.

### Layout and Controls

- Header, library, workspace, contextual panel, and footer now share CSS Grid
  columns. Header and footer use subgrid to inherit the actual animated panel
  tracks. Search and selection status stay centered on the interaction workspace,
  not the whole application window, without measuring their positions in React
  or adding per-frame Zustand updates.
- The filter button sits 6 px to the right of search. Sorting moves to the
  bottom-left. The image count, current filename, and clear-selection action sit
  in the footer, centered on the workspace.
- Workspace view switches and the library toggle move from the left activity
  rail to the bottom-right, beside the filmstrip and side-panel controls.
- Adjustments and Information remain at the right edge when the contextual
  panel is closed. When it opens, those same controls dock in the top shell above
  the panel. There is no additional 56 px rail beside an open panel. Position-only
  Framer Motion layout transitions provide a short docking animation; a custom
  radial path is not implemented.
- Docking follows the panel actually visible in the current view, not just the
  stored edit-panel preference. Grid can remember that preference while
  Adjustments is not displayed.
- Removed the visible Extents wordmark, Folders label, and Local library footer.
  Tooltip triggers use measurable inline-flex boxes instead of display-contents
  wrappers, fixing overlays that could anchor at the window's origin.
  Long folder paths still truncate and retain their native title tooltip.
  The folder readout itself opens the existing folder-picker dialog, avoiding
  duplicate folder icons. When Library is collapsed, it keeps the current folder
  name visible but omits the parent breadcrumb to fit around native controls.
- The width guard now allows up to 360 px for each panel at the 900 px minimum
  window width, reserving a 180 px central workspace. The closed right dock
  occupies 56 px; an open panel includes, rather than adds, that space.

### Neutral Palette Experiment

The shell is now a slightly lighter neutral tint, `rgba(32,32,32,0.98)`, around
the darker `#191919` grid canvas. This reverses the previous shell/canvas contrast
without introducing a color cast. Detail continues exposing the unchanged native
renderer; no new opaque detail background is added.

Live native window resizing can reveal a boundary between separately updated
WebView content and the GPU/window background. The renderer currently clears to
equal linear RGB values of 0.01; shell tint and grid canvas are frontend tokens.
These are not a synchronized native/UI background contract, and the remaining
resize artifact is not claimed fixed or proven inevitable. Matching backgrounds,
profiling resize work, or synchronizing native backing/compositing are possible
future approaches. This iteration does not change renderer/window configuration,
implement native blur, or modify Rust.

There is no single mandatory photo-editor canvas brightness. A neutral,
untextured surround is the useful baseline; an eventual configurable gray level
would allow different viewing preferences. Lightroom-inspired control placement
is an ergonomic reference, not a decision to copy its entire design.

### Verification

- Production build/TypeScript pass. Focused lint reports zero errors and the
  existing renderer-error logging warning.
- Chromium and Playwright WebKit workflow checks pass against the owner's running
  Unified server, using isolated mocked IPC and 120 image records. They cover
  selection, arrow navigation, zoom/fit, panel restoration, sidebar and filmstrip
  resizing, filters, numeric slider editing/reset, and local font loading.
- Geometry checks confirm search and footer status match the workspace center
  throughout sidebar animation, not just after it settles. The filter button is
  adjacent to search, and tool docking uses the correct closed/open position.
- At 900-by-600 with both maximum-width panels, the workspace is 180 px wide.
  No settled grid overlaps or off-screen controls were found. Long folder names
  do not cross into search. Screenshots were inspected at desktop and compact
  sizes in both engines.
- This is not a frame-time profile or a native GPU compositing check. Real
  window-resize artifacts, image-through-shell appearance, and subjective motion
  still need owner review in the Tauri app. No new native apps or frontend servers
  were started, and the running comparison session was preserved.

## Filter Tab and Toolbar Refinement: October 11, 2026

### Layout and Interaction

- Workspace view controls and Library move to the far-left footer. Sorting sits
  at the workspace's left edge, and Filmstrip sits at its right edge. Selection
  status remains centered on the workspace. The side-panel button is removed;
  the existing Tab shortcut is unchanged.
- At narrow workspace widths, an icon-only HeroUI sort menu retains all four
  fields and both sort directions. Below 300 px, the filename is omitted and
  the count remains visible. When Library is collapsed, sorting shifts enough
  to avoid the navigation controls that extend beyond the 56 px gutter.
  CSS container queries handle these adjustments without per-frame React state.
- Both closed side gutters reserve 56 px. Stationary shell backgrounds fill
  those tracks; panel content does not add another tint over them.
- Filters now hang from the top shell as a rounded, nonmodal tab over the
  workspace. Only translation and opacity animate. Opening filters does not
  change the workspace's position or dimensions. The trigger exposes its
  expanded state and controlled element; closed filters are inert and do not
  intercept pointer events.
- A 1 px, 4.5%-white border follows the aperture's rounded outline. It is drawn
  in the existing pointer-transparent corner overlay, without reducing the
  workspace's content area or changing native rendering.
- The contextual panel already supports live resizing from its left edge.
  Pointer checks confirm that widening it also widens the actual slider track;
  the slider's hidden native input is not a useful measurement of track width.
- Filmstrip reveal now animates only the clipped container height. Its inner
  content stays at the selected height and is no longer translated, faded, or
  explicitly promoted with will-change/backface styles. This removes competing
  reveal animations; it is not proof that the owner's intermittent native flash
  has been eliminated. Content still unmounts after closing, preserving the
  existing hidden-work policy rather than retaining an active hidden virtualizer.

### Blur Requirements

The intended effect samples the photo inside the window, not the desktop behind
it. CSS backdrop filtering operates on browser-composited content; this renderer
targets a separate native window surface. CSS blur alone should not be treated
as a working solution without a native compositing test.

A macOS experiment could insert an AppKit NSVisualEffectView using within-window
blending between the photo surface and the transparent WebView, masked to the
shell. It would need verified view/layer ordering and synchronization with the
rounded workspace, live resizing, and animated panels. The installed
window-vibrancy helper uses behind-window blending instead, so enabling that
helper is not equivalent to the requested effect. See
[Apple's blending modes](https://developer.apple.com/documentation/appkit/nsvisualeffectview/blendingmode-swift.enum)
and [WebKit's backdrop-filter explanation](https://webkit.org/blog/3632/introducing-backdrop-filters/).

If native compositing cannot sample the photo reliably, a renderer-side solution
could blur a downsampled display image and composite it only under the shell,
leaving the central photo sharp. That requires Rust/shader work and shared shell
geometry, not just frontend CSS. No blur, native window effects, or backend
changes are added in this refinement.

### Verification

- TypeScript and the production build pass. Focused lint has zero errors and the
  existing renderer-error console warning. Formatting and whitespace checks pass.
- Chromium and WebKit checks cover right-panel/slider track resizing, unchanged
  workspace bounds with filters open, both closed gutters, footer edge alignment,
  compact sorting, and uninterrupted search/status centering during panel motion.
- Repeated filmstrip toggles preserve the final height and thumbnails. Sampled
  frames confirm stable item dimensions and no inner transform or opacity
  animation. These checks use mocked IPC, not the native WGPU surface, so the
  intermittent Tauri flash still requires owner review.
- Screenshots are checked at 1280-by-800 and 900-by-600, including the 180 px
  minimum workspace. No new servers or native apps are started; the owner's
  existing comparison session is preserved. Other prototype worktrees and Rust
  sources remain unchanged.

## Grid and Fluid Filter Tab: October 12, 2026

### Presentation Changes

- Filmstrip is now a Detail-only surface; its footer toggle keeps its position
  but is disabled outside Detail. Switching to Grid collapses it immediately,
  removes the hidden list
  after the transition completes, and preserves the saved visibility and height
  preferences for the next Detail visit. Grid no longer spends space displaying
  a second photo list.
- The filter tab grows from 0 to 50 px instead of translating and fading. Its
  surface follows the reveal height, while controls retain their normal size.
  Concave 12 px joins connect its upper corners to the shell; lower corners remain
  rounded. The dark outline follows the joins without drawing a vertical seam
  through their connection.
- This height animation is local to an absolutely positioned overlay. It still
  requires local browser layout; it is not claimed compositor-only. Workspace
  dimensions remain unchanged, so the reveal does not resize the grid or its
  virtualizer. Reduced-motion mode skips the growth animation.
- Aperture and filter-tab outlines use a faint black tint instead of white.
  The shell/canvas palette is otherwise unchanged. Library also uses the
  stationary shell backing rather than stacking another translucent tint on it.
- Search remains viewport-centered pending the owner's decision. The recommended
  next direction is application-centered search for a stable navigation target,
  while photo-specific footer readouts remain viewport-centered.

### Blur Assessment

Photo-through-shell blur is optional polish, not a prerequisite for this layout.
The main integration risk is keeping the native surface, WebView, shell mask,
and animated layout aligned. This is medium-to-high integration complexity,
not a CSS-only effect or an established small patch.

A macOS-only native proof of concept could use AppKit within-window blending.
It would require verified WGPU layer sampling, shell masking, Retina/fullscreen
and resize checks, reduced-transparency handling, and a nonblurred fallback.
That route introduces platform-specific code and regression testing; its effect
does not automatically transfer to Windows or Linux. Apple's
[within-window blending documentation](https://developer.apple.com/documentation/appkit/nsvisualeffectview/blendingmode-swift.enum/withinwindow)
also requires that these effect views not overlap, so a single masked shell or
nonoverlapping regions would need investigation.

A renderer-side downsampled blur could reuse the current WGPU backend across
platforms, but needs additional textures/passes, matching shell geometry, and
GPU/memory/battery measurements. Neither route is free of maintenance or
synchronization work. The recommendation is to settle the shell first, then run
a bounded native experiment before committing to either architecture. No blur
implementation, dependencies, or Rust changes are introduced here.

### Verification

- Production build/TypeScript pass. Focused lint reports zero errors and the
  existing renderer-error console warning; formatting and whitespace checks pass.
- Chromium and WebKit checks cover initial Grid visibility, Detail restoration,
  filmstrip toggling/resizing, filter growth without fading/scaling or workspace
  movement, dark outlines, panel behavior, and stable search/status alignment.
- Screenshots are inspected at desktop and minimum window sizes. These are
  isolated browser checks with mocked IPC, not native GPU blur or window-layer
  validation. The owner's existing comparison app and server remain running;
  no additional server or native app is started.

## Opaque Shell and Surface Morph: October 12, 2026

### Current Design

- Unified shell surfaces are now opaque `#202020`: header, footer, sidebar
  backing, corner masks, and filter surface. Native vibrancy and photo-through-
  shell blur are no longer planned for this direction. The central aperture
  remains transparent intentionally so it exposes the existing native GPU photo.
- Search is centered on the application, independently of the animated panel
  tracks. The adjacent filter button and filter surface follow that global
  anchor. The folder picker has a bounded leading region and still truncates
  long paths without overlapping search or native window controls. Footer photo
  readouts remain centered on the interaction workspace.
- The black outline is retained as an opaque `#111111`, matching approximately
  the prior black tint over the grid canvas. One contour replaces the filter
  tab's separate CSS corner masks and straight border pieces. Its half-pixel
  stroke baseline aligns with the inset's one-pixel top edge; the fill omits a
  closing top stroke so the tab visually connects to the shell.

### Filter Motion

`src/app-next/shell/filter-tab.tsx` owns the tab's geometry and motion. Its width,
height, and curved shoulders change together, with a restrained spring settle.
Controls retain their normal dimensions and are revealed through a matching
clip, not scaled, faded, or translated. This is direct surface morphing rather
than a blur-based merging effect. See
[Motion's SVG animation guide](https://motion.dev/docs/react-svg-animation)
and [spring documentation](https://motion.dev/docs/react-use-spring).

One spring motion value drives the surface height, fill, outline, and control
clip. It can reverse while running, and reduced-motion mode jumps directly to the
target. Motion updates attributes and styles without per-frame React or Zustand
state. The width observer measures the fixed-height control row, not the animated
container, so the reveal itself does not invalidate that measurement. SVG
painting and local overlay layout still occur; this is not a compositor-only or
frame-time-profiled optimization.

### Verification

- Production build/TypeScript pass. Focused lint reports zero errors and the
  existing renderer-error console warning; formatting and whitespace checks pass.
- Chromium and WebKit checks cover application-centered search throughout panel
  animation, preserved workspace-centered footer status, folder truncation,
  ordinary gallery/editor workflows, filter morphing, rapid reversals, and
  reduced motion. Filter controls do not stretch, and workspace dimensions do
  not change when filters open.
- Settled screenshot pixels at both upper filter joins are checked for dark
  border continuity, including a 2x-scale WebKit pass. The control row's width
  observer remains idle during the morph. Screenshots are inspected at desktop
  and minimum window
  sizes. These use mocked IPC, not native image rendering or window compositing.
- No native effects, renderer changes, or additional dependencies are introduced.
  The owner's running comparison app is preserved; no new servers or native
  apps are started for verification.

## Toolbar Grouping and Folder Typography: October 12, 2026

### Changes

- Library (`P`) moves from the footer to the title bar, immediately after the
  reserved native traffic-light area. Its sidebar icon and expanded state
  distinguish it from the neighboring folder breadcrumb, which still opens the
  existing folder dialog. Grid/Detail remain together in the footer; no new
  left-side vertical navigation dock is introduced.
- Information sits at the bottom of the closed right dock and moves into the
  footer when the contextual panel opens. Adjustments stays at the top of the
  closed dock and retains its existing title-bar position when open. Individual
  targets animate their position over 220 ms. The shared positioning layer is
  pointer-transparent except at the buttons, so panel content and resize sashes
  remain interactive. Existing panel restoration and keyboard behavior are
  unchanged; no placeholder Tags control is added.
- Removing Library from the footer also reduces the reserved sorting offset,
  including when Inspector navigation is enabled. Sorting remains clear of the
  view controls with either panel arrangement.
- The tree already inherited Inter from the shell. It now uses the same 600
  weight as the compact adjustment empty-state title, with 12 px text and 30 px
  rows instead of 13 px text and 36 px rows. Title-bar folder text uses 11.5 px
  at the same weight. The Open folder action follows the tree typography.
  Folder selection, separate chevron toggles, indentation, connected guides,
  and full-name native tooltips are preserved.

### Design Decisions Still Open

The opaque palette, equal 56 px closed gutters, and black inset outline are
unchanged. A slightly lighter neutral shell is worth comparing against the
current near-black canvas, rather than treating darkness itself as an
accessibility measure. An empty left gutter could eventually shrink to 16-24 px
because it no longer needs to host controls; the right gutter still hosts tools.
Editing selectors in the contextual panel's header are the recommended next
alternative to title-bar docking, pending a layout decision. Subtle fixed
top/left highlights and bottom/right shadows could provide a simple bevel;
dynamic lighting or a blur effect is not proposed.

### Native Focus Artifact

The owner reports a dark rectangular backing after switching windows with
Stage Manager, disappearing on hover. This is not diagnosed as a macOS bug.
The native window remains configured as transparent in the current WGPU/WebView
arrangement even though the CSS shell is opaque. The app's renderer window-event
callback explicitly handles resizing, not focus or occlusion. There is a
[Tauri focus-change transparency report](https://github.com/tauri-apps/tauri/issues/8255),
but it concerns older versions and does not establish this application's cause.
A native reproduction and screenshot distinguishing the physical window edge
from the inner aperture are needed before changing renderer/window behavior.
No speculative repaint loop, native configuration change, or Rust fix is added.

### Verification

- Production build/TypeScript, focused lint, formatting, and whitespace checks
  pass. Existing Browserslist and large-entry-chunk warnings remain.
- Isolated Chromium and WebKit checks at 1280-by-800 and 900-by-600 cover Library
  placement and its shortcut tooltip, application-centered search, closed/open
  Information docking, restoration of Adjustments, Tab behavior, compact sorting
  spacing including Inspector, and contextual-panel resizing through the tool
  layer. Folder clicks, repeated selection, separate chevron toggling, row
  dimensions, text weights, and long-name titles are checked. Reduced-motion
  docking and filter opening are also exercised.
- Desktop and compact screenshots are inspected. These checks use an empty
  image collection and mocked Tauri IPC; they do not validate native GPU
  compositing, Stage Manager, or large-library performance. Temporary browsers
  are closed afterward. The owner's comparison app/server is preserved, and no
  additional server or native app is started.

## Palette and Workspace Footer: October 12, 2026

### Changes

- The opaque Unified shell changes from `#202020` to `#2b2b2b`. The neutral
  grid canvas remains `#191919`, and the native photo renderer is unchanged.
  The black aperture outline remains the base; one-pixel, zero-blur inset
  highlights and shadows add a restrained static bevel. No extra contour,
  dynamic lighting, blur, or native effect is introduced.
- The closed Library gutter shrinks from 56 to 24 px, reclaiming 32 px for the
  workspace. The right gutter stays 56 px because it contains tools.
- Grid/Detail, optional Inspector, and sorting now share the left side of the
  workspace footer and follow its panel-driven movement. No view controls are
  added to the side gutters. Filmstrip remains at the workspace's right edge.
- Sorting uses one HeroUI Dropdown at every width. Its radio section chooses
  Name, Size, Extension, or Rating; a separate Reverse order checkbox controls
  descending order. The checkbox stays open on click, Space, and Enter.
  Choosing a sort field closes the menu; Escape dismisses it without deselecting
  photos. Existing filter-store sorting behavior is reused.
- The center count says `4 in folder` or `2 of 4 in folder`, rather than
  presenting an ambiguous photo count alongside selection. This is a current-
  folder count, not a total catalog/library count. The deselection action is
  labeled Deselect all, with Cmd+D on macOS and Ctrl+D elsewhere. The existing
  native menu accelerator was already correct and is unchanged.
- Footer tracks center the readout on the workspace when space permits. Narrow
  workspaces suppress secondary readouts, compact controls, and preserve
  deselection rather than forcing overlapping text. At the 180 px minimum,
  essential controls take precedence over perfectly centered status text.
- Adjustment accordions lose their enclosing surfaces and rounded outlines.
  Collapsible headings remain, with faint dividers between sections. Slider
  behavior and disabled/unimplemented adjustments are unchanged.
- Folder-parent text, footer counts, search placeholder, and folder/chevron icons
  use brighter neutral tones appropriate to the lighter shell. The adjusted
  muted text measures approximately 5.08:1 against the shell; primary shell text
  measures approximately 12.22:1. This follows the
  [WCAG normal-text contrast threshold](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
  not a claim of whole-app WCAG conformance. Meaningful controls and decorative
  surface boundaries have different requirements under
  [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

### Remaining Design and Native Questions

The bottom workspace is the recommended location for photo actions such as
ratings, flags, and eventually copy settings or view/zoom controls. This pass
does not add unfinished actions or change their multi-selection semantics.
Folder totals could move beside Library context when that photo-action layout
is designed; explicit wording removes the immediate ambiguity.

Right-side docking remains unchanged. Short travel, preserved tool order, and
keeping selectors adjacent to their panel are preferred over a decorative
unfolding animation. Panel-header docking remains a potential next comparison.
The breadcrumb interaction is deliberately left alone.

Reported purple resize bars are not reproduced with React Scan's overlay
disabled. The actual Library handle is 7 px wide and the Filmstrip handle is
8 px high; their visible hover lines are neutral `rgb(181, 183, 187)`.
The Library active state clears after release in the browser check. React Scan
is a possible explanation for the purple overlay, not a confirmed diagnosis;
its script is preserved. The native focus/Stage Manager backing artifact also
remains unverified. No speculative repaint workaround or Rust change is added.

### Verification

- Production build/TypeScript, focused lint, formatting, and whitespace checks
  pass. The entry chunk is 885.13 kB before gzip and 269.56 kB after gzip;
  existing large-chunk and stale Browserslist warnings remain.
- Chromium and WebKit checks cover both footer arrangements, grouped sorting,
  repeated direction toggles, Space/Enter/Escape behavior, multi-selection and
  deselection, tooltip/menu shortcut agreement, folder click/chevron behavior,
  Info restoration, panel resizing, reduced motion, and neutral handle colors.
  The minimum-window/max-panel case includes Inspector and verifies that footer
  buttons remain within the workspace and do not overlap.
- Grid, Detail, menu, and minimum-workspace screenshots are inspected. Fixtures
  use four image records and an existing bitmap thumbnail with mocked IPC.
  These checks do not validate RAW decoding, native GPU/window compositing,
  Stage Manager, or large-library performance. Temporary browsers are closed;
  the owner's comparison app/server remains running, with no new servers or
  native apps started.

## Closing Unified Polish (October 12, 2026)

### Presentation Changes

- The filter tab now shares the aperture's subtle bevel colors. Two offset SVG
  strokes are clipped into the tab surface, leaving the black outline intact.
  They follow the existing contour animation without per-frame React state or
  Zustand updates. This adds local SVG painting, not a compositor-only effect.
- The sort trigger uses a fixed two-arrow icon. The ascending/descending glyph
  moves into the Reverse order option and updates with the current direction.
  Sorting retains its normal anchored popup and existing keep-open behavior;
  no additional shell morph is introduced.
- The folder counter returns to `4 photos`, or `4 of 10 photos` when filtered.
  The broader photo-action/footer redesign remains deferred.

### Native Focus Investigation

The owner's clarification identifies the purple bars as matching the macOS
accessibility highlight color. This supersedes the earlier tentative React Scan
explanation, but the exact native source remains unconfirmed. Chromium and
WebKit report no outline or box shadow on the focused Library resize handle;
the hover lines remain neutral. Full Keyboard Access can supply a system focus
highlight, and whether that mode is enabled still needs confirmation.

No accessibility roles, keyboard handlers, or focus behavior are removed, and
no speculative CSS workaround is added. The native purple highlight is not
claimed fixed.

### Verification and Scope

Production build, focused ESLint, formatting, and whitespace checks pass.
The entry chunk is 888.09 kB before gzip and 270.09 kB after gzip; existing
large-chunk and stale Browserslist warnings remain. Chromium and WebKit checks
cover sorting, menu keyboard behavior, selection, panels, and minimum-width
footer layout. Two-times-resolution pixel checks confirm the tab's subtle
highlight and shadow render beside the black contour; screenshots are inspected.

Browser checks use mocked IPC and four photo records. They do not validate
native accessibility overlays, Stage Manager, GPU compositing, or large RAW
libraries. Temporary browsers are closed. No new servers or native apps are
started, and the owner's running comparison environment is preserved.
No backend, dependency, history, or agent changes are included.

## Acceptance Fixes and Checkpoint (November 4, 2026)

The owner completed native acceptance and chose to checkpoint the Unified
direction, deferring further visual refinements to tracked follow-up work.

- The right contextual panel now uses the existing 300 px default width,
  constrained by the window budget. Its drag handle and obsolete persisted
  width store are removed. Library and Filmstrip remain resizable.
- Returning to a workspace restores its right panel, filmstrip, and tool
  positions without replaying their entrance animations. A shared hook compares
  the selected view with the last committed view; normal panel toggles retain
  their existing animation. Image loading and renderer orchestration are unchanged.
- Library spans through the bottom row of the shell. The footer occupies the
  workspace and right-side columns, leaving the full Library height scrollable
  and interactive.
- The Library resize highlight sits against the workspace edge and stops at
  the rounded corners. The Filmstrip highlight sits on its upper boundary and
  spans to the workspace borders. Both use a short 16 px opacity fade at each
  end; they do not trace an additional curve around the aperture.

### Verification

Production build and TypeScript pass. Focused ESLint reports no errors and the
existing renderer-error console warning. Formatting and whitespace checks pass.
Chromium and WebKit checks exercise repeated Grid/Detail switching, normal panel
toggle animations, Library dragging, fixed contextual-panel width, resize-line
alignment and masks, and the final folder row remaining clickable at the bottom.
At 900 by 600 with the Library at its permitted maximum, the workspace retains
240 px and the contextual panel stays 300 px. Desktop and compact screenshots
are inspected.

These checks use four image fixtures and mocked Tauri IPC against the owner's
running comparison server. They do not verify native GPU compositing or the
remaining Stage Manager and accessibility highlight reports. Temporary browsers
are closed; no new app/server is left running.

The checkpoint keeps Unified on `design/ui-unified-shell` and the comparison
launcher/shared notes on `design/ui-next-foundation`. Promoting the selected
shell and discussing component cleanup/design tokens remain subsequent work.

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

Unified now uses opaque shell surfaces around the native image aperture. The
other prototypes retain their reference styling. Native blur is outside the
current Unified design direction; no renderer/backend effects are introduced.
