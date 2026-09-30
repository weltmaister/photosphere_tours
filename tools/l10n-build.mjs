#!/usr/bin/env node
/**
 * Photosphere Tours
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * l10n/de_DE.json (formal) is the source. This writes the informal l10n/de.json
 * and the l10n/*.js files Nextcloud loads in the browser.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const APP = 'photosphere_tours'
const formal = JSON.parse(readFileSync('l10n/de_DE.json', 'utf8'))

const informal = {
	'Your browser does not support WebGL 2, which the 360° viewer needs.': 'Dein Browser unterstützt kein WebGL 2, das der 360°-Viewer benötigt.',
	'Turn the panorama towards a feature you can find on the plan (a door, a window, a corner) and click that feature on the plan.': 'Dreh das Panorama zu etwas, das du auch im Plan findest (Tür, Fenster, Ecke), und klick es im Plan an.',
	'Click on the plan to create a new capture point, or on an existing point to add the image as a new capture of it.': 'Klick in den Plan für einen neuen Aufnahmepunkt oder auf einen bestehenden Punkt, um das Bild als weitere Aufnahme hinzuzufügen.',
	'Select an image below to place it. Drag points to move them, click a point to open it.': 'Wähl unten ein Bild, um es zu verorten. Punkte lassen sich verschieben; ein Klick öffnet sie.',
	'{file} was changed by someone else in the meantime. Close the walkthrough and open it again to see the current version – your changes will be lost.': '{file} wurde zwischenzeitlich von jemand anderem geändert. Schließ den Rundgang und öffne ihn neu, um den aktuellen Stand zu sehen – deine Änderungen gehen dabei verloren.',
}
for (const key of Object.keys(informal)) {
	if (!(key in formal.translations)) {
		throw new Error(`Informal override for unknown string: ${key}`)
	}
}

const de = { translations: { ...formal.translations, ...informal }, pluralForm: formal.pluralForm }

const writeLang = (lang, data) => {
	writeFileSync(`l10n/${lang}.json`, JSON.stringify(data, null, '\t') + '\n')
	writeFileSync(`l10n/${lang}.js`, `OC.L10N.register(\n\t${JSON.stringify(APP)},\n\t${JSON.stringify(data.translations, null, '\t').replace(/\n/g, '\n\t')},\n\t${JSON.stringify(data.pluralForm)});\n`)
}
writeLang('de_DE', formal)
writeLang('de', de)
console.log(`${Object.keys(formal.translations).length} strings → l10n/de.{js,json}, l10n/de_DE.{js,json}`)
