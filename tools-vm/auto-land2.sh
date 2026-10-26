#!/usr/bin/env bash
# Releases the auto tutorial (commit dd28b12) with scripts/release.sh, retrying while other releases land first
# or GitHub Actions is too slow for release.sh's CI wait. Each try starts again from dd28b12 and rebases on origin/main.
cd /home/sprite/wt-tutorial-auto || exit 1
for try in 1 2 3 4; do
  echo "=== try $try $(date -u +%T)"
  git reset -q --hard dd28b12
  scripts/release.sh "New accounts get the tour by themselves once after setup, and it now explains almost every small part in 40 short cards" --news /home/sprite/TUTORIAL-AUTO-news.json > /tmp/auto-release-try$try.log 2>&1
  RC=$?; echo "release.sh exit $RC"; grep -E "^info: build|BLOCKER|landed|live|EXIT" /tmp/auto-release-try$try.log | tail -6
  if [ $RC -eq 0 ]; then echo RELEASED; break; fi
  git push -q origin --delete $(git ls-remote --heads origin 'ci/*' | awk '{print $2}' | sed 's#refs/heads/##' | grep "^ci/$(git log -1 --format=%s | sed -n 's/^Release \([0-9-]*\):.*/\1/p')-") 2>/dev/null
done
B=$(git log -1 --format=%s | sed -n 's/^Release \([0-9-]*\):.*/\1/p'); echo "build $B"
git fetch -q origin; git merge-base --is-ancestor HEAD origin/main && echo LANDED || echo NOT_LANDED
node scripts/verify-live.cjs "$B" --at-least --compare --timeout 1800; echo "VERIFY $?"
echo DONE $(date -u +%T)
