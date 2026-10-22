# LOWiSPIKE handover for Maya 8

Everything Maya 7 left open on LOWiSPIKE as of Thursday, October 22, 2026, evening (Hamburg time). Repo: GitHub **therealetm/lowispike**. The newest live build is **20261022-142600**. Nothing is running and no release is in the queue. The full history is in **MAYA-HANDOFF.md** in the repo: read it first.

## How Seven wants the work done

- **Small steps only:** one small, separate task per step, never one big run. Long tasks run out of budget.
- **Release right away:** publish every finished change through the release pipeline without asking Seven to confirm.
- **One release at a time:** today about ten releases queued at once, the build machine overloaded and almost every task stopped at its limit. Check `pgrep -af release` before starting one.
- **Status checklists use these emojis:** ✅ live, 🚀 releasing, 🔄 in progress, ⏸️ stopped or not live.
- **Design:** the brand colours are blue #0A84FF, softer blue #5AA9FF and cyan #8FE7FF. No violet or green. All sheets should look the same (Japanese-style convenience and consistency). Seven wants the look to be glassmorphism (liquid glass).
- **Release pipeline:** `scripts/release.sh "..." --news <whats-new.json>` (What's New in English, German and Spanish), then `node scripts/wait-ci.cjs` and `node scripts/verify-live.cjs --compare` for the live build number. Afterwards, add the build number to MAYA-HANDOFF.md.

## ✅ Live

- **Shuffle under Cook > Products** always has a pick, no empty "Your pick" (20261022-142600)
- **Continue tutorial button** stays until the tour is finished or skipped, and never covers buttons (20261022-141920)

## ⏸️ Built and tested, never released

These only need checking and releasing, one at a time. The branches were pushed to GitHub with this handover. If a branch is missing there, it is only on Maya 7's computer.

1. **25 levels for Misty's evolution, with slower XP:** branch `evo-levels-20261022`. Evolution marks at 5, 10, 15, 20 and 25, and the final form takes about a year. Still to do: the iPhone SE check in German.
2. **Chat in brand colours that follows Night mode:** branch `chat-brand-20261022`. Passed on simulated iPhone SE, 13 and 15 and Pixel 7, in Day and Night.
3. **Chat background stuck on Home after leaving the chat:** branch `chat-leave-20261022`. The camera glide back to Misty now always finishes within 0.9 seconds. Tested only on iPhone 13 so far.
4. **"I just ate this" / "I'll eat this"** on Shuffle, Swipe and the end of cook-along: branch `ate-this-20261022`. The iPhone 13 and 15 checks are still open.
5. **Members page** in the chat: branch `chat-members-20261022`. Two fixes have never been checked, and the earlier Night checks failed. Check it before releasing.
6. **Aura shop:** branch `aura-shop-rb`. Passed everywhere except iPhone 15 in Day mode, which hung while the server was overloaded.
7. **Leaderboard:** tests pass. Until the fair-play SQL has run once in Supabase, a faked score can still be saved (phones keep it off the board).

## ⏸️ Started, stopped before finishing

- **Queue control:** a system that limits how many tasks run at once and saves their progress. Seven asked for it after today's timeouts. Do this first.
- **Chat text bar** sits too low, and typing is broken on iPhone.
- **New chat design:** Seven approved the mockup. It has neutral backgrounds (creamy Day, charcoal Night), the brand blues and cyan only as accents, glassmorphism, and a compact header with the room name, back button and members button only. Remove the sparkle bar and the fake pin, and keep pinning for admins. Make it fit the rest of the app (the rest of the interface is dark glass even in Day).
- **Sheets** stay on screen after closing, and the Forms sheet shows Misty's sheet through it.
- **Misty's sheet:** remove "Tell Misty how you feel", fix the Hunt power label, remove the Food journal tile, add the peak bar with what's missing, and make the speech bubbles small and fit the interface.
- **Meals:** the meal photo check times out. Logging a meal should save the photo and estimate and let Seven share it to Community.
- **Remove the old World map button** completely.
- **White boxes** appear in the animation when leaving a world.
- **Mirror mode:** put it at the top of Move, two taps from Home.

## New request, not started: grocery bucket

Seven noticed while grocery shopping that there's nowhere to keep scanned products. In order, as small tasks:

1. **After a scan:** "Add to bucket" or "Skip". The bucket lists the items with price and points, and shows the total price for the shop Seven is in (let them pick the shop or enter a price if it isn't known) and the total points. Save it per day.
2. **Today's groceries:** at the end of the day, show what was bought, with suggestions for what to cook from it.
3. **Log what was cooked** from those groceries, as text or a photo.

## Still open

- **The crash going from Community into the chat** has no cause yet. The fix for the chat background stuck on Home doesn't explain it.
- **Bug hunt and code check:** both are scheduled to run around the clock, but their recent runs stopped at the limit.
