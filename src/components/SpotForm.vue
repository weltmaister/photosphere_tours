<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Editing panel, section "Spot": name, which capture is edited, its date, how to set
  the view direction (a click on the plan), removal. Removing never deletes files.
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
				<NcTextField ref="nameField"
					:model-value="spot.name"
					:label="t('Name')"
					@update:model-value="$emit('rename', $event)" />
				<NcDateTimePickerNative :model-value="date"
					type="datetime-local"
					:label="t('Captured on')"
					@update:model-value="onDate" />
			</div>
			<!-- a room name read from the plan is only a proposal until taken over -->
			<p v-if="suggestion" class="pt-form__suggestion">
				<span>{{ t('Floor plan: {name}', { name: suggestion }) }}</span>
				<NcButton variant="secondary" size="small" @click="$emit('accept-suggestion')">
					{{ t('Use it') }}
				</NcButton>
			</p>
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
					{{ t('Does the view cone point the wrong way? Turn the image towards something distinctive – a door, a window, a corner – and click on that place in the floor plan. The cone turns there.') }}
				</p>
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
import { computed, ref } from 'vue'
import { mdiTrashCanOutline } from '@mdi/js'
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
	/** room name from the floor plan, offered while the spot has its camera name */
	suggestion: { type: String, default: null },
	/** the spot's captures, newest first: [{ value: file, label, checked }] */
	captures: { type: Array, default: () => [] },
	renameFiles: { type: Boolean, default: true },
})
const emit = defineEmits(['rename', 'pick', 'accept-suggestion', 'set-date', 'remove', 'update:renameFiles'])
const nameField = ref(null)

defineExpose({
	/** put the cursor into the name, e.g. to correct a name taken from the plan */
	focusName() {
		nameField.value?.focus()
		nameField.value?.select()
	},
})

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

.pt-form__suggestion {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 2);
	margin: calc(var(--default-grid-baseline) * -2) 0 0;
	color: var(--color-text-maxcontrast);
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
