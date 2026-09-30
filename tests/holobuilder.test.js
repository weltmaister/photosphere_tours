import { describe, expect, it } from 'vitest'
import { buildFloorTour, headingFromRotation, parseIndexCsv, rotationsFromSlideNodes } from '../tools/holobuilder.js'
import { parseTour } from '../src/tour.js'

// shortened and anonymised from a real backup
const CSV = String.fromCharCode(0xFEFF) + 'Geschoss;Szene;sId;Aufnahmezeit;Plan-X;Plan-Y;Gerät;360-URL\n'
	+ 'Hof;Strasse 1;101;2024-08-14 16:01;0.32203716;0.18296391;(cpu=amd64, os=Windows (10);https://example.invalid/a\n'
	+ 'Hof;Hinterhof1 - 1;102;2024-08-14 16:01;0.35693976;0.2599204;(cpu=amd64, os=Windows (10);https://example.invalid/b\n'
	+ 'Keller;Technikraum - 1;201;2024-11-05 16:39;0.28594023;0.26149684;(cpu=amd64;https://example.invalid/c\n'

describe('parseIndexCsv', () => {
	it('reads the columns by name and ignores the BOM', () => {
		const rows = parseIndexCsv(CSV)
		expect(rows).toHaveLength(3)
		expect(rows[0]).toEqual({ sheet: 'Hof', scene: 'Strasse 1', sId: '101', time: '2024-08-14 16:01', x: 0.32203716, y: 0.18296391 })
	})

	it('fails loudly when a column is missing', () => {
		expect(() => parseIndexCsv('Geschoss;Szene\nA;B')).toThrow(/sId/)
	})
})

describe('headingFromRotation', () => {
	it('treats the HoloBuilder default as not aligned', () => {
		expect(headingFromRotation({ x: 3.1415925, y: 1e-7, z: 3.1415925 })).toBeNull()
		expect(headingFromRotation({ x: 0, y: 0, z: 0 })).toBeNull()
		expect(headingFromRotation(undefined)).toBeNull()
	})

	it('measures a turn around the vertical axis relative to the default', () => {
		// (0, y, 0) points at heading y; the default points at 180°
		expect(headingFromRotation({ x: 0, y: -0.55, z: 0 })).toBeCloseTo(-0.55 * 180 / Math.PI - 180 + 360, 1)
		expect(headingFromRotation({ x: 0, y: Math.PI / 2, z: 0 })).toBeCloseTo(270)
	})
})

describe('buildFloorTour', () => {
	const rows = parseIndexCsv(CSV).filter(r => r.sheet === 'Hof')
	const build = (extra = {}) => buildFloorTour({
		sheet: 'Hof',
		rows,
		files: ['001_2024-08-14_1601_Strasse 1.jpg', '002_2024-08-14_1601_Hinterhof1 - 1.jpg', '003_2026-10-01_0900_Neu.jpg'],
		olderFiles: ['2024-08-14_1610_Strasse 1.jpg', '2024-08-14_1610_Unbekannt.jpg'],
		rotations: rotationsFromSlideNodes({
			slideNodes: [
				{ sId: 102, markerV3: { rotation: { x: 0, y: Math.PI / 2, z: 0 } } },
				{
					sId: 101,
					markerV3: { rotation: { x: Math.PI, y: 0, z: Math.PI } },
					// 2024-08-14 16:10 Berlin time
					slideNodes: [{ timeStamp: Date.UTC(2024, 7, 14, 14, 10), markerV3: { rotation: { x: 0, y: -Math.PI / 2, z: 0 } } }],
				},
			],
		}),
		plan: '../Grundrisse/Hof.png',
		...extra,
	})

	it('creates one valid spot per csv row with its current capture', () => {
		const { tour, report } = build()
		expect(() => parseTour(tour)).not.toThrow()
		expect(tour.spots.map(s => s.name)).toEqual(['Strasse 1', 'Hinterhof1 - 1'])
		expect(tour.spots[0]).toMatchObject({ x: 0.32203716, y: 0.18296391 })
		expect(tour.spots[0].captures[0]).toEqual({ file: '001_2024-08-14_1601_Strasse 1.jpg', date: '2024-08-14T16:01', yaw: 0 })
		expect(tour.spots[1].captures[0].yaw).toBeCloseTo(270)
	})

	it('attaches later captures by scene name with their own orientation', () => {
		const { tour, report } = build()
		expect(tour.spots[0].captures[1].file).toBe('_aeltere_Versionen/2024-08-14_1610_Strasse 1.jpg')
		expect(tour.spots[0].captures[1].date).toBe('2024-08-14T16:10')
		expect(tour.spots[0].captures[1].yaw).toBeCloseTo(90)
		expect(report.aligned).toBe(2)
		expect(report.unmatchedOlder).toEqual(['2024-08-14_1610_Unbekannt.jpg'])
		expect(report.olderOlderThanCurrent).toEqual([])
		expect(report.unplaced).toEqual(['003_2026-10-01_0900_Neu.jpg'])
	})

	it('matches scene names regardless of repeated spaces', () => {
		const { tour, report } = build({ files: ['001_2024-08-14_1601_Strasse 1.jpg', '002_2024-08-14_1601_Hinterhof1 -  1.jpg'] })
		expect(report.missingFiles).toEqual([])
		expect(tour.spots[1].captures[0].file).toBe('002_2024-08-14_1601_Hinterhof1 -  1.jpg')
	})

	it('uses the slide history when a scene name appears twice', () => {
		const csv = 'Geschoss;Szene;sId;Aufnahmezeit;Plan-X;Plan-Y\n'
			+ 'Hof;Flur01;1;2024-08-14 16:01;0.1;0.1\n'
			+ 'Hof;Flur01;2;2024-08-14 16:05;0.9;0.9\n'
		const { tour, report } = buildFloorTour({
			sheet: 'Hof',
			rows: parseIndexCsv(csv),
			files: ['001_2024-08-14_1601_Flur01.jpg', '002_2024-08-14_1605_Flur01.jpg'],
			olderFiles: ['2025-11-27_1420_Flur01.jpg'],
			rotations: rotationsFromSlideNodes({ slideNodes: [
				{ sId: 1 },
				{ sId: 2, slideNodes: [{ timeStamp: Date.UTC(2025, 10, 27, 13, 20) }] },
			] }),
			plan: 'p.png',
		})
		expect(report.ambiguousOlder).toEqual([])
		expect(tour.spots[1].captures).toHaveLength(2)
		expect(tour.spots[0].captures).toHaveLength(1)
	})

	it('reports csv rows without an image', () => {
		const { report } = build({ files: ['001_2024-08-14_1601_Strasse 1.jpg'] })
		expect(report.missingFiles).toEqual(['Hinterhof1 - 1 (2024-08-14 16:01)'])
	})
})
