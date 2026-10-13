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
			:map-url="tour?.location && !shared ? osmUrl(tour.location) : null"
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
				v-model:plan-height="sidebarPlanHeight"
				:plan="planProps"
				:rows="viewerRows"
				:list-title="listTitle"
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
				:markers="shownMarkers"
				:placing="editing && !!markerPlacing && !previewing"
				:editable="editing"
				@marker-click="onMarkerClick"
				@marker-move="dropMarker"
				@pick="onMarkerPick"
				@heading="heading = $event" />
			<!-- editor, desktop: divider on the panorama's lower edge (zero-height anchor in the panorama cell) -->
			<div v-if="editing && !mobile" class="pt-pano-rows">
				<ResizeHandle :model-value="editorPanoramaShown"
					class="pt-pano-rows__handle"
					orientation="horizontal"
					:min="PANORAMA_HEIGHT_MIN"
					:max="editorPanoramaMax"
					:label="t('Height of the panorama')"
					@update:model-value="editorPanoramaHeight = $event" />
			</div>
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
						<section v-if="currentCapture" class="pt-panel__section">
							<MarkerSection ref="markerSection"
								:markers="editedMarkers"
								:photos="newPhotos"
								:placing="markerPlacing"
								:opened="openedMarker"
								:thumb-for="markerThumb"
								:can-choose-photo="!shared"
								@open="onMarkerListOpen"
								@place-new="placeMarker"
								@place="placeExistingMarker"
								@cancel-place="cancelMarkerPlace"
								@edit-text="editMarkerText"
								@choose-photo="chooseMarkerPhoto"
								@remove-photo="removeMarkerPhoto"
								@remove="removeMarker"
								@add-photo="addMarkerPhoto" />
						</section>
						<section class="pt-panel__section">
							<NewImages :images="newImages"
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
				:rows="viewerRows"
				:editable="canEdit"
				@select="selectSpot"
				@rename="renameFromList"
				@pick-capture="pickCapture">
				<MarkerButton v-if="shownMarkers.length > 0"
					:count="shownMarkers.length"
					:unplaced="unplacedCount"
					@open="openGallery" />
				<SiteVisits v-if="showVisits" v-model="visit" :visits="visits" />
			</PhoneSheet>
		</div>

		<footer v-if="ready && !editing && !mobile" class="pt-footer">
			<SiteVisits v-if="showVisits" v-model="visit" :visits="visits" />
			<div class="pt-footer__tools">
				<MarkerButton v-if="shownMarkers.length > 0"
					:count="shownMarkers.length"
					:unplaced="unplacedCount"
					@open="openGallery" />
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

		<MarkerDialog v-model:open="markerOpen"
			v-model:index="markerIndex"
			:markers="shownMarkers"
			:url-for="fileUrl" />
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, toRaw, watch, watchEffect } from 'vue'
import { showConfirmation } from '@nextcloud/dialogs'
import { generateUrl } from '@nextcloud/router'
import { Permission } from '@nextcloud/files'
import { mdiAlertCircleOutline, mdiFullscreen, mdiMapMarkerPlusOutline, mdiMinus, mdiPlus } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'

