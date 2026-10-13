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
-->
<template>
	<div ref="el"
		class="pt-pano"
		:class="{ 'pt-pano--placing': placing }"
		role="img"
		tabindex="0"
		:aria-label="label"
		@keydown="onKey" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Viewer } from '@photo-sphere-viewer/core'
import '@photo-sphere-viewer/core/index.css'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import '@photo-sphere-viewer/markers-plugin/index.css'
import { mdiCameraOutline, mdiCommentTextOutline } from '@mdi/js'
import { t } from '../l10n.js'
import { escapeHtml, fromTexture, isPlaced, markerTitle, toTexture } from '../markers.js'

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
})
const emit = defineEmits(['heading', 'marker-click', 'pick'])

const el = ref(null)
let viewer = null
let observer = null
// Rule: the markers on screen always belong to the image that is shown.
// A new image removes them as soon as it starts loading (`unapply`); they are
// set again from `props.markers` once that image is shown (a fade shows it only
// at its end), and `showMarkers` does nothing in between.
let applied = false

function unapply() {
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
			const { textureX, textureY } = toTexture(m, size)
			const title = markerTitle(m)
			return {
				id: String(i),
				position: { textureX: textureX - size.offsetX, textureY: textureY - size.offsetY },
				html: icon(m.file ? mdiCameraOutline : mdiCommentTextOutline),
				className: 'pt-marker',
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
		loadingTxt: t('Loading …'),
		lang: {
			loadError: t('The image could not be loaded.'),
			twoFingers: t('Use two fingers to move'),
			ctrlZoom: t('Hold Ctrl and scroll to zoom'),
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
	// clicks on a marker never get here (the plugin stops them)
	viewer.addEventListener('click', ({ data }) => {
		const size = panoSize()
		if (props.placing && size && data.textureX !== undefined && !data.rightclick) {
			emit('pick', fromTexture({ textureX: data.textureX + size.offsetX, textureY: data.textureY + size.offsetY }, size))
		}
	})
	observer = new ResizeObserver(() => viewer?.autoSize())
	observer.observe(el.value)
})

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

defineExpose({
	/** current view yaw in radians */
	yaw: () => viewer?.getPosition().yaw ?? 0,
	/** turn the view to a direction on the plan (degrees, clockwise from up) */
	lookAt: (deg) => viewer?.rotate({ yaw: deg * Math.PI / 180, pitch: viewer.getPosition().pitch }),
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

/* the plugin hides markers outside the view with display: none; only the visible state may be flex */
.pt-pano :deep(.pt-marker.psv-marker--visible) {
	display: flex;
}
</style>
