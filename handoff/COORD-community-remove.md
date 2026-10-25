# COORD: admin "Remove from community" (task started 25 Oct 2026 10:48 PDT / 18:48 CET)
Status: DONE (task 32f6c6ea). Released in 20261025-195059 (commit e78ce54, CI green, quiet). DB migration live; 17 "Emmanuel" test copies (Leo/1 Aug/Lv5/2000 XP/0 msgs, made 25 Oct 14:05-16:38 UTC by our live test runs) flagged test. Live proof: Chromium 21/21 real taps on build 20261025-202023. Live tools on branch admin-remove-20261025 (tools/community-remove: live-batch.sh LIVE_ONLY=1 RUNS="chromium de", cleanup.sh <outdir>). NOTE: live throwaway accounts are anonymous, so the app keeps its sign-in wall (gate-boot + data-gate-inert) up; check.cjs lifts it before each real tap.

Files I own (new): community-remove-core.js, community-remove.js, community-remove.css,
  supabase/proposals/community_remove_20261025.sql, tools/community-remove/*, tests/community-remove*.
Small shared edits (one line each, will merge on top of origin/main at release):
  - hidden-accounts.js: removed-id set (setRemoved / isRemoved), isHidden() also true for removed people
  - bot-accounts.js: isBot() also true for removed people (galaxy / add-friend paths that only ask isBot)
  - community-chat.js messages(): drops messages from removed people (NOT the Room camera code the springs task owns)
  - index.html script tags, sw.js precache lists
Server: new table public.community_kicks (same shape as the unreleased owner_admin_20261018.sql), public.community_removal_log,
  RPCs community_is_admin / community_remove / community_restore / community_removed_list / community_am_removed,
  restrictive RLS hiding removed people's rows. Uses the existing public.is_app_admin() (app_admins). Does NOT create is_app_owner,
  so the old owner-admin.js Members/Delete card stays dormant.
DB: one batched approved run at the end (migration + profile cleanup + live test admin toggle + test cleanup).
