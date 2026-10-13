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

import { copyFile, ensureFolder, getFileId, listFolder, urlFor, writeBlob, writeText } from './dav.js'
import { classifyFolder, freePhotoName, freePlanName, pngNameFor } from './folder.js'
import { PHOTO_FOLDER } from './markers.js'
import { t } from './l10n.js'
import { TOUR_FILENAME, emptyTour, serializeTour } from './tour.js'

const PLAN_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export class Cancelled extends Error {}

/** The Files node of the walkthrough file in a folder (it may not exist yet). */
export function tourNode(folder, id = undefined) {
	return new File({
		id,
		source: `${folderBase(folder).source}/${TOUR_FILENAME}`,
		root: folder.root,
		owner: folder.owner,
		mime: 'application/json',
		permissions: folder.permissions,
		mtime: new Date(),
	})
}

const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' }

/** A file just written into the folder, announced to the file list. */
/**
 * WebDAV root and folder path without a trailing slash ("" for the root
 * folder, whose path is "/"), so `${dir}/${name}` never doubles a slash.
 */
function folderBase(folder) {
	const dir = folder.path.replace(/\/$/, '')
	const source = folder.source.replace(/\/$/, '')
	return { rootUrl: source.slice(0, source.length - dir.length), dir, source }
}

async function announceFile(folder, name, url) {
	announce(new File({
		id: await getFileId(url).catch(() => null) ?? undefined,
		source: `${folderBase(folder).source}/${name}`,
		root: folder.root,
		owner: folder.owner,
		mime: MIME[name.split('.').pop().toLowerCase()] ?? 'application/octet-stream',
		permissions: folder.permissions,
		mtime: new Date(),
	}))
}

/**
 * Copy a floor plan from elsewhere into the folder of the walkthrough, under a
 * name that overwrites nothing; returns that name.
 */
async function copyIntoFolder(folder, entries, absolute) {
	const { rootUrl, dir } = folderBase(folder)
	const names = entries.map(e => e.name)
	const fileName = absolute.split('/').pop()
	for (let tries = 0; tries < 20; tries++) {
		const name = freePlanName(names, fileName)
		const target = urlFor(rootUrl, `${dir}/${name}`)
		if (await copyFile(urlFor(rootUrl, absolute), target)) {
			await announceFile(folder, name, target)
			return name
		}
		// created by someone else in the meantime
		names.push(name)
	}
	throw new Error(t('There is no free file name for the floor plan in this folder.'))
}

/**
 * Copy a photo from elsewhere into the walkthrough's photo folder; returns its
 * path relative to the walkthrough folder.
 *
 * @param {object} folder Files node or { source, path, root, owner } of the walkthrough folder
 * @param {string[]} photoNames names already in the photo folder
 * @param {string} absolute path of the photo below the root of the user or share
 * @return {Promise<string>}
 */
export async function copyPhotoIntoFolder(folder, photoNames, absolute) {
	const { rootUrl, dir } = folderBase(folder)
	await ensureFolder(urlFor(rootUrl, `${dir}/${PHOTO_FOLDER}`))
	const names = [...photoNames]
	const fileName = absolute.split('/').pop()
	for (let tries = 0; tries < 20; tries++) {
		const name = freePhotoName(names, fileName)
		if (await copyFile(urlFor(rootUrl, absolute), urlFor(rootUrl, `${dir}/${PHOTO_FOLDER}/${name}`))) {
			return `${PHOTO_FOLDER}/${name}`
		}
		// created by someone else in the meantime
		names.push(name)
	}
	throw new Error(t('There is no free file name for the photo in this folder.'))
}

/**
 * Pick the floor plan for a folder and return its file name. A plan chosen
 * from elsewhere is copied into the folder first, so everything a
 * walkthrough uses lies next to it. A PDF is converted to `<name>.png`.
 *
 * @param {object} folder Files node or { source, path, root, owner } of the folder
 * @param {Array} entries listFolder() of the folder
 * @param {{ auto?: boolean, file?: string, onWork?: Function }} options auto: take
 *   the only candidate without asking; file: use this file of the folder;
 *   onWork: called once the plan is chosen, before the slow part
 * @return {Promise<string>}
 */
export async function choosePlan(folder, entries, { auto = true, file = null, onWork = null } = {}) {
	const { rootUrl, dir } = folderBase(folder)
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
		const inFolder = absolute.startsWith(`${dir}/`) && !absolute.slice(dir.length + 1).includes('/')
		if (inFolder) {
			name = absolute.slice(dir.length + 1)
		}
	}

	if (!name) {
		onWork?.()
		name = await copyIntoFolder(folder, entries, absolute)
	}
	if (!/\.pdf$/i.test(name)) {
		return name
	}

	// PDF: convert page 1 once, unless a newer PNG of the same name exists
	const png = pngNameFor(name)
	const pdfEntry = entries.find(e => e.name === name)
	const pngEntry = entries.find(e => e.name === png)
	if (pngEntry && pdfEntry && pngEntry.mtime >= pdfEntry.mtime) {
		return png
	}
	onWork?.()
	const { pdfToPng } = await import(/* webpackChunkName: "pdf" */ './pdf.js')
	const blob = await pdfToPng(urlFor(rootUrl, `${dir}/${name}`))
	const pngUrl = urlFor(rootUrl, `${dir}/${png}`)
	await writeBlob(pngUrl, blob)
	await announceFile(folder, png, pngUrl)
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
