# Simulated play ledger (handoff item 31)

Started Tue 20 Oct 2026, 9:25 AM CEST. Branch `chat-sim-20261020`. Each line says what kind of evidence it is:
**WebKit sim** (Playwright WebKit, iPhone 13 profile, Linux), **Chromium sim**, **code reading**, **real iPhone** (only Emmanuel).
No emulator result here proves his phone is fixed.

## How the simulation works

- `tools/sim/harness.cjs`: serves the app from a folder (or a URL), opens WebKit iPhone 13 or mobile Chromium, blocks every
  foreign host, plants a signed-in fake account, and adds the crash probe (`tools/soak/crash-probe.js`).
- `tools/sim/mock-cloud.cjs`: a fake Supabase that answers every `*.supabase.co` request locally: 45 members, 300 chat
  messages (some photos, replies, mentions of Emmanuel, reactions), 40 posts, and a small realtime server so members can
  "write" live. Writes are only recorded in memory. Nothing reaches the real project.
- Optional iOS-like keyboard (`keyboard: true`): focusing a text field shrinks the visual viewport by 291 px over 300 ms with a
  resize event each frame, like Safari, and counts DOM mutations and canvas reallocations.
- `tools/sim/chat-type.cjs`: Home -> Settings -> Community -> type and send on the map -> live messages while typing -> open
  Chat -> type and send. `tools/sim/chat-memory.cjs`: memory and DOM size at each step.
- One browser at a time: the computer is shared with five other LOWiSPIKE tasks and restarted several times under load.

## Scenarios run

| # | When | Engine | Scenario | Result |
|---|---|---|---|---|
| 1 | 20 Oct 09:35 | WebKit sim | Home idle, signed in, fake cloud | Loads, realtime SUBSCRIBED. 2,095 nodes, 78 live intervals, 783 listeners. No errors. |
| 2 | 09:40 | WebKit sim | Home -> Settings -> Community (45 members, 300 messages) | Opens. Nodes jump 2,095 -> 15,849: 300 message rows + 335 companion SVGs, 461 gradients, 1,509 gradient stops, 2,062 circles, though the room (Chat) is closed. No errors. |
| 3 | 09:42 | WebKit sim | Type 52 letters in "Write to the galaxy" and send | Sent once (fake cloud got one POST). No page error, no renderer crash. Animation frames stalled (0 per second) after the field got focus; 5 s worth of extra time for 52 letters. |
| 4 | 09:50 | Chromium sim + CDP metrics | Same, with the iOS-like keyboard | Typing 28 letters: 955 DOM mutations (34 per letter), 152 style recalculations, 3.1 s script, 41 s of main-thread work. Each style recalculation ~55 ms with 18k nodes, versus ~3 ms on Home. No page error. |
| 5 | 09:52 | code reading | Why every letter costs a full paint | `input` -> `draft()` -> `store.setDraft()` -> `save()` -> session `changed()` -> `refresh()` -> `paint()`: rebuilds all 300 message rows as HTML strings (each with a companion drawing), the galaxy, the status line, the reply bar and the mention box, on every key. |

## Findings

- **F1 (proven in sim, cause read in code): every keystroke repainted the whole Community.** See scenario 5. On the phone
  this runs while the keyboard is animating and the visual viewport is resizing, on a page with ~16k nodes.
- **F2 (proven in sim): the closed room still held all 300 messages.** ~13.7k of the ~15.8k Community nodes were the hidden
  chat list, each row with a full companion SVG with its own gradients. Suspected (not proven) to be the memory that gets
  Safari's page killed on an iPhone ("A problem repeatedly occurred" is Safari reloading a page whose process was killed,
  most often for memory). No crash reproduced in WebKit on Linux: it has no iOS memory limit.
- **F3 (UX, sim): Community is hard to reach.** Home -> Settings -> its chip sits at the very bottom of the Settings page,
  partly under the bottom edge on an iPhone 13 Safari-sized screen (390x664); a tap there hit the page, not the chip, until
  the page was scrolled.
- **F4 (sim): with the room open you cannot reach older messages beyond what is loaded** (unchanged; the cloud loads the
  newest 300).

## Fixes

- **X1 (F1)** `community-chat.js`: typing goes through `typeDraft()`; the draft is still saved, but the session's `changed`
  only updates the composer (send button, counter, draft hint) instead of `refresh()`. The mention box only rewrites when
  its contents change. Test: `tests/sim-chat-typing.test.cjs` (fails on the old code).
- **X2 (F2)** `community-chat.js` + `community-chat.css`: the room list holds the newest 60 messages; "Show earlier
  messages" adds 60 more and keeps your place; closing the room shrinks it back; a message the room is asked to show
  (e.g. from a visit's Reply) is always included. Community nodes in the sim: 18,013 -> 7,334 (Chromium, same fixture).

## Still open
