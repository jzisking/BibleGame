# ⭐ Ein Stern über Bethlehem — Kapitel 1

Ein Point-&-Click-Adventure im Stil von *Monkey Island* (SCUMM-Verben, Inventar,
Dialog-Bäume), das die Geschichte der Evangelien erzählt. Kapitel 1 folgt dem
Lukas-Evangelium: **Lukas 1** als Prolog (Zacharias, Maria) und **Lukas 2**
als spielbare Handlung — die Hirten auf dem Feld, der Stern, der Engel und die
Krippe in Bethlehem.

## Starten

Einfach `index.html` im Browser öffnen — keine Installation, kein Server nötig.
(Optional: `npx serve` im Ordner für einen lokalen Webserver.)

## Steuerung

1. Unten ein **Verb** anklicken: *Gehe zu, Schau an, Nimm, Rede mit, Benutze, Gib*
2. Dann etwas in der Szene anklicken.
3. Bei **Benutze** und **Gib**: erst das Verb, dann den Gegenstand im Inventar,
   dann das Ziel in der Szene (z. B. „Benutze Reisig mit Lagerfeuer“).
4. Klick auf den Boden = hinlaufen. Klick während eines Dialogs = Text weiterschalten.

## Spielinhalt (Kapitel 1)

Du spielst **Joel**, den jüngsten Hirten auf den Feldern bei Bethlehem:

- Das Lagerfeuer ist fast aus — finde Brennholz und wecke damit den alten Schimon.
- Ein Lamm ist zwischen die Felsen geraten — rette es (ein Hirtenstab könnte helfen).
- Sind Feuer und Herde versorgt, erscheinen der **Stern von Bethlehem** und der
  **Engel des Herrn** (Lukas 2,9–14).
- Folge dem Weg nach **Bethlehem**: Die Stadt ist wegen der Volkszählung überfüllt,
  und niemand weiß auf Anhieb, wo das Kind liegt. Frag dich durch — der Nachtwächter
  hat etwas beobachtet, und der grantige Wirt der Herberge (anklopfen!) weiß mehr,
  als er zugeben will.
- Erst mit seiner Wegbeschreibung führt die Gasse hinter der Herberge zum Stall —
  und dort stellt sich die Frage, was ein Hirte einem neugeborenen König wohl
  schenken könnte.

## Kapitel 2: Die Flucht nach Ägypten (Matthäus 2)

Nach dem Krippen-Finale springt die Handlung **Monate weiter**: Die Weisen aus
dem Morgenland waren da und sind heimlich abgereist (Matthäus 2,11–12) — und nun
steht ein **Soldat des Herodes** vor dem Haus der Familie und fragt nach dem Kind.

- Der Soldat weicht nicht von der Tür. Aber er erwähnt, wie durstig so ein
  Wachdienst macht...
- Am verlassenen Marktstand steht ein Weinkrug. Damit abgelenkt, lässt sich die
  Familie warnen.
- Der eigentliche Fluchtbefehl bleibt biblisch: Josef hat ihn bereits **vom Engel
  im Traum** erhalten (Matthäus 2,13) — Joel hilft nur bei der Ausführung.
- Finale: Die Familie zieht auf der Straße nach Süden Richtung Ägypten davon
  (Matthäus 2,14–15).

*Hinweis zur biblischen Einordnung:* Der schnüffelnde Soldat und die Hilfe des
Hirten sind erzählerische Ausschmückung; Zeitablauf (erst Weise, dann Flucht),
das Haus statt des Stalls (Matthäus 2,11) und der Traum-Befehl folgen dem
Matthäus-Evangelium. Der Kindermord von Bethlehem (Matthäus 2,16) wird nicht
dargestellt.

## Technik

- Reines HTML/CSS/JavaScript, eine einzige Canvas-Szene pro Raum, keine Abhängigkeiten.
- `game.js` enthält Engine (Verben, Inventar, Sprechtext, Laufwege, Cutscenes)
  und die Räume `field` (Hirtenfeld), `city` (Bethlehem bei Nacht), `stable`
  (Stall) und `flucht` (Flucht nach Ägypten). Neue Kapitel lassen sich als
  weitere Einträge in `rooms` ergänzen.

## Debug-Modus

In `config.json` steht ein Schalter:

```json
{ "debug": true }
```

Ist er `true`, erscheint links oben ein **Debug-Panel**, mit dem man direkt in
jede Szene springen kann (inklusive passender Flags und Inventar) — z. B.
„Feld: Stern- & Engel-Cutscene“, „Stadt: Weg zum Stall bekannt“ oder
„Stall: Finale“. Für den normalen Spielbetrieb einfach auf `false` setzen.

**Wichtig bei Doppelklick-Start (`file://`):** Browser dürfen dort aus
Sicherheitsgründen keine JSON-Dateien nachladen — die `config.json` wird dann
ignoriert. Zwei Auswege:

- `?debug=1` an die URL anhängen (z. B. `index.html?debug=1`), **oder**
- das Spiel über einen lokalen Server starten (`npx serve` im Ordner),
  dann greift die `config.json` normal.

## Geplante Fortsetzung

Kapitel 2: *Die Weisen aus dem Morgenland* (Matthäus 2).
