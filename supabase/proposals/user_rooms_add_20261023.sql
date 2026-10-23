-- LOWiSPIKE Circles (formerly Rooms): the creator adds people directly, normal members can't. 30 max. (Emmanuel, 23 Oct 2026)
--
-- STATUS: the live database ALREADY behaves like this. Checked 23 Oct 2026 16:56 PDT with two fresh anonymous test accounts
-- against the live API: the creator inserting someone else -> 201, status 'member'; a member inserting someone else -> 403
-- (row-level security); someone asking for themselves -> 'pending'. The other Maya applied her version before her limit, but her
-- file never reached GitHub, so this file records the same rule. It is safe to run again (idempotent), but you don't need to.
--
-- Bots: the server refuses bot accounts in circles with the separate trigger in bot_flag_20261023.sql
-- ('bot accounts cannot join circles'). The app's Add people list also leaves out bots and test accounts.

-- you can ask for yourself; the creator can also add someone else
drop policy if exists user_room_members_ask on public.user_room_members;
create policy user_room_members_ask on public.user_room_members for insert to authenticated
 with check (user_id = (select auth.uid())
  or exists (select 1 from public.user_rooms r where r.id = room_id and r.owner_id = (select auth.uid())));

-- every ask is 'pending'; the creator's own row and anyone the creator adds are 'member'. 30 members max, checked under a row lock.
create or replace function public.user_room_members_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; n int;
begin
 select owner_id into owner from public.user_rooms where id = new.room_id for update;
 if owner is null then raise exception 'no such room' using errcode = 'P0001'; end if;
 if tg_op = 'INSERT' then
  new.status := case when new.user_id = owner or owner = auth.uid() then 'member' else 'pending' end;
 else
  if new.room_id <> old.room_id or new.user_id <> old.user_id then raise exception 'only the status can change' using errcode = 'P0001'; end if;
  new.who := old.who; new.created_at := old.created_at;
 end if;
 if new.status = 'member' and (tg_op = 'INSERT' or old.status <> 'member') then
  select count(*) into n from public.user_room_members where room_id = new.room_id and status = 'member';
  if n >= 30 then raise exception 'room full: at most 30 members' using errcode = 'P0001'; end if;
 end if;
 return new;
end $$;
drop trigger if exists user_room_members_guard on public.user_room_members;
create trigger user_room_members_guard before insert or update on public.user_room_members for each row execute function public.user_room_members_guard();
