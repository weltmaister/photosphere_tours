/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Capture date and GPS position from the EXIF block at the start of a JPEG. Only the first
 * few kilobytes are needed, so 25 MB panoramas need not be downloaded.
 */

const TAG_EXIF_IFD = 0x8769
const TAG_DATE_TIME_ORIGINAL = 0x9003
const TAG_DATE_TIME = 0x0132
const TAG_GPS_IFD = 0x8825
const GPS_LAT_REF = 1
const GPS_LAT = 2
const GPS_LON_REF = 3
const GPS_LON = 4

/**
 * @param {ArrayBuffer} buffer the beginning of a JPEG file (64 KB is plenty)
 * @return {string|null} YYYY-MM-DDTHH:MM
 */
export function exifDate(buffer) {
	return withTiff(buffer, ({ ifd0, exif, ascii }) => {
		return toIso(ascii(exif.get(TAG_DATE_TIME_ORIGINAL))) ?? toIso(ascii(ifd0.get(TAG_DATE_TIME)))
	})
}

/**
 * Where the picture was taken.
 *
 * @param {ArrayBuffer} buffer the beginning of a JPEG file (64 KB is plenty)
 * @return {{lat: number, lon: number}|null} degrees, south and west negative
 */
export function exifGps(buffer) {
	return withTiff(buffer, ({ ifd0, ascii, rationals, readIfd, u32 }) => {
		const pointer = ifd0.get(TAG_GPS_IFD)
		if (!pointer) {
			return null
		}
		const gps = readIfd(u32(pointer.value))
		const lat = degrees(rationals(gps.get(GPS_LAT), 3), ascii(gps.get(GPS_LAT_REF)), 'S')
		const lon = degrees(rationals(gps.get(GPS_LON), 3), ascii(gps.get(GPS_LON_REF)), 'W')
		return lat === null || lon === null ? null : { lat, lon }
	})
}

/** Degrees, minutes, seconds to a signed decimal; null when anything is missing. */
function degrees(parts, ref, negative) {
	if (!parts || !ref) {
		return null
	}
	const value = parts[0] + parts[1] / 60 + parts[2] / 3600
	return ref.toUpperCase() === negative ? -value : value
}

/** Find the EXIF block of a JPEG and hand the TIFF reader to `read`; null when there is none. */
function withTiff(buffer, read) {
	try {
		const view = new DataView(buffer)
		if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
			return null
		}
		let offset = 2
		while (offset + 4 <= view.byteLength) {
			const marker = view.getUint16(offset)
			const length = view.getUint16(offset + 2)
			if (marker === 0xffe1 && isExifHeader(view, offset + 4)) {
				return read(tiffReader(view, offset + 10))
			}
			if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) {
				return null // start of scan or broken file: no EXIF ahead
			}
			offset += 2 + length
		}
	} catch {
		// truncated buffer
	}
	return null
}

function isExifHeader(view, at) {
	return view.getUint32(at) === 0x45786966 && view.getUint16(at + 4) === 0 // "Exif\0\0"
}

function tiffReader(view, tiff) {
	const little = view.getUint16(tiff) === 0x4949
	const u16 = (at) => view.getUint16(tiff + at, little)
	const u32 = (at) => view.getUint32(tiff + at, little)

	const readIfd = (at) => {
		const tags = new Map()
		const count = u16(at)
		for (let i = 0; i < count; i++) {
			const entry = at + 2 + i * 12
			tags.set(u16(entry), { type: u16(entry + 2), count: u32(entry + 4), value: entry + 8 })
		}
		return tags
	}
	const ascii = (tag) => {
		if (!tag || tag.type !== 2) {
			return null
		}
		const at = tag.count > 4 ? u32(tag.value) : tag.value
		let s = ''
		for (let i = 0; i < tag.count - 1; i++) {
			s += String.fromCharCode(view.getUint8(tiff + at + i))
		}
		return s
	}
	/** `count` RATIONAL values as numbers; null for another type or a zero denominator. */
	const rationals = (tag, count) => {
		if (!tag || tag.type !== 5 || tag.count < count) {
			return null
		}
		const at = u32(tag.value)
		const values = []
		for (let i = 0; i < count; i++) {
			const denominator = u32(at + i * 8 + 4)
			if (denominator === 0) {
				return null
			}
			values.push(u32(at + i * 8) / denominator)
		}
		return values
	}

	const ifd0 = readIfd(u32(4))
	const exifPointer = ifd0.get(TAG_EXIF_IFD)
	const exif = exifPointer ? readIfd(u32(exifPointer.value)) : new Map()
	return { ifd0, exif, ascii, rationals, readIfd, u32 }
}

function toIso(value) {
	const m = value?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/)
	if (!m || m[1] === '0000') {
		return null
	}
	return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`
}
