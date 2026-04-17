# Changelog

## [0.0.4](https://github.com/OODemi52/extents/compare/Extents-v0.0.3...Extents-v0.0.4) (2026-04-17)


### New Features

* add active sidecar state and lifecycle sync on the frontend ([d7073d0](https://github.com/OODemi52/extents/commit/d7073d05c245664e7ef161031c2334621c08ee45))
* add versioned .exts sidecar loading and atomic recipe save ([b1a695f](https://github.com/OODemi52/extents/commit/b1a695f45421681c33e17645ee6cf3ca5b14a11d))
* move live image rendering to working-space GPU textures and shader display math ([c26d9a1](https://github.com/OODemi52/extents/commit/c26d9a16ecd01edc6f7ac711a0442f64669518eb))
* sync entire sidecar state to the renderer through a unified command ([f9aefe2](https://github.com/OODemi52/extents/commit/f9aefe22266730bf57788e770f669d58b2284d47))
* wire live exposure slider updates through renderer display uniforms ([67d0a5a](https://github.com/OODemi52/extents/commit/67d0a5a09c8b8ec239fd4569f9926c3625a35355))


### Bug Fixes

* add live exposure uniform updates to the renderer ([fdcbb84](https://github.com/OODemi52/extents/commit/fdcbb84d5cdccd0a49095d38aea6ae536d6558cc))
* stop replacing correct display params in renderer with default params ([2fa8fdf](https://github.com/OODemi52/extents/commit/2fa8fdfc5209d2433d81bef8175b1f26d04f1e55))


### Performance Improvements

* move processing pipeline LUTs into a shared module and collapse SDR display into one pass ([e193df3](https://github.com/OODemi52/extents/commit/e193df3c71ea4ddcb98452deed4daa64eb0c4c7e))
* use LUTs for light conversion in normalization and display ([a381e62](https://github.com/OODemi52/extents/commit/a381e62cf8818773137105a334d7ab266bd27266))

## [0.0.3](https://github.com/OODemi52/extents/compare/Extents-v0.0.2...Extents-v0.0.3) (2026-01-11)


### Bug Fixes

* Renderer now clears to a dark gray screen instead of a transparent one ([8f29c18](https://github.com/OODemi52/extents/commit/8f29c184988b6861f3cada63921ca04a74c6337b))

## [0.0.2](https://github.com/OODemi52/extents/compare/Extents-v0.0.1...Extents-v0.0.2) (2026-01-10)


### Bug Fixes

* Bundle rusqlite into build ([4768066](https://github.com/OODemi52/extents/commit/47680662c10a2c14a9313f68ae523fe62a6db4ce))
* Reintroduced the window transparency config option ([9310e2c](https://github.com/OODemi52/extents/commit/9310e2c799ca554b6d27771bd59eada0372dbb49))

## 0.0.1 (2026-01-09)


### Features

* **backend:** Implement cache management commands ([00904a3](https://github.com/OODemi52/extents/commit/00904a3990ade6385b66c40bb51d03540268c1ec))


### Bug Fixes

* added bug report and feature request templates ([a12d4e6](https://github.com/OODemi52/extents/commit/a12d4e6abb74b1a2655429414156a99ba4e60afe))
* remove references to window transparency in tauri config file ([dfde2de](https://github.com/OODemi52/extents/commit/dfde2deb71101d0042ff7f7b4900359e290778e4))
* Removed Background Prefetch Hook ([b25c1be](https://github.com/OODemi52/extents/commit/b25c1be6164e8a9c224b89ebe3806e4725c4a942))
* Removed references to window transparency in tauri config file ([a2e1345](https://github.com/OODemi52/extents/commit/a2e1345881476647cf2badda66a0601c3ee4007f))


### Miscellaneous Chores

* release 0.0.1 ([1447363](https://github.com/OODemi52/extents/commit/1447363e3b3d165815cbee4908a38a6421bcdc39))
