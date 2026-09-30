/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Full-screen overlay: the panorama, the floor plan as map with one pin per
 * spot, the timeline and – with write permission – the editor.
 */
import { Viewer } from '@photo-sphere-viewer/core'
import { MapPlugin } from '@photo-sphere-viewer/map-plugin'
import { SettingsPlugin } from '@photo-sphere-viewer/settings-plugin'
import { Permission } from '@nextcloud/files'
import { showError } from '@nextcloud/dialogs'
import { getCanonicalLocale, t } from '@nextcloud/l10n'

import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/map-plugin/index.css'
import '@photo-sphere-viewer/settings-plugin/index.css'
import './style.css'

import { locate, readText, urlFor } from './dav.js'
import {
	TourError,
	captureAt,
	captureDays,
	capturesNewestFirst,
	mapZoom,
	parseTour,
	resolvePath,
	sphereCorrection,
} from './tour.js'

const APP = 'photosphere_tours'
const MAP_SIZE = 280

export function formatDate(date, withTime = true) {
	const options = withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }
	return new Date(date.length === 10 ? `${date}T00:00` : date).toLocaleString(getCanonicalLocale(), options)
}

function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error(t(APP, 'Could not load the floor plan {url}', { url: decodeURIComponent(url) }, undefined, { escape: false })))
		img.src = url
	})
}

const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function el(tag, className, text) {
	const node = document.createElement(tag)
	if (className) {
		node.className = className
	}
	if (text !== undefined) {
		node.textContent = text
	}
	return node
}

export class TourViewer {
	/**
	 * @param {import('@nextcloud/files').INode} node the tour file
	 */
	constructor(node) {
		this.node = node
		this.location = locate(node)
		this.canEdit = (node.permissions & Permission.UPDATE) !== 0
		this.tour = null
		this.etag = null
		this.planSize = null
		this.day = null
		this.spotIndex = 0
		this.capture = null
		this.editor = null
		this.onKeyDown = this.onKeyDown.bind(this)
	}

	fileUrl(relative) {
		return urlFor(this.location.rootUrl, resolvePath(this.location.dir, relative))
	}

	async open() {
		this.overlay = el('div', 'pt-overlay')
		this.stage = el('div', 'pt-stage')
		this.overlay.append(this.stage)
		document.body.append(this.overlay)
		document.addEventListener('keydown', this.onKeyDown)

		try {
			const { text, etag } = await readText(this.node.encodedSource)
			this.etag = etag
			this.tour = parseTour(text)
			if (this.tour.spots.length === 0 && !this.canEdit) {
				throw new TourError(t(APP, 'This walkthrough has no capture points yet.'))
			}
			const plan = await loadImage(this.fileUrl(this.tour.plan))
			this.planSize = { w: plan.naturalWidth, h: plan.naturalHeight }
		} catch (e) {
			this.close(true)
			const details = e instanceof TourError ? e.problems.join('\n') : e.message
			showError(t(APP, 'The walkthrough cannot be opened: {details}', { details }, undefined, { escape: false }))
			return
		}

		this.createViewer()
		if (this.tour.spots.length === 0) {
			// a freshly created tour: go straight to placing images
			this.toggleEditor()
		}
	}

