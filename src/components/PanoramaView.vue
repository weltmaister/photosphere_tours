<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Photo Sphere Viewer without its own navbar. Every capture is turned by its
  sphere correction so that view yaw 0 is "up on the plan"; keeping the view
  position when the image changes therefore keeps the direction on the plan.
-->
<template>
	<div ref="el" class="pt-pano" />
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
}

.pt-pano :deep(.psv-loader) {
	color: var(--color-primary-element);
}

.pt-pano :deep(.psv-overlay) {
	font-family: var(--font-face);
}
</style>
