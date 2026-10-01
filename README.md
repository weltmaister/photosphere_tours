# Photosphere Tours

Nextcloud app for 360° walkthroughs: panoramas on a floor plan, with a timeline.
A lean replacement for site documentation tools like HoloBuilder, built on
[Photo Sphere Viewer](https://photo-sphere-viewer.js.org/).

Fork of [files_photospheres](https://github.com/nextcloud/files_photospheres) by
Robin Windey, reduced to walkthroughs. Both apps can run side by side: single
panoramas keep opening in files_photospheres (or the Viewer app), this app only
reacts to walkthrough files.

## How it works

A walkthrough is one file, `360-Rundgang.json`, in a folder of panoramas.
Clicking it opens the panorama together with a side bar: the floor plan with all
spots and a list of the spots. Clicking a spot goes there, the view direction is
kept. *Site visit* at the bottom shows every spot as it was on one day; spots with
several captures show *n captures* in the list and unfold to pick one. The floor
plan zooms (buttons, wheel, two fingers) and pans by dragging. The side bar can be
resized or hidden; on phones it is a bottom sheet.

```json
{
  "version": 1,
  "title": "Ground floor",
  "plan": "../Floor plans/Ground floor.png",
  "spots": [
    { "name": "Hall", "x": 0.41, "y": 0.29,
      "captures": [
        { "file": "001_2024-08-14_1602_Hall.jpg", "date": "2024-08-14T16:02", "yaw": 0 },
        { "file": "later/2025-09-24_1031_Hall.jpg", "date": "2025-09-24T10:31", "yaw": 12.5 } ] }
  ]
}
```

- `plan` and `file` are relative to the folder of the JSON file.
- `x`/`y` are normalised plan coordinates (0–1, origin top left).
- `yaw` (degrees) is the raw panorama direction that looks towards the top of the
  plan. It is set with *Set view direction* in the editor.

There is no database and no server-side code beyond loading the script: the file
syncs with the desktop client, moves with its folder and works through public
share links.

## Usage

- **Create:** put the 360° images and a floor plan (PDF, PNG, JPG, WebP or SVG) into
  one folder. A bar above the file list offers *Create 360° walkthrough* (also in the
  folder's menu: *Open as 360° walkthrough*, and under *New*). With one floor plan
  in the folder it is taken right away, otherwise you pick it. A PDF plan is turned
  into a PNG next to it. Only the folder itself counts – subfolders (for example
  compressed copies) are ignored.
- **Open:** the bar above the file list (*Open walkthrough*), the folder's menu, or a
  click on `360-Rundgang.json`.
- **Edit** (needs write permission): *Edit* opens the editor – floor plan on the
  left, panorama and the tabs *Spot* and *New images* on the right.
  *New images* lists images of the folder that belong to no spot yet; pick one and
  click on the plan for a new spot, or on a spot to add it as another capture. With
  a PDF plan, a new spot is named after the nearest room stamp. Drag spots to move
  them (or use the arrow keys).
  *Set view direction*: turn the panorama towards something you can find on the
  plan and click it there. Removing only drops images from the walkthrough, files
  are never deleted. The capture date comes from the file name, else from the
  camera's EXIF data. When a newer floor plan appears in the folder the editor
  offers to switch; *Change floor plan* does it by hand.
- **Rename:** the pencil next to a spot in the list renames it and saves right away;
  the spot's image files are renamed too (`2024-08-14_1602_<name>.jpg`). In the
  editor this is a switch under *Spot*.
- **Keyboard:** Tab through header, plan, spot list and site visits; arrow keys turn
  the focused panorama (+/− zoom) and move the focused spot in the editor; Escape
  leaves modes, then the editor, then the walkthrough.
- **Share:** share the folder by link. Guests see the walkthrough read-only.

## Importing a HoloBuilder backup

`tools/holobuilder-import.mjs` creates a walkthrough per floor folder from a backup
with `_meta/index.csv`, `_meta/index.json`, `_meta/slideNodes_<floor>.json` and
`Grundrisse/<floor>.png`:

```bash
node tools/holobuilder-import.mjs "<backup folder>"            # dry run with report
node tools/holobuilder-import.mjs "<backup folder>" --write    # write the files
node tools/holobuilder-import.mjs "<backup folder>" --write --out=<dir>   # write elsewhere
```

## Development

```bash
npm ci
npm test          # vitest
npm run build     # webpack → js/
make appstore     # build/artifacts/appstore/photosphere_tours.tar.gz
```

Supported: Nextcloud 33 and 34, desktop and phone. Needs a browser with WebGL 2.

## License

AGPL-3.0-or-later, see [COPYING](COPYING).
