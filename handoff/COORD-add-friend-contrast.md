# Add friend button readable in dark mode (task 'LOWiSPIKE: readable Add Friend button in dark mode', Oct 24 2026 09:05 CEST)

- Branch `add-friend-contrast-20261024`, worktree /home/sprite/wt-add-friend-contrast (from origin/main f0b607c, live 20261024-085600).
- One behavior: the Friends tree "Add friend" button (.cr-go, cell-room.js) keeps a dark label on its light fill in dark and light theme, at rest, focus and pressed.

## Owned files / hunks
- cell-room.css: ONLY the .cr-go rule(s) (+ new :focus-visible/:active/:hover lines for .cr-go).
- style-sweep.css: ONLY the `.cr-go` button-contrast rule hunk (lines ~33-43), if needed.
- tests/add-friend-contrast.test.cjs (new), tools/add-friend-contrast/* (new)
- news.json / version.json / sw.js build ids via scripts/release.sh

- cell-room.js: ONLY line ~201, the cell-room.css <link> id (crCss -> cellRoomCss). ROOT CAUSE: index.html's community-room.css link already has id=crCss, so cell-room.css was skipped and the tree rendered unstyled.
- style-sweep.css: --sw-btn-ink token replaces var(--ms-ink) as light-button text colour (misty-say.css redefines --ms-ink #f2f8ff later); .cr-go state rules.
- People directory (user asked mid-task, 10:5x): NEW people-directory-core.js, people-directory.js, people-directory.css, tests/people-directory.test.cjs, index.html: 3 new tag lines after community-chat.js only.

## Not touching
- cell-room.js other markup/logic, roster/camera (COORD-circle-human-roster), chat redesign, blasts, birthday/profile, user-rooms.*, community-tg.css, bloom-ring/tutorial (scan-hold task).
- No People directory / navigation change (recommendation only).

## Replies

## Outcome (14:47 CEST)
- Label colour + People directory were already on main via ca88547f (misty-say ink split); my style-sweep/People drafts were dropped (branch add-friend-contrast-20261024 left local, not pushed).
- Released 20261024-144420 (926bb8eb): cell-room.js loads cell-room.css as id=cellRoomCss (crCss was taken by community-room.css -> Chromium showed the tree unstyled). tests/cell-room-css-id.test.cjs. Live check both engines pass, 12.88:1 all states/themes.
- Open for someone else: tools/people-directory/check.cjs on live WebKit fails "person card opens above the list" (iPhone, iPad portrait, iPad landscape); the card itself is the right profile. Main's tools/add-friend-contrast/check.cjs times out on live (waits for a visible .cr-go before the tree finishes) - probe issue, not app.
