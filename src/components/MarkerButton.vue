<!--
  Photosphere Tours

  This file is licensed under the Affero General Public License version 3 or
  later. See the COPYING file.

  Opens the markers of the shown capture: the photos that belong to the spot
  as a whole (not placed in the panorama), otherwise the first marker. This
  button is also the keyboard and screen reader path to every marker; the
  dialog pages through all of them. Used in the desktop footer and the phone
  sheet.
-->
<template>
	<NcButton variant="tertiary"
		:aria-label="n('Markers here ({count})', 'Markers here ({count})', count)"
		@click="$emit('open')">
		<template #icon>
			<NcIconSvgWrapper :path="unplaced > 0 ? mdiImageMultipleOutline : mdiMapMarkerOutline" />
		</template>
		{{ unplaced > 0
			? n('Photo at this spot ({count})', 'Photos at this spot ({count})', unplaced)
			: n('{count} marker', '{count} markers', count) }}
	</NcButton>
</template>

<script setup>
import { mdiImageMultipleOutline, mdiMapMarkerOutline } from '@mdi/js'
import NcButton from '@nextcloud/vue/components/NcButton'
import NcIconSvgWrapper from '@nextcloud/vue/components/NcIconSvgWrapper'

import { n } from '../l10n.js'

defineProps({
	/** all markers of the shown capture */
	count: { type: Number, required: true },
	/** of those, the ones without a place in the panorama */
	unplaced: { type: Number, default: 0 },
})
defineEmits(['open'])
</script>
