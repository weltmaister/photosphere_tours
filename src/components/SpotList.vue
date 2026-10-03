<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  List of spots. Spots with several captures show "2 captures" and unfold to
  pick one – the per-spot choice, independent of the visit. With write
  permission the name can be changed right here.
-->
<template>
	<ul ref="list" class="pt-spots">
		<li v-for="(row, index) in rows" :key="index" class="pt-spots__item">
			<div class="pt-spots__row" :class="{ 'pt-spots__row--current': row.state === 'current' }">
				<form v-if="renaming === index" class="pt-spots__rename" @submit.prevent="commit(index)">
					<input ref="field"
						v-model="draft"
						class="pt-spots__input"
						:aria-label="t('Name of the spot')"
						@keydown.esc.stop.prevent="renaming = null"
						@blur="commit(index)">
				</form>
				<button v-else
					type="button"
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
				<button v-if="editable && renaming !== index"
					type="button"
					class="pt-spots__icon"
					:aria-label="t('Rename {name}', { name: row.name })"
					:title="t('Rename {name}', { name: row.name })"
					@click="startRename(index, row.name)">
					<NcIconSvgWrapper :path="mdiPencilOutline" :size="18" />
				</button>
				<button v-if="row.captures.length > 1"
					type="button"
					class="pt-spots__captures-toggle"
					:aria-expanded="expanded === index ? 'true' : 'false'"
					:title="row.capturesLabel"
					@click="expanded = expanded === index ? null : index">
					{{ t('{count} captures', { count: row.captures.length }) }}
					<NcIconSvgWrapper :path="expanded === index ? mdiChevronUp : mdiChevronDown" :size="18" />
				</button>
			</div>
			<div v-if="expanded === index"
				class="pt-spots__captures"
				role="radiogroup"
				:aria-label="row.capturesLabel">
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
import { nextTick, ref, watch } from 'vue'
import { mdiChevronDown, mdiChevronUp, mdiPencilOutline } from '@mdi/js'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'

import { t } from '../l10n.js'

const props = defineProps({
	/** [{ name, date, state, capturesLabel, captures: [{ label, value, checked }] }] */
	rows: { type: Array, required: true },
	/** show the rename button (write permission) */
	editable: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'pick-capture', 'rename'])

const expanded = ref(null)
const renaming = ref(null)
const draft = ref('')
const field = ref(null)
const list = ref(null)

// a spot chosen on the plan scrolls into view in a long list
watch(() => props.rows.findIndex(row => row.state === 'current'), async () => {
	await nextTick()
	list.value?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
})

async function startRename(index, name) {
	renaming.value = index
	draft.value = name
	await nextTick()
	const input = Array.isArray(field.value) ? field.value[0] : field.value
	input?.focus()
	input?.select()
}

function commit(index) {
	if (renaming.value !== index) {
		return
	}
	renaming.value = null
	emit('rename', index, draft.value)
}
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
	overflow: hidden;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* "2 captures ⌄": says what it is, no guessing at a small icon */
.pt-spots__captures-toggle {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: 2px;
	height: var(--default-clickable-area);
	margin-inline-end: 4px;
	padding: 0 4px 0 calc(var(--default-grid-baseline) * 3);
	border: none;
	border-radius: var(--border-radius-element);
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font: inherit;
	font-size: var(--font-size-small);
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;
}

.pt-spots__captures-toggle:hover {
	background: var(--color-background-hover);
}

.pt-spots__icon {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--default-clickable-area);
	height: var(--default-clickable-area);
	padding: 0;
	border: none;
	border-radius: var(--border-radius-element);
	background: transparent;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
	opacity: 0;
}

.pt-spots__row:hover .pt-spots__icon,
.pt-spots__row:focus-within .pt-spots__icon,
.pt-spots__icon:focus-visible {
	opacity: 1;
}

@media (hover: none) {
	.pt-spots__icon {
		opacity: 1;
	}
}

.pt-spots__rename {
	flex-grow: 1;
	min-width: 0;
	padding: 4px;
}

.pt-spots__input {
	width: 100%;
	box-sizing: border-box;
	min-height: var(--default-clickable-area);
	margin: 0;
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
	.pt-spots__captures-toggle,
	.pt-spots__icon,
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
