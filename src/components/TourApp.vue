<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  The full-screen walkthrough: header, panorama, floor plan with spots,
  site visits – and with write permission the editor. One panorama instance
  serves every layout; only the CSS grid around it changes.
-->
<template>
	<div class="pt-app" :class="layoutClass">
		<header class="pt-header">
			<NcButton v-if="!editing && !mobile && ready"
				variant="tertiary"
				:pressed="sidebarOpen"
				:aria-label="t('Show or hide floor plan and spots')"
				:title="t('Show or hide floor plan and spots')"
				@click="sidebarOpen = !sidebarOpen">
				<template #icon>
					<NcIconSvgWrapper :path="mdiDockLeft" />
				</template>
			</NcButton>
			<div class="pt-header__titles">
				<h2 id="photosphere-tours-title" class="pt-header__title">
					{{ editing ? t('Edit walkthrough') : title }}
				</h2>
				<p class="pt-header__subline">
					{{ subline }}
				</p>
			</div>
			<template v-if="editing">
				<NcButton v-if="!mobile" variant="secondary" @click="stopEditing">
					{{ t('Stop editing') }}
				</NcButton>
				<NcButton variant="primary"
					:disabled="!dirty || saving"
					:title="dirty ? '' : t('No unsaved changes')"
					@click="save">
					<template #icon>
						<NcLoadingIcon v-if="saving" />
						<NcIconSvgWrapper v-else :path="mdiCheck" />
					</template>
					{{ t('Save') }}
				</NcButton>
				<NcButton v-if="mobile"
					variant="tertiary"
					:aria-label="t('Stop editing')"
					:title="t('Stop editing')"
					@click="stopEditing">
					<template #icon>
						<NcIconSvgWrapper :path="mdiClose" />
					</template>
				</NcButton>
			</template>
			<template v-else>
				<NcButton v-if="canEdit && ready"
					:variant="mobile ? 'tertiary' : 'primary'"
					:aria-label="mobile ? t('Edit') : undefined"
					:title="t('Place and move spots, set view directions')"
					@click="startEditing">
					<template #icon>
						<NcIconSvgWrapper :path="mdiPencil" />
					</template>
					<template v-if="!mobile">
						{{ t('Edit') }}
					</template>
				</NcButton>
				<NcButton variant="tertiary"
					:aria-label="t('Close walkthrough (Esc)')"
					:title="t('Close walkthrough (Esc)')"
					@click="requestClose">
					<template #icon>
						<NcIconSvgWrapper :path="mdiClose" />
					</template>
				</NcButton>
			</template>
		</header>

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
			<aside v-if="!editing && !mobile && sidebarOpen" class="pt-side" :aria-label="t('Floor plan and spots')">
				<div class="pt-side__scroll">
					<h3 class="pt-section">
						{{ t('Floor plan') }}
					</h3>
					<div class="pt-side__plan">
						<FloorPlan :src="planUrl"
							:size="planSize"
							:spots="planSpots"
							:heading="heading"
							auto-height
							@select="selectSpot" />
					</div>
					<h3 class="pt-section">
						{{ t('Spots ({count})', { count: tour.spots.length }) }}
					</h3>
					<SpotList class="pt-side__list"
						:rows="spotRows"
						@select="selectSpot"
						@pick-capture="pickCapture" />
				</div>
				<div class="pt-side__resize"
					role="separator"
					tabindex="0"
					aria-orientation="vertical"
					:aria-label="t('Width of the side bar')"
					:aria-valuenow="sidebarWidth"
					aria-valuemin="240"
					aria-valuemax="560"
					:title="t('Drag to change the width')"
					@pointerdown="startResize"
					@keydown.left.prevent="sidebarWidth = Math.max(240, sidebarWidth - 16)"
					@keydown.right.prevent="sidebarWidth = Math.min(560, sidebarWidth + 16)" />
			</aside>

			<!-- editor, desktop: the floor plan is the work area -->
			<div v-if="editing && !mobile" class="pt-editplan">
				<div v-if="note" class="pt-note">
					<NcNoteCard :type="note.type" :text="note.text" />
					<NcButton v-if="note.action" variant="secondary" @click="note.onAction">
						{{ note.action }}
					</NcButton>
				</div>
				<div class="pt-editplan__plan">
					<FloorPlan :src="planUrl"
						:size="planSize"
						:spots="planSpots"
						:heading="heading"
						editable
						:crosshair="aligning || !!selectedImage"
						@select="onPlanSelect"
						@move="onPlanMove"
						@place="onPlanPlace" />
				</div>
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

			<!-- editor: tabs next to (desktop) or below (phone) the panorama -->
			<section v-if="editing" class="pt-panel">
				<div class="pt-tabs" role="tablist" :aria-label="t('Edit walkthrough')">
					<button v-for="tab in editorTabs"
						:key="tab.id"
						type="button"
						role="tab"
						class="pt-tab"
						:aria-selected="editorTab === tab.id ? 'true' : 'false'"
						@click="editorTab = tab.id">
						{{ tab.label }}
					</button>
				</div>
				<div v-if="note && mobile" class="pt-note pt-note--panel">
					<NcNoteCard :type="note.type" :text="note.text" />
					<NcButton v-if="note.action" variant="secondary" @click="note.onAction">
						{{ note.action }}
					</NcButton>
				</div>
				<div class="pt-panel__content" :class="{ 'pt-panel__content--plan': editorTab === 'plan' }">
					<FloorPlan v-if="editorTab === 'plan'"
						:src="planUrl"
						:size="planSize"
						:spots="planSpots"
						:heading="heading"
						editable
						:crosshair="aligning || !!selectedImage"
						@select="onPlanSelect"
						@move="onPlanMove"
						@place="onPlanPlace" />
					<SpotForm v-else-if="editorTab === 'spot'"
						:spot="currentSpot"
						:capture="currentCapture"
						:aligning="aligning"
						@rename="rename"
						@set-date="setDate"
						@align="toggleAlign"
						@remove="removeCurrent" />
					<NewImages v-else
						:images="unplacedImages"
						:selected="selectedImage"
						:plan="tour.plan"
						@select="selectImage"
						@change-plan="switchPlan()" />
				</div>
			</section>

			<!-- viewer, phone: bottom sheet -->
			<section v-if="!editing && mobile" class="pt-sheet" :aria-label="t('Floor plan and spots')">
				<button type="button"
					class="pt-sheet__toggle"
					:aria-expanded="sheetOpen ? 'true' : 'false'"
					@click="sheetOpen = !sheetOpen">
					<span class="pt-sheet__grip" aria-hidden="true" />
					<NcIconSvgWrapper :path="sheetOpen ? mdiChevronDown : mdiChevronUp" />
					{{ sheetOpen ? t('Collapse') : t('Floor plan and spots') }}
				</button>
				<template v-if="sheetOpen">
					<div class="pt-tabs" role="tablist" :aria-label="t('Floor plan and spots')">
						<button type="button"
							role="tab"
							class="pt-tab"
							:aria-selected="sheetTab === 'plan' ? 'true' : 'false'"
							@click="sheetTab = 'plan'">
							{{ t('Floor plan') }}
						</button>
						<button type="button"
							role="tab"
							class="pt-tab"
							:aria-selected="sheetTab === 'list' ? 'true' : 'false'"
							@click="sheetTab = 'list'">
							{{ t('Spots ({count})', { count: tour.spots.length }) }}
						</button>
					</div>
					<div class="pt-sheet__content">
						<FloorPlan v-if="sheetTab === 'plan'"
							:src="planUrl"
							:size="planSize"
							:spots="planSpots"
							:heading="heading"
							@select="selectSpot" />
						<SpotList v-else
							:rows="spotRows"
							@select="selectSpot"
							@pick-capture="pickCapture" />
					</div>
				</template>
				<SiteVisits v-if="visits.length > 2"
					v-model="visit"
					class="pt-sheet__visits"
					:visits="visits" />
			</section>
		</div>

		<footer v-if="ready && !editing && !mobile" class="pt-footer">
			<SiteVisits v-if="visits.length > 2" v-model="visit" :visits="visits" />
			<div class="pt-footer__tools">
				<NcButton variant="tertiary" :aria-label="t('Zoom out')" :title="t('Zoom out')" @click="pano?.zoomOut()">
					<template #icon>
						<NcIconSvgWrapper :path="mdiMinus" :size="24" />
					</template>
				</NcButton>
				<NcButton variant="tertiary" :aria-label="t('Zoom in')" :title="t('Zoom in')" @click="pano?.zoomIn()">
					<template #icon>
						<NcIconSvgWrapper :path="mdiPlus" :size="24" />
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { showConfirmation } from '@nextcloud/dialogs'
import { Permission } from '@nextcloud/files'
import {
	mdiAlertCircleOutline,
	mdiCheck,
	mdiChevronDown,
	mdiChevronUp,
	mdiClose,
	mdiDockLeft,
	mdiFullscreen,
	mdiMapMarkerPlusOutline,
	mdiMinus,
	mdiPencil,
	mdiPlus,
} from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'
import NcNoteCard from '@nextcloud/vue/components/NcNoteCard'

