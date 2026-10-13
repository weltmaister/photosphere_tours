<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Photo Sphere Viewer without its own navbar. Every capture is turned by its
  sphere correction so that view yaw 0 is "up on the plan"; keeping the view
  position when the image changes therefore keeps the direction on the plan.

  Markers are kept in raw image coordinates. The viewer turns a marker's texture
  position into its own angles once, with the sphere correction of that moment
  (core DataHelper.textureCoordsToSphericalCoords), so the markers are placed
  again whenever the shown image or its correction changes.

  In the editor (`editable`) a marker icon can be dragged: its element carries
  the viewer's CAPTURE_EVENTS_CLASS, so a press on it does not turn the view
  (core EventsHandler skips mousedown/touchstart inside such elements), and the
  pointer events below move the icon and report a short press as a click.
-->
<template>
	<div ref="el"
		class="pt-pano"
		:class="{ 'pt-pano--placing': placing, 'pt-pano--editable': editable, 'pt-pano--dragging': dragging }"
		role="img"
		tabindex="0"
		:aria-label="label"
		@keydown="onKey"
		@pointerdown="onPointerDown" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CONSTANTS, Viewer } from '@photo-sphere-viewer/core'
import '@photo-sphere-viewer/core/index.css'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import '@photo-sphere-viewer/markers-plugin/index.css'
import { mdiCameraOutline, mdiCommentTextOutline } from '@mdi/js'
import { t } from '../l10n.js'
import { clampToBox, movedBeyond } from '../gesture.js'
import { escapeHtml, fromViewerTexture, isPlaced, markerTitle, toViewerTexture } from '../markers.js'

const props = defineProps({
	url: { type: String, default: null },
	/** { pan, tilt, roll } from tour.js sphereCorrection() */
	correction: { type: Object, default: null },
	/** accessible name: what is shown */
	label: { type: String, default: '' },
	/** markers of the shown capture: { yaw?, pitch?, text?, file? } */
	markers: { type: Array, default: () => [] },
	/** editor place mode: a click on the image is reported as `pick` */
	placing: { type: Boolean, default: false },
	/** editor: marker icons can be dragged, a drop is reported as `marker-move` */
	editable: { type: Boolean, default: false },
})
const emit = defineEmits(['heading', 'marker-click', 'marker-move', 'pick'])

const el = ref(null)
let viewer = null
let observer = null
// Rule: the markers on screen always belong to the image that is shown.
// A new image removes them as soon as it starts loading (`unapply`); they are
// set again from `props.markers` once that image is shown (a fade shows it only
// at its end), and `showMarkers` does nothing in between.
let applied = false

function unapply() {
	stopDrag()
	applied = false
	viewer?.getPlugin(MarkersPlugin)?.clearMarkers()
}

const toDeg = (r) => ((r * 180 / Math.PI) % 360 + 360) % 360

