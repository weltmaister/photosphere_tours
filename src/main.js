/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Loaded into the Files app and public share pages. Registers
 * - the default action for `360-Rundgang.json` that opens the walkthrough,
 * - "Open as 360° walkthrough" in the menu of every folder,
 * - "New → 360° walkthrough" for the current folder,
 * - a hint bar above the file list of folders with a walkthrough or 360° images.
 * Everything heavier is loaded on demand.
 */
import './public-path.js'
import {
	DefaultType,
	FileType,
	NewMenuEntryCategory,
	Permission,
	addNewFileMenuEntry,
	registerFileAction,
	registerFileListHeader,
} from '@nextcloud/files'
import { t } from '@nextcloud/l10n'

import { TOUR_FILENAME } from './tour.js'

const APP = 'photosphere_tours'
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2c.6 0 1.6 1.4 2.2 4H9.8C10.4 5.4 11.4 4 12 4M9.4 4.5C8.9 5.4 8.4 6.6 8.1 8H5.3a8 8 0 0 1 4.1-3.5m5.2 0A8 8 0 0 1 18.7 8h-2.8c-.3-1.4-.8-2.6-1.3-3.5M4.6 10h3.2a20 20 0 0 0 0 4H4.6a8 8 0 0 1 0-4m5.2 0h4.4a18 18 0 0 1 0 4H9.8a18 18 0 0 1 0-4m6.4 0h3.2a8 8 0 0 1 0 4h-3.2a20 20 0 0 0 0-4M5.3 16h2.8c.3 1.4.8 2.6 1.3 3.5A8 8 0 0 1 5.3 16m4.5 0h4.4c-.6 2.6-1.6 4-2.2 4s-1.6-1.4-2.2-4m6.1 0h2.8a8 8 0 0 1-4.1 3.5c.5-.9 1-2.1 1.3-3.5"/></svg>'

const isTourFile = (node) => node?.basename === TOUR_FILENAME && (node.permissions & Permission.READ) !== 0
const canCreateIn = (folder) => (folder.permissions & Permission.CREATE) !== 0 && !folder.source.includes('/public.php/')

function webGlAvailable() {
	try {
		return !!document.createElement('canvas').getContext('webgl2')
	} catch {
		return false
	}
}

async function open(node) {
	const { showError } = await import('@nextcloud/dialogs')
	if (!webGlAvailable()) {
		showError(t(APP, 'The 360° viewer needs WebGL 2. Use a current browser or enable WebGL in its settings.'))
		return
	}
	const { openTour } = await import(/* webpackChunkName: "viewer" */ './app.js')
	await openTour(node)
}

/** Open the folder's walkthrough, creating it first when there is none. */
async function openFolder(folder) {
	const { showError } = await import('@nextcloud/dialogs')
	const { Cancelled, createTour, tourNode } = await import(/* webpackChunkName: "create" */ './create.js')
	const { listFolder } = await import(/* webpackChunkName: "create" */ './dav.js')
	const { classifyFolder } = await import(/* webpackChunkName: "create" */ './folder.js')
	try {
		const hasTour = classifyFolder(await listFolder(folder.encodedSource)).hasTour
		if (!hasTour && !canCreateIn(folder)) {
			showError(t(APP, 'This folder has no walkthrough yet.'))
			return
		}
		await open(hasTour ? tourNode(folder) : await createTour(folder))
	} catch (e) {
		if (!(e instanceof Cancelled)) {
			showError(t(APP, 'The walkthrough could not be created: {error}', { error: e.message }, undefined, { escape: false }))
		}
	}
}

registerFileAction({
	id: 'photosphere-tours-open',
	displayName: () => t(APP, 'Open 360° walkthrough'),
	iconSvgInline: () => ICON,
	// before the text editor, which would otherwise open the JSON file
	order: -100,
	default: DefaultType.DEFAULT,
	enabled: ({ nodes }) => nodes.length === 1 && isTourFile(nodes[0]),
	exec: async ({ nodes }) => {
		await open(nodes[0])
		return null
	},
})

registerFileAction({
	id: 'photosphere-tours-folder',
	displayName: () => t(APP, 'Open as 360° walkthrough'),
	iconSvgInline: () => ICON,
	order: 90,
	enabled: ({ nodes }) => nodes.length === 1
		&& nodes[0].type === FileType.Folder
		&& (nodes[0].permissions & Permission.READ) !== 0,
	exec: async ({ nodes }) => {
		await openFolder(nodes[0])
		return null
	},
})

addNewFileMenuEntry({
	id: 'photosphere-tours-new',
	displayName: t(APP, '360° walkthrough'),
	iconSvgInline: ICON,
	category: NewMenuEntryCategory.CreateNew,
	order: 90,
	enabled: canCreateIn,
	handler: async (folder, content) => {
		if (content.some(node => node.basename === TOUR_FILENAME)) {
			const { showError } = await import('@nextcloud/dialogs')
			showError(t(APP, 'This folder already has a walkthrough ({file}).', { file: TOUR_FILENAME }, undefined, { escape: false }))
			return
		}
		await openFolder(folder)
	},
})

// Hint bar above the file list. The folder is checked with one small
// PROPFIND; the bar's code is only loaded where there is something to show.
let bar = null
let barEl = null
let request = 0

async function updateBar(folder) {
	const current = ++request
	try {
		const [{ listFolder }, { classifyFolder }] = await Promise.all([
			import(/* webpackChunkName: "create" */ './dav.js'),
			import(/* webpackChunkName: "create" */ './folder.js'),
		])
		const content = classifyFolder(await listFolder(folder.encodedSource))
		if (current !== request) {
			return
		}
		const state = content.hasTour
			? { mode: 'open' }
			: (content.knownPanoramas > 0 && canCreateIn(folder) ? { mode: 'create', count: content.knownPanoramas } : null)
		if (!state && !bar) {
			return
		}
		if (!bar) {
			const { mountBar } = await import(/* webpackChunkName: "bar" */ './bar.js')
			bar = mountBar(barEl)
		}
		bar.show(state && { ...state, open: () => openFolder(folder) })
	} catch {
		// the bar is a convenience; the file list works without it
	}
}

registerFileListHeader({
	id: 'photosphere-tours',
	order: 10,
	enabled: () => true,
	render: (el, folder) => {
		barEl = el
		bar = null
		updateBar(folder)
	},
	updated: (folder) => updateBar(folder),
})
