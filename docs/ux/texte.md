# Begriffe und Texte

Gilt für Oberfläche, README und App-Store-Text. Sprachen:
- `de`: Nextcloud-Standard, Du-Form
- `de_DE`: förmlich, Sie-Form
- `en`

## Glossar

| Begriff (de) | en | Bedeutung | ersetzt |
|---|---|---|---|
| **Rundgang** | walkthrough | Eine Datei `360-Rundgang.json`, also ein Geschoss oder Bereich mit Grundriss | – |
| **Grundriss** | floor plan | Das Planbild des Rundgangs | „Plan“ |
| **Standort** | spot | Ein Punkt im Grundriss, an dem fotografiert wurde | „Aufnahmepunkt“, „Punkt“ |
| **Aufnahme** | capture | Ein 360°-Bild eines Standorts zu einem Zeitpunkt | „Stand“ |
| **Begehung** | visit | Alle Aufnahmen eines Tages | „Walkthrough“ in der Zeitachse |
| **Alle** | All | Jeder Standort mit seiner jüngsten Aufnahme (Gegenstück zu einer Begehung) | „Neueste“, „Aktuell“ |
| **Neue Bilder** | new images | Bilder im Ordner, die noch zu keinem Standort gehören | „Noch nicht verortet“ |
| **Markierung** | marker | Ein Text und/oder Foto zu einer Aufnahme, auf Wunsch an einer Stelle im Panorama. Ein Begriff für alle drei Fälle (Foto an einer Stelle, Kommentar, Foto ohne Stelle); die ohne Stelle heißen „Fotos an diesem Standort“ | „Notiz“, „Pin“, „Hotspot“ |
| **platzieren** | place | Ein neues Bild einem Standort zuordnen | „verorten“ |
| **Blickrichtung festlegen** | set view direction | Bild und Grundriss in Übereinstimmung bringen | „Richtung ausrichten“ |

Regeln:
- **Ein Begriff je Sache.** „Standort“ nie mit „Punkt“ mischen, „Aufnahme“ nie mit „Bild“, außer bei Dateien im Ordner („Neue Bilder“, „Bilddatei“).
- **Buttons beginnen mit einem Verb** („Speichern“, „Grundriss wechseln“). Ausnahmen sind Umschalter und Tabs.
- **Löschen erklärt immer die Folge:** Die Bilddatei bleibt im Ordner.
- **Fehlermeldungen folgen dem Muster** „Was ist passiert – was tun“.

## Texte

`{…}` sind Platzhalter. Neu = kommt mit dem neuen Layout (Kopf- und Fußleiste, Seitenleiste).

### Dateien-App

| Stelle | de | de_DE | en |
|---|---|---|---|
| Datei-Aktion | 360°-Rundgang öffnen | = | Open 360° walkthrough |
| Menü „Neu“ | 360°-Rundgang | = | 360° walkthrough |
| Auswahl Grundriss (Titel) | Grundriss für diesen Rundgang wählen | = | Choose the floor plan for this walkthrough |
| Schon vorhanden | In diesem Ordner gibt es schon einen Rundgang ({file}). | = | This folder already has a walkthrough ({file}). |
| Anlegen fehlgeschlagen | Der Rundgang konnte nicht angelegt werden: {error} | = | The walkthrough could not be created: {error} |
| Kein WebGL | Der 360°-Viewer braucht WebGL 2. Nutze einen aktuellen Browser oder aktiviere WebGL in den Einstellungen. | … Nutzen Sie … aktivieren Sie … | The 360° viewer needs WebGL 2. Use a current browser or enable WebGL in its settings. |

### Kopfleiste (neu)

| Stelle | de | de_DE | en |
|---|---|---|---|
| Titel | {title} | = | {title} |
| Button | Bearbeiten | = | Edit |
| Tooltip Bearbeiten | Standorte platzieren, verschieben und Blickrichtung festlegen | = | Place and move spots, set view directions |
| Tooltip Grundriss | Grundriss ein- oder ausblenden | = | Show or hide floor plan |
| Tooltip Schließen | Rundgang schließen (Esc) | = | Close walkthrough (Esc) |
| Button und Tooltip Karte (nur mit bekanntem Ort, nicht auf Freigabeseiten) | In OpenStreetMap öffnen | = | Open in OpenStreetMap |

### Fußleiste: Zeitachse (neu)

| Stelle | de | de_DE | en |
|---|---|---|---|
| Beschriftung | Begehung | = | Visit |
| Standardwahl (erste Schaltfläche) | Alle | = | All |
| Tooltip Datum | Nur die Standorte, die am {date} aufgenommen wurden | = | Only the spots captured on {date} |
| Tooltip Alle | Alle Standorte mit ihrer neuesten Aufnahme; weitere Aufnahmen in der Liste wählen | = | All spots with their latest capture; pick other captures in the list |

