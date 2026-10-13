<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  The capture time under an image of the editor's lists. "≈" and the hint mark a
  time that only comes from the file, not from the camera.
-->
<template>
	<span v-if="date" class="pt-time" :title="estimated ? hint : null">
		<span v-if="estimated" aria-hidden="true">≈ </span>{{ displayDate(date) }}<span v-if="estimated" class="pt-time__hint">{{ hint }}</span>
	</span>
</template>

<script setup>
import { displayDate, t } from '../l10n.js'

defineProps({
	/** YYYY-MM-DDTHH:MM, null shows nothing */
	date: { type: String, default: null },
	/** the time is the file time (no EXIF, no date in the file name) */
	estimated: { type: Boolean, default: false },
})

const hint = t('Time from the file, not from the camera')
</script>

<style scoped>
.pt-time {
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
}

/* for screen readers only: the title is not announced */
.pt-time__hint {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
