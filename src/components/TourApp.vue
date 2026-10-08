<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  The full-screen walkthrough: header, panorama, floor plan with spots,
  visits – and with write permission the editor. One panorama instance
  serves every layout; only the CSS grid around it changes.
-->
<template>
	<div class="pt-app" :class="layoutClass">
		<TourHeader :mode="!ready ? 'loading' : (editing ? 'edit' : 'view')"
			:title="editing ? t('Edit walkthrough') : title"
			:subline="subline"
			:mobile="mobile"
			:can-edit="canEdit"
			:sidebar-open="sidebarOpen"
			:dirty="dirty"
			:saving="saving"
			@toggle-sidebar="sidebarOpen = !sidebarOpen"
			@edit="startEditing"
			@stop-editing="stopEditing()"
			@save="save"
			@close="requestClose" />

		<!-- notes and hints for screen readers; NcNoteCard alone is not announced -->
		<p class="pt-live" aria-live="polite">
			{{ liveText }}
		</p>

		<div v-if="!ready" class="pt-state">
			<NcLoadingIcon v-if="!loadError" :size="44" />
			<NcEmptyContent v-else :name="t('The walkthrough cannot be opened')" :description="loadError">
				<template #icon>
					<NcIconSvgWrapper :path="mdiAlertCircleOutline" />
				</template>
			</NcEmptyContent>
		</div>

		<div v-else class="pt-body" :style="bodyStyle">
			<!-- viewer, desktop: side bar with floor plan and spot list -->
			<ViewerSidebar v-if="!editing && !mobile && sidebarOpen"
				v-model:width="sidebarWidth"
				:plan="planProps"
				:rows="spotRows"
				:editable="canEdit"
				@select="selectSpot"
				@rename="renameFromList"
				@pick-capture="pickCapture" />

			<!-- editor, desktop: the floor plan is the work area -->
			<div v-if="editing && !mobile" class="pt-editplan">
				<NoteBar v-if="note" :note="note" floating />
				<div class="pt-editplan__plan">
					<FloorPlan v-bind="editPlanProps" v-on="editPlanEvents" />
				</div>
				<ResizeHandle v-model="editorColumn"
					class="pt-editplan__resize"
					:min="EDITOR_MIN"
					:max="editorMax"
					:direction="-1"
					:label="t('Width of the editing column')" />
			</div>

			<PanoramaView ref="pano"
				class="pt-pano-area"
				:url="panoramaUrl"
				:correction="correction"
				:label="panoramaLabel"
				@heading="heading = $event" />
			<!-- no spot yet: explain instead of an endless loading circle -->
			<div v-if="!panoramaUrl" class="pt-pano-area pt-pano-empty">
				<NcEmptyContent :name="t('No spots yet')" :description="emptyText">
					<template #icon>
						<NcIconSvgWrapper :path="mdiMapMarkerPlusOutline" />
					</template>
					<template v-if="!editing && canEdit" #action>
						<NcButton variant="primary" @click="startEditing">
							{{ t('Edit') }}
						</NcButton>
					</template>
				</NcEmptyContent>
			</div>

			<!-- editor: everything to edit in one panel beside (desktop) or below (phone)
			     the panorama; phones switch between it and the floor plan -->
			<section v-if="editing" class="pt-panel">
				<TabBar v-if="mobile"
					v-model="editorTab"
					:tabs="editorTabs"
					:label="t('Edit walkthrough')"
					panel-id="pt-editor-panel"
					id-prefix="pt-editor-tab" />
				<NoteBar v-if="note && mobile" class="pt-note--panel" :note="note" />
				<div id="pt-editor-panel"
					:role="mobile ? 'tabpanel' : undefined"
					:aria-labelledby="mobile ? `pt-editor-tab-${editorTab}` : undefined"
					class="pt-panel__content"
					:class="{ 'pt-panel__content--plan': mobile && editorTab === 'plan' }">
					<FloorPlan v-if="mobile && editorTab === 'plan'" v-bind="editPlanProps" v-on="editPlanEvents" />
					<template v-else>
						<section v-if="tour.spots.length > 0" ref="spotSection" class="pt-panel__section">
							<h3 class="pt-panel__heading">
								{{ t('Spot') }}
							</h3>
							<SpotForm ref="spotForm"
								v-model:renameFiles="renameFilesOnSave"
								:spot="currentSpot"
								:capture="currentCapture"
								:captures="spotRows[spotIndex]?.captures ?? []"
								:suggestion="currentSpot ? suggestionFor(currentSpot) : null"
								@rename="rename"
								@pick="(file) => pickCapture(spotIndex, file)"
								@accept-suggestion="acceptSuggestion(currentSpot)"
								@set-date="setDate"
								@remove="removeCurrent" />
						</section>
						<section class="pt-panel__section">
							<NewImages :images="unplacedImages"
								:selected="selectedImage"
								:plan="tour.plan"
								:previews="!shared"
								:can-change-plan="!shared"
								:suggestions="pendingSuggestions.length"
								@select="selectImage"
								@accept-all="acceptAllSuggestions"
								@change-plan="switchPlan()" />
						</section>
					</template>
				</div>
			</section>

			<!-- viewer, phone: bottom sheet -->
			<PhoneSheet v-if="!editing && mobile"
				v-model:open="sheetOpen"
				v-model:tab="sheetTab"
				:plan="planProps"
				:rows="spotRows"
				:editable="canEdit"
				@select="selectSpot"
				@rename="renameFromList"
				@pick-capture="pickCapture">
				<SiteVisits v-if="showVisits" v-model="visit" :visits="visits" />
			</PhoneSheet>
		</div>

		<footer v-if="ready && !editing && !mobile" class="pt-footer">
			<SiteVisits v-if="showVisits" v-model="visit" :visits="visits" />
			<div class="pt-footer__tools">
				<NcButton variant="tertiary" :aria-label="t('Zoom out')" :title="t('Zoom out')" @click="pano?.zoomOut()">
					<template #icon>
						<NcIconSvgWrapper :path="mdiMinus" />
					</template>
				</NcButton>
				<NcButton variant="tertiary" :aria-label="t('Zoom in')" :title="t('Zoom in')" @click="pano?.zoomIn()">
					<template #icon>
						<NcIconSvgWrapper :path="mdiPlus" />
					</template>
				</NcButton>
				<NcButton variant="tertiary" :aria-label="t('Fullscreen')" :title="t('Fullscreen')" @click="pano?.toggleFullscreen()">
					<template #icon>
						<NcIconSvgWrapper :path="mdiFullscreen" />
					</template>
				</NcButton>
			</div>
		</footer>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, toRaw, watch } from 'vue'
