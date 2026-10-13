import { describe, expect, it } from 'vitest'
import { clampSize } from '../src/composables/clamp.js'

describe('clampSize', () => {
	it('keeps a stored size inside its limits', () => {
		expect(clampSize(50, 120, 600, 260)).toBe(120)
		expect(clampSize(900, 120, 600, 260)).toBe(600)
		expect(clampSize(300, 120, 600, 260)).toBe(300)
	})
	it('falls back on garbage', () => {
		expect(clampSize('x', 120, 600, 260)).toBe(260)
		expect(clampSize(null, 120, 600, 260)).toBe(260)
	})
})
