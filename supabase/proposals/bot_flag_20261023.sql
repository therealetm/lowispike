-- LOWiSPIKE bot flag (Oct 23, 2026). Emmanuel: "die ganzen Bots in der Leaderboard rausschmeißen und nur noch die
-- Menschen da drin haben" + "die Bots aus mein Circle". Server-side classification, never by display name:
-- an account is a bot when its sign-up e-mail is one only our own tools use:
--   crowdNNN@crowd.lowispike.invalid  (tools/community-crowd/crowd.cjs, the community crowd)
--   lowispike.gatetest+N@gmail.com    (gate-test accounts "Gatey"/"Guesty")
-- profiles.bot is written by a trigger on every insert/update, so no client can set or clear it. Bots stay in the
-- Community (galaxy, chat, daily photos); the app leaves them off the Ranking and the add-friend lists
-- (bot-accounts.js), and they can no longer be members of a Circle (user_room_members). Nothing is deleted except
-- bot memberships in Emmanuel's own Circles (there were none on Oct 23).
-- Part A
alter table public.profiles add column if not exists bot boolean not null default false;
create or replace function public.lowi_is_bot(uid uuid) returns boolean language sql stable security definer set search_path='' as $$select coalesce((select u.email like 'crowd%@crowd.lowispike.invalid' or u.email like 'lowispike.gatetest+%@gmail.com' from auth.users u where u.id=uid),false)$$;
revoke all on function public.lowi_is_bot(uuid) from public,anon,authenticated;
create or replace function public.profiles_botflag() returns trigger language plpgsql security definer set search_path='' as $$begin new.bot:=public.lowi_is_bot(new.id);return new;end$$;
drop trigger if exists profiles_zz_botflag on public.profiles;
create trigger profiles_zz_botflag before insert or update on public.profiles for each row execute function public.profiles_botflag();
-- Part B (backfill; the fairplay trigger is paused only for this one statement so no points change)
begin;alter table public.profiles disable trigger profiles_fairplay;update public.profiles set bot=public.lowi_is_bot(id) where bot is distinct from public.lowi_is_bot(id);alter table public.profiles enable trigger profiles_fairplay;commit;
-- Part C
create or replace function public.user_room_members_nobots() returns trigger language plpgsql security definer set search_path='' as $$begin if public.lowi_is_bot(new.user_id) then raise exception 'bot accounts cannot join circles' using errcode='42501';end if;return new;end$$;
drop trigger if exists user_room_members_zz_nobots on public.user_room_members;
create trigger user_room_members_zz_nobots before insert or update of user_id on public.user_room_members for each row execute function public.user_room_members_nobots();
delete from public.user_room_members m using public.user_rooms r where r.id=m.room_id and r.owner_id in ('83077af7-8475-4628-9328-25bd335db240','4add63ec-61d6-4187-9c62-bd78c427be24','d813675e-16b6-40e3-bedb-d6fe8b01af91','e81217a0-6658-4c00-bce2-bfe56de897a5') and public.lowi_is_bot(m.user_id);
-- Check
select (select count(*) from public.profiles where bot) bots,(select count(*) from public.profiles where not bot and coalesce(name,'')<>'') humans_named,(select count(*) from public.user_room_members m where public.lowi_is_bot(m.user_id)) bot_circle_members;
