<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Part of the editing panel: the markers of the shown capture (text and/or
  photo, optionally placed in the panorama) and the photos of the photo folder
  that no marker uses yet. Only shows and asks – TourApp changes the data.
  Indexes in the events are those of `markers`.
-->
<template>
	<div ref="root" class="pt-markers">
		<h3 class="pt-markers__heading">
			{{ t('Markers ({count})', { count: markers.length }) }}
		</h3>

		<ul v-if="markers.length > 0" class="pt-markers__list">
			<li v-for="(marker, i) in markers"
				:key="i"
				class="pt-markers__item"
				:class="{ 'pt-markers__item--open': opened === i, 'pt-markers__item--moving': placing === `move:${i}` }">
				<button type="button"
					class="pt-markers__row"
					:aria-expanded="opened === i ? 'true' : 'false'"
					:aria-controls="`pt-marker-editor-${i}`"
					@click="$emit('open', opened === i ? -1 : i)">
					<img v-if="marker.file && !broken.has(marker.file)"
						class="pt-markers__thumb"
						:src="urlFor(marker.file)"
						alt=""
						loading="lazy"
						@error="broken.add(marker.file)">
					<span v-else class="pt-markers__thumb pt-markers__thumb--icon" aria-hidden="true">
						<NcIconSvgWrapper :path="marker.file ? mdiCameraOutline : mdiCommentTextOutline" :size="20" />
					</span>
					<span class="pt-markers__summary">
						<span class="pt-markers__title">{{ markerTitle(marker) || t('New marker') }}</span>
						<span class="pt-markers__hint">{{ isPlaced(marker) ? t('Placed') : t('No place') }}</span>
					</span>
				</button>

				<div v-if="opened === i" :id="`pt-marker-editor-${i}`" class="pt-markers__editor">
					<NcTextArea :model-value="marker.text ?? ''"
						:label="t('Text')"
						:maxlength="MAX_MARKER_TEXT"
						resize="vertical"
						@update:model-value="$emit('edit-text', i, $event)" />
					<p v-if="marker.file" class="pt-markers__hint">
						{{ t('File: {file}', { file: marker.file }) }}
					</p>
					<p v-else-if="(marker.text ?? '').trim() === ''" class="pt-markers__hint">
						{{ t('A marker without text or photo is not saved.') }}
					</p>
					<div class="pt-markers__actions">
						<NcButton variant="secondary" @click="$emit('choose-photo', i)">
							{{ marker.file ? t('Other photo') : t('Choose photo') }}
						</NcButton>
						<NcButton v-if="marker.file" variant="secondary" @click="$emit('remove-photo', i)">
							{{ t('Remove photo') }}
						</NcButton>
						<NcButton variant="secondary" @click="$emit('move', i)">
							{{ isPlaced(marker) ? t('Move in the panorama') : t('Place in the panorama') }}
						</NcButton>
					</div>
					<NcButton variant="tertiary" class="pt-markers__remove" @click="$emit('remove', i)">
						<template #icon>
							<NcIconSvgWrapper :path="mdiTrashCanOutline" />
						</template>
						{{ t('Remove marker') }}
					</NcButton>
				</div>
			</li>
		</ul>

		<div class="pt-markers__place">
			<template v-if="placing">
				<p class="pt-markers__hint" role="status">
					{{ t('Click in the panorama – Esc cancels.') }}
				</p>
				<NcButton variant="tertiary" @click="$emit('cancel-place')">
					{{ t('Cancel') }}
				</NcButton>
			</template>
			<NcButton v-else variant="secondary" @click="$emit('place-new')">
				<template #icon>
					<NcIconSvgWrapper :path="mdiMapMarkerPlusOutline" />
				</template>
				{{ t('Place marker') }}
			</NcButton>
		</div>

		<h3 class="pt-markers__heading pt-markers__heading--photos">
			{{ t('New photos ({count})', { count: photos.length }) }}
		</h3>
		<p class="pt-markers__hint">
			{{ photos.length === 0
				? t('Copy photos into the folder {folder} and they will show up here.', { folder: PHOTO_FOLDER })
				: t('Photos in the folder {folder} that no marker uses yet.', { folder: PHOTO_FOLDER }) }}
		</p>
		<ul v-if="photos.length > 0" class="pt-markers__list">
			<li v-for="photo in photos" :key="photo" class="pt-markers__photo">
				<img v-if="!broken.has(photo)"
					class="pt-markers__thumb"
					:src="urlFor(photo)"
					alt=""
					loading="lazy"
					@error="broken.add(photo)">
				<span v-else class="pt-markers__thumb pt-markers__thumb--icon" aria-hidden="true">
					<NcIconSvgWrapper :path="mdiCameraOutline" :size="20" />
				</span>
				<span class="pt-markers__name">{{ photo.split('/').pop() }}</span>
				<NcButton variant="secondary" size="small" @click="$emit('add-photo', photo)">
					{{ t('Add to this capture') }}
				</NcButton>
			</li>
		</ul>
	</div>