	createViewer() {
		const spot = this.tour.spots[0]
		this.capture = spot ? captureAt(spot, null) : null

		const navbar = ['zoom', 'move', 'caption', 'settings']
		if (this.canEdit) {
			navbar.push({
				id: 'pt-edit',
				title: t(APP, 'Edit walkthrough'),
				content: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.7 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75z"/></svg>',
				onClick: () => this.toggleEditor(),
			})
		}
		navbar.push('fullscreen', {
			id: 'pt-close',
			title: t(APP, 'Close'),
			content: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
			onClick: () => this.close(),
		})

		const zoom = mapZoom(this.planSize, MAP_SIZE)
		this.viewer = new Viewer({
			container: this.stage,
			panorama: this.capture ? this.fileUrl(this.capture.file) : undefined,
			sphereCorrection: this.capture ? sphereCorrection(this.capture) : undefined,
			caption: this.caption(),
			defaultZoomLvl: 0,
			navbar,
			withCredentials: true,
			loadingTxt: t(APP, 'Loading …'),
			lang: {
				zoom: t(APP, 'Zoom'),
				zoomOut: t(APP, 'Zoom out'),
				zoomIn: t(APP, 'Zoom in'),
				moveUp: t(APP, 'Move up'),
				moveDown: t(APP, 'Move down'),
				moveLeft: t(APP, 'Move left'),
				moveRight: t(APP, 'Move right'),
				fullscreen: t(APP, 'Fullscreen'),
				menu: t(APP, 'Menu'),
				close: t(APP, 'Close'),
				twoFingers: t(APP, 'Use two fingers to navigate'),
				ctrlZoom: t(APP, 'Use ctrl + scroll to zoom the image'),
				loadError: t(APP, 'The panorama cannot be loaded'),
			},
			plugins: [
				[MapPlugin, {
					imageUrl: this.fileUrl(this.tour.plan),
					center: this.spotCenter(),
					hotspots: this.hotspots(),
					size: `${MAP_SIZE}px`,
					position: 'top left',
					defaultZoom: zoom.initial,
					minZoom: zoom.min,
					maxZoom: zoom.max,
					minimizeOnHotspotClick: false,
					coneColor: '#0082c9',
					spotStyle: { size: 16, color: '#ffffff', borderSize: 2, borderColor: '#0082c9', hoverSize: 20 },
					buttons: { north: false },
				}],
				[SettingsPlugin, {}],
			],
		})

		this.map = this.viewer.getPlugin(MapPlugin)
		this.map.addEventListener('select-hotspot', ({ hotspotId }) => this.onSelectSpot(Number(hotspotId)))

		this.settings = this.viewer.getPlugin(SettingsPlugin)
		this.settings.addSetting({
			id: 'pt-capture',
			label: t(APP, 'Capture'),
			type: 'options',
			current: () => this.capture?.file ?? '',
			options: () => this.currentSpot() ? capturesNewestFirst(this.currentSpot()).map(c => ({ id: c.file, label: formatDate(c.date) })) : [],
			apply: (file) => this.showCapture(this.currentSpot().captures.find(c => c.file === file)),
			badge: () => String(this.currentSpot()?.captures.length ?? ''),
		})

		this.timeline = el('div', 'pt-timeline')
		this.stage.append(this.timeline)
		this.renderTimeline()
	}

	currentSpot() {
		return this.tour.spots[this.spotIndex] ?? null
	}

	spotCenter(spot = this.currentSpot()) {
		return spot ? { x: spot.x * this.planSize.w, y: spot.y * this.planSize.h } : { x: this.planSize.w / 2, y: this.planSize.h / 2 }
	}

	caption() {
		const spot = this.currentSpot()
		if (!spot || !this.capture) {
			return escapeHtml(this.tour.title)
		}
		return `${escapeHtml(spot.name)} · ${formatDate(this.capture.date)}`
	}

	hotspots() {
		return this.tour.spots.map((spot, i) => {
			const shown = captureAt(spot, this.day)
			const hotspot = {
				id: String(i),
				x: spot.x * this.planSize.w,
				y: spot.y * this.planSize.h,
				tooltip: `${escapeHtml(spot.name)}<br><small>${shown ? formatDate(shown.date) : escapeHtml(t(APP, 'not captured yet'))}</small>`,
			}
			if (!shown) {
				Object.assign(hotspot, { color: 'rgba(160,160,160,0.7)', borderColor: 'rgba(90,90,90,0.7)' })
			}
			return hotspot
		})
	}

	refreshMap() {
		this.map.setHotspots(this.hotspots())
		this.map.setCenter(this.spotCenter())
	}

	onSelectSpot(index) {
		if (this.editor?.handleSpotClick(index)) {
			return
		}
		const spot = this.tour.spots[index]
		const capture = captureAt(spot, this.day)
		if (!capture) {
			const first = capturesNewestFirst(spot).at(-1)
			this.viewer.notification.show({
				content: t(APP, '{name} was first captured on {date}.', { name: spot.name, date: formatDate(first.date, false) }),
				timeout: 3000,
			})
			return
		}
		this.spotIndex = index
		this.showCapture(capture)
	}

