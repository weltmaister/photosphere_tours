/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * EXIF capture dates of image files, read in the background: at most `limit` requests at a
 * time, each file once per session (also when the read fails or has no EXIF block). The
 * lists show file name or file time dates at once and re-sort as the EXIF dates come in.
 */
import { reactive } from 'vue'

/**
 * @param {object} options
 * @param {(path: string) => Promise<string|null>} options.read the EXIF date of a file, null without one
 * @param {number} [options.limit] requests at the same time
 */
export function useCaptureTimes({ read, limit = 4 }) {
	/** path -> EXIF date or null; set once the file has been read (reactive per key) */
	const dates = reactive(new Map())
	/** paths that are running or done, never read twice */
	const started = new Set()
	let queue = []
	let running = 0

	/** a failing read (also one that throws at once) is a file without an EXIF date */
	async function attempt(path) {
		try {
			return await read(path)
		} catch {
			return null
		}
	}

	function pump() {
		while (running < limit && queue.length > 0) {
			const path = queue.shift()
			started.add(path)
			running++
			attempt(path)
				.then((date) => { dates.set(path, date ?? null) })
				.finally(() => {
					running--
					pump()
				})
		}
	}

	/**
	 * Read the EXIF dates of these files. The files that wait from an earlier call and are
	 * not in this one are dropped (they left the list), so the newest list is read first.
	 */
	function load(paths) {
		queue = [...new Set(paths)].filter(path => !started.has(path))
		pump()
	}

	return {
		/** the EXIF date of a file; null when it has none or is not read yet */
		exifOf: (path) => dates.get(path) ?? null,
		load,
	}
}
