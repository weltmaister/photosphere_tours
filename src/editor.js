/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Editor panel next to the panorama: place images from the folder on the
 * plan, move and rename spots, align the view direction and save the tour
 * file. Image files are never touched – removing only drops them from the
 * tour.
 */
import { showConfirmation, showError, showSuccess } from '@nextcloud/dialogs'
import { generateUrl } from '@nextcloud/router'
import { t } from '@nextcloud/l10n'

import { ConflictError, listFolder, urlFor, writeText } from './dav.js'
import {
	TOUR_FILENAME,
	addCapture,
	addSpot,
	alignYaw,
	formatDate as localDate,
	serializeTour,
	unplacedFiles,
} from './tour.js'
import { formatDate } from './viewer.js'

const APP = 'photosphere_tours'
const CLICK_TOLERANCE = 4

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

function button(label, onClick, className = '') {
	const b = el('button', `pt-button ${className}`, label)
	b.type = 'button'
	b.addEventListener('click', onClick)
	return b
}

/**
 * Zoomable floor plan with one pin per spot. Reports clicks in normalised
 * plan coordinates and lets pins be dragged.
 */
class PlanView {
	constructor({ imageUrl, onPlanClick, onPinClick, onPinMoved }) {
		this.onPlanClick = onPlanClick
		this.onPinClick = onPinClick
		this.onPinMoved = onPinMoved
		this.scale = 1
		this.offset = { x: 0, y: 0 }

		this.element = el('div', 'pt-plan')
		this.content = el('div', 'pt-plan__content')
		this.image = el('img', 'pt-plan__image')
		this.image.src = imageUrl
		this.image.draggable = false
		this.image.addEventListener('load', () => this.fit(), { once: true })
		this.pins = el('div', 'pt-plan__pins')
		this.content.append(this.image, this.pins)
		this.element.append(this.content)

		this.element.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })
		this.element.addEventListener('pointerdown', (e) => this.onPointerDown(e))
	}

	fit() {
		const box = this.element.getBoundingClientRect()
		const w = this.image.naturalWidth
		const h = this.image.naturalHeight
		if (!w || !h || !box.width) {
			return
		}
		this.content.style.width = `${w}px`
		this.content.style.height = `${h}px`
		this.scale = Math.min(box.width / w, box.height / h) * 0.95
		this.offset = { x: (box.width - w * this.scale) / 2, y: (box.height - h * this.scale) / 2 }
		this.apply()
	}

	apply() {
		this.content.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.scale})`
		// keep pins the same size on screen
		this.pins.style.setProperty('--pt-pin-scale', String(1 / this.scale))
	}

	toPlan(e) {
		const box = this.content.getBoundingClientRect()
		return {
			x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
			y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
		}
	}

	onWheel(e) {
		e.preventDefault()
		const box = this.element.getBoundingClientRect()
		const factor = Math.exp(-e.deltaY * 0.0015)
		const px = e.clientX - box.left
		const py = e.clientY - box.top
		this.offset.x = px - (px - this.offset.x) * factor
		this.offset.y = py - (py - this.offset.y) * factor
		this.scale *= factor
		this.apply()
	}

	onPointerDown(e) {
		if (e.button !== 0) {
			return
		}
		const pin = e.target.closest('.pt-pin')
		const start = { x: e.clientX, y: e.clientY }
		const startOffset = { ...this.offset }
		let moved = false
		this.element.setPointerCapture(e.pointerId)

		const onMove = (ev) => {
			const dx = ev.clientX - start.x
			const dy = ev.clientY - start.y
			moved ||= Math.hypot(dx, dy) > CLICK_TOLERANCE
			if (!moved) {
				return
			}
			if (pin) {
				const p = this.toPlan(ev)
				pin.style.left = `${p.x * 100}%`
				pin.style.top = `${p.y * 100}%`
			} else {
				this.offset = { x: startOffset.x + dx, y: startOffset.y + dy }
				this.apply()
			}
		}
		const onUp = (ev) => {
			this.element.removeEventListener('pointermove', onMove)
			this.element.removeEventListener('pointerup', onUp)
			const index = pin ? Number(pin.dataset.index) : null
			if (moved && pin) {
				this.onPinMoved(index, this.toPlan(ev))
			} else if (!moved && pin) {
				this.onPinClick(index)
			} else if (!moved) {
				this.onPlanClick(this.toPlan(ev))
			}
		}
		this.element.addEventListener('pointermove', onMove)
		this.element.addEventListener('pointerup', onUp)
	}

	render(spots, currentIndex, heading) {
		this.pins.replaceChildren(...spots.map((spot, i) => {
			const pin = el('div', 'pt-pin')
			pin.dataset.index = String(i)
			pin.title = spot.name
			pin.style.left = `${spot.x * 100}%`
			pin.style.top = `${spot.y * 100}%`
			if (i === currentIndex) {
				pin.classList.add('pt-pin--current')
				const cone = el('div', 'pt-pin__cone')
				cone.style.transform = `rotate(${heading}deg)`
				pin.append(cone)
			}
			return pin
		}))
	}
}

export class TourEditor {
	/** @param {import('./viewer.js').TourViewer} tv */
	constructor(tv) {
		this.tv = tv
		this.tour = tv.tour
		this.dirty = false
		this.selectedFile = null
		this.aligning = false
		this.images = []

		this.element = el('aside', 'pt-editor')
		const header = el('div', 'pt-editor__header')
		header.append(el('h2', '', t(APP, 'Edit walkthrough')))
		this.saveButton = button(t(APP, 'Save'), () => this.save(), 'pt-button--primary')
		header.append(this.saveButton, button(t(APP, 'Done'), () => this.tv.toggleEditor()))

		this.plan = new PlanView({
			imageUrl: tv.fileUrl(this.tour.plan),
			onPlanClick: (p) => this.onPlanClick(p),
			onPinClick: (i) => this.onPinClick(i),
			onPinMoved: (i, p) => this.onPinMoved(i, p),
		})

		this.hint = el('p', 'pt-editor__hint')
		this.spotBox = el('div', 'pt-editor__spot')
		this.inbox = el('div', 'pt-editor__inbox')

		const side = el('div', 'pt-editor__side')
		side.append(this.hint, this.spotBox, this.inbox)
		this.element.append(header, this.plan.element, side)

		this.onPosition = () => this.renderPlan()
		tv.viewer.addEventListener('position-updated', this.onPosition)

		this.updateSaveButton()
		this.renderPlan()
		this.renderSpot()
		this.renderHint()
		this.loadImages()
		requestAnimationFrame(() => this.plan.fit())
	}

	/** Panorama heading on the plan, degrees clockwise from plan-up. */
	heading() {
		return this.tv.viewer.getPosition().yaw * 180 / Math.PI
	}

	renderPlan() {
		this.plan.render(this.tour.spots, this.tv.spotIndex, this.heading())
	}

	renderHint() {
		let text
		if (this.aligning) {
			text = t(APP, 'Turn the panorama towards a feature you can find on the plan (a door, a window, a corner) and click that feature on the plan.')
		} else if (this.selectedFile) {
			text = t(APP, 'Click on the plan to create a new capture point, or on an existing point to add the image as a new capture of it.')
		} else {
			text = t(APP, 'Select an image below to place it. Drag points to move them, click a point to open it.')
		}
		this.hint.textContent = text
		this.element.classList.toggle('pt-editor--aligning', this.aligning)
	}

	renderSpot() {
		const spot = this.tv.currentSpot()
		const capture = this.tv.capture
		this.spotBox.replaceChildren()
		if (!spot || !capture) {
			return
		}

		const name = el('input', 'pt-input')
		name.value = spot.name
		name.setAttribute('aria-label', t(APP, 'Name of the capture point'))
		name.addEventListener('change', () => {
			spot.name = name.value.trim()
			this.changed()
		})

		const date = el('input', 'pt-input')
		date.type = 'datetime-local'
		date.value = capture.date
		date.setAttribute('aria-label', t(APP, 'Capture date'))
		date.addEventListener('change', () => {
			if (date.value) {
				capture.date = date.value.slice(0, 16)
				this.changed()
			}
		})

		const nameRow = el('label', 'pt-field', t(APP, 'Capture point'))
		nameRow.append(name)
		const dateRow = el('label', 'pt-field', t(APP, 'Captured on'))
		dateRow.append(date)
		const file = el('p', 'pt-editor__file', capture.file)

		const actions = el('div', 'pt-editor__actions')
		actions.append(
			button(this.aligning ? t(APP, 'Cancel aligning') : t(APP, 'Align direction'), () => {
				this.aligning = !this.aligning
				this.selectedFile = null
				this.renderInbox()
				this.renderSpot()
				this.renderHint()
			}),
			button(t(APP, 'Remove capture'), () => this.removeCapture(), 'pt-button--danger'),
		)
		this.spotBox.append(nameRow, dateRow, file, actions)
	}

	async loadImages() {
		const { rootUrl, dir } = this.tv.location
		const folderUrl = urlFor(rootUrl, dir)
		try {
			const entries = await listFolder(folderUrl)
			const images = entries.filter(e => !e.isFolder).map(e => ({ ...e, path: e.name }))
			for (const sub of entries.filter(e => e.isFolder)) {
				const children = await listFolder(urlFor(rootUrl, `${dir}/${sub.name}`))
				images.push(...children.filter(e => !e.isFolder).map(e => ({ ...e, path: `${sub.name}/${e.name}` })))
			}
			this.images = images
		} catch (e) {
			showError(t(APP, 'The images of the folder cannot be listed: {error}', { error: e.message }, undefined, { escape: false }))
		}
		this.renderInbox()
	}

	renderInbox() {
		const unplaced = new Set(unplacedFiles(this.tour, this.images.map(i => i.path)))
		const items = this.images.filter(i => unplaced.has(i.path))
		this.inbox.replaceChildren(el('h3', '', t(APP, 'Not placed yet ({count})', { count: items.length })))
		if (items.length === 0) {
			this.inbox.append(el('p', 'pt-editor__empty', t(APP, 'All images of this folder are placed. Copy new panoramas into the folder to add them.')))
			return
		}
		const list = el('ul', 'pt-inbox')
		for (const image of items) {
			const item = el('li', 'pt-inbox__item')
			item.classList.toggle('pt-inbox__item--selected', image.path === this.selectedFile)
			if (image.fileid) {
				const thumb = el('img', 'pt-inbox__thumb')
				thumb.loading = 'lazy'
				thumb.alt = ''
				thumb.src = generateUrl('/core/preview?fileId={id}&x=320&y=160&a=1', { id: image.fileid })
				item.append(thumb)
			}
			item.append(el('span', 'pt-inbox__name', image.path))
			item.tabIndex = 0
			const select = () => {
				this.selectedFile = this.selectedFile === image.path ? null : image.path
				this.aligning = false
				this.renderInbox()
				this.renderSpot()
				this.renderHint()
			}
			item.addEventListener('click', select)
			item.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && select())
			list.append(item)
		}
		this.inbox.append(list)
	}

	fallbackDate(path) {
		const image = this.images.find(i => i.path === path)
		return localDate(image?.mtime ?? new Date())
	}

	onPlanClick(point) {
		if (this.aligning) {
			this.align(point)
			return
		}
		if (!this.selectedFile) {
			return
		}
		addSpot(this.tour, { ...point, file: this.selectedFile, fallbackDate: this.fallbackDate(this.selectedFile) })
		this.selectedFile = null
		this.changed()
		this.tv.goToSpot(this.tour.spots.length - 1)
		this.renderInbox()
		this.renderHint()
	}

	onPinClick(index) {
		const spot = this.tour.spots[index]
		if (this.aligning) {
			this.align({ x: spot.x, y: spot.y })
			return
		}
		if (this.selectedFile) {
			const capture = addCapture(spot, { file: this.selectedFile, fallbackDate: this.fallbackDate(this.selectedFile) })
			this.selectedFile = null
			this.changed()
			this.tv.spotIndex = index
			this.tv.showCapture(capture)
			this.renderInbox()
			this.renderHint()
			return
		}
		this.tv.goToSpot(index)
	}

	onPinMoved(index, point) {
		Object.assign(this.tour.spots[index], point)
		this.changed()
	}

	align(target) {
		const spot = this.tv.currentSpot()
		const capture = this.tv.capture
		capture.yaw = alignYaw(capture, this.tv.viewer.getPosition().yaw, spot, target, this.tv.planSize)
		// the feature the user looks at is now at the clicked bearing: turn the
		// view with it so the picture does not jump
		const bearing = Math.atan2((target.x - spot.x) * this.tv.planSize.w, -(target.y - spot.y) * this.tv.planSize.h)
		this.tv.applyOrientation()
		this.tv.viewer.rotate({ yaw: bearing, pitch: this.tv.viewer.getPosition().pitch })
		this.aligning = false
		this.changed()
		this.renderSpot()
		this.renderHint()
	}

	async removeCapture() {
		const spot = this.tv.currentSpot()
		const capture = this.tv.capture
		const last = spot.captures.length === 1
		const confirmed = await showConfirmation({
			name: last ? t(APP, 'Remove capture point') : t(APP, 'Remove capture'),
			text: last
				? t(APP, '"{name}" will be removed from the walkthrough. The image file stays in the folder.', { name: spot.name }, undefined, { escape: false })
				: t(APP, 'The capture of {date} will be removed from the walkthrough. The image file stays in the folder.', { date: formatDate(capture.date) }, undefined, { escape: false }),
			labelConfirm: t(APP, 'Remove'),
			labelReject: t(APP, 'Cancel'),
		})
		if (!confirmed) {
			return
		}
		if (last) {
			this.tour.spots.splice(this.tv.spotIndex, 1)
			this.tv.spotIndex = Math.max(0, this.tv.spotIndex - 1)
		} else {
			spot.captures.splice(spot.captures.indexOf(capture), 1)
		}
		this.changed()
		if (this.tour.spots.length > 0) {
			this.tv.goToSpot(this.tv.spotIndex)
		} else {
			this.tv.capture = null
		}
		this.renderInbox()
		this.renderSpot()
	}

	onCaptureChanged() {
		this.renderPlan()
		this.renderSpot()
	}

	handleSpotClick() {
		return false
	}

	changed() {
		this.dirty = true
		this.updateSaveButton()
		this.renderPlan()
		this.tv.tourChanged()
	}

	updateSaveButton() {
		this.saveButton.disabled = !this.dirty
	}

	async save() {
		const url = this.tv.node.encodedSource
		try {
			this.tv.etag = await writeText(url, serializeTour(this.tour), this.tv.etag ?? undefined)
			this.dirty = false
			this.updateSaveButton()
			showSuccess(t(APP, 'Walkthrough saved'))
			return true
		} catch (e) {
			if (e instanceof ConflictError) {
				showError(t(APP, '{file} was changed by someone else in the meantime. Close the walkthrough and open it again to see the current version – your changes will be lost.', { file: TOUR_FILENAME }, undefined, { escape: false }))
			} else {
				showError(t(APP, 'The walkthrough cannot be saved: {error}', { error: e.message }, undefined, { escape: false }))
			}
			return false
		}
	}

	/** @return {Promise<boolean>} whether the editor may close */
	async close() {
		if (this.dirty) {
			const save = await showConfirmation({
				name: t(APP, 'Unsaved changes'),
				text: t(APP, 'Save the changes to the walkthrough?'),
				labelConfirm: t(APP, 'Save'),
				labelReject: t(APP, 'Discard'),
			})
			if (save && !(await this.save())) {
				return false
			}
			if (!save) {
				await this.tv.reload()
			}
		}
		this.tv.viewer.removeEventListener('position-updated', this.onPosition)
		this.element.remove()
		return true
	}
}
