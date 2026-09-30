/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Pure part of the HoloBuilder import: turns the files of a cleaned-up
 * HoloBuilder backup into one tour per floor folder.
 *
 * Backup layout (one folder per HoloBuilder sheet):
 *   <sheet>/NNN_YYYY-MM-DD_HHMM_<scene>.jpg          current captures
 *   <sheet>/_aeltere_Versionen/YYYY-MM-DD_HHMM_<scene>.jpg   earlier captures
 *   Grundrisse/<sheet>.png                             floor plans
 *   _meta/index.csv    Geschoss;Szene;sId;Aufnahmezeit;Plan-X;Plan-Y;…
 *   _meta/index.json   { geschosse: [{ sheet, floorplanSize: {x, y} }] }
 *   _meta/slideNodes_<sheet>.json   { slideNodes: [{ sId, timeStamp, markerV3, slideNodes }] }
 *
 * Despite its name, `_aeltere_Versionen` holds the *later* captures of a spot:
 * they are HoloBuilder's child slides of the original capture. Everything is
 * ordered by date, so the name does not matter for the timeline.
 */
import { dateFromFilename, nameFromFilename, TOUR_VERSION } from '../src/tour.js'

export const OLDER_FOLDER = '_aeltere_Versionen'

const normDeg = (d) => ((d % 360) + 360) % 360

const localMinute = (ms) => new Date(Number(ms))
	.toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' })
	.slice(0, 16)
	.replace(' ', 'T')

/**
 * Orientation per capture from a slideNodes export.
 *
 * @param {object} data parsed slideNodes_<sheet>.json
 * @return {Map<string, { rotation: object, children: Map<string, object> }>}
 *   sId -> rotation of the original and rotations of later captures by date
 */
export function rotationsFromSlideNodes(data) {
	const nodes = Array.isArray(data) ? data : (data?.slideNodes ?? [])
	return new Map(nodes.map(node => [String(node.sId), {
		rotation: node.markerV3?.rotation,
		children: new Map((node.slideNodes ?? []).map(child => [localMinute(child.timeStamp), child.markerV3?.rotation])),
	}]))
}

/** Parse index.csv into rows keyed by column name. */
export function parseIndexCsv(text) {
	const lines = (text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text).split(/\r?\n/).filter(l => l.trim() !== '')
	const header = lines.shift().split(';')
	const col = (name) => header.indexOf(name)
	const idx = {
		sheet: col('Geschoss'),
		scene: col('Szene'),
		sId: col('sId'),
		time: col('Aufnahmezeit'),
		x: col('Plan-X'),
		y: col('Plan-Y'),
	}
	for (const [key, i] of Object.entries(idx)) {
		if (i < 0) {
			throw new Error(`index.csv: column for "${key}" missing`)
		}
	}
	return lines.map((line) => {
		const f = line.split(';')
		return {
			sheet: f[idx.sheet],
			scene: f[idx.scene],
			sId: f[idx.sId],
			time: f[idx.time],
			x: Number(f[idx.x]),
			y: Number(f[idx.y]),
		}
	})
}

/**
 * Heading of a HoloBuilder sphere rotation (three.js Euler) in degrees,
 * relative to HoloBuilder's untouched default (π, 0, π). The default and the
 * identity (which child slides carry when never aligned) count as "not
 * aligned".
 *
 * @return {number|null} null when not aligned
 */
export function headingFromRotation(rotation) {
	if (!rotation) {
		return null
	}
	const { x, y, z } = rotation
	if (Math.abs(x) < 1e-3 && Math.abs(y) < 1e-3 && Math.abs(z) < 1e-3) {
		return null
	}
	// R = Rx(x)·Ry(y)·Rz(z) applied to (1, 0, 0)
	const v1 = [Math.cos(y) * Math.cos(z), Math.cos(y) * Math.sin(z), -Math.sin(y)]
	const vx = v1[0]
	const vz = Math.sin(x) * v1[1] + Math.cos(x) * v1[2]
	const heading = Math.atan2(-vz, vx) * 180 / Math.PI
	const deviation = Math.abs(normDeg(heading) - 180)
	return deviation < 0.5 ? null : normDeg(heading - 180)
}

function sceneKey(name) {
	return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Build the tour of one floor folder.
 *
 * @param {object} input
 * @param {string} input.sheet folder / sheet name
 * @param {object[]} input.rows index.csv rows of this sheet
 * @param {string[]} input.files jpg names directly in the folder
 * @param {string[]} input.olderFiles jpg names in _aeltere_Versionen
 * @param {Map<string,object>} input.rotations from rotationsFromSlideNodes()
 * @param {string|null} input.plan plan path relative to the folder
 * @param {{yawSign?: number, yawOffset?: number}} [options]
 * @return {{ tour: object, report: object }}
 */
export function buildFloorTour({ sheet, rows, files, olderFiles, rotations, plan }, options = {}) {
	const { yawSign = 1, yawOffset = 0 } = options
	const report = {
		sheet,
		spots: 0,
		captures: 0,
		aligned: 0,
		missingFiles: [],
		unmatchedOlder: [],
		ambiguousOlder: [],
		unplaced: [],
		olderOlderThanCurrent: [],
	}

	const unused = new Set(files)
	const spots = []
	for (const row of rows) {
		const date = row.time.replace(' ', 'T').slice(0, 16)
		const file = files.find(f => unused.has(f)
			&& sceneKey(nameFromFilename(f)) === sceneKey(row.scene)
			&& dateFromFilename(f) === date)
			?? files.find(f => unused.has(f) && sceneKey(nameFromFilename(f)) === sceneKey(row.scene))
		if (!file) {
			report.missingFiles.push(`${row.scene} (${row.time})`)
			continue
		}
		unused.delete(file)

		const slide = rotations.get(String(row.sId))
		const heading = headingFromRotation(slide?.rotation)
		if (heading !== null) {
			report.aligned++
		}
		spots.push({
			slide,
			name: row.scene,
			x: row.x,
			y: row.y,
			captures: [{
				file,
				date: dateFromFilename(file) ?? date,
				yaw: heading === null ? 0 : normDeg(yawSign * heading + yawOffset),
			}],
		})
	}
	report.unplaced = [...unused]

	for (const older of olderFiles) {
		const date = dateFromFilename(older)
		let matches = spots.filter(s => sceneKey(s.name) === sceneKey(nameFromFilename(older)))
		if (matches.length > 1) {
			// same scene name twice on a floor: the slide history knows which one
			matches = matches.filter(s => s.slide?.children.has(date))
		}
		if (!date || matches.length === 0) {
			report.unmatchedOlder.push(older)
			continue
		}
		if (matches.length > 1) {
			report.ambiguousOlder.push(older)
			continue
		}
		const spot = matches[0]
		if (date < spot.captures[0].date) {
			report.olderOlderThanCurrent.push(`${older} (${date}) < ${spot.captures[0].file}`)
		}
		const heading = headingFromRotation(spot.slide?.children.get(date))
		if (heading !== null) {
			report.aligned++
		}
		spot.captures.push({
			file: `${OLDER_FOLDER}/${older}`,
			date,
			yaw: heading === null ? spot.captures[0].yaw : normDeg(yawSign * heading + yawOffset),
		})
	}
	for (const spot of spots) {
		delete spot.slide
	}

	report.spots = spots.length
	report.captures = spots.reduce((n, s) => n + s.captures.length, 0)
	return {
		tour: { version: TOUR_VERSION, title: sheet, plan, spots },
		report,
	}
}