import FloorPlan from './FloorPlan.vue'
import NewImages from './NewImages.vue'
import PanoramaView from './PanoramaView.vue'
import SiteVisits from './SiteVisits.vue'
import SpotForm from './SpotForm.vue'
import SpotList from './SpotList.vue'
import { Cancelled, choosePlan } from '../create.js'
import { ConflictError, listFolder, locate, readStart, readText, urlFor, writeText } from '../dav.js'
import { exifDate } from '../exif.js'
import { classifyFolder, newerPlan } from '../folder.js'
import { displayDate, t } from '../l10n.js'
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
	formatDate,
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

// ---- loading -------------------------------------------------------------

const location = locate(props.node)
const canEdit = (props.node.permissions & Permission.UPDATE) !== 0
const fileUrl = (relative) => urlFor(location.rootUrl, resolvePath(location.dir, relative))

const ready = ref(false)
const loadError = ref('')
const tour = ref(null)
const etag = ref(null)
const planSize = ref({ w: 1, h: 1 })
const planUrl = ref('')

function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error(t('The floor plan {file} was not found. Check the "plan" entry in {tour}.', { file: tour.value.plan, tour: props.node.basename })))
		img.src = url
	})
}

async function load() {
	const { text, etag: tag } = await readText(props.node.encodedSource)
	etag.value = tag
	tour.value = parseTour(text)
	planUrl.value = fileUrl(tour.value.plan)
	const img = await loadImage(planUrl.value)
	planSize.value = { w: img.naturalWidth, h: img.naturalHeight }
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
		loadError.value = e instanceof TourError ? e.problems.join(' ') : e.message
	}
})

