-- User-created Rooms (OWNER-REQUESTS 6, Emmanuel 23 Oct 2026): anyone creates a room (Discord style, e.g. same illness or goal).
-- Public: every signed-in member can see a room, who is in it and read its messages. Joining is by request; only the creator
-- lets people in. At most 30 members per room, enforced here on the server (not only in the app). Messages of a room live in the
-- existing public.messages table with room = 'u:<room id>'; only members of that room may post there.
-- Applied by Maya with the Supabase CLI (token maya-cli-20261023, Emmanuel's standing approval), 23 Oct 2026. Safe to re-run.
begin;

create table if not exists public.user_rooms (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 owner_name text not null default '' check (char_length(owner_name) <= 40),
 name text not null check (char_length(btrim(name)) between 2 and 40),
 topic text not null default '' check (char_length(topic) <= 140),
 icon text not null default '🫧' check (char_length(icon) between 1 and 8),
 created_at timestamptz not null default now()
);
create table if not exists public.user_room_members (
 room_id uuid not null references public.user_rooms(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 who text not null default '' check (char_length(who) <= 40),
 status text not null default 'pending' check (status in ('pending','member')),
 created_at timestamptz not null default now(),
 primary key (room_id, user_id)
);
create index if not exists user_room_members_user on public.user_room_members (user_id);

alter table public.user_rooms enable row level security;
alter table public.user_room_members enable row level security;
revoke all on public.user_rooms from anon, authenticated;
revoke all on public.user_room_members from anon, authenticated;
grant select, insert, delete on public.user_rooms to authenticated;
grant select, insert, update, delete on public.user_room_members to authenticated;

drop policy if exists user_rooms_read on public.user_rooms;
drop policy if exists user_rooms_create on public.user_rooms;
drop policy if exists user_rooms_delete on public.user_rooms;
create policy user_rooms_read on public.user_rooms for select to authenticated using (true);
create policy user_rooms_create on public.user_rooms for insert to authenticated with check (owner_id = (select auth.uid()));
create policy user_rooms_delete on public.user_rooms for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists user_room_members_read on public.user_room_members;
drop policy if exists user_room_members_ask on public.user_room_members;
drop policy if exists user_room_members_approve on public.user_room_members;
drop policy if exists user_room_members_leave on public.user_room_members;
create policy user_room_members_read on public.user_room_members for select to authenticated using (true);
-- you can only ask for yourself; the trigger below turns every ask into 'pending' (the creator's own row into 'member')
create policy user_room_members_ask on public.user_room_members for insert to authenticated with check (user_id = (select auth.uid()));
-- only the room's creator lets someone in
create policy user_room_members_approve on public.user_room_members for update to authenticated
 using (exists (select 1 from public.user_rooms r where r.id = room_id and r.owner_id = (select auth.uid())))
 with check (exists (select 1 from public.user_rooms r where r.id = room_id and r.owner_id = (select auth.uid())));
-- you can leave or take back your ask; the creator can decline an ask or remove someone
create policy user_room_members_leave on public.user_room_members for delete to authenticated
 using (user_id = (select auth.uid()) or exists (select 1 from public.user_rooms r where r.id = room_id and r.owner_id = (select auth.uid())));

-- at most 5 rooms per creator (no spam rooms)
create or replace function public.user_rooms_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
 new.owner_id := auth.uid();
 new.name := btrim(new.name);
 if (select count(*) from public.user_rooms where owner_id = new.owner_id) >= 5 then
  raise exception 'room limit: at most 5 rooms per person' using errcode = 'P0001';
 end if;
 return new;
end $$;
drop trigger if exists user_rooms_guard on public.user_rooms;
create trigger user_rooms_guard before insert on public.user_rooms for each row execute function public.user_rooms_guard();

-- the creator is the first member
create or replace function public.user_rooms_owner_joins() returns trigger language plpgsql security definer set search_path = public as $$
begin
 insert into public.user_room_members (room_id, user_id, who, status) values (new.id, new.owner_id, new.owner_name, 'member')
 on conflict (room_id, user_id) do update set status = 'member';
 return new;
end $$;
drop trigger if exists user_rooms_owner_joins on public.user_rooms;
create trigger user_rooms_owner_joins after insert on public.user_rooms for each row execute function public.user_rooms_owner_joins();

-- asks are pending; only status changes; max 30 members (row lock on the room, so two approvals at once cannot pass 30)
create or replace function public.user_room_members_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; n int;
begin
 select owner_id into owner from public.user_rooms where id = new.room_id for update;
 if owner is null then raise exception 'no such room' using errcode = 'P0001'; end if;
 if tg_op = 'INSERT' then
  new.status := case when new.user_id = owner then 'member' else 'pending' end;
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

-- messages in a user room ('u:<uuid>'): only its members may post. Everyone can read (the existing read policy).
create or replace function public.messages_user_room_members_only() returns trigger language plpgsql security definer set search_path = public as $$
begin
 if new.room like 'u:%' then
  if not exists (select 1 from public.user_room_members m where m.room_id::text = substr(new.room, 3) and m.user_id = new.user_id and m.status = 'member') then
   raise exception 'only members can write in this room' using errcode = '42501';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists messages_user_room_members_only on public.messages;
create trigger messages_user_room_members_only before insert on public.messages for each row execute function public.messages_user_room_members_only();

commit;
