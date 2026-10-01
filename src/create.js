/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Creating a walkthrough for a folder and choosing its floor plan. The plan is
 * found automatically when the folder holds exactly one; a PDF plan is turned
 * into a PNG next to it.
 */
import { FilePickerType, getFilePickerBuilder } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { File } from '@nextcloud/files'

import { getFileId, listFolder, urlFor, writeBlob, writeText } from './dav.js'
import { classifyFolder, pngNameFor } from './folder.js'
import { t } from './l10n.js'
import { TOUR_FILENAME, emptyTour, relativePath, serializeTour } from './tour.js'

const PLAN_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export class Cancelled extends Error {}

/** The Files node of the walkthrough file in a folder (it may not exist yet). */
export function tourNode(folder, id = undefined) {
	return new File({
		id,
		source: `${folder.source}/${TOUR_FILENAME}`,
		root: folder.root,
		owner: folder.owner,
		mime: 'application/json',
		permissions: folder.permissions,
		mtime: new Date(),
	})
}

/**
 * Pick the floor plan for a folder and return its path relative to the
 * folder. A PDF is converted to `<name>.png` in the folder.
 *
 * @param {object} folder Files node or { source, path, root, owner } of the folder
 * @param {Array} entries listFolder() of the folder
 * @param {{ auto?: boolean, file?: string, onWork?: Function }} options auto: take
 *   the only candidate without asking; file: use this file of the folder;
 *   onWork: called once the plan is chosen, before the slow part
 * @return {Promise<string>}
 */
export async function choosePlan(folder, entries, { auto = true, file = null, onWork = null } = {}) {
	const candidates = classifyFolder(entries).plans
	let name = file
	let absolute = null
	if (!name && auto && candidates.length === 1) {
		name = candidates[0]
	}
	if (!name) {
		try {
			absolute = await getFilePickerBuilder(t('Choose the floor plan for this walkthrough'))
				.setMimeTypeFilter(PLAN_MIMES)
				.setType(FilePickerType.Choose)
				.startAt(folder.path)
				.build()
				.pick()
		} catch {
			throw new Cancelled()
		}
		const inFolder = absolute.startsWith(`${folder.path}/`) && !absolute.slice(folder.path.length + 1).includes('/')
		if (inFolder) {
			name = absolute.slice(folder.path.length + 1)
		}
	}

	const path = absolute ?? `${folder.path}/${name}`
	if (!/\.pdf$/i.test(path)) {
		return name ?? relativePath(folder.path, absolute)
	}

	// PDF: convert page 1 once, unless a newer PNG of the same name exists
	const png = pngNameFor(path.split('/').pop())
	const pdfEntry = name ? entries.find(e => e.name === name) : null
	const pngEntry = entries.find(e => e.name === png)
	if (pngEntry && pdfEntry && pngEntry.mtime >= pdfEntry.mtime) {
		return png
	}
	onWork?.()
	const rootUrl = folder.source.slice(0, folder.source.length - folder.path.length)
	const { pdfToPng } = await import(/* webpackChunkName: "pdf" */ './pdf.js')
	const blob = await pdfToPng(urlFor(rootUrl, path))
	const pngUrl = urlFor(rootUrl, `${folder.path}/${png}`)
	await writeBlob(pngUrl, blob)
	announce(new File({
		id: await getFileId(pngUrl).catch(() => null) ?? undefined,
		source: `${folder.source}/${png}`,
		root: folder.root,
		owner: folder.owner,
		mime: 'image/png',
		permissions: folder.permissions,
		mtime: new Date(),
	}))
	return png
}

/**
 * Create the walkthrough file of a folder. Resolves with its node, or with
 * the existing one when the folder already has a walkthrough.
 *
 * @param {Function} onWork called once the floor plan is chosen
 */
export async function createTour(folder, onWork = null) {
	const entries = await listFolder(folder.encodedSource)
	const node = tourNode(folder)
	if (classifyFolder(entries).hasTour) {
		return node
	}
	const plan = await choosePlan(folder, entries, { onWork })
	await writeText(node.encodedSource, serializeTour(emptyTour(folder.basename, plan)), null)
	const created = tourNode(folder, await getFileId(node.encodedSource).catch(() => null) ?? undefined)
	announce(created)
	return created
}

/** Show a new file in the file list; without a file id the Files app refuses it. */
function announce(node) {
	if (node.id) {
		emit('files:node:created', node)
	}
}
