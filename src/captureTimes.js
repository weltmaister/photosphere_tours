/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Capture time of the images in the editor's lists ("New images", "New photos"):
 * where the date comes from and the order (oldest first), so images can be matched
 * to the floor plan by the order of the walk-through. Pure logic, no browser.
 */
import { captureDate, dateFromFilename } from './tour.js'

/**
 * The date as captureDate() finds it (EXIF, file name, file time) and whether it is only
 * the file time, which is when the file was written, not when it was taken.
 *
 * @param {{ exif?: string|null, file: string, mtime?: Date|null }} source
 * @return {{ date: string|null, estimated: boolean }} date as YYYY-MM-DDTHH:MM
 */
export function captureSource({ exif = null, file, mtime = null }) {
	const date = captureDate({ exif, file, mtime })
	return { date, estimated: date !== null && exif == null && dateFromFilename(file) === null }
}

/**
 * Oldest first, no date last, equal dates by file name (numbers by value: 2 before 10).
 *
 * @param {{ date: string|null, path: string }} a
 * @param {{ date: string|null, path: string }} b
 */
export function byCaptureTime(a, b) {
	if (a.date !== b.date) {
		if (a.date === null || a.date === undefined) {
			return 1
		}
		if (b.date === null || b.date === undefined) {
			return -1
		}
		return a.date < b.date ? -1 : 1
	}
	return a.path.localeCompare(b.path, undefined, { numeric: true })
}

/**
 * Items with their capture time, sorted.
 *
 * @param {Array<{ path: string, mtime?: Date|null }>} items files relative to the walkthrough folder
 * @param {(path: string) => string|null|undefined} exifOf the EXIF date once it has been read
 * @return {Array<{ path: string, date: string|null, estimated: boolean }>} the items with `date` and `estimated`
 */
export function withCaptureTimes(items, exifOf) {
	return items
		.map(item => ({ ...item, ...captureSource({ exif: exifOf(item.path) ?? null, file: item.path, mtime: item.mtime ?? null }) }))
		.sort(byCaptureTime)
}