import { showConfirmation } from '@nextcloud/dialogs'
import { Permission } from '@nextcloud/files'
import { mdiAlertCircleOutline, mdiFullscreen, mdiMapMarkerPlusOutline, mdiMinus, mdiPlus } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'

import FloorPlan from './FloorPlan.vue'
import NewImages from './NewImages.vue'
import NoteBar from './NoteBar.vue'
import PanoramaView from './PanoramaView.vue'
import PhoneSheet from './PhoneSheet.vue'
import ResizeHandle from './ResizeHandle.vue'
import SiteVisits from './SiteVisits.vue'
import SpotForm from './SpotForm.vue'
import TabBar from './TabBar.vue'
import TourHeader from './TourHeader.vue'
import ViewerSidebar from './ViewerSidebar.vue'
import { EDITOR_MAX, EDITOR_MIN, EDITOR_PLAN_MIN, stored, useLayout } from '../composables/useLayout.js'
import { Cancelled, choosePlan } from '../create.js'
import { ConflictError, getEtag, listFolder, locate, moveFile, readStart, readText, urlFor, writeText } from '../dav.js'
import { exifDate } from '../exif.js'
import { classifyFolder, newerPlan, pngNameFor } from '../folder.js'
import { displayDate, errorText, n, t } from '../l10n.js'
import { renameSpotFiles, undoMoves } from '../rename.js'
import { roomLabels, suggestName } from '../rooms.js'
import {
	TourError,
	addCapture,
	addSpot,
	alignYaw,
	bearing,
	captureAt,
	captureDays,
	capturesNewestFirst,
	dateFromFilename,
	firstCapture,
	formatDate,
	hasCameraName,
	parseTour,
	resolvePath,
	serializeTour,
	sphereCorrection,
	unplacedFiles,
} from '../tour.js'

const props = defineProps({
	/** the 360-Rundgang.json node from the Files app */
	node: { type: Object, required: true },
})
const emit = defineEmits(['close'])

// ---- state ---------------------------------------------------------------

const location = locate(props.node)
const canEdit = (props.node.permissions & Permission.UPDATE) !== 0
// share pages: no previews and no file picker without a login
const shared = props.node.source.includes('/public.php/')
const fileUrl = (relative) => urlFor(location.rootUrl, resolvePath(location.dir, relative))
const folderUrl = urlFor(location.rootUrl, location.dir)

const ready = ref(false)
const loadError = ref('')
const tour = ref(null)
const etag = ref(null)
const planSize = ref({ w: 1, h: 1 })
const planUrl = ref('')

const { mobile, sidebarOpen, sidebarWidth, sheetOpen, sheetTab, editorColumn } = useLayout()

const editing = ref(false)
const dirty = ref(false)
const saving = ref(false)
const selectedImage = ref(null)
const images = ref([])
/** phones only: 'plan' or 'edit' */
const editorTab = ref('edit')
const status = ref(null)

