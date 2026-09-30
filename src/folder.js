/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * What a folder holds: the walkthrough file, 360° images and floor plan
 * candidates. Only the folder itself counts – subfolders are ignored (they
 * often hold copies, e.g. compressed versions).
 */
import { TOUR_FILENAME } from './tour.js'

const JPEG_RE = /\.jpe?g$/i
const PLAN_RE = /\.(pdf|png|webp|svg)$/i
// an ordinary photo must not be picked as floor plan automatically
const PLAN_NAME_RE = /grundriss|lageplan|plan|floor|layout/i
const stem = (name) => name.replace(/\.[^.]+$/, '')
const isPdf = (name) => /\.pdf$/i.test(name)

/** File name of the PNG a PDF floor plan is converted to. */
export function pngNameFor(pdfName) {
	return `${stem(pdfName)}.png`
}

/**
 * @param {Array<{name: string, isFolder: boolean, mime?: string, mtime?: Date, panorama?: boolean|null}>} entries
 *   direct children of the folder; `panorama` is true/false when the
 *   files_photospheres app reported it, null when unknown
 * @return {{ hasTour: boolean, panoramas: string[], knownPanoramas: number, plans: string[] }}
 */
export function classifyFolder(entries) {
	const files = entries.filter(e => !e.isFolder)
	const panoramas = files.filter(e => JPEG_RE.test(e.name) && e.panorama !== false).map(e => e.name)
	const knownPanoramas = files.filter(e => JPEG_RE.test(e.name) && e.panorama === true).length
	const names = new Set(files.map(e => e.name))
	const plans = files
		.filter(e => PLAN_RE.test(e.name) || (JPEG_RE.test(e.name) && e.panorama !== true && PLAN_NAME_RE.test(e.name)))
		// a PDF that was already converted is offered as its PNG
		.filter(e => !(isPdf(e.name) && names.has(pngNameFor(e.name))))
		.map(e => e.name)
	return {
		hasTour: names.has(TOUR_FILENAME),
		panoramas,
		knownPanoramas,
		plans,
	}
}

/**
 * A floor plan in the folder that is newer than the one the walkthrough uses.
 *
 * @param {Array} entries direct children of the folder
 * @param {string} currentPlan the tour's `plan` (relative path)
 * @return {string|null} file name of the newest such plan
 */
export function newerPlan(entries, currentPlan) {
	const current = entries.find(e => e.name === currentPlan)
	if (!current?.mtime) {
		// plan lives elsewhere (e.g. ../Grundrisse): nothing to compare with
		return null
	}
	const since = current.mtime.getTime()
	const candidates = classifyFolder(entries).plans
		.filter(name => name !== currentPlan)
		// the PDF the current PNG was made from is not "newer"
		.filter(name => !(isPdf(name) && pngNameFor(name) === currentPlan))
		.map(name => entries.find(e => e.name === name))
		.filter(e => e.mtime && e.mtime.getTime() > since)
		.sort((a, b) => b.mtime - a.mtime)
	return candidates[0]?.name ?? null
}
