<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Editor tab "New images": images of the folder that belong to no spot yet.
  Pick one, then click on the floor plan.
-->
<template>
	<div class="pt-new">
		<NcEmptyContent v-if="images.length === 0"
			:name="t('No new images')"
			:description="t('Copy new 360° images into this folder and they will show up here.')">
			<template #icon>
				<NcIconSvgWrapper :path="mdiImagePlusOutline" />
			</template>
		</NcEmptyContent>
		<template v-else>
			<p class="pt-new__hint">
				{{ t('Images in this folder that do not belong to a spot yet.') }}
			</p>
			<ol class="pt-new__steps">
				<li>{{ t('Pick an image.') }}</li>
				<li>{{ t('Click on the floor plan – on an empty area for a new spot, or on a spot to add the image as another capture.') }}</li>
			</ol>
			<ul class="pt-new__grid">
				<li v-for="image in images" :key="image.path">
					<button type="button"
						class="pt-new__item"
						:class="{ 'pt-new__item--selected': image.path === selected }"
						:aria-pressed="image.path === selected ? 'true' : 'false'"
						@click="$emit('select', image.path === selected ? null : image.path)">
						<img v-if="image.fileid"
							class="pt-new__thumb"
							:src="thumbnail(image.fileid)"
							alt=""
							loading="lazy">
						<span v-else class="pt-new__thumb" aria-hidden="true" />
						<span class="pt-new__name">{{ image.path }}</span>
					</button>
				</li>
			</ul>
		</template>

		<section class="pt-new__plan">
			<h3 class="pt-new__heading">
				{{ t('Floor plan') }}
			</h3>
			<p class="pt-new__hint">
				{{ t('File: {file}', { file: plan }) }}
			</p>
			<NcButton variant="secondary" @click="$emit('change-plan')">
				<template #icon>
					<NcIconSvgWrapper :path="mdiFloorPlan" />
				</template>
				{{ t('Change floor plan') }}
			</NcButton>
		</section>
	</div>
</template>

<script setup>
import { t } from '../l10n.js'
import { generateUrl } from '@nextcloud/router'
import { mdiFloorPlan, mdiImagePlusOutline } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcEmptyContent from '@nextcloud/vue/components/NcEmptyContent'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'

defineProps({
	/** [{ path, fileid }] */
	images: { type: Array, required: true },
	selected: { type: String, default: null },
	plan: { type: String, required: true },
})
defineEmits(['select', 'change-plan'])

const thumbnail = (fileid) => generateUrl('/core/preview?fileId={id}&x=320&y=160&a=1', { id: fileid })
</script>

<style scoped>
.pt-new {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline) * 3);
}

.pt-new__plan {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: calc(var(--default-grid-baseline) * 2);
	margin-top: calc(var(--default-grid-baseline) * 2);
	padding-top: calc(var(--default-grid-baseline) * 4);
	border-top: 1px solid var(--color-border);
}

.pt-new__heading {
	margin: 0;
	font-size: var(--default-font-size);
	font-weight: 600;
}

.pt-new__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
}

.pt-new__steps {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 0;
	padding-inline-start: calc(var(--default-grid-baseline) * 5);
}

.pt-new__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: calc(var(--default-grid-baseline) * 2);
	margin: 0;
	padding: 0;
	list-style: none;
}

.pt-new__item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 100%;
	padding: 4px;
	border: 2px solid transparent;
	border-radius: var(--border-radius-element);
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.pt-new__item:hover {
	background: var(--color-background-hover);
}

.pt-new__item--selected {
	border-color: var(--color-primary-element);
}

.pt-new__item:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: 2px;
}

.pt-new__thumb {
	display: block;
	width: 100%;
	aspect-ratio: 2 / 1;
	border-radius: var(--border-radius);
	background: var(--color-background-dark);
	object-fit: cover;
}

.pt-new__name {
	font-size: var(--font-size-small);
	word-break: break-all;
}
</style>
