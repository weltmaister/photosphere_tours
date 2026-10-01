<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Photo Sphere Viewer without its own navbar. Every capture is turned by its
  sphere correction so that view yaw 0 is "up on the plan"; keeping the view
  position when the image changes therefore keeps the direction on the plan.
-->
<template>
	<div ref="el"
		class="pt-pano"
		role="img"
		tabindex="0"
		:aria-label="label"
		@keydown="onKey" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Viewer } from '@photo-sphere-viewer/core'
import '@photo-sphere-viewer/core/index.css'
import { t } from '../l10n.js'

const props = defineProps({
	url: { type: String, default: null },
	/** { pan, tilt, roll } from tour.js sphereCorrection() */
	correction: { type: Object, default: null },
	/** accessible name: what is shown */
	label: { type: String, default: '' },
})
const emit = defineEmits(['heading'])

const el = ref(null)
let viewer = null
let observer = null

const toDeg = (r) => ((r * 180 / Math.PI) % 360 + 360) % 360

onMounted(() => {
	viewer = new Viewer({
		container: el.value,
		panorama: props.url ?? undefined,
		sphereCorrection: props.correction ?? undefined,
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

watch(() => props.url, (url) => {
	if (!viewer || !url) {
		return
	}
	viewer.setPanorama(url, {
		sphereCorrection: props.correction ?? undefined,
		position: viewer.getPosition(),
		transition: { effect: 'fade', rotation: false },
	}).catch(() => {
		// interrupted by the next click, or reported by the viewer itself
	})
})

watch(() => props.correction, (correction, previous) => {
	if (viewer && correction && previous && correction.pan !== previous.pan) {
		viewer.setOption('sphereCorrection', correction)
	}
})

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
</style>
