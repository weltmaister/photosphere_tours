/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Markers: a text and/or photo of a capture, optionally placed in the panorama.
 * Places are raw panorama coordinates (image centre = yaw 0, right positive,
 * pitch up positive), so correcting a capture's view direction never moves them.
 */

export const PHOTO_FOLDER = '2D-Bilder'
const PHOTO_RE = /\.(jpe?g|png|webp)$/i
const one = (v) => Math.round(v * 10) / 10

export function toTexture({ yaw, pitch }, { width, height }) {
	const x = (((0.5 + yaw / 360) % 1) + 1) % 1
	return { textureX: Math.round(x * width), textureY: Math.round((0.5 - pitch / 180) * height) }
}

export function fromTexture({ textureX, textureY }, { width, height }) {
	const yaw = ((textureX / width - 0.5) * 360 + 360) % 360
	return { yaw: one(yaw), pitch: one((0.5 - textureY / height) * 180) }
}

/**
 * The viewer's texture coordinates count from the loaded part of the image, which
 * is cropped when the image is not a full sphere: `size` is the full image
 * { width, height } with the offset { offsetX, offsetY } of that part.
 */
export function toViewerTexture(place, size) {
	const { textureX, textureY } = toTexture(place, size)
	return { textureX: textureX - size.offsetX, textureY: textureY - size.offsetY }
}

/** Raw place of a point given in the viewer's texture coordinates; null outside the image. */
export function fromViewerTexture({ textureX, textureY }, size) {
	if (typeof textureX !== 'number' || typeof textureY !== 'number') {
		return null
	}
	return fromTexture({ textureX: textureX + size.offsetX, textureY: textureY + size.offsetY }, size)
}

/** for text that goes into innerHTML (the viewer writes tooltips that way) */
export function escapeHtml(text) {
	return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export const markersOf = (capture) => capture?.markers ?? []
export const isPlaced = (marker) => typeof marker.yaw === 'number' && typeof marker.pitch === 'number'

export function markerTitle(marker) {
	const line = (marker.text ?? '').split('\n').map(s => s.trim()).find(Boolean)
	return line ?? (marker.file ?? '').split('/').pop()
}

export function markerCount(spot) {
	return spot.captures.reduce((n, c) => n + markersOf(c).length, 0)
}

export function unusedPhotos(tour, names) {
	const used = new Set(tour.spots.flatMap(s => s.captures.flatMap(c => markersOf(c).map(m => m.file))))
	const prefix = `${PHOTO_FOLDER}/`
	return names.filter(n => n.startsWith(prefix) && !n.slice(prefix.length).includes('/') && PHOTO_RE.test(n) && !used.has(n))
}

/** A marker with a text or a photo; one only placed in the panorama is not saved. */
export const isFilled = (marker) => !!marker.file || (marker.text ?? '').trim() !== ''

/**
 * The tour as it is saved: markers that have neither a text nor a photo (placed
 * in the panorama but never filled) are left out, and a capture without markers
 * has no `markers` key. The tour itself is not changed, so the editor keeps
 * showing the marker that is still being filled in.
 */
export function withoutEmptyMarkers(tour) {
	return {
		...tour,
		spots: tour.spots.map(spot => ({
			...spot,
			captures: spot.captures.map((capture) => {
				if (!capture.markers) {
					return capture
				}
				const { markers, ...rest } = capture
				const kept = markers.filter(isFilled)
				return kept.length > 0 ? { ...rest, markers: kept } : rest
			}),
		})),
	}
}

/**
 * The same, in the tour itself: once the editor is left (or the tour saved) the
 * viewer must not show what the file does not have. The lists stay, even when
 * empty – an "Undo" in the editor still holds them – and save as no key.
 *
 * @return {number} how many markers were removed
 */
export function removeEmptyMarkers(tour) {
	let removed = 0
	for (const spot of tour.spots) {
		for (const capture of spot.captures) {
			const markers = capture.markers ?? []
			for (let i = markers.length - 1; i >= 0; i--) {
				if (!isFilled(markers[i])) {
					markers.splice(i, 1)
					removed++
				}
			}
		}
	}
	return removed
}
