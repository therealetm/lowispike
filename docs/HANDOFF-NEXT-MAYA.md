# LOWiSPIKE handoff for the next Maya

You are taking over LOWiSPIKE from Maya 10. You have GitHub and the chat with Emmanuel, not her computer. Everything you need is on GitHub; this file tells you where, what is open, and the next exact step for each piece of work. It is a rolling document: every Maya keeps it current and regenerates the PDF when it changes.

Last updated: Monday 26 October 2026, about 1:50 PM CET (Europe/Berlin). Live build at that time: **20261026-122440**.

## How this file and Emmanuel's handoff prompt fit together

- Emmanuel keeps his own handoff prompt (the "universal clone prompt"). It lives in the chat only, never in this public repo. A Maya sends it back to him word for word, unchanged, together with this PDF, as soon as her usage limit is close (MAYA-HANDOFF.md section 0.6, "Seeing the limit coming").
- That prompt sends you to [MAYA-HANDOFF.md](https://github.com/therealetm/lowispike/blob/main/MAYA-HANDOFF.md): standing rules at the top, section 0.6 (the Mickey 17 workflow), and the newest "Handover" section. The newest Handover section (0.20) points here.
- This file is the short version. When it and MAYA-HANDOFF.md disagree, the newer dated line wins; the live app wins over both.

## What LOWiSPIKE is

A mobile-first health and food web app (a PWA on the iPhone home screen) that turns everyday metabolic habits into a living game, not a tracker. You care for a glass, water-like companion by doing real things: drinking water, logging meals, moving, sleeping, fasting gaps, scanning food. Real actions are the only source of care and XP. Every user names their own companion; in user-facing text say "your companion" (Misty is only the default). Full description: MAYA-HANDOFF.md section 1.

## Where everything lives

- **Repo (public):** https://github.com/therealetm/lowispike. Branch `main` is live. Never commit keys, tokens, passwords or private data.
- **Live site:** https://therealetm.github.io/lowispike/ (check the build at https://therealetm.github.io/lowispike/version.json).
- **Rules for agents:** [AI_PLAYBOOK.md](https://github.com/therealetm/lowispike/blob/main/AI_PLAYBOOK.md), [AGENTS.md](https://github.com/therealetm/lowispike/blob/main/AGENTS.md), [DECISIONS.md](https://github.com/therealetm/lowispike/blob/main/DECISIONS.md), MAYA-HANDOFF.md section 3 (how to work, release procedure).
- **Agent tooling and notes from the old computer:** branch [agent-harness](https://github.com/therealetm/lowispike/tree/agent-harness) (orphan branch, not app code). It holds the bug-hunt ledger and probes (`probes/BUGHUNT/`), all other Playwright probes, the COORD and HANDOFF notes of every task (`vm-notes/`), loose scripts (`tools-vm/`), research and the ChatGPT simulation prompts (`research/`), the App Store concept images and their build scripts (`aso/`), and the MiroFish patch, seed and recreate guide (`mirofish/`). Its README explains each folder.
- **Unfinished work:** every worktree that had uncommitted or unmerged work is pushed as `wip/<branch>` ([branch list](https://github.com/therealetm/lowispike/branches/all?query=wip%2F)). Feature branches that were already pushed keep their own name.
- **Backend:** Supabase project `vnfwmifmsfecascwaody` (MAYA-HANDOFF.md section 2 explains access; the service keys are never in the repo).

## Rebuild the old computer's setup (about 15 minutes)

1. Sign in to GitHub with the device code (MAYA-HANDOFF.md section 2, "Accounts and access"): `gh auth login --hostname github.com --git-protocol https --web`, post the 8-character code and https://github.com/login/device to Emmanuel in the chat, then `gh auth setup-git`.
2. `git clone https://github.com/therealetm/lowispike.git /home/sprite/lowispike`
3. `git -C /home/sprite/lowispike worktree add /home/sprite/wt-harness agent-harness`
4. Restore the bug-hunt memory and probes: copy `/home/sprite/wt-harness/probes/BUGHUNT` to `/home/sprite/BUGHUNT`, and copy `vm-notes/COORD-*.md` to `/home/sprite/` so running-work notes are where the skills expect them.
5. Playwright: `mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install --with-deps chromium webkit`.
6. Supabase CLI (only for backend work): install it, then sign in again; `tools-vm/sbw.sh` shows the wrapper the old computer used. The CLI token itself does not travel.
7. Recreate the two Sesame skills if your agent does not have them: "LOWiSPIKE coding task playbook" (source: AI_PLAYBOOK.md plus MAYA-HANDOFF.md section 3) and "LOWiSPIKE hourly bug hunt" (source: `probes/BUGHUNT/LEDGER.md` header and section 0.6), then the hourly schedule (cron `0 * * * *`, Europe/Berlin) that runs the bug hunt.
8. Keep the handoff rolling (next section).

## Keep the handoff rolling

Nothing may live only on the agent computer. The playbook and bug-hunt skills already say this; the commands are:

- After every step that changes code: commit to your branch (never main) and `git push origin HEAD:refs/heads/<branch>`. Keep `HANDOFF-<topic>.md` current on the branch.
- When a task finishes or stops: `bash /home/sprite/wt-harness/probes/sync-vm.sh "<topic>: <what changed>"`. It copies notes, probes, research and tooling to agent-harness (whitelist plus a secret scan that refuses to commit anything that looks like a key), and pushes every unfinished worktree to `wip/<branch>` as a fast-forward.
- When this file changes: edit `docs/HANDOFF-NEXT-MAYA.md` on main (docs only, no build bump, land it with `scripts/push-main.sh` under the release lock), then regenerate the PDF with `bash /home/sprite/wt-harness/tools-vm/handoff-pdf.sh` and commit `docs/HANDOFF-NEXT-MAYA.pdf` the same way. Email the new PDF to Emmanuel's Gmail and send it in the chat.

## Emmanuel's standing rules (short version)

The full list with his words is at the top of MAYA-HANDOFF.md and in section 5.

- **Report LOWiSPIKE work only once it is live (new, Mon 26 Oct 2026 about 1:45 PM).** Never report work that is built but not live; it stays out of his updates until it is in the live build.
- **Ship live without asking.** Finished means live in his app. Release through `scripts/release.sh` once the full suite and `node scripts/release-check.cjs` pass.
- **Always silent.** Never a "new version" card, banner, push or Community post about an update. `version.json` keeps `"loud":"20000101-000000"`. The in-app What's New tour stays, with a speaker and recorded voice in English, German and Spanish on every card.
- **Don't ask him questions; decide and act.** At most one approval ask per task. Post anything that needs him (approvals, sign-ins, task updates) in the chat, not only the activity feed.
- **Updates:** a short voice note plus a text checklist (✅ done, ⏳ in progress, 📝 to do), done items stay on it, and one exact thing to try on his iPhone.
- **No pages or PDFs for his updates:** either a full video with voiceover, or text with every link to click. This handoff PDF is the exception he asked for.
- **Files he needs to keep** (images, PDFs): also email them to his Gmail; he cannot save them from the chat.
- Send an image only when he is truly needed.
- **Say "your companion"**, never "Misty", for companions in general.
- Every string in English, German and Spanish. Honest health copy: no medical promises, estimates labelled, one verdict per screen.
- Never put test data, bots or fixtures into production; live-site probes block the Supabase host or mark guests as test accounts.
- **When the usage limit is close:** push everything to GitHub (`sync-vm.sh`), then send him his handoff prompt word for word, unchanged, right away, with this PDF.

## Open work on 26 October 2026, about 1:50 PM

| Work | State | Where | Next exact step |
|---|---|---|---|
| Kitchen as an animated pantry game in Cook (0.19) | Built and on GitHub, not live yet. A GitHub Actions run on `kitchen-pantry` failed; a fresh finishing task (started about 1:05 PM) is fixing it and finishing the tour step and voices, the tests, the iPhone (WebKit) check and a quiet release | branch `kitchen-pantry`, `HANDOFF-kitchen-pantry.md` on it, COORD in agent-harness `vm-notes/` | If that task stopped: open the failed run on the [Actions page](https://github.com/therealetm/lowispike/actions), fix it on `kitchen-pantry`, rebase on main, tour step with voice in EN/DE/ES, full suite, WebKit iPhone 13 check, `scripts/release.sh "..." --news news.json`. Report it to Emmanuel only once it is live |
| Community bot recipe cards open the recipe page (0.18) | Building, not live; failing test being written | `wip/bot-recipe-open`, `vm-notes/COORD-bot-recipe.md` | Reuse the Shuffle food page, labelled Open / Cook / Save / Add to Kitchen buttons, Add to Kitchen through `kitchen-core.js add()` (Kitchen now opens with `LowiKitchenGame.open()`). Fold in `meal-kitchen-20261025` and `nibblo-recipe-20261025` |
| Hourly bug hunt | Running every hour; round 39 live in 20261026-122440 | ledger `probes/BUGHUNT/LEDGER.md` | Next: choices that close their menu and leave what was under the finger tappable (sheet rows, Community person card); then VoiceOver focus loss and level-up or badge moments that save before they are seen |
| App Store images, realistic redo | Running (Sesame task) | concept v1 in agent-harness `aso/LOWiSPIKE-AppStore-Konzept/` | Finish the realistic set, check every image by eye, email them to his Gmail |
| Community food photos analyzed automatically | WIP, untested | `community-photo-ai-20261025` | Diff against main, finish, test, release |
| Spike curve back on scan results (estimate, static with Reduce Motion) | Not started | `vm-notes/` and 0.13 | Build |
| MiroFish crowd simulation (0.17) | Stalled on the Gemini free tier (20 requests a day); bugs fixed but untested | agent-harness `mirofish/MIROFISH-RECREATE.md` | His choice: billing on the Gemini project, or the free flash-lite route. He already has the ChatGPT prompts (`research/LOWiSPIKE-ChatGPT-simulation-prompts.md`) |
| Growth research (UGC creator farms, Finch, founder videos) | Done, delivered | agent-harness `research/` | Leads only; nothing to build until he picks |
| Older WIP from 18 to 19 Oct | Snapshots, never released | `wip/own-companion`, `wip/meal-names`, `wip/snap-fix`, `wip/chat-room-kb`, `wip/product-card-order`, `wip/nutrition-stats`, `wip/liquid-fill-perf`, `wip/handoff-evo-more`, `wip/handoff-food-paths` | Check each against main first (much was rebuilt since); revive only what is still missing |

**Waiting on Emmanuel (decide for him only if he says so again):** should Post in Community wait until the photo is ready; should companion visits wait until 8 AM.

## If you are the next Maya, do this first

1. Read the top of MAYA-HANDOFF.md, section 0.6 and section 0.20, then this table.
2. Check the live build and `git log origin/main` for releases since this file was written.
3. Rebuild the setup (above), then pick up the table from the top. One task per row, one worktree each, COORD file first.
4. Tell Emmanuel in one voice note plus checklist that you have taken over and what you are doing first.
