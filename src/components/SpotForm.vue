<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Editor tab "Spot": name, which capture is edited, its date and view
  direction, removal. Removing never deletes files.
-->
<template>
	<div class="pt-form">
		<p v-if="!spot" class="pt-form__hint">
			{{ t('Click a spot on the floor plan to edit it.') }}
		</p>
		<template v-else>
			<fieldset v-if="captures.length > 1" class="pt-form__captures">
				<legend class="pt-form__heading">
					{{ t('Capture') }}
				</legend>
				<NcCheckboxRadioSwitch v-for="item in captures"
					:key="item.value"
					type="radio"
					name="pt-form-capture"
					:value="item.value"
					:model-value="item.checked ? item.value : ''"
					@update:model-value="$emit('pick', item.value)">
					{{ item.label }}
				</NcCheckboxRadioSwitch>
			</fieldset>
			<div class="pt-form__fields">
				<NcTextField :model-value="spot.name"
					:label="t('Name')"
					@update:model-value="$emit('rename', $event)" />
				<NcDateTimePickerNative :model-value="date"
					type="datetime-local"
					:label="t('Captured on')"
					@update:model-value="onDate" />
			</div>
			<p class="pt-form__hint">
				{{ t('File: {file}', { file: capture.file }) }}
			</p>
			<NcCheckboxRadioSwitch type="switch"
				:model-value="renameFiles"
				@update:model-value="$emit('update:renameFiles', $event)">
				{{ t('Name the image files after the spot when saving') }}
			</NcCheckboxRadioSwitch>

			<section class="pt-form__section">
				<h3 class="pt-form__heading">
					{{ t('View direction') }}
				</h3>
				<p class="pt-form__hint">
					{{ t('Does the view cone on the floor plan point the wrong way? Turn the image towards something distinctive – a door, a window, a corner – then mark where it is on the floor plan.') }}
				</p>
				<NcButton variant="secondary" :pressed="aligning" @click="$emit('align')">
					<template #icon>
						<NcIconSvgWrapper :path="mdiCompassOutline" />
					</template>
					{{ t('Set view direction') }}
				</NcButton>
			</section>

			<section class="pt-form__section">
				<NcButton variant="tertiary" class="pt-form__remove" @click="$emit('remove')">
					<template #icon>
						<NcIconSvgWrapper :path="mdiTrashCanOutline" />
					</template>
					{{ spot.captures.length > 1 ? t('Remove capture') : t('Remove spot') }}
				</NcButton>
			</section>
		</template>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { mdiCompassOutline, mdiTrashCanOutline } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import NcDateTimePickerNative from '@nextcloud/vue/components/NcDateTimePickerNative'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'
import NcTextField from '@nextcloud/vue/components/NcTextField'

import { t } from '../l10n.js'
import { formatDate } from '../tour.js'

const props = defineProps({
	spot: { type: Object, default: null },
	capture: { type: Object, default: null },
	/** the spot's captures, newest first: [{ value: file, label, checked }] */
	captures: { type: Array, default: () => [] },
	aligning: { type: Boolean, default: false },
	renameFiles: { type: Boolean, default: true },
})
const emit = defineEmits(['rename', 'pick', 'set-date', 'align', 'remove', 'update:renameFiles'])

const date = computed(() => props.capture ? new Date(props.capture.date) : null)

function onDate(value) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		emit('set-date', formatDate(value))
	}
}
</script>

<style scoped>
.pt-form {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline) * 4);
}

.pt-form__captures {
	margin: 0;
	padding: 0;
	border: none;
}

.pt-form__captures .pt-form__heading {
	margin-bottom: var(--default-grid-baseline);
}

.pt-form__fields {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: calc(var(--default-grid-baseline) * 3);
}

.pt-form__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
	word-break: break-word;
}

.pt-form__fields + .pt-form__hint {
	margin-top: calc(var(--default-grid-baseline) * -2);
}

.pt-form__section {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: calc(var(--default-grid-baseline) * 2);
	padding-top: calc(var(--default-grid-baseline) * 4);
	border-top: 1px solid var(--color-border);
}

.pt-form__heading {
	margin: 0;
	font-size: var(--default-font-size);
	font-weight: 600;
}

.pt-form__remove {
	color: var(--color-error-text);
}
</style>
