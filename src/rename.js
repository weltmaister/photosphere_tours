/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Image files follow the name of their spot. The moves happen before the
 * walkthrough file is written, so they can be undone when that write fails –
 * otherwise the saved walkthrough would point at names that no longer exist.
 * File access is passed in, which keeps this testable.
 */
import { renamedFile } from './tour.js'

/**
 * @callback Move
 * @param {string} from path relative to the walkthrough
 * @param {string} to path relative to the walkthrough
 * @return {Promise<boolean>} false if `to` already exists
 */

/** Move `current` to `wanted`, or to "wanted (2)" etc. if that name is taken. */
async function moveToFreeName(current, wanted, move) {
	const dot = wanted.lastIndexOf('.')
	for (let n = 1; n <= 20; n++) {
		const candidate = n === 1 ? wanted : `${wanted.slice(0, dot)} (${n})${wanted.slice(dot)}`
		if (await move(current, candidate)) {
			return candidate
		}
	}
	return null
}

/**
 * Rename the image files of the given spots after the spot names and point
 * the captures at the new names. A file that cannot be moved (deleted,
 * locked, no permission) keeps its name; that does not stop the others.
 *
 * @param {Array} spots the walkthrough's spots
 * @param {Set} renamed spots whose files should follow their name (the same
 *   objects as in `spots`)
 * @param {Move} move
 * @return {Promise<{ moves: Array<{ capture: object, from: string, to: string }>, failed: string[] }>}
 */
export async function renameSpotFiles(spots, renamed, move) {
	const moves = []
	const failed = []
	for (const spot of spots) {
		if (!renamed.has(spot)) {
			continue
		}
		for (const capture of spot.captures) {
			const wanted = renamedFile(capture.file, capture.date, spot.name)
			if (wanted === capture.file) {
				continue
			}
			try {
				const target = await moveToFreeName(capture.file, wanted, move)
				if (target) {
					moves.push({ capture, from: capture.file, to: target })
					capture.file = target
				} else {
					failed.push(capture.file)
				}
			} catch {
				failed.push(capture.file)
			}
		}
	}
	return { moves, failed }
}

/** Put moved files back, newest move first; best effort. */
export async function undoMoves(moves, move) {
	for (const { capture, from, to } of [...moves].reverse()) {
		try {
			if (await move(to, from)) {
				capture.file = from
			}
		} catch {
			// the file stays under its new name; the walkthrough still says so
		}
	}
}