// ---- layout --------------------------------------------------------------

const phoneQuery = window.matchMedia('(max-width: 767px)')
const mobile = ref(phoneQuery.matches)
const onPhoneChange = (e) => { mobile.value = e.matches }
phoneQuery.addEventListener('change', onPhoneChange)

const stored = (key, fallback) => {
	try {
		const value = window.localStorage.getItem(`photosphere_tours.${key}`)
		return value === null ? fallback : JSON.parse(value)
	} catch {
		return fallback
	}
}
const store = (key, value) => {
	try {
		window.localStorage.setItem(`photosphere_tours.${key}`, JSON.stringify(value))
	} catch {
		// private window or blocked storage: the setting just is not kept
	}
}

const sidebarOpen = ref(stored('sidebarOpen', true))
const sidebarWidth = ref(stored('sidebarWidth', 320))
const sheetOpen = ref(false)
const sheetTab = ref('plan')
watch(sidebarOpen, (v) => store('sidebarOpen', v))
watch(sidebarWidth, (v) => store('sidebarWidth', v))

const layoutClass = computed(() => ({
	'pt-app--mobile': mobile.value,
	'pt-app--editing': editing.value,
}))
const bodyStyle = computed(() => (!editing.value && !mobile.value && sidebarOpen.value)
	? { gridTemplateColumns: `${sidebarWidth.value}px minmax(0, 1fr)` }
	: {})

