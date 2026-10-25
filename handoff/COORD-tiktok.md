# COORD: TikTok thumbnails + direct open + 'Show the creator some love' (task 2d5d5fa0)

Branch: tiktok-thumbs-20261025, worktree /home/sprite/wt-tiktok
Status: DONE, live in 20261025-193045 (CI green). Edge function tiktok-meta deployed; 11 TikTok posts backfilled into media/tiktok/<videoId>.jpg. Probe: tools/tiktok/probe.cjs

Files I touch:
- NEW supabase/functions/tiktok-meta/index.ts (deployed, verify_jwt off): oEmbed + page fallback, copies cover into media/tiktok/<videoId>.<ext>, writes posts.meta {thumb, vid, title, author, handle}
- NEW tiktok-open.js (LowiTikTok: open in TikTok app from iOS Home Screen, heal thumbnails)
- foryou-core.js: thumbOf ignores expired tiktokcdn links; new NOTE keys loveBtn / loveSub
- index.html TRIBE only: fyOut, slideHTML rail (external creator posts: no like/chat/save/share/Swipe, only ··· stays), fyBg img lazy, open handler, fetchMeta(tiktok), publish keeps stable meta
- fy-embed.css (button + sub line), sw.js STATIC list, new tests/tiktok-*.test.cjs

Not touching: For You scroll / snap physics (springs task), bot posts, Room, Studio.
