# Tutorial (Settings > Tutorial)

Emmanuel, 19 Oct 2026: "There should be a tutorial button where you can click on it and then basically our companion takes you
through everything from the beginning, as if you were new. Obviously, you can skip if you already know this. So, with every new
update, the tutorial also needs to be updated."

## Files
- `tutorial-steps.js`: the ONE data file. Steps in order, each with `id`, `area`, `target` (CSS selectors of the real Home control to
  spotlight, first visible one wins; `null` = centred card), optional `when` / `action`, `covers` (feature ids) and `title` / `text` /
  `cta` in `en`, `de`, `es` (`{name}` = the companion's name). Optional `sayTitle: false` (or `{ de: false }`) = the voice never reads
  this title (a repeat in other words), `peek: { kind: 'scan', mark: 'frame' | 'deep' }` = a picture of the inside of Scan under the
  text. `NO_TUTORIAL` lists features that need no step, with the reason.
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
- Short auto-demo tour (Oct 25 2026, branch tutorial-short-20261025): the base tour is at most 12 one-sentence cards (11, plus the
  "claim your companion" card only for accounts that still have the standard Misty). Every card plays by itself: a demo finger
  (`tutorial-demo.js`) does the gesture on the real control, the page opens read-only, the card jumps to the free edge and fades in
  (it stays hidden, `.lt-roomwait`, until a piece of the page is visible, so it never sits on bubbles that are still flying out), and
  with the speaker off the reading time moves it on. Scan is a mocked screen ("Kaum Spike · 9/10", marked Demo): the camera is never
  asked for. After the very first finished tour Misty flies once by herself (`tutorial-flight.js`, `lowispike.first-flight.v1`, once
  per account, any touch hands control back, no tracking entries).
- The old "Try it now" button, the practice pads and the tour's own touch watchers were REMOVED from tutorial.js/css on Oct 25 2026
  (the demo finger replaced them; item 38's "can be done or is for later" is now met by showing every gesture). `later: '<motion>'`
  (the small looping hand and "After the tour" wording) stays because What's New cards still use it. `tests/tutorial-doable.test.cjs`,
  `tests/tutorial-trynow.test.cjs` and `tests/tutorial-short.test.cjs` guard that Try it now / practice cannot come back.
  Only the chat card switches to the Chat tab (it opens the galaxy chat itself since item 36); voice and post cards stay on the Room tab.
- It never opens panels, and never Scan: `goTab('scan')` opens the scanner camera at once, so no step has `where: 'scan'` and
  `TAB_OF` has no scan (Oct 22 2026: the tour kept calling it for 2.5 s, iOS asked "Allow camera" and the tour got stuck; a tour left on
  a Scan card reopened it on the next start). The Scan cards show a picture of the inside instead (`peek`, compact on small iPhones),
  the Scan bubble card has no try-it. It hides completely (`.lt-held`, invisible and untouchable) while setup / the sign-in gate, any other visible
  `[aria-modal=true]` dialog, any sheet in the Day card's `BUSY` list, Settings, Misty's flight or the scanner camera (`html.b3-camon` / `#b3Cam`, opened by the user)
  is up, and comes back where it
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

## What's New is a mini tour (Oct 23 2026, tutorial.js `LowiTutorial.news`)
Emmanuel: "every time I do an update it's not in the tutorial style ... take them to the place where you updated it and show them
around. They can skip it or go through that mini tutorial or the last page of the newest tutorial."
- The newest features live in part `new` of `tutorial-steps.js` (right before `end`), so the full tour ends with them too.
- A release's `news.json` lists its steps: `"tour": ["new-rooms", "new-deadlift"]`. Without `"tour"`, a `"tutorial"` step id is
  the tour. With neither (`"tutorial": {"none": ...}`, a pure fix) the update shows ONE card in the same style with the start of
  its own text. `bump-build.cjs` copies `tour` into `version.json` and keeps `news.history` (the last 12 releases' `{id, tour}`);
  a tour id that does not exist blocks the release (exit 5), a release without a tour prints a WARNING.
- **Every user-visible release ships a tour step**: add (or update) a step in part `new`, list it in `"tour"`, record its voice.
- A step that lives behind a panel names a route: `open: 'rooms' | 'shop' | 'move'` (`OPEN` in `tutorial.js`). The tour opens the
  place once when the card comes up, treats that sheet as its stage (does not wait behind it, the card sits above it), closes it
  when the next card does not need it and goes back Home at the end. A new route = one line in `OPEN` (`go`, `stage`, `back`).
- Exactly one announcement per launch: `index.html` folds every unseen release (`unseenNews`: news + history minus the seen ids)
  into one tour, saves ALL those ids as seen in localStorage BEFORE it shows, and returns, so Skip, Got it, a reload or a crash
  never bring it back and no second popup follows. The tour never touches the full tour's saved place (`mode === 'news'`, its
  events carry `news: true`). Card: "Neu · 1 von 6", "Überspringen" top right, "Los geht's" on the intro, "Alles klar" at the end.
- Checks: `tests/whats-new-tour.test.cjs` (format, one-per-launch, reload regression), and in a browser
  `node tools/check-whats-new-tour.cjs <root|url> iphone|ipad [shotPrefix]` (goes through every step, skip, reload).

Example news.json:

```json
{"slug": "rooms", "tutorial": "new-rooms", "tour": ["new-rooms"], "text": {"en": "...", "de": "...", "es": "..."}}
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
- What is said (Oct 22 2026, Emmanuel: "It reads the title, so it sounds very repetitive ... If the title and the text aren't
  repetitive, then I guess it can"): the text, with the title in front only when it adds something (`titleAdds()` / `spoken()` in
  tutorial-voice.js, shared with the generator and the tests). The title is left out when any of its words, or a form of it (same
  first four letters, one word the end of the other, simple endings off; small words ignored), is in the text, or when the step says
  `sayTitle: false` for a repeat in other words ("Hold me" / "keep your finger on me"). Said today: hello, claim, a few more per
  language (en 7, de 8, es 7 of 71: claim, hello, energy-peak, look, secret, affiliates, ...). A title with `{name}` that is said is left out when the companion is not called Misty (clip
  `<id>~`), so a renamed companion is never called Misty. A card already read to the end is not read again when it repaints (try-it
  done, Pause off); it is when it comes back from behind a sheet.
- Hands-free (Oct 22 2026, Emmanuel: "If I did turn on the mic, I should be able to just place my phone somewhere and just listen as
  it goes, by itself"): with the speaker on, a card read to the end moves on by itself after 1.2 s (4.5 s on a try-it card, to leave
  time to try); a thin line fills along the card's bottom meanwhile. Next / Back / Skip work as before and cancel the wait. A round
  Pause button (`[data-lt=pause]`, shown only with the speaker on, next to Back) stops the voice and the moving on until Play is tapped
  (Play reads the card again, then goes on); Next / Back while paused stay paused. Turning the speaker off also stops it. Never moves on
  by itself: the claim card, the last card, a card hidden behind a sheet, a card the browser would not play (no tap yet on iPhone, the
  badge pulses), the app in the background. While it reads by itself the screen is asked to stay on (Screen Wake Lock, Safari 16.4+,
  best effort). `LowiTutorial.paused() / pause(v) / auto()` for checks.
- **Tutorial voice: only** the recorded Microsoft neural voices `en-US-AvaNeural`, `de-DE-SeraphinaMultilingualNeural`,
  `es-ES-XimenaNeural`, generated with `tools/tutorial-voice/build.py` (edge-tts, rate +0%, pitch +0Hz, volume +0%, 24 kHz mono 48 kbit/s
  mp3); never the old text-to-speech (device / Web Speech) voice (Oct 24 2026, Emmanuel: "make sure the voice that takes us through the
  tutorial is not that old text-to-speech voice ... Only utilize that voice from now on going, and make sure it's saved in the files").
- The voice: clips in `tutorial-voice/<lang>/<key>.mp3`, word timings in `tutorial-voice-data.js` (loaded when the tour opens). The word
  being said lights up (`.lt-w.lt-say`, no layout change). A clip plays only when its words equal the card's words; otherwise, or
  offline with a clip never heard (fetched twice), the card stays silent with its words on screen (`how()` = 'none'). Heard clips stay
  on the phone (Cache `lowi-voice-v1`) and the next two cards are fetched ahead.
- Every card is recorded, including the What's New card of a release without a tour step (`news-card`, from version.json `news`;
  `LowiTutorialVoice.cards(S, news)` lists them). `scripts/release.sh` records it for every `--news` release.
  `tests/tutorial-voice-only.test.cjs` fails when a card has no clip from the approved voices, a clip is not edge-tts's format, or a
  tutorial file uses speechSynthesis.
- iPhone: sound needs a tap. The first tap plays a silent sound on the one audio element; after that clips play on their own. When
  the tour opens by itself after a reload with sound on, the badge pulses (`.lt-spk-tap`) and one tap plays.
- Silence at once on Back/Next (old clip stops), Skip all, Esc, closing, the tour hiding behind a sheet (`hold()`), the app going to
  the background. World sound pauses while it talks (`lowi:media` id `tutorial-voice`).
- Files: `tutorial-voice.js` + `tutorial-voice.css` (loaded by tutorial.js), `tutorial-voice-data.js` + `tutorial-voice/` (generated by
  `tools/tutorial-voice/build.py`), `tests/tutorial-voice.test.cjs`, browser check `node tools/tutorial-voice/check.cjs [--url LIVE]`
  (iPhone SE / 13 / iPad, EN/DE/ES: speaker on the card with no overlap, a clip really plays, the lit word moves, Next reads itself,
  mute, Back, Skip all silences, remembered after reload), hands-free check `node tools/tutorial-voice/handsfree-check.cjs [--url LIVE]
  [--full 0]` (stubbed audio + camera: a whole tour by itself with no camera ask, continue on a Scan card, Pause / Play / speaker off,
  a camera the user opens hides the tour, iPhone SE layout in en/de/es), `tests/tutorial-handsfree.test.cjs`.
- Public interface, also used outside the tour (Affiliate scripts task, Oct 22 2026): `window.LowiTutorialVoice` = render(el, step,
  { lang, name, next, onEnd, quiet }), stop, toggle, isOn, playing, how, paused, word, bestVoice, data, spoken, plan, titleAdds, VOICES,
  BCP, NAME, KEY, CACHE, DIR, cards, ONLY_CLIPS (Oct 24 2026; bestVoice always returns null), plus the window event `lowi:tutorial-voice` { on, state: 'on' | 'off' | 'end' }. Add to it; never rename
  or remove.
- First-visit screens (Add to Home Screen guide, companion setup) have no speaker: they are short, sound cannot start before the
  first tap there, and the plain-words funnel work owns them. Decision in DECISIONS.md.
- **Voice speed pill (Oct 24 2026).** Emmanuel: "you know how on WhatsApp when you listen to a voice note you can kind of like click on
  2X and then it goes faster. I want that for the tutorial voiceover". `.lt-rate`, right after Pause in the card's bottom row, shown
  only while the speaker is on (`#ltTour.lt-voice`). Each tap: 1× → 1.5× → 2× → 1× (`RATES`; 1,5× in de/es). The talking clip changes
  at once on the same element (`playbackRate`, `preservesPitch`, no new src, no seek); there is no device voice any more (Oct 24
  2026). Saved in `localStorage['lowi.tutorial.voice.rate.v1']`, so every next card and the next session use it. Daily Quest
  glass, fixed 54 × 44 px. On a 320 px phone in German the bottom row wraps on cards without Back (no overlap). Tour step
  `new-voice-speed` (part `new`). Checks: `tests/tutorial-voice-speed.test.cjs`, in a browser
  `node tools/tutorial-voice/speed-check.cjs [--url LIVE] [--engines chromium]`.