const pano = ref(null)
const spotForm = ref(null)
const spotSection = ref(null)
const heading = ref(0)
const spotIndex = ref(0)
/** 'latest' or YYYY-MM-DD */
const visit = ref('latest')
/** spot -> capture file picked in the spot list; keyed by the spot, so removing another spot changes nothing */
const picked = reactive(new Map())
/** viewer message in the header's second line */
const hint = ref('')

// ---- loading -------------------------------------------------------------

function loadImage(url, file) {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error(canEdit
			? t('The floor plan {file} was not found. Check the "plan" entry in {tour}.', { file, tour: props.node.basename })
			: t('The floor plan {file} was not found.', { file })))
		img.src = url
	})
}

/** Show a floor plan. `fresh`: the file may have changed under the same name. */
async function setPlan(plan, fresh = false) {
	const url = fresh ? `${fileUrl(plan)}?v=${Date.now()}` : fileUrl(plan)
	const img = await loadImage(url, plan)
	planUrl.value = url
	planSize.value = { w: img.naturalWidth, h: img.naturalHeight }
}

async function load() {
	const { text, etag: tag } = await readText(props.node.encodedSource)
	const next = parseTour(text)
	await setPlan(next.plan)
	etag.value = tag
	tour.value = next
	picked.clear()
}

onMounted(async () => {
	try {
		await load()
		if (tour.value.spots.length === 0 && !canEdit) {
			throw new TourError(t('No spots have been placed in this walkthrough yet.'))
		}
		ready.value = true
		if (tour.value.spots.length === 0) {
			startEditing()
		}
	} catch (e) {
		loadError.value = e instanceof TourError ? e.problems.join(' ') : errorText(e)
	}
})

// ---- layout --------------------------------------------------------------

const layoutClass = computed(() => ({
	'pt-app--mobile': mobile.value,
	'pt-app--editing': editing.value,
}))
const bodyStyle = computed(() => {
	if (mobile.value) {
		return {}
	}
	if (editing.value) {
		return { '--pt-editor-column': `${editorColumn.value}px` }
	}
	return sidebarOpen.value ? { gridTemplateColumns: `${sidebarWidth.value}px minmax(0, 1fr)` } : {}
})

// the editor's right column may grow until the floor plan beside it gets too small
const viewportWidth = ref(window.innerWidth)
const onResize = () => { viewportWidth.value = window.innerWidth }
window.addEventListener('resize', onResize)
const editorMax = computed(() => Math.max(EDITOR_MIN, Math.min(EDITOR_MAX, viewportWidth.value - EDITOR_PLAN_MIN)))

// a phone turned to landscape gets the desktop editor, which has no plan tab
watch(mobile, (isMobile) => {
	if (!isMobile && editorTab.value === 'plan') {
		editorTab.value = 'edit'
	}
})

// ---- what is shown -------------------------------------------------------

const title = computed(() => tour.value?.title || props.node.dirname.split('/').pop())
const visitDay = computed(() => visit.value === 'latest' ? null : visit.value)

function shownCapture(spot) {
	const file = picked.get(spot)
	return (file && spot.captures.find(c => c.file === file)) || captureAt(spot, visitDay.value)
}

const currentSpot = computed(() => tour.value?.spots[spotIndex.value] ?? null)
const currentCapture = computed(() => {
	const spot = currentSpot.value
	// a spot first captured after the chosen visit shows its earliest capture
	return spot ? (shownCapture(spot) ?? firstCapture(spot)) : null
})
// an image picked under "New images" is shown right away, before it is placed
const previewing = computed(() => editing.value && !!selectedImage.value)
const panoramaUrl = computed(() => {
	if (previewing.value) {
		return fileUrl(selectedImage.value)
	}
	return currentCapture.value ? fileUrl(currentCapture.value.file) : null
})
const panoramaLabel = computed(() => {
	if (previewing.value) {
		return t('{file} selected – now click on the floor plan.', { file: selectedImage.value })
	}
	return currentCapture.value
		? t('360° panorama: {name}, {date}. Use the arrow keys to look around.', { name: currentSpot.value.name, date: displayDate(currentCapture.value.date) })
		: ''
})
const correction = computed(() => {
	if (previewing.value) {
		return { pan: 0 }
	}
	return currentCapture.value ? sphereCorrection(currentCapture.value) : null
})

const visits = computed(() => tour.value
	? [
		...captureDays(tour.value).map(day => ({
			value: day,
			label: displayDate(day, false),
			title: t('Show every spot as it was on {date}', { date: displayDate(day, false) }),
		})),
		{ value: 'latest', label: t('Latest'), title: t('Show every spot with its latest capture') },
	]
	: [])
