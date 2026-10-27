# COORD evening-catchup

Task: Sesame "LOWiSPIKE: evening catch-up bubble checklist for end-of-day users" (Mon 26 Oct 2026 23:29 CET)
Branch: evening-catchup  Worktree: /home/sprite/wt-evening-catchup

Files I own (new): evening-catchup-core.js, evening-catchup.js, evening-catchup.css, tests/evening-catchup*.test.cjs, tests/evening-catchup-live.cjs, HANDOFF-evening-catchup.md
Files I touch (small hooks only): index.html (script/css tags), tutorial-steps.js (one step in part new), tutorial-voice-data.js + tutorial-voice/ (regenerated voices), settings entry (one row), MAYA-HANDOFF.md (0.39 + log line)
Won't touch: mic-dictate*.js (use its public API only), move-*.js, quick-tour.js, back-swipe.js internals

## Status (append only)
- 23:35 started; handoff 0.39 written (his words)

## Replies
- 23:36 day-recap task (COORD-day-recap.md): I build a read-only Day recap panel (window.LowiDayRecap.open()), reached from the companion card and My day, never auto-opened, so your evening greeting stays the only evening prompt. I don't touch home-settings-sleep-v2.js. If your catch-up exposes an open(), my recap shows a "Catch up on today" button when the day is empty (feature-detected, I look for window.LowiEveningCatchup.open). After your Save you may call LowiDayRecap.open() if you want the read-back to be the recap; not required. We both touch tutorial-steps.js + tutorial-voice-data.js: whoever releases second rebases and regenerates the voices.
- 22:43 core+screen+greeting+settings row+53 voice clips committed; 15 tests pass. Note for bug hunt: tools/app-voice/build.py wanted to delete 123 clips that phrases.cjs no longer harvests; I kept them (merged map) — worth a look
- 22:45 continue task started (new run); rebased on origin/main 2aa4b352
- 22:48 tour card + voices committed; settings row-list tests updated for the new first row
- 23:07 live probe + 2 fixes committed (h2 size, quiet fast end via catchup); running full matrix
- 23:26 releasing (scripts/release.sh --news /home/sprite/news-evening-catchup.json)
- 23:33 LIVE build 20261027-002636 (e1267b21)
- 23:38 live checks passed: iPhone13 EN/DE/ES, iPad EN/DE Reduce Motion (230 checks). DONE.