function startResize(e) {
	const start = { x: e.clientX, w: sidebarWidth.value }
	const target = e.currentTarget
	target.setPointerCapture(e.pointerId)
	const move = (ev) => {
		sidebarWidth.value = Math.round(Math.min(560, Math.max(240, start.w + ev.clientX - start.x)))
	}
	const up = () => {
		target.removeEventListener('pointermove', move)
		target.removeEventListener('pointerup', up)
	}
	target.addEventListener('pointermove', move)
	target.addEventListener('pointerup', up)
}

// ---- what is shown -------------------------------------------------------

const pano = ref(null)
const heading = ref(0)
const spotIndex = ref(0)
/** 'latest' or YYYY-MM-DD */
const visit = ref('latest')
/** spot index -> capture file picked in the spot list */
const picked = reactive({})
const hint = ref('')

const title = computed(() => tour.value?.title || props.node.dirname.split('/').pop())
const visitDay = computed(() => visit.value === 'latest' ? null : visit.value)

function shownCapture(spot, index) {
	const file = picked[index]
	return (file && spot.captures.find(c => c.file === file)) || captureAt(spot, visitDay.value)
}

const currentSpot = computed(() => tour.value?.spots[spotIndex.value] ?? null)
const currentCapture = computed(() => {
	const spot = currentSpot.value
	if (!spot) {
		return null
	}
	return shownCapture(spot, spotIndex.value) ?? capturesNewestFirst(spot)[0]
})
const panoramaUrl = computed(() => currentCapture.value ? fileUrl(currentCapture.value.file) : null)
const panoramaLabel = computed(() => currentCapture.value
	? t('360° panorama: {name}, {date}. Use the arrow keys to look around.', { name: currentSpot.value.name, date: displayDate(currentCapture.value.date) })
	: '')
const correction = computed(() => currentCapture.value ? sphereCorrection(currentCapture.value) : null)

const visits = computed(() => {
	if (!tour.value) {
		return []
	}
	return [
		...captureDays(tour.value).map(day => ({
			value: day,
			label: displayDate(day, false),
			title: t('Show every spot as it was on {date}', { date: displayDate(day, false) }),
		})),
		{ value: 'latest', label: t('Latest'), title: t('Show every spot with its latest capture') },
	]
})

const planSpots = computed(() => (tour.value?.spots ?? []).map((spot, index) => {
	const shown = editing.value ? true : shownCapture(spot, index)
	const first = capturesNewestFirst(spot).at(-1)
	let label
	if (editing.value) {
		label = t('{name} – drag to move', { name: spot.name })
	} else if (shown) {
		label = `${spot.name} · ${displayDate(shown.date, false)}`
	} else {
		label = t('{name} · from {date} on', { name: spot.name, date: displayDate(first.date, false) })
	}
	return {
		x: spot.x,
		y: spot.y,
		label,
		state: index === spotIndex.value ? 'current' : (shown ? 'normal' : 'missing'),
	}
}))

const spotRows = computed(() => (tour.value?.spots ?? []).map((spot, index) => {
	const shown = shownCapture(spot, index)
	const sorted = capturesNewestFirst(spot)
	return {
		name: spot.name,
		date: shown ? displayDate(shown.date) : t('from {date} on', { date: displayDate(sorted.at(-1).date, false) }),
		state: index === spotIndex.value ? 'current' : (shown ? 'normal' : 'missing'),
		badgeLabel: t('{count} captures of {name}', { count: spot.captures.length, name: spot.name }),
		captures: sorted.map((capture, i) => ({
			value: capture.file,
			label: i === 0 ? t('{date} (latest)', { date: displayDate(capture.date) }) : displayDate(capture.date),
			checked: shown === capture,
		})),
	}
}))

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
	if (visitDay.value && capture.date.slice(0, 10) !== visitDay.value && picked[spotIndex.value] === undefined) {
		return t('No capture here on {day} – showing the one from {date}.', { day: displayDate(visitDay.value, false), date: displayDate(capture.date, false) })
	}
	return `${spot.name} · ${displayDate(capture.date)}`
})

