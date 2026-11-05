-- LOWiSPIKE feedback (Nov 5 2026)
-- Why: Emmanuel wants a feedback form in Settings, stored in its own backend collection, so he can read, transcribe, copy
-- and export everything for the developer. People record a voice note (the main way in), attach screenshots they can swipe
-- through while talking, and/or type, and may send without their name. The owner reads everything inside the app
-- (Settings > Feedback inbox): text, transcripts, screenshots, audio, Transcribe selected, Copy and Download package.
--
-- Run once: Supabase dashboard > SQL Editor > New query > paste this whole file > Run. Safe to run again.
-- Needs public.is_app_owner() from supabase/proposals/owner_admin_20261018.sql (live: the owner tools use it).
--
-- Files: private bucket 'feedback'. Every file sits under fb/<random submission key>/..., never under an account id.
-- Only the owner can read them (the app asks for short signed links).
-- Without name (anonymous): the row keeps no account id, no name and no device. The flood guard counts in a separate table
-- that has no link to any feedback row. Honest limit: Supabase itself still records which account uploaded each file
-- (storage.objects.owner_id), and a voice or a screenshot can identify someone. The app says so; it never says "fully anonymous".

begin;

do $$ begin
  if to_regprocedure('public.is_app_owner()') is null then
    raise exception 'Run supabase/proposals/owner_admin_20261018.sql first (public.is_app_owner() is missing).';
  end if;
end $$;

create table if not exists public.app_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid default auth.uid() references auth.users(id) on delete set null,
  anonymous   boolean not null default false,
  name        text check (char_length(name) <= 80),
  message     text check (char_length(message) <= 4000),
  transcript  text check (char_length(transcript) <= 20000),
  transcript_by text check (transcript_by in ('gemini', 'owner')),
  voice_path  text check (char_length(voice_path) <= 300),
  voice_secs  int  check (voice_secs between 0 and 600),
  shots       jsonb not null default '[]'::jsonb check (jsonb_typeof(shots) = 'array' and jsonb_array_length(shots) <= 30),
  lang        text check (char_length(lang) <= 8),
  app_version text check (char_length(app_version) <= 40),
  device      text check (char_length(device) <= 200),
  status      text not null default 'new' check (status in ('new', 'done')),
  constraint app_feedback_not_empty check (coalesce(char_length(message), 0) > 0 or voice_path is not null or jsonb_array_length(shots) > 0)
);
create index if not exists app_feedback_created on public.app_feedback (created_at desc);
alter table public.app_feedback enable row level security;

-- flood guard: counts per account per hour, kept apart from the feedback rows (no feedback id here)
create table if not exists public.app_feedback_rate (
  user_id uuid not null,
  hour    timestamptz not null,
  n       int not null default 0,
  primary key (user_id, hour)
);
alter table public.app_feedback_rate enable row level security;
revoke all on public.app_feedback_rate from anon, authenticated;

-- the server decides who sent it and checks the files really are the sender's own uploads
create or replace function public.app_feedback_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h timestamptz := date_trunc('hour', now()); cnt int; p text;
begin
  if me is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  insert into public.app_feedback_rate as r (user_id, hour, n) values (me, h, 1)
    on conflict (user_id, hour) do update set n = r.n + 1 returning r.n into cnt;
  delete from public.app_feedback_rate where hour < now() - interval '1 day';
  if cnt > 20 then raise exception 'feedback_rate_limited' using errcode = 'P0001'; end if;
  if new.anonymous then
    new.user_id := null; new.name := null; new.device := null;
  else
    new.user_id := me;
    new.name := (select left(pr.name, 80) from public.profiles pr where pr.id = me);
  end if;
  new.status := 'new';
  new.created_at := now();
  new.transcript := null; new.transcript_by := null;
  if new.voice_path is not null and new.voice_path !~ '^fb/[0-9a-z-]{8,40}/voice\.(m4a|webm|ogg|aac)$' then raise exception 'bad_voice_path' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(new.shots) s where jsonb_typeof(s) <> 'string' or s #>> '{}' !~ '^fb/[0-9a-z-]{8,40}/shot-[0-9]{1,2}\.jpg$') then
    raise exception 'bad_shot_path' using errcode = '22023';
  end if;
  -- every file named in the row must exist and be uploaded by this same account (nobody can attach someone else's files)
  for p in select s #>> '{}' from jsonb_array_elements(new.shots) s union all select new.voice_path where new.voice_path is not null loop
    if not exists (select 1 from storage.objects o where o.bucket_id = 'feedback' and o.name = p and o.owner_id = me::text) then
      raise exception 'feedback_file_missing' using errcode = '22023';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists app_feedback_guard on public.app_feedback;
create trigger app_feedback_guard before insert on public.app_feedback for each row execute function public.app_feedback_guard();

-- anyone signed in (guests too) may send
drop policy if exists "send feedback" on public.app_feedback;
create policy "send feedback" on public.app_feedback
  for insert to authenticated
  with check ((select auth.uid()) is not null and (user_id = (select auth.uid()) or (anonymous and user_id is null)));

-- only the owner reads, marks done, fills in transcripts and deletes
drop policy if exists "owner reads feedback" on public.app_feedback;
create policy "owner reads feedback" on public.app_feedback for select to authenticated using (public.is_app_owner());
drop policy if exists "owner updates feedback" on public.app_feedback;
create policy "owner updates feedback" on public.app_feedback for update to authenticated using (public.is_app_owner()) with check (public.is_app_owner());
drop policy if exists "owner deletes feedback" on public.app_feedback;
create policy "owner deletes feedback" on public.app_feedback for delete to authenticated using (public.is_app_owner());

revoke all on public.app_feedback from anon;
revoke all on public.app_feedback from authenticated;
grant insert (anonymous, message, voice_path, voice_secs, shots, lang, app_version, device) on public.app_feedback to authenticated;
grant select, delete on public.app_feedback to authenticated;
grant update (transcript, transcript_by, status) on public.app_feedback to authenticated;

-- upload flood guard for the bucket (security definer: a plain policy cannot count other rows of storage.objects)
create or replace function public.feedback_upload_ok() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    select count(*) from storage.objects o
    where o.bucket_id = 'feedback' and o.owner_id = auth.uid()::text and o.created_at > now() - interval '1 hour'
  ) < 400;
$$;
revoke all on function public.feedback_upload_ok() from public, anon;
grant execute on function public.feedback_upload_ok() to authenticated;

-- files: private bucket; screenshots are shrunk to JPEG in the app, voice notes up to 5 minutes; 8 MB per file at most
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 8388608, array['image/jpeg', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm'];

drop policy if exists "feedback upload" on storage.objects;
create policy "feedback upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and name ~ '^fb/[0-9a-z-]{8,40}/(shot-[0-9]{1,2}\.jpg|voice\.(m4a|webm|ogg|aac))$' and public.feedback_upload_ok());
drop policy if exists "feedback owner read" on storage.objects;
create policy "feedback owner read" on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and public.is_app_owner());
drop policy if exists "feedback owner delete" on storage.objects;
create policy "feedback owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'feedback' and public.is_app_owner());

commit;
