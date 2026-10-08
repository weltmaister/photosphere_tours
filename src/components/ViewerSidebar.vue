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
		<ResizeHandle class="pt-side__resize"
			:model-value="width"
			:min="SIDEBAR_MIN"
			:max="SIDEBAR_MAX"
			:label="t('Width of the side bar')"
			@update:model-value="$emit('update:width', $event)" />
	</aside>
</template>

<script setup>
import FloorPlan from './FloorPlan.vue'
import ResizeHandle from './ResizeHandle.vue'
import SpotList from './SpotList.vue'
import { SIDEBAR_MAX, SIDEBAR_MIN } from '../composables/useLayout.js'
import { t } from '../l10n.js'

defineProps({
	/** props for FloorPlan: src, size, spots, heading */
	plan: { type: Object, required: true },
	rows: { type: Array, required: true },
	editable: { type: Boolean, default: false },
	width: { type: Number, required: true },
})
defineEmits(['select', 'rename', 'pick-capture', 'update:width'])
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
	inset-inline-end: -4px;
}

@media (pointer: coarse) {
	.pt-side__resize {
		inset-inline-end: -12px;
	}
}
</style>
