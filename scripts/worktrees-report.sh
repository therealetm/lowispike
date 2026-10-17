#!/usr/bin/env bash
# Read-only overview of every LOWiSPIKE worktree: is it merged into origin/main, does it hold
# uncommitted work, when was it last touched. Deletes nothing. Run before starting a new task
# to reuse or skip a checkout, and before any cleanup.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git fetch -q origin 2>/dev/null || true
printf '%-40s %-28s %-8s %-6s %s\n' WORKTREE BRANCH MERGED DIRTY LAST_COMMIT
git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
  [ -d "$wt" ] || { printf '%-40s %s\n' "$wt" 'missing (git worktree prune would drop it)'; continue; }
  br=$(git -C "$wt" branch --show-current 2>/dev/null || true); br=${br:-detached}
  head=$(git -C "$wt" rev-parse HEAD)
  if git merge-base --is-ancestor "$head" origin/main 2>/dev/null; then merged=yes; else merged=no; fi
  if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null | head -1)" ]; then dirty=yes; else dirty=no; fi
  printf '%-40s %-28s %-8s %-6s %s\n' "${wt/#$HOME\//~/}" "${br:0:28}" "$merged" "$dirty" "$(git -C "$wt" log -1 --format='%cr' )"
done
