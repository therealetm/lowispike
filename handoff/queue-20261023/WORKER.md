# LOWiSPIKE queue worker: one small step per run

Coordinator: task 49a3cfeb (sole owner since 22 Oct 2026 17:31 CEST). Queue: /home/sprite/lowispike/queue/queue.json via q.py (atomic flock; max 2 active steps, max 1 release).
Repo handover: read MAYA-HANDOFF.md sections 0, 3 and 5 on latest origin/main before touching code.

## Each run
1. `cd /home/sprite/lowispike/queue && ./q.py list` and check `list_tasks` for running LOWiSPIKE tasks; never duplicate a claimed step.
2. Claim exactly ONE step: `./q.py claim-id <ID> <your-task-name>` for the step your schedule names, else `./q.py claim <your-task-name> --release-ok`. NO_SLOT = two steps already active: stop and schedule your successor 30 minutes later.
3. Work in an isolated worktree `/home/sprite/lowispike/wt-<ID>` from latest origin/main (or the named branch, rebased on main). Never touch other worktrees. Keep the change small. Checkpoint after every meaningful step: `./q.py checkpoint <ID> "what happened" --commit SHA --next "next action"`.
4. Tests: full `node --test` suite plus the step's sims/probes at iPhone SE, 13, 15, Pixel 7, Day and Night, EN/DE/ES where relevant. These are browser simulations, never call them a real phone.
5. Verified work step: push the branch, `./q.py done <ID> "note" --status ready`. Then claim its `-rel` step and release ONLY through `queue/release-pipeline.sh <worktree> "<summary>" <news.json with text.en/de/es>` (it does release.sh, wait-ci, verify-live --compare and refuses when another release runs; exit 75 = busy, unclaim and retry next run). Live only when the pipeline prints LIVE build. Append the confirmed build to MAYA-HANDOFF.md Log on main. `./q.py done <ID>-rel "LIVE build X commit Y" --status live`.
6. Needs Emmanuel (owner-only Supabase/Stripe/account step, missing branch, design decision): `./q.py block <ID> "why"`.
7. Budget nearly spent: `./q.py unclaim <ID> "checkpoint"` so the next run resumes.
8. Successor: if `./q.py claim` would still find runnable steps, create exactly ONE successor with add_schedule (delay_minutes 2, same message as yours, new step id or 'next runnable'). Never more than one successor per run; never recreate cancelled automations.

## Rules
Brand #0A84FF / #5AA9FF / #8FE7FF, no violet or green. Liquid glass sheets, Japanese-convenience layout. Don't redesign Home, don't revive retired branches (oneworld, statbub). Preserve others' work.

## Reaching Emmanuel
Only when something went LIVE: load the writing_documents skill, record ONE short casual voice note (sesame_voice_notes__record_voice_note) saying what changed and to reload, send it, and keep the final message to the voice note alone with no extra text summary. Every time something goes LIVE, also put the updated progress checklist in your final message, marked CHECKLIST, for the main chat to send him as its own text right after the voice note. Build it from `./q.py list` after you mark your step live. Format (bullet journal, spread out, no long sentences): short header line, one line on what just went live, then sections LIVE / IN ARBEIT / OFFEN, each item on its own line as a list item of 2-4 words, ✅ for done, 🔴 for open. No setbacks or blocks in it. Do not report setbacks, failed attempts or blocks to him; record them in the queue checkpoints. A run that released nothing ends with a two-line status of the queue step for the record only.
