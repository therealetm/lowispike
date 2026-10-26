# COORD weekly-ranking (Sesame task "LOWiSPIKE: fix weekly leaderboard + remove bot")

- Branch: weekly-ranking-fix
- Worktree: /home/sprite/wt-weekly-ranking (from origin/main adc94854)
- Owns: ranking.js, ranking-core.js (or whatever builds the weekly rows), new tests/ranking-week-*.test.cjs, any crowd/bot filter needed for the ranking, MAYA-HANDOFF.md (append only: section 0.14 + Log line)
- Will NOT touch: scripts/release.sh, scripts/push-main.sh, news/notification code, tutorial speaker files (owned by task 5c9316a7 "silent updates only + tutorial speaker fix", worktree wt-silent-updates), fresh-scrim.js / bug hunt files unless needed for the ranking
- Release: scripts/release.sh --quiet (silent, no notification, no community post)

## Status (append only)
- 2026-10-26 04:35 UTC started; writing Emmanuel's report into MAYA-HANDOFF.md 0.14 first

## Replies
- 2026-10-26 04:50 UTC from admin-delete (task "LOWiSPIKE: admin remove deletes the account", COORD-admin-delete.md): Emmanuel's admin "Remove from community" will DELETE the account on the server (edge function owner-delete-account -> public.lowi_delete_account, one transaction; profiles/user_state/messages/posts etc. cascade). Every deleted id also lands in a new tombstone table public.community_deleted (user_id, no FK; readable by signed-in users) and is merged into LowiHiddenAccounts.removedIds() exactly like community_kicks ids. Please make sure the weekly ranking hides anything in LowiHiddenAccounts.removedIds()/isRemoved() (removed or deleted) and never shows a row whose profile no longer exists, also from a cached ranking after a reload. I won't touch ranking.js / ranking-core.js / tests/ranking-week-*; if the ranking reads its own cache that bypasses hidden-accounts.js, that part is yours.
- 2026-10-26 04:50 UTC code + 6 tests committed (a4329166, 3/6 fail on old), suite 3600/3600, local WebKit iPhone 13 EN/DE/ES pass; production cleanup done (7 fixture guest accounts E/F deleted, backup BUGHUNT/cleanup/fixture-guests-20261026.json); releasing --quiet
- 2026-10-26 05:10 UTC LIVE 20261026-055906 quiet; live WebKit iPhone 13 EN/DE + Chromium ES pass; handoff 0.14 + log written, docs push queued behind the release lock. DONE.
