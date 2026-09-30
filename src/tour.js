/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Pure tour logic without DOM or Nextcloud dependencies.
 *
 * A tour is one file `360-Rundgang.json` in a folder of panoramas:
 *
 *   { version: 1, title, plan, spots: [{ name, x, y, captures: [{ file, date, yaw }] }] }
 *
 * `plan` and `file` are relative to that folder, `x`/`y` are normalised plan
 * coordinates (0–1, origin top left), `date` is local time `YYYY-MM-DDTHH:MM`.
 * `yaw` is the raw panorama yaw in degrees that looks towards the top of the
 * plan. The viewer turns each panorama by that amount, so view yaw 0 always
 * means "up on the plan" and the view direction survives switching captures.
 */

export const TOUR_FILENAME = '360-Rundgang.json'
export const TOUR_VERSION = 1

const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const IMAGE_RE = /\.jpe?g$/i

export class TourError extends Error {
	constructor(problems) {
		const list = Array.isArray(problems) ? problems : [problems]
		super(list.join('\n'))
		this.name = 'TourError'
		this.problems = list
	}
}

const toRad = (d) => d * Math.PI / 180
const toDeg = (r) => r * 180 / Math.PI
const normDeg = (d) => ((d % 360) + 360) % 360

function isInsideFolder(path) {
	return typeof path === 'string'
		&& path !== ''
		&& !path.startsWith('/')
		&& !path.split('/').includes('..')
}

/**
 * Validate and normalise tour data. Collects all problems before throwing so
 * a broken file can be fixed in one go.
 *
 * @param {string|object} input file content or parsed JSON
 * @return {object} the normalised tour
 */
export function parseTour(input) {
	let data = input
	if (typeof input === 'string') {
		try {
			data = JSON.parse(input)
		} catch (e) {
			throw new TourError(`Invalid JSON: ${e.message}`)
		}
	}

	const problems = []
	if (!data || typeof data !== 'object') {
		throw new TourError('The tour must be a JSON object')
	}
	if (data.version !== TOUR_VERSION) {
		problems.push(`Unsupported version ${data.version}, expected ${TOUR_VERSION}`)
	}
	if (typeof data.plan !== 'string' || data.plan.trim() === '') {
		problems.push('"plan" must name the floor plan image')
	}
	if (!Array.isArray(data.spots)) {
		problems.push('"spots" must be a list')
	}

	const spots = (Array.isArray(data.spots) ? data.spots : []).map((spot, i) => {
		const where = `Spot ${i + 1}${spot?.name ? ` (${spot.name})` : ''}`
		for (const axis of ['x', 'y']) {
			const v = spot?.[axis]
			if (typeof v !== 'number' || !(v >= 0 && v <= 1)) {
				problems.push(`${where}: "${axis}" must be a number between 0 and 1`)
			}
		}
		const captures = Array.isArray(spot?.captures) ? spot.captures : []
		if (captures.length === 0) {
			problems.push(`${where}: needs at least one capture`)
		}
		return {
			name: typeof spot?.name === 'string' ? spot.name : '',
			x: spot?.x,
			y: spot?.y,
			captures: captures.map((c, j) => {
				if (!isInsideFolder(c?.file)) {
					problems.push(`${where}, capture ${j + 1}: "file" must be a path inside the tour folder`)
				}
				if (typeof c?.date !== 'string' || !DATE_RE.test(c.date)) {
					problems.push(`${where}, capture ${j + 1}: "date" must look like 2024-08-14T16:02`)
				}
				const yaw = c?.yaw ?? 0
				if (typeof yaw !== 'number' || !Number.isFinite(yaw)) {
					problems.push(`${where}, capture ${j + 1}: "yaw" must be a number`)
				}
				return { file: c?.file, date: c?.date, yaw: typeof yaw === 'number' ? normDeg(yaw) : 0 }
			}),
		}
	})

	if (problems.length > 0) {
		throw new TourError(problems)
	}
	return {
		version: TOUR_VERSION,
		title: typeof data.title === 'string' ? data.title : '',
		plan: data.plan,
		spots,
	}
}

/**
 * Resolve a path relative to a folder, e.g. the plan in a sibling folder.
 *
 * @param {string} dir absolute folder path, e.g. "/Projekt/360/EG"
 * @param {string} relative path relative to dir
 * @return {string} absolute path
 */
export function resolvePath(dir, relative) {
	const parts = dir.split('/').filter(Boolean)
	for (const part of relative.split('/')) {
		if (part === '' || part === '.') {
			continue
		}
		if (part === '..') {
			if (parts.length === 0) {
				throw new TourError(`"${relative}" points outside the shared folder`)
			}
			parts.pop()
		} else {
			parts.push(part)
		}
	}
	return '/' + parts.join('/')
}

/**
 * Path from a folder to a file, e.g. to store the plan relative to the tour.
 *
 * @param {string} dir absolute folder path
 * @param {string} target absolute file path
 * @return {string}
 */
export function relativePath(dir, target) {
	const from = dir.split('/').filter(Boolean)
	const to = target.split('/').filter(Boolean)
	let common = 0
	while (common < from.length && common < to.length - 1 && from[common] === to[common]) {
		common++
	}
	return [...from.slice(common).map(() => '..'), ...to.slice(common)].join('/')
}

