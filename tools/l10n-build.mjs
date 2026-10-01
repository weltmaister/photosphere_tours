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
	'The 360° viewer needs WebGL 2. Use a current browser or enable WebGL in its settings.': 'Der 360°-Viewer braucht WebGL 2. Nutze einen aktuellen Browser oder aktiviere WebGL in den Einstellungen.',
	'The floor plan {file} was not found. Check the "plan" entry in {tour}.': 'Der Grundriss {file} wurde nicht gefunden. Prüf den Eintrag „plan“ in {tour}.',
	'Click a spot on the floor plan to edit it.': 'Klick im Grundriss auf einen Standort, um ihn zu bearbeiten.',
	'Does the view cone on the floor plan point the wrong way? Turn the image towards something distinctive – a door, a window, a corner – then mark where it is on the floor plan.': 'Zeigt der Blickkegel im Grundriss in die falsche Richtung? Dreh das Bild zu etwas Markantem – Tür, Fenster, Ecke – und leg dann fest, wo das im Grundriss liegt.',
	'Click the place on the floor plan that you are looking at in the image.': 'Klick im Grundriss auf die Stelle, die du gerade im Bild siehst.',
	'{file} selected – now click on the floor plan.': '{file} ausgewählt – jetzt im Grundriss klicken.',
	'Copy new 360° images into this folder and they will show up here.': 'Kopier neue 360°-Bilder in diesen Ordner, dann erscheinen sie hier.',
	'Someone else changed the walkthrough in the meantime, so it cannot be saved. Reload it – your changes will be lost.': 'Jemand anderes hat den Rundgang inzwischen geändert, deshalb kann nicht gespeichert werden. Lade ihn neu – deine Änderungen gehen dabei verloren.',
	'Saving failed: {error}. Check your connection and try again.': 'Speichern fehlgeschlagen: {error}. Prüf die Verbindung und versuch es noch einmal.',
	'You changed the walkthrough but have not saved it yet.': 'Du hast den Rundgang geändert, aber noch nicht gespeichert.',
	'Name taken from the floor plan: {name}. You can change it under "Spot".': 'Name aus dem Grundriss übernommen: {name}. Du kannst ihn unter „Standort“ ändern.',
	'Pick an image under "New images" and click on the floor plan.': 'Wähl unter „Neue Bilder“ ein Bild und klick in den Grundriss.',
	'You are not allowed to do this here': 'Dafür fehlt dir hier die Berechtigung',
	'There are no 360° images in this folder. Put the images and a floor plan into one folder first.': 'In diesem Ordner liegen keine 360°-Bilder. Leg zuerst die Bilder und einen Grundriss in einen Ordner.',
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
