<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  A note in the editor with an optional action ("Undo", "Use it", …).
  Floating over the floor plan it must not move the plan between two clicks.
-->
<template>
	<div class="pt-note" :class="{ 'pt-note--floating': floating }">
		<NcNoteCard :type="note.type" :text="note.text" />
		<NcButton v-if="note.action" variant="secondary" @click="note.onAction">
			{{ note.action }}
		</NcButton>
	</div>
</template>

<script setup>
import NcButton from '@nextcloud/vue/components/NcButton'
import NcNoteCard from '@nextcloud/vue/components/NcNoteCard'

defineProps({
	/** { type: 'info'|'success'|'warning'|'error', text, action?, onAction? } */
	note: { type: Object, required: true },
	floating: { type: Boolean, default: false },
})
</script>

<style scoped>
.pt-note {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
}

.pt-note :deep(.notecard) {
	flex-grow: 1;
	margin: 0;
}

.pt-note--floating {
	position: absolute;
	z-index: 2;
	top: calc(var(--default-grid-baseline) * 6);
	right: calc(var(--default-grid-baseline) * 6);
	left: calc(var(--default-grid-baseline) * 6);
	pointer-events: none;
}

.pt-note--floating > * {
	pointer-events: auto;
	box-shadow: 0 2px 8px var(--color-box-shadow);
}
</style>
