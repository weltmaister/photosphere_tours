# Changelog

All notable changes to this app are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 0.5.0 – 2026-10-12

### Changed
- A floor plan chosen from another folder is copied into the walkthrough's folder and
  used there; a PDF is copied together with its PNG, so room names work too. Nothing
  is overwritten: a taken name becomes "Plan (2)".
- A visit shows only the spots captured on that day, each with that day's capture
  and without the capture menu. The first button, *All* (formerly *Latest*), shows
  every spot with its latest capture and lets you pick another one in the list.
  The list heading and the header line say which day is shown.
- Opening the editor switches back to *All*, so the capture being edited is the one
  in view and the viewer never ends up with an empty or stale visit afterwards.
- *Undo* after setting a view direction or adding a capture stays until the next
  action instead of disappearing after ten seconds.

### Fixed
- A click on the plan just beside another spot turns the selected spot's view
  direction again, instead of jumping to that spot.
- Placing an image no longer flashes the previous spot's panorama.
- A floor plan picked in the root folder is no longer copied next to itself.
- Keyboard focus on plan spots is visible in the dark theme; Escape works while a
  radio button or switch has the focus; error notes are announced once.
- Zoom buttons on the plan have full touch size on touch screens.
- Smaller download: the viewer no longer carries CSS source maps (about 190 kB).

## 0.4.15 – 2026-10-12

### Security
- PDF.js updated to 6.4.299 (GHSA-hq66-cqwq-w95j: script execution from a crafted
  PDF). The app only renders and reads floor plans, but any PDF in a shared folder
  could be one.

### Fixed
- The PDF worker is freed even when converting a floor plan fails.

## 0.4.14 – 2026-10-12

### Changed
- The capture date of a newly placed image comes from the camera's EXIF data first,
  then from a date in the file name, then from the file time.

## 0.4.13 – 2026-10-08

### Changed
- Floor plan in the editor: dragging pans, a short click on a spot selects it, a short
  click on a free place puts the picked image there – or, with a spot selected, turns
  its view direction there (with *Undo*). The *Set view direction* button is gone.
- A picked image shows in the panorama right away, before it is placed.
- The editor shows everything for a spot and the new images in one panel; phones
  switch between the floor plan and that panel.
- The border between floor plan and editing column can be dragged (or moved with
  the arrow keys).
- The hint bar above the file list updates as soon as a walkthrough is created, and
  "New → 360° walkthrough" opens an existing one instead of reporting an error.
- Neutral descriptions; "Site visit" is called "Visit" in English.
- Licence notices of the bundled libraries are part of the package.

## 0.4.11 – 2026-10-02

First release in the Nextcloud App Store.

### Added
- Walkthroughs: a `360-Rundgang.json` in a folder of 360° images opens the panorama
  with the floor plan, the spot list and visits.
- Creating a walkthrough from the file list, the folder menu or *New*; a floor plan
  in the folder is detected, PDF plans are converted to PNG.
- Editor: place images on the plan, add later captures, move spots, set the view
  direction, change the floor plan.
- Room names from the room stamps of PDF plans offered as spot names (take over,
  correct, or all at once); capture dates from EXIF.
- Renaming spots in the spot list, optionally renaming the image files.
- Visits: every spot as it was on a given day.
- Zoomable floor plan, resizable side bar, phone layout, keyboard support.
- Read-only walkthroughs on public share links.
- English and German.
