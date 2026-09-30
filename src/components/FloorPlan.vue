<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Zoomable floor plan with one button per spot and the view cone of the
  current spot. Used in the viewer's side bar, the editor and on phones.
-->
<template>
	<div ref="root"
		class="pt-plan"
		:class="{ 'pt-plan--crosshair': crosshair, 'pt-plan--auto': autoHeight }"
		:style="rootStyle"
		@wheel.prevent="onWheel"
		@pointerdown="onPointerDown">
		<div class="pt-plan__content" :style="contentStyle">
			<img :src="src"
				class="pt-plan__image"
				draggable="false"
				alt=""
				@load="fit">
			<div v-if="cone"
				class="pt-plan__cone"
				:style="cone"
				aria-hidden="true" />
			<button v-for="(spot, index) in spots"
				:key="index"
				type="button"
				class="pt-pin"
				:class="`pt-pin--${spot.state}`"
				:style="{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }"
				:aria-label="spot.label"
				:aria-current="spot.state === 'current' ? 'true' : undefined"
				:title="spot.label"
				:data-index="index"
				@click="onPinClick($event, index)"
				@keydown="onPinKey($event, index)">
				<span class="pt-pin__dot" aria-hidden="true" />
			</button>
		</div>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
	src: { type: String, required: true },
	size: { type: Object, required: true },
	/** [{ x, y, label, state: 'normal' | 'current' | 'missing' }] */
	spots: { type: Array, required: true },
	/** view direction of the current spot in degrees, null hides the cone */
	heading: { type: Number, default: null },
	editable: { type: Boolean, default: false },
	crosshair: { type: Boolean, default: false },
	/** height follows the width (side bar); otherwise the plan fills its box */
	autoHeight: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'move', 'place'])

const CLICK_TOLERANCE = 5
const root = ref(null)
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })

const rootStyle = computed(() => props.autoHeight
	? { aspectRatio: `${props.size.w} / ${props.size.h}` }
	: {})
const contentStyle = computed(() => ({
	width: `${props.size.w}px`,
	height: `${props.size.h}px`,
	transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
	'--pt-inverse-scale': String(1 / scale.value),
}))
const cone = computed(() => {
	const current = props.spots.find(s => s.state === 'current')
	if (!current || props.heading === null) {
		return null
	}
	return {
		left: `${current.x * 100}%`,
		top: `${current.y * 100}%`,
		transform: `scale(var(--pt-inverse-scale)) rotate(${props.heading}deg)`,
	}
})

function fit() {
	const box = root.value?.getBoundingClientRect()
	if (!box?.width || !box.height) {
		return
	}
	scale.value = Math.min(box.width / props.size.w, box.height / props.size.h)
	offset.value = {
		x: (box.width - props.size.w * scale.value) / 2,
		y: (box.height - props.size.h * scale.value) / 2,
	}
}

function zoomAt(clientX, clientY, factor) {
	const box = root.value.getBoundingClientRect()
	const px = clientX - box.left
	const py = clientY - box.top
	const min = Math.min(box.width / props.size.w, box.height / props.size.h) * 0.8
	const next = Math.min(Math.max(scale.value * factor, min), min * 12)
	const applied = next / scale.value
	offset.value = { x: px - (px - offset.value.x) * applied, y: py - (py - offset.value.y) * applied }
	scale.value = next
}

function onWheel(e) {
	zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015))
}

function toPlan(clientX, clientY) {
	const box = root.value.getBoundingClientRect()
	const clamp = (v) => Math.min(1, Math.max(0, v))
	return {
		x: clamp((clientX - box.left - offset.value.x) / (props.size.w * scale.value)),
		y: clamp((clientY - box.top - offset.value.y) / (props.size.h * scale.value)),
	}
}

// pointer handling: click, pan, pin drag and two-finger pinch
const pointers = new Map()
let gesture = null

function onPointerDown(e) {
	if (e.button !== 0) {
		return
	}
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
	root.value.setPointerCapture(e.pointerId)
	if (pointers.size === 2) {
		const [a, b] = [...pointers.values()]
		gesture = { type: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y) }
		return
	}
	const pin = e.target.closest('.pt-pin')
	gesture = {
		type: 'press',
		index: pin ? Number(pin.dataset.index) : null,
		start: { x: e.clientX, y: e.clientY },
		startOffset: { ...offset.value },
		moved: false,
	}
	root.value.addEventListener('pointermove', onPointerMove)
	root.value.addEventListener('pointerup', onPointerUp)
	root.value.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e) {
	if (!pointers.has(e.pointerId)) {
		return
	}
	pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
	if (gesture?.type === 'pinch' && pointers.size === 2) {
		const [a, b] = [...pointers.values()]
		const distance = Math.hypot(a.x - b.x, a.y - b.y)
		zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, distance / gesture.distance)
		gesture.distance = distance
		return
	}
	if (gesture?.type !== 'press') {
		return
	}
	const dx = e.clientX - gesture.start.x
	const dy = e.clientY - gesture.start.y
	gesture.moved ||= Math.hypot(dx, dy) > CLICK_TOLERANCE
	if (!gesture.moved) {
		return
	}
	if (gesture.index !== null && props.editable) {
		gesture.dragTo = toPlan(e.clientX, e.clientY)
		emit('move', gesture.index, gesture.dragTo)
	} else {
		offset.value = { x: gesture.startOffset.x + dx, y: gesture.startOffset.y + dy }
	}
}

