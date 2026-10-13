<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  One marker of the shown capture: photo large, text below, previous/next
  through all markers of the capture (placed or not). Texts and file names
  come from the JSON file and are only ever shown as text.
-->
<template>
	<NcDialog v-if="open && marker"
		:name="markerTitle(marker)"
		size="large"
		@closing="$emit('update:open', false)">
		<figure class="pt-marker-dialog">
			<img v-if="marker.file && !broken"
				:key="marker.file"
				class="pt-marker-dialog__photo"
				:src="urlFor(marker.file)"
				:alt="markerTitle(marker)"
				@error="broken = true">
			<p v-else-if="marker.file" class="pt-marker-dialog__missing">
				{{ t('Photo not found: {file}', { file: marker.file }) }}
			</p>
			<figcaption v-if="marker.text" class="pt-marker-dialog__text">
				{{ marker.text }}
			</figcaption>
		</figure>
		<template v-if="markers.length > 1" #actions>
			<NcButton :disabled="index === 0" @click="go(-1)">
				{{ t('Previous') }}
			</NcButton>
			<span class="pt-marker-dialog__count" aria-live="polite">{{ t('{n} of {count}', { n: index + 1, count: markers.length }) }}</span>
			<NcButton :disabled="index === markers.length - 1" @click="go(1)">
				{{ t('Next') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcDialog from '@nextcloud/vue/components/NcDialog'

import { markerTitle } from '../markers.js'
import { t } from '../l10n.js'

const props = defineProps({
	markers: { type: Array, required: true },
	/** the shown marker (v-model:index) */
	index: { type: Number, required: true },
	/** v-model:open */
	open: { type: Boolean, default: false },
	/** relative path in the walkthrough folder -> URL */
	urlFor: { type: Function, required: true },
})
const emit = defineEmits(['update:index', 'update:open'])

const marker = computed(() => props.markers[props.index] ?? null)
const broken = ref(false)
watch(marker, () => { broken.value = false })
const go = (step) => emit('update:index', props.index + step)
</script>

<style scoped>
.pt-marker-dialog {
	margin: 0;
}

.pt-marker-dialog__photo {
	display: block;
	max-width: 100%;
	max-height: 70vh;
	margin: 0 auto;
	object-fit: contain;
}

.pt-marker-dialog__text {
	margin-top: calc(var(--default-grid-baseline) * 3);
	white-space: pre-line;
}

.pt-marker-dialog__missing,
.pt-marker-dialog__count {
	color: var(--color-text-maxcontrast);
}
</style>
