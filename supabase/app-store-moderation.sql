-- LOWiSPIKE: Report + Block for Community (App Store guideline 1.2), Nov 3, 2026, branch app-store-prep.
--
-- WHY: community-chat.js saves a Report into public.community_reports (reporter_id, message_id, reason) and a Block into
-- public.community_blocks (user_id, blocked_user_id), and waits for the database to confirm. On Nov 3 both tables
-- answered 404 ("not found") on the live project vnfwmifmsfecascwaody, so Report and Block fail for every user.
-- Apple's reviewers try them in any app with user chat.
--
-- HOW: Supabase dashboard > SQL Editor > New query > paste this whole file > Run. Safe to run more than once.
-- Based on the moderation part of supabase/proposals/community_chat_20261015.sql, with the columns and reasons the
-- app sends today (harassment, spam, privacy, unsafe) and a report allowed in every room, not only 'all'.

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message_id text not null,
  reason text not null check (reason in ('harassment', 'spam', 'privacy', 'unsafe', 'other')),
  created_at timestamptz not null default now(),
  unique (reporter_id, message_id)
);

alter table public.community_reports enable row level security;

drop policy if exists "reporter can insert own report" on public.community_reports;
create policy "reporter can insert own report"
  on public.community_reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.messages m where m.id::text = message_id and m.user_id::text <> auth.uid()::text)
  );

drop policy if exists "reporter can read own reports" on public.community_reports;
create policy "reporter can read own reports"
  on public.community_reports for select to authenticated
  using (reporter_id = auth.uid());

create table if not exists public.community_blocks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

alter table public.community_blocks enable row level security;

drop policy if exists "user manages own blocks" on public.community_blocks;
create policy "user manages own blocks"
  on public.community_blocks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert on public.community_reports to authenticated;
grant select, insert, update, delete on public.community_blocks to authenticated;

-- Make the new tables visible to the app right away.
notify pgrst, 'reload schema';

-- Check afterwards: both columns should show the table name, not null.
-- select to_regclass('public.community_reports'), to_regclass('public.community_blocks');
-- Read reports: select * from public.community_reports order by created_at desc;
