// t() and n() (src/l10n.js): placeholders with user text come back unchanged.
// Outside a browser DOMPurify does nothing, so the options handed to
// @nextcloud/l10n are checked as well: in the browser `sanitize` would turn
// "&" into "&amp;" and drop "<…>".
import { describe, expect, it, vi } from 'vitest'

vi.mock('@nextcloud/l10n', async (importOriginal) => {
	const real = await importOriginal()
	return { ...real, t: vi.fn(real.t), n: vi.fn(real.n) }
})

const l10n = await import('@nextcloud/l10n')
const { n, t } = await import('../src/l10n.js')

const name = 'Bad & WC <Nord>'

describe('t()', () => {
	it('returns placeholders with "&" and "<" unchanged', () => {
		expect(t('Rename {name}', { name })).toBe(`Rename ${name}`)
	})

	it('neither escapes nor sanitizes', () => {
		t('Rename {name}', { name })
		expect(l10n.t).toHaveBeenLastCalledWith(expect.any(String), 'Rename {name}', { name }, undefined, { escape: false, sanitize: false })
	})
})

describe('n()', () => {
	it('returns placeholders with "&" and "<" unchanged', () => {
		expect(n('{count} spot in {name}', '{count} spots in {name}', 2, { name })).toBe(`2 spots in ${name}`)
	})

	it('neither escapes nor sanitizes', () => {
		n('{count} spot', '{count} spots', 1)
		expect(l10n.n).toHaveBeenLastCalledWith(expect.any(String), '{count} spot', '{count} spots', 1, { count: 1 }, { escape: false, sanitize: false })
	})
})
