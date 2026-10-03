# CLAUDE.md — photosphere_tours

Nextcloud app (NC 33–34) for 360° walkthroughs: a `360-Rundgang.json` in a folder of
panoramas opens the panorama with the floor plan, a spot list and visits.
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
- Never write into the owner's Nextcloud sync folders without asking. No real names,
  project codes or names of other products in the public repo; descriptions stay neutral
  (not aimed at one trade, no comparison with other tools).

## Layout

- `src/main.js` – runs on every Files page, keep it small: file actions, "New → 360°
  walkthrough", hint bar. Heavy parts are lazy chunks (`folder`, `create`, `viewer`, `pdf`);
  the bar's folder check must stay in the small `folder` chunk.
- `src/constants.js` (app id, file name), `src/l10n.js` (`t`, `n` plurals, `errorText`)
- `src/app.js` – mounts `TourApp.vue` as full-screen modal dialog (page behind inert)
- `src/dav.js` (WebDAV), `src/folder.js` (what a folder holds; only the folder itself),
  `src/create.js` (create a walkthrough, choose/convert the plan), `src/pdf.js` (PDF → PNG,
  room text), `src/exif.js`, `src/rooms.js`, `src/rename.js` (image files follow spot
  names; undone when the save fails), `src/bar.js` + `FolderBar.vue` (hint bar)
- `src/components/TourApp.vue` – state, loading, editing, saving and the CSS grid. One
  `PanoramaView` for all layouts. Parts: `TourHeader`, `ViewerSidebar` (plan + list,
  resizable), `PhoneSheet`, `TabBar` (ARIA tabs), `NoteBar` (note + action), `SpotForm`,
  `NewImages`, `SpotList`, `SiteVisits`, `FloorPlan` (zoom, pan, pinch, pin drag, arrow
  keys); `src/composables/useLayout.js` (phone query, stored settings)
- Spots are objects in a reactive tour: keep per-spot state in a `reactive(Map)` keyed by
  the spot or in a `Set` of `toRaw(spot)` – never by index, never mix raw and proxy.
- `src/tour.js`, `folder.js`, `exif.js`, `rooms.js`, `rename.js` – pure logic, unit-tested
  (`tests/`)
- `tools/l10n-build.mjs` (`l10n/de_DE.json` formal → de/de_DE) and `tools/l10n-check.mjs`
- `tools/demo/` – CC0 demo data for the store screenshots (`screenshots/`, ≤ 2 MiB each)

## Commands

`npm test` (vitest + translation coverage) · `npm run build` · `npm run l10n` after
changing strings · `make appstore`