// one visit and "Latest" would show the same
const showVisits = computed(() => visits.value.length > 2)

const spotState = (index, shown) => index === spotIndex.value ? 'current' : (shown ? 'normal' : 'missing')

const planSpots = computed(() => (tour.value?.spots ?? []).map((spot, index) => {
	const shown = editing.value ? true : shownCapture(spot)
	let label
	if (editing.value) {
		label = t('{name} – drag to move', { name: spot.name })
	} else if (shown) {
		label = `${spot.name} · ${displayDate(shown.date, false)}`
	} else {
		label = t('{name} · from {date} on', { name: spot.name, date: displayDate(firstCapture(spot).date, false) })
	}
	return { x: spot.x, y: spot.y, label, state: spotState(index, shown) }
}))

const spotRows = computed(() => (tour.value?.spots ?? []).map((spot, index) => {
	const shown = shownCapture(spot)
	const sorted = capturesNewestFirst(spot)
	return {
		name: spot.name,
		date: shown ? displayDate(shown.date) : t('from {date} on', { date: displayDate(sorted.at(-1).date, false) }),
		state: spotState(index, shown),
		capturesLabel: t('{count} captures of {name}', { count: spot.captures.length, name: spot.name }),
		captures: sorted.map((capture, i) => ({
			value: capture.file,
			label: i === 0 ? t('{date} (latest)', { date: displayDate(capture.date) }) : displayDate(capture.date),
			checked: (editing.value ? currentCapture.value : shown) === capture,
		})),
	}
}))

const planProps = computed(() => ({
	src: planUrl.value,
	size: planSize.value,
	spots: planSpots.value,
	heading: heading.value,
}))
const editPlanProps = computed(() => ({
	...planProps.value,
	// the cone belongs to the selected spot, not to an image being previewed
	heading: previewing.value ? null : heading.value,
	editable: true,
	crosshair: !!selectedImage.value,
}))
const editPlanEvents = { select: onPlanSelect, move: onPlanMove, place: onPlanPlace }

const subline = computed(() => {
	if (!ready.value) {
		return ''
	}
	if (editing.value) {
		return dirty.value ? t('{title} · unsaved changes', { title: title.value }) : title.value
	}
	if (hint.value) {
		return hint.value
	}
	const spot = currentSpot.value
	const capture = currentCapture.value
	if (!spot || !capture) {
		return ''
	}
	if (visitDay.value && capture.date.slice(0, 10) !== visitDay.value && !picked.has(spot)) {
		return t('No capture here on {day} – showing the one from {date}.', { day: displayDate(visitDay.value, false), date: displayDate(capture.date, false) })
	}
	return `${spot.name} · ${displayDate(capture.date)}`
})

function selectSpot(index) {
	hint.value = ''
	spotIndex.value = index
}

function pickCapture(index, file) {
	picked.set(tour.value.spots[index], file)
	hint.value = ''
	spotIndex.value = index
}

watch(visit, () => {
	picked.clear()
	hint.value = ''
})

// ---- editing -------------------------------------------------------------

/** images being placed (their date is still read): not offered twice */
const pending = reactive(new Set())

const unplacedImages = computed(() => {
	if (!tour.value) {
		return []
	}
	const free = new Set(unplacedFiles(tour.value, images.value.map(i => i.path)))
	return images.value.filter(i => free.has(i.path) && !pending.has(i.path))
})

// phones only: the floor plan and the editing panel do not fit side by side
const editorTabs = computed(() => [
	{ id: 'plan', label: t('Floor plan') },
	{ id: 'edit', label: t('Spot and images') },
])

const note = computed(() => {
	if (selectedImage.value) {
		return { type: 'info', text: t('{file} selected – now click on the floor plan.', { file: selectedImage.value }), action: t('Deselect'), onAction: () => { selectedImage.value = null } }
	}
	return status.value
})
// the editor's notes, in the viewer the second header line (spot, date, hints)
const liveText = computed(() => editing.value ? (note.value?.text ?? '') : subline.value)

/**
 * Show a note in the editor. Success and plain info notes go away by
 * themselves; notes asking for something stay until replaced.
 */
function setStatus(type, text, action = null, onAction = null, timeout = undefined) {
	const shown = { type, text, action, onAction }
	status.value = shown
	const hideAfter = timeout ?? (type === 'success' ? 4000 : (type === 'info' && !action ? 8000 : 0))
	if (hideAfter) {
		setTimeout(() => {
			if (status.value === shown) {
				status.value = null
			}
		}, hideAfter)
	}
}

// counts changes, so a change made while saving is not taken as saved
let revision = 0

function changed() {
	revision++
	dirty.value = true
}

/** The tour's folder as create.js expects it. */
const folder = {
	source: location.rootUrl + location.dir,
	path: location.dir,
	root: props.node.root,
	owner: props.node.owner,
	permissions: props.node.permissions,
}
let folderEntries = []

