# Tutorial (Settings > Tutorial)

Emmanuel, 19 Oct 2026: "There should be a tutorial button where you can click on it and then basically our companion takes you
through everything from the beginning, as if you were new. Obviously, you can skip if you already know this. So, with every new
update, the tutorial also needs to be updated."

## Files
- `tutorial-steps.js`: the ONE data file. Steps in order, each with `id`, `area`, `target` (CSS selectors of the real Home control to
  spotlight, first visible one wins; `null` = centred card), optional `when` / `action`, `covers` (feature ids) and `title` / `text` /
  `cta` in `en`, `de`, `es` (`{name}` = the companion's name). `NO_TUTORIAL` lists features that need no step, with the reason.
  `VERSION` goes up whenever steps change.
- `tutorial.js`: the player (`window.LowiTutorial.start/stop/isOn/step`). `tutorial.css`: glass card + glow spotlight.
- `home-settings-sleep-v2.js`: the Settings row `tutorial` (ROUTES, TX label, icon, main group).
- `tests/tutorial-steps.test.cjs` (unit + rule), `tests/tutorial-live.cjs` (browser: iPhone 13 WebKit / iPad / Chrome).

## How it behaves
- Plays as if new, never wipes or writes app data. Only key: `localStorage['lowi.tutorial.v1']` `{v, at, done, skipped, last}`.
- First step for accounts that still have the standard Misty (`!LowiBirthCompanion.has()`): opens the claim-your-own-companion step
  (birthday, optional personality type, optional birth time). That step is owned by the own-companion work, not by the tutorial:
  the tour calls `LowiBirthCompanion.claim({from:'tutorial'})` only once it exists (marked HOOK in tutorial-steps.js, off until the own-companion task ships it; there is no fallback), hides while it is open and goes
  on to the next step when it closes.
- Every step: Back, Skip (skips the rest of this part, e.g. all Home bubbles), Next, and Skip all. Esc = Skip all, arrows move.
- It never opens panels. It hides completely (`.lt-held`, invisible and untouchable) while setup / the sign-in gate, any other visible
  `[aria-modal=true]` dialog, any sheet in the Day card's `BUSY` list, Settings or Misty's flight is up, and comes back where it
  was. The Day card lists `#ltTour:not(.lt-held)` in its `BUSY`, so it waits for the tour (bug hunt round 8).

## Keep it current (every release)
1. `news.json` must carry `"tutorial"`:
   - `"tutorial": "<step id>"` when a step explains the change. If the feature changed, update that step's text in all three
     languages. A new feature gets a new step (and its feature id in `covers`).
   - `"tutorial": {"none": "why no step is needed"}` (at least 8 characters), e.g. a server-only fix.
   `scripts/bump-build.cjs` refuses the release without it (exit 5, `BLOCKER:`); `scripts/release-check.cjs` fails a published
   What's New without it (from build `TUTORIAL_RULE_FROM` on). The field is copied to `version.json` `news.tutorial`.
2. A new Home ring control (`home-orbit-v2.js` `ORDER`) or a new Settings row (`pageGroups` / `MORE`) needs a step whose `covers`
   lists it, or a `NO_TUTORIAL` reason. `tests/tutorial-steps.test.cjs` fails otherwise.
3. Bump `VERSION` in `tutorial-steps.js` when steps change. Keep each card's text under 230 characters (phone card).
4. Changed step words need their voice clips recorded again: `python3 tools/tutorial-voice/build.py` (only changed cards, needs
   `pip install --user edge-tts`), then commit `tutorial-voice-data.js` and `tutorial-voice/`. `tests/tutorial-voice.test.cjs` fails otherwise.

Example news.json:

```json
{"slug": "water-goal", "tutorial": "water", "text": {"en": "...", "de": "...", "es": "..."}}
```

## Auto-start for new accounts (Oct 19 2026, tutorial-auto.js)
Emmanuel: "when someone makes a new account, they should automatically be taken through a tutorial phase ... with a skippable option".
- Setup's `finishOb()` fires `lowi:setup-done`; only then is the account marked `pending` in `localStorage['lowispike.tutorial-auto.v1']`
  (a lowispike.* key, so the account backup carries it to reload, sign-in and other devices). Older accounts never get the event.
- Starts once Home is in front and nothing else (busyBy(), the Day card) has been up for 2.5 s. Finished / Skip all = never again.
- Left halfway (app closed mid-tour): one "Pick up the tour?" offer that continues at that step (`LowiTutorial.start({at})`).
- Steps are many short cards in parts (you, home, food, play, companion, together, settings, extras). Add new controls as new cards.

## Voice: the tutorial reads itself aloud (Oct 21 2026, tutorial-voice.js)
Emmanuel: "I just clicked on tutorial but I have to read through it, that's not what drunk grandma likes. Where is the speaker?"
- The companion picture on every card is the speaker button (`.lt-speak`, badge `.lt-spk`: speaker with an x = off, with waves = on,
  waves move while it talks, the badge breathes until it was tried once). One tap = sound on and the card is read; every next card
  (Next, Back, Skip) reads itself until the same button turns it off. Remembered in `localStorage['lowi.tutorial.voice.v1']`
  (`'1'` on, `'0'` off, unset = never tried). aria-pressed + label "Read aloud" / "Vorlesen" / "Leer en voz alta".
- What is said: the card's title, then its text (`spoken()` in tutorial-voice.js, shared with the generator and the tests). A title
  with `{name}` is left out when the companion is not called Misty (clip `<id>~`), so a renamed companion is never called Misty.
- The voice: clips recorded ahead with Microsoft neural voices (en Ava, de Seraphina, es Ximena) in `tutorial-voice/<lang>/<key>.mp3`,
  word timings in `tutorial-voice-data.js` (loaded when the tour opens). The word being said lights up (`.lt-w.lt-say`, no layout
  change). A clip plays only when its words equal the card's words; otherwise, or offline with a clip never heard, the device's best
  voice (Web Speech, natural/enhanced voices preferred) reads it with the same highlight. Heard clips stay on the phone (Cache
  `lowi-voice-v1`) and the next two cards are fetched ahead.
- iPhone: sound needs a tap. The first tap plays a silent sound on the one audio element; after that clips play on their own. When
  the tour opens by itself after a reload with sound on, the badge pulses (`.lt-spk-tap`) and one tap plays.
- Silence at once on Back/Next (old clip stops), Skip all, Esc, closing, the tour hiding behind a sheet (`hold()`), the app going to
  the background. World sound pauses while it talks (`lowi:media` id `tutorial-voice`).
- Files: `tutorial-voice.js` + `tutorial-voice.css` (loaded by tutorial.js), `tutorial-voice-data.js` + `tutorial-voice/` (generated by
  `tools/tutorial-voice/build.py`), `tests/tutorial-voice.test.cjs`, browser check `node tools/tutorial-voice/check.cjs [--url LIVE]`
  (iPhone SE / 13 / iPad, EN/DE/ES: speaker on the card with no overlap, a clip really plays, the lit word moves, Next reads itself,
  mute, Back, Skip all silences, remembered after reload).
- First-visit screens (Add to Home Screen guide, companion setup) have no speaker: they are short, sound cannot start before the
  first tap there, and the plain-words funnel work owns them. Decision in DECISIONS.md.