Ein Datum zeigt in Liste und Grundriss nur die Standorte, die an dem Tag aufgenommen wurden, je mit dieser Aufnahme und ohne Aufnahmenauswahl. „Alle“ zeigt jeden Standort mit seiner neuesten Aufnahme; dort lässt sich eine andere wählen.

### Seitenleiste „Grundriss und Standorte“ (neu)

Die Auswahl einer bestimmten Aufnahme sitzt nicht mehr in der Fußleiste. Sie steckt in der Standortliste: Unter „Alle“ zeigen Einträge mit mehreren Aufnahmen „{n} Aufnahmen“ und lassen sich aufklappen; im Editor wählt man die Aufnahme unter „Standort“.

| Stelle | de | de_DE | en |
|---|---|---|---|
| Tooltip Umschalter | Grundriss und Standorte ein- oder ausblenden | = | Show or hide floor plan and spots |
| Abschnitt 1 | Grundriss | = | Floor plan |
| Abschnitt 2 | Standorte ({count}) | = | Spots ({count}) |
| Abschnitt 2, Begehung gewählt | Standorte am {date} ({count}) | = | Spots on {date} ({count}) |
| Kopfzeile nach Wahl einer Begehung | {count} Standort(e) am {date} aufgenommen | = | {count} spot(s) captured on {date} |
| Listeneintrag Datum | {date} | = | {date} |
| Zähler (Tooltip) | {count} Aufnahmen von {name} | = | {count} captures of {name} |
| Eintrag neueste | {date} (neueste) | = | {date} (latest) |
| Rand ziehen | Ziehen oder Pfeiltasten benutzen, um die Breite zu ändern | = | Drag or use the arrow keys to change the width |
| Trennlinie Grundriss / Liste (Beschriftung) | Höhe des Grundrisses | = | Height of the floor plan |
| Trennlinie, Tooltip | Ziehen oder Pfeiltasten benutzen, um die Höhe zu ändern | = | Drag or use the arrow keys to change the height |
| Markierungen im Eintrag (Tooltip) | {count} Markierung(en) | = | {count} marker(s) |
| Handy: Blatt öffnen | Grundriss und Standorte | = | Floor plan and spots |
| Handy: Blatt schließen | Einklappen | = | Collapse |

### Grundriss im Viewer

| Stelle | de | de_DE | en |
|---|---|---|---|
| Tooltip Standort | {name} · {date} | = | {name} · {date} |
| Karte vergrößern / verkleinern | Grundriss vergrößern / Grundriss verkleinern | = | Enlarge / shrink floor plan |
| Karte zurücksetzen | Auf aktuellen Standort zentrieren | = | Center on current spot |
| Zoom | Vergrößern / Verkleinern | = | Zoom in / Zoom out |
| Markierungen, Button (mit Fotos ohne Stelle) | Foto an diesem Standort ({count}) / Fotos an diesem Standort ({count}) | = | Photo at this spot ({count}) / Photos at this spot ({count}) |
| Markierungen, Button (sonst) | {count} Markierung / {count} Markierungen | = | {count} marker / {count} markers |
| Markierung, Dialog: Titel | erste Textzeile, sonst Dateiname | = | first line of the text, else file name |
| Markierung, Dialog: Foto fehlt | Foto nicht gefunden: {file} | = | Photo not found: {file} |
| Markierung, Dialog: Blättern | Zurück / Weiter | = | Previous / Next |
| Markierung, Dialog: Zähler | {n} von {count} | = | {n} of {count} |

### Viewer allgemein

| Stelle | de | de_DE | en |
|---|---|---|---|
| Laden | Wird geladen … | = | Loading … |
| Bild fehlt | Das Bild konnte nicht geladen werden. | = | The image could not be loaded. |
| Öffnen fehlgeschlagen | Der Rundgang lässt sich nicht öffnen: {details} | = | The walkthrough cannot be opened: {details} |
| Grundriss fehlt | Der Grundriss {file} wurde nicht gefunden. Prüf den Eintrag „plan“ in {tour}. | … Prüfen Sie … | The floor plan {file} was not found. Check the "plan" entry in {tour}. |
| Leer, nur lesend | In diesem Rundgang ist noch kein Standort platziert. | = | No spots have been placed in this walkthrough yet. |
| Zwei Finger | Mit zwei Fingern bewegen | = | Use two fingers to move |
| Strg + Scrollen | Zum Zoomen Strg gedrückt halten und scrollen | = | Hold Ctrl and scroll to zoom |