// Only the folder itself: subfolders often hold copies (compressed versions)
async function loadImages() {
	try {
		folderEntries = await listFolder(folderUrl)
		const panoramas = new Set(classifyFolder(folderEntries).panoramas)
		images.value = folderEntries
			.filter(e => panoramas.has(e.name))
			.map(e => ({ path: e.name, fileid: e.fileid, mtime: e.mtime }))
			.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
		const newer = newerPlan(folderEntries, tour.value.plan)
		if (newer) {
			setStatus('info', t('There is a newer floor plan in the folder: {file}', { file: newer }), t('Use it'), () => switchPlan(newer))
		}
		loadRooms()
	} catch (e) {
		setStatus('error', t('The images in this folder could not be loaded: {error}', { error: errorText(e) }))
	}
}

async function switchPlan(file = null) {
	try {
		const plan = await choosePlan(folder, folderEntries, { auto: false, file })
		// a PDF converted again keeps the PNG's name
		await setPlan(plan, true)
		tour.value.plan = plan
		folderEntries = await listFolder(folderUrl)
		loadRooms()
		changed()
		setStatus('success', t('Floor plan changed – not saved yet. The spots keep their places.'))
	} catch (e) {
		if (!(e instanceof Cancelled)) {
			setStatus('error', t('The floor plan could not be changed: {error}', { error: errorText(e) }))
		}
	}
}

const emptyText = computed(() => editing.value
	? t('Pick an image under "New images" and click on the floor plan.')
	: t('No spots have been placed in this walkthrough yet.'))

function startEditing() {
	editing.value = true
	hint.value = ''
	// an empty walkthrough starts with its images
	editorTab.value = tour.value.spots.length > 0 && mobile.value ? 'plan' : 'edit'
	loadImages()
}

/**
 * Leave the editor, asking about unsaved changes. When the walkthrough is
 * closed anyway, discarding needs no reload.
 *
 * @return {Promise<boolean>} false if the user stays in the editor
 */
async function stopEditing({ closing = false } = {}) {
	if (dirty.value) {
		// the dialog returns focus where it was; the editor's buttons are gone by
		// then, the walkthrough's own frame is not
		document.querySelector('.photosphere-tours-overlay')?.focus()
		const keep = await showConfirmation({
			name: t('Save changes?'),
			text: t('You changed the walkthrough but have not saved it yet.'),
			labelConfirm: t('Save'),
			labelReject: t('Discard'),
		})
		if (keep && !(await save())) {
			return false
		}
		if (!keep && !closing && !(await reload())) {
			// it cannot be read again: show why instead of the discarded state
			loadError.value = status.value?.text ?? ''
			ready.value = false
		}
	}
	editing.value = false
	selectedImage.value = null
	status.value = null
	// the focused editor control is gone: keep keyboard users inside the walkthrough
	await nextTick()
	if (!document.activeElement || document.activeElement === document.body) {
		document.querySelector('.photosphere-tours-overlay')?.focus()
	}
	return true
}

/** @return {Promise<boolean>} false if the walkthrough could not be read */
async function reload() {
	try {
		await load()
	} catch (e) {
		setStatus('error', t('The walkthrough could not be loaded again: {error}', { error: e instanceof TourError ? e.problems.join(' ') : errorText(e) }))
		return false
	}
	dirty.value = false
	status.value = null
	renamedSpots.clear()
	spotIndex.value = Math.min(spotIndex.value, Math.max(0, tour.value.spots.length - 1))
	if (editing.value) {
		loadImages()
	}
	return true
}

/**
 * Capture date when the file name has none: the camera's EXIF date (read
 * from the first 64 KB), else the file's modification time.
 */
async function fallbackDate(path) {
	if (dateFromFilename(path)) {
		return null
	}
	try {
		const date = exifDate(await readStart(fileUrl(path)))
		if (date) {
			return date
		}
	} catch {
		// no range support or no EXIF: use the file time
	}
	const image = images.value.find(i => i.path === path)
	return formatDate(image?.mtime ?? new Date())
}

function selectImage(path) {
	selectedImage.value = path
	if (path && mobile.value) {
		editorTab.value = 'plan'
	}
}

/**
 * A click on the plan beside the selected spot: what the panorama shows right
 * now lies in that direction. The cone turns there, the picture stays still.
 */
async function setDirection(target) {
	const spot = currentSpot.value
	const capture = currentCapture.value
	const before = capture.yaw
	capture.yaw = alignYaw(capture, pano.value.yaw(), spot, target, planSize.value)
	changed()
	await nextTick()
	pano.value.lookAt(bearing(spot, target, planSize.value))
	setStatus('success', t('View direction set – not saved yet'), t('Undo'), () => undoDirection(capture, before), 10000)
}

