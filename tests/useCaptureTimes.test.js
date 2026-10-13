import { describe, expect, it, vi } from 'vitest'

const { useCaptureTimes } = await import('../src/composables/useCaptureTimes.js')

/** a reader whose calls stay open until the test lets them finish */
function manualReader() {
	const open = []
	const read = vi.fn((path) => new Promise((resolve, reject) => { open.push({ path, resolve, reject }) }))
	return { read, open }
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const paths = (count) => Array.from({ length: count }, (_, i) => `img${i}.jpg`)

describe('useCaptureTimes', () => {
	it('never has more than 4 reads open and starts the next as one finishes', async () => {
		let active = 0
		let most = 0
		const read = vi.fn(async () => {
			active++
			most = Math.max(most, active)
			await new Promise(resolve => setTimeout(resolve, 1))
			active--
			return null
		})
		const { load, exifOf } = useCaptureTimes({ read })
		load(paths(12))
		expect(read).toHaveBeenCalledTimes(4)
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(read).toHaveBeenCalledTimes(12)
		expect(most).toBe(4)
		expect(active).toBe(0)
		expect(exifOf('img11.jpg')).toBeNull()
	})

	it('starts the next read when one finishes', async () => {
		const { read, open } = manualReader()
		useCaptureTimes({ read }).load(paths(6))
		await flush()
		expect(read).toHaveBeenCalledTimes(4)
		open[0].resolve(null)
		await flush()
		expect(read).toHaveBeenCalledTimes(5)
	})

	it('reads each file once and keeps the result', async () => {
		const read = vi.fn(async (path) => path === 'a.jpg' ? '2024-01-01T10:00' : null)
		const { load, exifOf } = useCaptureTimes({ read })
		expect(exifOf('a.jpg')).toBeNull()
		load(['a.jpg', 'b.jpg', 'a.jpg'])
		await flush()
		expect(exifOf('a.jpg')).toBe('2024-01-01T10:00')
		expect(exifOf('b.jpg')).toBeNull()
		load(['a.jpg', 'b.jpg', 'c.jpg'])
		await flush()
		expect(read.mock.calls.map(c => c[0])).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
	})

	it('does not read a file twice while its read is still open', async () => {
		const { read, open } = manualReader()
		const { load, exifOf } = useCaptureTimes({ read })
		load(['a.jpg'])
		load(['a.jpg'])
		await flush()
		expect(read).toHaveBeenCalledTimes(1)
		open[0].resolve('2024-01-01T10:00')
		await flush()
		expect(exifOf('a.jpg')).toBe('2024-01-01T10:00')
	})

	it('treats a failed read as no EXIF date and goes on', async () => {
		const read = vi.fn(async (path) => {
			if (path === 'a.jpg') {
				throw new Error('416')
			}
			return '2024-01-01T10:00'
		})
		const { load, exifOf } = useCaptureTimes({ read })
		load(['a.jpg', 'b.jpg'])
		await flush()
		expect(exifOf('a.jpg')).toBeNull()
		expect(exifOf('b.jpg')).toBe('2024-01-01T10:00')
		load(['a.jpg'])
		await flush()
		expect(read).toHaveBeenCalledTimes(2)
	})

	it('drops waiting files that left the list', async () => {
		const { read, open } = manualReader()
		const { load } = useCaptureTimes({ read })
		load(paths(6))
		await flush()
		load(['img5.jpg', 'new.jpg'])
		open.splice(0).forEach(o => o.resolve(null))
		await flush()
		expect(read.mock.calls.map(c => c[0])).toEqual(['img0.jpg', 'img1.jpg', 'img2.jpg', 'img3.jpg', 'img5.jpg', 'new.jpg'])
	})

	it('can use another limit', async () => {
		const { read } = manualReader()
		useCaptureTimes({ read, limit: 2 }).load(paths(5))
		await flush()
		expect(read).toHaveBeenCalledTimes(2)
	})
})
