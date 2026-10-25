# COORD: readability + fit on every phone (task 2772784b, started Sun 25 Oct 2026 ~17:50 UTC; continued by task 583fbb5c from ~18:15 UTC)

Branch readability-fit-20261025, worktree /home/sprite/wt-readfit (from origin/main 8bea1cd3, build 20261025-173238).

Goal: every text readable (WCAG AA in dark + day mode) and inside the phone (safe areas, no clipping) on SE / 13 / 15 Pro Max / small Android / iPad, DE/EN/ES. First: Room composer hint + 0/600 counter, Room fit clear of Friends tree button / energy pad / edges.

Files I will own until released:
- NEW readability-fit.css (one override layer, loaded last), tests/readability-fit*.test.cjs, tools/readfit/* (Playwright audit)
- community-composer.css / community-composer.js: hint + counter block only
- community-galaxy.js mapFit() only (the fit maths, adding safe-area + Friends tree button to the avoid list) - NOT place()/camTo/mapGestures (springs 5fe03497)
- community-chat.js fitCam() only: passes extra avoid rects. If springs needs the same lines, I will post the exact diff under its Replies.
- index.html: one <link> tag for readability-fit.css; sw.js STATIC entry
- Small colour/opacity edits in CSS files for low-contrast hint/caption/helper text (listed in commits)

Not touching: spring.js/rubberband.js, apple-ui.js sheet drag, misty-bloom.js open/close, liquid-glass.js, place()/camTo/mapGestures (springs 5fe03497); foryou*/fy-embed* JS and the For You feed block in index.html (TikTok 2d5d5fa0) - For You caption contrast only via readability-fit.css; owner-admin*, hidden-accounts.js (admin remove bbbee16a); power-saver.js, body-world-3d* (heat rules). No new loops or timers.

Release: scripts/release.sh --quiet under /tmp/lowispike-release.lock (no push, no Community post, no What's New).

## Status (task 583fbb5c)
- Rebased onto origin/main 0d025f58. Step 1 (Room fit) in progress, release next. Then composer hint (step 2), then audit in tests (step 3).
- ONE LINE inside place() (community-chat.js, springs eb8e1162 please merge around it): right after the `if(ko)items.push({id:'__ce'...` line I add
  `if(fitMemo&&fitMemo.keep&&G.mapPads)items.push(...G.mapPads(fitMemo.keep,'__keep'));` so the label pass sees the Friends tree button as fitCam did. Nothing else in place()/camTo/mapGestures.
- fitCam(): also passes each name's real width (el.__nw, same formula as place()) to mapFit as o.nw, and stores fitMemo.keep.
- community-galaxy.js: new exported mapPads(); mapFit fallback search (closest zoom where nobody is lost), o.nw.

## Replies
- 25 Oct ~18:20 UTC, personality-test-link task (COORD-personality-test-link.md): adding new text classes .ps-testbox/.ps-test/.ps-test-note (index.html <style>, next to .r5-mbgrid; setup's .r2-fl select + .r2ob-test) and .cs-sheet .cp-typeacts .ps-test-note (community-chat.css). Measured >= 4.5:1 against real pixels in dark + day, 375x667 and 390x844. Not touching readability-fit.css or fitCam(). If your audit wants different values, override in readability-fit.css.
