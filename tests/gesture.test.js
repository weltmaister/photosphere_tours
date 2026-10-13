// The pointer helpers of the floor plan and the panorama markers (src/gesture.js)
import { describe, expect, it } from 'vitest'
import { CLICK_TOLERANCE, clampToBox, movedBeyond } from '../src/gesture.js'

describe('movedBeyond', () => {
	const start = { x: 100, y: 100 }
	it('keeps a press within the tolerance a click', () => {
		expect(CLICK_TOLERANCE).toBe(5)
		expect(movedBeyond(start, { x: 100, y: 100 })).toBe(false)
		expect(movedBeyond(start, { x: 105, y: 100 })).toBe(false)
		expect(movedBeyond(start, { x: 103, y: 104 })).toBe(false) // exactly 5 px
	})
	it('makes a press a drag once it moved further, in any direction', () => {
		expect(movedBeyond(start, { x: 106, y: 100 })).toBe(true)
		expect(movedBeyond(start, { x: 100, y: 94 })).toBe(true)
		expect(movedBeyond(start, { x: 96, y: 96 })).toBe(true)
	})
	it('takes another tolerance', () => {
		expect(movedBeyond(start, { x: 110, y: 100 }, 20)).toBe(false)
		expect(movedBeyond(start, { x: 121, y: 100 }, 20)).toBe(true)
	})
})

describe('clampToBox', () => {
	const box = { width: 800, height: 600 }
	it('keeps a point inside as it is', () => {
		expect(clampToBox({ x: 10, y: 599 }, box)).toEqual({ x: 10, y: 599 })
	})
	it('pulls a point outside back to the nearest edge', () => {
		expect(clampToBox({ x: -20, y: 700 }, box)).toEqual({ x: 0, y: 600 })
		expect(clampToBox({ x: 900, y: -1 }, box)).toEqual({ x: 800, y: 0 })
	})
})