import FloorPlan from './FloorPlan.vue'
import MarkerButton from './MarkerButton.vue'
import MarkerDialog from './MarkerDialog.vue'
import MarkerSection from './MarkerSection.vue'
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
import { EDITOR_MAX, EDITOR_MIN, EDITOR_PLAN_MIN, PANORAMA_HEIGHT_MIN, stored, useLayout } from '../composables/useLayout.js'
import { useCaptureTimes } from '../composables/useCaptureTimes.js'
import { useMarkerEditing } from '../composables/useMarkerEditing.js'
import { withCaptureTimes } from '../captureTimes.js'
import { Cancelled, choosePlan } from '../create.js'
import { ConflictError, getEtag, listFolder, locate, moveFile, readStart, readText, urlFor, writeText } from '../dav.js'
import { exifDate, exifGps } from '../exif.js'
import { classifyFolder, newerPlan, pngNameFor } from '../folder.js'
import { displayDate, errorText, n, t } from '../l10n.js'
import { isPlaced, markersOf, removeEmptyMarkers, withoutEmptyMarkers } from '../markers.js'
import { renameSpotFiles, undoMoves } from '../rename.js'
import { roomLabels, suggestName } from '../rooms.js'
import {
	TourError,
	addCapture,
	addSpot,
	alignYaw,
	bearing,
	captureAt,
	captureDate,
	captureDays,
	capturesNewestFirst,
	firstCapture,
	hasCameraName,
	osmUrl,
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

const { mobile, sidebarOpen, sidebarWidth, sidebarPlanHeight, sheetOpen, sheetTab, editorColumn, editorPanoramaHeight } = useLayout()

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
/** 'all' or YYYY-MM-DD */
const visit = ref('all')
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
		return {
			'--pt-editor-column': `${editorColumn.value}px`,
			'--pt-editor-pano': `${editorPanoramaShown.value}px`,
		}
	}
	return sidebarOpen.value ? { gridTemplateColumns: `${sidebarWidth.value}px minmax(0, 1fr)` } : {}
})

// the editor's right column may grow until the floor plan beside it gets too small
const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)
const onResize = () => {
	viewportWidth.value = window.innerWidth
	viewportHeight.value = window.innerHeight
}
window.addEventListener('resize', onResize)
const editorMax = computed(() => Math.max(EDITOR_MIN, Math.min(EDITOR_MAX, viewportWidth.value - EDITOR_PLAN_MIN)))
// the panorama may grow until the editing panel below it gets too small; the stored height
// is only changed by the user, a small window just shows less of it
const editorPanoramaMax = computed(() => Math.max(PANORAMA_HEIGHT_MIN, viewportHeight.value - 280))
const editorPanoramaShown = computed(() => Math.min(Math.max(editorPanoramaHeight.value, PANORAMA_HEIGHT_MIN), editorPanoramaMax.value))

// a phone turned to landscape gets the desktop editor, which has no plan tab
watch(mobile, (isMobile) => {
	if (!isMobile && editorTab.value === 'plan') {
		editorTab.value = 'edit'
	}
})

// ---- what is shown -------------------------------------------------------

const title = computed(() => tour.value?.title || props.node.dirname.split('/').pop())
const visitDay = computed(() => visit.value === 'all' ? null : visit.value)

function shownCapture(spot) {
	const file = picked.get(spot)
	return (file && spot.captures.find(c => c.file === file)) || captureAt(spot, visitDay.value)
}

// a spot first captured after the chosen visit (hidden then) falls back to its earliest capture
const displayedCapture = (spot) => shownCapture(spot) ?? firstCapture(spot)

