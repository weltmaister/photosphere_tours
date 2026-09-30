#!/usr/bin/env node
/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Creates a 360-Rundgang.json in every floor folder of a HoloBuilder backup.
 * Runs on a local (synced) copy of the folder. Without --write it only
 * prints what it would do.
 *
 *   node tools/holobuilder-import.mjs "<…>/360-Grad-Aufnahmen" [--write] [--force]
 *        [--yaw-sign=-1] [--yaw-offset=90] [--json-report=report.json] [--out=<dir>]
 *
 * --out writes the files into <dir>/<floor>/ instead of the backup itself.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { OLDER_FOLDER, buildFloorTour, parseIndexCsv, rotationsFromSlideNodes } from './holobuilder.js'
import { TOUR_FILENAME, serializeTour } from '../src/tour.js'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name, fallback) => {
	const hit = args.find(a => a.startsWith(`--${name}=`))
	return hit ? hit.slice(name.length + 3) : fallback
}
const root = args.find(a => !a.startsWith('--'))
if (!root) {
	console.error('Usage: holobuilder-import.mjs <folder of the backup> [--write] [--force]')
	process.exit(2)
}

const write = flag('write')
const force = flag('force')
const yawSign = Number(option('yaw-sign', '1'))
const yawOffset = Number(option('yaw-offset', '0'))
const outDir = option('out', null)
const jpgs = (dir) => existsSync(dir)
	? readdirSync(dir, { withFileTypes: true }).filter(e => e.isFile() && /\.jpe?g$/i.test(e.name)).map(e => e.name).sort()
	: []

const meta = join(root, '_meta')
const index = JSON.parse(readFileSync(join(meta, 'index.json'), 'utf8'))
const rows = parseIndexCsv(readFileSync(join(meta, 'index.csv'), 'utf8'))

const reports = []
for (const floor of index.geschosse) {
	const sheet = floor.sheet
	const folder = join(root, sheet)
	if (!existsSync(folder)) {
		reports.push({ sheet, error: `folder "${sheet}" not found` })
		continue
	}

	const nodesFile = join(meta, `slideNodes_${sheet}.json`)
	const rotations = existsSync(nodesFile)
		? rotationsFromSlideNodes(JSON.parse(readFileSync(nodesFile, 'utf8')))
		: new Map()

	const planFile = ['png', 'jpg', 'jpeg'].map(ext => `${sheet}.${ext}`).find(name => existsSync(join(root, 'Grundrisse', name)))
	const { tour, report } = buildFloorTour({
		sheet,
		rows: rows.filter(r => r.sheet === sheet),
		files: jpgs(folder),
		olderFiles: jpgs(join(folder, OLDER_FOLDER)),
		rotations,
		plan: planFile ? `../Grundrisse/${planFile}` : 'Grundriss.png',
	}, { yawSign, yawOffset })
	if (!planFile) {
		report.error = `no plan in Grundrisse/ for "${sheet}" – set "plan" by hand`
	}

	const targetDir = outDir ? join(outDir, sheet) : folder
	const target = join(targetDir, TOUR_FILENAME)
	if (existsSync(target) && !force) {
		report.written = 'skipped (exists, use --force)'
	} else if (write) {
		mkdirSync(targetDir, { recursive: true })
		writeFileSync(target, serializeTour(tour), 'utf8')
		report.written = target
	} else {
		report.written = 'dry run'
	}
	reports.push(report)
}

for (const r of reports) {
	console.log(`\n== ${r.sheet}`)
	if (r.error) {
		console.log(`   ! ${r.error}`)
	}
	if (r.spots === undefined) {
		continue
	}
	console.log(`   ${r.spots} spots, ${r.captures} captures, ${r.aligned} with HoloBuilder orientation – ${r.written}`)
	const list = (label, items) => items.length && console.log(`   ${label} (${items.length}):\n${items.map(i => `     - ${i}`).join('\n')}`)
	list('csv rows without image', r.missingFiles)
	list('images without csv row (left unplaced)', r.unplaced)
	list(`${OLDER_FOLDER} without matching spot`, r.unmatchedOlder)
	list(`${OLDER_FOLDER} matching several spots`, r.ambiguousOlder)
	list(`${OLDER_FOLDER} dated before the original capture`, r.olderOlderThanCurrent)
}

const reportFile = option('json-report', null)
if (reportFile) {
	writeFileSync(reportFile, JSON.stringify(reports, null, '\t'))
}
if (!write) {
	console.log('\nDry run – nothing written. Add --write to create the files.')
}
