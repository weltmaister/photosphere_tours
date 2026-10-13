/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Editing the markers of the shown capture: placing and moving them in the
 * panorama, texts, photos, removing with "Undo", and the photos of the photo
 * folder that no marker uses yet.
 *
 * Markers are told apart by object identity, never by their index: an index in
 * a closure (undo) or in the place mode would point at another marker as soon
 * as the list changes. The section's props and events use indexes only for the
 * moment of a click; they are turned into the marker object right away.
 */
import { computed, reactive, ref, shallowRef, toRaw, watch } from 'vue'
import { FilePickerClosed, FilePickerType, getFilePickerBuilder } from '@nextcloud/dialogs'

import { copyPhotoIntoFolder } from '../create.js'
import { listFolder } from '../dav.js'
import { errorText, t } from '../l10n.js'
import { PHOTO_FOLDER, isPlaced, markersOf, unusedPhotos } from '../markers.js'

const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp']

/** The capture's marker list; created on the capture when it has none yet. */
function markersFor(capture) {
	if (!capture.markers) {
		capture.markers = []
	}
	return capture.markers
}

const indexOfMarker = (list, marker) => list.findIndex(m => toRaw(m) === marker)

/**
 * @param {object} context
 * @param {import('vue').Ref} context.tour the walkthrough
 * @param {import('vue').Ref} context.capture the capture whose markers are edited
 * @param {import('vue').Ref<boolean>} context.editing
 * @param {import('vue').Ref<boolean>} context.previewing the panorama shows a picked image, not the capture
 * @param {{ path: string }} context.folder the walkthrough folder (as create.js expects it)
 * @param {string} context.folderUrl WebDAV URL of the walkthrough folder
 * @param {Function} context.setStatus
 * @param {Function} context.clearStatus
 * @param {Function} context.changed
 * @param {boolean} [context.canChoosePhoto] false on share pages: no file picker without a login
 * @param {Function} context.beforePlacecalled when the place mode starts (the editor drops a picked image)
 */
