import { describe, expect, it } from 'vitest'
import { renameSpotFiles, undoMoves } from '../src/rename.js'

/** A folder as a set of names; move() behaves like WebDAV MOVE with Overwrite: F. */
function folder(names, { broken = [] } = {}) {
	const files = new Set(names)
	const move = async (from, to) => {
		if (broken.includes(from) || !files.has(from)) {
			throw new Error(`cannot move ${from}`)
		}
		if (files.has(to)) {
			return false
		}
		files.delete(from)
		files.add(to)
		return true
	}
	return { files, move }
}

const spot = (name, ...files) => ({
	name,
	x: 0.5,
	y: 0.5,
	captures: files.map((file, i) => ({ file, date: `2023-07-24T1${i}:00`, yaw: 0 })),
})

describe('renameSpotFiles', () => {
	it('names the files after the spot and keeps the date prefix', async () => {
		const office = spot('Office 1', 'R0010101.jpg')
		const { files, move } = folder(['R0010101.jpg'])
		const { moves, failed } = await renameSpotFiles([office], new Set([office]), move)
		expect(office.captures[0].file).toBe('2023-07-24_1000_Office 1.jpg')
		expect([...files]).toEqual(['2023-07-24_1000_Office 1.jpg'])
		expect(moves).toHaveLength(1)
		expect(failed).toEqual([])
	})

	it('only touches the spots it is given', async () => {
		const a = spot('A', 'a.jpg')
		const b = spot('B', 'b.jpg')
		const { move } = folder(['a.jpg', 'b.jpg'])
		await renameSpotFiles([a, b], new Set([b]), move)
		expect(a.captures[0].file).toBe('a.jpg')
		expect(b.captures[0].file).toBe('2023-07-24_1000_B.jpg')
	})

	it('picks a free name when the wanted one is taken', async () => {
		const office = spot('Office 1', 'R1.jpg')
		const { move } = folder(['R1.jpg', '2023-07-24_1000_Office 1.jpg'])
		await renameSpotFiles([office], new Set([office]), move)
		expect(office.captures[0].file).toBe('2023-07-24_1000_Office 1 (2).jpg')
	})

	it('keeps the name of a file that cannot be moved and goes on with the rest', async () => {
		const office = spot('Office 1', 'locked.jpg', 'ok.jpg')
		const { move } = folder(['locked.jpg', 'ok.jpg'], { broken: ['locked.jpg'] })
		const { moves, failed } = await renameSpotFiles([office], new Set([office]), move)
		expect(failed).toEqual(['locked.jpg'])
		expect(office.captures.map(c => c.file)).toEqual(['locked.jpg', '2023-07-24_1100_Office 1.jpg'])
		expect(moves).toHaveLength(1)
	})
})

describe('undoMoves', () => {
	it('puts the files and the captures back', async () => {
		const office = spot('Office 1', 'R1.jpg', 'R2.jpg')
		const { files, move } = folder(['R1.jpg', 'R2.jpg'])
		const { moves } = await renameSpotFiles([office], new Set([office]), move)
		await undoMoves(moves, move)
		expect(office.captures.map(c => c.file)).toEqual(['R1.jpg', 'R2.jpg'])
		expect([...files].sort()).toEqual(['R1.jpg', 'R2.jpg'])
	})
})
