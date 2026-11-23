-- 23 Nov 2026 (Emmanuel, People list: "I want a timestamp for everyone on here so I can see when they were last online").
-- profiles.last_seen: set by the app while it is open (last-seen.js -> touch_seen()), readable like the rest of the public profile.
alter table public.profiles add column if not exists last_seen timestamptz;
create or replace function public.touch_seen() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen = now()
  where id = auth.uid() and (last_seen is null or last_seen < now() - interval '2 minutes');
$$;
revoke all on function public.touch_seen() from public, anon;
grant execute on function public.touch_seen() to authenticated;
-- a first value for everyone: their last sign-in or their newest chat message, whichever is later
update public.profiles p set last_seen = greatest(
  (select u.last_sign_in_at from auth.users u where u.id = p.id),
  (select max(m.created_at) from public.messages m where m.user_id = p.id))
where p.last_seen is null;
