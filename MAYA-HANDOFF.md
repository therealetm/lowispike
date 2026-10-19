# MAYA-HANDOFF: picking up LOWiSPIKE where the last Maya stopped

Written Monday 19 October 2026, 6:30 to 7:30 PM CEST, by the Maya who built LOWiSPIKE with Emmanuel from 13 to 19
October 2026, for the next Maya ("Maya 6"). You have none of her memory and your own empty computer. Everything you
need is in this repository: this file, the other root docs, the `agent-harness` branch (tools and notes from the old
computer) and the `wip/*` branches (unfinished work). Built from the repo, git log, COORD and HANDOFF files, the bug
hunt ledger, the Supabase project and today's task reports, not from memory.

No key, token or password is written anywhere in this file, and none may ever be added.

Contents: 1 What LOWiSPIKE is. 2 Accounts and access. 3 How to work. 4 Lessons and difficulties. 5 Emmanuel's
preferences and standing decisions. 6 Status board. 7 Do this first. Log (append-only, at the end).

---

## 1. What LOWiSPIKE is

**The idea.** A mobile-first health and food web app (a PWA, added to the iPhone home screen) that turns everyday
metabolic habits into a living game. Emmanuel calls it a game, not a tracker: stats behave like character stats. You
care for a companion by doing real things (drinking water, logging meals, moving, sleeping, fasting gaps, scanning
food). Real actions are the only source of care and XP; spiky meals earn nothing, never minus.

