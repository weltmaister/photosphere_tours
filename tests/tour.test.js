import { describe, expect, it } from 'vitest'
import {
	TourError,
	addCapture,
	addSpot,
	alignYaw,
	captureAt,
	captureDays,
	capturesNewestFirst,
	dateFromFilename,
	emptyTour,
	mapZoom,
	parseTour,
	rawYaw,
	relativePath,
	resolvePath,
	serializeTour,
	sphereCorrection,
	unplacedFiles,
} from '../src/tour.js'

const deg = (d) => d * Math.PI / 180

function sample() {
	return {
		version: 1,
		title: 'EG',
		plan: '../Grundrisse/EG.png',
		spots: [
			{
				name: 'Flur',
				x: 0.25,
				y: 0.5,
				captures: [
					{ file: '001_2024-08-14_1602_Flur.jpg', date: '2024-08-14T16:02', yaw: 90 },
					{ file: '_aeltere_Versionen/2025-09-24_1031_Flur.jpg', date: '2025-09-24T10:31' },
				],
			},
			{
				name: 'Raum 2',
				x: 0.75,
				y: 0.5,
				captures: [{ file: '018_2025-09-24_1031_Raum2.jpg', date: '2025-09-24T10:31' }],
			},
		],
	}
}

describe('parseTour', () => {
	it('accepts a valid tour and defaults yaw to 0', () => {
		const tour = parseTour(sample())
		expect(tour.spots).toHaveLength(2)
		expect(tour.spots[0].captures[1].yaw).toBe(0)
		expect(tour.spots[0].captures[0].yaw).toBe(90)
	})

	it('accepts a JSON string', () => {
		expect(parseTour(JSON.stringify(sample())).title).toBe('EG')
	})

	it('accepts an empty tour', () => {
		expect(parseTour({ version: 1, plan: 'plan.png', spots: [] }).spots).toEqual([])
	})

	it('reports every problem at once', () => {
		const data = sample()
		data.plan = ''
		data.spots[0].x = 1.5
		data.spots[1].captures = []
		try {
			parseTour(data)
			expect.unreachable()
		} catch (e) {
			expect(e).toBeInstanceOf(TourError)
			expect(e.problems).toHaveLength(3)
		}
	})

	it('rejects capture paths leaving the folder', () => {
		const data = sample()
		data.spots[0].captures[0].file = '../other/x.jpg'
		expect(() => parseTour(data)).toThrow(TourError)
		data.spots[0].captures[0].file = '/abs/x.jpg'
		expect(() => parseTour(data)).toThrow(TourError)
	})

	it('rejects malformed dates and unknown versions', () => {
		const data = sample()
		data.spots[0].captures[0].date = '14.08.2024'
		expect(() => parseTour(data)).toThrow(TourError)
		expect(() => parseTour({ ...sample(), version: 2 })).toThrow(TourError)
	})

	it('rejects invalid JSON with a TourError', () => {
		expect(() => parseTour('{nope')).toThrow(TourError)
	})
})

describe('resolvePath', () => {
	it('joins relative paths and resolves ..', () => {
		expect(resolvePath('/Projekt/360/EG', '../Grundrisse/EG.png')).toBe('/Projekt/360/Grundrisse/EG.png')
		expect(resolvePath('/Projekt/360/EG', 'a/./b.jpg')).toBe('/Projekt/360/EG/a/b.jpg')
		expect(resolvePath('/', 'x.jpg')).toBe('/x.jpg')
	})

	it('refuses to climb above the root', () => {
		expect(() => resolvePath('/a', '../../x.png')).toThrow(TourError)
	})
})

describe('relativePath', () => {
	it('points from the tour folder to the plan', () => {
		expect(relativePath('/Projekt/360/EG', '/Projekt/360/Grundrisse/EG.png')).toBe('../Grundrisse/EG.png')
		expect(relativePath('/Projekt/360/EG', '/Projekt/360/EG/plan.png')).toBe('plan.png')
		expect(relativePath('/', '/plan.png')).toBe('plan.png')
		expect(relativePath('/a/b', '/c/d.png')).toBe('../../c/d.png')
	})

	it('round-trips through resolvePath', () => {
		const dir = '/Projekt/360/2.HH, EG - Verkauf'
		const plan = '/Projekt/Pläne/EG.png'
		expect(resolvePath(dir, relativePath(dir, plan))).toBe(plan)
	})
})

describe('timeline', () => {
	const tour = parseTour(sample())

	it('lists distinct capture days in order', () => {
		expect(captureDays(tour)).toEqual(['2024-08-14', '2025-09-24'])
	})

	it('picks the newest capture up to the selected day', () => {
		const flur = tour.spots[0]
		expect(captureAt(flur, null).date).toBe('2025-09-24T10:31')
		expect(captureAt(flur, '2025-09-24').date).toBe('2025-09-24T10:31')
		expect(captureAt(flur, '2024-12-31').date).toBe('2024-08-14T16:02')
	})

	it('returns null when a spot did not exist yet', () => {
		expect(captureAt(tour.spots[1], '2024-08-14')).toBeNull()
	})

	it('sorts captures newest first without mutating the spot', () => {
		const flur = tour.spots[0]
		const sorted = capturesNewestFirst(flur)
		expect(sorted.map(c => c.date)).toEqual(['2025-09-24T10:31', '2024-08-14T16:02'])
		expect(flur.captures[0].date).toBe('2024-08-14T16:02')
	})
})

