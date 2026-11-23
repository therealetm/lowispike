-- 23 Nov 2026 (Emmanuel: "the online timestamp didn't work for all of the accounts ... I can see people play the billiard game almost every
-- day ... there should be a way to figure out exactly the last time they opened the app"). profiles.last_seen only exists since today's
-- release, so people_seen() takes the latest of every trace an open app leaves: last_seen, the sign-in session refresh (an open app
-- refreshes it about every hour), the cloud save of their app state (user_state, saved while they use it, games included), their billiard shots (companion_rest.moved_by), their chat
-- messages, reactions, posts and likes. Returns only id + time, like the public profile.
create or replace function public.people_seen() returns table (id uuid, seen timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select p.id, nullif(greatest(
    coalesce(p.last_seen, 'epoch'),
    coalesce((select max(greatest(s.refreshed_at, s.updated_at, s.created_at)) from auth.sessions s where s.user_id = p.id), 'epoch'),
    coalesce((select max(u.updated_at) from public.user_state u where u.id = p.id), 'epoch'),
    coalesce((select max(m.created_at) from public.messages m where m.user_id = p.id), 'epoch'),
    coalesce((select max(r.created_at) from public.reactions r where r.user_id = p.id), 'epoch'),
    coalesce((select max(x.created_at) from public.posts x where x.user_id = p.id), 'epoch'),
    coalesce((select max(l.created_at) from public.post_likes l where l.user_id = p.id), 'epoch'),
    coalesce((select max(b.updated_at) from public.companion_rest b where b.moved_by = p.id), 'epoch'),
    coalesce((select u.last_sign_in_at from auth.users u where u.id = p.id), 'epoch')), 'epoch'::timestamptz)
  from public.profiles p;
$$;
revoke all on function public.people_seen() from public, anon;
grant execute on function public.people_seen() to authenticated;
