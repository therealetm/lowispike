# AI-coding practices task coordination (task 723888ed, Oct 18 2026 00:05 CEST)

To: workflow task f3427068 (repo/CI/deploy), crash task e971d498, iOS perf research 393df267.
No update_task tool exists in my task, so this file is the coordination channel. Please append replies under "Replies".

## Ownership I propose

- **I (723888ed) own, new files only:** `AI_PLAYBOOK.md` (repo root, human-sourced AI-coding practices for LOWiSPIKE) and
  `.agents/skills/lowispike-change/SKILL.md` (reusable task skill: brief, worktree, verify, handoff). Both on branch
  `ai-playbook` in worktree `/home/sprite/wt-ai-playbook`. Docs only, no runtime files, no build id bump, no deploy.
- **I will NOT touch:** `.github/workflows/*`, `RELEASE.md`, `TESTING.md`, release scripts, `sw.js`, `version.json`,
  `index.html`, any runtime JS/CSS. Those belong to f3427068 (pipeline) and e971d498 (runtime).
- **AGENTS.md:** shared. I only want to add ONE pointer line under "Required startup sequence" to AI_PLAYBOOK.md.
  If f3427068 is also editing AGENTS.md, please add my line in your commit instead and I will skip mine.
- **Merge/publish:** docs-only, no build id. I will hand the branch to f3427068 to land with its workflow commit under
  `/tmp/lowispike-release.lock`, OR push docs-only to main under that same lock with a SHA lease if f3427068 is done.

## Project findings so far (from inspecting /home/sprite)

1. 40 worktrees (`wt-*`) and about 30 one-off release scripts (`*-release.sh/.py`) in /home/sprite, each copy-pasting the
   build-id bump, news JSON and test run. Example of drift: `gh-release.sh` header says "daily-quest-skip" but it
   ships the grocery hunt. A single parameterised release script in the repo would remove that class of error.
2. The only GitHub workflow is `keepalive.yml`. Tests (`node --test tests/*.test.cjs`, ~1,200) run only on the VM
   before push; nothing on GitHub blocks a red commit reaching `main`/Pages.
3. AGENTS.md product rules still describe "the herb" companion and Home/Scan/Cook layout; the app is now Misty in a
   bubble with worlds. Stale instructions mislead every new agent.
4. Shared release lock `/tmp/lowispike-release.lock` + rebase + lease already exist (good); keep it.
5. No performance/regression budget in tests (relevant to crash task; I will only pass sources, not edit).

Sourced recommendations for you will be appended below as I find them.

## Recommendations for f3427068 (sourced, 00:20 CEST)

I read COORD-ci-workflow.md: you own ci.yml, scripts/, RELEASE.md/TESTING.md/AGENTS.md workflow sections. Agreed.
So I will NOT edit AGENTS.md at all. Please fold these into your commit if they fit:

1. **Test count must never drop (cheap, high value).** Release commits already record `tests N/N` in the subject
   (e.g. 4b9c293 "tests 1205/1205"). `scripts/release-check.sh` can parse the last release subject on origin/main and
   fail if the new run passes fewer tests, unless an env var like `ALLOW_TEST_DROP="reason"` is set.
   Source: Kent Beck, "Augmented Coding: Beyond the Vibes" (https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes):
   a key warning sign is the AI "cheating, for example by disabling or deleting tests".
2. **Deterministic gates beat instructions.** CI on push to main running `node --test tests/*.test.cjs` + your
   release-check. Sources: HumanLayer "Writing a good CLAUDE.md" (https://www.humanlayer.dev/blog/writing-a-good-claude-md):
   do not use the instruction file as a linter, use deterministic tools; DataCamp synthesis of incident.io/Trail of Bits
   practice (https://www.datacamp.com/tutorial/claude-code-best-practices): instructions are followed about 70% of the
   time, hooks/checks 100%, add a pre-commit/pre-push hook that blocks when tests fail.
   DORA 2025 (https://dora.dev/research/2025/dora-report/): AI amplifies existing practice; small batches and strong
   version control/rollback are two of its seven AI capabilities.
3. **One parameterised release script instead of ~30 copies.** Evidence: /home/sprite/gh-release.sh header says
   "daily-quest-skip" but ships the grocery hunt; every copy re-implements build-id bump + news + tests.
4. **AGENTS.md (your section):** (a) add a pointer line: "AI-assisted work: read AI_PLAYBOOK.md; repeatable steps live
   in .agents/skills/lowispike-change/SKILL.md". (b) Flag for the user/owner: AGENTS.md and CONTEXT.md never mention
   Misty, bubbles or worlds and still describe "the herb" and Home/Scan/Cook; stale instructions mislead every agent.
   I did not rewrite product rules (product owner decision). (c) AGENTS.md requires reading 7 docs (~1,000 lines incl.
   DECISIONS.md 39 KB) before any work; HumanLayer and agents.md (https://agents.md/) recommend a short root file with
   progressive disclosure ("read X when touching Y").
5. **Worktree hygiene report, not deletion.** 40 `wt-*` worktrees in /home/sprite. A read-only
   `scripts/worktrees-report.sh` listing merged vs unmerged/dirty would help; never auto-delete unmerged work.
   Sources: incident.io worktrees post (https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees),
   Simon Willison (https://simonwillison.net/2025/Oct/5/parallel-coding-agents/).

My files (docs only, no runtime, no build id): `AI_PLAYBOOK.md` and `.agents/skills/lowispike-change/SKILL.md`, branch
`ai-playbook`. I will land them docs-only on main under the release lock with fetch+rebase, never force, unless you
reply that you want to carry them in your commit.

## Replies


## Finding for e971d498 (runtime) and f3427068 (release scripts), 00:35 CEST - NOT edited by me

**version.json has grown to 184,786 bytes** because every release appends its What's New text to `news.text`
(190,997 chars across EN/DE/ES; `build` itself is 15 chars). `index.html` line 9437 fetches it with `cache:"no-store"`
every 60 s while visible (plus visibilitychange/pageshow/focus/online and loadNews at boot, lines 2343, 2575, 9392).
That is roughly 11 MB per hour of foreground use on mobile data and a 185 KB JSON parse each minute, only to compare a
build id. Not proven to cause heat or the crashes; it is waste on every phone. Suggested fix (owner's call): release
script writes only the current release's news into version.json (history to a separate file that is never polled), or
the poller reads a tiny `build.txt`. Verified: Playwright WebKit 27.2, iPhone 13 profile, live site build
20261018-000407 loaded with 0 page errors in 8 s (headless WebKit, not a real iPhone).

## Status 00:45 CEST (723888ed)

- LANDED docs-only on main as 586f68e, on top of f3427068's 9b7efc0, under the release lock, no force, no build id.
  CI and Pages both green on 586f68e. Files: AI_PLAYBOOK.md, .agents/skills/lowispike-change/SKILL.md.
- Saved Sesame skill "LOWiSPIKE coding task playbook" (for the assistant when it starts/delegates LOWiSPIKE tasks).
- Still open for f3427068 (your call): test-count-never-drops check in scripts/release-check.cjs; AGENTS.md pointer
  line to AI_PLAYBOOK.md + the skill; stale "herb" product rules flagged to the owner.
- Still open for e971d498: version.json 185 KB polled every 60 s (see above).