async function undoDirection(capture, before) {
	// keep the picture still: the view moves by the same angle as the correction
	const view = pano.value.yaw() * 180 / Math.PI
	const delta = capture.yaw - before
	capture.yaw = before
	changed()
	status.value = null
	await nextTick()
	pano.value.lookAt(view + delta)
}

/**
 * Room names of the floor plan, when it was made from a PDF in the folder
 * (the PNG next to it has the same name). Read in the background, once per
 * version of the PDF.
 */
const planRooms = shallowRef([])
let roomsKey = null
let roomsRequest = 0

async function loadRooms() {
	const source = pdfSourceOf(tour.value.plan)
	const key = source ? `${source}|${folderEntries.find(e => e.name === source)?.mtime?.getTime()}` : ''
	if (key === roomsKey) {
		return
	}
	roomsKey = key
	planRooms.value = []
	const request = ++roomsRequest
	if (!source) {
		return
	}
	try {
		const { pdfText } = await import(/* webpackChunkName: "pdf" */ '../pdf.js')
		const rooms = roomLabels(await pdfText(fileUrl(source)))
		// a plan switched in the meantime has its own request
		if (request === roomsRequest) {
			planRooms.value = rooms
		}
	} catch {
		// no suggestions then; try again next time
		roomsKey = null
	}
}

function pdfSourceOf(plan) {
	if (plan.includes('/') || !/\.png$/i.test(plan)) {
		return null
	}
	return folderEntries.find(e => /\.pdf$/i.test(e.name) && pngNameFor(e.name) === plan)?.name ?? null
}

/** Run `task` with the selected image taken out of "New images" until it is placed. */
async function placeSelected(task) {
	const file = selectedImage.value
	selectedImage.value = null
	pending.add(file)
	try {
		return await task(file, await fallbackDate(file))
	} finally {
		pending.delete(file)
	}
}

/**
 * A short click on a free place of the plan: places the picked image there,
 * otherwise turns the selected spot's view direction towards it.
 */
async function onPlanPlace(point) {
	if (!selectedImage.value) {
		if (currentSpot.value) {
			setDirection(point)
		}
		return
	}
	await placeSelected((file, date) => addSpot(tour.value, { ...point, file, fallbackDate: date }))
	spotIndex.value = tour.value.spots.length - 1
	const spot = currentSpot.value
	const room = suggestionFor(spot)
	if (room) {
		setStatus('info', t('The floor plan says "{name}" here.', { name: room }), t('Use it'), () => acceptSuggestion(spot))
	}
	changed()
}

/**
 * The room name the floor plan has at a spot, offered while the spot still
 * carries the camera's file name. Nothing is changed until it is taken over.
 */
function suggestionFor(spot) {
	if (planRooms.value.length === 0 || !hasCameraName(spot)) {
		return null
	}
	const room = suggestName(planRooms.value, spot, planSize.value)
	return room && room !== spot.name ? room : null
}

const pendingSuggestions = computed(() => (tour.value?.spots ?? []).filter(spot => suggestionFor(spot)))

/** Take the plan's name, then let the user correct it before saving. */
async function acceptSuggestion(spot) {
	const room = suggestionFor(spot)
	if (!room) {
		return
	}
	spot.name = room
	renamedSpots.add(toRaw(spot))
	changed()
	status.value = null
	spotIndex.value = tour.value.spots.indexOf(spot)
	editorTab.value = 'edit'
	await nextTick()
	spotForm.value?.focusName()
}

function acceptAllSuggestions() {
	const spots = pendingSuggestions.value
	for (const spot of spots) {
		spot.name = suggestionFor(spot)
		renamedSpots.add(toRaw(spot))
	}
	changed()
	setStatus('info', n('{count} name taken from the floor plan – check it under "Spot" before saving.', '{count} names taken from the floor plan – check them under "Spot" before saving.', spots.length))
}

async function onPlanSelect(index) {
	const spot = tour.value.spots[index]
	if (selectedImage.value) {
		const capture = await placeSelected((file, date) => addCapture(spot, { file, fallbackDate: date }))
		picked.set(spot, capture.file)
		changed()
		// a click just beside a spot lands here too: say so and offer the way back
		setStatus('info', t('Added as another capture of "{name}".', { name: spot.name }), t('Undo'), () => undoCapture(spot, capture.file), 10000)
		spotIndex.value = index
		return
	}
	spotIndex.value = index
	// a spot picked on the plan: show its form even when the panel was scrolled
	// down to the images (not while placing images, that would lose the place)
	if (!mobile.value) {
		await nextTick()
		spotSection.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
	}
}

