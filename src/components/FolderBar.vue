<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Hint bar above the file list: this folder is a walkthrough – or holds 360°
  images that could become one.
-->
<template>
	<div v-if="state.value" class="photosphere-tours-bar">
		<NcIconSvgWrapper class="photosphere-tours-bar__icon" :path="mdiPanoramaSphereOutline" :size="24" />
		<div class="photosphere-tours-bar__text">
			<strong>{{ state.value.mode === 'open' ? t('This folder is a 360° walkthrough') : n('{count} 360° image in this folder', '{count} 360° images in this folder', state.value.count) }}</strong>
			<span>{{ secondLine }}</span>
		</div>
		<NcButton variant="primary" @click="state.value.open()">
			<template #icon>
				<NcIconSvgWrapper :path="state.value.mode === 'open' ? mdiPlay : mdiPlus" />
			</template>
			{{ state.value.mode === 'open' ? t('Open walkthrough') : t('Create 360° walkthrough') }}
		</NcButton>
	</div>
</template>

<script setup>
import { mdiPanoramaSphereOutline, mdiPlay, mdiPlus } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'

import { computed } from 'vue'

import { n, t } from '../l10n.js'

const props = defineProps({
	/** ref: null | { mode: 'open'|'create', count?: number, readOnly?: boolean, open: Function } */
	state: { type: Object, required: true },
})

const secondLine = computed(() => {
	const state = props.state.value
	if (state.mode === 'create') {
		return t('Placed on a floor plan, they become a walkthrough.')
	}
	return state.readOnly
		? t('Floor plan, spots and visits in one view.')
		: t('Stored in "360-Rundgang.json" – please do not delete or rename that file.')
})
</script>

<style scoped>
.photosphere-tours-bar {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
	margin: calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 3);
	padding: calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 3);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-container);
	background: var(--color-primary-element-light);
	color: var(--color-main-text);
}

.photosphere-tours-bar__icon {
	flex-shrink: 0;
	color: var(--color-primary-element);
}

.photosphere-tours-bar__text {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;
	line-height: 1.3;
}

.photosphere-tours-bar__text span {
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
}

@media (max-width: 767px) {
	.photosphere-tours-bar {
		flex-wrap: wrap;
	}
}
</style>
