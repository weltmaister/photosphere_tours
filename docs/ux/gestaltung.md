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

Nur Komponenten aus `@nextcloud/vue`. Eigene Bausteine gibt es nur für Grundriss und Zeitachse, die mit denselben Tokens gebaut werden.

| Zweck | Baustein | Regel |
|---|---|---|
| Hauptaktion | `NcButton variant="primary"` | Genau eine je Bereich: „Speichern“ in der Seitenleiste, „Bearbeiten“ in der Kopfleiste |
| Weitere Aktionen | `NcButton variant="secondary"` | z. B. „Blickrichtung festlegen“ |
| Symbolaktion | `NcButton variant="tertiary"` mit `aria-label` und Tooltip | Schließen, Grundriss ein/aus, Zoom |
| Entfernen | `NcButton variant="error"` in einem Dialog, im Formular `tertiary` mit Fehlerfarbe | Immer mit Rückfrage |
| Eingabe | `NcTextField`, `NcDateTimePickerNative type="datetime-local"` | Beschriftung als Label, nicht als Platzhalter |
| Auswahl | `NcSelect` (Aufnahme) | – |
| Umschalter | `NcCheckboxRadioSwitch type="button"` als Segmentgruppe | Zeitachse, wenn ≤ 6 Begehungen |
| Tabs | `NcAppSidebar`-Tabs bzw. `NcAppSidebarTab` | „Standort“, „Neue Bilder (n)“ |
| Meldung in der Fläche | `NcNoteCard type="success"`, `"error"`, `"info"` | Ersetzt Toasts, die hinter dem Vollbild verschwinden |
| Leerzustand | `NcEmptyContent` mit Icon, Titel und Text | „Keine neuen Bilder“, „Noch keine Standorte“ |
| Dialog | `showConfirmation` aus `@nextcloud/dialogs` | Buttons nach [texte.md](texte.md) („Entfernen / Behalten“) |
| Icons | `NcIconSvgWrapper` mit Pfaden aus `@mdi/js` | 20 px, eine Linienstärke |

Größen: Alle Buttons und Felder haben die Höhe `--default-clickable-area`, auf Touch-Geräten `--clickable-area-large`. Symbolbuttons sind quadratisch.

## Layout

```
┌───────────────────────────────────────────────────────────┐
│ Kopfleiste (Titel · Standortname)   [Grundriss] [Bearbeiten] [✕] │  Höhe --header-height, Hintergrund Glas
├───────────────────────────────────────────────────────────┤
│ ┌──────────┐                                              │
│ │Grundriss │                Panorama                      │  Grundriss eckig, einklappbar,
│ │ (klein)  │                                              │  max. 30 % der Höhe
│ └──────────┘                                              │
├───────────────────────────────────────────────────────────┤
│ Begehung [18.04.24][16.10.24][Neueste]   Aufnahme [▾ …]   [− +] │  Fußleiste, Höhe --header-height
└───────────────────────────────────────────────────────────┘
```

- **Keine schwebenden Leisten über dem Bild.** Kopf- und Fußleiste sind feste Flächen mit Glas-Hintergrund. Das Panorama liegt dazwischen und wird nie verdeckt.
- **Die PSV-Navbar entfällt** (`navbar: false`). Zoom, Vollbild und Aufnahmeauswahl sitzen in Kopf- oder Fußleiste.
- **Der Grundriss im Viewer** (MapPlugin) ist eckig mit `--border-radius-container` und bekommt Glas-Hintergrund. Größe `min(30vh, 280px)`, einklappbar über den Button in der Kopfleiste. Die Kompassmarken und die Prozentanzeige fallen weg.
- **Der Editor ist eine Seitenleiste** nach der in Schritt 4 gewählten Variante. Sie ist mindestens 360 px breit, und ihr Inhalt scrollt, nicht die ganze Fläche.
- **Schmal (< 768 px):** Die Seitenleiste wird zum unteren Blatt (50 % der Höhe). Die Zeitachse zeigt dann nur die Auswahl statt der Segmente.

## Panorama-Fläche

Das Panorama selbst hat keinen Theme-Hintergrund. Alles, was darüber liegt (Standort-Tooltips, Blickkegel, Ladeanzeige), nimmt Glas-Hintergrund und Nextcloud-Schrift.

PSV bringt keine CSS-Variablen mit. Die Angleichung läuft deshalb über Selektoren unter `.pt-overlay`:

| PSV-Teil | Anpassung |
|---|---|
| `.psv-container` | `font-family: var(--font-face)`, `font-size: var(--default-font-size)` |
| `.psv-tooltip`, `.psv-map__tooltip` | Glas-Hintergrund, `--color-main-text`, `--border-radius-element`, Schrift Hinweis-Stufe |
| `.psv-map` | Eckig, `--border-radius-container`, Rahmen `--color-border`, ohne Kompassring |
| `.psv-map__toolbar` | ausblenden (Zoom über die Fußleiste) |
| `.psv-loader` | Farbe `--color-primary-element` |
| `.psv-notification` | nicht verwenden, stattdessen `NcNoteCard` in der Kopfleiste |
| Standort-Punkte (MapPlugin `spotStyle`) | Farbe und Rand aus `--color-primary-element` bzw. `--color-main-background`, Größe 16 px, Hover 20 px. Ausgegraut mit `--color-text-maxcontrast` |

Farben für das Canvas des MapPlugins (es akzeptiert keine CSS-Variablen) werden beim Öffnen einmal mit `getComputedStyle(document.body)` gelesen. Damit gilt auch dort die Instanzfarbe.

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
- Escape schließt erst Menüs und Dialoge, dann den Blickrichtungs-Modus, zuletzt den Rundgang.
- Kontrast: Text auf Glas-Hintergrund mindestens 4,5 : 1, in Hell und Dunkel prüfen.

## Was nicht

| ✅ So | ❌ Nicht so |
|---|---|
| `NcButton` in drei Varianten | Eigene `.pt-button`-Klassen |
| Abstände 4 / 8 / 12 / 16 / 24 px | 6 px, 10 px, 14 px |
| Eine Hauptaktion je Bereich | Zwei gleich laute Buttons nebeneinander („Speichern“ und „Fertig“) |
| Meldungen in `NcNoteCard` | Toasts hinter dem Vollbild |
| Glas-Leisten ober- und unterhalb | Chips, die schwebend über dem Bild liegen |