	/** Show a spot by index, e.g. after the editor added it. */
	goToSpot(index) {
		this.spotIndex = index
		const spot = this.currentSpot()
		this.showCapture(captureAt(spot, this.day) ?? capturesNewestFirst(spot)[0])
	}

	showCapture(capture) {
		if (!capture) {
			return
		}
		this.capture = capture
		// View yaw 0 is plan-up for every capture, so keeping the position keeps
		// the direction the user is looking in.
		const position = this.viewer.getPosition()
		this.viewer.setPanorama(this.fileUrl(capture.file), {
			sphereCorrection: sphereCorrection(capture),
			position,
			caption: this.caption(),
			transition: { effect: 'fade', rotation: false },
		}).catch(() => {
			// interrupted by the next click, or reported by the viewer itself
		})
		this.refreshMap()
		this.editor?.onCaptureChanged()
	}

	/** Re-apply the orientation after the editor changed a capture's yaw. */
	applyOrientation() {
		this.viewer.setOption('sphereCorrection', sphereCorrection(this.capture))
		this.refreshMap()
	}

	setDay(day) {
		this.day = day
		const spot = this.currentSpot()
		const capture = spot ? captureAt(spot, day) : null
		if (capture && capture !== this.capture) {
			this.showCapture(capture)
		} else {
			this.refreshMap()
		}
		this.renderTimeline()
	}

	renderTimeline() {
		const days = captureDays(this.tour)
		this.timeline.replaceChildren()
		this.timeline.hidden = days.length < 2
		const chip = (label, day) => {
			const button = el('button', 'pt-chip', label)
			button.type = 'button'
			button.classList.toggle('pt-chip--active', this.day === day)
			button.addEventListener('click', () => this.setDay(day))
			return button
		}
		this.timeline.append(el('span', 'pt-timeline__label', t(APP, 'Walkthrough')))
		for (const day of days) {
			this.timeline.append(chip(formatDate(day, false), day))
		}
		this.timeline.append(chip(t(APP, 'Latest'), null))
	}

	/** Re-read the tour file, e.g. after the editor discarded its changes. */
	async reload() {
		const { text, etag } = await readText(this.node.encodedSource)
		this.etag = etag
		this.tour = parseTour(text)
		if (this.tour.spots.length > 0) {
			this.goToSpot(Math.min(this.spotIndex, this.tour.spots.length - 1))
		}
		this.tourChanged()
	}

	/** Called by the editor after it changed the tour. */
	tourChanged() {
		if (this.spotIndex >= this.tour.spots.length) {
			this.spotIndex = Math.max(0, this.tour.spots.length - 1)
		}
		this.refreshMap()
		this.viewer.setOption('caption', this.caption())
		this.renderTimeline()
	}

	async toggleEditor() {
		if (this.editor) {
			if (await this.editor.close()) {
				this.editor = null
				this.overlay.classList.remove('pt-overlay--editing')
				this.map.show()
				this.viewer.autoSize()
			}
			return
		}
		const { TourEditor } = await import(/* webpackChunkName: "editor" */ './editor.js')
		this.editor = new TourEditor(this)
		this.overlay.classList.add('pt-overlay--editing')
		this.overlay.prepend(this.editor.element)
		this.map.hide()
		this.viewer.autoSize()
	}

	onKeyDown(e) {
		if (e.key !== 'Escape' || this.editor || document.fullscreenElement) {
			return
		}
		if (e.target instanceof HTMLInputElement) {
			return
		}
		this.close()
	}

	async close(force = false) {
		if (!force && this.editor && !(await this.editor.close())) {
			return
		}
		document.removeEventListener('keydown', this.onKeyDown)
		this.viewer?.destroy()
		this.overlay?.remove()
	}
}

export async function openTour(node) {
	const viewer = new TourViewer(node)
	await viewer.open()
	return viewer
}
