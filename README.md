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
Clicking it opens the panorama together with the floor plan and all capture
points. Clicking a point on the plan goes there, the view direction is kept.
The timeline switches between site visits; the settings menu lists all captures
of the current point.

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
  plan. It is set with *Align direction* in the editor.

There is no database and no server-side code beyond loading the script: the file
syncs with the desktop client, moves with its folder and works through public
share links.

## Usage

- **Create:** *New → 360° walkthrough* in a folder with panoramas, then choose the
  floor plan image.
- **Edit** (needs write permission): the pencil in the viewer opens the editor.
  Images of the folder and its subfolders that are not placed yet are listed;
  select one and click on the plan for a new point, or on an existing point to add
  it as a new capture. Drag points to move them. *Align direction*: turn the
  panorama towards something you can find on the plan and click it there.
  Removing only drops images from the walkthrough, files are never deleted.
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

Supported: Nextcloud 33. Needs a browser with WebGL 2.

## License

AGPL-3.0-or-later, see [COPYING](COPYING).
