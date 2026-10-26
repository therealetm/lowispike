# Bug hunt HANDOFF (run 46, Mon 26 Oct 2026 ~18:30 CET)
- BH-046 LIVE 20261026-182027 (quiet): leaving the chat while recording a voice message discards it (it kept recording and sent itself at 2 min); dictation stops when Kitchen/chat closes. Live probes PASS.
- Next: P-SESSION-OUTLIVES-SCREEN siblings (camera photoStream on swipe-back/goTab, tutorial-demo mic, chat audio playback after leaving), dictation overwriting typed text, bottom Undo toasts, cycle delete in a browser.
- Still waiting on Emmanuel: should Post wait for the photo?


## After run 47 (Mon 26 Oct 2026 ~19:30 CET)
BH-047 LIVE 20261026-191635 (food camera Escape/back + restart after background; chat voice playback stops on leave). Next: dictation overwriting typed words (mic-dictate.js); generic probe: every full-screen aria-modal layer + history.back() must not leave the app; tutorial-demo audio after leaving; Undo bars near the bottom; cycle delete; VoiceOver focus loss; level-up/badge moments. Still his call: should Post wait for the photo?

## After run 48 (Mon 26 Oct 2026 ~20:15 CET)
BH-048 LIVE 20261026-200906 (dictation keeps typed words; cleared text stays cleared; P-STALE-BASE). Next: generic probe: every full-screen aria-modal layer + history.back() must not leave the app; tutorial-demo audio after leaving; Undo bars near the bottom; cycle delete; VoiceOver focus loss; level-up/badge moments. Still his call: should Post wait for the photo?
