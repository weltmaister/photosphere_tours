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
 * Everything heavier is loaded on demand; keep the imports here small, this
 * script runs on every Files page.
 */
import './public-path.js'
import { subscribe } from '@nextcloud/event-bus'
import {
	DefaultType,
	FileType,
	NewMenuEntryCategory,
	Permission,
	addNewFileMenuEntry,
	registerFileAction,
	registerFileListHeader,
} from '@nextcloud/files'

import { TOUR_FILENAME } from './constants.js'
import { errorText, t } from './l10n.js'

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2c.6 0 1.6 1.4 2.2 4H9.8C10.4 5.4 11.4 4 12 4M9.4 4.5C8.9 5.4 8.4 6.6 8.1 8H5.3a8 8 0 0 1 4.1-3.5m5.2 0A8 8 0 0 1 18.7 8h-2.8c-.3-1.4-.8-2.6-1.3-3.5M4.6 10h3.2a20 20 0 0 0 0 4H4.6a8 8 0 0 1 0-4m5.2 0h4.4a18 18 0 0 1 0 4H9.8a18 18 0 0 1 0-4m6.4 0h3.2a8 8 0 0 1 0 4h-3.2a20 20 0 0 0 0-4M5.3 16h2.8c.3 1.4.8 2.6 1.3 3.5A8 8 0 0 1 5.3 16m4.5 0h4.4c-.6 2.6-1.6 4-2.2 4s-1.6-1.4-2.2-4m6.1 0h2.8a8 8 0 0 1-4.1 3.5c.5-.9 1-2.1 1.3-3.5"/></svg>'

const isTourFile = (node) => node?.basename === TOUR_FILENAME && (node.permissions & Permission.READ) !== 0
const canCreateIn = (folder) => (folder.permissions & Permission.CREATE) !== 0 && !folder.source.includes('/public.php/')

// the folder check of the hint bar only needs these two small modules; giving
// them their own chunk keeps Vue and the dialogs out of every folder change
const folderModules = () => Promise.all([
	import(/* webpackChunkName: "folder" */ './dav.js'),
	import(/* webpackChunkName: "folder" */ './folder.js'),
])

function webGlAvailable() {
	try {
		return !!document.createElement('canvas').getContext('webgl2')
	} catch {
		return false
	}
}

// one walkthrough at a time: a double click must not create or open twice
let busy = false

async function open(node) {
	const { showError } = await import('@nextcloud/dialogs')
	if (!webGlAvailable()) {
		showError(t('The 360° viewer needs WebGL 2. Use a current browser or enable WebGL in its settings.'))
		return
	}
	const { openTour } = await import(/* webpackChunkName: "viewer" */ './app.js')
	openTour(node)
}

async function guarded(task) {
	if (busy) {
		return
	}
	busy = true
	try {
		await task()
	} finally {
		busy = false
	}
}

/** Open the folder's walkthrough, creating it first when there is none. */
function openFolder(folder) {
	return guarded(async () => {
		const { showError, showLoading } = await import('@nextcloud/dialogs')
		const [{ listFolder }, { classifyFolder }] = await folderModules()
		const { Cancelled, createTour, tourNode } = await import(/* webpackChunkName: "create" */ './create.js')
		let loading = null
		try {
			const content = classifyFolder(await listFolder(folder.encodedSource))
			if (content.hasTour) {
				await open(tourNode(folder))
				return
			}
			if (!canCreateIn(folder)) {
				showError(t('This folder has no walkthrough yet.'))
				return
			}
			if (content.panoramas.length === 0) {
				showError(t('There are no 360° images in this folder. Put the images and a floor plan into one folder first.'))
				return
			}
			// the toast only once the plan is chosen: converting a PDF takes a moment
			const node = await createTour(folder, () => { loading = showLoading(t('Creating the walkthrough …')) })
			loading?.hideToast()
			await open(node)
		} catch (e) {
			if (!(e instanceof Cancelled)) {
				showError(t('The walkthrough could not be created: {error}', { error: errorText(e) }))
			}
		} finally {
			loading?.hideToast()
		}
	})
}

registerFileAction({
	id: 'photosphere-tours-open',
	displayName: () => t('Open 360° walkthrough'),
	iconSvgInline: () => ICON,
	// before the text editor, which would otherwise open the JSON file
	order: -100,
	default: DefaultType.DEFAULT,
	enabled: ({ nodes }) => nodes.length === 1 && isTourFile(nodes[0]),
	exec: async ({ nodes }) => {
		await guarded(() => open(nodes[0]))
		return null
	},
})

// Label next to 360-Rundgang.json, so nobody deletes it by accident – only
// for those who could
const FILE_HINT = () => t('This file holds the walkthrough: spots, view directions and visits. Deleting or renaming it removes the walkthrough – the images stay.')

registerFileAction({
	id: 'photosphere-tours-label',
	displayName: () => t('What is this file?'),
	iconSvgInline: () => ICON,
	order: 100,
	enabled: ({ nodes }) => nodes.length === 1 && isTourFile(nodes[0]) && (nodes[0].permissions & Permission.DELETE) !== 0,
	// the label is rendered inline; the action itself stays in the ⋯ menu
	renderInline: async () => {
		const label = document.createElement('span')
		label.textContent = t('360° walkthrough – do not delete')
		label.title = FILE_HINT()
		Object.assign(label.style, {
			padding: '2px 8px',
			borderRadius: 'var(--border-radius-element)',
			background: 'var(--color-primary-element-light)',
			color: 'var(--color-main-text)',
			fontSize: 'var(--font-size-small)',
			whiteSpace: 'nowrap',
		})
		return label
	},
	exec: async () => {
		const { showInfo } = await import('@nextcloud/dialogs')
		showInfo(FILE_HINT())
		return null
	},
})

registerFileAction({
	id: 'photosphere-tours-folder',
	displayName: () => t('Open as 360° walkthrough'),
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
	displayName: t('360° walkthrough'),
	iconSvgInline: ICON,
	category: NewMenuEntryCategory.CreateNew,
	order: 90,
	enabled: canCreateIn,
	// creates the walkthrough, or opens the one the folder already has
	handler: (folder) => openFolder(folder),
})

// Hint bar above the file list. The folder is checked with one small
// PROPFIND; the bar's code is only loaded where there is something to show.
let bar = null
let barEl = null
let barFolder = null
let request = 0

async function updateBar(folder) {
	barFolder = folder
	const current = ++request
	try {
		const [{ listFolder }, { classifyFolder }] = await folderModules()
		const content = classifyFolder(await listFolder(folder.encodedSource))
		if (current !== request) {
			return
		}
		const state = content.hasTour
			? { mode: 'open', readOnly: (folder.permissions & Permission.UPDATE) === 0 }
			: (content.offer > 0 && canCreateIn(folder) ? { mode: 'create', count: content.offer } : null)
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

// The header is only re-rendered when the folder changes. When files are added,
// removed or renamed in the folder on screen, check again – otherwise the bar
// would still offer "Create" right after creating the walkthrough. Bundled, so
// an upload of fifty images causes one check, not fifty.
let recheck = null
const onNodeChange = (node) => {
	if (!barFolder || node?.dirname !== barFolder.path) {
		return
	}
	clearTimeout(recheck)
	recheck = setTimeout(() => updateBar(barFolder), 500)
}
subscribe('files:node:created', onNodeChange)
subscribe('files:node:deleted', onNodeChange)
subscribe('files:node:renamed', onNodeChange)
