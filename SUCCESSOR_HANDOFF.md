# LOWiSPIKE successor handoff

Snapshot written 18 Oct 2026, about 01:25 CEST (Europe/Berlin), against `origin/main` 7b7e18c, live build
20261018-011214; refreshed at 01:29 CEST after build 20261018-012739 (commit 45141bc) landed. Everything marked
"snapshot" below was true at that moment and will go stale. Re-check it before you act on it (see "Refresh
procedure").

This file carries project knowledge, decisions and open work so that a new assistant, a new chat session or a
human developer can pick up where the last one stopped. It does not carry an assistant's memory, personality or
conversation history, and a successor will not automatically have the same tools, sign-ins or access. Check what
you can actually do before you promise anything (see "Access you need").

## The tutorial stays current (rule since 19 Oct 2026, Emmanuel)

Settings > Tutorial replays a guided tour where the user's own companion walks them through every main feature (`tutorial.js`). Its content lives ONLY in `tutorial-steps.js`. Every release keeps it current:
- `news.json` carries `"tutorial": "<step id>"` (the step that explains the change; update its text in EN/DE/ES when the feature changed, add a new step for a new feature) or `"tutorial": {"none": "why no step is needed"}`. `scripts/bump-build.cjs` refuses the release without it, and `scripts/release-check.cjs` fails a published What's New that lacks it.
- A new Home ring control (`home-orbit-v2.js` ORDER) or Settings row (`home-settings-sleep-v2.js` pageGroups / MORE) needs a step in `tutorial-steps.js` (its `covers`) or a `NO_TUTORIAL` reason. `tests/tutorial-steps.test.cjs` fails otherwise.
- Bump `VERSION` in `tutorial-steps.js` when you change steps. Never make the tour open panels or sit over setup; it hides while anything else is up. Details: `TUTORIAL.md`.

## 1. Boot sequence (do this first, in order)

1. `git fetch origin && git log --oneline -5 origin/main`. Work from a fresh worktree on `origin/main`, never from
   an old checkout: `git worktree add -b <branch> ../wt-<name> origin/main`.
2. Read the live build: `curl -s https://therealetm.github.io/lowispike/version.json` (expect `{"build":"..."}`).
   Compare it with the newest `Release <build>:` commit on `origin/main`. If they differ, a release is in flight or
   the deploy failed: look at GitHub Actions before you do anything else.
3. Check CI on main: `curl -s "https://api.github.com/repos/therealetm/lowispike/actions/runs?branch=main&per_page=3"`
   (public, no token needed). The job that matters is **Release check and tests**.
4. Read, in this order: this file, `AGENTS.md` (rules, release workflow, release lessons), the newest entries at the
   bottom of `DECISIONS.md`, `TESTING.md`, `RELEASE.md`. Read `CONTEXT.md` and `SCREEN_MAP.md` for background, but
   note their herb-era sections are history (see section 5).
5. Find out who else is working. Inside the Sesame agent environment: `list_tasks` and every `/home/sprite/COORD-*.md`
   file. Outside it: open GitHub branches (`git branch -r`), open pull requests and issues. Never edit a file another
   live task owns; claim yours in a COORD file (or a GitHub issue) first.
6. Ask the owner only what you cannot find out yourself, and check section 9 for questions already waiting on him.

### Immediate next steps (snapshot, re-check before starting)

1. **Cook > "What can I buy here?" crash.** The owner reported it; no cause is confirmed yet. A task was
   investigating (section 3). Reproduce it in an isolated browser (section 7), find the cause, fix it, release.
2. **Finish and release the open branches** in section 3: the observer-loop follow-up (`game-perf-resume`), the
   Explore camera size fix, the grocery photo quick view, and the isolated quality audit.
3. **Test-account cleanup plan.** Write the exact list of test profiles to delete, get the owner's confirmation of
   which names are real people, and let him delete them in the Supabase dashboard. Agents have no admin access and
   must not delete accounts themselves.
4. **Release readiness review** (security, privacy, health claims, accessibility, store rules), applicability-based
   and from primary sources. Nothing here has been certified or implemented yet (section 10).

Never tell the owner the app is finished or bug-free. Report what was verified, how, and what was not.

## 2. Truth hierarchy and refresh procedure

When sources disagree, trust them in this order:

1. **The live site** (`version.json`, the served files) and **GitHub** (`origin/main`, Actions runs, the ruleset).
2. **The code and tests on `origin/main`.** Grep before assuming a feature exists or is gone.
3. **`DECISIONS.md`, newest entry first.** Later entries override earlier ones; many say "supersedes".
4. `AGENTS.md`, `TESTING.md`, `RELEASE.md`, `ONBOARDING.md`, `SCREEN_MAP.md`.
5. This file's snapshot sections, then task reports and chat summaries. A task report saying "live" is a claim until
   you see the build on the site.

Keep these words apart when you report: **saved** (file written), **committed** (local commit), **pushed** (on a
GitHub branch), **CI passed** (Release check and tests green on that exact commit), **deployed** (live
`version.json` shows the build and the served files match the repo). Only the last one means the owner can see it.
A test browser at iPhone size is not the owner's iPhone.

Refresh this file when the task ledger, open decisions or release process change: re-run the boot sequence, update
the snapshot sections and the timestamp at the top, and land it docs-only (no build id) through the normal release
flow.

## 3. Task ledger (snapshot 18 Oct 01:25 CEST, refreshed 01:29)

Task IDs, worktree paths under `/home/sprite` and the `COORD-*.md` files only exist inside the Sesame agent VM. A
successor elsewhere should use the branch names (pushed ones are on GitHub) and treat each row as an open issue.
"Running" does not mean "unreleased": two of these already shipped part of their work.

| Task (Sesame id prefix) | State at snapshot | Branch / worktree | Owns | Next action |
|---|---|---|---|---|
| Community/Cook loop fix and soak (`cc6cad4b`) | Running | `game-perf` and the follow-up `game-perf-resume`, both released | follow-up touched `index.html`, `misty-pad.js`, `nav-moves.js`, `world-home.js`, `tests/game-perf-observer-loops.test.cjs` | Both parts are on main: f93d0d7 (build 20261018-005411) and 45141bc (build 20261018-012739, "Calmer Home"). Check its final report for the WebKit soak result before calling performance done. |
| Explore camera / Misty size (`2d2c1408`) | Running | `fix/explore-camera` at 7b7e18c, local only (`wt-explorecam`), untracked `tools/explore-probe.cjs` | Misty size lines in `misty-flight.js`, `tests/misty-in-size.test.cjs`, `tools/explore-probe.cjs` | Nothing shipped yet. Fix so Misty is never stuck tiny inside a world (see section 6). |
| Grocery photo quick view (`b3479d1f`) | Running | `grocery-quickview` from 4329372 (behind main), local (`wt-quickview`), uncommitted `data/shop/*.json` changes | `store-picks.js`, `store-picks.css`, `store-picks-core.js`, `data/shop/*.json`, `tools/shop-data/*`, quick-view tests | Not shipped. Commit, rebase on main, browser-test, release. Must coordinate with the Cook crash task. |
| Quality audit (`4497d8e6`) | Running | `quality-audit` 9179b43, pushed, CI green on the branch | `tools/audit/`, new `tests/audit-*` | Tooling only so far (isolated nav-audit harness). Hunt for similar faulty patterns app-wide; fix confirmed defects, never delete code blindly. |
| Cook > What can I buy crash (`40df082e`) | Running, no reply in its COORD file yet | none found at snapshot | must agree ownership of `store-picks*` with the quick-view task | Reproduce in isolation, find the cause. No confirmed cause. |
| Successor handoff (`ad3ea1aa`, this file) | Running | `docs/successor-handoff` | this file, small doc pointers in `AGENTS.md`, `CONTEXT.md`, `README.md` | Docs only. |

Recently completed:

- **GitHub test and release safeguards** (`b98e4217`). The Pages deploy only runs after CI passes on main, then
  checks the live site. A ruleset "main: tests must pass" requires the exact commit to have passed **Release check
  and tests**; it also blocks force pushes and deleting main, with no bypass (the publishing deploy key included). A
  direct untested push was refused with "Required status check 'Release check and tests' is expected". The force
  block was confirmed in settings, not tried.
- **Care board duplicates** (`29c228f1`). Commit 7b7e18c, build 20261018-011214. The board shows one row per name
  (like Community) and your own name only for you. Verified at the snapshot: live `version.json` is
  20261018-011214, `origin/main` is 7b7e18c, CI on main run 39078172623 succeeded.

## 4. Product vision

LOWiSPIKE turns everyday metabolic health habits into a living game. The owner (Emmanuel, "E-man" in
`DECISIONS.md`) builds it as a web app and iOS game (PWA on GitHub Pages, Supabase backend) and tests it on his own
iPhone.

- **The companion mirrors your habits.** Each person brings a glass, water-like bubble creature to life; its name
  comes from the star sign, and Misty is the owner's (and the fallback for existing users). Meals, water, Moves and
  scans make her stronger; spiky meals earn nothing, and nothing ever goes negative. Daily small improvement, not
  punishment.
- **Worlds, not menus.** Home is Misty's bubble inside a body world of cell worlds; zoomed out is the spirit world, a
  galaxy of everyone's bubbles joined by light threads that carry her like ocean currents. Past the hand-made
  galaxy, space is generated procedurally so the app stays small. Her level gates how far timed adventures go;
  autopilot is never gated.
- **Seamless and organic.** No flat blue screens, no fades that hide the world, no invisible walls. Leaving a world
  goes straight from inside to outside. She looks where she flies and reacts physically (bumps, dizziness).
- **A readable companion.** She must stay visible and legible on a phone: not stuck tiny, and she should come
  towards the camera as well as dive away into the distance.
- **One consistent look.** The Move-style UI: blue liquid glass, round bubble controls that bloom from what you
  tapped. The flat spirit-world picture is inspiration only, never a wallpaper (`DECISIONS.md` 16 Oct).
- **Health starts in the grocery shop.** Scanning and photographing products at the shop, a community-mapped hunt
  for good products and food combos, a shopping rhythm the person types in. Later ideas: real-time feedback through
  AR/VR glasses.

## 5. Current product vocabulary (corrects older docs)

`CONTEXT.md`, `SCREEN_MAP.md`, `TESTING.md` and parts of `AGENTS.md` were written when the companion was a potted
"herb" (13 to 14 Oct). Read them with this map:

- The companion is the glass bubble creature (Misty), not a plant. Code still says `herb` in many places
  (`herb-*.js`, `LowiHerb`, `herbXP`); grep before assuming any herb file is dead.
- The six growth stages still use the XP thresholds 0, 100, 300, 700, 1500, 3000, now shown as Level 1 to 6 with
  the names in `world-home-core.js` `STAGES` (Spark to Legend). The herb stage names are legacy.
- Tabs (verified in `index.html` `#tabbar`): Today, Community, Scan (centre orb), Cook, Move. Profile opens from the
  header avatar. Home is world-first (`SCREEN_MAP.md` "Spirit surfaces" and "World-first Home").
- The XP leaderboard and the VIP, courses and mentoring rewards are gone. The **Care board** (Move > Care board)
  ranks sunbeams from meals, water, Moves and scans, up to 12 a day, week or month. **Misty's growth** lists only
  rewards that exist.
- Water is counted in cups: one tap is one cup, goal 6 a day ("0/6 cups").
- Community keeps three tagged demo bots: Mateo, Jonas and Samir. They show levels 1, 4 and 6 on the board and in
  profiles, but still 18 and 43 in the Community galaxy (known inconsistency).

## 6. What shipped and how sure we are

"Commit" means the release commit is on `origin/main` (checked at the snapshot). "Reported" means a task said it
tested it, mostly in a test browser at iPhone size. None of these is confirmed on the owner's iPhone unless he said so.

| Build | What | Evidence |
|---|---|---|
| 20261017-175536 | Call Misty back from exploring with one tap | commit 41edc62; reported |
| 20261017-181610 | Level-gated timed adventure on the autopilot engine; autopilot never gated | commit 43f75f4; reported |
| 20261017-184614 | "What can I buy here?" store picks | commit 9710a8e; reported. Owner now reports a crash in this flow (section 3). |
| 20261017-222644 | Community keeps three bots | commit ded59ff; reported |
| 20261017-223156 | Daily Quest Skip (no XP, undo, resets daily) | commit 3322e4f; reported |
| 20261017-224720 | Shopping hunt (shop check-ins, glimmers, combos) | commit 0f293da; reported. Sharing finds needs `supabase/proposals/grocery_hunt_20261017.sql` run by the owner. |
| 20261017-224944 | Water in cups, goal 6 | commit 56e048a; reported |
| 20261017-225833 | Onboarding refresh, typed shopping rhythm, "How you play" | commit 08ca7af; reported |
| 20261017-230350 | Care board and Misty's growth | commit f61d278; reported. Owner then hit repeated crashes reading it. |
| 20261018-000407 | Crash fix: Move card care line stopped rewriting itself every frame | commit 4b9c293 |
| 20261018-002755 | Update check reads 64 bytes instead of 185 KB a minute | commit a9e87b3 |
| 20261018-005411 | Crash/heat fix: observer write loop after Community/Cook | commit f93d0d7; CI and Pages green; live files matched. One WebKit soak budget still fails (below). |
| 20261018-011214 | Care board shows you once | commit 7b7e18c; live and CI verified at the snapshot |
| 20261018-012739 | Calmer Home: more labels and ticks write only when they change (WebKit visible-again budget) | commit 45141bc; seen live in `version.json` at the refresh |

Open evidence gaps worth knowing:

- **Performance.** The WebKit soak (390x844, software renderer at about 5 fps in the VM) still breaks the
  "visible-again" budget: 29 to 36 non-renderer frame callbacks a second against a budget of about 21 for that frame
  rate. That budget is relative to a slow software renderer, so passing or failing it is not proof either way about a
  physical iPhone. Do not loosen the budget to make it pass. The owner reported crashes, lag and heat; the loop fixes
  above target that, but he has not confirmed they are gone.
- **Misty tiny in Explore.** The owner clarified the world looks normal and only Misty is too small. Occasional
  distant dives are welcome, but she must also come close to the camera. Reopening the app restored her size once;
  that is not proof a fix shipped. No fix is on main at the snapshot.
- **Care board.** One row per name hides other humans who share a name; that is a known risk, not a settled design.
  Humans with zero sunbeams are hidden, which is why the owner's two friends (Joseph Castellar and Q) did not appear
  after the release.

## 7. Safe testing (learned the hard way)

On 17 to 18 Oct a test browser running against the live site created real profiles named "eman" and "QA" in the
production Supabase, with made-up activity, and they showed up on the owner's Care board. Rules since then:

- Every browser or Playwright test against the live site or a local copy must block the production Supabase host
  and every non-GET or non-local request, and must not persist anything (no sign-up, no profile, no message, no
  localStorage you then sync). Use local mocked fixtures. `tools/audit/` on the `quality-audit` branch has an
  isolated harness that does this.
- Never invent a human identity for a test, never reuse the owner's or a friend's name.
- Never delete accounts or rows. Cleanup is planned, confirmed by the owner, and done by him in the dashboard.
- `tests/*-live.cjs` scripts talk to the real backend and are not part of the offline suite. Run them only with
  dedicated test accounts and explicit permission (each one says what it needs at the top).
- "Tested" means you say where: unit tests, a test browser at a named size, or the owner's device.

## 8. Release workflow (current)

Details live in `AGENTS.md` "Release workflow" and `RELEASE.md`. The short version:

1. Work on a branch from fresh `origin/main`. Runtime changes need a new build id and a What's New entry in English,
   German and Spanish; docs-only changes need neither.
2. `node --test tests/*.test.cjs` locally. The test count may only go up (`scripts/test-floor.cjs`); never weaken or
   delete a test to get green.
3. Take the shared lock `/tmp/lowispike-release.lock` (on the agent VM), then `scripts/release.sh` for builds or
   `scripts/push-main.sh` for docs. Both push the exact commit to a `ci/` branch, wait for **Release check and
   tests** to pass there, then fast-forward main with a plain push. Never force, never bypass the ruleset.
4. CI on main runs the tests again, deploys GitHub Pages, then checks the live site serves that build.
5. Confirm the live `version.json` and the changed files yourself, then report with the evidence words in section 2.

The gate adds about a minute per release. It stops untested commits reaching the site; it does not make the app
stable on its own.

## 9. Waiting on the owner (snapshot)

- Should friends with zero sunbeams appear at the bottom of the Care board instead of being hidden?
- Which of the names Emmanuel, Emmy, Eman and Manuuii are him or his friends? Then he gets an exact delete list.
  Likely test sign-ups: the two "eman" test profiles, QA, Emma, Gatey, Guesty and Test. Nothing has been deleted.
- Running `supabase/proposals/grocery_hunt_20261017.sql` so Shopping hunt finds can be shared.
- The three demo bots still show levels 18 and 43 in the Community galaxy.

## 10. Requested but not done: professional workflow research

The owner asked for research from real people (competent, recent YouTube creators filtered by channel history and
views, blogs, studio talks) into how professional app and game developers work, especially iOS game performance,
and then to apply it to the whole workflow (GitHub, AI agents, releases), with readiness for Germany, the EU and
worldwide. He also asked to download relevant skills.

Status at the snapshot:

- Done: `AI_PLAYBOOK.md` (sourced AI-agent practices), the CI gate in section 8, and the observer-loop fixes.
- Not done: a game performance standard document; verified studio procedures; a readiness review. The only
  installed skill recorded in `skills-lock.json` is `apple-design`; no evidence of further skill downloads.
- An earlier long summary contained company-specific workflow claims (for example about OpenAI, Anthropic or
  HoYoverse) and broad legal statements that were never verified. Do not treat them as fact.
- Readiness work must be applicability-based, from primary sources: which privacy, health-claim, accessibility,
  consumer and App Store rules actually apply to this app and its users, and what evidence would show compliance.
  Nothing has been certified and no compliance claim should be made.

## 11. Health data and grocery caveats

- Store picks rate products from chain-level catalogs: Open Food Facts products that shoppers tagged for a German
  chain (Lidl, EDEKA, REWE, Aldi and others, about 5,500 for Lidl) and the Salling Group online range for Danish
  stores. That is not one branch's stock or shelf. There is no Føtex in Germany; the owner lives in Flensburg.
- The rating (`store-picks-core.js`) estimates glycemic load per serving from label carbs and an estimated GI:
  passes at GL <= 5 and sugar <= 6 g per serving, "Best" at GL <= 2. Those thresholds are our own choice, not a
  medical standard. It is not a measured GI, not a blood-sugar measurement and not advice on what anyone may eat.
- Meal ratings follow the LOWiSPIKE traffic-light rules, not a measurement of anyone's blood sugar.
- Product photo quick view is being built (section 3) and is not live.

## 12. Working with the owner

- Plain, short words. He often speaks by voice and mixes English and German.
- Updates as a checklist that keeps finished items: done, in progress, to do.
- **No voice recordings.** His latest explicit instruction overrides the earlier voice-note preference.
- He tests on his iPhone himself. Do not repeat testing he is already doing and do not ask questions you can answer
  from the repo, the site or the data.
- Prefers small, frequent, visible releases over big ones, and wants to see the change live quickly.
- Run independent jobs in parallel, each in its own worktree with declared file ownership.
- Sign-in should stay simple (Google or Apple, minimal passwords).

## 13. Access you need

- **Code:** read access to `github.com/therealetm/lowispike` (public) and push rights for branches. On the agent VM a
  deploy key is configured outside the repo; the `gh` CLI was not signed in at the snapshot. Changing the ruleset or
  Pages settings needs the owner's GitHub account, and GitHub may ask him to confirm access.
- **Backend:** the repo only contains the public (publishable) Supabase key. No agent has had admin access: reading
  public tables works like any visitor; deleting users, changing policies or running SQL proposals needs the owner.
  Never commit a service key, token or password.
- **Device:** only the owner can confirm behaviour on a physical iPhone.
- VM paths (`/home/sprite/...`, `/tmp/...`), Sesame task ids and COORD files do not travel. Outside that
  environment, use GitHub branches and issues to record ownership and open work instead.