function selectSpot(index) {
	const spot = tour.value.spots[index]
	if (!shownCapture(spot, index)) {
		const first = capturesNewestFirst(spot).at(-1)
		hint.value = t('{name} was first captured on {date}. Pick a later site visit below.', { name: spot.name, date: displayDate(first.date, false) })
		return
	}
	hint.value = ''
	spotIndex.value = index
}

function pickCapture(index, file) {
	picked[index] = file
	hint.value = ''
	spotIndex.value = index
}

watch(visit, () => {
	for (const key of Object.keys(picked)) {
		delete picked[key]
	}
	hint.value = ''
})

// ---- editing -------------------------------------------------------------

const editing = ref(false)
const dirty = ref(false)
const saving = ref(false)
const aligning = ref(false)
const selectedImage = ref(null)
const images = ref([])
const editorTab = ref('spot')
const status = ref(null)

const unplacedImages = computed(() => {
	if (!tour.value) {
		return []
	}
	const free = new Set(unplacedFiles(tour.value, images.value.map(i => i.path)))
	return images.value.filter(i => free.has(i.path))
})

const editorTabs = computed(() => [
	...(mobile.value ? [{ id: 'plan', label: t('Floor plan') }] : []),
	{ id: 'spot', label: t('Spot') },
	{ id: 'new', label: mobile.value ? t('New ({count})', { count: unplacedImages.value.length }) : t('New images ({count})', { count: unplacedImages.value.length }) },
])

const note = computed(() => {
	if (aligning.value) {
		return { type: 'info', text: t('Click the place on the floor plan that you are looking at in the image.'), action: t('Cancel'), onAction: () => { aligning.value = false } }
	}
	if (selectedImage.value) {
		return { type: 'info', text: t('{file} selected – now click on the floor plan.', { file: selectedImage.value }), action: t('Deselect'), onAction: () => { selectedImage.value = null } }
	}
	return status.value
})

function setStatus(type, text, action = null, onAction = null) {
	status.value = { type, text, action, onAction }
	if (type === 'success') {
		const shown = status.value
		setTimeout(() => {
			if (status.value === shown) {
				status.value = null
			}
		}, 4000)
	}
}

function changed() {
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
		folderEntries = await listFolder(urlFor(location.rootUrl, location.dir))
		const panoramas = new Set(classifyFolder(folderEntries).panoramas)
		images.value = folderEntries
			.filter(e => panoramas.has(e.name))
			.map(e => ({ path: e.name, fileid: e.fileid, mtime: e.mtime }))
			.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
		const newer = newerPlan(folderEntries, tour.value.plan)
		if (newer) {
			setStatus('info', t('There is a newer floor plan in the folder: {file}', { file: newer }), t('Use it'), () => switchPlan(newer))
		}
	} catch (e) {
		setStatus('error', t('The images in this folder could not be loaded: {error}', { error: e.message }))
	}
}

