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
| **Begehung** | site visit | Alle Aufnahmen eines Tages | „Walkthrough“ in der Zeitachse |
| **Neueste** | latest | Jeder Standort mit seiner jüngsten Aufnahme | „Aktuell“ |
| **Neue Bilder** | new images | Bilder im Ordner, die noch zu keinem Standort gehören | „Noch nicht verortet“ |
| **platzieren** | place | Ein neues Bild einem Standort zuordnen | „verorten“ |
| **Blickrichtung festlegen** | set view direction | Bild und Grundriss in Übereinstimmung bringen | „Richtung ausrichten“ |

Regeln:
- **Ein Begriff je Sache.** „Standort“ nie mit „Punkt“ mischen, „Aufnahme“ nie mit „Bild“, außer bei Dateien im Ordner („Neue Bilder“, „Bilddatei“).
- **Buttons beginnen mit einem Verb** („Speichern“, „Blickrichtung festlegen“). Ausnahmen sind Umschalter und Tabs.
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

### Fußleiste: Zeitachse (neu)

| Stelle | de | de_DE | en |
|---|---|---|---|
| Beschriftung | Begehung | = | Site visit |
| Standardwahl | Neueste | = | Latest |
| Tooltip Datum | Jeden Standort so zeigen, wie er am {date} war | = | Show every spot as it was on {date} |
| Tooltip Neueste | Jeden Standort mit seiner neuesten Aufnahme zeigen | = | Show every spot with its latest capture |
| Auswahl Aufnahme | Aufnahme | = | Capture |
| Eintrag Aufnahme | {date} | = | {date} |
| Eintrag neueste | {date} (neueste) | = | {date} (latest) |
| Hinweis abweichend | Am {day} gibt es hier keine Aufnahme – gezeigt wird die vom {date}. | = | No capture here on {day} – showing the one from {date}. |

### Grundriss im Viewer

| Stelle | de | de_DE | en |
|---|---|---|---|
| Tooltip Standort | {name} · {date} | = | {name} · {date} |
| Tooltip Standort grau | {name} · erst ab {date} | = | {name} · from {date} on |
| Klick auf grauen Standort | {name} wurde erst am {date} aufgenommen. Wähl unten eine spätere Begehung. | … Wählen Sie … | {name} was first captured on {date}. Pick a later site visit below. |
| Karte vergrößern / verkleinern | Grundriss vergrößern / Grundriss verkleinern | = | Enlarge / shrink floor plan |
| Karte zurücksetzen | Auf aktuellen Standort zentrieren | = | Center on current spot |
| Zoom | Vergrößern / Verkleinern | = | Zoom in / Zoom out |

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
| Tab 1 | Standort | = | Spot |
| Tab 2 | Neue Bilder ({count}) | = | New images ({count}) |

### Editor: Tab „Standort“

| Stelle | de | de_DE | en |
|---|---|---|---|
| Nichts gewählt | Klick im Grundriss auf einen Standort, um ihn zu bearbeiten. | Klicken Sie … | Click a spot on the floor plan to edit it. |
| Feld Name | Name | = | Name |
| Feld Datum | Aufgenommen am | = | Captured on |
| Datei | Datei: {file} | = | File: {file} |
| Abschnitt | Blickrichtung | = | View direction |
| Erklärung | Zeigt der Blickkegel im Grundriss in die falsche Richtung? Dreh das Bild zu etwas Markantem – Tür, Fenster, Ecke – und leg dann fest, wo das im Grundriss liegt. | Zeigt … ? Drehen Sie … und legen Sie dann fest … | Does the view cone on the floor plan point the wrong way? Turn the image towards something distinctive – a door, a window, a corner – then mark where it is on the floor plan. |
| Button | Blickrichtung festlegen | = | Set view direction |
| Während des Festlegens | Klick im Grundriss auf die Stelle, die du gerade im Bild siehst. | Klicken Sie …, die Sie … sehen. | Click the place on the floor plan that you are looking at in the image. |
| Abbrechen | Abbrechen | = | Cancel |
| Erfolg | Blickrichtung übernommen – noch nicht gespeichert | = | View direction set – not saved yet |
| Entfernen (mehrere Aufnahmen) | Aufnahme entfernen | = | Remove capture |
| Entfernen (letzte Aufnahme) | Standort entfernen | = | Remove spot |
| Tooltip Standort im Editor | {name} – ziehen zum Verschieben | = | {name} – drag to move |

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

### Editor: Speichern und Dialoge

| Stelle | de | de_DE | en |
|---|---|---|---|
| Gespeichert | Rundgang gespeichert | = | Walkthrough saved |
| Konflikt | Jemand anderes hat den Rundgang inzwischen geändert, deshalb kann nicht gespeichert werden. Lade ihn neu – deine Änderungen gehen dabei verloren. | … Laden Sie ihn neu – Ihre Änderungen … | Someone else changed the walkthrough in the meantime, so it cannot be saved. Reload it – your changes will be lost. |
| Konflikt-Button | Neu laden | = | Reload |
| Fehler | Speichern fehlgeschlagen: {error}. Prüf die Verbindung und versuch es noch einmal. | … Prüfen Sie … versuchen Sie … | Saving failed: {error}. Check your connection and try again. |
| Dialog Aufnahme: Titel | Aufnahme vom {date} entfernen? | = | Remove the capture from {date}? |
| Dialog Standort: Titel | Standort „{name}“ entfernen? | = | Remove spot "{name}"? |
| Dialog: Text | Sie verschwindet aus dem Rundgang. Die Bilddatei bleibt im Ordner. | = | It disappears from the walkthrough. The image file stays in the folder. |
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

## Hinweise für Übersetzungen

- Datumsangaben immer über `formatDate` (Locale der Nutzerin bzw. des Nutzers), nie im Text zusammenbauen.
- Deutsche Texte sind rund 30 % länger. Tabs und Buttons müssen „Neue Bilder (12)“ und „Blickrichtung festlegen“ ohne Umbruch fassen.
- „Standort“ ist bewusst kein „Raum“: Mehrere Standorte können in einem Raum liegen.
