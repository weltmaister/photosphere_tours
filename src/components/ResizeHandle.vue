<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Drag handle on the edge between two columns (vertical) or two rows (horizontal);
  also works with the arrow keys. The parent places it (position: absolute) on the
  edge it resizes.
-->
<template>
	<div class="pt-resize"
		:class="`pt-resize--${orientation}`"
		role="separator"
		tabindex="0"
		:aria-orientation="orientation"
		:aria-label="label"
		:aria-valuenow="modelValue"
		:aria-valuemin="min"
		:aria-valuemax="max"
		:title="orientation === 'vertical'
			? t('Drag or use the arrow keys to change the width')
			: t('Drag or use the arrow keys to change the height')"
		@pointerdown="start"
		@keydown="onKey" />
</template>

<script setup>
import { t } from '../l10n.js'

const props = defineProps({
	/** px of the column (vertical) or row (horizontal) this handle resizes */
	modelValue: { type: Number, required: true },
	min: { type: Number, required: true },
	max: { type: Number, required: true },
	/** 1: dragging right/down grows the part before the handle, -1: shrinks it */
	direction: { type: Number, default: 1 },
	/** 'vertical': divider between columns (width); 'horizontal': between rows (height) */
	orientation: { type: String, default: 'vertical' },
	label: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const STEP = 16
const KEYS = { vertical: ['ArrowLeft', 'ArrowRight'], horizontal: ['ArrowUp', 'ArrowDown'] }

const set = (size) => emit('update:modelValue', Math.round(Math.min(props.max, Math.max(props.min, size))))

function onKey(e) {
	const [less, more] = KEYS[props.orientation]
	if (e.key === less || e.key === more) {
		e.preventDefault()
		set(props.modelValue + (e.key === more ? STEP : -STEP) * props.direction)
	}
}

function start(e) {
	const axis = props.orientation === 'vertical' ? 'clientX' : 'clientY'
	const from = { at: e[axis], size: props.modelValue }
	const target = e.currentTarget
	target.setPointerCapture(e.pointerId)
	const move = (ev) => set(from.size + (ev[axis] - from.at) * props.direction)
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
	z-index: 3;
	touch-action: none;
}

.pt-resize--vertical {
	top: 0;
	width: 8px;
	height: 100%;
	cursor: col-resize;
}

/* easier to hit with a finger on tablets */
@media (pointer: coarse) {
	.pt-resize--vertical {
		width: 24px;
	}
}

.pt-resize--vertical:hover,
.pt-resize--vertical:active {
	background: linear-gradient(var(--color-primary-element), var(--color-primary-element)) center / 2px 100% no-repeat;
}

.pt-resize--horizontal {
	left: 0;
	width: 100%;
	height: 8px;
	cursor: row-resize;
}

@media (pointer: coarse) {
	.pt-resize--horizontal {
		height: 24px;
	}
}

.pt-resize--horizontal:hover,
.pt-resize--horizontal:active {
	background: linear-gradient(var(--color-primary-element), var(--color-primary-element)) center / 100% 2px no-repeat;
}

.pt-resize:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -2px;
}
</style>
