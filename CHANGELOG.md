# Changelog

## [0.4.1](https://github.com/OODemi52/extents/compare/Extents-v0.4.0...Extents-v0.4.1) (2026-07-12)


### Bug Fixes

* persist and restore window size and position ([c08188a](https://github.com/OODemi52/extents/commit/c08188ad628c0d09cff7ffa5740ddcd2bc519d22))


### Documentation

* update project readme ([e0eeda2](https://github.com/OODemi52/extents/commit/e0eeda27d672f1b8c806b3d482e6bb750d9a228e))

## [0.4.0](https://github.com/OODemi52/extents/compare/Extents-v0.3.0...Extents-v0.4.0) (2026-07-12)


### New Features

* add gated inspector workspace ([3ee9f18](https://github.com/OODemi52/extents/commit/3ee9f183fa2388755ddb110d5c93484049019993))
* add gated inspector workspace ([ae9a775](https://github.com/OODemi52/extents/commit/ae9a775999c0a0f7a3a60b9fb48692d5c897186e))
* add inspector checkpoint capture and review ([785f563](https://github.com/OODemi52/extents/commit/785f563d913a66a15d42cfc2bfbe518c1fe7788e))
* exposed inspector metadata ([a3e2c7b](https://github.com/OODemi52/extents/commit/a3e2c7b531523ad91139949e46e51ef6a7746715))


### Bug Fixes

* keep image workspaces mounted during view switches ([b6978bc](https://github.com/OODemi52/extents/commit/b6978bc2ee1e1030ee8a431977b1719514458725))
* stabilize renderer viewport sizing ([ed08fa9](https://github.com/OODemi52/extents/commit/ed08fa9806f4dc6b0d352e86322093eddbe2db52))
* stabilize renderer viewport sizing ([526c57f](https://github.com/OODemi52/extents/commit/526c57f994d91b12f9e16ad7e947fc8a32049ba7))

## [0.3.0](https://github.com/OODemi52/extents/compare/Extents-v0.2.0...Extents-v0.3.0) (2026-07-01)


### New Features

* add GPU ratio-corrected RAW demosaic with blended MHC smooth fallback ([7366196](https://github.com/OODemi52/extents/commit/7366196c6babee87fb7b4772b523bddb080e915d))
* add guided RAW highlight recovery ([00ea0f2](https://github.com/OODemi52/extents/commit/00ea0f2f3618da4070fa85d3847c8661c7a627bf))
* add naive RAW highlight reconstruction stage ([758ed9f](https://github.com/OODemi52/extents/commit/758ed9ff01df28c2a6378bacfb1ae97f2177b07d))
* detect RAW highlight clipping from sensor white levels ([c9f2290](https://github.com/OODemi52/extents/commit/c9f22909ba53a1b8be7c6f82baf560ba79374d51))


### Bug Fixes

* improve RAW display tone mapping using ACES fitted curve ([f3daf00](https://github.com/OODemi52/extents/commit/f3daf006bfc02d88fef4d025bef5f5078216b513))
* parameterize base RAW display exposure ([ad3cdc0](https://github.com/OODemi52/extents/commit/ad3cdc02530daf692aace41f8c86d697a9117a86))
* reset RAW highlight baseline and clarify shader naming ([6ca691a](https://github.com/OODemi52/extents/commit/6ca691a1dc58986e53e36a7a2425a617c1ac39f7))

## [0.2.0](https://github.com/OODemi52/extents/compare/Extents-v0.1.1...Extents-v0.2.0) (2026-06-29)


### New Features

* add GPU development graph boundary ([55d8fd3](https://github.com/OODemi52/extents/commit/55d8fd31645ec60be4377b1ccf2a1acd98751824))
* add image source decode entrypoint ([3e3dc80](https://github.com/OODemi52/extents/commit/3e3dc80fb384fdc46f07bacc9c6261cdf66288eb))
* add raster image source model ([58a5385](https://github.com/OODemi52/extents/commit/58a538530742f73c1a1fbb36b2f1f3a3a55c2ed7))
* add RAW image source model ([fdb02cb](https://github.com/OODemi52/extents/commit/fdb02cb71d7de3ede409a6bd3c0911161fc2f974))
* develop raster sources on GPU ([1db92f1](https://github.com/OODemi52/extents/commit/1db92f159ed19ef049493b79be6655343c1585d8))
* develop RAW inputs on the GPU ([95c1ac1](https://github.com/OODemi52/extents/commit/95c1ac177bc709b994ae15c49bdf54502bd4abf2))
* move output transform into GPU graph ([c2e99c8](https://github.com/OODemi52/extents/commit/c2e99c8ab532dfe8e6ebe5ec45f5a8bfc1254ffe))
* process exposure in GPU image graph ([0929f9b](https://github.com/OODemi52/extents/commit/0929f9b17c18584026ef042b437fb624cf454466))

## [0.1.1](https://github.com/OODemi52/extents/compare/Extents-v0.1.0...Extents-v0.1.1) (2026-06-24)


### Bug Fixes

* remove unsafe renderer window lifetime ([8bc9153](https://github.com/OODemi52/extents/commit/8bc9153d208c40b8fe9976eb85a89bd1f476cb77))

## [0.1.0](https://github.com/OODemi52/extents/compare/Extents-v0.0.4...Extents-v0.1.0) (2026-05-02)


### New Features

* move raw white balance and camera calibration into app-owned development path ([d059999](https://github.com/OODemi52/extents/commit/d059999fe5529ea7380b5caa477cda174ff65abe))


### Bug Fixes

* apply soft knee to exposure math in shader ([46f8f72](https://github.com/OODemi52/extents/commit/46f8f721f850ae875d22a51f73e99aed2380cd54))
* preserve headroom in RAW color development ([4bf1dea](https://github.com/OODemi52/extents/commit/4bf1deacd607e52c86a02bdc714019d9b84bcf93))
* preserve headroom in RAW color development ([e81ba2a](https://github.com/OODemi52/extents/commit/e81ba2a93a66631172387d6bcdd1bc838d952056))
* removed calibrate and wb step from rawler pipeline ([e9a6c44](https://github.com/OODemi52/extents/commit/e9a6c442562ba240674a20510584e72ecebb34b7))

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
