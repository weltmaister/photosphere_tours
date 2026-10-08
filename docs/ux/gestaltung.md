# Gestaltungsregeln

Photosphere Tours sieht aus wie ein Teil von Nextcloud.
- Es gibt keine eigenen Farben, Schriften oder Größen, alles kommt aus den Nextcloud-CSS-Variablen.
- Hell/Dunkel, Kontrast-Themes und Instanzfarbe wirken damit automatisch.
- Texte und Begriffe stehen in [texte.md](texte.md).

## Tokens

Nur diese Variablen verwenden, keine festen Pixel-, Farb- oder Schriftwerte im CSS. Ausnahme ist die Panorama-Fläche selbst (siehe unten).

| Zweck | Variable | Wert (NC 34, Standard) |
|---|---|---|
| Schrift | `--font-face` | system-ui … |
| Textgröße | `--default-font-size` | 15 px |
| Hinweis, Beschriftung | `--font-size-small` | 13 px |
| Zeilenhöhe | `--default-line-height` | 1.5 |
| Raster | `--default-grid-baseline` | 4 px (Abstände nur als Vielfache: 4, 8, 12, 16, 24) |
| Klickfläche | `--default-clickable-area` | 34 px |
| Klickfläche Touch | `--clickable-area-large` | 48 px (bei `pointer: coarse`) |
| Radius Element | `--border-radius-element` | 8 px |
| Radius Fläche | `--border-radius-container` | 12 px |
| Hintergrund | `--color-main-background` | – |
| Hintergrund Glas | `--color-main-background-blur` mit `--filter-background-blur` | – |
| Text | `--color-main-text` | – |
| Text schwach | `--color-text-maxcontrast` | – |
| Hover | `--color-background-hover` | – |
| Rahmen | `--color-border`, kräftig `--color-border-maxcontrast` | – |
| Akzent | `--color-primary-element`, Text darauf `--color-primary-element-text` | – |
| Akzent hell | `--color-primary-element-light` | – |
| Status | `--color-error`, `--color-success`, `--color-warning` (über `NcNoteCard`) | – |
| Bewegung | `--animation-quick` | 100 ms |

## Typografie: genau drei Stufen

| Stufe | Größe | Gewicht | Verwendung |
|---|---|---|---|
| Titel | `calc(var(--default-font-size) * 1.2)` | 600 | Rundgang-Titel in der Kopfleiste, Überschrift der Seitenleiste |
| Text | `--default-font-size` | 400, Buttons und Tabs 600 | Alles andere |
| Hinweis | `--font-size-small` | 400, Farbe `--color-text-maxcontrast` | Feldbeschriftung, Dateiname, Erklärtext, Tooltips |

Fett nur für Titel, Buttons, Tabs und den gewählten Eintrag. Nie fett zum Hervorheben innerhalb von Sätzen.

## Bausteine

Nur Komponenten aus `@nextcloud/vue`. Eigene Bausteine gibt es nur dort, wo Nextcloud keinen passenden hat; sie nutzen dieselben Tokens.

| Zweck | Baustein | Regel |
|---|---|---|
| Hauptaktion | `NcButton variant="primary"` | Genau eine je Bereich: „Speichern“ im Editor, „Bearbeiten“ im Viewer |
| Weitere Aktionen | `NcButton variant="secondary"` | z. B. „Grundriss wechseln“, „Rückgängig“ in einer Meldung |
| Symbolaktion | `NcButton variant="tertiary"` mit `aria-label` und Tooltip | Schließen, Seitenleiste ein/aus, Zoom |
| Entfernen | im Formular `tertiary` mit Fehlerfarbe, bestätigt über `showConfirmation` | Immer mit Rückfrage |
| Eingabe | `NcTextField`, `NcDateTimePickerNative type="datetime-local"` | Beschriftung als Label, nicht als Platzhalter |
| Auswahl der Aufnahme | `NcCheckboxRadioSwitch type="radio"` im Editor, aufklappbare Liste in der Standortliste | – |
| Begehungen | `SiteVisits.vue`: Segmentgruppe in der Fußleiste bzw. im Handy-Blatt | erst ab zwei Begehungen |
| Tabs | `TabBar.vue` (ARIA-Tabs, Pfeiltasten) | nur auf dem Handy: „Grundriss“ / „Standort und Bilder“ und im Viewer-Blatt |
| Meldung in der Fläche | `NoteBar.vue` = `NcNoteCard` + optionale Aktion | Ersetzt Toasts, die hinter dem Vollbild verschwinden; im Editor schwebt sie über dem Grundriss, damit er sich nicht verschiebt |
| Leerzustand | `NcEmptyContent` mit Icon, Titel und Text | „Keine neuen Bilder“, „Noch keine Standorte“ |
| Dialog | `showConfirmation` aus `@nextcloud/dialogs` | Buttons nach [texte.md](texte.md) („Entfernen / Behalten“) |
| Icons | `NcIconSvgWrapper` mit Pfaden aus `@mdi/js` | 20 px, kleine Symbole in Listen 18 px |
| Grundriss | `FloorPlan.vue` (eigener Baustein, kein PSV-Plugin) | siehe unten |

