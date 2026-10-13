// tests/markers.test.js
import { describe, expect, it } from 'vitest'
import { PHOTO_FOLDER, escapeHtml, fromTexture, isPlaced, markerCount, markerTitle, toTexture, unusedPhotos, withoutEmptyMarkers } from '../src/markers.js'
import { serializeTour } from '../src/tour.js'

const size = { width: 8000, height: 4000 }

describe('texture coordinates', () => {
	it('puts raw yaw 0 / pitch 0 in the image centre', () => {
		expect(toTexture({ yaw: 0, pitch: 0 }, size)).toEqual({ textureX: 4000, textureY: 2000 })
	})
	it('goes right for positive yaw and up for positive pitch', () => {
		expect(toTexture({ yaw: 90, pitch: 45 }, size)).toEqual({ textureX: 6000, textureY: 1000 })
		expect(toTexture({ yaw: 270, pitch: -90 }, size)).toEqual({ textureX: 2000, textureY: 4000 })
	})
	it('round-trips', () => {
		for (const p of [{ yaw: 12.5, pitch: -3.5 }, { yaw: 359.9, pitch: 80 }, { yaw: 180, pitch: 0 }]) {
			expect(fromTexture(toTexture(p, size), size)).toEqual(p)
		}
	})
})

describe('marker helpers', () => {
	it('titles a marker by its first text line, else by its photo', () => {
		expect(markerTitle({ text: '\nWater damage\nmore' })).toBe('Water damage')
		expect(markerTitle({ file: `${PHOTO_FOLDER}/IMG_1.jpg` })).toBe('IMG_1.jpg')
	})
	it('knows placed markers and counts them per spot', () => {
		expect(isPlaced({ yaw: 1, pitch: 2, text: 'x' })).toBe(true)
		expect(isPlaced({ file: 'a.jpg' })).toBe(false)
		expect(markerCount({ captures: [{ markers: [{ text: 'a' }] }, {}, { markers: [{ text: 'b' }, { text: 'c' }] }] })).toBe(3)
	})
	it('lists photos of the photo folder no marker uses', () => {
		const tour = { spots: [{ captures: [{ markers: [{ file: '2D-Bilder/a.jpg' }] }] }] }
		expect(unusedPhotos(tour, ['2D-Bilder/a.jpg', '2D-Bilder/b.JPG', '2D-Bilder/n.txt', 'pano.jpg', '2D-Bilder/sub/c.jpg']))
			.toEqual(['2D-Bilder/b.JPG'])
	})
})

describe('withoutEmptyMarkers', () => {
	const tourWith = (markers, extra = {}) => ({
		version: 1,
		title: 'EG',
		plan: 'plan.png',
		spots: [{ name: 'A', x: 0.1, y: 0.2, captures: [{ file: 'a.jpg', date: '2024-08-14T16:02', yaw: 0, ...(markers ? { markers } : {}), ...extra }] }],
	})
	const markersOfFirst = (tour) => tour.spots[0].captures[0].markers

	it('drops markers with neither text nor photo, keeps the others in order', () => {
		const tour = tourWith([
			{ yaw: 1, pitch: 2, text: '' },
			{ yaw: 3, pitch: 4, text: 'Crack' },
			{ text: '  \n ' },
			{ file: '2D-Bilder/a.jpg' },
			{ yaw: 5, pitch: 6, text: '', file: '2D-Bilder/b.jpg' },
		])
		expect(markersOfFirst(withoutEmptyMarkers(tour))).toEqual([
			{ yaw: 3, pitch: 4, text: 'Crack' },
			{ file: '2D-Bilder/a.jpg' },
			{ yaw: 5, pitch: 6, text: '', file: '2D-Bilder/b.jpg' },
		])
	})

	it('removes the key when nothing is left', () => {
		const saved = withoutEmptyMarkers(tourWith([{ yaw: 1, pitch: 2, text: '' }]))
		expect('markers' in saved.spots[0].captures[0]).toBe(false)
		expect('markers' in withoutEmptyMarkers(tourWith([])).spots[0].captures[0]).toBe(false)
	})

	it('does not change the tour it is given', () => {
		const tour = tourWith([{ yaw: 1, pitch: 2, text: '' }, { text: 'x' }])
		withoutEmptyMarkers(tour)
		expect(markersOfFirst(tour)).toEqual([{ yaw: 1, pitch: 2, text: '' }, { text: 'x' }])
	})

	it('leaves everything else as it is', () => {
		const tour = { ...tourWith(null), location: { lat: 52.5, lon: 13.4 } }
		expect(withoutEmptyMarkers(tour)).toEqual(tour)
	})

	it('can be saved although the editor holds an empty marker; unchanged tours serialise as before', () => {
		const empty = tourWith([{ yaw: 1, pitch: 2, text: '' }])
		expect(() => serializeTour(empty)).toThrow(/text or a photo/)
		expect(serializeTour(withoutEmptyMarkers(empty))).toBe(serializeTour(tourWith(null)))
		const plain = tourWith(null)
		expect(serializeTour(withoutEmptyMarkers(plain))).toBe(serializeTour(plain))
	})
})

describe('escapeHtml', () => {
	it('escapes all five special characters', () => {
		expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
	})
	it('neutralises markup', () => {
		expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
	})
	it('escapes the ampersand only once', () => {
		expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;')
	})
	it('leaves plain text unchanged', () => {
		expect(escapeHtml('Küche, Wand 3 – links')).toBe('Küche, Wand 3 – links')
		expect(escapeHtml('')).toBe('')
	})
})
