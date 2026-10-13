/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 */

/** A stored size inside its limits; anything that is not a number gives the fallback. */
export function clampSize(value, min, max, fallback) {
	const n = Number(value)
	if (value === null || value === '' || !Number.isFinite(n)) {
		return fallback
	}
	return Math.min(max, Math.max(min, n))
}