function onPointerUp(e) {
	pointers.delete(e.pointerId)
	if (pointers.size > 0) {
		return
	}
	root.value.removeEventListener('pointermove', onPointerMove)
	root.value.removeEventListener('pointerup', onPointerUp)
	root.value.removeEventListener('pointercancel', onPointerUp)
	const g = gesture
	gesture = null
	if (!g || g.type !== 'press' || g.moved || e.type === 'pointercancel') {
		return
	}
	const index = g.index ?? nearestSpot(e.clientX, e.clientY)
	if (index !== null) {
		emit('select', index)
	} else {
		emit('place', toPlan(e.clientX, e.clientY))
	}
}

// A click just beside a spot means that spot – otherwise a near miss would
// silently create a second spot on top of it.
const SNAP_DISTANCE = 24

function nearestSpot(clientX, clientY) {
	const box = root.value.getBoundingClientRect()
	let best = null
	let bestDistance = SNAP_DISTANCE
	props.spots.forEach((spot, index) => {
		const x = box.left + offset.value.x + spot.x * props.size.w * scale.value
		const y = box.top + offset.value.y + spot.y * props.size.h * scale.value
		const distance = Math.hypot(clientX - x, clientY - y)
		if (distance <= bestDistance) {
			best = index
			bestDistance = distance
		}
	})
	return best
}

// keyboard: Enter/Space come in as a click with detail 0, arrows move a pin
function onPinClick(e, index) {
	if (e.detail === 0) {
		emit('select', index)
	}
}

function onPinKey(e, index) {
	if (!props.editable) {
		return
	}
	const step = e.shiftKey ? 0.02 : 0.005
	const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
	if (!delta) {
		return
	}
	e.preventDefault()
	const spot = props.spots[index]
	const clamp = (v) => Math.min(1, Math.max(0, v))
	emit('move', index, { x: clamp(spot.x + delta[0]), y: clamp(spot.y + delta[1]) })
}

let observer = null
onMounted(() => {
	observer = new ResizeObserver(() => fit())
	observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => [props.src, props.size.w, props.size.h], () => fit())

defineExpose({ fit })
</script>

<style scoped>
.pt-plan {
	position: relative;
	overflow: hidden;
	width: 100%;
	height: 100%;
	background: #ffffff;
	border-radius: var(--border-radius-element);
	cursor: grab;
	touch-action: none;
	user-select: none;
}

.pt-plan--auto {
	height: auto;
	max-height: 70vh;
}

.pt-plan--crosshair {
	cursor: crosshair;
}

.pt-plan__content {
	position: absolute;
	top: 0;
	left: 0;
	transform-origin: 0 0;
}

.pt-plan__image {
	display: block;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

.pt-plan__cone {
	position: absolute;
	width: 64px;
	height: 64px;
	/* bottom centre sits on the spot and is the pivot */
	margin: -64px 0 0 -32px;
	transform-origin: 50% 100%;
	background: var(--color-primary-element);
	opacity: 0.45;
	clip-path: polygon(50% 100%, 12% 0, 88% 0);
	pointer-events: none;
}

/* the button is the touch target, the dot is what you see */
.pt-pin {
	position: absolute;
	width: var(--default-clickable-area);
	height: var(--default-clickable-area);
	margin: 0;
	padding: 0;
	border: none;
	background: transparent;
	transform: translate(-50%, -50%) scale(var(--pt-inverse-scale));
	cursor: pointer;
}

@media (pointer: coarse) {
	.pt-pin {
		width: var(--clickable-area-large);
		height: var(--clickable-area-large);
	}
}

.pt-pin__dot {
	display: block;
	width: 16px;
	height: 16px;
	margin: auto;
	box-sizing: border-box;
	/* the plan is always drawn on white, whatever the theme */
	border: 3px solid #222222;
	border-radius: 50%;
	background: #ffffff;
	transition: width var(--animation-quick), height var(--animation-quick);
}

.pt-pin:hover .pt-pin__dot,
.pt-pin:focus-visible .pt-pin__dot {
	width: 20px;
	height: 20px;
}

.pt-pin--current .pt-pin__dot {
	width: 22px;
	height: 22px;
	background: var(--color-primary-element);
}

.pt-pin--missing .pt-pin__dot {
	border-color: #8a8a8a;
	background: #d0d0d0;
}

.pt-pin:focus-visible {
	outline: 2px solid var(--color-main-text);
	border-radius: 50%;
}
</style>
