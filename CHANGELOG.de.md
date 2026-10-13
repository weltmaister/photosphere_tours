# Änderungen

Alle wichtigen Änderungen dieser App stehen in dieser Datei.
Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unreleased]

### Hinzugefügt
- **Markierungen:** ein Text und/oder ein Foto je Aufnahme, auf Wunsch an einer Stelle
  im Panorama. Gesetzte Markierungen erscheinen als Symbole (Kamera mit Foto, Sprechblase
  ohne); ein Klick öffnet das Foto groß mit dem Text und blättert durch alle Markierungen
  der Aufnahme. Die Schaltfläche *Fotos an diesem Standort (n)* tut dasselbe, auch für
  Markierungen ohne Stelle und mit Tastatur oder Screenreader. Die Standortliste kennzeichnet
  Aufnahmen mit Markierungen. Gespeichert als `markers` je Aufnahme in `360-Rundgang.json`;
  bestehende Dateien bleiben gültig.
- **Editor:** ein Abschnitt *Markierungen*: *Markierung setzen* und *Im Panorama verschieben*
  (auf die Stelle klicken), Text, *Foto wählen* (ein Foto von anderswo wird nach `2D-Bilder/`
  kopiert, nie überschrieben), *Foto entfernen*, *Markierung entfernen* mit *Rückgängig*
  statt Rückfrage (Bilddateien werden nie gelöscht) und *Neue Fotos* aus `2D-Bilder/`.
  Gesetzt wird mit Maus oder Touch; auf Freigabeseiten fehlt *Foto wählen*.
- **Verschiebbare Trennlinien:** zwischen Grundriss und Standortliste in der Seitenleiste
  des Viewers und zwischen Panorama und Bearbeitungsfläche im Editor, per Ziehen oder
  Pfeiltasten. Die Größen merkt sich der Browser.
- **Ort:** ein Rundgang kann einen `location` (Breite, Länge) haben. Er wird aus der
  GPS-Position des ersten Bildes übernommen, das in einen Rundgang ohne Ort gesetzt wird;
  die Kopfleiste bietet dann *In OpenStreetMap öffnen* (neuer Tab, keine Karte eingebettet,
  keine Anfragen der App selbst; nicht auf Freigabeseiten).

### Geändert
- Beim Speichern bleiben Felder in `360-Rundgang.json` erhalten, die die App nicht kennt
  (aus einer neueren Version oder einem anderen Werkzeug), auf jeder Ebene.

## 0.5.0 – 2026-10-12

### Geändert
- Ein Grundriss aus einem anderen Ordner wird in den Ordner des Rundgangs kopiert und
  dort verwendet; ein PDF zusammen mit seinem PNG, damit auch die Raumnamen greifen.
  Überschrieben wird nichts: Ein belegter Name wird zu „Plan (2)“.
- Eine Begehung zeigt nur die Standorte, die an dem Tag aufgenommen wurden, jeweils
  mit dieser Aufnahme und ohne Aufnahmenauswahl. Die erste Schaltfläche *Alle*
  (bisher *Neueste*) zeigt jeden Standort mit seiner neuesten Aufnahme; dort lässt
  sich in der Liste eine andere wählen. Listenüberschrift und Kopfzeile nennen den
  gezeigten Tag.
- Der Editor schaltet beim Öffnen auf *Alle*, damit die bearbeitete Aufnahme die
  angezeigte ist und der Viewer danach nie mit einer leeren Begehung dasteht.
- *Rückgängig* nach dem Setzen einer Blickrichtung oder einer weiteren Aufnahme
  bleibt bis zur nächsten Aktion stehen statt nach zehn Sekunden zu verschwinden.

### Behoben
- Ein Klick im Grundriss knapp neben einem anderen Standort dreht wieder die
  Blickrichtung des gewählten Standorts, statt zum Nachbarn zu springen.
- Beim Platzieren eines Bildes blitzt nicht mehr das Panorama des vorigen Standorts auf.
- Ein im Stammordner gewählter Grundriss wird nicht mehr neben sich selbst kopiert.
- Der Tastaturfokus auf Standorten im Grundriss ist im dunklen Design sichtbar;
  Escape wirkt auch, wenn ein Auswahlknopf oder Schalter den Fokus hat;
  Fehlermeldungen werden nur einmal vorgelesen.
- Die Zoom-Knöpfe am Grundriss haben auf Touch-Geräten volle Größe.
- Kleinerer Download: Der Viewer enthält keine CSS-Source-Maps mehr (etwa 190 kB).

## 0.4.15 – 2026-10-12

### Sicherheit
- PDF.js auf 6.4.299 aktualisiert (GHSA-hq66-cqwq-w95j: Skriptausführung durch ein
  präpariertes PDF). Die App zeichnet und liest Grundrisse nur, aber jedes PDF in einem
  geteilten Ordner könnte eines sein.

### Behoben
- Der PDF-Worker wird auch dann freigegeben, wenn das Umwandeln eines Grundrisses
  fehlschlägt.

## 0.4.14 – 2026-10-12

### Geändert
- Das Aufnahmedatum eines neu platzierten Bildes kommt zuerst aus den EXIF-Daten der
  Kamera, dann aus einem Datum im Dateinamen, dann aus dem Dateidatum.

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
