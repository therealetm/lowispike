# Energy blast in the Community room: why the iPad and the iPhone disagreed

Emmanuel fired an energy blast from his iPad profile at his iPhone profile in the Community room. The target did move. But the two screens did not agree on where the companions sat, which way the blast went or how far it went. Afterwards the target was back on its seat. All three symptoms come from one design choice: each device drew the room around itself and computed the blast on its own.

The fix is live in build 20261024-095517 (commit on main, see the end). The line numbers below are for origin/main before the fix, at build 20261024-085600.

## Where this lives

- The game lives in the Community tab, on the Room view (`#cgGalaxy`). `community-chat.js` draws the companions and `community-energy.js` runs the blasts. Circles (`user-rooms.js`) has chat and people chips, but no energy game, so the "Circle Room" in the report is this room.
- **Transport:** Supabase realtime broadcast on the support-room channel. `LOWI_CLOUD_X.energyShot` (index.html:10013) calls `LowiRooms.sendEnergy` (community-rooms.js:71), and that sends `{type:'broadcast', event:'energy', payload}` on the room channel. The receiving device fires the `lowi:energy-shot` DOM event and `community-energy.js` `remote()` handles it.
- **Networked vs local only:** the Community blasts are genuinely networked. The Misty shot on Home (`misty-turn.js`, the joystick plus two taps that heals worlds) is local only and never leaves the device.
- **Identity:** the event carries `by` (the shooter's cloud uid) and `to` (the target's uid). The receiver maps `to === myUid` to its own "me" body. Its own echoes are dropped (`m.by === myUid`). Duplicates are dropped by the shot id (`seen`), and stale events by age (`shotAge`). Identity worked correctly.
- **Who owns position:** no device does. Positions were never sent. Each device ran its own physics from the shot event and kept the result in its own `localStorage` (`lowi.energy.land.v1:<uid>`).

## Symptom 1: the companions start in different places

**Verified.**

- **Cause:** `mapLayout` puts the viewer at (0,0) and everyone else on a seat from their id hash (community-galaxy.js:160–176, the old comment says "You sit at (0,0)"). The iPad user sits in the middle of the iPad screen, and the iPhone user sits in the middle of the iPhone screen. Everyone else gets the same seat on both devices. So the two Emans are placed differently on each device, and so is everything between them. This is not a rigid shift between the two screens, so no device can translate a direction into the other's frame.
- **Second cause:** knocked companions were saved in each device's own frame and synced per account (`LAND_KEY` community-energy.js:159, synced by account-sync-core.js). Over time, every device collected its own leftover offsets.
- **Not a cause:** roster ordering is computed locally in `crowd()` (community-chat.js:256–275), but seats are sorted by id hash, so order never moves a seat. The pool size is the same on both devices for rooms under 35 people.
- **Evidence:** I ran two isolated local Chromium clients with separate mock clouds and no real users. They were linked only by relaying the exact energy payload. Both had the same 12 people in the room.
  - On the iPad (820×1180), the iPhone user sat at (−304, −199) relative to the iPad user, so the iPad aimed at −147°.
  - On the iPhone (390×844), the iPad user sat at (7, 203), so the same pair was 203 apart at −92°.
  - Over 300 random pairs of ids, the two devices disagreed on the shooter-to-target direction by a median of 92°. Only 9% of pairs agreed within 15°.

## Symptom 2: the blast flies a different direction and distance

**Verified.**

- **What the event carried:** `{v, id, by, a, p, to, ht, t}` (pack in community-energy.js). `a` is an angle in the shooter's own frame. When a target is set, the receiver ignored `a`. It re-aimed from its own local shooter position to its own local target position, and it set the speed so the ball arrived after `ht` ms (`fire`, community-energy.js:69–72; `remote`, :209–216). The knock goes along that local direction. So the same event became a different direction and a different flight length on each device.
- **What made it worse:**
  - Your own companion was pinned on your own screen only (`pinned = b => b.me && !b.knock`, :76). On every other device it rolls freely, so any chain that touched a viewer played out differently.
  - The physics radius came from the drawn orb size, which depends on the device (56 px vs 46 px orbs, and zoom z0 1.25 vs 0.975, community-chat.js:404).
  - The cushion at the map edge was centred on each viewer, not on the room.
