# Markers, resizable dividers and location – design

Date: 2026-10-13 · Status: approved in conversation, awaiting review of this document
Target release: 0.6.0

## Goal

1. Resizable dividers: floor plan / spot list in the viewer side bar, panorama /
   editing panel in the editor.
2. **Markers** (de: *Markierung*): a photo and/or a short text attached to a capture,
   optionally at a place in the panorama. Shown as clickable icons in the panorama,
   with a gallery for photos without a place. Created and edited in the editor.
3. "Open in OpenStreetMap" for walkthroughs with a known location.

Not part of this release (noted for later): jump arrows between spots.

## 1. Terms

New term in `docs/ux/texte.md`: **Markierung** / **Marker** – a text and/or photo
belonging to one capture, optionally placed in the panorama. One term for all three
cases (placed photo, comment, unplaced photo). The unplaced ones are shown as
"Fotos an diesem Standort" / "Photos at this spot".

## 2. File format

Optional per capture, ignored by older versions, existing walkthroughs stay valid:

```json
{ "file": "2024-11-26_1018_Room.jpg", "date": "2024-11-26T10:18", "yaw": 12.5,
  "markers": [
    { "yaw": 83.0, "pitch": -12.0, "text": "Water damage", "file": "2D-Bilder/2024-11-26_10-18-38.jpg" },
    { "file": "2D-Bilder/2024-11-26_10-21-02.jpg" },
    { "yaw": 200.5, "pitch": 4.0, "text": "Check the cable duct" }
  ] }
```

- `yaw` (0–360) / `pitch` (−90–90): **raw panorama coordinates** in degrees, the
  same frame as the image itself – not the plan-aligned view. Correcting a capture's
  view direction therefore never moves its markers. Both present or both absent.
- `text`: optional, plain text, max. 2000 characters, newlines allowed; the first
  line is the title.
- `file`: optional, relative to the walkthrough file like every other path;
  photos live in the subfolder `2D-Bilder/` next to the walkthrough.
- A marker needs `text` or `file`.
- Validation in `src/tour.js` (`parseTour`), with unit tests; serialisation keeps
  the field order `yaw, pitch, text, file`.

### Optional walkthrough location

```json
{ "version": 1, "title": "…", "plan": "…", "location": { "lat": 52.50156, "lon": 13.36347 }, "spots": [] }
```

Building location (WGS84, 5 decimals ≈ 1 m). Not per spot: phone GPS is ±10–35 m.
Set from the GPS EXIF data of the first image placed in the editor when present
(`src/exif.js` learns the GPS IFD), otherwise by an importer. No editor field.

## 3. Viewer

- **Panorama:** every placed marker of the *shown capture* is an icon (camera with
  photo, speech bubble without), via `@photo-sphere-viewer/markers-plugin` (same
  version as the core, loaded with the viewer chunk). Tooltip: first text line.
  Click opens a dialog (`NcDialog`/`NcModal`) with the photo large, the text below,
  and previous/next through all markers of this capture.
- **Gallery button** in the panorama's bottom bar: "Fotos an diesem Standort (n)" /
  "Photos at this spot (n)" when the shown capture has markers without a place.
  Opens the same dialog. It is also the keyboard and screen-reader way to every
  marker (the dialog pages through all of them), so the icons need no own focus.
- **Spot list:** a marker icon in the row when the shown capture has markers
  (tooltip "{n} markers"); in the capture menu the icon marks each capture that has
  markers.
- **Visits:** markers follow the shown capture – a visit shows that day's markers.
- No indication on the floor plan.
- Share links: read-only, same display.

## 4. Editor

Under the capture choice in the "Spot" panel, a section "Markierungen (n)" for the
selected capture:

- List entries: thumbnail or bubble, first text line, "placed" / "no place". Click
  turns the panorama to it (when placed) and opens editing.
- **"Markierung setzen" / "Place marker":** the next click in the panorama creates a
  marker there and opens its text field; Escape cancels. Outside this mode a click in
  the panorama only looks around; plan clicks are unchanged.
- **Edit:** text; choose photo (from `2D-Bilder/`, or elsewhere → copied into
  `2D-Bilder/` like floor plans, never overwriting); remove photo; remove marker. Image
  files are never deleted.
- **Move:** "Im Panorama verschieben" / "Move in the panorama", then click the new
  place (the markers plugin has no dragging; click-to-place also works by touch).
- **Place an unplaced marker:** "Im Panorama setzen" then click in the panorama.
- **New photos:** images in `2D-Bilder/` that no marker uses are listed (like new
  panoramas) and can be added to the selected capture without a place.
- Undo (note bar) for place, move, remove. Saving as today.

## 5. Dividers

- `ResizeHandle.vue` gets an `orientation` prop (`vertical` = today's column
  divider, `horizontal` = row divider using `clientY`, ArrowUp/ArrowDown).
- Viewer side bar: divider between floor plan and spot list; stored setting
  `sidebarPlanHeight` (px, clamped to keep both parts usable).
- Editor right column: divider between panorama and panel; stored setting
  `editorPanoramaHeight`.
- Phones keep their tabs.

## 6. Open in OpenStreetMap

When `location` is set, the header menu gets "In OpenStreetMap öffnen" / "Open in
OpenStreetMap": `https://www.openstreetmap.org/?mlat=<lat>&mlon=<lon>#map=18/<lat>/<lon>`
in a new tab (`rel="noopener noreferrer"`). No embedded map, no external requests
from the app, no CSP change, no PHP.

## 7. Error handling

- Missing photo file: icon stays, dialog shows "Foto nicht gefunden: {file}".
- Invalid `markers` entries: the walkthrough does not open (same rule as other
  format errors), message names spot and capture.
- Copy of a chosen photo fails: note in the editor, marker unchanged.

## 8. Testing

- Unit: format validation and serialisation, marker coordinate helpers, GPS EXIF
  parsing (`tests/`).
- Test instance: viewer (icons, dialog, gallery, visits, share link), editor (place,
  move, edit, remove, undo, save, reload), dividers (mouse, keyboard, stored), OSM link.
- Before release: **review of the whole code base** with the Superpowers code review,
  findings fixed, then `npm test`, build, deploy, store release 0.6.0.

## 9. Documentation

README (format section, usage), `docs/ux/texte.md` (all new strings, en + de formal
+ de informal), `docs/ux/gestaltung.md` (marker icons, dividers), store description,
CHANGELOG (en + de), translations.
