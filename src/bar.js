/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * The hint bar above the file list.
 */
import { createApp, ref } from 'vue'

import FolderBar from './components/FolderBar.vue'

export function mountBar(el) {
	const state = ref(null)
	const root = document.createElement('div')
	el.append(root)
	createApp(FolderBar, { state }).mount(root)
	return {
		/** @param {null|{ mode: 'open'|'create', count?: number, open: Function }} next */
		show: (next) => { state.value = next },
	}
}
