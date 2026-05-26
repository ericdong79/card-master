# P1 #7 — Lazy Load Chinese Kaiti Font

## Strategy: Option B (on-demand JS load)

The 6.7 MB `kaiti.woff2` is only needed by pinyin-hanzi cards when the user has
opted into `hanzi_font: "kaiti"` in their profile (default is `"default"`,
which uses system fonts: `STKaiti`, `KaiTi`, `Noto Serif SC`, …).

Two narrow call sites consume the font, both via the shared
`HanziPracticeGrid`:

- `client/src/features/cards/previews/pinyin-hanzi/pinyin-hanzi-card-preview-content.tsx`
- `client/src/features/review/components/pinyin-hanzi-review-content.tsx`

That made Option B clean: gate the font load behind a `useEffect` in the
shared component, fire it only when the active profile actually selects
`kaiti`. A module-level promise dedupes repeat loads.

## Files changed

- `client/src/lib/fonts/load-kaiti.ts` (new) — exports `loadKaitiOnce()`.
  Statically imports `../../assets/fonts/kaiti.woff2` so Vite still
  fingerprints and emits it; constructs a `FontFace` with `display: "swap"`
  and adds it to `document.fonts`. Idempotent. Safe in SSR/test environments.
- `client/src/index.css` — removed the `@font-face` rule for
  `CardMasterKaiTi` and the `::before { content: ""; font-family: ... }`
  preload hack that forced the browser to fetch it eagerly. Left a comment
  pointing at the new loader. System serif fallbacks in
  `.font-card-master-kaiti` remain, so users see Chinese characters
  immediately even before kaiti loads.
- `client/src/features/cards/previews/pinyin-hanzi/hanzi-practice-grid.tsx` —
  added `useEffect` that calls `loadKaitiOnce()` when
  `hanziFontPreference === "kaiti"`.

`client/index.html` had no `<link rel="preload">` for kaiti, so nothing to
remove there.

## Build / test status

- `npm run build` (client) — passes. `dist/assets/kaiti-*.woff2` (6.7 MB) is
  still emitted, but it is no longer referenced from `index-*.css` (only
  `CardMasterPixel` remains in the critical font-face list) and not preloaded
  from `index.html`. The static font import lives in the lazy
  `hanzi-practice-grid-*.js` chunk (2.08 KB gzip 1.05 KB).
- `npm test -- --run` — 76/76 pass across 19 files.

## FCP impact (estimated)

- Before: every page load fetched ~6.7 MB of `kaiti.woff2` as a critical
  resource (the `::before` hack ensured the browser actually downloaded it
  even on pages that did not render hanzi). On a typical 4G connection
  (~5 Mbps) this added ~10 s to the critical path and competed with JS/CSS.
- After: zero bytes of kaiti on the critical path for any user. Only
  pinyin-hanzi users who explicitly opted into the font ever fetch it, and
  even then it loads in parallel with their first hanzi render with a swap
  fallback to system serif.

## Related (not fixed this round)

- `client/src/assets/fonts/xst.woff2` (`CardMasterPixel`) is 451 KB and
  declared as a regular `@font-face` in `index.css`. It is much smaller and
  also `font-display: swap`, so the FCP impact is far lower, but it is also
  optional (only used when `hanzi_font: "pixel"` or where the pixel font is
  explicitly applied). Worth a follow-up to apply the same on-demand
  pattern.
