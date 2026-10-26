# agent-harness: the old agent computer's tools and notes

This orphan branch holds what used to live only on the previous agent's computer (`/home/sprite`), so the next
agent can work without it. It is not part of the app and is never deployed. Start with `MAYA-HANDOFF.md` on `main`.

## What is here

- `probes/BUGHUNT/` the hourly bug hunt: `BUG-MEMORY.md` (every bug found, its siblings), `LEDGER.md` (round by
  round), `HANDOFF.md`, the What's New JSON files it released, and `playtest/` (Playwright probes; `lib.cjs` opens the
  app in a simulated `iphone13`, `ipadP`, `ipadL` or `chromium390` with service workers blocked).
- `probes/CHATROOM`, `probes/CHATROOM-IPAD`: chat room probes (`probe-room.cjs`, `probe-check.cjs`, `probe-kb.cjs`).
- `probes/NEWUSER`, `probes/WORLDS`, `probes/CMATCH`, `probes/PEAK`: new-user walkthrough, worlds playtest, companion
  match and peak-energy scripts.
- `probes/snapshot-wip.sh`: pushes every worktree's unmerged or uncommitted work to `wip/<branch>` with `[skip ci]`.
- `probes/sync-vm.sh`: the rolling handoff. Copies the agent computer's tooling and notes here (whitelist, secret scan,
  no screenshots/logs/audio/private data), pushes this branch, then runs `snapshot-wip.sh`. Every coding task and every
  bug-hunt run calls it when it finishes a step: `bash /home/sprite/wt-harness/probes/sync-vm.sh "what changed"`.
- `probes/CP`, `CROWDCHECK`, `FOODPATHS`, `HV`, `BOTS`: companion card, community crowd, food paths, home visit probes
  (`BOTS/sb.cjs` is the shared Supabase helper with the public publishable key; the crowd seed in
  `~/.config/lowispike-crowd/seed` and `BOTS/reader.json` are private and never copied).
- `tools-vm/`: loose scripts from the home folder (`sbw.sh` wraps the Supabase CLI for project vnfwmifmsfecascwaody;
  the CLI token itself is never copied: sign in again, see MAYA-HANDOFF.md section 2).
- `research/`: ChatGPT simulation prompts (12 personas), UGC creator-farm and Finch research, food studio plan, audit.
- `aso/`: App Store concept build scripts and the finished German concept images (`LOWiSPIKE-AppStore-Konzept/`).
  The seed with Emmanuel's own profile data is not copied.
- `mirofish/`: our fix to upstream MiroFish (`mirofish-upstream.patch`, base commit in `UPSTREAM.txt`), the private
  VM run's `run1/run.py`, `requirement.txt` and seed (12 fictional personas), `asr.py` and the Piper voice list.
  Not copied: `keys.env`, run output, Zep/Gemini data. See `MIROFISH-RECREATE.md`.
- `vm-notes/HANDOFF-*.md`: per-feature handoffs. `vm-notes/COORD-*.md`: the coordination files parallel tasks used
  to claim files and report status (read them for history; new ones go on your own computer the same way).

## Setup on a fresh computer

```bash
git clone https://github.com/therealetm/lowispike.git /home/sprite/lowispike   # same path the scripts expect
git -C /home/sprite/lowispike fetch origin agent-harness
git -C /home/sprite/lowispike worktree add /home/sprite/harness agent-harness
cp -r /home/sprite/harness/probes/* /home/sprite/          # restores /home/sprite/BUGHUNT, CHATROOM, ...
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y >/dev/null && npm i playwright@1.64.1
npx playwright install --with-deps webkit chromium
```

About 70 lines in the probes name `/home/sprite/...` directly; keep that layout or `sed` the paths. Set
`PLAYWRIGHT_PATH` if Playwright lives elsewhere. Example: `node /home/sprite/BUGHUNT/playtest/probe-dayover.cjs
https://therealetm.github.io/lowispike/ iphone13`.

## Rules

- Any browser test against the live site must block the production Supabase host or use a local test sign-in, unless
  the task explicitly needs the real server (made-up activity once landed on the owner's Care board).
- No keys, tokens or passwords in this branch, ever.