### Editor: Kopf der Seitenleiste

| Stelle | de | de_DE | en |
|---|---|---|---|
| Überschrift | Rundgang bearbeiten | = | Edit walkthrough |
| Speichern | Speichern | = | Save |
| Tooltip Speichern, deaktiviert | Keine ungespeicherten Änderungen | = | No unsaved changes |
| Beenden | Bearbeiten beenden | = | Stop editing |
| Handy: Tab 1 | Grundriss | = | Floor plan |
| Handy: Tab 2 | Standort und Bilder | = | Spot and images |

### Editor: Tab „Standort“

| Stelle | de | de_DE | en |
|---|---|---|---|
| Nichts gewählt | Klick im Grundriss auf einen Standort, um ihn zu bearbeiten. | Klicken Sie … | Click a spot on the floor plan to edit it. |
| Feld Name | Name | = | Name |
| Feld Datum | Aufgenommen am | = | Captured on |
| Datei | Datei: {file} | = | File: {file} |
| Abschnitt | Blickrichtung | = | View direction |
| Erklärung | Zeigt der Blickkegel im Grundriss in die falsche Richtung? Dreh das Bild zu etwas Markantem – Tür, Fenster, Ecke – und leg dann fest, wo das im Grundriss liegt. | Zeigt … ? Drehen Sie … und legen Sie dann fest … | Does the view cone on the floor plan point the wrong way? Turn the image towards something distinctive – a door, a window, a corner – then mark where it is on the floor plan. |
| Hinweis | Zeigt der Blickkegel in die falsche Richtung? Drehen Sie das Bild zu etwas Markantem – Tür, Fenster, Ecke – und klicken Sie im Grundriss auf diese Stelle. Der Kegel dreht sich dorthin. | Dreh … klick … | Does the view cone point the wrong way? … |
| Während des Festlegens | Klick im Grundriss auf die Stelle, die du gerade im Bild siehst. | Klicken Sie …, die Sie … sehen. | Click the place on the floor plan that you are looking at in the image. |
| Abbrechen | Abbrechen | = | Cancel |
| Erfolg | Blickrichtung übernommen – noch nicht gespeichert [Rückgängig] | = | View direction set – not saved yet [Undo] |
| Entfernen (mehrere Aufnahmen) | Aufnahme entfernen | = | Remove capture |
| Entfernen (letzte Aufnahme) | Standort entfernen | = | Remove spot |
| Tooltip Standort im Editor | {name} – ziehen oder mit den Pfeiltasten verschieben | = | {name} – drag or move with the arrow keys |

### Editor: Markierungen

Abschnitt „Markierungen ({count})“ unter dem Standort, für die gewählte Aufnahme; darunter „Neue Fotos“. Fotos liegen im Unterordner `2D-Bilder`. Auf Freigabeseiten fehlt „Foto wählen“ (keine Dateiauswahl ohne Anmeldung).

| Stelle | de | de_DE | en |
|---|---|---|---|
| Überschrift | Markierungen ({count}) | = | Markers ({count}) |
| Eintrag ohne Text und Foto | Neue Markierung | = | New marker |
| Eintrag: Ort | gesetzt / ohne Ort | = | Placed / No place |
| Button, neue Markierung | Markierung setzen | = | Place marker |
| Hinweis im Setzen-Modus | Klick ins Panorama – Esc bricht ab. | Klicken Sie ins Panorama – Esc bricht ab. | Click in the panorama – Esc cancels. |
| Abbrechen | Abbrechen | = | Cancel |
| Feld | Text | = | Text |
| Datei | Datei: {file} | = | File: {file} |
| Hinweis ohne Text und Foto | Eine Markierung ohne Text und Foto wird nicht gespeichert. | = | A marker without text or photo is not saved. |
| Foto | Foto wählen / Anderes Foto / Foto entfernen | = | Choose photo / Other photo / Remove photo |
| Ort (Markierung ohne Ort) | Im Panorama setzen | = | Place in the panorama |
| Hinweis, gesetzte Markierung | Symbol im Panorama ziehen, um die Markierung zu verschieben. | = | Drag the icon in the panorama to move the marker. |
| Entfernen | Markierung entfernen | = | Remove marker |
| Abschnitt neue Fotos | Neue Fotos ({count}) | = | New photos ({count}) |
| Leer | Kopier Fotos in den Ordner „{folder}“, dann erscheinen sie hier. | Kopieren Sie Fotos in den Ordner „{folder}“, dann erscheinen sie hier. | Copy photos into the folder {folder} and they will show up here. |
| Einleitung | Fotos aus dem Ordner „{folder}“, die noch keine Markierung nutzt. | = | Photos in the folder {folder} that no marker uses yet. |
| Foto zuordnen | Zu dieser Aufnahme hinzufügen | = | Add to this capture |
| Gesetzt (neu oder „Im Panorama setzen“) | Markierung gesetzt – noch nicht gespeichert [Rückgängig] | = | Marker placed – not saved yet [Undo] |
| Verschoben (Symbol gezogen) | Markierung verschoben – noch nicht gespeichert [Rückgängig] | = | Marker moved – not saved yet [Undo] |
| Entfernt | Markierung entfernt – noch nicht gespeichert [Rückgängig] | = | Marker removed – not saved yet [Undo] |
| Foto entfernt, nichts übrig | Eine Markierung braucht einen Text oder ein Foto. | = | A marker needs a text or a photo. |
| Auswahl fehlgeschlagen | Das Foto konnte nicht gewählt werden: {error} | = | The photo could not be chosen: {error} |
| Kopieren fehlgeschlagen | Das Foto konnte nicht in den Ordner „{folder}“ kopiert werden: {error} | = | The photo could not be copied into the folder {folder}: {error} |
| Kein freier Name | Für das Foto gibt es in diesem Ordner keinen freien Dateinamen. | = | There is no free file name for the photo in this folder. |
| Liste fehlgeschlagen | Die Fotos aus dem Ordner „{folder}“ konnten nicht geladen werden: {error} | = | The photos in the folder {folder} could not be loaded: {error} |

