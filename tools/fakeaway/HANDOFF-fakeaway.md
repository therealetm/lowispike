# HANDOFF: Fakeaway-Woche in die App einbauen

Ziel: Die fertige Seite **Fakeaway-Woche** (Wochenplan mit Junk-Food-Alternativen) soll Teil von LOWiSPIKE werden.

Eman will diese Seite als **einfachen Link aus der App heraus verschicken** können. Die Person, die den Link bekommt, braucht dafür kein Konto. Der Link wird z. B. per WhatsApp verschickt und öffnet im normalen Browser.

Lies vorher wie immer `AGENTS.md` und halte dich an die dortige Startreihenfolge. Diese Datei ersetzt das nicht.

## Was in diesem Paket ist

| Datei | Was |
|---|---|
| `fakeaway/index.html` | Die fertige Seite. Eine Datei, kein Build nötig. Läuft so wie sie ist. |
| `fakeaway/Fakeaway-Woche.pdf` | Dieselbe Woche als PDF (Deutsch, 2 Personen). Optional als Download. |
| `src/data.js` | Alle Zutaten, Preise, Nährwerte, Rezeptmengen, Wochenplan und die Rechenfunktionen (`basket`, `perPortion`). |
| `src/p3_text.js` | Alle Texte DE/EN: Rezeptnamen, „statt …“, Schritte, Portionen, Getränke. |
| `src/p2_icons.js` | Flache SVG-Food-Icons. |
| `src/p4_app.js` | Logik: heutiger Tag, „Jetzt dran“, Rezept-Sheet, Einkaufsliste, Personen-Stepper. |
| `src/p1_head.html` | CSS, mit Hell- und Dunkel-Theme. |
| `src/build.cjs` | Baut `index.html` aus den Teilen (`node build.cjs`). |
| `src/verify.cjs` | Prüft, dass jede Zutat in den Schritten vorkommt, Reste und Auftau-Erinnerungen zusammenpassen und die Preise stimmen (`node verify.cjs`). |
| `src/pdf.cjs` | Baut das PDF mit Playwright. |

## Was die Seite macht (bitte genau so behalten)

- Öffnen → sofort sichtbar: **heute**, das Gericht des Tages, „Start: 17:20“ und was **jetzt dran** ist.
- Feste Zeiten: 07:30 Frühstück, 12:30 Mittag (= Rest vom Vortag), 16:00 Snack, 18:00 Abendessen. Sonntag: 10:30 Brunch, 15:30 Snack, 18:00 Abendessen.
- **Nur einmal am Tag kochen.** Das Abendessen wird doppelt gekocht, die Hälfte ist das Mittagessen am nächsten Tag.
- Um 20:00 kommen Erinnerungen, was aufgetaut werden muss.
- Unten ist ein großer Button „Einkaufsliste · ca. 103 €“. Die Liste ist nach Gängen sortiert, hat Haken, den Gesamtpreis, den Preis pro Person und Tag und den Vorrat, der übrig bleibt. Man kann sie kopieren.
- Ein Personen-Stepper (1–6 in ½-Schritten, „Kleines Kind = ½ Person“) rechnet alle Mengen und Preise neu.
- Kalorien und Makros sind unter „Mehr Infos“ versteckt, nicht vorne.
- Sprache DE/EN: automatisch erkannt und umschaltbar.
- Speichert nur lokal (`localStorage`, Key `faw.v1`): Sprache, Personen, Haken, „Alles klar“ gesehen.
- Regeln aus dem LOWISPIKE Master Knowledge v2: kein Zucker, kein Mehl, Brot, Reis, Nudeln, Kartoffeln oder Schwein. Keine Süßstoff-Desserts. Soßen nur aus Joghurt, Senf, Zitrone und Tomate ohne Zucker. Es gibt einen Arzt-Hinweis im Footer und die Brand-Zeile.

## Was du tun sollst

1. **Die Seite unter einer eigenen, öffentlichen URL ausliefern**, ohne Login und ohne App-Shell drumherum. Vorschlag: Ordner `fakeaway/` ins Repo, dann ist sie unter `https://therealetm.github.io/lowispike/fakeaway/` erreichbar.
   - Prüfe `sw.js`: Der Service Worker darf die Seite nicht abfangen oder auf `index.html` der App umleiten, und sie soll offline funktionieren.
   - Prüfe `404.html` und eventuelles Routing, damit `/fakeaway/` direkt aufgeht.
2. **Einen Weg in der App, um den Link zu verschicken.** Bevorzugt ist `navigator.share({ title: 'Fakeaway-Woche', url })` mit Fallback „Link kopieren“. Platziere ihn dort, wo es zur App passt, z. B. bei Einkaufen/Woche. Halte dich an die bestehenden Design-Entscheidungen:
   - **Keine neue Bubble.** Bubble-Symmetrie, Anzahl pro Reihe und Größe bleiben, wie sie sind.
   - **Keine Wörter oder Einheiten in Bubbles**, nur Zahlen oder Symbole.
   - Lies dazu `DECISIONS.md` und `SCREEN_MAP.md`. Wenn kein Platz eindeutig passt, frag Eman und schlag 2 Optionen vor.
3. Optional: das Look-and-feel an die App angleichen (Farben und Fonts aus dem bestehenden Design-System), aber **nichts am Inhalt, an den Mengen oder an der Struktur ändern**. Wenn du etwas änderst, nur in `src/` und dann `node build.cjs` und `node verify.cjs` laufen lassen.
4. Tests nach `TESTING.md` laufen lassen. Die Seite bei 390×844 prüfen, hell und dunkel, ohne horizontales Scrollen, ohne Konsolenfehler. Der Link muss auf dem iPhone in Safari und auf Android in Chrome aufgehen.
5. Release nach `RELEASE.md` (Version, Log-Zeile in `MAYA-HANDOFF.md`).

## Was du NICHT machen sollst

- Keine Rezepte, Mengen, Preise oder Zeiten neu erfinden oder „verbessern“, ohne Eman zu fragen.
- Nicht behaupten, die Rezepte stammen aus dem Recipe Book. Sie sind neu.
- Keine Login-Pflicht und kein Tracking auf der geteilten Seite.
- Den Arzt-Hinweis und die Hinweise zu den Preisen nicht entfernen.

## Fakten zu den Preisen

- Preise sind aus dem Aldi-Süd-Online-Shop vom 6.11.2026. Obst und Gemüse sind Richtpreise (markiert mit „ca.“). Backkakao ist der Lidl-Preis.
- Für 2 Personen kostet der Einkauf ca. 103 €, das sind ca. 5,30 € pro Person und Tag. Davon bleiben ca. 29 € als Vorrat (Tiefkühl, Mandeln, Kakao usw.).
- Pro Erwachsenem sind es ca. 1.200–1.500 kcal am Tag. Auf der Seite steht dazu: „Noch Hunger? Nimm mehr Gemüse oder ein Ei extra.“
- Preise ändern sich. Wenn du sie aktualisierst, nur in `src/data.js` (`ITEMS`) und neu bauen.
