<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Visit switch: show every spot as it was on one day, or the latest.
-->
<template>
	<div class="pt-visits">
		<span class="pt-visits__label" aria-hidden="true">{{ t('Visit') }}</span>
		<div class="pt-visits__scroll">
			<NcRadioGroup :model-value="modelValue"
				:label="t('Visit')"
				hide-label
				@update:model-value="$emit('update:modelValue', $event)">
				<NcRadioGroupButton v-for="visit in visits"
					:key="visit.value"
					:value="visit.value"
					:label="visit.label"
					:title="visit.title" />
			</NcRadioGroup>
		</div>
	</div>
</template>

<script setup>
import { t } from '../l10n.js'
import NcRadioGroup from '@nextcloud/vue/components/NcRadioGroup'
import NcRadioGroupButton from '@nextcloud/vue/components/NcRadioGroupButton'

defineProps({
	/** [{ value, label, title }] – value 'latest' or YYYY-MM-DD */
	visits: { type: Array, required: true },
	modelValue: { type: String, required: true },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.pt-visits {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 3);
	min-width: 0;
}

/* same size and weight as the date buttons next to it */
.pt-visits__label {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--default-font-size);
	font-weight: 500;
}

.pt-visits__scroll {
	min-width: 0;
	overflow-x: auto;
}

@media (max-width: 767px) {
	.pt-visits {
		flex-direction: column;
		align-items: stretch;
		gap: 4px;
	}
}
</style>