Das Entfernen einer Markierung fragt nicht nach, sondern bietet „Rückgängig“ an (Ausnahme, Begründung in [gestaltung.md](gestaltung.md)). Die Bilddatei bleibt im Ordner, das steht deshalb nicht in der Meldung.

### Editor: Tab „Neue Bilder“

| Stelle | de | de_DE | en |
|---|---|---|---|
| Einleitung | Bilder aus diesem Ordner, die noch zu keinem Standort gehören. | = | Images in this folder that do not belong to a spot yet. |
| Schritte | 1. Bild wählen. 2. Im Grundriss klicken – auf eine freie Stelle für einen neuen Standort oder auf einen Standort, um das Bild als weitere Aufnahme hinzuzufügen. | … wählen … klicken … | 1. Pick an image. 2. Click on the floor plan – on an empty area for a new spot, or on a spot to add the image as another capture. |
| Ausgewählt | {file} ausgewählt – jetzt im Grundriss klicken. | … – klicken Sie jetzt im Grundriss. | {file} selected – now click on the floor plan. |
| Auswahl aufheben | Auswahl aufheben | = | Deselect |
| Leer: Titel | Keine neuen Bilder | = | No new images |
| Leer: Text | Kopier neue 360°-Bilder in diesen Ordner, dann erscheinen sie hier. | Kopieren Sie …, dann erscheinen sie hier. | Copy new 360° images into this folder and they will show up here. |
| Grundriss leer | Noch keine Standorte. Wähl unter „Neue Bilder“ ein Bild und klick in den Grundriss. | … Wählen Sie … und klicken Sie … | No spots yet. Pick an image under "New images" and click on the floor plan. |
| Liste fehlgeschlagen | Die Bilder dieses Ordners konnten nicht geladen werden: {error} | = | The images in this folder could not be loaded: {error} |
| Aufnahmezeit unter jeder Vorschau („Neue Bilder“ und „Neue Fotos“), älteste zuerst | {date} (Datum und Uhrzeit, z. B. „24.07.2023, 13:17“) | = | {date} |
| Aufnahmezeit nur aus der Datei (weder EXIF noch Datum im Dateinamen): „≈“ davor, Tooltip und Vorlesetext | ≈ {date} – Zeit aus der Datei, nicht von der Kamera | = | ≈ {date} – Time from the file, not from the camera |

### Editor: Speichern und Dialoge

