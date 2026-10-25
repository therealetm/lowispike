# HANDOFF: iOS-feel springs + rubber band (25 Oct 2026)

Live since build 20261025-194711 (commit aef716ca, CI green, released quietly: no push, no Community post, no What's New).

## What it is
- spring.js: interruptible springs (keeps position + velocity, grab stops in place, retarget without restart, finger velocity carries, stops asking for frames at rest, reduce motion jumps to the end).
- rubberband.js: Apple formula with c = 0.55, never past one screen.
- Used by: Home panels (misty-bloom.js open/close), sheets (apple-ui.js), Room camera (community-chat.js place/camTo/mapGestures), section glow (community-rooms-ui.js), first/last page edge (liquid-glass.js), and since this release the Weather panel (top-bar.js) and the Fasting panel (index.html sheet()/closeSheet()). misty-bloom.js prep() drops a stale spring from a reused #sheet.
- Today panel: retired in code (TODAY_RETIRED), never opens, left alone.

## Checks
- tests/ios-springs.test.cjs (21 tests). Whole suite 3,414 at release.
- tools/springs/check.cjs [url] [chromium-phone|webkit-phone]: sheet, bloom, Room pan/pinch/fling, section glow, rest.
- tools/springs/panels.cjs [url] [case]: Weather + Fasting closed mid-growth, reused #sheet clean.
- WebKit on the VM: two-finger pinch crashes it (also on the old build), so pinch is Chromium-only. When the VM is overloaded a WebKit frame can take 0.4-5 s, longer than a panel's whole close, so a panel can already be removed by the next frame; the tools report that as removed, not as a jump.

## Still to do
- Look at Cook, the joystick, Scan, dragging the Home bubbles and Misty's tap reactions for the same spring/rubber band (not started).
- Real iPhone check.
