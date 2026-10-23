#!/usr/bin/env bash
# The only way queue workers release. One pipeline at a time across every agent on this computer:
# exclusive non-blocking flock on /tmp/lowispike-release-pipeline.lock for the WHOLE pipeline
# (release.sh + wait-ci + verify-live --compare), so release jobs never pile up waiting.
# release.sh keeps its own inner lock (/tmp/lowispike-release.lock) for agents that call it directly.
#
#   queue/release-pipeline.sh /path/to/worktree "Summary users read" /path/to/whats-new.json
# Exit: 0 live and verified, 75 another release is running (try a later run), else the failing step's code.
set -uo pipefail
WT="${1:?worktree}"; SUMMARY="${2:?summary}"; NEWS="$(realpath "${3:?news json}")"
if [ -f /home/sprite/lowispike/queue/HOLD ] && [ "${LOWI_HOLD_OVERRIDE:-}" != "$(head -1 /home/sprite/lowispike/queue/HOLD)" ]; then
  echo "BUSY: release hold active: $(cat /home/sprite/lowispike/queue/HOLD)"; exit 75
fi
exec 8>/tmp/lowispike-release-pipeline.lock
if ! flock -n 8; then echo "BUSY: another release pipeline holds the lock"; exit 75; fi
if pgrep -af 'scripts/release.sh|push-main.sh' | grep -v -e pgrep -e release-pipeline >/dev/null; then
  echo "BUSY: a release.sh started outside the queue is running:"; pgrep -af 'scripts/release.sh|push-main.sh' | grep -v -e pgrep -e release-pipeline; exit 75
fi
python3 - "$NEWS" <<'PY' || { echo "BLOCKER: news json needs text.en, text.de, text.es"; exit 2; }
import json,sys; t=json.load(open(sys.argv[1]))['text']; assert all(t.get(k) for k in ('en','de','es'))
PY
echo "pipeline lock held $(date -Is) by pid $$ for $WT" | tee /tmp/lowispike-release-pipeline.owner
cd "$WT" || exit 2
scripts/release.sh "$SUMMARY" --news "$NEWS"; rc=$?
[ $rc -eq 0 ] || { echo "BLOCKER: release.sh exit $rc"; exit $rc; }
SHA=$(git rev-parse HEAD)
node scripts/wait-ci.cjs "$SHA" --timeout 1200; rc=$?
[ $rc -eq 0 ] || { echo "BLOCKER: wait-ci exit $rc on $SHA"; exit $rc; }
node scripts/verify-live.cjs --compare --at-least --timeout 900; rc=$?
[ $rc -eq 0 ] || { echo "BLOCKER: verify-live exit $rc"; exit $rc; }
BUILD=$(python3 -c "import json;print(json.load(open('version.json'))['build'])")
echo "LIVE build $BUILD commit $SHA"