</template>

<script setup>
import { nextTick, reactive, ref, watch } from 'vue'
import { mdiCameraOutline, mdiCommentTextOutline, mdiMapMarkerPlusOutline, mdiTrashCanOutline } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'
import NcTextArea from '@nextcloud/vue/components/NcTextArea'

import { t } from '../l10n.js'
import { PHOTO_FOLDER, isPlaced, markerTitle } from '../markers.js'
import { MAX_MARKER_TEXT } from '../tour.js'

const props = defineProps({
	/** markers of the capture: { yaw?, pitch?, text?, file? } */
	markers: { type: Array, required: true },
	/** photos of the photo folder no marker uses: 'folder/name.jpg', relative to the walkthrough folder */
	photos: { type: Array, default: () => [] },
	/** place mode: null, 'new' or 'move:<index>' */
	placing: { type: String, default: null },
	/** index of the marker whose editor is open, -1 for none */
	opened: { type: Number, default: -1 },
	/** relative path in the walkthrough folder -> URL */
	urlFor: { type: Function, required: true },
})
defineEmits(['place-new', 'move', 'cancel-place', 'edit-text', 'choose-photo', 'remove-photo', 'remove', 'add-photo', 'open'])

const root = ref(null)
/** photos that could not be loaded get an icon instead */
const broken = reactive(new Set())

// a marker clicked in the panorama may lie out of sight in the panel
watch(() => props.opened, async (index) => {
	if (index >= 0) {
		await nextTick()
		root.value?.querySelector('.pt-markers__item--open')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
	}
})

defineExpose({
	/** put the cursor into the text of the open marker */
	focusText: () => root.value?.querySelector('.pt-markers__editor textarea')?.focus(),
})
</script>

<style scoped>
.pt-markers {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline) * 3);
}

.pt-markers__heading {
	margin: 0;
	font-size: var(--default-font-size);
	font-weight: 600;
}

.pt-markers__heading--photos {
	margin-top: calc(var(--default-grid-baseline) * 2);
}

.pt-markers__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
	word-break: break-word;
}

.pt-markers__list {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline);
	margin: 0;
	padding: 0;
	list-style: none;
}

.pt-markers__item {
	border: 2px solid transparent;
	border-radius: var(--border-radius-element);
}

.pt-markers__item--open {
	border-color: var(--color-border-maxcontrast);
}

/* the marker whose place is being chosen */
.pt-markers__item--moving {
	border-color: var(--color-primary-element);
}

.pt-markers__row {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
	width: 100%;
	min-height: var(--default-clickable-area);
	padding: var(--default-grid-baseline);
	border: none;
	border-radius: var(--border-radius-element);
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.pt-markers__row:hover {
	background: var(--color-background-hover);
}

.pt-markers__row:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: 2px;
}

.pt-markers__thumb {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: calc(var(--default-grid-baseline) * 10);
	height: calc(var(--default-grid-baseline) * 10);
	border-radius: var(--border-radius-small);
	background: var(--color-background-dark);
	object-fit: cover;
}

.pt-markers__summary {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.pt-markers__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pt-markers__editor {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: calc(var(--default-grid-baseline) * 3);
	padding: var(--default-grid-baseline) calc(var(--default-grid-baseline) * 2) calc(var(--default-grid-baseline) * 3);
}

.pt-markers__editor > :first-child {
	align-self: stretch;
}

.pt-markers__actions {
	display: flex;
	flex-wrap: wrap;
	gap: calc(var(--default-grid-baseline) * 2);
}

.pt-markers__remove {
	color: var(--color-error-text);
}

.pt-markers__place {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
}

.pt-markers__photo {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
	padding: var(--default-grid-baseline);
}

.pt-markers__name {
	flex: 1 1 8ch;
	min-width: 0;
	font-size: var(--font-size-small);
	word-break: break-all;
}
</style>
