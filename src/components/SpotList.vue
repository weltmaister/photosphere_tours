<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  List of spots. Spots with several captures carry a clock badge and unfold
  to pick one capture – the per-spot choice, independent of the site visit.
-->
<template>
	<ul class="pt-spots">
		<li v-for="(row, index) in rows" :key="index" class="pt-spots__item">
			<div class="pt-spots__row" :class="{ 'pt-spots__row--current': row.state === 'current' }">
				<button type="button"
					class="pt-spots__main"
					:class="{ 'pt-spots__main--missing': row.state === 'missing' }"
					:aria-current="row.state === 'current' ? 'true' : undefined"
					@click="$emit('select', index)">
					<span class="pt-spots__dot" aria-hidden="true" />
					<span class="pt-spots__text">
						<span class="pt-spots__name">{{ row.name }}</span>
						<span class="pt-spots__date">{{ row.date }}</span>
					</span>
				</button>
				<button v-if="row.captures.length > 1"
					type="button"
					class="pt-spots__badge"
					:aria-expanded="expanded === index ? 'true' : 'false'"
					:aria-label="row.badgeLabel"
					:title="row.badgeLabel"
					@click="expanded = expanded === index ? null : index">
					<NcIconSvgWrapper :path="mdiClockOutline" :size="16" />
					{{ row.captures.length }}
				</button>
			</div>
			<div v-if="expanded === index"
				class="pt-spots__captures"
				role="radiogroup"
				:aria-label="row.badgeLabel">
				<button v-for="(capture, cIndex) in row.captures"
					:key="cIndex"
					type="button"
					role="radio"
					class="pt-spots__capture"
					:aria-checked="capture.checked ? 'true' : 'false'"
					@click="$emit('pick-capture', index, capture.value)">
					<span class="pt-spots__radio" :class="{ 'pt-spots__radio--on': capture.checked }" aria-hidden="true" />
					{{ capture.label }}
				</button>
			</div>
		</li>
	</ul>
</template>

<script setup>
import { ref } from 'vue'
import { mdiClockOutline } from '@mdi/js'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'

defineProps({
	/** [{ name, date, state, badgeLabel, captures: [{ label, value, checked }] }] */
	rows: { type: Array, required: true },
})
defineEmits(['select', 'pick-capture'])

const expanded = ref(null)
</script>

<style scoped>
.pt-spots {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.pt-spots__row {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 1);
	border-radius: var(--border-radius-element);
}

.pt-spots__row:hover {
	background: var(--color-background-hover);
}

.pt-spots__row--current,
.pt-spots__row--current:hover {
	background: var(--color-primary-element-light);
}

.pt-spots__main {
	display: flex;
	flex-grow: 1;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
	min-width: 0;
	min-height: var(--clickable-area-large);
	padding: 0 calc(var(--default-grid-baseline) * 2);
	border: none;
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.pt-spots__main--missing {
	color: var(--color-text-maxcontrast);
}

.pt-spots__dot {
	flex-shrink: 0;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--color-main-text);
}

.pt-spots__row--current .pt-spots__dot {
	background: var(--color-primary-element);
}

.pt-spots__main--missing .pt-spots__dot {
	background: var(--color-border-maxcontrast);
}

.pt-spots__text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.25;
}

.pt-spots__name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pt-spots__row--current .pt-spots__name {
	font-weight: 600;
}

.pt-spots__date {
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
}

.pt-spots__badge {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: 4px;
	height: var(--default-clickable-area);
	margin-inline-end: 4px;
	padding: 0 calc(var(--default-grid-baseline) * 2);
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--default-clickable-area);
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	font-size: var(--font-size-small);
	cursor: pointer;
}

.pt-spots__captures {
	display: flex;
	flex-direction: column;
	padding: 2px 0 6px calc(var(--default-grid-baseline) * 7);
}

.pt-spots__capture {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 2);
	min-height: var(--default-clickable-area);
	padding: 0 calc(var(--default-grid-baseline) * 2);
	border: none;
	border-radius: var(--border-radius-element);
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.pt-spots__capture:hover {
	background: var(--color-background-hover);
}

.pt-spots__radio {
	flex-shrink: 0;
	width: 14px;
	height: 14px;
	box-sizing: border-box;
	border: 2px solid var(--color-border-maxcontrast);
	border-radius: 50%;
}

.pt-spots__radio--on {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
}

@media (pointer: coarse) {
	.pt-spots__badge,
	.pt-spots__capture {
		min-height: var(--clickable-area-large);
	}
}

/* keyboard focus, visible on every background */
button:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -2px;
}
</style>
