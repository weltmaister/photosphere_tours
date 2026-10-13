import { describe, expect, it } from 'vitest'
import { byCaptureTime, captureSource, withCaptureTimes } from '../src/captureTimes.js'

const mtime = new Date(2023, 6, 24, 13, 17)

describe('captureSource', () => {
	it('prefers EXIF, then the date in the file name, then the file time', () => {
		expect(captureSource({ exif: '2023-07-01T09:00', file: '2023-08-02_1015_a.jpg', mtime }))
			.toEqual({ date: '2023-07-01T09:00', estimated: false })
		expect(captureSource({ file: '2023-08-02_1015_a.jpg', mtime }))
			.toEqual({ date: '2023-08-02T10:15', estimated: false })
		expect(captureSource({ file: 'IMG_0001.jpg', mtime }))
			.toEqual({ date: '2023-07-24T13:17', estimated: true })
	})

	it('has no date and is not estimated without any source', () => {
		expect(captureSource({ file: 'IMG_0001.jpg' })).toEqual({ date: null, estimated: false })
	})
})

describe('byCaptureTime', () => {
	it('sorts oldest first, files without a date last', () => {
		const list = [
			{ path: 'c.jpg', date: null },
			{ path: 'b.jpg', date: '2023-07-24T14:00' },
			{ path: 'a.jpg', date: '2023-07-24T13:17' },
		]
		expect(list.sort(byCaptureTime).map(i => i.path)).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
	})

	it('breaks ties by file name, numbers by value', () => {
		const list = [
			{ path: 'IMG_10.jpg', date: '2023-07-24T13:17' },
			{ path: 'IMG_2.jpg', date: '2023-07-24T13:17' },
		]
		expect(list.sort(byCaptureTime).map(i => i.path)).toEqual(['IMG_2.jpg', 'IMG_10.jpg'])
	})
})

describe('withCaptureTimes', () => {
	it('adds date and estimated, keeps the other fields and sorts', () => {
		const exif = { 'b.jpg': '2020-01-01T08:00' }
		const items = [
			{ path: 'a.jpg', fileid: '1', mtime },
			{ path: 'b.jpg', fileid: '2', mtime },
			{ path: 'c_2019-05-05_1200.jpg', fileid: '3', mtime },
		]
		expect(withCaptureTimes(items, p => exif[p])).toEqual([
			{ path: 'c_2019-05-05_1200.jpg', fileid: '3', mtime, date: '2019-05-05T12:00', estimated: false },
			{ path: 'b.jpg', fileid: '2', mtime, date: '2020-01-01T08:00', estimated: false },
			{ path: 'a.jpg', fileid: '1', mtime, date: '2023-07-24T13:17', estimated: true },
		])
	})

	it('re-sorts when an EXIF date turns up', () => {
		const items = [
			{ path: 'a.jpg', mtime: new Date(2023, 0, 1, 10, 0) },
			{ path: 'b.jpg', mtime: new Date(2023, 0, 2, 10, 0) },
		]
		expect(withCaptureTimes(items, () => null).map(i => i.path)).toEqual(['a.jpg', 'b.jpg'])
		expect(withCaptureTimes(items, p => p === 'a.jpg' ? '2024-01-01T00:00' : null).map(i => i.path)).toEqual(['b.jpg', 'a.jpg'])
	})
})
