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

// t('…') in Vue components (l10n.js helper) and t(APP, '…') in plain modules
const pattern = /\bt\((?:APP,\s*)?(['"])((?:\\.|(?!\1).)*)\1/g
const used = new Set()
for (const file of files) {
	for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
		used.add(match[2].replace(/\\(['"])/g, '$1'))
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