async function switchPlan(file = null) {
	try {
		const plan = await choosePlan(folder, folderEntries, { auto: false, file })
		const url = fileUrl(plan)
		const img = await loadImage(url)
		tour.value.plan = plan
		planUrl.value = url
		planSize.value = { w: img.naturalWidth, h: img.naturalHeight }
		changed()
		setStatus('success', t('Floor plan changed – not saved yet. The spots keep their places.'))
	} catch (e) {
		if (!(e instanceof Cancelled)) {
			setStatus('error', t('The floor plan could not be changed: {error}', { error: e.message }))
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
	editorTab.value = tour.value.spots.length === 0 ? 'new' : (mobile.value ? 'plan' : 'spot')
	loadImages()
}

async function stopEditing() {
	if (dirty.value) {
		const keep = await showConfirmation({
			name: t('Save changes?'),
			text: t('You changed the walkthrough but have not saved it yet.'),
			labelConfirm: t('Save'),
			labelReject: t('Discard'),
		})
		if (keep && !(await save())) {
			return false
		}
		if (!keep) {
			await reload()
		}
	}
	editing.value = false
	aligning.value = false
	selectedImage.value = null
	status.value = null
	return true
}

async function reload() {
	await load()
	dirty.value = false
	status.value = null
	spotIndex.value = Math.min(spotIndex.value, Math.max(0, tour.value.spots.length - 1))
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
	aligning.value = false
	if (path && mobile.value) {
		editorTab.value = 'plan'
	}
}

function toggleAlign() {
	aligning.value = !aligning.value
	selectedImage.value = null
	if (aligning.value && mobile.value) {
		editorTab.value = 'plan'
	}
}

async function alignTo(target) {
	const spot = currentSpot.value
	const capture = currentCapture.value
	capture.yaw = alignYaw(capture, pano.value.yaw(), spot, target, planSize.value)
	aligning.value = false
	changed()
	// the thing the user looks at now lies at the clicked bearing: turn the
	// view with it so the picture does not jump
	await nextTick()
	pano.value.lookAt(bearing(spot, target, planSize.value))
	setStatus('success', t('View direction set – not saved yet'))
}

async function onPlanPlace(point) {
	if (aligning.value) {
		alignTo(point)
	} else if (selectedImage.value) {
		const file = selectedImage.value
		selectedImage.value = null
		addSpot(tour.value, { ...point, file, fallbackDate: await fallbackDate(file) })
		spotIndex.value = tour.value.spots.length - 1
		changed()
	}
}

async function onPlanSelect(index) {
	const spot = tour.value.spots[index]
	if (aligning.value) {
		alignTo({ x: spot.x, y: spot.y })
		return
	}
	if (selectedImage.value) {
		const file = selectedImage.value
		selectedImage.value = null
		const capture = addCapture(spot, { file, fallbackDate: await fallbackDate(file) })
		picked[index] = capture.file
		changed()
	}
	spotIndex.value = index
}

function onPlanMove(index, point) {
	Object.assign(tour.value.spots[index], point)
	changed()
}

function rename(name) {
	currentSpot.value.name = name
	changed()
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
		text: t('It disappears from the walkthrough. The image file stays in the folder.'),
		labelConfirm: t('Remove'),
		labelReject: t('Keep'),
	})
	if (!confirmed) {
		return
	}
	if (last) {
		tour.value.spots.splice(spotIndex.value, 1)
		spotIndex.value = Math.max(0, spotIndex.value - 1)
	} else {
		spot.captures.splice(spot.captures.indexOf(capture), 1)
		delete picked[spotIndex.value]
	}
	changed()
}

async function save() {
	saving.value = true
	try {
		etag.value = await writeText(props.node.encodedSource, serializeTour(tour.value), etag.value ?? undefined)
		dirty.value = false
		setStatus('success', t('Walkthrough saved'))
		return true
	} catch (e) {
		if (e instanceof ConflictError) {
			setStatus('error', t('Someone else changed the walkthrough in the meantime, so it cannot be saved. Reload it – your changes will be lost.'), t('Reload'), () => reload())
		} else {
			setStatus('error', t('Saving failed: {error}. Check your connection and try again.', { error: e.message }))
		}
		return false
	} finally {
		saving.value = false
	}
}

// ---- closing and keyboard ------------------------------------------------

