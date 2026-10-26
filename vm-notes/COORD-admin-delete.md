# COORD admin-delete (Sesame task "LOWiSPIKE: admin remove deletes the account")

- Branch: admin-delete-account
- Worktree: /home/sprite/wt-admin-delete (from origin/main 60822a0a)
- Owns: the admin "Remove from community" path (person card admin button + its handler), a new Supabase migration / edge function for admin account deletion, new tests/admin-delete-*.test.cjs, MAYA-HANDOFF.md (append only: section 0.15 + Log line)
- Will NOT touch: ranking.js / ranking-core.js / tests/ranking-week-* (task 8c688ff2, weekly-ranking), scripts/release.sh, scripts/push-main.sh, news/notification code, tutorial speaker files (task 5c9316a7, wt-silent-updates), bug hunt files
- Release: scripts/release.sh (silent, no notification, no community post)

## Status (append only)
- 2026-10-26 04:38 UTC started; writing Emmanuel's report into MAYA-HANDOFF.md first

## Replies
- 2026-10-26 04:50 UTC handoff 0.15 on main (40b372ba); reply left in COORD-weekly-ranking.md
- 04:59 UTC SQL applied + owner-delete-account deployed; client committed, local checks pass; releasing
