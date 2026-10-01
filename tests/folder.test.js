import { describe, expect, it } from 'vitest'
import { classifyFolder, newerPlan, pngNameFor } from '../src/folder.js'

const d = (s) => new Date(s)

// shaped like dav.js listFolder() entries; panorama: true / false / null (unknown)
const ENTRIES = [
	{ name: 'IMG_9279-HDR Panorama.jpg', isFolder: false, mtime: d('2025-06-25'), panorama: true },
	{ name: 'IMG_9291-HDR Panorama.jpg', isFolder: false, mtime: d('2025-06-25'), panorama: true },
	{ name: 'Foto Fassade.jpg', isFolder: false, mtime: d('2025-06-25'), panorama: false },
	{ name: 'Grundriss EG 1_100.pdf', isFolder: false, mtime: d('2026-09-30'), panorama: null },
	{ name: 'notes.txt', isFolder: false, mtime: d('2026-09-30'), panorama: null },
	{ name: 'komprimiert', isFolder: true, mtime: d('2026-03-18'), panorama: null },
]

describe('classifyFolder', () => {
	it('finds panoramas and floor plan candidates in the folder itself', () => {
		const c = classifyFolder(ENTRIES)
		expect(c.hasTour).toBe(false)
		expect(c.panoramas).toEqual(['IMG_9279-HDR Panorama.jpg', 'IMG_9291-HDR Panorama.jpg'])
		expect(c.offer).toBe(2)
		expect(c.plans).toEqual(['Grundriss EG 1_100.pdf'])
	})

	it('treats JPGs as panoramas when the panorama flag is unknown, but not as plans', () => {
		const c = classifyFolder([
			{ name: 'a.jpg', isFolder: false, panorama: null },
			{ name: 'Grundriss.png', isFolder: false, panorama: null },
		])
		expect(c.panoramas).toEqual(['a.jpg'])
		expect(c.plans).toEqual(['Grundriss.png'])
	})

	it('proposes a walkthrough without files_photospheres only for several JPEGs next to a plan', () => {
		const jpeg = (name) => ({ name, isFolder: false })
		expect(classifyFolder([jpeg('a.jpg'), jpeg('b.jpg'), jpeg('Plan.pdf')]).offer).toBe(2)
		expect(classifyFolder([jpeg('a.jpg'), jpeg('b.jpg')]).offer).toBe(0)
		expect(classifyFolder([jpeg('a.jpg'), jpeg('Plan.pdf')]).offer).toBe(0)
		// files_photospheres knows these are ordinary photos
		expect(classifyFolder([{ name: 'a.jpg', isFolder: false, panorama: false }, jpeg('Plan.pdf')]).offer).toBe(0)
	})

	it('offers a converted PNG instead of its PDF', () => {
		const c = classifyFolder([
			{ name: 'Plan EG.pdf', isFolder: false, panorama: null },
			{ name: 'Plan EG.png', isFolder: false, panorama: null },
		])
		expect(c.plans).toEqual(['Plan EG.png'])
	})

	it('takes a JPG as plan only when its name says so', () => {
		const c = classifyFolder([
			{ name: 'Grundriss EG.jpg', isFolder: false, panorama: false },
			{ name: 'Fassade.jpg', isFolder: false, panorama: false },
		])
		expect(c.plans).toEqual(['Grundriss EG.jpg'])
		expect(c.panoramas).toEqual([])
	})

	it('recognises an existing walkthrough', () => {
		expect(classifyFolder([{ name: '360-Rundgang.json', isFolder: false }]).hasTour).toBe(true)
	})
})

describe('pngNameFor', () => {
	it('keeps the name and swaps the extension', () => {
		expect(pngNameFor('Grundriss EG 1_100.pdf')).toBe('Grundriss EG 1_100.png')
		expect(pngNameFor('plan.PDF')).toBe('plan.png')
	})
})

describe('newerPlan', () => {
	const entries = [
		{ name: 'Grundriss.png', isFolder: false, mtime: d('2025-01-01'), panorama: null },
		{ name: 'Grundriss neu.pdf', isFolder: false, mtime: d('2026-09-30'), panorama: null },
		{ name: 'alt.png', isFolder: false, mtime: d('2024-01-01'), panorama: null },
	]

	it('finds a plan newer than the current one', () => {
		expect(newerPlan(entries, 'Grundriss.png')).toBe('Grundriss neu.pdf')
	})

	it('offers the source PDF again when it was updated after the conversion', () => {
		const list = [
			{ name: 'EG.pdf', isFolder: false, mtime: d('2026-10-02T09:00'), panorama: null },
			{ name: 'EG.png', isFolder: false, mtime: d('2026-09-30T10:01'), panorama: null },
		]
		expect(newerPlan(list, 'EG.png')).toBe('EG.pdf')
	})

	it('ignores the PDF the current PNG was made from', () => {
		const list = [
			{ name: 'EG.pdf', isFolder: false, mtime: d('2026-09-30T10:00'), panorama: null },
			{ name: 'EG.png', isFolder: false, mtime: d('2026-09-30T10:01'), panorama: null },
		]
		expect(newerPlan(list, 'EG.png')).toBeNull()
	})

	it('returns null when the current plan lives elsewhere and nothing is newer', () => {
		expect(newerPlan(entries.slice(2), '../Grundrisse/EG.png')).toBeNull()
	})
})
