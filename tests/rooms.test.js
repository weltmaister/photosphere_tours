import { describe, expect, it } from 'vitest'
import { roomLabels, suggestName } from '../src/rooms.js'

// shaped like pdf.js text items after normalising to 0–1 (y downwards);
// a room stamp is a name with "A: … m²" right below it
const ITEMS = [
	{ str: 'Verkauf', x: 0.213, y: 0.552 },
	{ str: 'A: 39,0 m', x: 0.213, y: 0.560 },
	{ str: '2', x: 0.243, y: 0.558 },
	{ str: 'h: 3,48 m', x: 0.213, y: 0.567 },
	{ str: 'Lager', x: 0.208, y: 0.335 },
	{ str: 'A: 22,7 m', x: 0.208, y: 0.342 },
	{ str: 'Produktion', x: 0.215, y: 0.166 },
	{ str: 'A:', x: 0.215, y: 0.173 },
	{ str: '12,6 m', x: 0.235, y: 0.173 },
	{ str: 'Flur', x: 0.136, y: 0.175 },
	{ str: 'A: 4,9 m', x: 0.136, y: 0.183 },
	// title block and notes: no area below, so no room
	{ str: 'Grundriss 100', x: 0.913, y: 0.981 },
	{ str: 'Bauvorhaben', x: 0.036, y: 0.919 },
	{ str: 'Maßstab:', x: 0.741, y: 0.940 },
]

describe('roomLabels', () => {
	it('finds room names from their stamps', () => {
		expect(roomLabels(ITEMS).map(r => r.name)).toEqual(['Verkauf', 'Lager', 'Produktion', 'Flur'])
	})

	it('falls back to plain words when a plan has no area stamps', () => {
		const labels = roomLabels([
			{ str: 'Küche', x: 0.2, y: 0.2 },
			{ str: '3,48', x: 0.3, y: 0.3 },
			{ str: 'A:', x: 0.4, y: 0.4 },
		])
		expect(labels.map(r => r.name)).toEqual(['Küche'])
	})
})

describe('suggestName', () => {
	const labels = roomLabels(ITEMS)
	const size = { w: 595, h: 842 }

	it('takes the nearest room', () => {
		expect(suggestName(labels, { x: 0.22, y: 0.5 }, size)).toBe('Verkauf')
		expect(suggestName(labels, { x: 0.14, y: 0.2 }, size)).toBe('Flur')
	})

	it('suggests nothing far away from any room', () => {
		expect(suggestName(labels, { x: 0.9, y: 0.6 }, size)).toBeNull()
	})
})
