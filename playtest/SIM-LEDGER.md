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

## Findings

## Fixes

## Still open
