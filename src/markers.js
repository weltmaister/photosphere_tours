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
