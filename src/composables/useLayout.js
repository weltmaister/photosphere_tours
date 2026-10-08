/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Phone or desktop, and the layout settings a user keeps between walkthroughs.
 */
import { onBeforeUnmount, ref, watch } from 'vue'

export const SIDEBAR_MIN = 240
export const SIDEBAR_MAX = 560
// the editor's right column (panorama and editing panel); the floor plan beside
// it keeps at least EDITOR_PLAN_MIN
export const EDITOR_MIN = 360
export const EDITOR_MAX = 960
export const EDITOR_PLAN_MIN = 320

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
	sidebarWidth.value = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Number(sidebarWidth.value) || 320))

	const editorColumn = stored('editorColumn', 520)
	editorColumn.value = Math.min(EDITOR_MAX, Math.max(EDITOR_MIN, Number(editorColumn.value) || 520))

	return {
		mobile,
		editorColumn,
		sidebarOpen: stored('sidebarOpen', true),
		sidebarWidth,
		sheetOpen: ref(false),
		sheetTab: ref('plan'),
	}
}
