# Änderungen

Alle wichtigen Änderungen dieser App stehen in dieser Datei.
Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## 0.4.13 – 2026-10-08

### Geändert
- Grundriss im Editor: Ziehen verschiebt, ein kurzer Klick auf einen Standort wählt
  ihn aus, ein kurzer Klick auf eine freie Stelle setzt dort das gewählte Bild – oder
  dreht bei gewähltem Standort dessen Blickrichtung dorthin (mit *Rückgängig*). Der
  Knopf *Blickrichtung festlegen* entfällt.
- Ein gewähltes Bild erscheint sofort im Panorama, noch bevor es platziert ist.
- Der Editor zeigt alles zum Standort und die neuen Bilder in einer Fläche; auf dem
  Handy wechselt man zwischen Grundriss und dieser Fläche.
- Die Grenze zwischen Grundriss und Bearbeitungsspalte lässt sich ziehen (oder mit
  den Pfeiltasten verschieben).
- Die Hinweisleiste über der Dateiliste aktualisiert sich, sobald ein Rundgang
  angelegt ist, und „Neu → 360°-Rundgang“ öffnet einen vorhandenen Rundgang, statt
  einen Fehler zu melden.
- Neutrale Beschreibungen; „Site visit“ heißt im Englischen „Visit“.
- Die Lizenzhinweise der mitgelieferten Bibliotheken liegen im Paket.

## 0.4.11 – 2026-10-02

Erste Veröffentlichung im Nextcloud App Store.

### Neu
- Rundgänge: Eine `360-Rundgang.json` in einem Ordner mit 360°-Bildern öffnet das
  Panorama mit Grundriss, Standortliste und Begehungen.
- Rundgang anlegen aus der Dateiliste, dem Ordnermenü oder über *Neu*; ein Grundriss im
  Ordner wird erkannt, PDF-Pläne werden in PNG umgewandelt.
- Editor: Bilder im Grundriss platzieren, spätere Aufnahmen hinzufügen, Standorte
  verschieben, Blickrichtung festlegen, Grundriss wechseln.
- Raumnamen aus den Raumstempeln von PDF-Plänen als Vorschlag für Standortnamen
  (übernehmen, korrigieren oder alle auf einmal), Aufnahmedatum aus EXIF.
- Standorte in der Liste umbenennen, auf Wunsch samt Bilddateien.
- Begehungen: jeder Standort so, wie er an einem Tag war.
- Zoombarer Grundriss, verstellbare Seitenleiste, Handy-Ansicht, Tastaturbedienung.
- Rundgänge über öffentliche Freigabelinks, nur lesend.
- Englisch und Deutsch.
