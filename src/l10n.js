/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * Translations. Vue escapes interpolated text itself and the rest of the app
 * only sets textContent, so placeholders must not be escaped a second time
 * (that would show "&quot;").
 */
import { getCanonicalLocale, n as translatePlural, t as translate } from '@nextcloud/l10n'

import { APP_ID } from './constants.js'

export function t(text, vars) {
	return translate(APP_ID, text, vars, undefined, { escape: false })
}

/** Plural with the count as {count}: n(singular, plural, count). */
export function n(singular, plural, count, vars = {}) {
	return translatePlural(APP_ID, singular, plural, count, { count, ...vars }, { escape: false })
}

/** Localised date, e.g. "18.04.2024" or "18.04.2024, 20:07". */
export function displayDate(date, withTime = true) {
	const value = new Date(date.length === 10 ? `${date}T00:00` : date)
	const options = withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }
	return value.toLocaleString(getCanonicalLocale(), options)
}

/** A failed request as a sentence for the user instead of "Request failed with status code 423". */
export function errorText(error) {
	const status = error?.response?.status
	if (error?.response === undefined && error?.request) {
		return t('No connection to the server')
	}
	switch (status) {
	case 401:
	case 403:
		return t('You are not allowed to do this here')
	case 404:
		return t('The file no longer exists')
	case 423:
		return t('The file is locked, maybe it is open somewhere else')
	case 507:
		return t('There is no storage space left')
	default:
		return status ? t('The server answered with error {status}', { status }) : (error?.message ?? String(error))
	}
}