function undoCapture(spot, file) {
	const index = spot.captures.findIndex(c => c.file === file)
	if (index >= 0 && spot.captures.length > 1) {
		spot.captures.splice(index, 1)
		picked.delete(spot)
		changed()
	}
	status.value = null
}

function onPlanMove(index, point) {
	Object.assign(tour.value.spots[index], point)
	changed()
}

/** spots (raw objects) whose files should follow a new name on the next save */
const renamedSpots = new Set()
const renameFilesOnSave = stored('renameFiles', true)

function rename(name) {
	currentSpot.value.name = name
	renamedSpots.add(toRaw(currentSpot.value))
	changed()
}

/** Rename from the spot list; outside the editor it is saved right away. */
async function renameFromList(index, name) {
	const spot = tour.value.spots[index]
	if (!name.trim() || name === spot.name) {
		return
	}
	spot.name = name.trim()
	renamedSpots.add(toRaw(spot))
	changed()
	if (!editing.value) {
		hint.value = (await save())
			? t('"{name}" saved.', { name: spot.name })
			: (status.value?.text ?? '')
	}
}

function setDate(date) {
	currentCapture.value.date = date
	changed()
}

async function removeCurrent() {
	const spot = currentSpot.value
	const capture = currentCapture.value
	const last = spot.captures.length === 1
	const confirmed = await showConfirmation({
		name: last
			? t('Remove spot "{name}"?', { name: spot.name })
			: t('Remove the capture from {date}?', { date: displayDate(capture.date) }),
		text: last
			? t('The spot disappears from the walkthrough. Its image file stays in the folder.')
			: t('The capture disappears from the walkthrough. The image file stays in the folder.'),
		labelConfirm: t('Remove'),
		labelReject: t('Keep'),
	})
	if (!confirmed) {
		return
	}
	if (last) {
		tour.value.spots.splice(spotIndex.value, 1)
		spotIndex.value = Math.max(0, spotIndex.value - 1)
		renamedSpots.delete(toRaw(spot))
	} else {
		spot.captures.splice(spot.captures.indexOf(capture), 1)
	}
	picked.delete(spot)
	changed()
}

// ---- saving --------------------------------------------------------------

const moveRelative = (from, to) => moveFile(fileUrl(from), fileUrl(to))

/** Keep the spot list's capture choice on files that were moved (or moved back). */
function followMoves(moves) {
	for (const [spot, file] of picked) {
		const move = moves.find(m => m.from === file || m.to === file)
		if (move && move.capture.file !== file) {
			picked.set(spot, move.capture.file)
		}
	}
}

/**
 * Rename image files if needed, then write the walkthrough. If writing fails
 * the files are moved back, so the saved walkthrough still matches them.
 */
async function saveNow() {
	saving.value = true
	const startedAt = revision
	let moves = []
	try {
		let failed = []
		if (renameFilesOnSave.value && renamedSpots.size > 0) {
			// nothing is renamed when the save would fail anyway
			if (etag.value && (await getEtag(props.node.encodedSource)) !== etag.value) {
				throw new ConflictError()
			}
			const renamed = { has: (spot) => renamedSpots.has(toRaw(spot)) }
			;({ moves, failed } = await renameSpotFiles(tour.value.spots, renamed, moveRelative))
			followMoves(moves)
		}
		etag.value = await writeText(props.node.encodedSource, serializeTour(tour.value), etag.value ?? undefined)
		renamedSpots.clear()
		if (moves.length > 0 && editing.value) {
			// "New images" must not list the old names
			loadImages()
		}
		if (revision === startedAt) {
			dirty.value = false
		}
		if (failed.length > 0) {
			setStatus('warning', n('Saved. {count} image file could not be renamed and keeps its name.', 'Saved. {count} image files could not be renamed and keep their names.', failed.length))
		} else {
			setStatus('success', t('Walkthrough saved'))
		}
		return true
	} catch (e) {
		if (moves.length > 0) {
			await undoMoves(moves, moveRelative)
			followMoves(moves)
		}
		if (e instanceof ConflictError) {
			setStatus('error', t('Someone else changed the walkthrough in the meantime, so it cannot be saved. Reload it – your changes will be lost.'), t('Reload'), () => reload())
		} else {
			setStatus('error', t('Saving failed: {error}. Check your connection and try again.', { error: errorText(e) }))
		}
		return false
	} finally {
		saving.value = false
	}
}

// one save at a time: two quick renames in the list would otherwise both
// write with the same ETag and the second would report a conflict
let saveQueue = Promise.resolve(true)

function save() {
	saveQueue = saveQueue.then(saveNow)
	return saveQueue
}

// ---- closing and keyboard ------------------------------------------------

async function requestClose() {
	if (editing.value && !(await stopEditing({ closing: true }))) {
		return
	}
	emit('close')
}

