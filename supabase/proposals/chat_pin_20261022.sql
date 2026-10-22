-- 22 Oct 2026, chat pinning (community-chat-core.js pinOf/pinBody): a pin is a message whose body starts with U+1F4CC U+2060.
-- The app only offers Pin/Unpin to the owner, and typed text can never become a marker, but the messages table lets any
-- signed-in member insert any body. This makes the server refuse pin markers from anyone but the app owner.
-- Needs public.is_app_owner() from owner_admin_20261018.sql. Run once in the Supabase SQL editor as the project owner.
create or replace function public.messages_pin_owner_only() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if left(coalesce(new.body, ''), 2) = U&'\+01F4CC\2060' and not public.is_app_owner() then
    raise exception 'only the app owner can pin messages' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists messages_pin_owner_only on public.messages;
create trigger messages_pin_owner_only before insert or update of body on public.messages
  for each row execute function public.messages_pin_owner_only();
