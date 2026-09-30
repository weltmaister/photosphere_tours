/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Translations for Vue templates. Vue escapes interpolated text itself, so
 * placeholders must not be escaped a second time (that would show "&quot;").
 */
import { getCanonicalLocale, t as translate } from '@nextcloud/l10n'

export const APP = 'photosphere_tours'

export function t(text, vars) {
	return translate(APP, text, vars, undefined, { escape: false })
}

/** Localised date, e.g. "18.04.2024" or "18.04.2024, 20:07". */
export function displayDate(date, withTime = true) {
	const value = new Date(date.length === 10 ? `${date}T00:00` : date)
	const options = withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }
	return value.toLocaleString(getCanonicalLocale(), options)
}
