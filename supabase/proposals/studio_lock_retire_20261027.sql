-- Studio lock retired (27 Oct 2026).
-- Emmanuel, with a screenshot of the locked Studio tab: "Also, um remove this we can open it up now. Delete the password or whatever."
-- Studio in Community is open for everyone; the app no longer asks the server (studio-lock.js, studio-gate.js are gone).
-- This removes the server half of the 25 Oct lock (studio_lock_20261025.sql): the stored PIN hash, the remembered devices,
-- the PIN tries and the three functions. Run it only once a build without the lock is live: an older cached app that still
-- asks studio_access() keeps Studio locked when the function is gone (it never opens by mistake).
-- admin_delete_account() checks to_regclass() before it touches studio_passes / studio_pin_tries, so it keeps working.

drop function if exists public.studio_access(text);
drop function if exists public.studio_unlock(text);
drop function if exists public.studio_forget_devices();
drop table if exists public.studio_passes;
drop table if exists public.studio_pin_tries;
drop table if exists public.studio_lock;
