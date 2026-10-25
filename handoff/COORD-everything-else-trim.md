# COORD: trim the "Everything else" panel (Settings > More)

Owner: task 'LOWiSPIKE: trim "Everything else" panel' (started 18 Oct 2026 18:32 CEST)
Worktree: /home/sprite/wt-ee-trim, branch `everything-else-trim` from origin/main af789ff (20261018-175840)
Status: RELEASED as 20261018-191027 (ca1a184). CI green, live version.json matches. Files are free again.

## Owned (only this task edits these until released)
- home-settings-sleep-v2.js: the MORE list, entries('more'), the More panel markup/placement in show('more'), TX strings for the panel. NOT the fan(), sleep store or Settings-chip logic.
- home-settings-sleep-v2.css: `.ss2-panel`, `.ss2-head`, `.ss2-grid`, `.ss2-row`, new `.ss2-group*` rules only
- new tests/everything-else-trim.test.cjs, tests/everything-else-trim-live.cjs
- tests/home-settings-sleep-v2.test.cjs / -live.cjs: only assertions that name removed More entries (Today, Cook, Workouts, Daily quest), if any
- release bump via scripts/release.sh

## Not touching
- home-orbit-v2.* (ORDER: task 0bed29fd swap; .o8-cell shadows: task edf75d1e)
- living-bubbles.*, .wh-cell-fill, fast-bubble.* (task 505a561b)
- Misty rendering (task b5a67bc7)
- home-blooms-v2.* and Fuel screens (parallel Fuel restyle)
- index.html script order, sw.js precache list (unless a new file is added: none planned)

The panel position is computed from wherever the Settings bubble sits, so the Scan/Settings swap (Settings to the top) needs no change here.

## Release
One at a time under /tmp/lowispike-release.lock via scripts/release.sh, rebased on newest origin/main first.

## Replies
- 19:12 CEST: released 20261018-191027. home-settings-sleep-v2.js/.css now hold MORE_GROUPS / MORE_REMOVED / placePanel(); anyone touching the More panel next, read tests/everything-else-trim.test.cjs + tests/everything-else-trim-live.cjs first.
- Removed from More (code and routes kept): today (dropped from Home), cook (Fuel > Cook), theme / Day & night (Settings > Look & sound > Day & night), quest (dropped).
- Kept: Go to = community, care, workouts, map, vr, gift, weather; Settings = worldSound. Menu bar switch stays a chip on the Settings bubble itself (not duplicated in the panel).

## Follow-up (NOT started here): Emmanuel changed his mind at ~19:15 CEST, after 20261018-191027 shipped
His words: tapping Settings should open "the whole thing that we're used to ... a different page, just with settings ... the old interface, because it's way more intuitive. There's so much people have to select and do."
What a follow-up task needs to do:
- home-orbit-v2.js line ~125 / home-settings-sleep-v2.js Settings bloom: tap Settings -> open the full old Settings page (the Profile tab, #tab-profile, via goTab('profile')) instead of the Me / Look & sound / Account / Menu bar / More bloom.
- Give the things only the bloom reaches a place on that page: the bottom menu bar switch, and the trimmed Go to list (Community, Care board, Workouts, World map, VR, Gift of the day, Weather) plus World sound.
- Make sure the page has an obvious way back to Home when the bottom menu bar is off.
- Keep the routes and the More panel code (no deletions); update tests/home-settings-sleep-v2*.cjs and tests/everything-else-trim*.cjs to the new tap.
- 19:30 CEST from task 532a2e24 (sleep XP by tier, /home/sprite/COORD-sleep-progression.md): I will NOT edit home-settings-sleep-v2.js/.css or tests/home-settings-sleep-v2*.cjs. New file sleep-growth.js listens to the document `lowi:sleep` event and reads S.health.sleepDays. Please keep dispatching `lowi:sleep` {day, band} from setSleep() and keep the sleep store shape. Your live check's "XP back to 900 after 6-7 -> 7+ -> clear" stays true with my change. Please don't add an assertion that a single Sleep log leaves XP unchanged.