async function requestClose() {
	if (editing.value && !(await stopEditing())) {
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
	if (aligning.value) {
		aligning.value = false
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

document.addEventListener('keydown', onKeyDown)
onBeforeUnmount(() => {
	document.removeEventListener('keydown', onKeyDown)
	phoneQuery.removeEventListener('change', onPhoneChange)
})
</script>

<style scoped>
.pt-app {
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

/* ---- header ---- */
.pt-header {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 2);
	min-height: var(--header-height, 50px);
	padding: 0 calc(var(--default-grid-baseline) * 2);
	border-bottom: 1px solid var(--color-border);
}

.pt-header__titles {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;
	padding-inline-start: calc(var(--default-grid-baseline) * 2);
}

.pt-header__title {
	margin: 0;
	overflow: hidden;
	font-size: calc(var(--default-font-size) * 1.2);
	font-weight: 600;
	line-height: 1.2;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pt-header__subline {
	margin: 0;
	overflow: hidden;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
	line-height: 1.3;
	text-overflow: ellipsis;
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
	grid-template-columns: minmax(0, 1fr) 520px;
	grid-template-rows: 292px minmax(0, 1fr);
}

.pt-app--mobile .pt-body {
	grid-template-areas: 'pano' 'sheet';
	grid-template-columns: minmax(0, 1fr);
	grid-template-rows: minmax(0, 1fr) auto;
}

.pt-app--mobile.pt-app--editing .pt-body {
	grid-template-areas: 'pano' 'panel';
	grid-template-rows: 200px minmax(0, 1fr);
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

/* ---- viewer side bar ---- */
.pt-side {
	position: relative;
	grid-area: side;
	min-height: 0;
	border-inline-end: 1px solid var(--color-border);
}

.pt-side__scroll {
	height: 100%;
	overflow-x: hidden;
	overflow-y: auto;
	padding-bottom: calc(var(--default-grid-baseline) * 2);
}

.pt-section {
	margin: 0;
	padding: calc(var(--default-grid-baseline) * 3) calc(var(--default-grid-baseline) * 3) calc(var(--default-grid-baseline) * 2);
	border-top: 1px solid var(--color-border);
	color: var(--color-main-text);
	font-size: var(--default-font-size);
	font-weight: 600;
}

.pt-section:first-child {
	border-top: none;
}

.pt-side__plan {
	padding: 0 calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 2);
}

.pt-side__list {
	padding: 0 calc(var(--default-grid-baseline) * 2);
}

.pt-side__resize {
	position: absolute;
	top: 0;
	inset-inline-end: -4px;
	z-index: 1;
	width: 8px;
	height: 100%;
	cursor: col-resize;
}

.pt-side__resize:hover {
	background: linear-gradient(var(--color-primary-element), var(--color-primary-element)) center / 2px 100% no-repeat;
}

/* ---- editor ---- */
.pt-editplan {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline) * 3);
	grid-area: plan;
	min-height: 0;
	padding: calc(var(--default-grid-baseline) * 4);
	background: var(--color-background-dark);
}

.pt-editplan__plan {
	flex-grow: 1;
	min-height: 0;
}

.pt-note {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
}

.pt-note :deep(.notecard) {
	flex-grow: 1;
	margin: 0;
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

.pt-tabs {
	display: flex;
	flex-shrink: 0;
	border-bottom: 1px solid var(--color-border);
}

.pt-tab {
	flex: 1;
	min-height: var(--clickable-area-large);
	border: none;
	border-bottom: 3px solid transparent;
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

.pt-tab:hover {
	background: var(--color-background-hover);
}

.pt-tab[aria-selected='true'] {
	border-bottom-color: var(--color-primary-element);
}

/* keyboard focus, visible on every background */
.pt-tab:focus-visible,
.pt-sheet__toggle:focus-visible,
.pt-side__resize:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -2px;
}

/* ---- phone: bottom sheet ---- */
.pt-sheet {
	display: flex;
	flex-direction: column;
	grid-area: sheet;
	border-top: 1px solid var(--color-border);
	border-radius: var(--border-radius-container) var(--border-radius-container) 0 0;
	background: var(--color-main-background);
}

.pt-sheet__toggle {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: calc(var(--default-grid-baseline) * 2);
	min-height: var(--clickable-area-large);
	border: none;
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

.pt-sheet__grip {
	position: absolute;
	top: 6px;
	left: 50%;
	width: 36px;
	height: 4px;
	margin-left: -18px;
	border-radius: 2px;
	background: var(--color-border-maxcontrast);
}

.pt-sheet__content {
	height: 45vh;
	overflow: auto;
	padding: calc(var(--default-grid-baseline) * 2);
}

.pt-sheet__visits {
	padding: calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 3) calc(var(--default-grid-baseline) * 4);
	border-top: 1px solid var(--color-border);
}

/* ---- footer ---- */
.pt-footer {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
	min-height: 56px;
	padding: 0 calc(var(--default-grid-baseline) * 3) 0 calc(var(--default-grid-baseline) * 4);
	border-top: 1px solid var(--color-border);
}

.pt-footer__tools {
	display: flex;
	gap: 4px;
	margin-inline-start: auto;
}
</style>
