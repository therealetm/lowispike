-- 23 Nov 2026 (Emmanuel: everyone using the app is asked to rate it; the reviews show on lowispike.com with the person's picture,
-- stars, words and an optional voice note that is also transcribed). One review per person, about the app itself.
create table if not exists public.app_reviews (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  voice_url text check (voice_url is null or voice_url like 'https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/%'),
  transcript text not null default '' check (char_length(transcript) <= 2000),
  lang text not null default 'en' check (lang in ('en','de','es')),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_reviews enable row level security;
drop policy if exists app_reviews_own_read on public.app_reviews;
drop policy if exists app_reviews_own_insert on public.app_reviews;
drop policy if exists app_reviews_own_update on public.app_reviews;
drop policy if exists app_reviews_owner_all on public.app_reviews;
create policy app_reviews_own_read on public.app_reviews for select to authenticated using (user_id = auth.uid());
create policy app_reviews_own_insert on public.app_reviews for insert to authenticated with check (user_id = auth.uid() and hidden = false);
create policy app_reviews_own_update on public.app_reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy app_reviews_owner_all on public.app_reviews for all to authenticated using (public.is_app_owner()) with check (public.is_app_owner());
revoke all on public.app_reviews from anon, authenticated;
grant select, insert on public.app_reviews to authenticated;
-- a person can change their own words, stars and voice note, never the hidden flag (the owner hides with the owner policy)
grant update (stars, body, voice_url, transcript, lang, updated_at) on public.app_reviews to authenticated;
grant update (hidden) on public.app_reviews to authenticated;   -- only passes the owner policy's check for others' rows
create or replace function public.app_reviews_guard() returns trigger language plpgsql as $$
begin
  if not public.is_app_owner() then new.hidden := old.hidden; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists app_reviews_guard on public.app_reviews;
create trigger app_reviews_guard before update on public.app_reviews for each row execute function public.app_reviews_guard();
-- what the website shows: visible reviews with the person's first name and picture from their profile (no ids, no emails)
create or replace view public.app_reviews_public as
  select r.stars, r.body, r.voice_url, r.transcript, r.lang, r.created_at,
         coalesce(nullif(split_part(trim(p.name), ' ', 1), ''), 'LOWiSPIKE member') as name, p.avatar
  from public.app_reviews r join public.profiles p on p.id = r.user_id
  where not r.hidden and coalesce(p.bot, false) = false and coalesce(p.test, false) = false;
grant select on public.app_reviews_public to anon, authenticated;
