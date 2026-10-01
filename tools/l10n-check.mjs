#!/usr/bin/env node
/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Lists every translatable string in src/ and reports the ones missing from
 * (or no longer used in) l10n/de_DE.json. Exit code 1 if something is missing.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const files = []
const walk = (dir) => {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(path)
		} else if (/\.(js|vue)$/.test(entry.name)) {
			files.push(path)
		}
	}
}
walk('src')

// t('…') and plurals n('…', '…', count) from src/l10n.js; Nextcloud keeps a
// plural under the key "_singular_::_plural_"
const single = /\bt\((['"])((?:\\.|(?!\1).)*)\1/g
const plural = /\bn\((['"])((?:\\.|(?!\1).)*)\1,\s*(['"])((?:\\.|(?!\3).)*)\3/g
const unescape = (s) => s.replace(/\\(['"])/g, '$1')
const used = new Set()
for (const file of files) {
	const source = readFileSync(file, 'utf8')
	for (const match of source.matchAll(single)) {
		used.add(unescape(match[2]))
	}
	for (const match of source.matchAll(plural)) {
		used.add(`_${unescape(match[2])}_::_${unescape(match[4])}_`)
	}
}

const translated = JSON.parse(readFileSync('l10n/de_DE.json', 'utf8')).translations
const missing = [...used].filter(s => !(s in translated))
const unused = Object.keys(translated).filter(s => !used.has(s))

console.log(`${used.size} strings in src/, ${missing.length} missing, ${unused.length} unused`)
for (const s of missing) {
	console.log(`  missing: ${s}`)
}
for (const s of unused) {
	console.log(`  unused:  ${s}`)
}
process.exit(missing.length > 0 ? 1 : 0)
