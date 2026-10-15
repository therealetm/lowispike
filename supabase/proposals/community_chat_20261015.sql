-- REVIEW PROPOSAL ONLY. Not a production migration and not executed by this branch.
-- First export live columns, pg_policies, grants, constraints and supabase_realtime membership.
-- Existing messages/reactions shapes below follow the supplied Oct 9 schema reference,
-- NOT a verified current backend. Reconcile differences before executing in staging.
begin;

create table public.community_identities (
 user_id uuid primary key references auth.users(id) on delete cascade,
 share_personality boolean not null default false,
 personality text not null default '',
 share_sign boolean not null default false,
 sign text not null default '',
 check ((not share_personality and personality = '') or
        (share_personality and personality ~ '^[IE][NS][TF][JP]$')),
 check ((not share_sign and sign = '') or
        (share_sign and sign in ('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces')))
);
alter table public.community_identities enable row level security;
revoke all on public.community_identities from anon, authenticated;
grant select, insert, update, delete on public.community_identities to authenticated;
create policy community_identity_read on public.community_identities for select to authenticated using (true);
create policy community_identity_insert on public.community_identities for insert to authenticated with check (user_id = (select auth.uid()));
create policy community_identity_update on public.community_identities for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy community_identity_delete on public.community_identities for delete to authenticated using (user_id = (select auth.uid()));

-- Private, directional block list. No one can enumerate someone else's blocks.
create table public.community_blocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 blocked_user_id uuid not null references auth.users(id) on delete cascade,
 primary key (user_id, blocked_user_id),
 check (user_id <> blocked_user_id)
);
alter table public.community_blocks enable row level security;
revoke all on public.community_blocks from anon, authenticated;
grant select, insert, update, delete on public.community_blocks to authenticated;
create policy community_block_read on public.community_blocks for select to authenticated using (user_id = (select auth.uid()));
create policy community_block_insert on public.community_blocks for insert to authenticated with check (user_id = (select auth.uid()));
create policy community_block_update on public.community_blocks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy community_block_delete on public.community_blocks for delete to authenticated using (user_id = (select auth.uid()));

-- Message bodies/health snapshots are not copied into reports.
-- No client moderator privileges. The project must assign a reviewer and retention policy.
-- Keep the message ID if an author deletes their message; do not cascade away a report.
create table public.community_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 message_id text not null check (char_length(message_id) between 1 and 64),
 reason text not null check (reason in ('harassment','spam','privacy','unsafe')),
 created_at timestamptz not null default now(),
 unique (reporter_id,message_id)
);
alter table public.community_reports enable row level security;
revoke all on public.community_reports from anon, authenticated;
grant select, insert on public.community_reports to authenticated;
create policy community_report_read_own on public.community_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy community_report_insert_own on public.community_reports for insert to authenticated with check (
 reporter_id = (select auth.uid()) and exists (
  select 1 from public.messages m where m.id = message_id and m.room = 'all' and m.user_id <> (select auth.uid())
 )
);
create index community_reports_review on public.community_reports (created_at);

-- Restrictive guards cap existing permissive policies rather than assuming their names.
-- Inspect role inheritance and ALL/UPDATE policies in the live export as well.
alter table public.messages enable row level security;
revoke all on public.messages from anon;
revoke update, truncate, references, trigger on public.messages from authenticated;
grant select, insert, delete on public.messages to authenticated;
create policy community_message_read on public.messages for select to authenticated using (room = 'all');
create policy community_message_read_guard on public.messages as restrictive for select to authenticated using (room = 'all');
create policy community_message_insert on public.messages for insert to authenticated with check (user_id = (select auth.uid()) and room = 'all');
create policy community_message_insert_guard on public.messages as restrictive for insert to authenticated with check (
 user_id = (select auth.uid()) and room = 'all' and char_length(btrim(body)) between 1 and 600 and char_length(who) <= 40
);
create policy community_message_delete on public.messages for delete to authenticated using (user_id = (select auth.uid()));
create policy community_message_delete_guard on public.messages as restrictive for delete to authenticated using (user_id = (select auth.uid()));
create policy community_message_no_edit on public.messages as restrictive for update to authenticated using (false) with check (false);
create index if not exists community_message_history on public.messages (room,created_at desc);

alter table public.reactions enable row level security;
revoke all on public.reactions from anon;
revoke update, truncate, references, trigger on public.reactions from authenticated;
grant select, insert, delete on public.reactions to authenticated;
create policy community_reaction_read on public.reactions for select to authenticated using (true);
create policy community_reaction_insert on public.reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy community_reaction_insert_guard on public.reactions as restrictive for insert to authenticated with check (
 user_id = (select auth.uid()) and emoji in ('❤️','👏','🙏','🌱','✨') and exists (
  select 1 from public.messages m where m.id = message_id and m.room = 'all'
 )
);
create policy community_reaction_delete on public.reactions for delete to authenticated using (user_id = (select auth.uid()));
create policy community_reaction_delete_guard on public.reactions as restrictive for delete to authenticated using (user_id = (select auth.uid()));
create policy community_reaction_no_edit on public.reactions as restrictive for update to authenticated using (false) with check (false);
-- Expected existing primary key: (message_id,user_id,emoji). Verify it before integration.

alter table public.messages replica identity full;
alter table public.reactions replica identity full;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
  alter publication supabase_realtime add table public.messages;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='reactions') then
  alter publication supabase_realtime add table public.reactions;
 end if;
end $$;

-- REQUIRED PRIVACY REVIEW, deliberately not executed automatically:
-- 1. Inspect all legacy public profile reads/writes (including old installed clients).
-- 2. Redact legacy profiles.bday and mbti/sign lacking recorded public consent.
--    Do not derive/share a birthday or health data from room membership.
-- 3. Protect against older clients republishing these fields (column grants or a reviewed trigger).
--    Do not drop private local birthdays or user_state backups as part of this change.
-- 4. New chat profiles only consume consent-filtered community_identities plus name/avatar/level.
-- Blocks here persist account preferences; they are not a database visibility boundary for
-- public messages and are not mutual bans or private-room access controls.
commit;
