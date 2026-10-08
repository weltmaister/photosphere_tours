<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Drag handle on the edge between two columns; also works with the arrow keys.
  The parent places it (position: absolute) on the edge it resizes.
-->
<template>
	<div class="pt-resize"
		role="separator"
		tabindex="0"
		aria-orientation="vertical"
		:aria-label="label"
		:aria-valuenow="modelValue"
		:aria-valuemin="min"
		:aria-valuemax="max"
		:title="t('Drag to change the width')"
		@pointerdown="start"
		@keydown.left.prevent="set(modelValue - STEP * direction)"
		@keydown.right.prevent="set(modelValue + STEP * direction)" />
</template>

<script setup>
import { t } from '../l10n.js'

const props = defineProps({
	/** width in px of the column this handle resizes */
	modelValue: { type: Number, required: true },
	min: { type: Number, required: true },
	max: { type: Number, required: true },
	/** 1: dragging to the right widens the column (it is left of the handle), -1: narrows it */
	direction: { type: Number, default: 1 },
	label: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const STEP = 16

const set = (width) => emit('update:modelValue', Math.round(Math.min(props.max, Math.max(props.min, width))))

function start(e) {
	const from = { x: e.clientX, width: props.modelValue }
	const target = e.currentTarget
	target.setPointerCapture(e.pointerId)
	const move = (ev) => set(from.width + (ev.clientX - from.x) * props.direction)
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
.pt-resize {
	position: absolute;
	top: 0;
	z-index: 3;
	width: 8px;
	height: 100%;
	cursor: col-resize;
	touch-action: none;
}

/* easier to hit with a finger on tablets */
@media (pointer: coarse) {
	.pt-resize {
		width: 24px;
	}
}

.pt-resize:hover,
.pt-resize:active {
	background: linear-gradient(var(--color-primary-element), var(--color-primary-element)) center / 2px 100% no-repeat;
}

.pt-resize:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -2px;
}
</style>