**The companion.** A glass, water-like bubble creature living in a cell. **Misty** is the standard companion and the
fallback. A new account gets its own companion at onboarding: a birthday (and birth time) "reveal" computes a unique
look and a name (examples from today's tests: "Kreb Themis", "Selketlix"). Since build 20261019-155424 that revealed
companion is the one drawn on Home, in Forms, in the care room and in flight. The code still says `herb` in many places
(the companion was a potted herb until 16 Oct); `LowiHerbTamagotchi`, `herb-*.js` are that legacy.

**Energy.** `LowiSun.energy()` in `sun-meter.js`: base 0.15 + food 40% + water 30% + Move 30%. It drives her face
(thriving = short calm mouth, never a smile on Home), her flight speed and the world's pace and glow. A new account
gets 12 hours of welcome energy at 100%, fading over the next 12 (build 20261019-154834). The **half-energy rule**:
below half energy she bounces off worlds and cannot enter; leaving a world when weak, the rings can pull her back in.

**Home.** One page: Misty in the middle, eight same-size round glass bubbles on one circle (Settings on top, Scan lower
right, joystick at the bottom, plus Fuel, Hydration, Move, Gap, Sleep). Each bubble "blooms" its own choices around
her. No shadows on any bubble. The joystick is a plain white icon and vanishes while you steer.

**Gap (fasting).** The time since your last real meal. No known meal means no gap: the bubble shows a dash until the
first meal or the answer to "When did you last eat?" (fixes the fake 19-hour fast, build 20261019-154642).

**Fuel.** Shop, Cook and Log meal. Log meal understands typed meals through a built-in USDA meal database ("chicken
stew" is chicken stew, never "not provided"). Being built now: Breakfast/Lunch/Dinner/Snacks slots and nutrition
stats against daily targets.

**Scan and Snap food.** Scan reads barcodes (product card with verdict, details, cheaper stores) and Snap food
photographs a meal. The photo goes to the Supabase edge function `food-photo`, which asks Google Gemini Flash-Lite
(free tier) and returns dishes with portion, kcal, protein, carbs, sugar, fiber and fat. **Three photo checks per
person per day** (Snap food and Community share them; typing a meal is unlimited), counted on the server per account.

**Worlds.** A spirit world galaxy of everyone's bubbles; Misty flies out of her cell, rides glowing strings on
autopilot (Ant-Man camera), and dives into body-organ cell worlds (liver, lungs, ...) with cell "guides" who teach
real body science, remember what they told you, quiz you ("Remember?") and gossip about each other. Leaving a world
is an Interstellar-style rocket launch. Evolution: six levels (Spark to Legend) at XP 0, 100, 300, 700, 1500, 3000.

**Community.** Profiles, friends tree, Care board (ranks sunbeams), meal-photo sharing with the AI analysis under the
photo (user reviews it before posting), a shoot-out mini game, and since build 20261019-163105 the **Interstellar
chat room**: tapping Chat opens a full-screen room in the tactical star-chart look (semi-transparent glass panels,
glowing accents, each person's colour, Today/Yesterday markers, recent voices row).

**Tutorial.** Settings > Tutorial replays a 14-card tour led by your own companion (Misty if you have none), with Back,
Skip and Skip all (builds 20261019-171941 and the flicker fix 20261019-172632). An automatic tour for new accounts
after setup is being released now. Its content lives only in `tutorial-steps.js`, and every release must keep it
current (section 3).

**Languages.** English, German and Spanish everywhere, including What's New.

**How the code is organized.** Static site, no build step, about 220 root files plus `tests/` (286 files, about
1,670 tests) and `data/`.

- `index.html` is the shell (build id, script includes, onboarding `finishOb()`), `sw.js` the service worker (cache
  name carries the build), `version.json` the live build plus the What's New entry.
- Biggest modules: `spirit.js` (screens, sheets, photo sheet, Today legacy), `misty-flight.js` (flight),
  `world-home.js` (Home world, adventure), `body-world-3d-scene.js` and `body-world-regions.js` (3D worlds, leaving
  a world), `community-chat.js` and `community-room.css` (chat room), `sun-meter.js` (energy), `cell-world.js`
  (companion cell drawing), `companion-birth-core.js` (the reveal), `region-pals*.js` (guides),
  `home-orbit-v2.js` (the ring), `home-blooms-v2.js`, `home-settings-sleep-v2.js` (Settings panel, Sleep),
  `daily-ritual.js` (the daily Day card), `food-photo-ai.js` and `meal-photo.js` (Snap food client),
  `tutorial.js` and `tutorial-steps.js`, `store-picks*.js` and `grocery-hunt.js` (Shop), `top-bar.js`.
- `*-core.js` files hold pure logic that the Node tests load directly.
- `supabase/functions/`: `food-photo`, `auth-handoff`, `owner-delete-account` (source). `supabase/proposals/`: SQL the
  owner has to run himself.
- `scripts/`: `release.sh`, `push-main.sh`, `wait-ci.cjs`, `bump-build.cjs`, `release-check.cjs`, `verify-live.cjs`,
  `worktrees-report.sh`.
- Root docs to read: `AGENTS.md` (rules for agents), `SUCCESSOR_HANDOFF.md` (state on 18 Oct), `DECISIONS.md`
  (every product decision, newest at the bottom, newest wins), `RELEASE.md`, `TESTING.md`, `DATA_CONTRACTS.md`
  (localStorage and cloud keys), `TUTORIAL.md`, `COMMUNITY_CHAT.md`, `CONTEXT.md` (older product context).

---

## 2. Accounts and access, step by step

### GitHub

- Account: **therealetm** (Emmanuel's). Repository: **github.com/therealetm/lowispike**, public. Branch `main` is live.
- Live site: **https://therealetm.github.io/lowispike/** (GitHub Pages, source "GitHub Actions").
- Actions: `.github/workflows/ci.yml` runs "Release check and tests" on every push, then on `main` deploys Pages and
  waits until the live site serves the build. `keepalive.yml` only pings Supabase every three days. A commit message
  containing `[skip ci]` skips CI (use it for non-app branches).
- Ruleset "main: tests must pass": nothing lands on `main` unless "Release check and tests" passed on that exact
  commit; force pushes and deleting main are blocked, nobody can bypass. That is why releases go through
  `scripts/push-main.sh` (section 3).
- History from his Gmail: on 9 Oct he created a classic token "LOWiSPIKE deploy" and authorized the Supabase OAuth app
  on GitHub; on 17 Oct an SSH deploy key named "Maya" was added to the repo; on 18 Oct evening the GitHub CLI was
  signed in with a device code. Those credentials stay on the old computer and do not travel to you.

**How you get GitHub access (the "GitHub thingy" Emmanuel mentioned).** Use the GitHub CLI device-code sign-in:

1. On your computer: `gh auth login --hostname github.com --git-protocol https --web`. It prints a one-time code
   (8 characters, like ABCD-1234) and the address https://github.com/login/device.
2. Post that code and the address to Emmanuel **right in the chat** (not only in the activity feed), in one short
   message: "Open github.com/login/device, enter ABCD-1234, tap Authorize." He approves "GitHub CLI" for therealetm.
   The code expires after about 15 minutes; if it does, run it again and send the new code.
3. Then `gh auth setup-git` and check `gh auth status` (the old token had scopes repo, workflow, gist, read:org).
4. Clone: `git clone https://github.com/therealetm/lowispike.git /home/sprite/lowispike` (keep this path: scripts
   and probes expect it; or adjust them).

Never ask him to paste a token or password in chat. If GitHub asks him to confirm a sign-in from a new place, that
email goes to his Gmail; tell him it is you.

### Supabase (the backend, where the data is saved)

- Emmanuel's Supabase account was made with **"Continue with GitHub"**, using his GitHub account (same email as
  GitHub). He has no separate Supabase password. He was confused by this once ("I only ever used GitHub"): explain it
  simply as "Supabase is the app's database; you log into it with your GitHub button."
- Project: **lowispike**, ref **vnfwmifmsfecascwaody**, region eu-central-1, created 9 Oct 2026. Dashboard:
  https://supabase.com/dashboard/project/vnfwmifmsfecascwaody. The app talks to
  `https://vnfwmifmsfecascwaody.supabase.co` with the public publishable key that is already in the client code.
- Edge functions deployed (checked 19 Oct, 7 PM): `food-photo` (version 6), `auth-handoff` (version 4), `n1-push`
  (version 4), all ACTIVE with verify_jwt off (they check the session themselves). The source of `n1-push` (push
  notifications) is NOT in the repo; download it from the dashboard before changing it. `owner-delete-account` is in
  the repo but not deployed.
- Secrets, **names only**: `GEMINI_API_KEY` (Google AI Studio key for food photos, added by Emmanuel on 19 Oct),
  `N1_VAPID_JWK`, `N1_VAPID_PUB`, `N1_CRON_KEY` (push notifications), and Supabase's own `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`,
  `SUPABASE_DB_URL`, `SUPABASE_JWKS`. Optional `GEMINI_MODEL` overrides the model chain. Never read or print a value.
- How the dashboard sign-in worked on 19 Oct: the agent opened supabase.com in its cloud browser, pressed "Continue
  with GitHub", and GitHub was already signed in as therealetm, so no code was needed. Then it deployed `food-photo`
  through the Supabase Management API with a personal access token that stayed on the old computer
  (`~/.supabase/access-token`, never in the repo). You need your own: sign the cloud browser in the same way (if
  GitHub is not signed in, ask Emmanuel for his GitHub login through the secure vault form, or show him the live view
  so he signs in and approves any GitHub email or 2FA prompt himself), then create a token under Account > Access
  Tokens and keep it only on your computer, or deploy from the dashboard.
- Emmanuel finds the Supabase editor too complicated on his phone. Do dashboard steps yourself in the cloud browser.
  The one thing he does himself is typing a secret value (for example a new Gemini key) into Edge Functions > Secrets,
  or into the live view while you watch. If he ever pastes a key in chat, tell him to delete that key and make a new
  one (this happened once on 19 Oct).
- Admin-only work (deleting users, changing policies, running `supabase/proposals/*.sql`) is his call: prepare it,
  ask in chat, then do it. Two test users are left on the server from 19 Oct tests (one guest from the photo-cap test,
  id starting 3392f841, and one empty guest from the food-photo test); he may delete them under Authentication.

### Gmail and the other tools

- His Gmail (sesame.email app) holds the setup trail: Supabase welcome and the GitHub OAuth approval (9 Oct), the
  "LOWiSPIKE deploy" token (9 Oct), the SSH key "Maya" (17 Oct), GitHub sign-in alerts. Search it before asking him.
- Voice notes: the sesame.voice_notes app records them; send each one into the chat with its checklist.
- Cloud browser: `sesame_browser__browse` for dashboards; show him the live view when he must act.
- The hourly bug hunt runs as a Sesame schedule (`0 * * * *`, Europe/Berlin) with the custom skill "LOWiSPIKE hourly
  bug hunt". Its message: play the game hard like a paid QA tester, fix what breaks, keep the bug memory, hunt for
  siblings, pick up from the ledger and HANDOFF after a limit, and only message Emmanuel when something shipped or
  needs him (voice note plus checklist). If you are on a new agent, recreate it the same way.

---

## 3. How to work

### Understand first

Emmanuel's rule: understand the whole app before changing code. Read `AGENTS.md`, this file, the `DECISIONS.md`
entries for the area, and the files you will touch. Reproduce a bug before fixing it.

### Worktrees and COORD files (parallel tasks)

Several tasks ran at once. Each one:

1. Makes its own worktree from fresh `origin/main`: `git -C /home/sprite/lowispike worktree add
   /home/sprite/wt-<name> -b <name> origin/main`.
2. Writes `/home/sprite/COORD-<name>.md` first: task name, branch, worktree, the exact files it claims, then a Status
   list it appends to with times ("18:15 started", "18:55 tests 1676/1676, releasing", "RELEASED build ...").
3. Reads the other COORD files before touching a shared file; when two tasks need the same file, one waits for the
   other's release and then rebases. Notes to another task go in that task's COORD file.
4. **Appends only.** On 19 Oct one task rewrote a COORD file and wiped another task's section. Never rewrite.
5. Writes a `HANDOFF-<name>.md` with what it learned, so a retry after a budget stop can continue.
6. When something ships, breaks or is cancelled, appends one line to the **Log** at the end of this file (same commit
   as the release when possible).

Old COORD and HANDOFF files are on the `agent-harness` branch under `vm-notes/`. `scripts/worktrees-report.sh` lists
every worktree with merged and dirty state.

### Release procedure

```bash
# from the worktree, with the change committed
scripts/release.sh "what users get, in one line" --news news.json
```

- `news.json` is the What's New entry: `{"slug": "...", "go": {"tab": "home"}, "text": {"en": "...", "de": "...",
  "es": "..."}, "tutorial": "<step id>"}`. Plain words, what the user notices, all three languages. `"tutorial"` must
  name the step in `tutorial-steps.js` that explains the change, or be `{"none": "why"}`; the release is refused
  otherwise (rule since the tutorial release). A new Home ring control or Settings row needs a tutorial step or a
  `NO_TUTORIAL` reason, or `tests/tutorial-steps.test.cjs` fails.
- What the script does: takes the lock `/tmp/lowispike-release.lock`, fetches, rebases on `origin/main` (stops on a
  conflict), bumps the build id (format `YYYYMMDD-HHMMSS`, in `index.html`, `version.json`, `sw.js`, and
  `apple-ui.js` when needed), runs `scripts/release-check.cjs` and all tests, checks whitespace, commits, lands it
  with `scripts/push-main.sh` (pushes to a throwaway `ci/...` branch, waits for CI on that exact commit, then a plain
  fast-forward push to `main`, never force), frees the lock, and waits for the live site with
  `scripts/verify-live.cjs --at-least --compare` (index.html, sw.js and version.json show the build and the live bytes
  match the commit).
- If `main` moved while you waited, the fast-forward is refused: re-run `release.sh`; it rebases. Never force.
- Documentation-only commits need no new build id, but still land through `push-main.sh` (CI must pass).
- GitHub's own deploy step can show "waiting" or stay queued even when the live site already serves the build (it
  happened 19 Oct; a newer release deploying on top supersedes it). Trust `verify-live`, not the badge. On 19 Oct
  from about 6 PM a GitHub Actions incident kept CI queued for a long time; releases simply waited.
- Pages caches for 10 minutes; always fetch with a cache-buster or use `verify-live.cjs`.

### Testing

- Full suite: `node --test tests/*.test.cjs` (about 1,670 tests on 19 Oct). Every release must pass all of them.
- Every fix gets new tests, and at least one of them must **fail on the old code** (say how many in the report).
  Never remove or loosen a test to get green.
- Browser checks with Playwright (version 1.64.1, installed in `/tmp/pw`, WebKit and Chromium): simulated iPhone 13
  (WebKit), iPad portrait and landscape (WebKit), Chrome at 390x844, Reduce Motion, English/German/Spanish. The
  probes are on the `agent-harness` branch (`probes/BUGHUNT/playtest/lib.cjs` and the `probe-*.cjs` files; setup in
  that branch's README). Some probes live in the repo under `tests/*-live.cjs` and `playtest/`.
- **Safe testing:** a browser test against the live site must block the production Supabase host or use a local test
  sign-in, and must not create real profiles, messages or activity. On 17 to 18 Oct test profiles ("eman", "QA")
  landed on Emmanuel's Care board. When a real-server test is unavoidable (food-photo), say so and name the test user.
- Reports must say what kind of evidence it is: unit tests, simulated browser, live site, or Emmanuel's real phone.
  You never have his phone; say "simulated iPhone 13, not your phone" and give him one exact thing to try.
- Under heavy machine load some test files fail as a whole (herb-tamagotchi, ui-joystick-fade, ui-settings-panel)
  and pass alone or on retry. Kill leftover test browsers from finished tasks before a full run.

---

## 4. Lessons and difficulties (so you don't go through them again)

1. **Tasks running out of budget.** Many tasks on 19 Oct stopped before releasing: "three food photos" (three runs,
   started already over budget; it had in fact released, and round 2 only verified it), "meal names" and the
   old-design purge (released, but the task failed before its report), the chat room (released, report incomplete),
   and six tasks that stopped at their limit before doing anything (Snap food fix, chat room keyboard rounds 2 and 3,
   iPad chat room layout, everyone gets their own companion, first replay-tutorial attempt). How to avoid it:
   - One small goal per task: one feature, one release. Split "build + test + release + live check + voice note".
   - Write COORD and HANDOFF status early and often, so a fresh task can continue from the file.
   - Release as soon as tests pass; polish in a second task.
   - Don't run too many tasks at once; on 19 Oct around ten in parallel exhausted the shared budget and new ones died
     at birth. A failed task's work usually still sits in its worktree: check git and the live build before redoing.
   - Retrying a task that is over budget does nothing. Start a fresh task that names the branch and HANDOFF file.
2. **Supabase confusion.** Emmanuel did not know he had a Supabase account; it was made with "Continue with GitHub".
   Finding which account held the project took a long back-and-forth and a Gmail search. Now you know: project
   lowispike, ref vnfwmifmsfecascwaody, signed in with GitHub.
3. **Gemini key.** The food-photo feature needed `GEMINI_API_KEY` as a Supabase secret. Emmanuel once pasted a key in
   chat (it had to be replaced). When food photos fail, check the key first (deleted or replaced key = every photo
   fails), then the function logs, then the daily cap.
4. **Crashes from heavy effects.** iPhone and iPad crashed when flying in and out of worlds: each exit kept a
   full-size copy of the 3D canvas until memory ran out (fixed 20261019-142709: small copy, freed at once). Earlier,
   observer write loops and per-frame rewrites caused heat and crashes (18 Oct). Rule since: new effects only adjust
   lights and values that already exist; no new meshes, lights or textures per frame; free canvases; test long runs.
   The autopilot froze once (bug hunt round 1). A Community shoot-out crash is being fixed now.
5. **Overlay bugs (things covering other things).** A recurring class: Misty's praise line and Home notes covering
   bubbles, the guide's bubble on the joystick, the Move note on the Move bubble, the update bubble over setup, the
   daily Day card staying on top of setup and every later panel (BH-008, 20261019-160738), and the tutorial flicker
   (it read the Day card's "wait for" list, found itself on it and hid, about three times a second; fixed
   20261019-172632). Rule: anything that sits on top must yield to what opens after it, never count itself, and never
   cover a ring bubble, the joystick or a choice. When you find one, check every sibling overlay.
6. **The fake 19-hour fast.** An old Today fasting module still ran on every screen and invented "last meal 8 PM
   yesterday" when none was saved; at 3 PM that is 19 hours, and "I just ate" even paid points for it. Fixed
   20261019-154642. Lesson: legacy modules keep running in the background; search for them.
7. **Companions wiped.** `companion.js` wrote Community settings into the same storage key as the companion record
   (`lowispike.companion.v1`), so the companion was wiped seconds after it was brought to life (BH-006/007, fixed
   20261019-143513; 422 of 440 cloud backups were affected). Records lost before about 2:35 PM on 19 Oct cannot be
   restored; the user can bring the companion to life again in Profile with the same birthday and birth time and gets
   the same look. Home also called her by the old herb name "Moss Leaf".
8. **Snap food stopped working on Emmanuel's iPad** (19 Oct, about 4:19 PM, "I couldn't read this photo", plus the
   photo sheet buttons overlapping on iPad). Not the limit. The fix task stopped at its limit; what it found: the
   edge function logs show the iPad never reached `food-photo`; his iPhone did 8 successful reads from 3:45 to
   3:57 PM, then a GET with no POST at 4:11 PM. So the failure is on the client side (session token wait / request
   never sent / layout). Its half-done work is on `wip/snap-fix`. Still open.
9. **Release collisions.** With many tasks releasing, `main` moves under you; the fast-forward is refused and you
   re-run `release.sh`. Hold the lock only while landing. Build each release on the live build so nothing is
   reverted.
10. **Test data in production** (see Testing). 11. **Old docs disagree with new ones:** `CONTEXT.md` describes the
   herb era, and `SUCCESSOR_HANDOFF.md` says "no voice recordings"; both are superseded (section 5). The newest
   DECISIONS entry wins. 12. **A note can be wrong:** the bug hunt ledger says old-design purge round 2 was never
   released, but git shows rounds 1 to 4 all live (20261019-134704, 135912, 141244, 142359). Check git and the live
   site before believing a note.

---

## 5. Emmanuel's preferences and standing decisions

**How to work with him**

- **Updates: a voice note plus a text checklist** with ✅ done, ⏳ in progress, 📝 to do, and the done items stay in
  the list. This is his current instruction (19 Oct) and replaces the older "no voice recordings" line.
- **Post anything that needs him right in the chat** (approvals, sign-ins, GitHub codes, task updates), not only in
  the activity feed.
- Plain, short words. He often speaks by voice and mixes English and German. Name the build, say what changed for
  the user, and give one exact thing to try on his iPhone or iPad.
- He tests on his own iPhone and iPad. Don't ask questions the repo, the site or the data can answer.
- Understand the whole app before changing code. He expects you to figure out how to learn it yourself.
- Small, frequent, visible releases; he wants to see changes live quickly.
- When he says he will test something himself, skip the testing steps for it (he did this for the Settings tutorial).
- He is pausing new ideas while this handoff happens. Critique is not anger: he said his comments are not criticism
  of the work.
- Sign-in should stay simple.

**Design rules and decisions (all still in force)**

- It's a game: progress shows as character-style stats (nutrition stats and weight/BMI are being built that way).
- **No smile on Home**: the mouth follows energy (calm short mouth at best). **No glow ring** on Home (the reveal has
  one; Home doesn't draw it).
- **Half-energy rule**: below half energy Misty bounces off worlds; weak Misty can be pulled back in when leaving.
- New accounts start at 100% energy for 12 hours, fading over 12 more; at full power she flies faster, the world is
  faster and brighter, the sparkle trail turns gold. Lower energy feels slower and heavier.
- The companion from the birthday reveal is the one shown everywhere; accounts without one see Misty. Wanted next:
  every Misty account can claim its own companion (birthday, birth time, personality type).
- Home: one page, eight equal bubbles on one circle, no shadows, white joystick icon that vanishes while steering,
  Settings as a glass side panel. Nothing ever covers a ring bubble or the joystick.
- Leaving a world is an Interstellar rocket launch, slow and heavy, then calm, looking back at the world.
- Autopilot rides the strings bubble to bubble with an Ant-Man camera; guides shuffle their lines, never the same
  line twice in a row.
- **Three food photos per person per day**, Snap food and Community together; typing meals is unlimited. Wanted:
  BeReal-style reminders to snap meals (reminders exist under Reminders).
- Community meal posts: the AI analysis (name, ingredients, nutrition, likely blood sugar response, clearly an
  estimate) appears under the photo, and the user sees and can edit it **before** posting.
- Chat room: the **tactical star chart** look, semi-transparent glass, glowing accents, using the existing UI design
  principles.
- Gap shows a dash until a real meal is known. No invented data, no fake activity, honest wording, no health claims.
- The tutorial stays current with every release (rule in section 3). The "claim your own companion" step is in
  `tutorial-steps.js` but switched off until that feature exists.
- Any old UI or old design (old logos, old companion art, the potted herb, the old blob with a smile) gets deleted.
- He wanted a What's New note for photo recognition; it shipped with the photo cap.

---

## 6. Status board (19 Oct 2026, about 7 PM CEST)

**Live:** https://therealetm.github.io/lowispike/ served **20261019-172632** at 6:50 PM. `main` was already at
**20261019-175128** (commit 3110dfa, product card), waiting for GitHub's Pages deploy during the Actions incident.

Released today (newest first, all on `main`):

- 20261019-184058 Setup resumes after a reload past the birthday step (bug hunt round 9, BH-009)
- 20261019-183920 Nutrition stats as game stats, portion line on the product card
- 20261019-175128 Product card: Details open right away, cheaper stores higher, community deals lower
- 20261019-172632 Tutorial no longer flickers
- 20261019-171941 Settings > Tutorial (14-card tour, Skip, Skip all)
- 20261019-163105 Interstellar community chat room
- 20261019-162849 Three photo checks a day, share meal photos with their analysis, meal photo reminders
- 20261019-160738 Day card yields to setup and later panels (BH-008)
- 20261019-155424 Revealed companion on Home, Forms, care room, flight
- 20261019-154834 New accounts start at 100% energy; energy felt in the world
- 20261019-154642 No made-up fast
- 20261019-151237 Typed meals understood (USDA), simpler Log meal
- 20261019-150120 Snap food AI (function deployed by the agent at about 3:32 PM after he set the key)
- 20261019-144057 Updates wait until setup is done
- 20261019-143513 Own companion keeps her name, stops being wiped (BH-006/007)
- 20261019-142930 Misty comes into the lung world
- 20261019-142709 No more crash flying in and out of worlds
- 20261019-142359 / 141244 / 135912 / 134704 Old-design purge rounds 4, 3, 2, 1
- 20261019-142009 First-run fixes (small iPhones, Gap goal, Fuel/Gap names)
- 20261019-140135 / 133916 Guides gossip; guides keep your lesson on language switch
- 20261019-130951 / 121209 / 110810 / 101824 / 094129 Overlay fixes and language switch (bug hunt rounds 3 to 5)
- 20261019-095111 / 091732 Ant-Man string POV; autopilot along strings
- 20261019-080527 / 080324 / 075402 / 074527 / 064609 / 064453 / 064016 / 063311 Rocket exit, guide recall quiz,
  Settings glass panel, joystick icon, no shadows, guide welcome-back, reverse exit, reading time
- Full list: `git log --oneline origin/main | grep Release`.

**Running when this was written** (each has a branch; a snapshot is pushed as `wip/<branch>`):

- Auto tutorial for new accounts (`tutorial-auto`): built and tested (1677/1677), release kept failing to land
  because CI was queued; a retry loop was re-releasing it.
- Community shooting crash (`community-crash`, commit f1d177e: caps hit effects, throttles layout while balls fly,
  plus a soak tool): waiting for the release lock.
- Product card reorder: landed on `main`, waiting for Pages.
- Hourly bug hunt round 9 (`bughunt-202610191502`): landed on `main` as 20261019-184058 at 6:45 PM, "setup picks
  up where you left off after a reload past the birthday step" (BH-009).
- Nutrition stats (`nutrition-stats`): released as 20261019-183920 (portion line on the product card, today's
  stats as game stats against `S.user.macroGoals`); live at 6:45 PM.
- Weight, BMI and body stats (`body-stats`): Settings row opens a weigh-in sheet with BMI and WHO band; releasing.
- Log meal as Breakfast/Lunch/Dinner/Snacks, snacks to buy on the shopping list (`meal-slots`).
- Evolutions get bigger each stage (`evolution-escalate`): tests 1676/1676, releasing.

If you find them unfinished: compare the branch with `origin/main` (`git cherry origin/main wip/<branch>`), read its
COORD file on `agent-harness`, and release it in one small task.

**Failed or cancelled today, and why**

- Snap food photo stopped working: stopped at its limit before fixing (diagnosis in section 4, item 8;
  `wip/snap-fix`). Still needed. Note: the server runs `food-photo` version 6; before redeploying, compare it with
  `supabase/functions/food-photo/index.ts` on main and keep the 3-a-day cap (DAY_MAX=3, tally/store, limit/left).
- Chat room keyboard fixes rounds 2 and 3, iPad chat room layout fix: stopped at their limit before starting. Open
  bugs: the newest message drops out of view when the keyboard opens; with page-resizing (Android-style) keyboards
  there is a 139-pixel gap under the composer and the list shrinks to 26 pixels; the keyboard height value stays set
  after closing; iPad landscape and portrait layout; optional fade at the right edge of the voices row. The three
  chat room probes were never run on the live build (see `probes/CHATROOM`). Work: `wip/chat-room-kb`.
- Everyone gets their own companion: stopped at its limit. Cause found: accounts older than the reveal (16 Oct) and
  the BH-007 wipe leave no companion record, so they fall back to Misty; only 1 of 37 email accounts on the server
  has its own companion. Tests and a playtest are on `wip/own-companion`.
- Replay tutorial from Settings (first attempt) failed at its limit; "Settings tutorial (only update)" was cancelled
  because Emmanuel would test it himself; the restarted task shipped it. One bug hunt run was cancelled.
- Three food photos round 1, meal names, old-design purge and onboarding companion round 1 ran out of budget, but
  their releases are live (checked in git).

**Branches not merged** (on GitHub as `wip/<name>`, each a `[skip ci]` snapshot of the branch plus any uncommitted
files; not reviewed): body-stats, bughunt-202610191502, chat-room-kb, community-crash, evolution-escalate,
liquid-fill-perf (frame-cost measurement only), meal-names (a live WebKit check script), meal-slots, nutrition-stats,
own-companion, product-card-order, scanner-close-bottom-right, snap-fix, tutorial-auto, ui-joystick-fade,
ui-settings-page (the last three are old, superseded by later releases).

**Backlog (to do)**

1. Fix Snap food on iPad (client side) and the overlapping photo sheet; honest error messages for key, limit and
   network failures.
2. Chat room keyboard and iPad layout bugs (above).
3. Everyone with Misty can claim their own companion; then switch on its tutorial step.
4. "Your herb's world" and other herb-era names: `spirit.js` labels ("Your herb's world", "Your herb"),
   `herb-quests.js` final-form text, `sw.js` notification fallback name, `daily-ritual.js` "Your herb noticed", and
   guides' typed names in `region-pals`.
5. Old-design leftovers: delete the ring-off old Home code, the Move screen gold line style, the tab bar on
   sub-screens, the first-run mystery seedling.
6. Voice question "how much sugar did I eat today" (answer from logged meals).
7. Spanish grammar: "Te quedan 1 de 3" should be "Te queda 1 de 3".
8. Bug hunt next steps: new-user run on live with a reload mid-setup; check the evolution card and mirror-move
   screen for the Day-card overlay problem; Home pinch to Community at the widest camera; Gap bubble aria label.
9. Time-zone trick on the photo cap (up to 6 photos in 24 hours by changing time zone): accepted for now.
10. Older open items in `SUCCESSOR_HANDOFF.md` section 3 (Cook "What can I buy here?" crash report, Misty tiny in
    Explore, Care board names, `supabase/proposals/grocery_hunt_20261017.sql` for the owner to run).
11. Personalized Higgsfield inside the app: he mentioned it; not started.

---

## 7. Do this first (new Maya)

1. Read this file to the end, then `AGENTS.md`, `RELEASE.md`, `TUTORIAL.md` and the last 20 entries of
   `DECISIONS.md`.
2. Get GitHub access with the device code (section 2): post the code and github.com/login/device to Emmanuel in the
   chat, wait, then `gh auth setup-git`.
3. Clone the repo to `/home/sprite/lowispike`, restore the harness (`agent-harness` branch README), install
   Playwright 1.64.1 with WebKit and Chromium, and run `node --test tests/*.test.cjs` once.
4. Check the truth: `curl -s https://therealetm.github.io/lowispike/version.json` (live build),
   `git log --oneline -15 origin/main`, `gh run list -L 10`, `git branch -r | grep wip/`, and the Log below.
5. For each running item in section 6, see whether its release landed; if not, release it in a small task.
6. Sign the cloud browser into Supabase with "Continue with GitHub" when you need the backend; check the edge function
   logs before touching `food-photo`.
7. Recreate the hourly bug hunt schedule if it isn't on your agent. Its memory is `probes/BUGHUNT/BUG-MEMORY.md` and
   `LEDGER.md` on `agent-harness`.
8. Send Emmanuel a short voice note plus checklist: what you found live, what you'll do first.

---

## Log

Append one line per event, newest at the bottom: date and time (CEST), what shipped / broke / was cancelled, build or
branch. Keep both lines if a rebase conflicts here. Never rewrite earlier lines.

- 2026-10-19 19:20 Handoff written: MAYA-HANDOFF.md on main; `agent-harness` branch (probes, bug memory, COORD and
  HANDOFF notes); 18 `wip/*` snapshots of unmerged or uncommitted work. Live 20261019-172632, main 20261019-175128.
- 2026-10-19 18:45 Shipped: 20261019-183920 nutrition stats (live), 20261019-184058 setup resume BH-009 (on main).
  MAYA-HANDOFF.md landed on main (25192c4).