describe('orientation', () => {
	// Photo Sphere Viewer rotates the sphere about its vertical axis by `pan`:
	// the raw panorama direction r then shows at view yaw r - pan
	// (Renderer.setSphereCorrection, DataHelper.sphericalCoordsToVector3).
	const psvViewYaw = (raw, correction) => raw - correction.pan
	const normRad = (r) => ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

	it('turns the panorama so that plan-up is at view yaw 0', () => {
		expect(normRad(psvViewYaw(deg(90), sphereCorrection({ yaw: 90 })))).toBeCloseTo(0)
		expect(normRad(psvViewYaw(deg(250), sphereCorrection({ yaw: 250 })))).toBeCloseTo(0)
		expect(sphereCorrection({ yaw: 0 }).pan).toBeCloseTo(0)
	})

	it('maps a view yaw back to the raw panorama yaw', () => {
		// view yaw 0 shows raw yaw 90
		expect(rawYaw({ yaw: 90 }, 0)).toBeCloseTo(90)
		expect(rawYaw({ yaw: 90 }, deg(300))).toBeCloseTo(30)
		// and it is the inverse of what PSV does
		const view = psvViewYaw(deg(123), sphereCorrection({ yaw: 40 }))
		expect(rawYaw({ yaw: 40 }, view)).toBeCloseTo(123)
	})

	it('aligns from a plan point the user is looking at', () => {
		const planSize = { w: 1000, h: 500 }
		const spot = { x: 0.5, y: 0.5 }
		// target is straight to the right on the plan -> bearing 90°
		const right = { x: 0.7, y: 0.5 }
		// uncorrected capture, user looks at raw yaw 30° and sees that target
		expect(alignYaw({ yaw: 0 }, deg(30), spot, right, planSize)).toBeCloseTo(300)
		// afterwards, raw 30° must display at view yaw 90° (the bearing)
		const yaw = alignYaw({ yaw: 0 }, deg(30), spot, right, planSize)
		const viewYaw = psvViewYaw(deg(30), sphereCorrection({ yaw }))
		expect(normRad(viewYaw)).toBeCloseTo(deg(90))
	})

	it('respects the plan aspect ratio when computing the bearing', () => {
		// 0.1 right and 0.1 up on a 2:1 plan is not 45°
		const yaw = alignYaw({ yaw: 0 }, 0, { x: 0.5, y: 0.5 }, { x: 0.6, y: 0.4 }, { w: 2000, h: 1000 })
		const bearing = Math.atan2(200, 100) * 180 / Math.PI
		expect(yaw).toBeCloseTo((360 - bearing) % 360)
	})
})

describe('mapZoom', () => {
	it('lets the whole plan fit and starts on about a third of it', () => {
		// 8000 px plan in a 280 px map: the whole plan is 3.5 %
		const zoom = mapZoom({ w: 5656, h: 7999 }, 280)
		expect(zoom.min).toBeCloseTo(280 / 7999 * 100 * 0.8)
		expect(zoom.initial).toBeCloseTo(280 / 7999 * 100 * 3)
		expect(zoom.max).toBe(200)
	})

	it('never starts beyond 1:1 for small plans', () => {
		const zoom = mapZoom({ w: 400, h: 300 }, 280)
		expect(zoom.initial).toBe(100)
		expect(zoom.min).toBeLessThan(zoom.initial)
	})
})

describe('dateFromFilename', () => {
	it('reads the HoloBuilder backup patterns', () => {
		expect(dateFromFilename('001_2024-07-02_1213_Whg 7 - Flur 1.jpg')).toBe('2024-07-02T12:13')
		expect(dateFromFilename('2025-03-05_0228_Raum1 - Mitte2.jpg')).toBe('2025-03-05T02:28')
		expect(dateFromFilename('2024-10-15_101148_Flur - 2_01.jpg')).toBe('2024-10-15T10:11')
	})

	it('reads common camera names', () => {
		expect(dateFromFilename('IMG_20260930_143012_00_012.jpg')).toBe('2026-09-30T14:30')
		expect(dateFromFilename('R0010042.JPG')).toBeNull()
	})
})

describe('editing', () => {
	it('lists folder images that are not in the tour', () => {
		const tour = parseTour(sample())
		const names = [
			'001_2024-08-14_1602_Flur.jpg',
			'018_2025-09-24_1031_Raum2.jpg',
			'019_2026-10-01_0900_Neu.jpg',
			'360-Rundgang.json',
			'_aeltere_Versionen/2025-09-24_1031_Flur.jpg',
			'_aeltere_Versionen/2024-01-01_0800_Alt.JPG',
		]
		expect(unplacedFiles(tour, names)).toEqual([
			'019_2026-10-01_0900_Neu.jpg',
			'_aeltere_Versionen/2024-01-01_0800_Alt.JPG',
		])
	})

	it('adds spots and captures and keeps the file valid', () => {
		const tour = emptyTour('EG', '../Grundrisse/EG.png')
		const spot = addSpot(tour, { x: 0.1, y: 0.2, file: '019_2026-10-01_0900_Neu.jpg' })
		expect(spot.name).toBe('Neu')
		expect(spot.captures[0].date).toBe('2026-10-01T09:00')
		addCapture(spot, { file: 'R0010042.JPG', fallbackDate: '2026-10-02T08:00' })
		expect(spot.captures[1].date).toBe('2026-10-02T08:00')
		expect(parseTour(serializeTour(tour)).spots[0].captures).toHaveLength(2)
	})
})
