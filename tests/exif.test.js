import { describe, expect, it } from 'vitest'
import { exifDate } from '../src/exif.js'

/**
 * Minimal JPEG: SOI + APP1 "Exif" with IFD0 -> ExifIFD -> DateTimeOriginal,
 * optionally IFD0 DateTime only.
 */
function jpegWithExif({ original, modified, little = true }) {
	const entries0 = []
	const exifEntries = []
	const bytes = []
	const u16 = (v) => little ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]
	const u32 = (v) => little
		? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24]
		: [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
	const ascii = (s) => [...s].map(c => c.charCodeAt(0)).concat([0])

	// layout inside TIFF: header(8) | IFD0 | ExifIFD | strings
	if (modified) entries0.push({ tag: 0x0132, value: modified })
	if (original) entries0.push({ tag: 0x8769, pointer: true })
	if (original) exifEntries.push({ tag: 0x9003, value: original })

	const ifdSize = (n) => 2 + n * 12 + 4
	const ifd0At = 8
	const exifAt = ifd0At + ifdSize(entries0.length)
	let dataAt = exifAt + (exifEntries.length ? ifdSize(exifEntries.length) : 0)
	const data = []
	const entryBytes = (e) => {
		if (e.pointer) {
			return [...u16(e.tag), ...u16(4), ...u32(1), ...u32(exifAt)]
		}
		const str = ascii(e.value)
		const at = dataAt
		dataAt += str.length
		data.push(...str)
		return [...u16(e.tag), ...u16(2), ...u32(str.length), ...u32(at)]
	}
	const ifd = (list) => [...u16(list.length), ...list.flatMap(entryBytes), ...u32(0)]

	const tiff = [...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(ifd0At)]
	const ifd0 = ifd(entries0)
	const exif = exifEntries.length ? ifd(exifEntries) : []
	const body = [...tiff, ...ifd0, ...exif, ...data]
	const app1 = [...ascii('Exif'), 0, ...body]
	const len = app1.length + 2
	bytes.push(0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...app1, 0xff, 0xd9)
	return new Uint8Array(bytes).buffer
}

describe('exifDate', () => {
	it('reads DateTimeOriginal (little endian, like Canon)', () => {
		expect(exifDate(jpegWithExif({ original: '2025:06:25 11:11:30' }))).toBe('2025-06-25T11:11')
	})

	it('reads big endian files', () => {
		expect(exifDate(jpegWithExif({ original: '2024:04:18 20:07:00', little: false }))).toBe('2024-04-18T20:07')
	})

	it('falls back to DateTime of IFD0', () => {
		expect(exifDate(jpegWithExif({ modified: '2023:01:02 03:04:05' }))).toBe('2023-01-02T03:04')
	})

	it('returns null for files without EXIF or garbage', () => {
		expect(exifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer)).toBeNull()
		expect(exifDate(new Uint8Array([1, 2, 3]).buffer)).toBeNull()
		expect(exifDate(jpegWithExif({ original: '0000:00:00 00:00:00' }))).toBeNull()
	})
})
