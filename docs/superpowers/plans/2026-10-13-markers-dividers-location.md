# Markers, Resizable Dividers and Location – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resizable dividers in viewer and editor, markers (text and/or photo, optionally placed in the panorama, per capture) with viewer display and editor, and "Open in OpenStreetMap" for walkthroughs with a location.

**Architecture:** The file format gains optional `captures[].markers` and `location` (validated in `src/tour.js`). Pure helpers live in a new `src/markers.js` (coordinates, lists, photo names) and `src/exif.js` (GPS). The viewer shows placed markers with `@photo-sphere-viewer/markers-plugin` positioned by **texture coordinates**, so they are independent of the plan alignment (`sphereCorrection`). A new `MarkerDialog.vue` shows photo and text; the editor gets a `MarkerSection.vue` under the spot form.

**Tech Stack:** Vue 3, `@nextcloud/vue` 9, Photo Sphere Viewer 5.15.1 + markers plugin 5.15.1, vitest, webpack.

**Spec:** `docs/superpowers/specs/2026-10-13-markers-dividers-location-design.md`

## Global Constraints

- No backend: all I/O through WebDAV (`src/dav.js`); no new PHP, no CSP change.
- Nextcloud look only: `@nextcloud/vue` components, Nextcloud CSS variables (`docs/ux/gestaltung.md`); exception already allowed: fixed colours on the white floor plan.
- One term per thing (`docs/ux/texte.md`): new term **Markierung / Marker**; gallery label "Fotos an diesem Standort" / "Photos at this spot".
- Photos live in the subfolder `2D-Bilder/` next to the walkthrough file; a photo chosen elsewhere is copied there, never overwriting (`freePlanName`-style numbering).
- Marker `yaw` 0–360 / `pitch` −90–90 are **raw panorama coordinates** (image centre = yaw 0, right = positive), both present or both absent; `text` ≤ 2000 characters; a marker needs `text` or `file`.
- `location` = `{ lat, lon }`, WGS84, rounded to 5 decimals; no per-spot location.
- Per-spot/per-capture UI state keyed by the object (`reactive(Map)` / `Set` of `toRaw(...)`), never by index (CLAUDE.md).
- All strings through `t()`/`n()` from `src/l10n.js`; after changing strings run `npm run l10n` (0 missing, 0 unused).
- No product or project names in the public repository; neutral wording.
- Bump the version on every deploy to the test instance (deploy script), then reset `appinfo/info.xml`.
- Before release: review of the **whole** code base with superpowers:requesting-code-review, findings fixed.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/tour.js` (modify) | validate/normalise `markers` and `location` |
| `src/markers.js` (create) | pure marker helpers: texture ↔ raw coords, title, placed/unplaced, unused photos, photo folder name |
| `src/exif.js` (modify) | `exifGps(buffer)` next to `exifDate` |
| `src/dav.js` (modify) | `ensureFolder(url)` (MKCOL, 405 = exists) |
| `src/create.js` (modify) | `copyPhotoIntoFolder(folder, entries, absolute)` reusing `copyIntoFolder` with a target subfolder |
| `src/components/ResizeHandle.vue` (modify) | `orientation` prop: column or row divider |
| `src/composables/useLayout.js` (modify) | stored `sidebarPlanHeight`, `editorPanoramaHeight` |
| `src/components/ViewerSidebar.vue` (modify) | plan/list divider |
| `src/components/PanoramaView.vue` (modify) | markers plugin, place mode, marker click |
| `src/components/MarkerDialog.vue` (create) | photo + text, previous/next |
| `src/components/MarkerSection.vue` (create) | editor: list, place, edit, photo, move, remove, unused photos |
| `src/components/SpotList.vue` (modify) | marker icon in rows and capture menu |
| `src/components/TourHeader.vue` (modify) | "Open in OpenStreetMap" button |
| `src/components/TourApp.vue` (modify) | wiring: markers of shown capture, gallery button, editor state, undo, location from EXIF |
| `tests/tour.test.js`, `tests/markers.test.js`, `tests/exif.test.js` | unit tests |

---

### Task 1: Row divider in `ResizeHandle` and stored heights

**Files:**
- Modify: `src/components/ResizeHandle.vue`
- Modify: `src/composables/useLayout.js`
- Test: `tests/layout.test.js` (create)

**Interfaces:**
- Produces: `ResizeHandle` prop `orientation: 'vertical' | 'horizontal'` (default `'vertical'` = today's column divider; `'horizontal'` resizes a row, uses `clientY`, ArrowUp/ArrowDown). `useLayout()` returns additionally `sidebarPlanHeight` (ref, px) and `editorPanoramaHeight` (ref, px). Exported constants `PLAN_HEIGHT_MIN = 120`, `PANORAMA_HEIGHT_MIN = 160`, and pure `clampSize(value, min, max, fallback)`.

- [ ] **Step 1: Write the failing test**

```js
// tests/layout.test.js
import { describe, expect, it } from 'vitest'
import { clampSize } from '../src/composables/clamp.js'

