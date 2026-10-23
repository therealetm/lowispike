-- 23 Oct 2026, LOWiSPIKE Ranking comparison (optional).
-- Eman asked to see, side by side, where another person's sunbeams came from (meals, scans, Moves, fasting, macro goals, water).
-- The profiles table only holds the week and month totals, so other phones cannot share that split yet. This adds one small text
-- column for it. Until it exists the app reads and writes nothing for it and simply says the split is not shared.
--
-- Format (written by ranking-core.js mixTag): cm1:<week Monday>:<7 numbers>;<month>:<7 numbers>
--   numbers in this order: meals.scans.moves.fasting.macro goals.water.other
-- The app only sends it while the owner shares their companion, and sends null when they stop.
-- Run once in the Supabase dashboard (SQL editor). Safe to run again.

alter table public.profiles add column if not exists care_mix text;

alter table public.profiles drop constraint if exists profiles_care_mix_format;
alter table public.profiles add constraint profiles_care_mix_format check (
  care_mix is null or care_mix ~ '^cm1:[0-9]{4}-[0-9]{2}-[0-9]{2}:[0-9]{1,3}(\.[0-9]{1,3}){6};[0-9]{4}-[0-9]{2}:[0-9]{1,3}(\.[0-9]{1,3}){6}$'
);

-- Existing row policies already limit updates to your own row; the new column follows them.
