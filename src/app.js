/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Mounts the walkthrough as a full-screen overlay above the Files app.
 */
import { createApp } from 'vue'

import TourApp from './components/TourApp.vue'

export function openTour(node) {
	const overlay = document.createElement('div')
	overlay.className = 'photosphere-tours-overlay'
	// above the Nextcloud header, below its dialogs
	Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2500' })
	document.body.append(overlay)

	const app = createApp(TourApp, {
		node,
		onClose: () => {
			app.unmount()
			overlay.remove()
		},
	})
	app.mount(overlay)
	return app
}
