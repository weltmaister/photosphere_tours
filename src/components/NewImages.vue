<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Part of the editing panel: the floor plan file, room name proposals and the
  images of the folder that belong to no spot yet (pick one, then click on the
  floor plan).
-->
<template>
	<div class="pt-new">
		<!-- first: below a long list of images it would be out of reach -->
		<section class="pt-new__plan">
			<div class="pt-new__plan-text">
				<h3 class="pt-new__heading">
					{{ t('Floor plan') }}
				</h3>
				<p class="pt-new__hint">
					{{ plan }}
				</p>
			</div>
			<NcButton v-if="canChangePlan" variant="secondary" @click="$emit('change-plan')">
				<template #icon>
					<NcIconSvgWrapper :path="mdiFloorPlan" />
				</template>
				{{ t('Change floor plan') }}
			</NcButton>
		</section>

		<section v-if="suggestions > 0" class="pt-new__suggestions">
			<p class="pt-new__hint">
				{{ n('{count} spot still has the file name of the camera. The floor plan has a room name for it.', '{count} spots still have the file name of the camera. The floor plan has room names for them.', suggestions) }}
			</p>
			<NcButton variant="secondary" @click="$emit('accept-all')">
				<template #icon>
					<NcIconSvgWrapper :path="mdiFormatListChecks" />
				</template>
				{{ t('Use all suggestions ({count})', { count: suggestions }) }}
			</NcButton>
		</section>

		<h3 class="pt-new__heading pt-new__heading--images">
			{{ t('New images ({count})', { count: images.length }) }}
		</h3>
		<p v-if="images.length === 0" class="pt-new__hint">
			{{ t('Copy new 360° images into this folder and they will show up here.') }}
		</p>
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
						<img v-if="image.fileid && previews"
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
	</div>
</template>

<script setup>
import { generateUrl } from '@nextcloud/router'
import { mdiFloorPlan, mdiFormatListChecks } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'

import { n, t } from '../l10n.js'

defineProps({
	/** [{ path, fileid }] */
	images: { type: Array, required: true },
	selected: { type: String, default: null },
	plan: { type: String, required: true },
	/** false on share pages: previews and the file picker need a login */
	previews: { type: Boolean, default: true },
	canChangePlan: { type: Boolean, default: true },
	/** number of spots with a room name proposal from the floor plan */
	suggestions: { type: Number, default: 0 },
})
defineEmits(['select', 'change-plan', 'accept-all'])

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
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: calc(var(--default-grid-baseline) * 2);
	padding-bottom: calc(var(--default-grid-baseline) * 3);
	border-bottom: 1px solid var(--color-border);
}

.pt-new__suggestions {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: calc(var(--default-grid-baseline) * 2);
	padding-bottom: calc(var(--default-grid-baseline) * 3);
	border-bottom: 1px solid var(--color-border);
}

.pt-new__plan-text {
	min-width: 0;
}

.pt-new__heading {
	margin: 0;
	font-size: var(--default-font-size);
	font-weight: 600;
}

.pt-new__heading--images {
	margin-top: calc(var(--default-grid-baseline) * 2);
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
	border-radius: var(--border-radius-small);
	background: var(--color-background-dark);
	object-fit: cover;
}

.pt-new__name {
	font-size: var(--font-size-small);
	word-break: break-all;
}
</style>