const icon = (path) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`

/** size of the full panorama and the offset of the loaded part (0 unless cropped) */
function panoSize() {
	const data = viewer?.state.textureData?.panoData
	return data
		? { width: data.fullWidth, height: data.fullHeight, offsetX: data.croppedX, offsetY: data.croppedY }
		: null
}

function showMarkers() {
	const plugin = viewer?.getPlugin(MarkersPlugin)
	const size = panoSize()
	if (!plugin || !size || !applied) {
		return
	}
	plugin.setMarkers(props.markers
		.map((m, i) => [m, i])
		.filter(([m]) => isPlaced(m))
		.map(([m, i]) => {
			const title = markerTitle(m)
			return {
				id: String(i),
				position: toViewerTexture(m, size),
				html: icon(m.file ? mdiCameraOutline : mdiCommentTextOutline),
				className: props.editable ? `pt-marker ${CONSTANTS.CAPTURE_EVENTS_CLASS}` : 'pt-marker',
				size: { width: 36, height: 36 },
				anchor: 'center center',
				// the viewer writes tooltips with innerHTML and the text comes from the JSON file;
				// a marker still being filled in has no title and so no (empty) tooltip
				...(title ? { tooltip: { content: escapeHtml(title), position: 'top center' } } : {}),
			}
		}))
}

onMounted(() => {
	viewer = new Viewer({
		container: el.value,
		panorama: props.url ?? undefined,
		sphereCorrection: props.correction ?? undefined,
		plugins: [MarkersPlugin],
		navbar: false,
		// own handler below: only while the panorama has focus, so arrow
		// keys keep working in fields and on the floor plan
		keyboard: false,
		defaultZoomLvl: 0,
		withCredentials: true,
		// the viewer writes these with innerHTML
		loadingTxt: escapeHtml(t('Loading …')),
		lang: {
			loadError: escapeHtml(t('The image could not be loaded.')),
			twoFingers: escapeHtml(t('Use two fingers to move')),
			ctrlZoom: escapeHtml(t('Hold Ctrl and scroll to zoom')),
		},
	})
	viewer.addEventListener('position-updated', ({ position }) => emit('heading', toDeg(position.yaw)))
	viewer.addEventListener('ready', () => emit('heading', toDeg(viewer.getPosition().yaw)), { once: true })
	viewer.getPlugin(MarkersPlugin).addEventListener('select-marker', ({ marker, rightClick }) => {
		if (!rightClick) {
			emit('marker-click', Number(marker.id))
		}
	})
	viewer.addEventListener('panorama-load', unapply)
	// without a fade the image is already shown here, with a fade it is not yet
	viewer.addEventListener('panorama-loaded', ({ data }) => {
		if (viewer.state.textureData === data) {
			applied = true
			showMarkers()
		}
	})
	viewer.addEventListener('transition-done', ({ completed }) => {
		if (completed) {
			applied = true
			showMarkers()
		}
	})
	// clicks on a marker never get here (the plugin stops them; in the editor the viewer does not see them at all)
	viewer.addEventListener('click', ({ data }) => {
		const size = panoSize()
		const place = size && fromViewerTexture(data, size)
		if (props.placing && place && !data.rightclick) {
			emit('pick', place)
		}
	})
	observer = new ResizeObserver(() => viewer?.autoSize())
	observer.observe(el.value)
})

// ---- dragging a marker (editor) ----

/** { id, pointerId, start: { x, y }, moved, texture } while a marker icon is pressed */
let drag = null
const dragging = ref(false)

/** The viewer's texture position under a point of the screen (kept inside the panorama), or null. */
function textureAt(clientX, clientY) {
	const rect = viewer.container.getBoundingClientRect()
	const point = clampToBox({ x: clientX - rect.left, y: clientY - rect.top }, viewer.state.size)
	// the same way as the viewer's own click (core EventsHandler.__doClick): the sphere
	// under the point, then the texture there, which takes the sphere correction back out
	const spherical = viewer.dataHelper.viewerCoordsToSphericalCoords(point)
	if (!spherical) {
		return null
	}
	try {
		const texture = viewer.dataHelper.sphericalCoordsToTextureCoords(spherical)
		return texture.textureX === undefined ? null : texture
	} catch {
		return null
	}
}

function onPointerDown(e) {
	if (drag) {
		// a second finger: cancel, the viewer's pinch zoom takes over
		cancelDrag()
		return
	}
	const element = props.editable && viewer && applied && e.isPrimary && e.button === 0
		? e.target.closest?.('.pt-marker')
		: null
	// the plugin gives every marker element the id "psv-marker-<id>"; ours are indexes into `markers`
	const id = element?.id.startsWith('psv-marker-') ? element.id.slice('psv-marker-'.length) : null
	if (id === null) {
		return
	}
	// no text selection and no emulated mouse events (the viewer ignores those on a marker anyway)
	e.preventDefault()
	drag = { id, pointerId: e.pointerId, start: { x: e.clientX, y: e.clientY }, moved: false, texture: null }
	try {
		element.setPointerCapture(e.pointerId)
	} catch {
		// the window listeners below still follow the pointer
	}
	window.addEventListener('pointermove', onDragMove)
	window.addEventListener('pointerup', onDragEnd)
	window.addEventListener('pointercancel', cancelDrag)
}

function onDragMove(e) {
	if (e.pointerId !== drag?.pointerId) {
		return
	}
	if (!drag.moved && !movedBeyond(drag.start, { x: e.clientX, y: e.clientY })) {
		return
	}
	e.preventDefault()
	drag.moved = true
	dragging.value = true
	const texture = textureAt(e.clientX, e.clientY)
	if (!texture) {
		return
	}
	try {
		viewer.getPlugin(MarkersPlugin).updateMarker({ id: drag.id, position: texture })
		drag.texture = texture
	} catch {
		// the marker is gone (new image): nothing to move any more
	}
}

function onDragEnd(e) {
	if (e.pointerId !== drag?.pointerId) {
		return
	}
	const { id, moved, texture } = drag
	stopDrag()
	if (!moved) {
		emit('marker-click', Number(id))
		return
	}
	const size = panoSize()
	const place = texture && size ? fromViewerTexture(texture, size) : null
	if (place) {
		emit('marker-move', Number(id), place)
	}
	// on the stored (rounded) place, or back where it was when nothing was taken
	showMarkers()
}

/** End a drag without a result; the marker goes back to its place. */
function cancelDrag() {
	const moved = drag?.moved
	stopDrag()
	if (moved) {
		showMarkers()
	}
}

function stopDrag() {
	drag = null
	dragging.value = false
	window.removeEventListener('pointermove', onDragMove)
	window.removeEventListener('pointerup', onDragEnd)
	window.removeEventListener('pointercancel', cancelDrag)
}

const STEP = Math.PI / 18 // 10°

function onKey(e) {
	if (!viewer) {
		return
	}
	const { yaw, pitch } = viewer.getPosition()
	const turn = {
		ArrowLeft: [-STEP, 0],
		ArrowRight: [STEP, 0],
		ArrowUp: [0, STEP],
		ArrowDown: [0, -STEP],
	}[e.key]
	if (turn) {
		e.preventDefault()
		const nextPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch + turn[1]))
		viewer.rotate({ yaw: yaw + turn[0], pitch: nextPitch })
	} else if (e.key === '+' || e.key === '=') {
		e.preventDefault()
		viewer.zoomIn()
	} else if (e.key === '-') {
		e.preventDefault()
		viewer.zoomOut()
	}
}

onBeforeUnmount(() => {
	stopDrag()
	observer?.disconnect()
	viewer?.destroy()
	viewer = null
})

// One watcher for both: a new image brings its own correction, and setting
// that on the old image first would turn it just before the fade
watch(() => [props.url, props.correction?.pan], ([url], [previousUrl]) => {
	if (!viewer || !url) {
		return
	}
	if (url === previousUrl) {
		// same image, new view direction (set in the editor)
		viewer.setOption('sphereCorrection', props.correction)
		showMarkers()
		return
	}
	unapply()
	viewer.setPanorama(url, {
		sphereCorrection: props.correction ?? undefined,
		position: viewer.getPosition(),
		transition: { effect: 'fade', rotation: false },
	}).catch(() => {
		// interrupted by the next click, or reported by the viewer itself
	})
})

// after the watcher above, so a new image has already reset `applied`
watch(() => props.markers, showMarkers, { deep: true })

// entering or leaving the editor: the icons become draggable or not
watch(() => props.editable, (on) => {
	if (!on) {
		cancelDrag()
	}
	showMarkers()
})

defineExpose({
	/** current view yaw in radians */
	yaw: () => viewer?.getPosition().yaw ?? 0,
	/** turn the view to a direction on the plan (degrees, clockwise from up) */
	lookAt: (deg) => viewer?.rotate({ yaw: deg * Math.PI / 180, pitch: viewer.getPosition().pitch }),
	/** turn the view to a placed marker (index in `markers`); nothing while it is not on screen yet */
	showMarker(index) {
		const plugin = viewer?.getPlugin(MarkersPlugin)
		const marker = props.markers[index]
		if (!plugin || !applied || !marker || !isPlaced(marker)) {
			return
		}
		try {
			plugin.gotoMarker(String(index), '10rpm')
		} catch {
			// not set (yet): the markers follow once the image is shown
		}
	},
	zoomIn: () => viewer?.zoomIn(),
	zoomOut: () => viewer?.zoomOut(),
	toggleFullscreen: () => viewer?.toggleFullscreen(),
})
</script>

<style scoped>
.pt-pano {
	width: 100%;
	height: 100%;
	min-height: 0;
	background: #000000;
	font-family: var(--font-face);
	/* keeps the viewer's own z-indexes (loader, overlays) inside, so the
	   "No spots yet" layer on top really covers it */
	isolation: isolate;
}

.pt-pano--placing {
	cursor: crosshair;
}

.pt-pano--editable {
	user-select: none;
}

.pt-pano:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -4px;
}

.pt-pano :deep(.psv-loader) {
	color: var(--color-primary-element);
}

.pt-pano :deep(.psv-overlay) {
	font-family: var(--font-face);
}

.pt-pano :deep(.pt-marker) {
	align-items: center;
	justify-content: center;
	border: 2px solid var(--color-primary-element-text);
	border-radius: 50%;
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	box-shadow: 0 0 6px var(--color-box-shadow);
	cursor: pointer;
}

/* editor: the icons are dragged; no browser panning on them, so one finger moves the icon */
.pt-pano--editable :deep(.pt-marker) {
	cursor: grab;
	touch-action: none;
}

.pt-pano--dragging,
.pt-pano--dragging :deep(*) {
	cursor: grabbing;
}

/* the plugin hides markers outside the view with display: none; only the visible state may be flex */
.pt-pano :deep(.pt-marker.psv-marker--visible) {
	display: flex;
}
</style>
