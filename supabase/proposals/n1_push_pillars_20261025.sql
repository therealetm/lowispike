-- LOWiSPIKE phone notifications, four pillars (25 Oct 2026). Applied to the live project by Maya (task 'real phone
-- notifications, four pillars'). Additive only: the existing n1_push rows keep working.
-- uid ties a phone subscription to an account (so energy can reach someone who is offline) and goes away with the account.
alter table public.n1_push
  add column if not exists uid uuid references auth.users(id) on delete cascade,
  add column if not exists pillars jsonb,
  add column if not exists cn text,
  add column if not exists d_miss integer not null default 0,
  add column if not exists last_d bigint,
  add column if not exists last_a bigint,
  add column if not exists last_b bigint,
  add column if not exists last_tpl text,
  add column if not exists energy_q jsonb not null default '[]'::jsonb,
  add column if not exists energy_day text,
  add column if not exists energy_n integer not null default 0,
  add column if not exists last_e bigint;
create index if not exists n1_push_uid_idx on public.n1_push (uid);

-- who sent energy to whom, only for the push limits (one push per pair every 6 hours, 30 a day per sender)
create table if not exists public.n1_energy_log (
  id bigserial primary key,
  from_uid uuid not null references auth.users(id) on delete cascade,
  to_uid uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists n1_energy_log_pair_idx on public.n1_energy_log (from_uid, to_uid, at desc);
create index if not exists n1_energy_log_from_idx on public.n1_energy_log (from_uid, at desc);
alter table public.n1_energy_log enable row level security;
revoke all on public.n1_energy_log from anon, authenticated;

-- keep the log small: anything older than 3 days is useless for the limits
create or replace function public.n1_energy_log_trim() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  delete from public.n1_energy_log where at < now() - interval '3 days';
  return null;
end $$;
drop trigger if exists n1_energy_log_trim on public.n1_energy_log;
create trigger n1_energy_log_trim after insert on public.n1_energy_log for each statement execute function public.n1_energy_log_trim();