/** Distinct capture days (YYYY-MM-DD), oldest first. */
export function captureDays(tour) {
	const days = new Set()
	for (const spot of tour.spots) {
		for (const c of spot.captures) {
			days.add(c.date.slice(0, 10))
		}
	}
	return [...days].sort()
}

/** Captures of a spot, newest first. */
export function capturesNewestFirst(spot) {
	return [...spot.captures].sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * The capture that shows a spot as it was on a given day.
 *
 * @param {object} spot
 * @param {string|null} day YYYY-MM-DD, or null for the newest capture
 * @return {object|null} null if the spot had not been captured by then
 */
export function captureAt(spot, day) {
	const sorted = capturesNewestFirst(spot)
	if (day === null) {
		return sorted[0] ?? null
	}
	return sorted.find(c => c.date.slice(0, 10) <= day) ?? null
}

/**
 * Photo Sphere Viewer sphere correction that puts plan-up at view yaw 0.
 * PSV shows the raw direction r at view yaw r - pan, so pan = yaw.
 */
export function sphereCorrection(capture) {
	return { pan: toRad(capture.yaw), tilt: 0, roll: 0 }
}

/** Raw panorama yaw (degrees) shown at a given view yaw (radians). */
export function rawYaw(capture, viewYaw) {
	return normDeg(toDeg(viewYaw) + capture.yaw)
}

/**
 * New `yaw` for a capture: the user looks at something in the panorama and
 * clicks where that thing is on the plan.
 *
 * @param {object} capture the capture as currently displayed
 * @param {number} viewYaw current view yaw in radians
 * @param {{x:number,y:number}} spot normalised position of the capture
 * @param {{x:number,y:number}} target normalised position clicked on the plan
 * @param {{w:number,h:number}} planSize plan size in pixels
 * @return {number} yaw in degrees
 */
export function alignYaw(capture, viewYaw, spot, target, planSize) {
	const dx = (target.x - spot.x) * planSize.w
	const dy = (target.y - spot.y) * planSize.h
	// clockwise from plan-up; image y grows downwards
	const bearing = toDeg(Math.atan2(dx, -dy))
	return normDeg(rawYaw(capture, viewYaw) - bearing)
}

/**
 * Zoom levels (percent) for Photo Sphere Viewer's MapPlugin, where 100 %
 * means one screen pixel per plan pixel. Floor plans are often 8000 px tall,
 * so fixed levels do not work: start on about a third of the plan and allow
 * zooming out until the whole plan fits.
 *
 * @param {{w:number,h:number}} planSize plan size in pixels
 * @param {number} mapSize size of the map in screen pixels
 * @return {{min:number, initial:number, max:number}}
 */
export function mapZoom(planSize, mapSize) {
	const fit = mapSize / Math.max(planSize.w, planSize.h) * 100
	return { min: fit * 0.8, initial: Math.min(100, fit * 3), max: 200 }
}

/**
 * Capture date from common file name patterns: the HoloBuilder backup
 * ("001_2024-07-02_1213_Scene.jpg", "2024-10-15_101148_Scene_01.jpg") and
 * camera exports ("IMG_20260930_143012_00_012.jpg").
 *
 * @param {string} name file name
 * @return {string|null} YYYY-MM-DDTHH:MM
 */
export function dateFromFilename(name) {
	const base = name.split('/').pop()
	let m = base.match(/(?:^|_)(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})/)
	if (!m) {
		m = base.match(/(?:^|_)(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\d{2}/)
	}
	return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : null
}

/** Readable spot name from a file name, without number, date and extension. */
export function nameFromFilename(name) {
	return name.split('/').pop()
		.replace(/\.[^.]+$/, '')
		.replace(/^(\d{3}_)?\d{4}-\d{2}-\d{2}_\d{4,6}_/, '')
}

/**
 * Images in the tour folder that no spot uses yet.
 *
 * @param {object} tour
 * @param {string[]} names paths relative to the tour folder
 * @return {string[]}
 */
export function unplacedFiles(tour, names) {
	const used = new Set(tour.spots.flatMap(s => s.captures.map(c => c.file)))
	return names.filter(n => IMAGE_RE.test(n) && !used.has(n))
}

export function emptyTour(title, plan) {
	return { version: TOUR_VERSION, title, plan, spots: [] }
}

function newCapture(file, fallbackDate) {
	return { file, date: dateFromFilename(file) ?? fallbackDate, yaw: 0 }
}

/** Place an image as a new spot. */
export function addSpot(tour, { x, y, file, fallbackDate }) {
	const spot = { name: nameFromFilename(file), x, y, captures: [newCapture(file, fallbackDate)] }
	tour.spots.push(spot)
	return spot
}

/** Add an image as a further capture of an existing spot. */
export function addCapture(spot, { file, fallbackDate }) {
	const capture = newCapture(file, fallbackDate)
	spot.captures.push(capture)
	return capture
}

/** Format a Date as local YYYY-MM-DDTHH:MM. */
export function formatDate(date) {
	const p = (n) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

export function serializeTour(tour) {
	return JSON.stringify(parseTour(tour), null, '\t') + '\n'
}
