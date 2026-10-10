# UI and Performance Overhaul

Branch: `feature/ui-perf-overhaul`

This document records the reasoning, implementation boundaries, validation, and
merge-summary material for the UI and performance overhaul. Update it as each
reviewed commit is created.

## Goals

- Improve workspace responsiveness without changing image-processing results.
- Make panel, grid, filmstrip, and viewport interactions feel native and stable.
- Improve desktop-oriented keyboard and focus behavior.
- Migrate the component layer to HeroUI v3 and remove obsolete dependencies.
- Keep the renderer available across workspace changes without exposing it
  behind views that should be opaque.

## Completed Commits

### `5920788 fix(renderer): add presentation suspension controls`

Adds a presentation-only suspended state to the retained WGPU renderer.
Suspending presentation stops the current image from being composited while
leaving decoded inputs, textures, pipelines, adjustments, and renderer state in
memory. Resuming atomically applies the current viewport and transform before
presenting again.

The terminology intentionally uses `suspend` rather than `pause` or `stop`:

- `pause` already describes the renderer scheduling state.
- `stop` would imply renderer teardown or resource release.
- `suspend presentation` describes temporarily hiding output while retaining
  renderer resources.

Files:

- `src-tauri/src/commands/renderer.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/renderer/manager.rs`
- `src-tauri/src/renderer/renderer.rs`
- `src/services/api/renderer.ts`
- `src/types/commands.ts`

Validation performed before commit:

- `cargo fmt --check`
- `cargo check`
- `npx tsc --noEmit`

### `f0e72a8 fix(renderer): render after viewport updates`

Renders immediately after applying a logical viewport update and rebuilding the
presentation vertices. Previously, viewport geometry could change without being
presented until a later transform or scheduled render occurred. The frontend
viewport scheduler introduced later in this branch coalesces these updates so
immediate presentation does not create an unbounded IPC backlog.

Files:

- `src-tauri/src/renderer/manager.rs`

## Architecture Notes

### Renderer synchronization

Renderer commands serialize access through `Arc<Mutex<RendererManager>>`. This
is appropriate while one manager owns one mutable renderer. Expensive decoding
and filesystem work should remain outside the lock, and high-frequency frontend
updates should use latest-value/coalescing semantics instead of an FIFO queue.

A future orchestration pass may introduce a renderer actor or a bounded,
domain-specific Rust job scheduler. A generic IPC message queue is not currently
preferred because regular request/response commands retain clearer types,
errors, permissions, and ownership boundaries.

### Release behavior

Release Please selects the highest semantic version impact among commits since
the previous release. Multiple `feat` commits in one release produce one minor
version bump, not one minor bump per commit. The repository also enables
`bump-minor-pre-major`, so breaking changes below `1.0.0` produce a minor bump.

## Planned Commit Sequence

Superseded on October 9, 2026: preserve the remaining overhaul in one working
baseline commit before exploring a substantially different frontend. The
earlier sequence below records the intended review boundaries; it is no longer
a requirement for splitting the existing diff.

1. Migrate the component layer to HeroUI v3 and React 19.
2. Introduce viewport interaction and synchronization improvements.
3. Replace split-pane layout behavior with animated workspace panels.
4. Optimize grid, filmstrip, filtering, and thumbnail scheduling.
5. Apply desktop navigation, accessibility, and UI presentation refinements.
6. Finalize documentation and merge notes.

## Current Review: HeroUI v3 Migration

The migration must be committed as one coherent dependency/API change. The
lockfile is reviewed through its declared dependency changes and validation,
not line by line.

Dependency and application bootstrap files:

- `package.json`
- `package-lock.json`
- `src/main.tsx`
- `src/provider.tsx`
- `src/styles/globals.css`
- `src/styles/hero.ts` (removed)
- `tailwind.config.js` (removed)
- `src/components/primitives.ts` (removed)
- `src/components/theme-switch.tsx` (removed)

New shared component files:

- `src/components/ui/editor-tooltip.tsx`
- `src/components/ui/empty-state.tsx`
- `src/features/edit-panel/components/edit-panel-section.tsx`

Converted component areas:

- Bottom toolbar, sidebar, title bar, toolbar buttons, and adjustment sliders.
- Rating and flag controls.
- Edit-panel sections and tool panels.
- File-browser tree controls and HeroUI selection types.
- Filter menus, chips, search input, and sort selector.
- Grid, filmstrip, thumbnail, and histogram components.
- Inspector checkpoint controls and inspector panels.
- Settings and cache-management modals.

Review and staging procedure:

1. Review `package.json`, bootstrap files, and removed v2 configuration.
2. Review the shared v3 wrappers.
3. Review converted components by feature area, staging migration hunks with
   `git add -p` and leaving unrelated behavior/performance hunks unstaged.
4. Temporarily isolate the staged snapshot and run TypeScript, lint, audit, and
   the production build before committing.
5. Commit as `refactor(ui): migrate to HeroUI v3`.

### Dependency cleanup decisions

