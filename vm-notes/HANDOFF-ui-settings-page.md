# HANDOFF: Settings, one tap opens the full page

Branch ui-settings-page, commit 5c6e9d070840e38345262bd90446f3ab5bd43a4e, on top of origin/main b3d5f62 (Release 20261018-215628).
NOT LIVE. The integrator still has to release it with scripts/release.sh.

## Done
- home-settings-sleep-v2.js: a single tap on the Settings bubble opens one full Settings page (`tapIntent`, `pageGroups`, `showPage`).
  - First group: Me, Look & sound, Account, Menu bar (switch). Second group, titled More: Community, Care board, Workouts, World map, VR, Gift,
    Weather, World sound (switch). Rows only appear when their route exists, same as before.
  - Modal dialog (role=dialog, aria-modal, labelled by the title). The bubble has aria-haspopup=dialog. Focus goes to the first row and
    Tab stays inside. x at the bottom right, Escape, focus returns to the bubble.
  - Switches flip where they are and the page stays open. A place closes the page and runs the same route as before.
  - The page grows out of the bubble. With reduced motion it only fades.
  - Dark blue dimming layer, no full-screen backdrop blur (phone heat). One column on a phone, two on an iPad. Only the list scrolls.
  - It stays open through resize and rotation. Blooms still close on resize as before.
  - Small fix: switching from the Sleep bloom to Settings now sets the Sleep bubble's aria-expanded back to false.
- Unchanged: the Sleep bloom. The chip bloom and More panel are still reachable through `LowiHomeSettingsSleepV2.open('settings'|'more')` for the queued double-tap and hold tasks. No new language strings are needed (uses settings, more, close, on, off).

## Proof
- Unit: tests/ui-settings-page.test.cjs, 5 new tests, failing first. Full suite 1389/1389 on the rebased branch (main alone: 1384).
- Browser: tests/ui-settings-page-live.cjs. Real app from the checkout, backend blocked, service worker off, real touch taps. PASS on:
  - Chromium 390x844
  - WebKit iPhone 13 (390x664) and WebKit 390x844, after the rebase
  - WebKit iPhone SE 320x568 and iPad landscape 1180x820, before the rebase (they rebased cleanly, with no overlapping files)
  - WebKit iPad portrait 820x1180, after the rebase
  - Reduced motion: fade only, on every view except iPhone SE (see trap 2)
- Screenshots: /tmp/ui-settings-page-shots/*-page.png. This is emulation only. Nothing was tested on a real iPhone.

## Not done / for the integrator
1. Older live scripts still expect the old single tap (chips and the More panel), so their Settings steps now fail by design:
   - tests/home-settings-sleep-v2-live.cjs (checked: only its Settings, More and menubar steps fail; Sleep passes)
   - tests/home-orbit-v2-live.cjs Settings section, and tests/everything-else-trim-live.cjs (not run, same pattern)
   I didn't edit them because they're outside my ownership. They need their Settings steps pointed at the page. None are in the node suite.
2. Misty: the page covers the whole screen, as Emmanuel asked for a "full page". She stays faintly visible through the dimming layer and is back on close.
   If he wants her fully visible (like the Cook side panel), that's a CSS-only follow-up.
3. Release notes (What's New in English, German and Spanish) and the version are the integrator's.

## Traps
1. The live script needs long waits on WebKit. The first WebKit runs sometimes timed out before the Home ring was ready, so the ready wait is 180 seconds.
2. Pre-existing on main, not this change: WebKit iPhone SE with reduced motion falls back from the 3D world (bw3-off). Then the Home hides the Scan,
   Sleep and Settings bubbles (display:none), so those people cannot reach Settings at all. Checked on the badebb0 checkout too. The live script
   reports it as preExisting for that view instead of hiding it. This needs its own small task (orbit and fallback owner).
3. I rebased my topic branch onto b3d5f62 and pushed it with --force-with-lease (topic branch only, never main).