describe('clampSize', () => {
	it('keeps a stored size inside its limits', () => {
		expect(clampSize(50, 120, 600, 260)).toBe(120)
		expect(clampSize(900, 120, 600, 260)).toBe(600)
		expect(clampSize(300, 120, 600, 260)).toBe(300)
	})
	it('falls back on garbage', () => {
		expect(clampSize('x', 120, 600, 260)).toBe(260)
		expect(clampSize(null, 120, 600, 260)).toBe(260)
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/layout.test.js`
Expected: FAIL – cannot find `../src/composables/clamp.js`.

- [ ] **Step 3: Implement**

Create `src/composables/clamp.js` (pure, no Vue import so vitest needs no DOM):

```js
/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 */

/** A stored size inside its limits; anything that is not a number gives the fallback. */
export function clampSize(value, min, max, fallback) {
	const n = Number(value)
	if (value === null || value === '' || !Number.isFinite(n)) {
		return fallback
	}
	return Math.min(max, Math.max(min, n))
}
```

In `src/composables/useLayout.js` import it, export the minimums and add the two settings:

```js
import { clampSize } from './clamp.js'

export const PLAN_HEIGHT_MIN = 120
export const PANORAMA_HEIGHT_MIN = 160

// inside useLayout(), replace the two existing clamps by clampSize and add:
const sidebarPlanHeight = stored('sidebarPlanHeight', 260)
sidebarPlanHeight.value = clampSize(sidebarPlanHeight.value, PLAN_HEIGHT_MIN, 2000, 260)
const editorPanoramaHeight = stored('editorPanoramaHeight', 292)
editorPanoramaHeight.value = clampSize(editorPanoramaHeight.value, PANORAMA_HEIGHT_MIN, 2000, 292)
// return { ..., sidebarPlanHeight, editorPanoramaHeight }
```

In `ResizeHandle.vue` add the prop and use it for ARIA, keys, pointer axis and CSS:

```vue
<div class="pt-resize"
	:class="`pt-resize--${orientation}`"
	role="separator"
	tabindex="0"
	:aria-orientation="orientation"
	:aria-label="label"
	:aria-valuenow="modelValue"
	:aria-valuemin="min"
	:aria-valuemax="max"
	:title="orientation === 'vertical'
		? t('Drag or use the arrow keys to change the width')
		: t('Drag or use the arrow keys to change the height')"
	@pointerdown="start"
	@keydown="onKey" />
```

```js
const props = defineProps({
	modelValue: { type: Number, required: true },
	min: { type: Number, required: true },
	max: { type: Number, required: true },
	/** 1: dragging right/down grows the part before the handle, -1: shrinks it */
	direction: { type: Number, default: 1 },
	/** 'vertical': divider between columns (width); 'horizontal': between rows (height) */
	orientation: { type: String, default: 'vertical' },
	label: { type: String, required: true },
})

const KEYS = { vertical: ['ArrowLeft', 'ArrowRight'], horizontal: ['ArrowUp', 'ArrowDown'] }

function onKey(e) {
	const [less, more] = KEYS[props.orientation]
	if (e.key === less || e.key === more) {
		e.preventDefault()
		set(props.modelValue + (e.key === more ? STEP : -STEP) * props.direction)
	}
}

function start(e) {
	const axis = props.orientation === 'vertical' ? 'clientX' : 'clientY'
	const from = { at: e[axis], size: props.modelValue }
	const target = e.currentTarget
	target.setPointerCapture(e.pointerId)
	const move = (ev) => set(from.size + (ev[axis] - from.at) * props.direction)
	// end handler unchanged
}
```

CSS: keep the current rules for `.pt-resize--vertical` (`top: 0; width: 8px; height: 100%; cursor: col-resize`), add

```css
.pt-resize--horizontal {
	left: 0;
	width: 100%;
	height: 8px;
	cursor: row-resize;
}

@media (pointer: coarse) {
	.pt-resize--horizontal {
		height: 24px;
	}
}

.pt-resize--horizontal:hover,
.pt-resize--horizontal:active {
	background: linear-gradient(var(--color-primary-element), var(--color-primary-element)) center / 100% 2px no-repeat;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass; translation check reports the new string "Drag or use the arrow keys to change the height" as missing → add it to `l10n/de_DE.json` ("Ziehen oder Pfeiltasten benutzen, um die Höhe zu ändern"), run `npm run l10n`, `npm test` again: 0 missing.

- [ ] **Step 5: Commit**

```bash
git add src/composables/clamp.js src/composables/useLayout.js src/components/ResizeHandle.vue tests/layout.test.js l10n
git commit -m "Row divider in ResizeHandle, stored plan and panorama heights"
```

### Task 2: Divider between floor plan and spot list (viewer)

**Files:**
- Modify: `src/components/ViewerSidebar.vue`
- Modify: `src/components/TourApp.vue` (pass `v-model:planHeight`)

**Interfaces:**
- Consumes: `ResizeHandle` with `orientation="horizontal"`, `sidebarPlanHeight`, `PLAN_HEIGHT_MIN` (Task 1).
- Produces: `ViewerSidebar` prop `planHeight: Number` + emit `update:planHeight`.

- [ ] **Step 1: Restructure the side bar**

Template: plan section with a fixed height box and the handle at its bottom edge; the list scrolls on its own.

```vue
<aside class="pt-side" :aria-label="t('Floor plan and spots')">
	<h3 class="pt-section">{{ t('Floor plan') }}</h3>
	<div class="pt-side__plan" :style="{ height: `${planHeight}px` }">
		<FloorPlan v-bind="plan" @select="$emit('select', $event)" />
		<ResizeHandle class="pt-side__rows"
			orientation="horizontal"
			:model-value="planHeight"
			:min="PLAN_HEIGHT_MIN"
			:max="maxPlanHeight"
			:label="t('Height of the floor plan')"
			@update:model-value="$emit('update:planHeight', $event)" />
	</div>
	<h3 class="pt-section">{{ listTitle }}</h3>
	<SpotList class="pt-side__list" ... unchanged ... />
	<ResizeHandle class="pt-side__resize" ... unchanged column handle ... />
</aside>
```

Script: `maxPlanHeight` = side bar height − 160 (room for the list), measured with a `ResizeObserver` on the `aside` (`ref="side"`), fallback 2000 before the first measurement.

CSS: `.pt-side { display: flex; flex-direction: column; }`, `.pt-side__plan { position: relative; flex: none; }` (FloorPlan without `auto-height` fills its box), `.pt-side__rows { bottom: -4px; }`, `.pt-side__list { flex: 1; min-height: 0; overflow-y: auto; }`. Remove `.pt-side__scroll`.

- [ ] **Step 2: Wire it in TourApp**

```vue
<ViewerSidebar v-if="!editing && !mobile && sidebarOpen"
	v-model:width="sidebarWidth"
	v-model:planHeight="sidebarPlanHeight"
	... />
```

and take `sidebarPlanHeight` from `useLayout()`.

- [ ] **Step 3: Strings and tests**

New string "Height of the floor plan" → de "Höhe des Grundrisses"; `npm run l10n`; `npm test` (0 missing, 0 unused); `npm run build` without warnings.

- [ ] **Step 4: Check on the test instance**

Deploy (version bump), open the demo walkthrough on desktop: drag the new divider (plan grows/shrinks, list scrolls), arrow up/down on the focused divider, reload → height kept; narrow window → list keeps ≥ 160 px.

- [ ] **Step 5: Commit**

```bash
git add src/components/ViewerSidebar.vue src/components/TourApp.vue l10n
git commit -m "Viewer: divider between floor plan and spot list"
```

### Task 3: Divider between panorama and editing panel (editor)

**Files:**
- Modify: `src/components/TourApp.vue`

**Interfaces:**
- Consumes: `editorPanoramaHeight`, `PANORAMA_HEIGHT_MIN` (Task 1).

- [ ] **Step 1: Use the stored height in the grid**

In `bodyStyle` (editing, desktop) return both variables:

```js
if (editing.value) {
	return {
		'--pt-editor-column': `${editorColumn.value}px`,
		'--pt-editor-pano': `${editorPanoramaHeight.value}px`,
	}
}
```

- [ ] **Step 2: Place the handle on the panorama's lower edge**

Inside the editor grid add after `PanoramaView` (desktop editing only):

```vue
<ResizeHandle v-if="editing && !mobile"
	v-model="editorPanoramaHeight"
	class="pt-pano-rows"
	orientation="horizontal"
	:min="PANORAMA_HEIGHT_MIN"
	:max="editorPanoramaMax"
	:label="t('Height of the panorama')" />
```

`editorPanoramaMax = computed(() => Math.max(PANORAMA_HEIGHT_MIN, viewportHeight.value - 280))` with `viewportHeight` kept like `viewportWidth`. CSS: `.pt-pano-rows { grid-area: pano; align-self: end; position: relative; bottom: -4px; }` (the handle sits in the panorama cell's bottom edge, above the panel).

- [ ] **Step 3: Strings, tests, build**

"Height of the panorama" → "Höhe des Panoramas"; `npm run l10n`; `npm test`; `npm run build`.

- [ ] **Step 4: Check on the test instance**

Editor on desktop: drag and arrow keys change the panorama height, the panel below grows/shrinks and scrolls, reload keeps it, phone layout unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/TourApp.vue l10n
git commit -m "Editor: divider between panorama and editing panel"
```

### Task 4: File format – `markers` and `location`

**Files:**
- Modify: `src/tour.js` (`parseTour`, header comment)
- Test: `tests/tour.test.js`

**Interfaces:**
- Produces: normalised capture `{ file, date, yaw, markers? }` where `markers` is present only when non-empty, each marker `{ yaw?, pitch?, text?, file? }` in this key order; tour `{ version, title, plan, location?, spots }`. Constant `MAX_MARKER_TEXT = 2000` exported.

- [ ] **Step 1: Write the failing tests**

```js
// tests/tour.test.js – add
import { MAX_MARKER_TEXT, parseTour, serializeTour } from '../src/tour.js'

const withMarkers = (markers, extra = {}) => ({
	version: 1, title: 'T', plan: 'p.png', ...extra,
	spots: [{ name: 'A', x: 0.5, y: 0.5, captures: [{ file: 'a.jpg', date: '2024-08-14T16:02', yaw: 0, markers }] }],
})

describe('markers', () => {
	it('keeps placed and unplaced markers, normalised', () => {
		const tour = parseTour(withMarkers([
			{ yaw: 370, pitch: -12, text: 'Water damage', file: '2D-Bilder/x.jpg' },
			{ file: '2D-Bilder/y.jpg' },
		]))
		expect(tour.spots[0].captures[0].markers).toEqual([
			{ yaw: 10, pitch: -12, text: 'Water damage', file: '2D-Bilder/x.jpg' },
			{ file: '2D-Bilder/y.jpg' },
		])
	})
	it('omits an empty list', () => {
		const tour = parseTour(withMarkers([]))
		expect('markers' in tour.spots[0].captures[0]).toBe(false)
	})
	it('rejects half a place, nothing to show, paths outside, long texts', () => {
		expect(() => parseTour(withMarkers([{ yaw: 3, text: 'x' }]))).toThrow(/yaw.*pitch/)
		expect(() => parseTour(withMarkers([{ yaw: 3, pitch: 2 }]))).toThrow(/text or a photo/)
		expect(() => parseTour(withMarkers([{ file: '../x.jpg' }]))).toThrow(/inside the tour folder/)
		expect(() => parseTour(withMarkers([{ text: 'x'.repeat(MAX_MARKER_TEXT + 1) }]))).toThrow(/2000/)
		expect(() => parseTour(withMarkers([{ yaw: 3, pitch: 95, text: 'x' }]))).toThrow(/pitch/)
	})
	it('round-trips through serializeTour with stable key order', () => {
		const json = serializeTour(withMarkers([{ file: 'f.jpg', text: 't', pitch: 1, yaw: 2 }]))
		expect(json).toContain('"yaw": 2,\n\t\t\t\t\t\t\t"pitch": 1,\n\t\t\t\t\t\t\t"text": "t",\n\t\t\t\t\t\t\t"file": "f.jpg"')
	})
})

describe('location', () => {
	it('keeps a valid location, rounded to 5 decimals', () => {
		const tour = parseTour(withMarkers([], { location: { lat: 52.5015612, lon: 13.3634721 } }))
		expect(tour.location).toEqual({ lat: 52.50156, lon: 13.36347 })
	})
	it('rejects coordinates out of range', () => {
		expect(() => parseTour(withMarkers([], { location: { lat: 95, lon: 0 } }))).toThrow(/location/)
	})
	it('has no location key when absent', () => {
		expect('location' in parseTour(withMarkers([]))).toBe(false)
	})
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/tour.test.js`
Expected: FAIL – `MAX_MARKER_TEXT` undefined, markers dropped.

- [ ] **Step 3: Implement in `parseTour`**

```js
export const MAX_MARKER_TEXT = 2000
const round5 = (v) => Math.round(v * 1e5) / 1e5

function parseMarker(m, where, problems) {
	const out = {}
	const hasYaw = m?.yaw !== undefined
	const hasPitch = m?.pitch !== undefined
	if (hasYaw !== hasPitch) {
		problems.push(`${where}: "yaw" and "pitch" go together`)
	} else if (hasYaw) {
		if (typeof m.yaw !== 'number' || !Number.isFinite(m.yaw)) {
			problems.push(`${where}: "yaw" must be a number`)
		}
		if (typeof m.pitch !== 'number' || !(m.pitch >= -90 && m.pitch <= 90)) {
			problems.push(`${where}: "pitch" must be a number between -90 and 90`)
		}
		out.yaw = normDeg(Number(m.yaw) || 0)
		out.pitch = Number(m.pitch) || 0
	}
	if (m?.text !== undefined) {
		if (typeof m.text !== 'string') {
			problems.push(`${where}: "text" must be text`)
		} else if (m.text.length > MAX_MARKER_TEXT) {
			problems.push(`${where}: "text" is longer than ${MAX_MARKER_TEXT} characters`)
		} else if (m.text.trim() !== '') {
			out.text = m.text
		}
	}
	if (m?.file !== undefined) {
		if (!isInsideFolder(m.file)) {
			problems.push(`${where}: "file" must be a path inside the tour folder`)
		} else {
			out.file = m.file
		}
	}
	if (out.text === undefined && out.file === undefined) {
		problems.push(`${where}: needs a text or a photo`)
	}
	return out
}
```

In the capture mapping:

```js
const markers = Array.isArray(c?.markers)
	? c.markers.map((m, k) => parseMarker(m, `${where}, capture ${j + 1}, marker ${k + 1}`, problems))
	: []
if (c?.markers !== undefined && !Array.isArray(c.markers)) {
	problems.push(`${where}, capture ${j + 1}: "markers" must be a list`)
}
const capture = { file: c?.file, date: c?.date, yaw: typeof yaw === 'number' ? normDeg(yaw) : 0 }
if (markers.length > 0) {
	capture.markers = markers
}
return capture
```

Location (before building the result):

```js
let location
if (data.location !== undefined) {
	const { lat, lon } = data.location ?? {}
	if (typeof lat !== 'number' || typeof lon !== 'number' || !(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
		problems.push('"location" must be { "lat": -90…90, "lon": -180…180 }')
	} else {
		location = { lat: round5(lat), lon: round5(lon) }
	}
}
// result:
return {
	version: TOUR_VERSION,
	title: typeof data.title === 'string' ? data.title : '',
	plan: data.plan,
	...(location ? { location } : {}),
	spots,
}
```

Update the file header comment with the two optional fields.

- [ ] **Step 4: Run tests**

Run: `npm test` – Expected: PASS (all old tests unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/tour.js tests/tour.test.js
git commit -m "Format: optional markers per capture and walkthrough location"
```

### Task 5: Marker helpers (`src/markers.js`)

**Files:**
- Create: `src/markers.js`
- Test: `tests/markers.test.js`

**Interfaces:**
- Consumes: normalised tour (Task 4).
- Produces:
  - `PHOTO_FOLDER = '2D-Bilder'`
  - `toTexture({ yaw, pitch }, { width, height }) → { textureX, textureY }`
  - `fromTexture({ textureX, textureY }, { width, height }) → { yaw, pitch }` (yaw 0–360, 1 decimal; pitch −90–90, 1 decimal)
  - `markerTitle(marker) → string` (first non-empty text line, else file name without folder)
  - `markersOf(capture) → array` (`capture?.markers ?? []`)
  - `isPlaced(marker) → boolean`
  - `markerCount(spot) → number` (all captures)
  - `unusedPhotos(tour, names) → string[]` (`names` relative to the tour folder; jpg/jpeg/png/webp under `2D-Bilder/` not used by any marker)

- [ ] **Step 1: Write the failing tests**

```js
// tests/markers.test.js
import { describe, expect, it } from 'vitest'
import { PHOTO_FOLDER, fromTexture, isPlaced, markerCount, markerTitle, toTexture, unusedPhotos } from '../src/markers.js'

const size = { width: 8000, height: 4000 }

describe('texture coordinates', () => {
	it('puts raw yaw 0 / pitch 0 in the image centre', () => {
		expect(toTexture({ yaw: 0, pitch: 0 }, size)).toEqual({ textureX: 4000, textureY: 2000 })
	})
	it('goes right for positive yaw and up for positive pitch', () => {
		expect(toTexture({ yaw: 90, pitch: 45 }, size)).toEqual({ textureX: 6000, textureY: 1000 })
		expect(toTexture({ yaw: 270, pitch: -90 }, size)).toEqual({ textureX: 2000, textureY: 4000 })
	})
	it('round-trips', () => {
		for (const p of [{ yaw: 12.5, pitch: -3.5 }, { yaw: 359.9, pitch: 80 }, { yaw: 180, pitch: 0 }]) {
			expect(fromTexture(toTexture(p, size), size)).toEqual(p)
		}
	})
})

describe('marker helpers', () => {
	it('titles a marker by its first text line, else by its photo', () => {
		expect(markerTitle({ text: '\nWater damage\nmore' })).toBe('Water damage')
		expect(markerTitle({ file: `${PHOTO_FOLDER}/IMG_1.jpg` })).toBe('IMG_1.jpg')
	})
	it('knows placed markers and counts them per spot', () => {
		expect(isPlaced({ yaw: 1, pitch: 2, text: 'x' })).toBe(true)
		expect(isPlaced({ file: 'a.jpg' })).toBe(false)
		expect(markerCount({ captures: [{ markers: [{ text: 'a' }] }, {}, { markers: [{ text: 'b' }, { text: 'c' }] }] })).toBe(3)
	})
	it('lists photos of the photo folder no marker uses', () => {
		const tour = { spots: [{ captures: [{ markers: [{ file: '2D-Bilder/a.jpg' }] }] }] }
		expect(unusedPhotos(tour, ['2D-Bilder/a.jpg', '2D-Bilder/b.JPG', '2D-Bilder/n.txt', 'pano.jpg', '2D-Bilder/sub/c.jpg']))
			.toEqual(['2D-Bilder/b.JPG'])
	})
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/markers.test.js` – Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```js
/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Markers: a text and/or photo of a capture, optionally placed in the panorama.
 * Places are raw panorama coordinates (image centre = yaw 0, right positive,
 * pitch up positive), so correcting a capture's view direction never moves them.
 */

export const PHOTO_FOLDER = '2D-Bilder'
const PHOTO_RE = /\.(jpe?g|png|webp)$/i
const one = (v) => Math.round(v * 10) / 10

export function toTexture({ yaw, pitch }, { width, height }) {
	const x = (((0.5 + yaw / 360) % 1) + 1) % 1
	return { textureX: Math.round(x * width), textureY: Math.round((0.5 - pitch / 180) * height) }
}

export function fromTexture({ textureX, textureY }, { width, height }) {
	const yaw = ((textureX / width - 0.5) * 360 + 360) % 360
	return { yaw: one(yaw), pitch: one((0.5 - textureY / height) * 180) }
}

export const markersOf = (capture) => capture?.markers ?? []
export const isPlaced = (marker) => typeof marker.yaw === 'number' && typeof marker.pitch === 'number'

export function markerTitle(marker) {
	const line = (marker.text ?? '').split('\n').map(s => s.trim()).find(Boolean)
	return line ?? (marker.file ?? '').split('/').pop()
}

export function markerCount(spot) {
	return spot.captures.reduce((n, c) => n + markersOf(c).length, 0)
}

export function unusedPhotos(tour, names) {
	const used = new Set(tour.spots.flatMap(s => s.captures.flatMap(c => markersOf(c).map(m => m.file))))
	const prefix = `${PHOTO_FOLDER}/`
	return names.filter(n => n.startsWith(prefix) && !n.slice(prefix.length).includes('/') && PHOTO_RE.test(n) && !used.has(n))
}
```

Note for `fromTexture` round-trip: `toTexture` rounds to whole pixels; with 8000 px one pixel is 0.045°, so one-decimal rounding round-trips the test values.

- [ ] **Step 4: Run tests** – `npm test`, Expected PASS.

- [ ] **Step 5: Commit**

```bash
git add src/markers.js tests/markers.test.js
git commit -m "Marker helpers: texture coordinates, titles, counts, unused photos"
```

### Task 6: Show placed markers in the panorama

**Files:**
- Modify: `package.json` (`@photo-sphere-viewer/markers-plugin` exactly `5.15.1`, same as core)
- Modify: `src/components/PanoramaView.vue`

**Interfaces:**
- Consumes: `toTexture`, `fromTexture`, `isPlaced`, `markerTitle` (Task 5).
- Produces: `PanoramaView` props `markers: Array` (markers of the shown capture, default `[]`), `placing: Boolean` (editor place mode); emits `marker-click(index)` (index into `markers`) and `pick({ yaw, pitch })` (raw coords of a click while `placing`).

- [ ] **Step 1: Install the plugin**

Run: `npm install --save-exact @photo-sphere-viewer/markers-plugin@5.15.1`
Expected: `package.json` lists `"@photo-sphere-viewer/markers-plugin": "5.15.1"`; set core to `"5.15.1"` exactly as well, so both always match.

- [ ] **Step 2: Wire the plugin**

```js
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import '@photo-sphere-viewer/markers-plugin/index.css'
import { mdiCameraOutline, mdiCommentTextOutline } from '@mdi/js'
import { fromTexture, isPlaced, markerTitle, toTexture } from '../markers.js'

// props: markers: { type: Array, default: () => [] }, placing: { type: Boolean, default: false }
// emits: ['heading', 'marker-click', 'pick']

const icon = (path) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`

function panoSize() {
	const data = viewer?.state.textureData?.panoData
	return data ? { width: data.fullWidth, height: data.fullHeight } : null
}

function showMarkers() {
	const plugin = viewer?.getPlugin(MarkersPlugin)
	const size = panoSize()
	if (!plugin || !size) {
		return
	}
	plugin.setMarkers(props.markers
		.map((m, i) => [m, i])
		.filter(([m]) => isPlaced(m))
		.map(([m, i]) => ({
			id: String(i),
			position: toTexture(m, size),
			html: icon(m.file ? mdiCameraOutline : mdiCommentTextOutline),
			className: 'pt-marker',
			size: { width: 36, height: 36 },
			anchor: 'center center',
			tooltip: { content: markerTitle(m), position: 'top center' },
		})))
}
```

In the `Viewer` options add `plugins: [MarkersPlugin]`. After creating the viewer:

```js
const markersPlugin = viewer.getPlugin(MarkersPlugin)
markersPlugin.addEventListener('select-marker', ({ marker }) => emit('marker-click', Number(marker.id)))
viewer.addEventListener('panorama-loaded', showMarkers)
viewer.addEventListener('click', ({ data }) => {
	if (props.placing && data.textureX !== undefined && !data.rightclick) {
		const size = panoSize()
		if (size) {
			emit('pick', fromTexture(data, size))
		}
	}
})
watch(() => props.markers, showMarkers, { deep: true })
```

CSS (Nextcloud look, readable on any image):

```css
.pt-pano :deep(.pt-marker) {
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid var(--color-primary-element-text);
	border-radius: 50%;
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	box-shadow: 0 0 6px var(--color-box-shadow);
	cursor: pointer;
}

.pt-pano--placing {
	cursor: crosshair;
}
```

and `:class="{ 'pt-pano--placing': placing }"` on the root.

- [ ] **Step 3: Build and check**

Run: `npm run build` – no warnings except the known size hints. Temporarily pass two markers from TourApp (`:markers="currentCapture?.markers ?? []"`), deploy, verify on the test instance: icons sit on the intended objects; change the capture's view direction in the editor → icons stay on their objects; tooltip shows the title; click emits (log once in dev, then remove the log).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/PanoramaView.vue
git commit -m "Panorama: markers plugin, placed markers by texture coordinates, place mode"
```

### Task 7: Marker dialog, gallery button, list icons (viewer)

**Files:**
- Create: `src/components/MarkerDialog.vue`
- Modify: `src/components/TourApp.vue`, `src/components/SpotList.vue`

**Interfaces:**
- Consumes: `markersOf`, `isPlaced`, `markerTitle`, `markerCount` (Task 5); `PanoramaView` `markers` / `marker-click` (Task 6); `fileUrl(relative)` in TourApp.
- Produces: `MarkerDialog` props `markers: Array`, `index: Number` (v-model), `urlFor: Function(relativePath) → string`, `open: Boolean` (v-model:open). Rows from `spotRows` gain `markers: number` (all captures) and each capture item gains `markers: number`.

- [ ] **Step 1: MarkerDialog.vue**

```vue
<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  One marker of the shown capture: photo large, text below, previous/next
  through all markers of the capture (placed or not).
-->
<template>
	<NcDialog v-if="open && marker"
		:name="markerTitle(marker)"
		size="large"
		@closing="$emit('update:open', false)">
		<figure class="pt-marker-dialog">
			<img v-if="marker.file && !broken"
				class="pt-marker-dialog__photo"
				:src="urlFor(marker.file)"
				:alt="markerTitle(marker)"
				@error="broken = true">
			<p v-else-if="marker.file" class="pt-marker-dialog__missing">
				{{ t('Photo not found: {file}', { file: marker.file }) }}
			</p>
			<figcaption v-if="marker.text" class="pt-marker-dialog__text">{{ marker.text }}</figcaption>
		</figure>
		<template v-if="markers.length > 1" #actions>
			<NcButton :disabled="index === 0" @click="go(-1)">{{ t('Previous') }}</NcButton>
			<span class="pt-marker-dialog__count">{{ t('{n} of {count}', { n: index + 1, count: markers.length }) }}</span>
			<NcButton :disabled="index === markers.length - 1" @click="go(1)">{{ t('Next') }}</NcButton>
		</template>
	</NcDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcDialog from '@nextcloud/vue/components/NcDialog'
import { markerTitle } from '../markers.js'
import { t } from '../l10n.js'

const props = defineProps({
	markers: { type: Array, required: true },
	index: { type: Number, required: true },
	open: { type: Boolean, default: false },
	/** relative path in the walkthrough folder -> URL */
	urlFor: { type: Function, required: true },
})
const emit = defineEmits(['update:index', 'update:open'])
const marker = computed(() => props.markers[props.index] ?? null)
const broken = ref(false)
watch(marker, () => { broken.value = false })
const go = (step) => emit('update:index', props.index + step)
</script>

<style scoped>
.pt-marker-dialog { margin: 0; }
.pt-marker-dialog__photo { display: block; max-width: 100%; max-height: 70vh; margin: 0 auto; object-fit: contain; }
.pt-marker-dialog__text { margin-top: calc(var(--default-grid-baseline) * 3); white-space: pre-line; }
.pt-marker-dialog__missing { color: var(--color-text-maxcontrast); }
.pt-marker-dialog__count { color: var(--color-text-maxcontrast); }
</style>
```

- [ ] **Step 2: TourApp wiring**

```js
import MarkerDialog from './MarkerDialog.vue'
import { isPlaced, markerCount, markersOf } from '../markers.js'

const shownMarkers = computed(() => (previewing.value ? [] : markersOf(currentCapture.value)))
const unplacedCount = computed(() => shownMarkers.value.filter(m => !isPlaced(m)).length)
const markerOpen = ref(false)
const markerIndex = ref(0)
function openMarker(index) {
	markerIndex.value = index
	markerOpen.value = true
}
function openGallery() {
	openMarker(Math.max(0, shownMarkers.value.findIndex(m => !isPlaced(m))))
}
watch(currentCapture, () => { markerOpen.value = false })
```

Template: pass `:markers="shownMarkers"` and `@marker-click="openMarker"` to `PanoramaView`; add the dialog `<MarkerDialog v-model:open="markerOpen" v-model:index="markerIndex" :markers="shownMarkers" :url-for="fileUrl" />`; add the gallery button in the footer tools (desktop) and in the phone sheet header area:

```vue
<NcButton v-if="shownMarkers.length > 0"
	variant="tertiary"
	:aria-label="n('Markers here ({count})', 'Markers here ({count})', shownMarkers.length)"
	@click="unplacedCount > 0 ? openGallery() : openMarker(0)">
	<template #icon><NcIconSvgWrapper :path="unplacedCount > 0 ? mdiImageMultipleOutline : mdiMapMarkerOutline" /></template>
	{{ unplacedCount > 0
		? n('Photo at this spot ({count})', 'Photos at this spot ({count})', unplacedCount)
		: n('{count} marker', '{count} markers', shownMarkers.length) }}
</NcButton>
```

(The button is the keyboard/screen-reader path to all markers: the dialog pages through all of them.)

In `spotRows` add `markers: markerCount(spot)` and per capture item `markers: markersOf(capture).length`.

- [ ] **Step 3: SpotList icon**

In the row after the date text: `<NcIconSvgWrapper v-if="row.markers" :path="mdiMapMarkerOutline" :size="16" :title="n('{count} marker', '{count} markers', row.markers)" />`; in each capture radio label the same icon when `capture.markers`. Import `n` from `../l10n.js` and `mdiMapMarkerOutline`.

- [ ] **Step 4: Strings, tests, build**

New strings: "Photo not found: {file}", "Previous", "Next", "{n} of {count}", plurals "Photo at this spot ({count})"/"Photos at this spot ({count})", "{count} marker"/"{count} markers", "Markers here ({count})". German (formal + informal identical here): „Foto nicht gefunden: {file}", „Zurück", „Weiter", „{n} von {count}", „Foto an diesem Standort ({count})"/„Fotos an diesem Standort ({count})", „{count} Markierung"/„{count} Markierungen", „Markierungen hier ({count})". `npm run l10n`, `npm test`, `npm run build`.

- [ ] **Step 5: Check on the test instance**

Put a hand-written `markers` list into the demo walkthrough (one placed photo, one placed text, one unplaced photo in `2D-Bilder/`): icons, tooltip, click → dialog, previous/next, gallery button, missing photo message, visits switch shows only that day's markers, share link read-only, phone sheet.

- [ ] **Step 6: Commit**

```bash
git add src/components/MarkerDialog.vue src/components/TourApp.vue src/components/SpotList.vue l10n
git commit -m "Viewer: marker dialog, gallery button, marker icons in the spot list"
```

### Task 8: WebDAV folder creation and photo copy

**Files:**
- Modify: `src/dav.js`, `src/create.js`
- Test: `tests/folder.test.js` (photo name)

**Interfaces:**
- Produces: `ensureFolder(url): Promise<void>` (MKCOL; 405 means it exists); `copyPhotoIntoFolder(folder, entries, absolute): Promise<string>` returning the new path relative to the walkthrough folder (`2D-Bilder/<name>`), never overwriting; `freePhotoName(names, fileName)` in `src/folder.js` (numbered `Photo (2).jpg`).

- [ ] **Step 1: Failing test for the name**

```js
// tests/folder.test.js – add
import { freePhotoName } from '../src/folder.js'

describe('freePhotoName', () => {
	it('numbers a taken name and keeps the extension', () => {
		expect(freePhotoName(['a.jpg'], 'b.jpg')).toBe('b.jpg')
		expect(freePhotoName(['a.jpg', 'a (2).jpg'], 'a.jpg')).toBe('a (3).jpg')
	})
})
```

- [ ] **Step 2: Run – FAIL** (`npx vitest run tests/folder.test.js`).

- [ ] **Step 3: Implement**

`src/folder.js`:

```js
/** A free name for a photo copied into the photo folder: "a.jpg", else "a (2).jpg", … */
export function freePhotoName(names, fileName) {
	const taken = new Set(names)
	const dot = fileName.lastIndexOf('.')
	const base = dot > 0 ? fileName.slice(0, dot) : fileName
	const ext = dot > 0 ? fileName.slice(dot) : ''
	for (let n = 1; ; n++) {
		const candidate = n === 1 ? fileName : `${base} (${n})${ext}`
		if (!taken.has(candidate)) {
			return candidate
		}
	}
}
```

`src/dav.js` (next to `transfer`, axios like every other request in the file):

```js
/** Create a folder; an existing one (405) is fine. */
export async function ensureFolder(url) {
	try {
		await axios.request({ method: 'MKCOL', url })
	} catch (e) {
		if (e.response?.status !== 405) {
			throw e
		}
	}
}
```

`src/create.js`:

```js
import { PHOTO_FOLDER } from './markers.js'
import { ensureFolder } from './dav.js'
import { freePhotoName } from './folder.js'

/** Copy a photo from elsewhere into the walkthrough's photo folder; returns its relative path. */
export async function copyPhotoIntoFolder(folder, photoNames, absolute) {
	const { rootUrl, dir } = folderBase(folder)
	await ensureFolder(urlFor(rootUrl, `${dir}/${PHOTO_FOLDER}`))
	const names = [...photoNames]
	const fileName = absolute.split('/').pop()
	for (let tries = 0; tries < 20; tries++) {
		const name = freePhotoName(names, fileName)
		if (await copyFile(urlFor(rootUrl, absolute), urlFor(rootUrl, `${dir}/${PHOTO_FOLDER}/${name}`))) {
			return `${PHOTO_FOLDER}/${name}`
		}
		names.push(name)
	}
	throw new Error(t('There is no free file name for the photo in this folder.'))
}
```

`photoNames` = names already in `2D-Bilder/` (from `listFolder` of that subfolder).

- [ ] **Step 4: Tests** – `npm test` PASS; new string → de „Für das Foto gibt es in diesem Ordner keinen freien Dateinamen.", `npm run l10n`.

- [ ] **Step 5: Commit**

```bash
git add src/dav.js src/create.js src/folder.js tests/folder.test.js l10n
git commit -m "Photo folder: create it, copy photos in without overwriting"
```

### Task 9: Editor – marker section

**Files:**
- Create: `src/components/MarkerSection.vue`
- Modify: `src/components/TourApp.vue` (state, panorama place mode, undo, saving unchanged)

**Interfaces:**
- Consumes: Tasks 5, 6, 7, 8; `setStatus(type, text, action, onAction)` and `changed()` in TourApp; `fileUrl`.
- Produces: `MarkerSection` props `markers: Array` (of the selected capture), `photos: Array<string>` (unused photos), `placing: String|null` (`'new'`, `'move:<index>'` or null), `urlFor: Function`; emits `place-new`, `move(index)`, `cancel-place`, `edit-text(index, text)`, `choose-photo(index)`, `remove-photo(index)`, `remove(index)`, `add-photo(path)`, `open(index)`.

- [ ] **Step 1: MarkerSection.vue**

Section heading "Markierungen ({count})"; list of markers (thumbnail `<img :src="urlFor(m.file)" loading="lazy">` 40×40 or `mdiCommentTextOutline`, `markerTitle`, state „gesetzt"/„ohne Ort"); clicking an entry emits `open(i)` and expands an inline editor for that entry:

```vue
<NcTextArea :model-value="m.text ?? ''"
	:label="t('Text')"
	:maxlength="MAX_MARKER_TEXT"
	resize="vertical"
	@update:model-value="$emit('edit-text', i, $event)" />
<NcButton @click="$emit('choose-photo', i)">{{ m.file ? t('Other photo') : t('Choose photo') }}</NcButton>
<NcButton v-if="m.file" @click="$emit('remove-photo', i)">{{ t('Remove photo') }}</NcButton>
<NcButton @click="$emit('move', i)">{{ isPlaced(m) ? t('Move in the panorama') : t('Place in the panorama') }}</NcButton>
<NcButton variant="error" @click="$emit('remove', i)">{{ t('Remove marker') }}</NcButton>
```

Below the list: `<NcButton variant="secondary" @click="$emit('place-new')">{{ t('Place marker') }}</NcButton>`; while `placing` a hint line „Klicken Sie ins Panorama – Esc bricht ab." with a "Cancel" button emitting `cancel-place`. Then „Neue Fotos ({count})" listing `photos` (thumbnail + name, button "Add to this capture" → `add-photo(path)`).

- [ ] **Step 2: TourApp state and handlers**

```js
const placing = ref(null) // null | 'new' | `move:${index}`
const editedMarkers = computed(() => markersOf(currentCapture.value))

function markersFor(capture) {
	if (!capture.markers) {
		capture.markers = []
	}
	return capture.markers
}

async function onPanoramaPick({ yaw, pitch }) {
	const capture = currentCapture.value
	if (!capture || !placing.value) {
		return
	}
	const list = markersFor(capture)
	if (placing.value === 'new') {
		list.push({ yaw, pitch, text: '' })
		setStatus('success', t('Marker placed – not saved yet'), t('Undo'), () => { list.pop(); changed() })
	} else {
		const index = Number(placing.value.split(':')[1])
		const before = { yaw: list[index].yaw, pitch: list[index].pitch }
		Object.assign(list[index], { yaw, pitch })
		setStatus('success', t('Marker moved – not saved yet'), t('Undo'), () => {
			if (before.yaw === undefined) {
				delete list[index].yaw
				delete list[index].pitch
			} else {
				Object.assign(list[index], before)
			}
			changed()
		})
	}
	placing.value = null
	changed()
}
```

Other handlers: `edit-text` sets `list[i].text`; `remove` splices with Undo (`list.splice(i, 0, removed)`); `remove-photo` deletes `file` (blocked with a note when the marker would have neither text nor photo: "A marker needs a text or a photo."); `choose-photo` opens `getFilePickerBuilder(t('Choose a photo'))` with mime filter `['image/jpeg', 'image/png', 'image/webp']`, start at `${folder.path}/2D-Bilder`; a pick inside `2D-Bilder/` is used as is, otherwise `copyPhotoIntoFolder`; `add-photo(path)` pushes `{ file: path }`. Before saving, drop markers whose `text` is empty and that have no `file` (a placed marker never given a text): `capture.markers = capture.markers.filter(m => m.file || m.text?.trim())`, delete the key when empty. Escape (existing key handler) cancels `placing` first. Pass `:placing="!!placing"` and `@pick="onPanoramaPick"` to `PanoramaView` (editor only; in the viewer `placing` stays null). Unused photos: list `2D-Bilder/` with `listFolder(urlFor(rootUrl, dir + '/2D-Bilder'))` in `loadImages()` (404 → empty), keep names as `2D-Bilder/<name>`, `unusedPhotos(tour, names)`.

- [ ] **Step 3: Strings, tests, build**

Add all new strings to `l10n/de_DE.json` and informal overrides in `tools/l10n-build.mjs` where they address the user („Klicken Sie …" → „Klicke …"); `npm run l10n`, `npm test` (0 missing/unused), `npm run build`.

- [ ] **Step 4: Check on the test instance**

Place a marker, type text, choose a photo from `2D-Bilder/` and from another folder (copied, numbered when taken), move it, remove photo, remove marker, undo each, Escape cancels placing, add an unused photo (shows in the viewer gallery), save, reload, conflict path unchanged, visits show markers per day.

- [ ] **Step 5: Commit**

```bash
git add src/components/MarkerSection.vue src/components/TourApp.vue l10n tools/l10n-build.mjs
git commit -m "Editor: place, edit, move and remove markers, add photos"
```

### Task 10: GPS from EXIF and "Open in OpenStreetMap"

**Files:**
- Modify: `src/exif.js`, `src/components/TourHeader.vue`, `src/components/TourApp.vue`
- Test: `tests/exif.test.js`

**Interfaces:**
- Produces: `exifGps(buffer) → { lat, lon } | null` in `src/exif.js`; `osmUrl({ lat, lon }) → string` in `src/tour.js`; TourHeader prop `mapUrl: String|null`.

- [ ] **Step 1: Failing tests**

```js
// tests/exif.test.js – add
import { exifGps } from '../src/exif.js'
import { osmUrl } from '../src/tour.js'

// minimal JPEG: SOI, APP1 "Exif\0\0", big-endian TIFF, IFD0 with GPS pointer (0x8825),
// GPS IFD: N, 52/1 30/1 5.6/1 ; E, 13/1 21/1 48.5/1
function jpegWithGps() {
	const b = []
	const u16 = (v) => b.push((v >> 8) & 255, v & 255)
	const u32 = (v) => b.push((v >>> 24) & 255, (v >> 16) & 255, (v >> 8) & 255, v & 255)
	const tiff = []
	// build TIFF separately then wrap; offsets relative to TIFF start
	const t16 = (v) => tiff.push((v >> 8) & 255, v & 255)
	const t32 = (v) => tiff.push((v >>> 24) & 255, (v >> 16) & 255, (v >> 8) & 255, v & 255)
	tiff.push(0x4d, 0x4d); t16(42); t32(8) // "MM", IFD0 at 8
	t16(1); t16(0x8825); t16(4); t32(1); t32(26); t32(0) // IFD0: GPS pointer -> 26
	// GPS IFD at 26: 4 entries
	t16(4)
	t16(1); t16(2); t32(2); tiff.push(0x4e, 0, 0, 0) // LatRef "N"
	t16(2); t16(5); t32(3); t32(80) // Lat -> 80
	t16(3); t16(2); t32(2); tiff.push(0x45, 0, 0, 0) // LonRef "E"
	t16(4); t16(5); t32(3); t32(104) // Lon -> 104
	t32(0)
	while (tiff.length < 80) tiff.push(0)
	for (const [n, d] of [[52, 1], [30, 1], [56, 10], [13, 1], [21, 1], [485, 10]]) { t32(n); t32(d) }
	u16(0xffd8); u16(0xffe1); u16(2 + 6 + tiff.length)
	b.push(0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff)
	u16(0xffda)
	return new Uint8Array(b).buffer
}

describe('exifGps', () => {
	it('reads latitude and longitude in degrees', () => {
		const gps = exifGps(jpegWithGps())
		expect(gps.lat).toBeCloseTo(52 + 30 / 60 + 5.6 / 3600, 5)
		expect(gps.lon).toBeCloseTo(13 + 21 / 60 + 48.5 / 3600, 5)
	})
	it('gives null without GPS', () => {
		expect(exifGps(new Uint8Array([0xff, 0xd8, 0xff, 0xda]).buffer)).toBeNull()
	})
})

describe('osmUrl', () => {
	it('centres the building at zoom 18', () => {
		expect(osmUrl({ lat: 52.50156, lon: 13.36347 }))
			.toBe('https://www.openstreetmap.org/?mlat=52.50156&mlon=13.36347#map=18/52.50156/13.36347')
	})
})
```

- [ ] **Step 2: Run – FAIL.**

- [ ] **Step 3: Implement**

`src/exif.js`: refactor `fromTiff` into a reader returning the IFD helpers (`readIfd`, `ascii`, rationals) used by both `exifDate` and `exifGps`; GPS tags `0x8825` (pointer in IFD0), `1` LatRef, `2` Lat (3 rationals), `3` LonRef, `4` Lon. Degrees = d + m/60 + s/3600; S/W negative; null when any part is missing or zero-denominator. Keep `exifDate` behaviour identical (existing tests).

`src/tour.js`:

```js
/** Link to the walkthrough's location on openstreetmap.org, building in the middle. */
export function osmUrl({ lat, lon }) {
	return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`
}
```

TourApp: when placing the first image of a walkthrough without `location`, read the same 64 KB start already read for the date (`readStart`) and set `tour.value.location = exifGps(buffer)` rounded (via `parseTour` on save). Pass `:map-url="tour?.location ? osmUrl(tour.location) : null"` to `TourHeader`.

TourHeader (view mode, before the edit button):

```vue
<NcButton v-if="mode === 'view' && mapUrl"
	variant="tertiary"
	:href="mapUrl"
	target="_blank"
	rel="noopener noreferrer"
	:aria-label="t('Open in OpenStreetMap')"
	:title="t('Open in OpenStreetMap')">
	<template #icon><NcIconSvgWrapper :path="mdiMapOutline" /></template>
</NcButton>
```

- [ ] **Step 4: Tests, strings, build** – `npm test` PASS; „In OpenStreetMap öffnen"; `npm run l10n`; `npm run build`.

- [ ] **Step 5: Check** – a walkthrough with `location` shows the button, opens a new tab at the building; without location no button; placing an image with GPS EXIF sets the location (check the saved JSON).

- [ ] **Step 6: Commit**

```bash
git add src/exif.js src/tour.js src/components/TourHeader.vue src/components/TourApp.vue tests/exif.test.js l10n
git commit -m "Location from GPS EXIF, Open in OpenStreetMap"
```

### Task 11: Documentation

**Files:** `README.md`, `docs/ux/texte.md`, `docs/ux/gestaltung.md`, `appinfo/info.xml` (descriptions), `CHANGELOG.md`, `CHANGELOG.de.md`, `CLAUDE.md` (layout list: new files)

- [ ] **Step 1:** README: format example with `markers` and `location`, bullet list of the rules from the spec §2; Usage: dividers, markers in viewer and editor, photo folder `2D-Bilder/`, "Open in OpenStreetMap".
- [ ] **Step 2:** texte.md: term **Markierung**, every new string (en / de formal / de informal); gestaltung.md: marker icon style, dividers (row divider like the column divider).
- [ ] **Step 3:** Store description (en/de) one paragraph on markers; CHANGELOG `## [Unreleased]` entries.
- [ ] **Step 4:** `npm test` (translation check), commit `git commit -m "Docs: markers, dividers, location"`.

### Task 12: Whole-code review and fixes

- [ ] **Step 1:** Invoke **superpowers:requesting-code-review** for the whole code base (`src/`, `tests/`, `tools/`, `lib/`, `appinfo/`), not only the diff; reviewers check correctness, structure/size, usability/accessibility, texts against `docs/ux/texte.md`.
- [ ] **Step 2:** Verify each finding against the code (superpowers:receiving-code-review); fix the real ones with tests where logic is involved; note rejected ones with the reason.
- [ ] **Step 3:** `npm test`, `npm run build`, deploy to the test instance, repeat the checks of Tasks 2, 3, 7, 9, 10.
- [ ] **Step 4:** Commit `git commit -m "Review fixes"`.

### Task 13: Release 0.6.0

- [ ] **Step 1:** `appinfo/info.xml` version `0.6.0`, CHANGELOG headings `## 0.6.0 – <date>`, validate `info.xml` against `info.xsd`.
- [ ] **Step 2:** `npm test`, `npm run build`, `git grep` for names (no product/project names), commit "Release 0.6.0", push `feat/tours` and `master`.
- [ ] **Step 3:** `gh release create v0.6.0 --repo weltmaister/photosphere_tours --target master --title "Photosphere Tours 0.6.0" --notes-file <English changelog section>`; wait for "Build and publish app release"; confirm the store page shows 0.6.0.