export function useMarkerEditing({ tour, capture, editing, previewing, folder, folderUrl, setStatus, clearStatus, changed, beforePlace, canChoosePhoto = true }) {
	const list = computed(() => markersOf(capture.value))

	/** null, 'new' or the (raw) marker that is moved */
	const target = shallowRef(null)
	/** the (raw) marker whose editor is open in the section */
	const opened = shallowRef(null)

	/** what the section shows: null, 'new' or 'move:<index>' */
	const markerPlacing = computed(() => {
		if (target.value === 'new') {
			return 'new'
		}
		const index = target.value ? indexOfMarker(list.value, target.value) : -1
		return index >= 0 ? `move:${index}` : null
	})
	const openedIndex = computed(() => opened.value ? indexOfMarker(list.value, opened.value) : -1)

	// another capture, a picked image in the panorama or leaving the editor: nothing of this is meant any more
	// (dropping the picked image when the place mode starts must not end that mode, hence `previewing` only when it turns on)
	const forget = () => {
		target.value = null
		opened.value = null
	}
	watch([capture, editing], forget)
	watch(previewing, (on) => on && forget())

	// ---- photos of the photo folder ----

	/** files inside the photo folder: { name, fileid } */
	const photoEntries = ref([])
	const photoNames = computed(() => photoEntries.value.map(e => e.name))
	const photos = computed(() => tour.value
		? unusedPhotos(tour.value, photoNames.value.map(name => `${PHOTO_FOLDER}/${name}`))
		: [])
	const photoIds = computed(() => new Map(photoEntries.value.map(e => [`${PHOTO_FOLDER}/${e.name}`, e.fileid])))
	/** the file id of a photo in the photo folder (for a preview), else null */
	const fileidOf = (path) => photoIds.value.get(path) ?? null

	/** A missing photo folder is an empty list; a failing request is reported and keeps the old list. */
	async function loadPhotos() {
		try {
			const entries = await listFolder(`${folderUrl}/${PHOTO_FOLDER}`)
			photoEntries.value = entries
				.filter(e => !e.isFolder)
				.map(e => ({ name: e.name, fileid: e.fileid ?? null }))
				.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
		} catch (e) {
			setStatus('error', t('The photos in the folder {folder} could not be loaded: {error}', { folder: PHOTO_FOLDER, error: errorText(e) }))
		}
	}

	// ---- section: open, place, text ----

	/** Open the editor of a marker (index < 0 closes it). */
	function open(index) {
		const marker = index >= 0 ? list.value[index] : null
		opened.value = marker ? toRaw(marker) : null
	}

	function placeNew() {
		beforePlace()
		target.value = 'new'
	}

	function move(index) {
		const marker = list.value[index]
		if (marker) {
			beforePlace()
			target.value = toRaw(marker)
		}
	}

	function cancelPlace() {
		target.value = null
	}

	/**
	 * A click in the panorama while placing.
	 *
	 * @return {object|null} the marker that was placed or moved
	 */
	function pick({ yaw, pitch }) {
		const current = capture.value
		const what = target.value
		if (!current || !what) {
			return null
		}
		const markers = markersFor(current)
		target.value = null
		if (what === 'new') {
			const added = { yaw, pitch, text: '' }
			markers.push(added)
			opened.value = added
			changed()
			setStatus('success', t('Marker placed – not saved yet'), t('Undo'), () => {
				const index = indexOfMarker(markers, added)
				if (index >= 0) {
					markers.splice(index, 1)
					changed()
				}
				if (opened.value === added) {
					opened.value = null
				}
				clearStatus()
			})
			return added
		}
		if (indexOfMarker(markers, what) < 0) {
			return null
		}
		const marker = reactive(what)
		const before = isPlaced(what) ? { yaw: what.yaw, pitch: what.pitch } : null
		Object.assign(marker, { yaw, pitch })
		opened.value = what
		changed()
		setStatus('success', t('Marker moved – not saved yet'), t('Undo'), () => {
			if (before) {
				Object.assign(marker, before)
			} else {
				delete marker.yaw
				delete marker.pitch
			}
			changed()
			clearStatus()
		})
		return what
	}

	function setText(index, text) {
		const marker = list.value[index]
		if (marker) {
			marker.text = text
			changed()
		}
	}

	function remove(index) {
		const markers = list.value
		const removed = markers[index] && toRaw(markers[index])
		if (!removed) {
			return
		}
		markers.splice(index, 1)
		// where it was: before the marker that followed it
		const next = markers[index] ? toRaw(markers[index]) : null
		if (opened.value === removed) {
			opened.value = null
		}
		if (target.value === removed) {
			target.value = null
		}
		changed()
		setStatus('success', t('Marker removed – not saved yet'), t('Undo'), () => {
			if (indexOfMarker(markers, removed) < 0) {
				const at = next ? indexOfMarker(markers, next) : -1
				markers.splice(at >= 0 ? at : markers.length, 0, removed)
				opened.value = removed
				changed()
			}
			clearStatus()
		})
	}

	// ---- photos of a marker ----

	function removePhoto(index) {
		const marker = list.value[index]
		if (!marker?.file) {
			return
		}
		if ((marker.text ?? '').trim() === '') {
			setStatus('info', t('A marker needs a text or a photo.'))
			return
		}
		delete marker.file
		changed()
	}

	/** The photo's path in the walkthrough folder, or null (cancelled, failed). */
	async function pickPhotoFile() {
		const dir = folder.path.replace(/\/$/, '')
		let absolute
		try {
			absolute = await getFilePickerBuilder(t('Choose photo'))
				.setMimeTypeFilter(PHOTO_MIMES)
				.setType(FilePickerType.Choose)
				.startAt(photoNames.value.length > 0 ? `${dir}/${PHOTO_FOLDER}` : folder.path)
				.build()
				.pick()
		} catch (e) {
			// closing the picker is no error, anything else is shown
			if (!(e instanceof FilePickerClosed)) {
				setStatus('error', t('The photo could not be chosen: {error}', { error: errorText(e) }))
			}
			return null
		}
		const prefix = `${dir}/${PHOTO_FOLDER}/`
		if (absolute.startsWith(prefix) && !absolute.slice(prefix.length).includes('/')) {
			return `${PHOTO_FOLDER}/${absolute.slice(prefix.length)}`
		}
		try {
			const file = await copyPhotoIntoFolder(folder, photoNames.value, absolute)
			await loadPhotos()
			return file
		} catch (e) {
			setStatus('error', t('The photo could not be copied into the folder {folder}: {error}', { folder: PHOTO_FOLDER, error: errorText(e) }))
			return null
		}
	}

	let choosing = false

	async function choosePhoto(index) {
		const markers = list.value
		const marker = markers[index] && toRaw(markers[index])
		if (!marker || choosing || !canChoosePhoto) {
			return
		}
		choosing = true
		try {
			const file = await pickPhotoFile()
			// the marker may have been removed while the photo was copied
			if (file && indexOfMarker(markers, marker) >= 0) {
				reactive(marker).file = file
				changed()
			}
		} finally {
			choosing = false
		}
	}

	/** A photo of the photo folder becomes a marker without a place. */
	function addPhoto(path) {
		const current = capture.value
		if (!current) {
			return
		}
		const added = { file: path }
		markersFor(current).push(added)
		opened.value = added
		changed()
	}

	return {
		markerPlacing,
		openedMarker: openedIndex,
		photos,
		fileidOf,
		loadPhotos,
		open,
		placeNew,
		move,
		cancelPlace,
		pick,
		setText,
		remove,
		removePhoto,
		choosePhoto,
		addPhoto,
	}
}