| Stelle | de | de_DE | en |
|---|---|---|---|
| Gespeichert | Rundgang gespeichert | = | Walkthrough saved |
| Konflikt | Jemand anderes hat den Rundgang inzwischen geändert, deshalb kann nicht gespeichert werden. Lade ihn neu – deine Änderungen gehen dabei verloren. | … Laden Sie ihn neu – Ihre Änderungen … | Someone else changed the walkthrough in the meantime, so it cannot be saved. Reload it – your changes will be lost. |
| Konflikt-Button | Neu laden | = | Reload |
| Fehler | Speichern fehlgeschlagen: {error}. Prüf die Verbindung und versuch es noch einmal. | … Prüfen Sie … versuchen Sie … | Saving failed: {error}. Check your connection and try again. |
| Dialog Aufnahme: Titel | Aufnahme vom {date} entfernen? | = | Remove the capture from {date}? |
| Dialog Standort: Titel | Standort „{name}“ entfernen? | = | Remove spot "{name}"? |
| Dialog: Text (Standort) | Der Standort verschwindet aus dem Rundgang. Seine Bilddatei bleibt im Ordner. | = | The spot disappears from the walkthrough. Its image file stays in the folder. |
| Dialog: Text (Aufnahme) | Die Aufnahme verschwindet aus dem Rundgang. Die Bilddatei bleibt im Ordner. | = | The capture disappears from the walkthrough. The image file stays in the folder. |
| Meldung nach Klick auf einen Standort mit gewähltem Bild | Als weitere Aufnahme zu „{name}“ hinzugefügt. [Rückgängig] | = | Added as another capture of "{name}". [Undo] |
| Vorschlag nach dem Platzieren (PDF-Plan) | Im Grundriss steht hier „{name}“. [Übernehmen] | = | The floor plan says "{name}" here. [Use it] |
| Vorschlag am Namensfeld | Im Grundriss: {name} [Übernehmen] | = | Floor plan: {name} [Use it] |
| Neue Bilder: offene Vorschläge | {n} Standorte tragen noch den Dateinamen der Kamera. Der Grundriss hat dafür Raumnamen. [Alle Vorschläge übernehmen ({n})] | = | {n} spots still have the file name of the camera. … [Use all suggestions ({n})] |
| Nach „Alle übernehmen“ | {n} Namen aus dem Grundriss übernommen – bitte vor dem Speichern unter „Standort“ prüfen. | = | {n} names taken from the floor plan – check them under "Spot" before saving. |
| Dialog: Buttons | Entfernen / Behalten | = | Remove / Keep |
| Ungespeichert: Titel | Änderungen speichern? | = | Save changes? |
| Ungespeichert: Text | Du hast den Rundgang geändert, aber noch nicht gespeichert. | Sie haben … | You changed the walkthrough but have not saved it yet. |
| Ungespeichert: Buttons | Speichern / Verwerfen | = | Save / Discard |

### Prüfmeldungen beim Öffnen (bisher nur englisch)

| Stelle | de | en |
|---|---|---|
| Ungültiges JSON | Die Datei ist kein gültiges JSON ({error}). | The file is not valid JSON ({error}). |
| Version | Unbekannte Version {version} – erwartet wird {expected}. | Unknown version {version}, expected {expected}. |
| Grundriss fehlt | „plan“ muss auf das Grundrissbild verweisen. | "plan" must point to the floor plan image. |
| Standort ohne Aufnahme | Standort {n} ({name}) hat keine Aufnahme. | Spot {n} ({name}) has no capture. |
| Koordinate | Standort {n}: „{axis}“ muss zwischen 0 und 1 liegen. | Spot {n}: "{axis}" must be between 0 and 1. |
| Pfad | Standort {n}, Aufnahme {m}: „file“ muss im Ordner des Rundgangs liegen. | Spot {n}, capture {m}: "file" must be inside the walkthrough folder. |
| Datum | Standort {n}, Aufnahme {m}: „date“ muss wie 2024-08-14T16:02 aussehen. | Spot {n}, capture {m}: "date" must look like 2024-08-14T16:02. |
| Markierungen | – | Spot {n}, capture {m}: "markers" must be a list. |
| Markierung ohne Inhalt | – | Spot {n}, capture {m}, marker {k}: needs a text or a photo. |
| Stelle | – | Spot {n}, capture {m}, marker {k}: "yaw" and "pitch" go together. |
| Ort | – | "location" must be { "lat": -90…90, "lon": -180…180 }. |

## Hinweise für Übersetzungen

- Datumsangaben immer über `formatDate` (Locale der Nutzerin bzw. des Nutzers), nie im Text zusammenbauen.
- Deutsche Texte sind rund 30 % länger. Tabs und Buttons müssen „Neue Bilder (12)“ und „Standort und Bilder“ ohne Umbruch fassen.
- „Standort“ ist bewusst kein „Raum“: Mehrere Standorte können in einem Raum liegen.

**Raumnamen aus dem Grundriss sind Vorschläge.** Sie ändern nichts, bis man „Übernehmen“ klickt; danach steht der Name im Feld und lässt sich vor dem Speichern korrigieren. Erst beim Speichern folgen die Bilddateien (Schalter unter „Standort“). Vorgeschlagen wird nur, solange ein Standort noch den Dateinamen der Kamera trägt.
