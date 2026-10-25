# Handoff: Nibblo, the inspiration bot (25 Oct 2026)

What it does: posts one Recipe Book meal photo with a short playful caption to the main Chat and For You at 07:30, 12:30 and 18:30 Europe/Berlin. Server-side (pg_cron), so it runs with nobody online. No push.

- Menu, texts (EN/DE/ES), slot times, ids: `nibblo-core.js` (the one source). Change it there, then `node tools/nibblo/gen-sql.cjs` and run `supabase/proposals/nibblo_meals_20261025.sql` against production (safe to re-run; it replaces the menu, keeps the log).
- Production objects: bot account uid 59bb3615-b344-4c45-ab0f-0a5de5cd8df3 (profiles.bot = true), tables nibblo_menu / nibblo_intro / nibblo_log (RLS on, no policies), functions nibblo_post(day, slot, at) and nibblo_tick(now), cron job `nibblo-meals` (*/5). Photos: storage media/59bb3615-.../meal-nb-<id>.webp (copied from fy-img/ and FOOD_IMG).
- Check it ran: `select * from nibblo_log order by posted_at desc;` and `select * from cron.job_run_details where jobid=(select jobid from cron.job where jobname='nibblo-meals') order by start_time desc limit 5;`
- Pause it: `select cron.unschedule('nibblo-meals');`. Post one by hand: `select public.nibblo_post(current_date, 'e');` (once per day and slot).
- Client: community-chat.js photoOf -> LowiNibblo.chatPhoto (caption in the phone's language); index.html mapPost -> LowiNibblo.post (For You caption + small Bot tag via p.nb).
- Tests: tests/nibblo-meals.test.cjs.
