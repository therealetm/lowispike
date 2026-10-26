# HANDOFF mic dictation

STATUS: LIVE in build 20261026-173248 (main d963b418), silent (loud unchanged), What's New mic-dictation + voiced step new-mic-dictation.
Live WebKit iPhone 13 checks EN/DE/ES (tools/mic-dictate/probe.cjs with LIVE=1): chat mic inside the text box beside the untouched voice-message mic, denied hint, keyboard-dictation hint, Scan food name writes words in de-DE/es-ES, tap again stops, no page errors.
Release trick: /home/sprite/mic-release.sh holds the shared lock while rebasing and re-wires index.html (build-stamp conflicts) before scripts/release.sh.
Old branches: mic-dictation-3 (clean on origin/main 7caf75c7). Older copies: mic-dictation (WIP with cloud function, abandoned), mic-dictation-2 (same code, old base).

## Done (how checked)
- mic-dictate-core.js / mic-dictate.js / mic-dictate.css: shared glass mic, auto on free-text fields (data-mic forces on, data-mic="off" opts out), device speech only (SpeechRecognition), iPhone Home Screen app falls back to keyboard dictation hint. No cloud, no Supabase voice-text function (removed).
- tests/mic-dictate.test.cjs 9/9.
- tools/mic-dictate/probe.cjs WebKit iPhone 13 EN: chat dictation inside text box, voice-message mic untouched, denied hint, service-not-allowed -> keyboard hint, Scan food name mic writes words, tap again stops, no page errors.

## Not done (follow-ups)
- Not tried on Emmanuel's real iPhone yet.
- Audit all screens (Kitchen add, shopping list, Supermarket search, Give a hand add, captions, companion rename) and add data-mic where a field is narrower than 150 px.
- Tutorial step new-mic-dictation EN/DE/ES with voice, news.json, release.

## Next exact step
Run field audit probe, then tutorial step + voice, full suite, scripts/release.sh --news.

## Traps
- /tmp/exec output files sometimes vanish on this VM: write probe logs to /home/sprite/*.log and read them.
- The VM itself dropped out twice (HTTP 500/502): push after every step.
- Old branch mic-dictation diverged from the rebased local one; never force push, use a new branch name.
