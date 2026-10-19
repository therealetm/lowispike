# UPDATE round 3: LIVE 20261019-144057 = update bubble waits during setup (tests/newuser-update-hold-live.cjs PASS live). Walkthrough: setup, starter plan (never -> Gap 12 h OK), all 8 Home bubbles: no errors. Open: Settings Close sits on 'World map' chip on iPhone 13 (home-settings-sleep-v2.*, freed). Day card waits for the plan correctly (queue).
# UPDATE Oct 19 (round 2): round 1 RELEASED, LIVE 20261019-142009 (tests 1545/1545, CI green, live version.json + files match).
Browser check tests/newuser-hint-live.cjs: FAIL on live 140135, PASS on branch (WebKit iPhone 13 + Chrome 390x844) and PASS on live 142009 (iPhone 13).
Full-suite flake seen once under load 45: tests/misty-eyes-moving.test.cjs file-level fail, passes alone (not ours).
Next for a new round: day card stacking over the starter plan right after setup (needs onboarding replay in NEWUSER harness);
guessed running fast for brand-new users: DECIDED + FIXED Oct 19 (Emmanuel: "fasting for nineteen hours, doesn't make sense"). Build 20261019-154642: no meal known = no gap; the clock starts at the first real meal. See DECISIONS.md and COORD-no-fake-fast.md.
Name 'Minti Leaf'/'Moss Leaf' = bug hunt BH-006, skip. Seedling inside the pre-birth mystery bubble (lc-seedling) = purge noted it is ours.

# Handoff: new-user walkthrough (Oct 19). NOTHING RELEASED. Live is still 20261019-130951.
Worktree /home/sprite/wt-newuser, branch newuser-walkthrough (off origin/main). Changes are uncommitted:
- herb-start.css: a fix at the end of the file for short screens (<=700px / <=600px). The speech bubble on the name and reward steps spilled over the back button and step dots, 6px off screen at 390x664. Checked in WebKit: it now fits.
- herb-start.js: copy says Fuel/Gap instead of Meals/Fasting (EN/DE/ES). 'done' writes the fasting target from the starter-plan answer via C.fastTarget.
- starter-core.js: fastTarget(): never->12, f12->14, f16->16, long->18.
- sym-home.js: the Fuel aria label is now Fuel/Essen/Comida, not Meals.
- world-home.js + world-home.css: the 'Drag to look around' hint docks to the top or bottom (class wh-dock, no tail) when the spot above Misty's head hits [data-orbit] or #whPad. Not yet verified in a browser.
- tests/newuser-walkthrough.test.cjs: 6 tests, all pass. They fail on old code.
Full suite: baseline 1508 in tests/*.test.cjs with 1 load-flake. Under load 36 there are more timeouts that pass one by one.
TODO: verify the hint dock in a browser, add DECISIONS.md and What's New (EN/DE/ES), rebase, run scripts/release.sh, check Actions and version.json. Then continue the walkthrough at Home: each bubble/panel, Community, Care, Workouts, map, VR, worlds, iPad landscape.
Open findings: a new user sees a guessed fast already running ('15 h of 16 h', last meal guessed as 8 PM yesterday). The day card stacks over the starter plan right after setup. aria 'Your herb's world' is old wording, for the purge agent.
Harness: /home/sprite/NEWUSER (drv.cjs + boot.sh + srv.cjs:8811). Use iphone13lite (DPR 1). Headless speechSynthesis freezes pages, so the TTS stub is in drv. Opening a new page after setting auth works; reload hangs in Chromium.
