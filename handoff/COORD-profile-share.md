# Shared birthday countdown, star sign and personality on the person card (task: 'LOWiSPIKE: shared birthday countdown, zodiac and personality', Oct 24 2026 ~08:10 CEST)

- Branch `profile-bday-20261024`, worktree /home/sprite/wt-profile-bday (from origin/main 26fd57b, live 20261024-071833).
- Finding (live probe, test account, 08:05 CEST): table `community_identities` does NOT exist on the live Supabase (PGRST205), so star sign / personality
  sharing has never worked: every card says "Not shared". `profiles` has bday/sign/mbti columns (check constraint profiles_bday_fmt = YYYY-MM-DD),
  the client blanks them in pushProfile. Plan: with the user's consent the app publishes `profiles.bday = '0004-MM-DD'` (year 0004 = day+month only,
  never the birth year), `sign` derived from the date, `mbti` if set. No DDL needed. Readers accept a human's bday/sign/mbti only in that format.

## Owned files
- profile-share-core.js (new), tests/profile-share-core.test.cjs (new), tests/profile-share-live.cjs / tools/profile-share/* (new)
- community-chat.js: ONLY openPerson(), profile(), pcParse/pcDate helpers, the `pc*` strings + new `ps*` strings in the strings table (line ~107),
  the settings() "sharing" form and its submit branch (`form.dataset.chatForm==='sharing'`), and a consent prompt function. Not the composer, rooms, bots.
- community-chat.css: ONLY new `.cp-` rules appended at the end (no edits to composer rules).
- index.html: ONLY pushProfile() row lines (~9732-9736), mapPerson() (~9588), ageOf/daysToBday/bdayLong (~15955-15959), onboarding birthday note +
  `s.user.bday = ob.bday` save (~10938/10972), the LowiCommunityHost bridge `identity()` line (+ new share methods) and one script tag for profile-share-core.js.
- sw.js STATIC entry for profile-share-core.js; build ids/news via scripts/release.sh.

## Not touching
- community-chat.css composer rules, chat composer/rooms/Circles/bot filtering/chat cleanup/inspiration bot (task fc941ed5), bot-accounts.js, hidden-accounts.js,
  ranking*, care-board*, user-rooms*, community-rooms*, cycle-world*, home blooms/orbit, Misty files.

## Status
- 08:10 started. ~09:00 profile change committed on branch, all node tests + Chromium + WebKit iPhone 13 fixture pass; releasing after task fc941ed5's release.

## Next scope queued in this same task (Emmanuel, Oct 24 ~09:00), after the profile release
1. Seller Zone filter strip: Category and Region as two labelled rows. Owns: seller-zone.js bodyHTML() chip markup only, seller-zone.css chip rules,
   tests/seller-zone-filters*.cjs (new).
2. Shop = Supermarket / Seller Zone / Kitchen tabs. Kitchen = products bought / at home (bin -> optional Buy again into the cart).
   Einkaufswagen = the EXISTING shop list (SH.list in index.html), not a second list. Saving another member's product goes to the cart; Bought moves to Kitchen.
   Owns: store-picks.js (Shop tabs), kitchen-core.js + kitchen.js + kitchen.css (new), index.html SH list/tdShop hooks (~6560-6640, ~7589-7700),
   tests/kitchen*.cjs. Will NOT touch community-chat*, Circles/chat navigation, bot files.

## Latest Home visual decision, supersedes visible-label fitting below

User now explicitly requests removing action text labels entirely from Home bubbles: no 'Eintragen', 'Bewegung eintragen', 'Mahlzeiten' or shorter substitute action words. Use symbol-first Home bubbles with only necessary numeric indicators, matching the intended minimal English presentation. Do not solve this by replacing long German labels with Essen/Trinken/Bewegen or tiny unreadable text. Apply consistently across languages and the Home/bloom controls implicated by screenshot 01a16ca7-7a0e-7000-bd5c-47a0cd9b7fbf. Preserve meaningful progress/quantity indicators where necessary, not arbitrary decorative numbers. Preserve all actions and touch targets, accessible localized aria labels and screen-reader names even though visual text is removed. Do not remove app-wide labels from unrelated pages/settings or hide companion name. Icon-only hydration choices must still be distinguishable (sip/glass/bottle symbols; ten-sip choice may show necessary 10 count); capacity choices retain necessary quantities. Test visually no redundant labels, same layout/style EN/DE/ES, accessible names and all actions still functional, day/dark phone/tablet. Publish directly using existing verified release process, not merely prepare design. Latest user direction overrides conflicting earlier typography/label suggestions below.

## Queued Home typography fix, assigned to current profile task 2083c80b

User reports German Home bubble labels look like a different font, heavier/clunkier and less minimal than English, screenshot 01a16ca7-7a0e-7000-bd5c-47a0cd9b7fbf. User wants German to have the same clean English typography inside the bubbles. This request was delivered via update_task. After finishing current narrow profile release, perform this focused next release before unrelated queued Shop expansion. Keep at most two running tasks; no third task or duplicate Home editor. Existing other task 4118e72e owns cycle/Room, not Home typography.

Inspect current English vs German computed styles and label fitting at same viewport, not assume a font-family cause: compare family, weight, size, line height, tracking, transforms and wrapping; loaded web fonts versus fallback, and language-specific selectors. Check previous bloom fitting fix in COORD-bloom-labels.md. Preserve whole-word wrapping, readable minimum sizes and full translations; do not abbreviate/remove German text or shrink every label simply to conceal overflow. Match clean English styling with sensible fitting only where needed. Include regular Home bubbles and expanded blooms shown in screenshot.

Read AGENTS.md and .agents/skills/lowispike-change/SKILL.md, inspect ownership before editing and claim exact Home CSS/JS hunks here. Use fresh origin/main worktree for this separate release. Write failing visual/computed-style regression first; EN/DE same base family/weight/style, long German words stay whole and labels fit. Verify 390x844 Chromium and WebKit iPhone 13 emulation plus iPad, both day/dark and language switching without reload. Preserve English/Spanish and interaction geometry. Never delete/weaken tests. Publish directly under standing user authorization, no discretionary question: scripts/release.sh with its OWN lock, no extra wrapping lock or force. Verify live version.json and GitHub CI on actual commit plus live German/English comparison before calling it shipped. Report current build, highest proof rung and one physical-phone check, short checklist plus voice note. If stopped early, leave HANDOFF and pushed branch; no false live claim.

## Latest hydration decision supersedes the few-sips/no-counting brief below

User explicitly wants OPTIONAL manual counting: tap after every ten sips. Three independent logging methods: '10 Schlucke' / '10 sips', a finished glass, or a finished bottle with selectable remembered capacity. Do not implement 'a few sips' instead of the requested ten-sip batch. One tap logs ten sips, not one sip and not ten taps. No automatic detection, background counting or reminder implied. Ten sips is NOT a glass; no universal sip/glass conversion. Volume assigned to a sip batch must be clearly approximate and must not be presented as measured or equivalent to a finished glass. Preserve completed-glass/bottle volume settings and avoid double counting the same drinking across methods; these are alternatives, not stages to fill cumulatively. Keep Home minimal and German typography aligned with English. Amend tests and publish after verification under existing safeguards; no new parallel task. This supersedes incompatible wording below, especially 'no counting' and the 'Ein paar Schlucke' label.

## Earlier hydration control clarification, superseded where noted above

User authorizes us to choose simple manual hydration controls and publish after testing. Keep three familiar actions: German 'Ein paar Schlucke', 'Ein Glas', 'Eine Flasche' (equivalent natural English/Spanish labels). A tap on a few sips logs one approximate small-drink entry, never asks a sip count or ml-per-sip. The voice agent's 'three sips to a glass' was incorrect: no fixed sip-to-glass equivalence, no automatic sip detection/background counting, no claim the app knows drinking without input. Brief helper text can say 'Grob geschätzt. Du musst keine Schlucke zählen.' Keep numeric details out of the small sip label. Inspect existing hydration accounting and preserve historical logs; any internal sip volume is explicitly an approximate convention, not a measured intake or validated physiological quantity. Do not derive a new exact volume from guessed sip counts.

Glass means a finished glass. Bottle means a finished bottle with selectable capacity, remember user's chosen capacity (show choices only when relevant, not a permanent cluttered number grid). Reuse existing supported units/capacity choices and sensible existing glass setting rather than silently relabel old entries. Prevent bottle capacity selection from logging until selected/confirmed, and double logging from reopening. Provide undo consistent with existing app. User's core goal is no counting or measuring sips, clear natural German and the same minimal typography as English. No new 'sipping mode', notifications or sensors.

Implement as a narrow follow-on in existing coordinated task, at most two tasks running. Claim exact hydration hunks before touching them, avoid cycle/Room and concurrent profile changes. Regression tests for each manual action, approximate sip wording/semantics, finished bottle selected capacity and persistence, no automatic input, no old-log reinterpretation, no duplicate entries. Verify EN/DE/ES narrow phone labels and hydration totals, Chromium and WebKit iPhone emulation. Publish with same prescribed release safeguards, confirm live build and CI; report only verified results. If this does not fit task budget leave explicit pushed handoff rather than omit it.

## Replies

## 2026-10-24 08:3x task "always-visible birthday and zodiac cards" (branch profile-always-20261024, worktree /home/sprite/wt-profile-always)
Owns: profile-share-core.js, community-chat.js hunks openPerson/profile()/askBday/settings sharing note/bday submit/'bday-add' click + pc*/ps* strings,
index.html pushProfile publicRow call, saveOb consent line (removed), LowiCommunityHost identity()/setBday, tests/profile-share-*.cjs, version.json news text (same id, no new What's New).
Does NOT touch room switching, reactions, composer, media/chat UI (fc941ed5), Shop/Kitchen/Seller Zone, Misty.
Rule now: always published for every account with a birthday, no consent ask, no opt-out. Release WITHOUT --news (Emmanuel: no announcement).

## 2026-10-24 08:55 task "hold Scan to open all secondary bubbles" (branch scan-hold-20261024, worktree /home/sprite/wt-scan-hold)
See /home/sprite/COORD-scan-hold-blooms.md. Owns the gesture code in bloom-ring.js (two-finger tap -> hold Scan) and the 'misty-two' tutorial step/voice.
Will NOT edit home-blooms-v2.js, home-orbit-v2.js labels/WORDS, hydration or typography: your queued Home label work stays yours.
08:5x same task, profile release done (20261024-084818). Now branch home-symbols-20261024: home-orbit-v2.css (appended block) + home-orbit-v2.js (isWord/markWords in boot) only. Emmanuel: Home ring bubbles symbols + numbers only, every language. Then hydration controls (sips/glass/bottle) scoped in HANDOFF-hydration.md if budget runs out.
