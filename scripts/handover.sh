#!/usr/bin/env bash
# Mickey 17 handover helper (MAYA-HANDOFF.md section 0.6, 'Seeing the limit coming').
# Saves everything that only lives on this computer to GitHub, so the next Maya can resume.
#
#   scripts/handover.sh FROM_N TO_N [WORKTREES_DIR] [QUEUE_DIR]
#   e.g. scripts/handover.sh 2 3            (defaults: parent dir of this worktree, and ../queue)
#
# 1. Every sibling wt-* worktree with uncommitted edits or commits not on origin/main is committed
#    as a WIP snapshot and pushed to wip/<its branch> (never to main, never forced).
# 2. The work queue (queue.json, QUEUE.md, q.py, WORKER.md, release-pipeline.sh, HOLD,
#    OWNER-REQUESTS-*.md) is copied into handoff/queue-<date>/ in THIS worktree.
# 3. Prints a table of what it saved, to paste into the new 0.x handover section.
# It does not commit this worktree or touch main: write the section, then scripts/push-main.sh.
set -uo pipefail
FROM=${1:?FROM_N}; TO=${2:?TO_N}
ROOT=$(git rev-parse --show-toplevel)
WT_DIR=${3:-$(dirname "$ROOT")}
Q_DIR=${4:-$WT_DIR/queue}
STAMP=$(TZ=Europe/Berlin date +%Y%m%d-%H%M)
git -C "$ROOT" fetch -q origin main || true
echo '| Worktree | Pushed to | Commit |'
echo '|---|---|---|'
for d in "$WT_DIR"/wt-*/; do
  d=${d%/}; [ "$d" = "$ROOT" ] && continue
  git -C "$d" rev-parse --git-dir >/dev/null 2>&1 || continue
  dirty=$(git -C "$d" status --porcelain | head -1)
  ahead=$(git -C "$d" log --oneline origin/main..HEAD 2>/dev/null | head -1)
  [ -z "$dirty" ] && [ -z "$ahead" ] && continue
  br=$(git -C "$d" rev-parse --abbrev-ref HEAD); [ "$br" = HEAD ] && br=$(basename "$d")
  br=${br#wip/}
  if [ -n "$dirty" ]; then
    git -C "$d" add -A && git -C "$d" commit -qm "WIP snapshot for Maya $TO handover (Maya $FROM, $STAMP): unfinished, unverified"
  fi
  if git -C "$d" push -q origin "HEAD:refs/heads/wip/$br" 2>/dev/null; then
    echo "| $(basename "$d") | wip/$br | $(git -C "$d" rev-parse --short HEAD) |"
  else
    echo "| $(basename "$d") | PUSH FAILED, retry as wip/$br-$STAMP | $(git -C "$d" rev-parse --short HEAD) |"
  fi
done
if [ -d "$Q_DIR" ]; then
  OUT="$ROOT/handoff/queue-${STAMP%%-*}"; mkdir -p "$OUT"
  for f in queue.json QUEUE.md q.py WORKER.md release-pipeline.sh HOLD; do
    [ -f "$Q_DIR/$f" ] && cp "$Q_DIR/$f" "$OUT/"
  done
  cp "$Q_DIR"/OWNER-REQUESTS-*.md "$OUT/" 2>/dev/null || true
  echo; echo "Queue copied to ${OUT#$ROOT/}: $(ls "$OUT" | tr '\n' ' ')"
else
  echo; echo "No queue dir at $Q_DIR (nothing copied)"
fi
echo "Next: write section 0.x + Log line in MAYA-HANDOFF.md, commit, scripts/push-main.sh handover-maya$TO"
