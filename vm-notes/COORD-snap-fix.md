# COORD: Snap food photo stopped working (SNAPFIX worker)
Task: LOWiSPIKE: Snap food photo stopped working (forked, 2026-10-19 16:19 CEST). Branch snap-fix, worktree /home/sprite/wt-snap-fix.
## Owns
- food-photo-ai.js token()/analyse()/mount() error path + messages; spirit.js photoSheet() markup only; scan-screens.css photo sheet rules
- supabase/functions/food-photo/index.ts: gemini() only (error classification, timeout). Coordinated with PHOTOCAP (COORD-photo-cap.md), who owns the cap.
## Status
- diagnosing (edge logs: iPad never reached food-photo; iPhone did 8 OK reads 15:45-15:57, then 16:11 GET with no POST)
