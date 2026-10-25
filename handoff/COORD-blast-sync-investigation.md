# COORD: energy blast cross-device sync investigation (read-only)

Owner: investigation task "LOWiSPIKE: investigate cross-device blast movement sync" (started 24 Oct 09:05 CEST). No runtime edits, no deploy, no database writes. Scratch repro lives outside the repo in /tmp/blastinv/repro.cjs; worktree /home/sprite/wt-blast-sync-inv (detached at origin/main 5a81562e) is read-only.

## What Emmanuel saw (24 Oct, call at 8:54 and follow-up)
Shot his iPhone profile from his iPad profile in Community > Room. Companions do not sit the same way on both screens, the blast flies another direction and distance on each device, and the hit companion always ends up back on its original spot.

## Where shots live
Only the Community Room tab map (#cgGalaxy, community-chat.js + community-galaxy.js + community-energy.js). Transport: Supabase realtime broadcast `energy` on the current support-room channel (community-rooms.js sendEnergy / join .on('broadcast',{event:'energy'})) -> `lowi:energy-shot` DOM event -> community-energy.js remote(). Fire and forget, no ack, no replay, no server state. Knocked positions persist only in localStorage `lowi.energy.land.v2:<uid>` (account-sync copies it between devices of the SAME account only).

## Cause on the build he had (085600 and earlier, before Release 20261024-095517)
1. Self-centred map: old G.mapLayout put the viewer at (0,0) and seated everyone else by hash around them, so iPad and iPhone each drew a different room. Repro (old modules, same crowd): iPad->iPhone vector [-528,111] on the iPad vs [381,-229] on the iPhone, 161 degrees apart, 540 vs 445 units. Ball direction 168 deg vs -31 deg; target knocked 162 vs 647 units.
2. Receiver re-aimed with its own geometry: old remote() fired from the shooter's LOCAL spot at the target's LOCAL spot; the packet had no positions.
3. Own companion pinned only on its own screen (old pinned = me && !knock), so chains differed.
4. Snap-back: old remote() dropped every shot while Community was not visible (`if(ag.stale||!visible())`), so the device not being looked at never moved the target; it stayed on its seat there. Landing spots were also saved in each device's own frame (land.v1).

Not a design spring: billiard "stays where it stops" shipped 19 Oct (5e3660cb); no return force in step(). The older proposal in energy-blasts-design.md / COORD-circle-human-roster.md (damped spring back to the roster anchor within ~1.4 s) was never shipped and conflicts with what Emmanuel wants -> product decision before anyone builds that queued design.

## Current live build 20261024-142340 (live files byte-identical to origin/main)
Contains 22c23c58 + ce0dcf47 (released 20261024-095517 by another task): one shared room frame (seat by id hash, frame only shifted), packet carries room positions f/g of shooter and target, receiver setAt() both before firing, nobody pinned, PHYS_R=24 on every device, off-screen received shots settle() immediately, land.v2 in room coordinates. Repro: identical crowd -> identical vector, ball direction (-141 deg both), knock (414 units at -91 deg both) and landing room position (-533,-303 both). Repo energy tests 30/30 pass.

## Gaps still open on the live build (observed in repro, not on devices)
- Missed broadcast = permanent mismatch + "back on its seat": if the target device is suspended (iOS background/locked), in another support room, not subscribed, or opened later, it never hears the shot and there is no catch-up (S3: iPad target at (-533,-303), iPhone still at seat (-528,111)).
- Seats depend on each device's own crowd list: roster() mixes presence, recent writers (30-minute window), blocks, hidden accounts, local bots (Mateo/Jonas/Samir dropped when a real person shares the name); mapPool band and linear probing depend on the set. 2000 random 10-person rooms with one extra person on one device: 244 rooms (12%) have some shared seat different, 50 (2.5%) put the shooter->target direction off by more than 5 degrees, worst 179. Pool band 96 vs 48 (36 vs 33 people): 9 degrees and 586 vs 270 units. setAt fixes only shooter and target; bystanders in a chain can still differ.
- Mixed builds: an older cached build ignores f/g and uses its own frame.

## Smallest fix proposal (NOT implemented)
1. Catch-up from the person who was hit: each client publishes its own companion's knocked room position (rounded, in its room presence payload or one small row), and every device applies it on join, resume and presence sync. The hit person is authoritative for where they rest; no new permissions over other users.
2. Shooter result event: after the shot settles on the shooter, broadcast the final room positions of the bodies that moved; receivers ease to them (corrects bystander chains).
3. Seat independence: seat from the room membership list (directory, offline included as the human-roster plan wants) with a fixed pool band, then hide blocked/hidden locally without reseating anyone.
4. Keep the deliberate final behaviour explicit: "stays where it lands" (shipped) unless Emmanuel chooses the spring-back design.
Protections unchanged: only participating, online, unblocked real members are targetable; blocked and hidden people never receive or show positions; rate limits stay.

## Acceptance tests to add
Two browser contexts (iPad 834x1194, iPhone 13 390x844) with stubbed people list and an in-process broadcast relay, fixture accounts only:
- before the shot every shared member has the same room position on both (within 1 unit), also when one side has one extra recent writer, a bot or a block;
- ball direction equal within 1 degree, target landing room position equal within 2 units;
- iPhone context hidden or offline during the shot, then resumed or reloaded: target shows at the landing spot, not the seat;
- event without f/g from an old build still plays; reload keeps positions on both; blocked/offline/non-participating cannot be hit.

Highest rung reached: node two-device simulation using the shipped layout, physics and wire modules, plus repo energy tests. Not done: two-browser run, Supabase transport, real iPad or iPhone.
