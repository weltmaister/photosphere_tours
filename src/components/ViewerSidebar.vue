<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  The viewer's side bar on desktop: floor plan and spot list, resizable by
  dragging its edge or with the arrow keys on it.
-->
<template>
	<aside ref="side" class="pt-side" :aria-label="t('Floor plan and spots')">
		<h3 class="pt-section">
			{{ t('Floor plan') }}
		</h3>
		<div class="pt-side__plan" :style="{ height: `${planHeight}px` }">
			<FloorPlan v-bind="plan" @select="$emit('select', $event)" />
			<ResizeHandle class="pt-side__rows"
				orientation="horizontal"
				:model-value="planHeight"
				:min="PLAN_HEIGHT_MIN"
				:max="maxPlanHeight"
				:label="t('Height of the floor plan')"
				@update:model-value="$emit('update:planHeight', $event)" />
		</div>
		<h3 class="pt-section">
			{{ listTitle }}
		</h3>
		<SpotList class="pt-side__list"
			:rows="rows"
			:editable="editable"
			@select="$emit('select', $event)"
			@rename="(index, name) => $emit('rename', index, name)"
			@pick-capture="(index, file) => $emit('pick-capture', index, file)" />
		<ResizeHandle class="pt-side__resize"
			:model-value="width"
			:min="SIDEBAR_MIN"
			:max="SIDEBAR_MAX"
			:label="t('Width of the side bar')"
			@update:model-value="$emit('update:width', $event)" />
	</aside>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import FloorPlan from './FloorPlan.vue'
import ResizeHandle from './ResizeHandle.vue'
import SpotList from './SpotList.vue'
import { PLAN_HEIGHT_MIN, SIDEBAR_MAX, SIDEBAR_MIN } from '../composables/useLayout.js'
import { t } from '../l10n.js'

defineProps({
	/** props for FloorPlan: src, size, spots, heading */
	plan: { type: Object, required: true },
	rows: { type: Array, required: true },
	/** heading of the list: "Spots (3)", or with the date of the chosen visit */
	listTitle: { type: String, required: true },
	editable: { type: Boolean, default: false },
	width: { type: Number, required: true },
	/** px height of the floor plan box; the list gets the rest */
	planHeight: { type: Number, required: true },
})
defineEmits(['select', 'rename', 'pick-capture', 'update:width', 'update:planHeight'])

// room the list keeps at least (with its heading)
const LIST_MIN = 160

const side = ref(null)
// until the side bar is measured, the stored height is not capped
const maxPlanHeight = ref(2000)
let observer = null

onMounted(() => {
	observer = new ResizeObserver(([entry]) => {
		maxPlanHeight.value = Math.max(PLAN_HEIGHT_MIN, entry.contentRect.height - LIST_MIN)
	})
	observer.observe(side.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.pt-side {
	position: relative;
	display: flex;
	flex-direction: column;
	grid-area: side;
	min-height: 0;
	border-inline-end: 1px solid var(--color-border);
}

.pt-section {
	margin: 0;
	padding: calc(var(--default-grid-baseline) * 3) calc(var(--default-grid-baseline) * 3) calc(var(--default-grid-baseline) * 2);
	border-top: 1px solid var(--color-border);
	color: var(--color-main-text);
	font-size: var(--default-font-size);
	font-weight: 600;
	flex: none;
}

.pt-section:first-child {
	border-top: none;
}

.pt-side__plan {
	position: relative;
	flex: none;
	box-sizing: border-box;
	padding: 0 calc(var(--default-grid-baseline) * 2);
}

/* on the edge between plan and list */
.pt-side__rows {
	bottom: -4px;
}

.pt-side__list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 0 calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 2);
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
