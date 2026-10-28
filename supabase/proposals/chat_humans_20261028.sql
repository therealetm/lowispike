-- LOWiSPIKE, 28 Oct 2026: Community chat for people only. NOT APPLIED YET (no Supabase dashboard access on 28 Oct: Emmanuel's
-- GitHub signs in with Google, which needs him in the live view). The app already leaves every bot message and bot reaction out
-- of the chat since release 20261028 (chat-humans-core.js), so this file only cleans the table and stops the writes at the source.
-- Emmanuel: "die Bot Sachen, die im Chat kommen, nur auf der For You Page leben ... nuken wir mal alle Nachrichten von Bot im Chat
-- ... lassen aber alles auf der For You Page."
-- Run in the SQL editor in this order. Bots = profiles.bot = true (server flag from the sign-up e-mail) or Nibblo's fixed id.
-- Never by name or text. Posts (For You) are not touched.

-- 0) look first: how many rows, and does any person's reply point at a bot message (reply_to is plain text, no foreign key in
--    community_chat_20261015.sql, so deleting is safe; the app shows such a quote as "Message unavailable")
select count(*) filter (where p.bot or m.user_id = '59bb3615-b344-4c45-ab0f-0a5de5cd8df3') as bot_msgs, count(*) as all_msgs
  from public.messages m left join public.profiles p on p.id = m.user_id;

-- 1) backup, readable by nobody but the service role (RLS on, no policy)
create table if not exists public.chat_bot_messages_backup_20261028 as
  select m.*, now() as backed_up_at from public.messages m left join public.profiles p on p.id = m.user_id
   where coalesce(p.bot, false) or m.user_id = '59bb3615-b344-4c45-ab0f-0a5de5cd8df3';
create table if not exists public.chat_bot_reactions_backup_20261028 as
  select r.*, now() as backed_up_at from public.reactions r left join public.profiles p on p.id = r.user_id
   where coalesce(p.bot, false) or r.user_id = '59bb3615-b344-4c45-ab0f-0a5de5cd8df3'
      or r.message_id in (select id from public.chat_bot_messages_backup_20261028);
alter table public.chat_bot_messages_backup_20261028 enable row level security;
alter table public.chat_bot_reactions_backup_20261028 enable row level security;

-- 2) delete exactly the backed-up rows
delete from public.reactions r using public.chat_bot_reactions_backup_20261028 b
 where r.message_id = b.message_id and r.user_id = b.user_id and r.emoji = b.emoji;
delete from public.messages m using public.chat_bot_messages_backup_20261028 b where m.id = b.id;

-- 3) Nibblo stops writing into Chat: read the LIVE function first (it may differ from nibblo_meals_20261025.sql),
--    select pg_get_functiondef('public.nibblo_post(date,text,timestamptz)'::regprocedure);
--    then re-create it without its "insert into public.messages ..." statement. Keep the nibblo_log and posts inserts, the
--    schedule and the content exactly as they are.

-- 4) only together with 3): n1-push (supabase/functions/n1-push/index.ts, nbPost) still sends Nibblo's push only while the Chat
--    message nb-<day>-<slot> exists. Change it to read posts?id=eq.snb-<day>-<slot> (same created_at check), change the lunch
--    line "{f} just landed in Chat" / "ist gerade im Chat gelandet" / "acaba de llegar al chat" to For You / Für dich / Para ti,
--    deploy n1-push, and only then run 3). Since 28 Oct a tap on that push already opens For You at the post (lis-push.js).

-- undo: insert into public.messages select <columns of messages> from public.chat_bot_messages_backup_20261028; (same for reactions)
