#!/usr/bin/env bash
# Snapshot every worktree whose work is not on origin/main (unmerged commits or uncommitted files)
# into a [skip ci] commit pushed to origin as wip/<branch>. Never touches the worktree, its index or its branch.
set -uo pipefail
cd /home/sprite/lowispike
git fetch -q origin
OUT=/home/sprite/maya-handoff-work/wip-report.tsv
: > "$OUT"
git worktree list --porcelain | awk '/^worktree /{w=$2} /^branch /{sub("refs/heads/","",$2); print w"\t"$2}' | while IFS=$'\t' read -r wt br; do
  [ "$wt" = /home/sprite/lowispike ] && continue
  [ -d "$wt" ] || continue
  cd "$wt" || continue
  ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
  # patch-equivalent commits already on main (rebased releases) are not unmerged work
  uniq=$(git cherry origin/main HEAD 2>/dev/null | grep -c '^+' || true)
  dirty=$(git status --porcelain --untracked-files=normal | grep -v -E '(^\?\? .*(node_modules|\.png|\.jpg|\.webm|\.zip)$)' | wc -l)
  if [ "$uniq" = 0 ] && [ "$dirty" = 0 ]; then echo -e "$br\tskip\tmerged-clean" >> "$OUT"; cd /home/sprite/lowispike; continue; fi
  export GIT_INDEX_FILE=/tmp/wipidx-$$
  rm -f "$GIT_INDEX_FILE"; git read-tree HEAD
  git add -A . 2>/dev/null
  # drop big binaries and test artefacts
  git diff --cached --name-only HEAD | grep -E '\.(png|jpg|jpeg|webm|mp4|wav|zip|wasm)$|node_modules/|test-results/' | xargs -r git reset -q HEAD -- 2>/dev/null
  tree=$(git write-tree)
  if git diff --cached HEAD | grep -E -q 'AIza[0-9A-Za-z_-]{30,}|sbp_[0-9a-f]{20,}|gh[opsu]_[A-Za-z0-9]{30,}|BEGIN [A-Z ]*PRIVATE KEY|service_role"?[:=] *"?eyJ'; then
    echo -e "$br\tSKIPPED\tsecret-pattern" >> "$OUT"; unset GIT_INDEX_FILE; rm -f /tmp/wipidx-$$; cd /home/sprite/lowispike; continue; fi
  files=$(git diff --cached --name-only HEAD | wc -l)
  unset GIT_INDEX_FILE; rm -f /tmp/wipidx-$$
  prev=$(git rev-parse -q --verify "refs/remotes/origin/wip/$br" || true); git fetch -q origin "+refs/heads/wip/$br:refs/remotes/origin/wip/$br" 2>/dev/null && prev=$(git rev-parse -q --verify "refs/remotes/origin/wip/$br")
  if [ "$uniq" = 0 ] && [ "$(git rev-parse "HEAD^{tree}")" = "$tree" ]; then echo -e "$br\tskip\tonly-binaries-changed" >> "$OUT"; cd /home/sprite/lowispike; continue; fi
  if [ -n "$prev" ] && [ "$(git rev-parse "$prev^{tree}")" = "$tree" ]; then echo -e "$br\tunchanged\tsame as wip/$br" >> "$OUT"; cd /home/sprite/lowispike; continue; fi
  # keep the old snapshot as a second parent so the push stays a fast-forward (no force)
  c=$(git commit-tree "$tree" -p HEAD ${prev:+-p $prev} -m "WIP snapshot of $br for the next agent [skip ci]

Taken $(TZ=Europe/Berlin date '+%Y-%m-%d %H:%M %Z') by the handoff task from $wt: $uniq unmerged commit(s), $files uncommitted file(s) captured.
Not reviewed, not released. See MAYA-HANDOFF.md.")
  if git push -q origin "$c:refs/heads/wip/$br" 2>/tmp/wip-push.err; then
    echo -e "$br\tpushed\tunmerged=$uniq uncommitted=$files\t$(git log -1 --format=%s HEAD | cut -c1-70)" >> "$OUT"
  else echo -e "$br\tPUSHFAIL\t$(head -c 200 /tmp/wip-push.err)" >> "$OUT"; fi
  cd /home/sprite/lowispike
done
cat "$OUT"
