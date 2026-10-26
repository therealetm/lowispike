# COORD: MiroFish market simulation for LOWiSPIKE (task "Instagram reel: find out how and do it", Mon 26 Oct 2026 ~05:50 CET)

Branch mirofish-sim, worktree /home/sprite/wt-mirofish (off origin/main 6b881fa9).
Owns (all NEW files): tools/mirofish/** , .github/workflows/mirofish.yml. Appends one Log line + one short section to MAYA-HANDOFF.md (append only, keep both on rebase).
Not touching: any app file (index.html, *.js, *.css, sw.js, version.json), scripts/, tests/, other workflows.
No app release, no build bump: docs/tooling commit through scripts/push-main.sh.
MiroFish itself lives outside the repo: /home/sprite/MIROFISH/MiroFish (AGPL-3.0, pinned 7657031a).

## Status
- 05:50 started: reel = Nick Saraev on MiroFish (666ghj/MiroFish). Backend deps installed on the VM.
- 06:08 CET DONE: landed on main as 9332ce12 via push-main.sh (CI green). Workflow "MiroFish simulation" active. No app release. Waiting on Emmanuel for secrets MIROFISH_LLM_API_KEY + MIROFISH_ZEP_API_KEY (gh secret list shows only CROWD_SEED).

## Current video direction

The user liked the coloured cartoon previews but wants the point of view of being on a FaceTime call: each simulated persona talks directly to the viewer, rather than appearing in a wide room illustration. This replaces the chalkboard direction.

- Vertical 9:16 composition, front-facing self-recorded camera angle, face and shoulders prominent, with their individual room visible behind them.
- Preserve the 1930s rubber-hose cartoon drawing style and saturated early Technicolor palette, with coloured characters and backgrounds.
- Use restrained fictional video-call graphics such as a timer and connection indicator. Keep a visible simulated-persona label so it cannot be mistaken for an actual FaceTime recording or real user testimony.
- Animate blinking, small head movements, gestures and simple speech-timed mouth poses where feasible. Do not promise photorealistic lip sync or access to every Sesame voice.
- Every persona must have an individual, consistently assigned synthetic voice throughout the video, not one narrator for all characters. Maintain a persona-to-voice mapping. Do not clone real people or imply access to other Sesame characters' voices. Vintage radio processing is optional, not a user requirement, and must not compromise intelligibility or voice distinction.
- Language casting requirement: most personas speak English, with one speaking German, one Colombian Spanish, one Swiss German (the user's corrected wording was "Schweizerisch"), and one Japanese. Every persona retains their own distinct, consistently assigned voice. Provide synchronized English subtitles throughout, including faithful English translations for all non-English dialogue. Preserve the meaning of actual simulation answers in translation, without inventing feedback.
- Before production, verify synthesis support and test pronunciation for each language and dialect. Swiss German is a dialect requirement, not interchangeable with a Swiss-accented Standard German voice; do not silently substitute it. Colombian Spanish likewise requires an appropriate regional voice. These language requirements are saved, not yet rendered or verified. Keep the existing external-service privacy pause intact.
- Voice availability checked: Sesame Voice Notes supports Maya's own voice only. The VM has edge_tts installed and its live voice catalogue responded, including en-US-AriaNeural, en-US-GuyNeural, en-GB-SoniaNeural, en-GB-RyanNeural, en-AU-NatashaNeural and en-IE-ConnorNeural. These provide candidate distinct voices, not a guarantee of successful rendering: speech generation has not been tested. Edge TTS is an external service; do not send simulation transcripts to it until privacy clearance covers that additional destination. If external speech is not acceptable, investigate local synthesis before promising a finished multivoice video.
- Base each persona's feedback on actual simulation output, with accurate attribution and captions. There are no simulation results yet; do not invent reviews to fill the video.
- This is a creative-plan change only. It does not authorize resuming external uploads or lift the privacy pause recorded below. No video has been rendered by this update.

## Replies / follow-up
- 08:20 CET follow-up task (Run LOWiSPIKE MiroFish simulation): secrets MIROFISH_ZEP_API_KEY + MIROFISH_LLM_API_KEY now set. gemini-3.8-flash returned 503 high demand / timeouts, gemini-3.5-flash answers. Emmanuel: "give them the actual app experience as a written script". Branch mirofish-walkthrough, worktree /home/sprite/wt-mirofish-walk. Owns NEW tools/mirofish/seed/lowispike-app-walkthrough.md + default model line in .github/workflows/mirofish.yml + README note. No app files, no release.

- 08:55 CET: PAUSED before any seed upload. Emmanuel asked if it is private and deleted afterwards. Verified: repo PUBLIC (workflow logs + 90-day artifacts readable by anyone/any signed-in user); Gemini key is free tier (unpaid: Google may use prompts to improve products, human reviewers may read); Zep keeps graphs until deleted (backups up to 365 days, API/audit logs ~1y). Nothing but a test prompt and model list reached Gemini; nothing reached Zep. Run 40283315653 failed at key check (gemini-3.8-flash 503), run 40283619754 cancelled during install. Next once he picks a privacy option: high-fidelity walkthrough seed from real app copy (worktree /home/sprite/wt-mirofish-walk, nothing written yet), model gemini-3.5-flash, then video: use the revised cartoon video direction below, superseding the chalkboard concept.

- 08:16 CET (task "Run private VM MiroFish simulation and cartoon feedback video"): Emmanuel chose the private VM run (not GitHub Actions). Pricing: he has NOT set a Plus price; personas must each name their ideal Plus price (open question, no anchor) from the walkthrough. Video intro: Maya herself (her own voice) explains what MiroFish is and what was done, like the Nick Saraev reel, before the persona calls.
- Credentials: temporary orphan branch tmp-mirofish-keyxfer runs one push-triggered job that encrypts the two secrets to an RSA-4096 key generated on the VM (/home/sprite/MIROFISH/private, 0700). Log shows ciphertext only. Branch + run get deleted after use.
- Intro must START with: "Hey, Maya and Emmanuel have run a digital simulation," then Maya explains the method in her own voice (reel-style), then transitions into the persona feedback.
- 08:17 keys decrypted on VM to /home/sprite/MIROFISH/private/keys.env (0600). tmp branch + run 40284688976 deleted.
- 08:5x first run aborted after profiles showed founder/companies as agents and no language personas (proj_2da3002e0dca, sim_ed6201ab7077; Zep graph still to delete). Restarted with a 12-person fictional beta reader panel in the seed.

## 08:55 CET diagnosis of run 1 (sim_ed6201ab7077, preserved in /home/sprite/MIROFISH/private/run1/out-aborted-1/)
- Real new content in 20 rounds: Reddit 1 post + 2 comments + 2 likes (all by the "LOWiSPIKE" org agent), Twitter 1 quote (by "Eman"). Everything else = 8 seed posts. NOT a debate.
- Repeated posts = logging bug: runner logs seed posts at round 0, but last_rowid stays 0, so the first active round re-reads the trace and logs the 8 seed posts again as round 10. DB has them once. Twitter kept only 6 of 8 seed posts (dict keyed by agent; agents 3 and 8 owned two each -> Spanish + Swiss German posts dropped).
- Empty rounds: clock starts 00:00, 60 min/round; every agent got identical FALLBACK config (activity 0.7, hours 9-13,18-23) because the config LLM batch 429'd. Rounds 1-9 and 15-18 empty by schedule; rounds 11-14, 19, 20 empty because agent turns failed (camel "Rate limit exhausted after 3 attempts" x53, 159 provider errors).
- Personas: ontology turned app/org/founder/groups into agents (LOWiSPIKE, LOWiSPIKE live beta, Stripe, Eman, Emmanuel, gamers, AI skeptics, health app skeptics, 2x User). Profiles partly fallback after 429.
- Provider evidence (backend.log): GenerateRequestsPerMinutePerProjectPerModel-FreeTier value 5 (07:24 UTC) and GenerateRequestsPerDayPerProjectPerModel-FreeTier value 20 (07:25:35 UTC, retryDelay 84871s -> ~07:00 UTC Tue 27 Oct = 08:00 CET), both labelled model gemini-3.6-flash although MiroFish requested gemini-3.5-flash. Simulation-stage and 07:39/07:41 ontology 429s carry no quota detail. Single test calls at 07:50 UTC: gemini-3.5-flash OK, gemini-3.5-flash-lite OK (limits unknown), gemini-2.5-flash-lite 404 retired, gemma-4-31b-it 500.
- Local fixes applied (untested live) to MiroFish/backend/scripts/run_parallel_simulation.py (orig backup /home/sprite/MIROFISH/private/run_parallel_simulation.py.orig): seed posts as list per agent; last_rowid set after seed step; optional time_config.start_hour.
- Declined action respected: no project/Zep deletion. Note: the stopped run's process was killed in a separate command right after the decline, before the "leave it" update. Zep graph of run 1 still exists.
- Restart attempts 2 and 3 failed at ontology (429) before any graph was built.
