// The marker handlers of the editor (src/composables/useMarkerEditing.js) without a browser
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

const picker = vi.hoisted(() => ({ pick: vi.fn() }))
vi.mock('@nextcloud/dialogs', () => {
	const builder = {
		setMimeTypeFilter: () => builder,
		setType: () => builder,
		startAt: vi.fn(() => builder),
		build: () => ({ pick: picker.pick }),
	}
	class FilePickerClosed extends Error {}
	return { FilePickerClosed, FilePickerType: { Choose: 1 }, getFilePickerBuilder: () => builder }
})
vi.mock('../src/create.js', () => ({ copyPhotoIntoFolder: vi.fn(async () => '2D-Bilder/copy.jpg') }))
vi.mock('../src/dav.js', () => ({ listFolder: vi.fn(async () => []) }))
vi.mock('../src/l10n.js', () => ({ t: (text) => text, errorText: (e) => e.message }))

const { useMarkerEditing } = await import('../src/composables/useMarkerEditing.js')
const { FilePickerClosed } = await import('@nextcloud/dialogs')
const { copyPhotoIntoFolder } = await import('../src/create.js')
const { listFolder } = await import('../src/dav.js')

function setup(markers, options = {}) {
	const tour = ref({
		spots: [{ name: 'A', captures: [{ file: 'a.jpg', date: '2024-08-14T16:02', ...(markers ? { markers } : {}) }] }],
	})
	const capture = ref(tour.value.spots[0].captures[0])
	const editing = ref(true)
	const previewing = ref(false)
	const note = { value: null }
	const calls = { changed: 0, beforePlace: 0 }
	const editor = useMarkerEditing({
		tour,
		capture,
		editing,
		previewing,
		folder: { path: '/Projekt/EG' },
		folderUrl: 'https://cloud/remote.php/dav/files/u/Projekt/EG',
		setStatus: (type, text, action, onAction) => { note.value = { type, text, action, onAction } },
		clearStatus: () => { note.value = null },
		changed: () => { calls.changed++ },
		beforePlace: () => { calls.beforePlace++ },
		...options,
	})
	return { tour, capture, editing, previewing, note, calls, editor, list: () => tour.value.spots[0].captures[0].markers }
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('placing', () => {
	it('places a new marker on a capture without markers and undoes it', () => {
		const { editor, list, note, calls } = setup()
		editor.placeNew()
		expect(editor.markerPlacing.value).toBe('new')
		expect(calls.beforePlace).toBe(1)
		const added = editor.pick({ yaw: 10, pitch: -5 })
		expect(list()).toEqual([{ yaw: 10, pitch: -5, text: '' }])
		expect(added).toBeTruthy()
		expect(editor.markerPlacing.value).toBe(null)
		expect(editor.openedMarker.value).toBe(0)
		expect(note.value.action).toBe('Undo')
		note.value.onAction()
		expect(list()).toEqual([])
		expect(editor.openedMarker.value).toBe(-1)
		expect(note.value).toBe(null)
	})

	it('ignores a click while not placing', () => {
		const { editor, list } = setup([{ text: 'x' }])
		expect(editor.pick({ yaw: 1, pitch: 2 })).toBe(null)
		expect(list()).toEqual([{ text: 'x' }])
	})

	it('moves a marker and undoes it, also when the list changed in between', () => {
		const { editor, list, note } = setup([{ yaw: 1, pitch: 2, text: 'a' }, { yaw: 3, pitch: 4, text: 'b' }])
		editor.move(1)
		expect(editor.markerPlacing.value).toBe('move:1')
		editor.pick({ yaw: 30, pitch: 40 })
		expect(list()[1]).toEqual({ yaw: 30, pitch: 40, text: 'b' })
		const undo = note.value.onAction
		editor.remove(0) // "a" goes, so "b" moves to index 0 before the move is undone
		note.value.onAction = null
		undo()
		expect(list()).toEqual([{ yaw: 3, pitch: 4, text: 'b' }])
	})

	it('placing a marker that had no place, then undoing, leaves it without a place', () => {
		const { editor, list, note } = setup([{ file: '2D-Bilder/a.jpg' }])
		editor.move(0)
		editor.pick({ yaw: 5, pitch: 6 })
		expect(list()[0]).toEqual({ file: '2D-Bilder/a.jpg', yaw: 5, pitch: 6 })
		note.value.onAction()
		expect(list()[0]).toEqual({ file: '2D-Bilder/a.jpg' })
	})

	it('ends the place mode for another capture, a picked image and leaving the editor, but not when the picked image is dropped', async () => {
		const { editor, capture, tour, previewing, editing } = setup()
		editor.placeNew()
		previewing.value = true
		await nextTick()
		expect(editor.markerPlacing.value).toBe(null)
		previewing.value = false
		await nextTick()
		editor.placeNew()
		await nextTick() // dropping a picked image right before must not cancel
		expect(editor.markerPlacing.value).toBe('new')
		capture.value = { ...tour.value.spots[0].captures[0] }
		await nextTick()
		expect(editor.markerPlacing.value).toBe(null)
		editor.placeNew()
		editing.value = false
		await nextTick()
		expect(editor.markerPlacing.value).toBe(null)
		editor.cancelPlace()
	})
})

describe('texts, removing', () => {
	it('sets the text', () => {
		const { editor, list, calls } = setup([{ text: 'a' }])
		editor.setText(0, 'new text')
		expect(list()[0].text).toBe('new text')
		expect(calls.changed).toBe(1)
	})

	it('removes by identity and undo puts it back where it was', () => {
		const { editor, list, note } = setup([{ text: 'a' }, { text: 'b' }, { text: 'c' }])
		editor.open(1)
		editor.remove(1)
		expect(list().map(m => m.text)).toEqual(['a', 'c'])
		expect(editor.openedMarker.value).toBe(-1)
		editor.remove(0) // the list changed before "Undo" of the first removal is used
		const undoA = note.value.onAction
		expect(list().map(m => m.text)).toEqual(['c'])
		undoA()
		expect(list().map(m => m.text)).toEqual(['a', 'c'])
	})

	it('undoing a removal twice does not duplicate the marker', () => {
		const { editor, list, note } = setup([{ text: 'a' }, { text: 'b' }])
		editor.remove(0)
		const undo = note.value.onAction
		undo()
		undo()
		expect(list().map(m => m.text)).toEqual(['a', 'b'])
	})

	it('keeps a photo-only marker a marker: the photo stays unless there is a text', () => {
		const { editor, list, note } = setup([{ file: '2D-Bilder/a.jpg' }, { file: '2D-Bilder/b.jpg', text: 'x' }])
		editor.removePhoto(0)
		expect(list()[0].file).toBe('2D-Bilder/a.jpg')
		expect(note.value.text).toBe('A marker needs a text or a photo.')
		editor.removePhoto(1)
		expect(list()[1]).toEqual({ text: 'x' })
	})
})

describe('photos', () => {
	it('lists unused photos of the photo folder; a missing folder is an empty list', async () => {
		const { editor, list } = setup([{ file: '2D-Bilder/a.jpg' }])
		await editor.loadPhotos()
		expect(editor.photos.value).toEqual([])
		listFolder.mockResolvedValueOnce([
			{ name: 'b.jpg', isFolder: false },
			{ name: 'a.jpg', isFolder: false },
			{ name: 'sub', isFolder: true },
			{ name: 'c10.png', isFolder: false },
			{ name: 'c2.png', isFolder: false },
		])
		await editor.loadPhotos()
		expect(listFolder).toHaveBeenLastCalledWith('https://cloud/remote.php/dav/files/u/Projekt/EG/2D-Bilder')
		expect(editor.photos.value).toEqual(['2D-Bilder/b.jpg', '2D-Bilder/c2.png', '2D-Bilder/c10.png'])
		editor.addPhoto('2D-Bilder/b.jpg')
		expect(list().at(-1)).toEqual({ file: '2D-Bilder/b.jpg' })
		expect(editor.photos.value).toEqual(['2D-Bilder/c2.png', '2D-Bilder/c10.png'])
	})

	it('keeps the file ids of the photo folder for previews', async () => {
		const { editor } = setup([{ file: '2D-Bilder/a.jpg' }])
		listFolder.mockResolvedValueOnce([
			{ name: 'a.jpg', isFolder: false, fileid: '12' },
			{ name: 'b.jpg', isFolder: false, fileid: null },
		])
		await editor.loadPhotos()
		expect(editor.fileidOf('2D-Bilder/a.jpg')).toBe('12')
		expect(editor.fileidOf('2D-Bilder/b.jpg')).toBeNull()
		expect(editor.fileidOf('elsewhere/a.jpg')).toBeNull()
	})

	it('reports a failing list and keeps the old one', async () => {
		const { editor, note } = setup()
		listFolder.mockRejectedValueOnce(new Error('boom'))
		await editor.loadPhotos()
		expect(note.value.type).toBe('error')
		expect(note.value.text).toBe('The photos in the folder {folder} could not be loaded: {error}')
	})

	it('uses a pick inside the photo folder as it is', async () => {
		const { editor, list } = setup([{ text: 'x' }])
		picker.pick.mockResolvedValueOnce('/Projekt/EG/2D-Bilder/p.jpg')
		await editor.choosePhoto(0)
		expect(list()[0].file).toBe('2D-Bilder/p.jpg')
		expect(copyPhotoIntoFolder).not.toHaveBeenCalled()
	})

	it('copies a pick from elsewhere into the photo folder', async () => {
		const { editor, list } = setup([{ text: 'x' }])
		picker.pick.mockResolvedValueOnce('/Fotos/p.jpg')
		await editor.choosePhoto(0)
		expect(copyPhotoIntoFolder).toHaveBeenCalledWith({ path: '/Projekt/EG' }, [], '/Fotos/p.jpg')
		expect(list()[0].file).toBe('2D-Bilder/copy.jpg')
	})

	it('treats a photo in a subfolder of the photo folder as elsewhere', async () => {
		const { editor } = setup([{ text: 'x' }])
		picker.pick.mockResolvedValueOnce('/Projekt/EG/2D-Bilder/sub/p.jpg')
		await editor.choosePhoto(0)
		expect(copyPhotoIntoFolder).toHaveBeenCalled()
	})

	it('stays silent and changes nothing when the picker is closed', async () => {
		const { editor, list, note, calls } = setup([{ text: 'x' }])
		picker.pick.mockRejectedValueOnce(new FilePickerClosed('FilePicker: No nodes selected'))
		await editor.choosePhoto(0)
		expect(list()[0]).toEqual({ text: 'x' })
		expect(note.value).toBe(null)
		expect(calls.changed).toBe(0)
		expect(copyPhotoIntoFolder).not.toHaveBeenCalled()
	})

	it('shows any other picker error and changes nothing', async () => {
		const { editor, list, note, calls } = setup([{ text: 'x' }])
		picker.pick.mockRejectedValueOnce(new Error('Request failed'))
		await editor.choosePhoto(0)
		expect(list()[0]).toEqual({ text: 'x' })
		expect(note.value).toMatchObject({ type: 'error', text: 'The photo could not be chosen: {error}' })
		expect(calls.changed).toBe(0)
		expect(copyPhotoIntoFolder).not.toHaveBeenCalled()
	})

	it('shows a failed copy and changes nothing', async () => {
		const { editor, list, note, calls } = setup([{ text: 'x' }])
		picker.pick.mockResolvedValueOnce('/Fotos/p.jpg')
		copyPhotoIntoFolder.mockRejectedValueOnce(new Error('no space'))
		await editor.choosePhoto(0)
		expect(list()[0]).toEqual({ text: 'x' })
		expect(note.value).toMatchObject({ type: 'error', text: 'The photo could not be copied into the folder {folder}: {error}' })
		expect(calls.changed).toBe(0)
	})

	it('never opens the picker on a share page', async () => {
		const { editor, list } = setup([{ text: 'x' }], { canChoosePhoto: false })
		picker.pick.mockResolvedValueOnce('/Projekt/EG/2D-Bilder/p.jpg')
		await editor.choosePhoto(0)
		expect(picker.pick).not.toHaveBeenCalled()
		expect(list()[0]).toEqual({ text: 'x' })
	})

	it('leaves a marker alone that was removed while its photo was copied', async () => {
		const { editor, list } = setup([{ text: 'x' }, { text: 'y' }])
		picker.pick.mockResolvedValueOnce('/Fotos/p.jpg')
		const done = editor.choosePhoto(0)
		editor.remove(0)
		await done
		expect(list()).toEqual([{ text: 'y' }])
	})
})
