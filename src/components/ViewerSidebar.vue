<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  The viewer's side bar on desktop: floor plan and spot list, resizable by
  dragging its edge or with the arrow keys on it.
-->
<template>
	<aside class="pt-side" :aria-label="t('Floor plan and spots')">
		<div class="pt-side__scroll">
			<h3 class="pt-section">
				{{ t('Floor plan') }}
			</h3>
			<div class="pt-side__plan">
				<FloorPlan v-bind="plan" auto-height @select="$emit('select', $event)" />
			</div>
			<h3 class="pt-section">
				{{ t('Spots ({count})', { count: rows.length }) }}
			</h3>
			<SpotList class="pt-side__list"
				:rows="rows"
				:editable="editable"
				@select="$emit('select', $event)"
				@rename="(index, name) => $emit('rename', index, name)"
				@pick-capture="(index, file) => $emit('pick-capture', index, file)" />
		</div>
		<div class="pt-side__resize"
			role="separator"
			tabindex="0"
			aria-orientation="vertical"
			:aria-label="t('Width of the side bar')"
			:aria-valuenow="width"
			:aria-valuemin="SIDEBAR_MIN"
			:aria-valuemax="SIDEBAR_MAX"
			:title="t('Drag to change the width')"
			@pointerdown="startResize"
			@keydown.left.prevent="setWidth(width - 16)"
			@keydown.right.prevent="setWidth(width + 16)" />
	</aside>
</template>

<script setup>
import FloorPlan from './FloorPlan.vue'
import SpotList from './SpotList.vue'
import { SIDEBAR_MAX, SIDEBAR_MIN } from '../composables/useLayout.js'
import { t } from '../l10n.js'

const props = defineProps({
	/** props for FloorPlan: src, size, spots, heading */
	plan: { type: Object, required: true },
	rows: { type: Array, required: true },
	editable: { type: Boolean, default: false },
	width: { type: Number, required: true },
})
const emit = defineEmits(['select', 'rename', 'pick-capture', 'update:width'])

const setWidth = (w) => emit('update:width', Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w))))

function startResize(e) {
	const start = { x: e.clientX, w: props.width }
	const target = e.currentTarget
	target.setPointerCapture(e.pointerId)
	const move = (ev) => setWidth(start.w + ev.clientX - start.x)
	const end = () => {
		target.removeEventListener('pointermove', move)
		target.removeEventListener('pointerup', end)
		target.removeEventListener('pointercancel', end)
	}
	target.addEventListener('pointermove', move)
	target.addEventListener('pointerup', end)
	target.addEventListener('pointercancel', end)
}
</script>

<style scoped>
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
	touch-action: none;
}

/* easier to hit with a finger on tablets */
@media (pointer: coarse) {
	.pt-side__resize {
		inset-inline-end: -12px;
		width: 24px;
	}
}

.pt-side__resize:hover {
	background: linear-gradient(var(--color-primary-element), var(--color-primary-element)) center / 2px 100% no-repeat;
}

.pt-side__resize:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -2px;
}
</style>
