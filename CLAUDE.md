# CLAUDE.md — photosphere_tours

Nextcloud app (NC 33) for 360° walkthroughs: a `360-Rundgang.json` in a folder of
panoramas opens the panorama with the floor plan, capture points and a timeline.
Fork of nextcloud/files_photospheres, stripped to walkthroughs; runs next to it.

## Constraints

- **No backend.** PHP only loads the script (`lib/Listener/AddScriptsListener.php`).
  All reads and writes go through WebDAV using the node's `source`, which is
  `remote.php/dav/files/<user>/…` logged in and `public.php/dav/files/<token>/…` on
  share pages (`src/dav.js`). Do not add controllers or DB tables without a reason.
- **The file format is the contract** (`src/tour.js` header, README). Paths are relative
  to the JSON file; `x`/`y` normalised 0–1; `yaw` is the raw panorama yaw (deg) that
  looks at plan-up, applied as `sphereCorrection.pan = -yaw`, so view yaw 0 = plan-up.
- **Keep it simple** (explicit wish of the owner): one folder = one walkthrough, no floor
  switching, no arrows inside the panorama, no compare view — until asked for.
- `js/` is build output and gitignored; `make appstore` builds the tarball.
- Never write into the owner's Nextcloud sync folders without asking. The HoloBuilder
  importer (`tools/holobuilder-import.mjs`) is a dry run unless `--write`; use `--out`
  to write elsewhere.

## Layout

- `src/main.js` – file action for `360-Rundgang.json`, "New → 360° walkthrough"
- `src/viewer.js` – overlay: Photo Sphere Viewer + MapPlugin (plan) + SettingsPlugin
  (captures of the current point) + timeline chips
- `src/editor.js` – plan editor (own zoomable plan, inbox of unplaced images, align, save
  with `If-Match`)
- `src/tour.js` – pure logic, fully unit-tested (`tests/tour.test.js`)
- `tools/holobuilder.js` + `holobuilder-import.mjs` – HoloBuilder backup import
- `tools/l10n-build.mjs` – `l10n/de_DE.json` (formal, source) → de/de_DE js+json

## Commands

`npm test` · `npm run build` · `node tools/l10n-build.mjs` after changing strings ·
`make appstore`
