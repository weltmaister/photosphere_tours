# CLAUDE.md — photosphere_tours

Nextcloud app (NC 33–34) for 360° walkthroughs: a `360-Rundgang.json` in a folder of
panoramas opens the panorama with the floor plan, a spot list and site visits.
Fork of nextcloud/files_photospheres, stripped to walkthroughs; runs next to it.

## Constraints

- **No backend.** PHP only loads the script (`lib/Listener/AddScriptsListener.php`).
  All reads and writes go through WebDAV using the node's `source`, which is
  `remote.php/dav/files/<user>/…` logged in and `public.php/dav/files/<token>/…` on
  share pages (`src/dav.js`). Do not add controllers or DB tables without a reason.
- **The file format is the contract** (`src/tour.js` header, README). Paths are relative
  to the JSON file; `x`/`y` normalised 0–1; `yaw` is the raw panorama yaw (deg) that
  looks at plan-up, applied as `sphereCorrection.pan = +yaw` (PSV shows raw r at view r − pan),
  so view yaw 0 = plan-up.
- **Keep it simple** (explicit wish of the owner): one folder = one walkthrough, no floor
  switching, no arrows inside the panorama, no compare view — until asked for.
- **Nextcloud look only**: `@nextcloud/vue` components and Nextcloud CSS variables, no own
  colours, fonts or sizes. Rules: `docs/ux/gestaltung.md`. Terms and all texts:
  `docs/ux/texte.md` (one term per thing: Rundgang, Grundriss, Standort, Aufnahme,
  Begehung). Vue templates use `t()` from `src/l10n.js` (no double escaping).
- `js/` is build output and gitignored; `make appstore` builds the tarball. Bump the
  version on every deploy to a test instance, otherwise browsers keep the old script.
- Never write into the owner's Nextcloud sync folders without asking. The HoloBuilder
  importer (`tools/holobuilder-import.mjs`) is a dry run unless `--write`; use `--out`
  to write elsewhere. No real names or project codes in the public repo.

## Layout

- `src/main.js` – file action for `360-Rundgang.json`, "New → 360° walkthrough"
- `src/app.js` – mounts `TourApp.vue` as full-screen modal dialog (page behind inert)
- `src/folder.js` (what a folder holds; only the folder itself), `src/create.js` (create
  a walkthrough, choose/convert the plan), `src/pdf.js` (PDF → PNG, pdf.js), `src/exif.js`,
  `src/bar.js` + `FolderBar.vue` (hint bar above the file list)
- `src/components/TourApp.vue` – state and layout: header, side bar (plan + spot list,
  resizable), panorama, site visits; editor (plan large, 520 px column with panorama and
  tabs); phone: bottom sheet / tabs. One `PanoramaView` for all layouts (CSS grid areas).
- `FloorPlan.vue` (zoom, pan, pinch, pin drag, arrow keys), `PanoramaView.vue` (PSV
  core, no navbar), `SpotList.vue` (rename, "n captures" toggle + capture choice),
  `SiteVisits.vue`, `SpotForm.vue`, `NewImages.vue`
- `src/tour.js` – pure logic, unit-tested (`tests/tour.test.js`)
- `tools/holobuilder.js` + `holobuilder-import.mjs` – HoloBuilder backup import
- `tools/l10n-build.mjs` (`l10n/de_DE.json` formal → de/de_DE) and `tools/l10n-check.mjs`
- `tools/demo/` – CC0 demo data for the store screenshots (`screenshots/`, ≤ 2 MiB each)

## Commands

`npm test` (vitest + translation coverage) · `npm run build` · `npm run l10n` after
changing strings · `make appstore`