const currentSpot = computed(() => tour.value?.spots[spotIndex.value] ?? null)
const currentCapture = computed(() => currentSpot.value ? displayedCapture(currentSpot.value) : null)
// an image picked under "New images" is shown right away, before it is placed
// an image being placed stays in view until its spot is shown
const placing = ref(null)
const previewImage = computed(() => selectedImage.value ?? placing.value)
const previewing = computed(() => editing.value && !!previewImage.value)
const panoramaUrl = computed(() => {
	if (previewing.value) {
		return fileUrl(previewImage.value)
	}
	return currentCapture.value ? fileUrl(currentCapture.value.file) : null
})
const panoramaLabel = computed(() => {
	if (previewing.value) {
		return t('{file} selected – now click on the floor plan.', { file: previewImage.value })
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

// markers of the shown capture; none while the editor previews a picked image.
// One shared empty array: a new [] per evaluation would reset the panorama's markers on every render.
const NO_MARKERS = []
const shownMarkers = computed(() => {
	const list = previewing.value ? NO_MARKERS : markersOf(currentCapture.value)
	return list.length > 0 ? list : NO_MARKERS
})
const unplacedCount = computed(() => shownMarkers.value.filter(m => !isPlaced(m)).length)
const markerOpen = ref(false)
const markerIndex = ref(0)
function openMarker(index) {
	markerIndex.value = index
	markerOpen.value = true
}
// photos that belong to the whole spot first, otherwise the first marker
function openGallery() {
	openMarker(Math.max(0, shownMarkers.value.findIndex(m => !isPlaced(m))))
}
watch([currentCapture, previewing], () => { markerOpen.value = false })

const visits = computed(() => tour.value
	? [
		{ value: 'all', label: t('All'), title: t('All spots with their latest capture; pick other captures in the list') },
		...captureDays(tour.value).map(day => ({
			value: day,
			label: displayDate(day, false),
			title: t('Only the spots captured on {date}', { date: displayDate(day, false) }),
		})),
	]
	: [])
// one visit and "All" would show the same
const showVisits = computed(() => visits.value.length > 2)

const spotState = (index) => index === spotIndex.value ? 'current' : 'normal'

const planSpots = computed(() => (tour.value?.spots ?? []).map((spot, index) => {
	const label = editing.value
		? t('{name} – drag or move with the arrow keys', { name: spot.name })
		: `${spot.name} · ${displayDate(displayedCapture(spot).date, false)}`
	return { key: index, x: spot.x, y: spot.y, label, state: spotState(index) }
}))

const spotRows = computed(() => (tour.value?.spots ?? []).map((spot, index) => {
	const shown = displayedCapture(spot)
	const sorted = capturesNewestFirst(spot)
	return {
		name: spot.name,
		date: displayDate(shown.date),
		// those of the shown capture, as in the panorama (the capture menu counts each)
		markers: markersOf(shown).length,
		state: spotState(index),
		capturesLabel: t('{count} captures of {name}', { count: spot.captures.length, name: spot.name }),
		captures: sorted.map((capture, i) => ({
			value: capture.file,
			markers: markersOf(capture).length,
			label: i === 0 ? t('{date} (latest)', { date: displayDate(capture.date) }) : displayDate(capture.date),
			checked: (editing.value ? currentCapture.value : shown) === capture,
		})),
	}
}))

// a visit shows only the spots captured that day, each with that day's capture
const onVisit = (spot) => !visitDay.value || spot.captures.some(c => c.date.slice(0, 10) === visitDay.value)
const visibleSpots = computed(() => (tour.value?.spots ?? [])
	.map((spot, index) => onVisit(spot) ? index : -1)
	.filter(index => index >= 0))
// key: the real spot index, so per-row state in the list survives filtering
const viewerRows = computed(() => visibleSpots.value.map(index => ({
	...spotRows.value[index],
	key: index,
	...(visitDay.value ? { captures: [] } : {}),
})))
const listTitle = computed(() => visitDay.value
	? t('Spots on {date} ({count})', { date: displayDate(visitDay.value, false), count: viewerRows.value.length })
	: t('Spots ({count})', { count: viewerRows.value.length }))

const planProps = computed(() => ({
	src: planUrl.value,
	size: planSize.value,
	spots: visibleSpots.value.map(index => planSpots.value[index]),
	heading: heading.value,
}))
const editPlanProps = computed(() => ({
	...planProps.value,
	spots: planSpots.value,
	// the cone belongs to the selected spot, not to an image being previewed
	heading: previewing.value ? null : heading.value,
	editable: true,
	crosshair: !!selectedImage.value,
	// a click just beside a spot adds the picked image there; without an image
	// it turns the selected spot's view direction, even next to another spot
	snap: !!selectedImage.value || !currentSpot.value,
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

// a day whose last capture was removed or redated: back to all spots
watch(visits, (list) => {
	if (!showVisits.value || !list.some(v => v.value === visit.value)) {
		visit.value = 'all'
	}
})

watch(visit, () => {
	picked.clear()
	hint.value = visitDay.value
		? n('{count} spot captured on {date}', '{count} spots captured on {date}', visibleSpots.value.length, { date: displayDate(visitDay.value, false) })
		: ''
	// the spot in view was not captured on this visit: go to the first one that was
	if (!visibleSpots.value.includes(spotIndex.value) && visibleSpots.value.length) {
		spotIndex.value = visibleSpots.value[0]
	}
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
// error notes announce themselves (role="alert"), they are not read twice
const liveText = computed(() => editing.value
	? (note.value?.type === 'error' ? '' : (note.value?.text ?? ''))
	: subline.value)

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

// ---- markers -------------------------------------------------------------

const editedMarkers = computed(() => markersOf(currentCapture.value))
const markerSection = ref(null)
const {
	markerPlacing,
	openedMarker,
	photos: markerPhotos,
	fileidOf: markerPhotoId,
	mtimeOf: markerPhotoTime,
	loadPhotos: loadMarkerPhotos,
	open: openMarkerEditor,
	placeNew: placeMarker,
	place: placeExistingMarker,
	cancelPlace: cancelMarkerPlace,
	pick: pickMarkerPlace,
	drop: dropMarker,
	setText: editMarkerText,
	remove: removeMarker,
	removePhoto: removeMarkerPhoto,
	choosePhoto: chooseMarkerPhoto,
	addPhoto: addMarkerPhoto,
} = useMarkerEditing({
	tour,
	capture: currentCapture,
	editing,
	previewing,
	folder,
	folderUrl,
	setStatus,
	clearStatus: () => { status.value = null },
	changed,
	canChoosePhoto: !shared,
	// a picked image would hide the capture's markers and the place to click
	beforePlace: () => { selectedImage.value = null },
})

// small images in the marker list: the server's preview instead of a phone photo of several MB;
// share pages have no preview without a login, photos outside the photo folder no file id
function markerThumb(path) {
	const id = shared ? null : markerPhotoId(path)
	return id ? generateUrl('/core/preview?fileId={id}&x=80&y=80&a=1', { id }) : fileUrl(path)
}

// capture time under the images of both lists: file name or file time at once, EXIF dates follow
// (4 requests at a time, once per file) and re-sort the lists; keys are paths, so a selection stays
const captureTimes = useCaptureTimes({ read: async (path) => exifDate(await readStart(fileUrl(path))) })
const newImages = computed(() => withCaptureTimes(unplacedImages.value, captureTimes.exifOf))
const newPhotos = computed(() => withCaptureTimes(markerPhotos.value.map(path => ({ path, mtime: markerPhotoTime(path) })), captureTimes.exifOf))
watchEffect(() => {
	if (editing.value) {
		captureTimes.load([
			...unplacedImages.value.map(i => i.path),
			...(currentCapture.value ? markerPhotos.value : []),
		])
	}
})

async function onMarkerPick(place) {
	const marker = pickMarkerPlace(place)
	if (marker && !marker.file && !marker.text) {
		// a marker without text yet: ready to type
		editorTab.value = 'edit'
		await nextTick()
		markerSection.value?.focusText()
	}
}

// a marker opened in the list: the panorama turns to it (a click in the panorama already looks there)
function onMarkerListOpen(index) {
	openMarkerEditor(index)
	if (index >= 0) {
		pano.value?.showMarker(index)
	}
}

// in the editor a marker in the panorama opens its editor in the panel; the viewer opens the photo
function onMarkerClick(index) {
	if (!editing.value) {
		openMarker(index)
		return
	}
	editorTab.value = 'edit'
	openMarkerEditor(index)
}

// Only the folder itself: subfolders often hold copies (compressed versions)
async function loadImages() {
	try {
		loadMarkerPhotos()
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
	// the editor shows every spot and has no visit bar: a hidden day would
	// pick the capture that is edited and filter the viewer afterwards
	visit.value = 'all'
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
	// a marker placed but never filled is not in the file: the viewer must not show it
	if (tour.value) {
		removeEmptyMarkers(tour.value)
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
 * When an image was taken (see captureDate) and where (GPS); both come from
 * the same read of its first 64 KB.
 */
async function imageInfo(path) {
	let exif = null
	let gps = null
	try {
		const start = await readStart(fileUrl(path))
		exif = exifDate(start)
		gps = exifGps(start)
	} catch {
		// no range support or no EXIF: file name or file time then
	}
	const image = images.value.find(i => i.path === path)
	return { date: captureDate({ exif, file: path, mtime: image?.mtime ?? new Date() }), gps }
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
	// the panorama shows a picked image, not the spot's capture: its view says nothing about the spot
	if (previewing.value) {
		return
	}
	const spot = currentSpot.value
	const capture = currentCapture.value
	const before = capture.yaw
	capture.yaw = alignYaw(capture, pano.value.yaw(), spot, target, planSize.value)
	changed()
	await nextTick()
	pano.value.lookAt(bearing(spot, target, planSize.value))
	setStatus('success', t('View direction set – not saved yet'), t('Undo'), () => undoDirection(capture, before))
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
/**
 * Place the picked image. The task adds it and selects its spot; the preview
 * stays until then, so the panorama does not flip back to the previous spot.
 */
async function placeSelected(task) {
	const file = selectedImage.value
	selectedImage.value = null
	placing.value = file
	pending.add(file)
	try {
		const { date, gps } = await imageInfo(file)
		const result = await task(file, date)
		// the first image with GPS tells where the building is (saved with the next save)
		if (gps && !tour.value.location) {
			tour.value.location = gps
		}
		return result
	} finally {
		pending.delete(file)
		placing.value = null
	}
}

/**
 * A short click on a free place of the plan: places the picked image there,
 * otherwise turns the selected spot's view direction towards it.
 */
async function onPlanPlace(point) {
	// an image is still being placed (its date is read): a second click would
	// otherwise turn the previous spot with the preview's view
	if (placing.value) {
		return
	}
	if (!selectedImage.value) {
		if (currentSpot.value) {
			setDirection(point)
		}
		return
	}
	await placeSelected((file, date) => {
		addSpot(tour.value, { ...point, file, date })
		spotIndex.value = tour.value.spots.length - 1
	})
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
	if (placing.value) {
		return
	}
	const spot = tour.value.spots[index]
	if (selectedImage.value) {
		const capture = await placeSelected((file, date) => {
			const added = addCapture(spot, { file, date })
			picked.set(spot, added.file)
			spotIndex.value = index
			return added
		})
		changed()
		// a click just beside a spot lands here too: say so and offer the way back
		setStatus('info', t('Added as another capture of "{name}".', { name: spot.name }), t('Undo'), () => undoCapture(spot, capture.file))
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
		etag.value = await writeText(props.node.encodedSource, serializeTour(withoutEmptyMarkers(tour.value)), etag.value ?? undefined)
		renamedSpots.clear()
		if (moves.length > 0 && editing.value) {
			// "New images" must not list the old names
			loadImages()
		}
		if (revision === startedAt) {
			dirty.value = false
			// what was saved is what stays: markers without text or photo were left out
			removeEmptyMarkers(tour.value)
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
	// text fields use Escape themselves; radios and switches do not
	if (e.target.matches?.('input:not([type="radio"], [type="checkbox"]), textarea')) {
		return
	}
	e.preventDefault()
	if (markerPlacing.value) {
		cancelMarkerPlace()
	} else if (selectedImage.value) {
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

.pt-pano-rows {
	position: relative;
	grid-area: pano;
	align-self: end;
	height: 0;
}

.pt-pano-rows__handle {
	bottom: -4px;
}

@media (pointer: coarse) {
	.pt-pano-rows__handle {
		bottom: -12px;
	}
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
