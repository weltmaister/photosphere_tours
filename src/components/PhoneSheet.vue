<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  The viewer on phones: a bottom sheet with floor plan and spot list under
  the panorama, and the site visits always in reach.
-->
<template>
	<section class="pt-sheet" :aria-label="t('Floor plan and spots')">
		<button type="button"
			class="pt-sheet__toggle"
			:aria-expanded="open ? 'true' : 'false'"
			@click="$emit('update:open', !open)">
			<span class="pt-sheet__grip" aria-hidden="true" />
			<NcIconSvgWrapper :path="open ? mdiChevronDown : mdiChevronUp" />
			{{ open ? t('Collapse') : t('Floor plan and spots') }}
		</button>
		<template v-if="open">
			<TabBar :model-value="tab"
				:tabs="tabs"
				:label="t('Floor plan and spots')"
				panel-id="pt-sheet-panel"
				id-prefix="pt-sheet-tab"
				@update:model-value="$emit('update:tab', $event)" />
			<div id="pt-sheet-panel"
				role="tabpanel"
				:aria-labelledby="`pt-sheet-tab-${tab}`"
				class="pt-sheet__content">
				<FloorPlan v-if="tab === 'plan'" v-bind="plan" @select="$emit('select', $event)" />
				<SpotList v-else
					:rows="rows"
					:editable="editable"
					@select="$emit('select', $event)"
					@rename="(index, name) => $emit('rename', index, name)"
					@pick-capture="(index, file) => $emit('pick-capture', index, file)" />
			</div>
		</template>
		<div v-if="$slots.default" class="pt-sheet__visits">
			<slot />
		</div>
	</section>
</template>

<script setup>
import { computed } from 'vue'
import { mdiChevronDown, mdiChevronUp } from '@mdi/js'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'

import FloorPlan from './FloorPlan.vue'
import SpotList from './SpotList.vue'
import TabBar from './TabBar.vue'
import { t } from '../l10n.js'

const props = defineProps({
	/** props for FloorPlan: src, size, spots, heading */
	plan: { type: Object, required: true },
	rows: { type: Array, required: true },
	editable: { type: Boolean, default: false },
	open: { type: Boolean, default: false },
	/** 'plan' or 'list' */
	tab: { type: String, default: 'plan' },
})
defineEmits(['select', 'rename', 'pick-capture', 'update:open', 'update:tab'])

const tabs = computed(() => [
	{ id: 'plan', label: t('Floor plan') },
	{ id: 'list', label: t('Spots ({count})', { count: props.rows.length }) },
])
</script>

<style scoped>
.pt-sheet {
	display: flex;
	flex-direction: column;
	grid-area: sheet;
	border-top: 1px solid var(--color-border);
	border-radius: var(--border-radius-container) var(--border-radius-container) 0 0;
	background: var(--color-main-background);
}

.pt-sheet__toggle {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: calc(var(--default-grid-baseline) * 2);
	min-height: var(--clickable-area-large);
	border: none;
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

.pt-sheet__toggle:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -2px;
}

.pt-sheet__grip {
	position: absolute;
	top: calc(var(--default-grid-baseline) * 1.5);
	left: 50%;
	width: calc(var(--default-grid-baseline) * 9);
	height: var(--default-grid-baseline);
	border-radius: var(--default-grid-baseline);
	background: var(--color-border-maxcontrast);
	transform: translateX(-50%);
}

.pt-sheet__content {
	height: 50vh;
	overflow: auto;
	padding: calc(var(--default-grid-baseline) * 2);
}

.pt-sheet__visits {
	padding: calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 3) calc(var(--default-grid-baseline) * 4);
	border-top: 1px solid var(--color-border);
}
</style>
