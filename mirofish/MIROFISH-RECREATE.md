# MiroFish on a fresh agent computer

State on Mon 26 Oct 2026: the private VM run stalled on the Gemini free tier (5 requests/minute, 20/day per model).
Nothing in the run was a real debate; no interviews, no video. Full diagnosis: `vm-notes/COORD-mirofish.md`.

## Recreate

1. `git clone https://github.com/666ghj/MiroFish.git /home/sprite/MIROFISH/MiroFish`, check out the commit in
   `UPSTREAM.txt`, then `git apply /home/sprite/wt-harness/mirofish/mirofish-upstream.patch`
   (fixes: seed posts kept per agent as a list, `last_rowid` set after the seed step so seed posts are not logged twice,
   optional `time_config.start_hour` so the clock does not start at midnight). Not yet tested in a full run.
2. Install the backend as the upstream README says (Python venv in `backend/`).
3. Keys: Emmanuel's Gemini and Zep keys are GitHub secrets `MIROFISH_LLM_API_KEY` and `MIROFISH_ZEP_API_KEY` on the
   lowispike repo. Secrets cannot be read back. Either ask him to paste them into a private keys file on your own
   computer through a secure route, or use the GitHub Actions workflow "MiroFish simulation" on main
   (`tools/mirofish/`), which reads them itself. The repo is PUBLIC: Actions logs and artifacts are readable, so the
   private route is the VM. Never commit keys.
4. Run script and seed: `run1/run.py`, `run1/requirement.txt`, `run1/seed/lowispike-app-walkthrough.md`
   (12 fictional beta readers: 8 English, German/Hamburg, Colombian Spanish/Medellin, Swiss German/Winterthur,
   Japanese/Osaka; each names an ideal Plus price, no anchor).
5. Before the next run: make it stop on its own if any agent is not one of the 12 personas or falls back to default
   config (429 during config). Quota: about 300 requests for 12 people x 20 rounds + interviews + report (estimate).
   Free route: gemini-3.5-flash-lite, max 4 requests/minute, one platform. Paid route: billing on the Gemini project
   "LOWiSPIKE MiroFish" (Emmanuel's decision, not taken).
6. Video (after real answers exist): local Piper voices (`piper-voices.txt`, download from rhasspy/piper-voices),
   `asr.py` for subtitles. Swiss German model downloaded on the old VM, not tested. Intro starts with "Hey, Maya and
   Emmanuel have run a digital simulation," then FaceTime-style cartoon persona calls with English subtitles.

Private and NOT on GitHub: the old VM's `keys.env`, the run-1 database and profiles, and the Zep graph of run 1
(project proj_2da3002e0dca, still stored at Zep; Emmanuel declined deletion at the time).
Alternative he already has: `research/LOWiSPIKE-ChatGPT-simulation-prompts.md` (single-thread and agent versions).
