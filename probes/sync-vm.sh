#!/usr/bin/env bash
# Rolling handoff: copy the agent computer's LOWiSPIKE tooling and notes onto this agent-harness branch and push it,
# so a new Maya who only has GitHub can carry on (MAYA-HANDOFF.md section 0.6, Mickey 17 workflow).
#
#   bash /home/sprite/wt-harness/probes/sync-vm.sh "what changed" [--no-wip]
#
# 1. Copies a WHITELIST of text tooling and notes from /home/sprite (scripts, probes, COORD/HANDOFF notes, bug memory,
#    MiroFish setup + patch, research, App Store concept images). Screenshots, logs, audio, run output, node_modules,
#    private data and keys are never copied (see EXCLUDES and the private list below).
# 2. Refuses to commit if anything staged looks like a key/token (same patterns as snapshot-wip.sh, plus a few more).
# 3. Commits to agent-harness and pushes it (never main, never forced).
# 4. Unless --no-wip: runs snapshot-wip.sh, which pushes every unfinished worktree to wip/<branch>.
# Safe to run from several tasks at once (flock). Safe to run often: no change = no commit.
set -uo pipefail
NOTE=${1:-checkpoint}; WIP=1; [ "${2:-}" = --no-wip ] && WIP=0
H=$(cd "$(dirname "$0")/.." && pwd); V=/home/sprite
exec 9>/tmp/lowispike-harness.lock; flock -w 600 9 || { echo 'harness lock busy'; exit 1; }
cd "$H" || exit 1
git fetch -q origin agent-harness && git rebase -q --autostash origin/agent-harness 2>/dev/null || { git rebase --abort 2>/dev/null; echo 'rebase on origin/agent-harness failed, fix by hand'; exit 1; }
X=(--exclude='node_modules/' --exclude='*.png' --exclude='*.jpg' --exclude='*.jpeg' --exclude='*.webm' --exclude='*.mp4'
   --exclude='*.mp3' --exclude='*.wav' --exclude='*.m4a' --exclude='*.log' --exclude='*.jsonl' --exclude='out*/' --exclude='out*.txt'
   --exclude='shots/' --exclude='test-results/' --exclude='*.onnx' --exclude='.env' --exclude='*.env' --exclude='*.key' --exclude='*.pem'
   --exclude='cleanup/' --exclude='data/' --exclude='fonts/' --exclude='seed.js' --exclude='reader.json')
mkdir -p probes vm-notes tools-vm research aso mirofish
# probes and playtest scripts (each folder mirrors /home/sprite/<name>)
for d in BUGHUNT CHATROOM CHATROOM-IPAD NEWUSER WORLDS CMATCH PEAK CP CROWDCHECK FOODPATHS HV BOTS; do
  [ -d "$V/$d" ] && rsync -a --prune-empty-dirs "${X[@]}" "$V/$d/" "probes/$d/"
done
# coordination and per-feature handoff notes
cp -p "$V"/COORD-*.md "$V"/HANDOFF-*.md vm-notes/ 2>/dev/null
# loose scripts in the home folder and the old handoff helpers
for f in "$V"/*.sh "$V"/*.cjs "$V"/ipadB.js "$V"/bin/sbw.sh "$V"/maya-handoff-work/*.sh "$V"/maya-handoff-work/*.cjs; do
  [ -f "$f" ] && cp -p "$f" tools-vm/
done
# research and simulation prompts (public-source research only; email-audit-notes.md is private and stays on the VM)
for f in LOWiSPIKE-ChatGPT-simulation-prompts.md research_notes.md lowispike-full-audit-oct-18.md ugc-farm-playbook.html \
         finch-growth-playbook.html lowispike-food-studio-plan.html; do [ -f "$V/$f" ] && cp -p "$V/$f" research/; done
# App Store concept: build scripts (no seed with Emmanuel's data, no fonts) and the finished images
for d in ASO ASO2; do [ -d "$V/$d" ] && rsync -a --prune-empty-dirs "${X[@]}" --exclude='html/' "$V/$d/" "aso/$d/"; done
[ -d "$V/LOWiSPIKE-AppStore-Konzept" ] && rsync -a "$V/LOWiSPIKE-AppStore-Konzept/" aso/LOWiSPIKE-AppStore-Konzept/
# MiroFish: our patch to upstream 666ghj/MiroFish, the run script + seed of the private VM run, local voice tooling list
if [ -d "$V/MIROFISH/MiroFish/.git" ]; then
  git -C "$V/MIROFISH/MiroFish" diff > mirofish/mirofish-upstream.patch
  git -C "$V/MIROFISH/MiroFish" log -1 --format='upstream commit %H (%cd)' > mirofish/UPSTREAM.txt
  for f in run.py requirement.txt seed/lowispike-app-walkthrough.md; do
    [ -f "$V/MIROFISH/private/run1/$f" ] && mkdir -p "mirofish/run1/$(dirname "$f")" && cp -p "$V/MIROFISH/private/run1/$f" "mirofish/run1/$f"
  done
  [ -f "$V/MIROFISH/video/asr.py" ] && cp -p "$V/MIROFISH/video/asr.py" mirofish/
  ls "$V/MIROFISH/video/voices" 2>/dev/null | grep '\.onnx$' > mirofish/piper-voices.txt
fi
git add -A .
PAT='AIza[0-9A-Za-z_-]{30,}|sbp_[0-9a-f]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|gh[opsu]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|BEGIN [A-Z ]*PRIVATE KEY|service_role"?[:=] *"?eyJ|sk-[A-Za-z0-9_-]{20,}|z_[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}|refresh_token"?: *"[A-Za-z0-9_-]{8,}|"rt": *"[a-z0-9]{8,}'
if git diff --cached -U0 | grep '^+' | grep -E -q "$PAT"; then
  echo 'STOP: a key/token pattern is staged; nothing committed. Matches:'; git diff --cached -U0 | grep '^+' | grep -E -o "$PAT" | cut -c1-12 | sort -u
  git reset -q; exit 2
fi
if ! git diff --cached --quiet; then
  git commit -qm "harness sync: $NOTE [skip ci]" && git push -q origin HEAD:agent-harness && echo "agent-harness pushed $(git rev-parse --short HEAD)"
else echo 'agent-harness: nothing new'; fi
[ $WIP = 1 ] && bash "$H/probes/snapshot-wip.sh" | grep -v -P '\tskip\t' 
exit 0
