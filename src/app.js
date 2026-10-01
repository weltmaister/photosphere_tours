/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Mounts the walkthrough as a full-screen modal dialog above the Files app.
 * While it is open the page behind is inert, so keyboard and screen reader
 * users stay inside; focus returns to where it was when it closes.
 */
import { createApp } from 'vue'

import TourApp from './components/TourApp.vue'

export function openTour(node) {
	if (document.querySelector('.photosphere-tours-overlay')) {
		return
	}
	const previousFocus = document.activeElement
	const overlay = document.createElement('div')
	overlay.className = 'photosphere-tours-overlay'
	overlay.setAttribute('role', 'dialog')
	overlay.setAttribute('aria-modal', 'true')
	overlay.setAttribute('aria-labelledby', 'photosphere-tours-title')
	overlay.tabIndex = -1
	// above the Nextcloud header, below its dialogs
	Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2500', outline: 'none' })

	// Nextcloud dialogs opened later are appended after the overlay and stay usable
	const inerted = [...document.body.children].filter(el => !el.inert)
	inerted.forEach(el => { el.inert = true })
	document.body.append(overlay)

	const app = createApp(TourApp, {
		node,
		onClose: () => {
			app.unmount()
			overlay.remove()
			inerted.forEach(el => { el.inert = false })
			previousFocus?.focus?.()
		},
	})
	app.mount(overlay)
	overlay.focus()
}
