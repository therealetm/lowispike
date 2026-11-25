-- 25 Nov 2026 (Emmanuel: "I wanted it to be a link that shares the chat, just like a ChatGPT link ... why is my companion name in the link?").
-- A shared Misty chat is kept here and the link only carries its short id (lowispike.com/?chat=ID). The data is the conversation the
-- person chose to share (texts, small photo previews), never their companion's name. Nobody can list or browse shared chats: no table
-- access at all; share_chat() stores one (signed in, at most 40 a day, at most 300 KB) and get_shared_chat(id) reads one by its id.
create table if not exists public.shared_chats (id text primary key, data jsonb not null, by uuid not null, created_at timestamptz not null default now());
alter table public.shared_chats enable row level security;
revoke all on public.shared_chats from public, anon, authenticated;
create or replace function public.share_chat(p_data jsonb) returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if auth.uid() is null then raise exception 'sign_in'; end if;
  if octet_length(p_data::text) > 300000 then raise exception 'too_big'; end if;
  if (select count(*) from public.shared_chats where by = auth.uid() and created_at > now() - interval '1 day') >= 40 then raise exception 'limit'; end if;
  loop
    v := substr(translate(encode(decode(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 'hex'), 'base64'), '+/=', '-_'), 1, 10);
    exit when not exists (select 1 from public.shared_chats where id = v);
  end loop;
  insert into public.shared_chats (id, data, by) values (v, p_data, auth.uid());
  return v;
end $$;
create or replace function public.get_shared_chat(p_id text) returns jsonb language sql stable security definer set search_path = public as $$
  select data from public.shared_chats where id = p_id limit 1;
$$;
revoke all on function public.share_chat(jsonb) from public, anon;
grant execute on function public.share_chat(jsonb) to authenticated;
revoke all on function public.get_shared_chat(text) from public;
grant execute on function public.get_shared_chat(text) to anon, authenticated;
