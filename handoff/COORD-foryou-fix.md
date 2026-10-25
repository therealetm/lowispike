# COORD: For You keeps losing posts, fix (task ed90eefb, Sun 25 Oct 2026)

Branch: foryou-fix-20261025, worktree /home/sprite/wt-foryou-fix (from origin/main 940420df).

Files I touch:
- foryou-core.js, foryou.js, foryou.css
- index.html: TRIBE / For You module only (feed load, filters, composer doPost, My posts / listSheet)
- new tests/foryou-fix*.test.cjs, tools/foryou-fix/*
- possibly a supabase/proposals/foryou_fix_20261025.sql (posts visibility for Emmanuel's real account)

Not touching: community-galaxy.js, galaxy-*.js, community-energy.js, community-chat.js / community-chat.css / chat scroll files (tasks 5b1193fa, 35b35dff), lis-push*, tutorial*, shop files.

## Status
- Cause found (read-only, his real account eman / therealetm@gmail.com, 12 posts in the table): old posts carry no pub mark on his phone -> counted as held whenever not connected; his 10:56 TikTok never sent (no mark, retry only fail/pend); Community opens on Room, iOS reloads the PWA; My posts unreachable; bot list race let crowd posts bury his.
- Fix committed on foryou-fix-20261025: auto-send (LowiForYou.toPublish), own posts always visible, lowi.fycache.v1 last real feed, foryou-stay.js (back to For You within 30 min, after iOS reload), My posts pill top right, fyBotsLater. Also touched community-tab-order.js openFirst (3 lines) and sw.js STATIC list.
- Releasing quietly (scripts/release.sh --quiet).

## Takeover by task c1f3e588 (Sun 25 Oct, 14:10 UTC)
- ed90eefb's release never landed (live was 20261025-150124 = Studio lock). Rebased onto origin/main 817abcb4; only conflict was the index.html version-stamp block (kept main's stamps, added foryou-stay.js). Tests 3316/3316. Releasing with scripts/release.sh --quiet under the lock.

## Replies
- 14:09 UTC: released quietly as 20261025-150850 (1dd5d815), CI "Release check and tests" green (run 40200924790), live matched. main since moved on to 20261025-151340 (Deep analyze) on top, fix included.
- Live probe (tools/foryou-fix/probe.cjs, stand-in server, real snapshot): chromium+webkit at 390x844 and 820x1180: 14/14 of his posts shown, My posts 14 top right with no overlap, new post on top, back to For You after leaving and after reload at the same post, offline 14/14 and 0 sample posts, 0 bot slides, no page errors. The held 10:56 (09:56 CET) TikTok was sent with created_at 2026-10-25T08:56:39Z.
- Server read-only (tools/foryou-fix/server-check.cjs as a marked test account, cleaned up): eman still has 12 posts; tmvnlfx69jobzd and tmv1gtapv00jql not there yet -> his phone has not opened the new build. Recheck scheduled for this evening.
