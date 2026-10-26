#!/usr/bin/env bash
# Hold the shared release lock ourselves, rebase (auto-resolving the build-stamp conflict in index.html by re-wiring on
# origin/main's copy), then run scripts/release.sh with a private lock name (we already hold the real one, nothing can land).
set -uo pipefail
cd /home/sprite/wt-mic
exec 9>/tmp/lowispike-release.lock
flock -w 5400 9 || { echo "BLOCKER: lock wait timed out"; exit 7; }
echo "outer lock held $(date -u +%T)"
git fetch -q origin
if ! git rebase -q origin/main; then
  for f in $(git diff --name-only --diff-filter=U); do
    case "$f" in index.html|sw.js) git checkout --ours "$f";; *) echo "BLOCKER: real conflict in $f"; git rebase --abort; exit 3;; esac
  done
  python3 /home/sprite/mic-wire.py && git add index.html sw.js && GIT_EDITOR=true git rebase --continue || { git rebase --abort; echo "BLOCKER: auto-resolve failed"; exit 3; }
fi
git push -q origin HEAD:refs/heads/mic-dictation-6 2>/dev/null || true
LOWISPIKE_RELEASE_LOCK=/tmp/mic-private-release.lock scripts/release.sh "A small mic in text fields: speak instead of typing (food names, searches, Kitchen, shopping list, snacks, captions, chat), with the phone's own free speech recognition" --news /home/sprite/mic-news.json
