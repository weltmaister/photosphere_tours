/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Small helpers for pointer gestures (floor plan, panorama markers).
 */

/** px a press may move and still be a click (else it is a drag) */
export const CLICK_TOLERANCE = 5

/** Whether a press moved further than the click tolerance (points { x, y } in px). */
export function movedBeyond(start, point, tolerance = CLICK_TOLERANCE) {
	return Math.hypot(point.x - start.x, point.y - start.y) > tolerance
}

/** A point { x, y } kept inside a box { width, height } with its origin at 0, 0. */
export function clampToBox({ x, y }, { width, height }) {
	return {
		x: Math.min(width, Math.max(0, x)),
		y: Math.min(height, Math.max(0, y)),
	}
}