`@tauri-apps/plugin-fs` is removed from the frontend package graph because no
TypeScript module imports or invokes its JavaScript API. Current filesystem work
is performed by custom Tauri commands backed by Rust `std::fs` operations. The
Rust `tauri-plugin-fs` dependency, plugin registration, and `fs:default`
capability remain in place. Removing that backend plugin and permission is a
separate security/capability cleanup that should be verified independently; the
UI migration does not claim to remove the complete Tauri filesystem plugin.

The dependency migration was performed on July 20, 2026. The full npm audit
reported zero known vulnerabilities at that time. A September 30, 2026 audit
reported six newer advisories, all confined to development/build tooling;
`npm audit --omit=dev` still reported zero production vulnerabilities.

Current affected paths and previewed compatible fixes:

- ESLint: `@humanfs/node` 0.16.6 -> 0.16.8.
- ESLint and TypeScript ESLint glob matching: `brace-expansion` 1.1.16 ->
  1.1.21 and 2.1.2 -> 2.1.7.
- Autoprefixer/Babel target resolution: `browserslist` 4.25.1 -> 4.29.3.
- ESLint configuration parsing: `js-yaml` 4.3.0 -> 4.3.2.
- PostCSS internals: `nanoid` 3.3.16 -> 3.3.19.
- Direct build dependency: `postcss` 8.5.20 -> 8.5.28.

`npm audit fix --dry-run` indicated that these are compatible lockfile updates,
not forced major-version migrations. Apply and validate them as an explicit
dependency-security step rather than relying on the age of the earlier audit.

### Commit integrity

The HeroUI migration contains changes in files that also carry later behavior
and performance work. Prefer a small number of larger, buildable subsystem
commits over extensive hunk editing that creates fragile intermediate states.
Review changes by concern, but allow a commit to include tightly coupled
migration, layout, and component work when separating them would make the
snapshot invalid. Use partial staging only for clearly independent changes.

Before each commit, temporarily isolate the staged snapshot from the remaining
unstaged work and validate that exact state. If it does not build, restore the
unstaged work and expand the commit boundary rather than accepting a broken
intermediate commit.

### Root provider decisions

`createAppMenu` remains the function that constructs and installs the native
Tauri menu. `ensureAppMenu` is a module-level, promise-caching wrapper around it.
It makes initialization idempotent across React development remounts and shares
the same in-flight promise if initialization is requested twice. This matters
because React Strict Mode intentionally reruns effects during development. One
known tradeoff is that a rejected promise remains cached, so automatic retry is
not currently supported.

React Router was removed because Extents has no URL routes and used the router
only to provide `navigate` and `useHref` to the HeroUI v2 provider. HeroUI v3 no
longer uses that root provider, leaving `BrowserRouter` without a consumer.
Workspace navigation continues to use application state rather than browser
history.

Browser navigation history is intentionally separate from editor history.
Deep links can be translated into application actions without React Router,
while undo/redo needs image-specific commands or state snapshots, transaction
coalescing, redo invalidation, and memory controls.

`WorkspaceWidthTransitionProvider` is unrelated to routing. Animated side
panels report transition start/completion through unique source tokens. The
provider tracks all active sources so overlapping left/right transitions do not
signal completion prematurely, then directly notifies subscribers. The virtual
grid records this state in refs and uses it to coordinate column-reflow animation
timing with panel motion. The transition state is not stored in React state, so
per-frame panel activity does not rerender the full provider subtree.

## Merge Summary Draft

This branch modernizes Extents' frontend component foundation, isolates costly
workspace work, and improves renderer presentation behavior. It retains the
WGPU image across workspace changes, coalesces high-frequency renderer updates,
uses stable virtualized gallery geometry, replaces competing pane/animation
behavior with coordinated workspace panels, and migrates the UI to HeroUI v3
and React 19.

## Verification Log

Record final validation here as the branch is assembled:

- [x] Frontend typecheck (October 9, 2026, via `npm run build`)
- [x] Frontend lint checked: zero errors and 33 warnings; the stricter
      `--max-warnings=0` invocation fails on those warnings
- [x] Frontend production build
- [x] Rust formatting (one mechanical formatting adjustment in `manager.rs`)
- [x] Rust check (`cargo check --offline`)
- [ ] Native Tauri interaction pass

Build warnings remain for stale Browserslist data and the large initial bundle.
The checkpoint preserves the functional state reported by the owner; it does
not claim a new exhaustive native regression pass.

## Frontend Exploration Handoff

The next pass builds new application composition beside the current frontend,
using feature-based organization. Three independent branches explore a unified
inset shell, an editor-focused shell, and a rail-based modular shell. Existing
feature logic is a reference and reusable foundation, not a constraint on the
new visual design.

Carry forward GPU rendering, viewport scheduling and transform behavior,
virtualized gallery surfaces, thumbnail scheduling, filtering/selection
continuity, file-browser semantics, annotations, sidecars, and keyboard
navigation. Grid browsing, opening images in Detail, core panel toggles and
resizing, and the filmstrip must work in every experiment. Inspector and other
secondary surfaces can remain on their existing implementation initially.

Keep the Rust backend unchanged during the experiments. Record any frontend
performance changes. Agent features and real document-tab semantics are
deferred. macOS is the primary test target; this does not prescribe an Apple
visual style or new platform-specific integrations.