Größen: Alle Buttons und Felder haben die Höhe `--default-clickable-area`, auf Touch-Geräten `--clickable-area-large`. Symbolbuttons sind quadratisch.

## Layout

```
┌────────────────────────────────────────────────────────────────┐
│ [◧] Titel · Standort, Datum               [Bearbeiten] [✕]     │  Kopfleiste, Höhe --header-height
├───────────────┬────────────────────────────────────────────────┤
│ Grundriss     │                                                │
│ (zoombar)     │                 Panorama                       │  Seitenleiste 240–560 px,
│ Standorte (n) │                                                │  Breite ziehbar, ausblendbar
│ • Büro 1  2 ▾ │                                                │
├───────────────┴────────────────────────────────────────────────┤
│ Begehung [18.04.24][16.10.24][Neueste]                [− + ⛶]  │  Fußleiste
└────────────────────────────────────────────────────────────────┘
```

- **Keine schwebenden Leisten über dem Bild.** Kopf- und Fußleiste sind feste Flächen. Das Panorama liegt dazwischen und wird nie verdeckt.
- **Die PSV-Navbar entfällt** (`navbar: false`). Zoom und Vollbild sitzen in der Fußleiste, die Wahl einer Aufnahme in der Standortliste.
- **Editor:** Grundriss groß links; rechts eine Spalte (Standard 520 px, per Griff 360–960 px) mit Panorama (292 px hoch) und einer Fläche: Standort, Grundriss-Datei, Neue Bilder. Im Grundriss: Ziehen verschiebt, kurzer Klick auf einen Standort wählt ihn, auf eine freie Stelle setzt er das gewählte Bild oder dreht die Blickrichtung.
- **Schmal (< 768 px):** Der Viewer zeigt die Seitenleiste als unteres Blatt (50 % der Höhe) mit den Tabs „Grundriss“ und „Standorte“; die Begehungen bleiben darunter sichtbar. Der Editor hat drei Tabs unter dem Panorama.

## Grundriss und Panorama

Der Grundriss liegt immer auf Weiß, weil Pläne schwarz auf weiß gezeichnet sind – auch im dunklen Theme. Deshalb haben Punkte und Blickkegel feste Farben mit hohem Kontrast zum Plan statt Theme-Farben: Punkt weiß mit dunklem Rand, aktueller Punkt in `--color-primary-element`, ausgegraut grau. Punkte sind 34 px groß, auf Touch-Geräten 48 px.

Bedienung: Mausrad und zwei Finger zoomen, Ziehen verschiebt, Buttons unten rechts (+, −, ganzer Plan). In der Seitenleiste scrollt das Mausrad die Leiste, gezoomt wird dort mit Strg.

PSV bringt keine CSS-Variablen mit. Angepasst werden nur die Schrift des Containers (`--font-face`) und die Farbe der Ladeanzeige (`--color-primary-element`); `.psv-notification` wird nicht verwendet.

## Zustände

| Zustand | Darstellung |
|---|---|
| Hover | `--color-background-hover`, Wechsel mit `--animation-quick` |
| Fokus | Nextcloud-Standard (2 px Rahmen `--color-main-text`), nie entfernen |
| Gewählt | Akzent `--color-primary-element` mit `--color-primary-element-text`, fett |
| Deaktiviert | `opacity: .5`, Tooltip mit Grund („Keine ungespeicherten Änderungen“) |
| Laden | `NcLoadingIcon` im Button oder in der Fläche, Button bleibt gleich breit |

## Barrierefreiheit

- Jeder Symbolbutton hat `aria-label` und Tooltip mit demselben Text.
- Standorte im Editor sind per Tastatur erreichbar (Tab) und verschiebbar (Pfeiltasten, mit Umschalt in größeren Schritten).
- Escape schließt erst Menüs und Dialoge, dann den Blickrichtungs-Modus bzw. die Bildauswahl, dann den Editor, zuletzt den Rundgang.
- Tabs folgen dem ARIA-Muster (Pfeiltasten, Pos1/Ende); Meldungen werden zusätzlich über eine `aria-live`-Region vorgelesen.
- Kontrast: Text auf Glas-Hintergrund mindestens 4,5 : 1, in Hell und Dunkel prüfen.

## Was nicht

| ✅ So | ❌ Nicht so |
|---|---|
| `NcButton` in drei Varianten | Eigene `.pt-button`-Klassen |
| Abstände 4 / 8 / 12 / 16 / 24 px | 6 px, 10 px, 14 px |
| Eine Hauptaktion je Bereich | Zwei gleich laute Buttons nebeneinander („Speichern“ und „Fertig“) |
| Meldungen in `NcNoteCard` | Toasts hinter dem Vollbild |
| Glas-Leisten ober- und unterhalb | Chips, die schwebend über dem Bild liegen |
