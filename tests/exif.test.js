import { describe, expect, it } from 'vitest'
import { exifDate, exifGps } from '../src/exif.js'
import { osmUrl } from '../src/tour.js'

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

// minimal JPEG: SOI, APP1 "Exif\0\0", big-endian TIFF, IFD0 with GPS pointer (0x8825),
// GPS IFD: N, 52/1 30/1 5.6/1 ; E, 13/1 21/1 48.5/1
function jpegWithGps() {
	const b = []
	const u16 = (v) => b.push((v >> 8) & 255, v & 255)
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
		expect(exifGps(jpegWithExif({ original: '2025:06:25 11:11:30' }))).toBeNull()
	})
})

describe('osmUrl', () => {
	it('centres the building at zoom 18', () => {
		expect(osmUrl({ lat: 52.50156, lon: 13.36347 }))
			.toBe('https://www.openstreetmap.org/?mlat=52.50156&mlon=13.36347#map=18/52.50156/13.36347')
	})
})
