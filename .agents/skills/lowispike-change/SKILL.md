---
name: lowispike-change
description: Use for any code or content change to LOWiSPIKE. Covers claiming files, a fresh worktree, test-first fixing, browser proof, review, release under the lock, and a handoff note when work stops early.
---

# Make one LOWiSPIKE change

Read `AGENTS.md` first; it wins if anything here disagrees. The reasons and sources for each step are in
`AI_PLAYBOOK.md`.

## 1. Claim

1. Read every `/home/sprite/COORD-*.md`. If another task owns a file you need, append a request under its "Replies"
   heading and wait or work around it. Never edit a file someone else owns.
2. Write `/home/sprite/COORD-<topic>.md` with your task id, branch, worktree, files you own and files you won't touch.
3. Restate the brief in five lines: goal (one behavior), what the user saw, done-when check, files you may edit, out
   of scope. If any line is empty and the code can't answer it, ask before coding.

## 2. Fresh worktree

```
git -C /home/sprite/lowispike fetch
git -C /home/sprite/lowispike worktree add -b <branch> /home/sprite/wt-<topic> origin/main
```

Never start from another task's worktree or from a dirty checkout.

## 3. Reproduce, then fix

1. Write a test in `tests/` that fails because of the bug, or that describes the new behavior. Run it and see it fail.
2. Change the code. Do not edit that test to make it pass.
3. In any frame or animation loop, compare with the value you last wrote (a variable or `dataset`), never with text
   read back from the page, and write to the page only when that value changes.
4. Run the whole suite: `node --test tests/*.test.cjs`. The pass count must not be lower than in the last release
   subject on `origin/main` (`git log -1 --format=%s origin/main`). If you removed or loosened a test, say why in the
   commit message.

## 4. Prove it in a browser

Climb as high as you can and report the highest rung reached: Node tests, then a Chromium fixture (`tests/*-live.cjs`),
then Playwright WebKit with an iPhone profile:

```js
const { webkit, devices } = require('/tmp/pw/node_modules/playwright');
```

Check at 390x844 with zero page errors. Never say "tested on iPhone" unless a physical phone was used. WebKit on the
VM can't show heat or iOS memory crashes.

## 5. Review before release

Read `git diff origin/main...HEAD` as if someone else wrote it. Check it against the brief: anything outside scope,
deleted or weakened tests, listeners or timers added without cleanup, frame loops that write to the page, docs that
are now wrong. Fix what you find, or cut it to a ticket.

## 6. Release

Follow `RELEASE.md`. Only the task that owns runtime files bumps the build id. Push to `main` only while holding
`/tmp/lowispike-release.lock`, after fetch and rebase, never with force. Then confirm the live `version.json` build
and that live files match the commit.

## 7. Stopping early

If you are past half your budget or about to stop, commit to your branch (not `main`), push the branch, and write
`HANDOFF.md` in the worktree:

```
Branch and last commit:
Done (and how it was checked):
Not done:
Next exact step:
Traps found:
```

Update your COORD file to say the work is handed off and where.

## 8. Tell the user

Short voice note plus a text checklist (done, in progress, to do), keeping done items on the list. Name the build, the
highest proof rung reached, and one exact thing to try on the iPhone.
