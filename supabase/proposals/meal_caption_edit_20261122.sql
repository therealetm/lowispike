-- LOWiSPIKE: edit the text on screen of your own chat photo post afterwards (22 Nov 2026, Emmanuel: "if someone posted there and
-- they didn't add a text on screen, they should be able to add a text on screen afterwards").
-- messages has no update policy and keeps none: the only way to change a body is this function. It changes ONLY the caption of the
-- caller's OWN meal photo message: the old and new body must both start with the meal mark and the same photo token (the photo,
-- spike level and dish name), so the photo and its rating can never be swapped, and the body stays within the chat's 600 chars.
begin;
create or replace function public.set_meal_caption(msg_id text, new_body text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare old text; mark constant text := U&'\+01F37D' || ' ';
begin
  select body into old from public.messages where id = msg_id and user_id = (select auth.uid());
  if old is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if new_body is null or length(new_body) > 600 then raise exception 'bad body' using errcode = '22023'; end if;
  if left(old, 2) <> mark or left(new_body, 2) <> mark
     or split_part(old, ' ', 2) = '' or split_part(old, ' ', 2) <> split_part(new_body, ' ', 2) then
    raise exception 'only the caption may change' using errcode = '22023';
  end if;
  update public.messages set body = new_body where id = msg_id and user_id = (select auth.uid());
  return true;
end $$;
revoke execute on function public.set_meal_caption(text, text) from public, anon;
grant execute on function public.set_meal_caption(text, text) to authenticated;
commit;
