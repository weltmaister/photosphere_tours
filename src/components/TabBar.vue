<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Tabs of the editor and of the phone's bottom sheet. Keyboard as in the
  ARIA tabs pattern: Tab enters the selected tab, arrow keys move between tabs.
-->
<template>
	<div ref="bar" class="pt-tabs" role="tablist" :aria-label="label">
		<button v-for="tab in tabs"
			:id="`${idPrefix}-${tab.id}`"
			:key="tab.id"
			type="button"
			role="tab"
			class="pt-tab"
			:aria-selected="modelValue === tab.id ? 'true' : 'false'"
			:aria-controls="panelId"
			:tabindex="modelValue === tab.id ? 0 : -1"
			@click="$emit('update:modelValue', tab.id)"
			@keydown="onKey">
			{{ tab.label }}
		</button>
	</div>
</template>

<script setup>
import { nextTick, ref } from 'vue'

const props = defineProps({
	/** [{ id, label }] */
	tabs: { type: Array, required: true },
	modelValue: { type: String, required: true },
	label: { type: String, required: true },
	/** id of the element showing the selected tab's content */
	panelId: { type: String, required: true },
	idPrefix: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])
const bar = ref(null)

async function onKey(e) {
	const index = props.tabs.findIndex(tab => tab.id === props.modelValue)
	const next = {
		ArrowRight: index + 1,
		ArrowLeft: index - 1,
		Home: 0,
		End: props.tabs.length - 1,
	}[e.key]
	if (next === undefined) {
		return
	}
	e.preventDefault()
	const tab = props.tabs[(next + props.tabs.length) % props.tabs.length]
	emit('update:modelValue', tab.id)
	await nextTick()
	bar.value?.querySelector(`#${CSS.escape(`${props.idPrefix}-${tab.id}`)}`)?.focus()
}
</script>

<style scoped>
.pt-tabs {
	display: flex;
	flex-shrink: 0;
	border-bottom: 1px solid var(--color-border);
}

.pt-tab {
	flex: 1;
	min-height: var(--clickable-area-large);
	border: none;
	border-bottom: 3px solid transparent;
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

.pt-tab:hover {
	background: var(--color-background-hover);
}

.pt-tab[aria-selected='true'] {
	border-bottom-color: var(--color-primary-element);
}

.pt-tab:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: -2px;
}
</style>
