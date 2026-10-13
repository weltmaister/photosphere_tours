/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Phone or desktop, and the layout settings a user keeps between walkthroughs.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { clampSize } from './clamp.js'

export const SIDEBAR_MIN = 240
export const SIDEBAR_MAX = 560
// the editor's right column (panorama and editing panel); the floor plan beside
// it keeps at least EDITOR_PLAN_MIN
export const EDITOR_MIN = 360
export const EDITOR_MAX = 960
export const EDITOR_PLAN_MIN = 320
// heights of the rows: the floor plan above the spot list, the panorama above the editing panel
export const PLAN_HEIGHT_MIN = 120
export const PANORAMA_HEIGHT_MIN = 160

/** A setting kept in this browser; private windows simply do not keep it. */
export function stored(key, fallback) {
	const value = ref(fallback)
	try {
		const saved = window.localStorage.getItem(`photosphere_tours.${key}`)
		if (saved !== null) {
			value.value = JSON.parse(saved)
		}
	} catch {
		// blocked storage: keep the default
	}
	watch(value, (v) => {
		try {
			window.localStorage.setItem(`photosphere_tours.${key}`, JSON.stringify(v))
		} catch {
			// blocked storage: the setting just is not kept
		}
	})
	return value
}

export function useLayout() {
	const phoneQuery = window.matchMedia('(max-width: 767px)')
	const mobile = ref(phoneQuery.matches)
	const onPhoneChange = (e) => { mobile.value = e.matches }
	phoneQuery.addEventListener('change', onPhoneChange)
	onBeforeUnmount(() => phoneQuery.removeEventListener('change', onPhoneChange))

	const sidebarWidth = stored('sidebarWidth', 320)
	sidebarWidth.value = clampSize(sidebarWidth.value, SIDEBAR_MIN, SIDEBAR_MAX, 320)

	const editorColumn = stored('editorColumn', 520)
	editorColumn.value = clampSize(editorColumn.value, EDITOR_MIN, EDITOR_MAX, 520)

	const sidebarPlanHeight = stored('sidebarPlanHeight', 260)
	sidebarPlanHeight.value = clampSize(sidebarPlanHeight.value, PLAN_HEIGHT_MIN, 2000, 260)

	const editorPanoramaHeight = stored('editorPanoramaHeight', 292)
	editorPanoramaHeight.value = clampSize(editorPanoramaHeight.value, PANORAMA_HEIGHT_MIN, 2000, 292)

	return {
		mobile,
		editorColumn,
		editorPanoramaHeight,
		sidebarOpen: stored('sidebarOpen', true),
		sidebarWidth,
		sidebarPlanHeight,
		sheetOpen: ref(false),
		sheetTab: ref('plan'),
	}
}