- **Evidence (same two-client run):**
  - The iPad flew the ball 309 units along −147°. The iPhone flew it 145 units along −92°.
  - The target was knocked (−218, +19) on the iPad and (+101, −546) on the iPhone. A different bystander got chained on each device.

## Symptom 3: the target goes back to its seat

**Not designed behaviour.** The spring-back design ("drifts back home") shipped on Oct 16 (07ca1a35) and was replaced on Oct 19 by 5e3660cb. Since then a hit companion stays where it lands, as Emmanuel asked (MAYA-HANDOFF.md:447). Nothing in shipped code pulls a body back to its seat, so I kept that design.

- **Cause, verified:** `remote()` dropped any shot that arrived while Community was not on screen: `if(ag.stale||!visible()){stats.dropped++;return false;}` (community-energy.js:209). Positions were never synced, so that device never moved the target. Looking at the iPhone after shooting from the iPad, the companion was still on its seat.
  - In the two-client run, with the iPhone's room hidden when the shot arrived, the iPhone logged `dropped: 1`. The iPad showed the target knocked to (−522, −180). The iPhone kept it on its seat at (0, 0).
- **Same effect, suspected (not reproduced):** an iPhone that is locked, or has the app in the background, has its realtime socket suspended by iOS and never receives the event. A shot older than the age limit is also dropped as stale.
- **Ruled out:** leaving Community and coming back did not move a knocked companion in either client.

## What I changed (live in 20261024-095517)

1. **One room frame for everyone** (community-galaxy.js `mapLayout`, `mapClamp`). Every person, you included, takes a seat from their id hash. Each device then only shifts the frame so that you are at (0,0). A shift keeps every direction and distance, so the room looks the same on every device. The camera limits and the edge cushion are centred on the room, not on you. The camera still opens on you.
2. **The blast carries room positions** (community-energy.js `pack`/`unpack`, `fireAt`, `remote`). Two new optional fields, `f` and `g`, give where the shooter and the target stood, in room coordinates. The receiver places both there and fires along the shooter's direction. An event from an older build still plays as before.
3. **The same physics on every device.** One physics radius (`PHYS_R = 24`) for everyone, and nobody is pinned.
4. **An off-screen shot still lands.** If Community isn't showing, the shot is played out at once without drawing, saved, and the map redrawn. You come back to the target where it was knocked.
5. **Saved positions are in room coordinates** (`lowi.energy.land.v2`, with the account sync list updated). The old v1 offsets were in each device's own frame, so they are dropped once and everyone starts on their seat after this update.

**Unchanged:** consent, cooldown and anti-spam. The send, receive and inbox rate buckets, the age limit, duplicate ids and self-echo checks are untouched, and a test asserts them.

**Checks:**

- New tests in `tests/community-energy-shared-frame.test.cjs` cover the same seats on both views, the same vector between the pair, and the same direction and landing spot after the wire round trip, for iPad portrait and landscape. They also cover everyone else agreeing within 12 units, no spring back, old events still playing, room-coordinate saving, and the off-screen path. All 2,898 local tests passed before the release, and the release script ran the full suite again.
- **Two-client re-run on the fix:**
  - Both devices saw the iPad user at room (7, 203) and the iPhone user at room (−304, −199).
  - After the blast, the iPhone user rested at room (−598, −327) on both, and the chained bystander at (−195, −363) on both.
  - Off screen with the iPad in landscape (1180×820), the result was (−599, −327) on the iPad and (−598, −327) on the iPhone. The iPhone logged `offscreen: 1` and no drop.
  - No console errors.

## What's left

- **A phone that's asleep or backgrounded** still misses shots, because the event never arrives. Its next correction comes from a later shot, which carries both positions. A full fix needs a shared room state: a small authoritative positions row per room, or the last positions sent in presence. That should come with the same rate limits.
- **Reduced motion** still plays a shorter roll on that one device (the table's `tune(reduced)`), so its landing spot can differ.
- **Bystanders who aren't the shooter or the target** are placed from each device's own state. They agree when both devices saw the same shots.
- **Tested in simulation only:** Chromium at iPhone and iPad sizes with mock clouds. Real two-device play on Emmanuel's iPhone and iPad hasn't been checked.
