# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/marugamiii/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/marugamiii/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio — a static web app that turns your photos and a caption into cover art in the style of GTA 6's posters — multi-panel poster look, bold condensed lettering, sunset / neon Vice City colour grade — and exports it as a PNG to share.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

## Use it

Serve `app/` with any static server and open `index.html` in desktop Chrome:

```sh
node serve.ts        # then open http://localhost:8080
```

1. Load up to three photos (hero + two panels), or pick the bundled samples.
   Drag the cover to move a photo, click a panel to pick it; each panel has
   its own zoom, or fill every panel with the hero photo.
2. Pick a layout (Poster, Full Bleed, Hero + Strip) and a colour grade
   (Sunset, Neon Night, Golden Hour).
3. Write the title, the place badge and a tagline.
4. Choose an export size — 1080×1080, 1080×1350 or 1920×1080 — and export
   the PNG.

Photos are read on your own machine and never uploaded. The app works fully
offline: every script, font and image it loads is a file under `app/`.

## Originality

No Rockstar Games logo, wordmark, official artwork, character or font is
used. The lettering uses Anton, Archivo Black and Bebas Neue, shipped as
files under `app/fonts/` under the SIL Open Font License (see
`app/fonts/OFL-*.txt`). The sample photos are model-made images, free to use.

## Layout

- `app/` — the app: `index.html`, `style.css`, `src/cover.js` (the poster
  renderer), `src/main.js` (the editor), `src/shots.js` (fixed scenes for
  screenshots), `fonts/`, `samples/`.
- `screenshots/` — 3–4 screenshots: the first is an exported cover, one
  shows the editor with a photo loaded, the others show exported covers in
  the other post sizes. They were taken with `shots.mjs` (see `shots.json`).
- `main.ts` — the make.fun entrypoint: copies `app/` + `screenshots/` to
  `/output` and writes `/output/dossier.json`.
- `vendor/makefun-app.ts` — make.fun's dossier library, unchanged from the kit.
- `serve.ts` — a tiny static server for local testing.

## Screenshots

`shots.json` lists the four shots and the `?shot=` URL that renders each
one; `shots.mjs` serves the app, screenshots each scene headlessly and
scales it into `screenshots/`.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
