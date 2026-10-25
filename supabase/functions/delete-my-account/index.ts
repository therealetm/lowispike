// LOWiSPIKE delete-my-account (Oct 21, 2026; rebuilt Oct 25, 2026)
// Why: App Store guideline 5.1.1(v) says an app with sign-up must let people delete their account inside the app.
// Settings > Delete account (home-settings-sleep-v2.js) and Community hold > Delete account (community-me.js) call this after
// the person confirmed.
//   POST { confirm: "DELETE", endpoint?: "<this phone's push subscription URL>" }
//   Authorization: Bearer <the person's own access token>
//   -> 200 { ok: true, media_left }   or   4xx/5xx { ok: false, error }   (an error always means nothing was deleted)
// Who it deletes: only the signed-in caller, read from their own token. No ids are accepted, so nobody can delete anyone else.
// It refuses an owner account (public.app_admins), so the owner can't lock themselves out by accident.
// Oct 25, 2026 (a tester got "We couldn't delete your account right now"): the function had never been deployed (404), and
// the old order (photos, then rows table by table, then the login) left half-deleted accounts whenever a later step failed;
// the login step always failed for anyone who had caught a product (products_caught_by_fkey via the lowi_rate_products
// trigger). Now: ONE database transaction, public.lowi_delete_account (supabase/proposals/delete_account_20261025.sql),
// deletes the login and every row (by cascade and by name) or nothing at all. Only after it committed are the photo and video
// files removed (best effort, retried once) and this phone's push subscription row dropped. Nothing about the account is logged.
// Deploy: supabase functions deploy delete-my-account --project-ref vnfwmifmsfecascwaody
//   (Supabase injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  const ok = ORIGINS.some((r) => r.test(o));
  return {
    "Access-Control-Allow-Origin": ok ? o : "https://therealetm.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
function out(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

// files go only after the account is gone; a failure here can't half-delete the account, it only leaves files behind
async function removeMedia(paths: string[]): Promise<number> {
  let left = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const part = paths.slice(i, i + 100);
    let { error } = await admin.storage.from("media").remove(part);
    if (error) ({ error } = await admin.storage.from("media").remove(part));
    if (error) left += part.length;
  }
  return left;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return out(req, 405, { ok: false, error: "method" });

  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = jwt ? await admin.auth.getUser(jwt) : { data: null };
  const me = who && who.user;
  if (!me) return out(req, 401, { ok: false, error: "signed_out" });

  let body: { confirm?: unknown; endpoint?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  if (body.confirm !== "DELETE") return out(req, 400, { ok: false, error: "confirm" });

  // the whole account in one transaction: on any error Postgres rolls back and nothing was deleted
  const { data, error } = await admin.rpc("lowi_delete_account", { uid: me.id });
  if (error) {
    if (/owner/.test(error.message || "")) return out(req, 403, { ok: false, error: "owner" });
    return out(req, 500, { ok: false, error: "db" });
  }
  const media: string[] = Array.isArray(data && data.media) ? data.media.filter((p: unknown) => typeof p === "string") : [];

  let mediaLeft = 0;
  try { mediaLeft = await removeMedia(media); } catch { mediaLeft = media.length; }

  // this phone stops getting pushes for an account that no longer exists (the row has no user id, only the device's URL)
  const ep = typeof body.endpoint === "string" ? body.endpoint : "";
  if (/^https:\/\//.test(ep) && ep.length < 2000) {
    try { await admin.from("n1_push").delete().eq("endpoint", ep); } catch { /* best effort */ }
  }
  return out(req, 200, { ok: true, media_left: mediaLeft });
});
