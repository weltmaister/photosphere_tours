/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Room names from the text of a PDF floor plan, to suggest a spot name.
 * A room stamp is a name with its area ("A: 39,0 m²") right below it; title
 * blocks and notes have none and are skipped.
 */

const AREA_RE = /^A\s*[:=]/
const LETTER_RE = /\p{L}/u
const LABEL_RE = /[:=]|^\d/

const isName = (s) => LETTER_RE.test(s) && !LABEL_RE.test(s) && s.length >= 2

/**
 * @param {Array<{str: string, x: number, y: number}>} items text items, 0–1, y downwards
 * @return {Array<{name: string, x: number, y: number}>}
 */
export function roomLabels(items) {
	const clean = items
		.map(i => ({ ...i, str: i.str.trim() }))
		.filter(i => i.str)
	const areas = clean.filter(i => AREA_RE.test(i.str))
	const stamped = clean.filter(i => isName(i.str) && areas.some(a =>
		Math.abs(a.x - i.x) < 0.03 && a.y > i.y && a.y - i.y < 0.02))
	const labels = stamped.length > 0 ? stamped : clean.filter(i => isName(i.str) && i.str.length >= 3)
	return labels.map(i => ({ name: i.str, x: i.x, y: i.y }))
}

/**
 * The room name closest to a point on the plan, or null if none is near.
 *
 * @param {Array} labels from roomLabels()
 * @param {{x: number, y: number}} point normalised plan position
 * @param {{w: number, h: number}} size plan size (for true distances)
 * @param {number} maxDistance share of the plan diagonal
 */
export function suggestName(labels, point, size, maxDistance = 0.15) {
	const diagonal = Math.hypot(size.w, size.h)
	let best = null
	let bestDistance = maxDistance * diagonal
	for (const label of labels) {
		const distance = Math.hypot((label.x - point.x) * size.w, (label.y - point.y) * size.h)
		if (distance < bestDistance) {
			best = label.name
			bestDistance = distance
		}
	}
	return best
}
