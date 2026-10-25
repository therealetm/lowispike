# LOWiSPIKE phone notifications: strategy (25 Oct 2026)

Live since build 20261025-131344 (app) and n1-push v5 (server). Four kinds, each with its own switch under Settings > Reminders: your companion, energy received, For You, products. The fast-end push stays. Morning hello and evening streak pushes are gone.

## What we take from Duolingo
- **Server picks the message, per person.** Duolingo sends reminders from its servers and chooses each one from a pool of templates for that user (Yancey & Settles, "A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications", KDD 2020; the Substack write-up describes the same personalised, varied messages).
- **Recovering:** a template works less well when it was used recently. We already never repeat the last template (`last_tpl`), and tier by days away (1, 2-3, 4-7, 8+).
- **Sleeping:** some messages are not eligible for some people at some moments. Ours only exist when the fact is real: a real energy shot, a real For You post at a mealtime, a community-rated product near your shopping days, real days since you opened the app.
- **Next step (not built yet):** log opens per template (the tap already reaches the app with `?n1go=`), then pick templates with a softmax over open rate, discounted for recent use. That is the recovering-difference idea from the paper, at our small scale. Until there are enough opens, random among eligible templates (today's behaviour).

## What we refuse (Reddit's complaints about the owl)
- **No guilt trips, no playing dead or fading away.** A test (tests/lis-push-release.test.cjs) fails the build if any companion line in English, German or Spanish says fading, dying, sad, crying and the like.
- **No endless asking.** Companion pushes only on days the app was not opened, 10:00 to 20:00, once a day at most. Ignored ones back off: 3 misses means every 3 days, 6 means weekly, 10 misses or 30 days away means silence. The last line says so kindly: "No more knocking from me for a while."
- **Never about the body,** never a claim about food or behaviour the app did not log.
- **The person decides:** one "Can I message you?" card, never repeated after a no; four separate switches; quiet hours; a daily cap.

## Energy received
Every shot that lands is a row in public.energy_gifts. A database trigger (n1_energy_gift_push) asks n1-push to push it right away; cron flushes every 5 minutes as a fallback. Rows are claimed once (pushed_at), so nothing is pushed twice. No push when the receiver was online in the galaxy. One push per sender and receiver every 6 hours; several shots in half an hour become one summary.

## Proof
- tools/lis-push/mozilla-e2e.cjs acts as a phone on Mozilla's real push service: the Test push and an energy push (trigger path) both arrived and decrypted (25 Oct 2026, E2E PASS).
- Not proven: a real iPhone with the Home Screen app. Only a real phone can show that.