function onKeyDown(e) {
	if (e.key !== 'Escape' || e.defaultPrevented || document.fullscreenElement) {
		return
	}
	// Nextcloud dialogs handle their own Escape (the walkthrough itself is a
	// dialog too, so only look outside of it)
	const ownDialog = document.querySelector('.photosphere-tours-overlay')
	const otherDialog = [...document.querySelectorAll('.modal-mask, [role="dialog"][aria-modal="true"]')]
		.some(el => el !== ownDialog && !ownDialog?.contains(el))
	if (otherDialog) {
		return
	}
	if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
		return
	}
	e.preventDefault()
	if (selectedImage.value) {
		selectedImage.value = null
	} else if (editing.value) {
		stopEditing()
	} else if (mobile.value && sheetOpen.value) {
		sheetOpen.value = false
	} else {
		requestClose()
	}
}

// closing the browser tab with unsaved changes asks first
function onBeforeUnload(e) {
	if (dirty.value) {
		e.preventDefault()
		e.returnValue = ''
	}
}

document.addEventListener('keydown', onKeyDown)
window.addEventListener('beforeunload', onBeforeUnload)
onBeforeUnmount(() => {
	document.removeEventListener('keydown', onKeyDown)
	window.removeEventListener('beforeunload', onBeforeUnload)
	window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.pt-app {
	/* layout sizes of the editor: panorama height and the column beside the plan */
	--pt-editor-column: 520px;
	--pt-editor-pano: 292px;
	--pt-phone-pano: 200px;

	display: grid;
	grid-template-rows: auto minmax(0, 1fr) auto;
	width: 100%;
	height: 100%;
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-family: var(--font-face);
	font-size: var(--default-font-size);
	line-height: var(--default-line-height);
}

/* read by screen readers only */
.pt-live {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.pt-state {
	display: flex;
	align-items: center;
	justify-content: center;
}

/* ---- body grid: one panorama, several layouts ---- */
.pt-body {
	display: grid;
	grid-template-areas: 'pano';
	grid-template-columns: minmax(0, 1fr);
	min-height: 0;
}

.pt-body:has(.pt-side) {
	grid-template-areas: 'side pano';
}

.pt-app--editing .pt-body {
	grid-template-areas: 'plan pano' 'plan panel';
	grid-template-columns: minmax(0, 1fr) var(--pt-editor-column);
	grid-template-rows: var(--pt-editor-pano) minmax(0, 1fr);
}

.pt-app--mobile .pt-body {
	grid-template-areas: 'pano' 'sheet';
	grid-template-columns: minmax(0, 1fr);
	grid-template-rows: minmax(0, 1fr) auto;
}

.pt-app--mobile.pt-app--editing .pt-body {
	grid-template-areas: 'pano' 'panel';
	grid-template-rows: var(--pt-phone-pano) minmax(0, 1fr);
}

.pt-pano-area {
	grid-area: pano;
}

.pt-pano-empty {
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-main-background);
}

/* ---- editor ---- */
.pt-editplan {
	position: relative;
	display: flex;
	flex-direction: column;
	grid-area: plan;
	min-height: 0;
	padding: calc(var(--default-grid-baseline) * 4);
	background: var(--color-background-dark);
}

.pt-editplan__plan {
	flex-grow: 1;
	min-height: 0;
}

.pt-editplan__resize {
	inset-inline-end: -4px;
}

@media (pointer: coarse) {
	.pt-editplan__resize {
		inset-inline-end: -12px;
	}
}

.pt-panel__section + .pt-panel__section {
	margin-top: calc(var(--default-grid-baseline) * 6);
	padding-top: calc(var(--default-grid-baseline) * 4);
	border-top: 1px solid var(--color-border);
}

.pt-panel__heading {
	margin: 0 0 calc(var(--default-grid-baseline) * 3);
	font-size: var(--default-font-size);
	font-weight: 600;
}

.pt-note--panel {
	padding: calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 2) 0;
}

.pt-panel {
	display: flex;
	flex-direction: column;
	grid-area: panel;
	min-height: 0;
	border-inline-start: 1px solid var(--color-border);
}

.pt-panel__content {
	flex-grow: 1;
	min-height: 0;
	overflow: auto;
	padding: calc(var(--default-grid-baseline) * 4);
}

.pt-panel__content--plan {
	overflow: hidden;
	padding: calc(var(--default-grid-baseline) * 2);
}

/* ---- footer ---- */
.pt-footer {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
	min-height: var(--header-height, 50px);
	padding: 0 calc(var(--default-grid-baseline) * 3) 0 calc(var(--default-grid-baseline) * 4);
	border-top: 1px solid var(--color-border);
}

.pt-footer__tools {
	display: flex;
	gap: var(--default-grid-baseline);
	margin-inline-start: auto;
}
</style>
