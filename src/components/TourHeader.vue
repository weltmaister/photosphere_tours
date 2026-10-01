<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Header of the walkthrough: side bar toggle, title with a second line for
  hints, and the actions of the viewer or the editor.
-->
<template>
	<header class="pt-header">
		<NcButton v-if="mode === 'view' && !mobile"
			variant="tertiary"
			:pressed="sidebarOpen"
			:aria-label="t('Show or hide floor plan and spots')"
			:title="t('Show or hide floor plan and spots')"
			@click="$emit('toggle-sidebar')">
			<template #icon>
				<NcIconSvgWrapper :path="mdiDockLeft" />
			</template>
		</NcButton>
		<div class="pt-header__titles">
			<h2 id="photosphere-tours-title" class="pt-header__title">
				{{ title }}
			</h2>
			<p class="pt-header__subline">
				{{ subline }}
			</p>
		</div>
		<template v-if="mode === 'edit'">
			<NcButton v-if="!mobile" variant="secondary" @click="$emit('stop-editing')">
				{{ t('Stop editing') }}
			</NcButton>
			<NcButton variant="primary"
				:disabled="!dirty || saving"
				:title="dirty ? '' : t('No unsaved changes')"
				@click="$emit('save')">
				<template #icon>
					<NcLoadingIcon v-if="saving" />
					<NcIconSvgWrapper v-else :path="mdiCheck" />
				</template>
				{{ t('Save') }}
			</NcButton>
			<NcButton v-if="mobile"
				variant="tertiary"
				:aria-label="t('Stop editing')"
				:title="t('Stop editing')"
				@click="$emit('stop-editing')">
				<template #icon>
					<NcIconSvgWrapper :path="mdiClose" />
				</template>
			</NcButton>
		</template>
		<template v-else>
			<NcButton v-if="mode === 'view' && canEdit"
				:variant="mobile ? 'tertiary' : 'primary'"
				:aria-label="mobile ? t('Edit') : undefined"
				:title="t('Place and move spots, set view directions')"
				@click="$emit('edit')">
				<template #icon>
					<NcIconSvgWrapper :path="mdiPencil" />
				</template>
				<template v-if="!mobile">
					{{ t('Edit') }}
				</template>
			</NcButton>
			<NcButton variant="tertiary"
				:aria-label="t('Close walkthrough (Esc)')"
				:title="t('Close walkthrough (Esc)')"
				@click="$emit('close')">
				<template #icon>
					<NcIconSvgWrapper :path="mdiClose" />
				</template>
			</NcButton>
		</template>
	</header>
</template>

<script setup>
import { mdiCheck, mdiClose, mdiDockLeft, mdiPencil } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'
import NcLoadingIcon from '@nextcloud/vue/components/NcLoadingIcon'

import { t } from '../l10n.js'

defineProps({
	/** 'loading' (also: cannot be opened), 'view' or 'edit' */
	mode: { type: String, required: true },
	title: { type: String, required: true },
	subline: { type: String, default: '' },
	mobile: { type: Boolean, default: false },
	canEdit: { type: Boolean, default: false },
	sidebarOpen: { type: Boolean, default: false },
	dirty: { type: Boolean, default: false },
	saving: { type: Boolean, default: false },
})
defineEmits(['toggle-sidebar', 'edit', 'stop-editing', 'save', 'close'])
</script>

<style scoped>
.pt-header {
	display: flex;
	align-items: center;
	gap: calc(var(--default-grid-baseline) * 2);
	min-height: var(--header-height, 50px);
	padding: 0 calc(var(--default-grid-baseline) * 2);
	border-bottom: 1px solid var(--color-border);
}

.pt-header__titles {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;
	padding-inline-start: calc(var(--default-grid-baseline) * 2);
}

.pt-header__title {
	margin: 0;
	overflow: hidden;
	font-size: calc(var(--default-font-size) * 1.2);
	font-weight: 600;
	line-height: 1.2;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pt-header__subline {
	margin: 0;
	overflow: hidden;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small);
	line-height: 1.2;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
