// tests/markers.test.js
import { describe, expect, it } from 'vitest'
import { PHOTO_FOLDER, escapeHtml, fromTexture, isPlaced, markerCount, markerTitle, toTexture, unusedPhotos } from '../src/markers.js'

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
