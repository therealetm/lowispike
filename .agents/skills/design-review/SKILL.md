---
name: design-review
description: A short critique pass before any LOWiSPIKE UI change ships (Emmanuel, 7 Nov 2026 "design is extremely important to me ... learn how other people do it ... someone who also critiques the app"). Use with apple-design (motion) and frontend-design (visual direction).
---

# Design review for LOWiSPIKE

Run this on every screen you add or change, at 375x667, 390x844 and 430x932, in German, English and Spanish, with screenshots you
actually look at. Fix what fails before the release. Sources it was distilled from (read them when in doubt):
Anthropic `frontend-design` (this folder's sibling), Vercel Web Interface Guidelines
(https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md, fetch fresh), Apple Human Interface
Guidelines, and `apple-design` (fluid motion). AGENTS.md and Emmanuel's own words always win.

## The owner's standing taste (from his own requests)
- One page per screen: if it almost fits, make it fit (smaller parts), never a tiny scroll. Settings-like lists may scroll.
- Nothing wobbles: a sheet never drifts sideways while you swipe; `overscroll-behavior: contain` and `overflow-x: clip` on sheets.
- Symmetry on Home is sacred: no extra rings, badges or words on the bubble ring; bubbles show symbols and real numbers only.
- Liquid glass, transparent bubbles, one big primary action; secondary actions small. Look like TikTok / Instagram / iMessage /
  WhatsApp where the user already knows the pattern (photo bubbles, carousels, posting).
- No motion without a reason: an animation explains cause and effect or draws the eye once. Nothing loops "the whole time".
- Words: plain, short, the user's language; a button says exactly what happens.

## Checklist
1. Purpose: can a new user say in one sentence what this screen is for? Is there exactly one primary action?
2. Fit: no clipped words, no overlapping layers (back button, sticky rows, toasts), no horizontal scroll, no tiny vertical scroll.
3. Touch: every target at least 44 px (expand small icons with a ::after hit area); `touch-action: manipulation` on controls.
4. iOS: inputs at 16 px or more (no zoom on focus), safe areas respected, nothing under the home indicator.
5. Consistency: same corner radii, glass and button styles as the neighbouring screens; no one-off colours.
6. Motion: interruptible, honours `prefers-reduced-motion` and Calm mode, no autoplay loops longer than 5 s.
7. States: empty, loading, error and very long content all designed; errors say what to do.
8. Accessibility: icon-only buttons named, decoration aria-hidden, focus visible, colour never the only cue.
9. Look at it next to TikTok / Instagram / iMessage: would a TikTok user know what to tap? If not, change it.
10. Write the before/after in DECISIONS.md with the screenshots you checked.
