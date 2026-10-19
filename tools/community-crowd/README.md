# Community crowd simulation

Emmanuel asked for this on 19 Oct 2026: up to 100 simulated members who sign up, play, post food photos, talk
about products, and chat with him and his beta testers in the Community room, around the clock, so it feels like
many people are using LOWiSPIKE, and to see whether that much activity breaks anything. His beta testers know.

This reverses the earlier rule in COMMUNITY_CHAT.md that the room shows no invented people. It was the owner's call.

## What the members do
- Join a few at a time (25 at launch, then about 25 an hour, up to 100) with real accounts
  (`crowdNNN@crowd.lowispike.invalid`, password derived from the `CROWD_SEED` secret). Each gets a profile with its
  own companion look from its birthday, birth time and personality type, and its level grows day by day.
- Live in 25 places (Germany, Spain, Mexico, Nigeria, India, the US and more), in their own time zone, so someone is
  always awake. Ages 17 to 58; Gen Z, millennial and older writing styles; local slang; English, German or Spanish.
- Chat: greetings by local time, meals from their own cuisine, Gap, streaks, their companion, water, walks,
  questions to the room, and real products from `data/shop` with their real sugar per 100 g (German and nearby members).
- Post meal photos in the chat and to the feed ("Just ate: ..."); photos come from TheMealDB (`meal-photos.json`).
- Log meals the way the app saves them (added 19 Oct, 9:45 PM): one entry per breakfast, lunch, snack or dinner window
  in their own time zone, at most one per slot per local day, written to `S.logs` in the `lowispike.v2` key of their own
  `user_state` backup row (macros left unknown). About 15% of logged meals are also mentioned in the room.
- Send energy, react with the five chat emoji, like posts. Since 19 Oct, 10 PM (Emmanuel asked for it) energy to a
  real person who wrote in the room is also 1 to 3 REAL energy balls: the same broadcast the app sends (event `energy`
  on channel `lowi-all`, via Supabase's realtime REST broadcast), aimed from the member's spot at the receiver, who
  sits at 0,0 on their own map. 75% of energy goes to real people, Emmanuel with the biggest share. Each run's log
  line carries `balls`.
- Answer people: Emmanuel's messages get a reply about 85% of the time, other testers about 60%, and an @mention of a
  member always gets that member. Members welcome newcomers, ask where to buy a product and answer each other.
  Replies are written from fixed lines, not by an AI model, so they can be repetitive or miss the point.

## Where it runs
- `.github/workflows/community-crowd.yml` every 10 minutes, each run about 9 minutes, so it is nearly continuous.
  GitHub sometimes starts scheduled runs late.
- Switch off: disable the workflow in GitHub Actions, or set the repository variable `CROWD_OFF` to `1`.
  Fewer members: repository variable `CROWD_MAX`.
- By hand on the VM: `node tools/community-crowd/crowd.cjs once` (seed in `~/.config/lowispike-crowd/seed`).
  Do not run `serve` while the workflow is on: both would answer the same message.

## Checking what they did
`node tools/community-crowd/db-check.cjs [sinceISO]` on the VM reads profiles, messages and posts (read-only) and counts
photos, product talk and replies to people outside the crowd. Each run's log line also carries `meals`.

## Removing the members later
Their accounts are ordinary Supabase users with emails ending in `@crowd.lowispike.invalid`; delete them in
Supabase Authentication (their profiles, messages, posts, reactions and likes go with them if the tables cascade;
otherwise delete rows by those user ids).
