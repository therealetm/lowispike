// LOWiSPIKE owner-delete-account (Oct 18, 2026; rebuilt Oct 26, 2026)
// Why: the admin deletes accounts for good. Oct 26, 2026 Emmanuel: "I removed it, and it's still there. This should be
// deleting their accounts. Fix it." The Community person card's ADMIN button (community-remove.js) and the owner tool
// (owner-admin.js) both call this after the admin confirmed.
//   POST { ids: string[] (1-50 user ids), confirm: "DELETE" }   Authorization: Bearer <the admin's own access token>
//   -> 200 { deleted: string[], failed: [{ id, reason }], media_left }   (an id is in deleted only once the server deleted it)
//   -> 401 not_signed_in | 403 not_owner | 400 confirm/ids
// Who may call it: only a user listed in public.app_admins. Each delete runs public.community_delete_account WITH THE
// CALLER'S OWN TOKEN, so the database checks again who is asking (auth.uid(): admins only, never yourself, never another
// admin, rate limited) and deletes the login and every row in ONE transaction (public.lowi_delete_account), plus a tombstone
// in public.community_deleted so every phone hides the person from its caches too. Only after that committed are their
// photo and video files removed with the service role (best effort, retried once). The service role key stays inside this
// function (Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY); it is never sent to the app.
// SQL: supabase/proposals/admin_delete_account_20261026.sql
// Deploy: supabase functions deploy owner-delete-account --project-ref vnfwmifmsfecascwaody --use-api
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_IDS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
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

function reasonOf(msg: string): string {
  for (const r of ["not_admin", "not_yourself", "target_is_admin", "rate_limited", "owner"]) if (msg.includes(r)) return r;
  return "db";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return out(req, 405, { error: "method" });

  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = jwt ? await admin.auth.getUser(jwt) : { data: null };
  const me = who && who.user;
  if (!me) return out(req, 401, { error: "not_signed_in" });

  const { data: owners, error: ownErr } = await admin.from("app_admins").select("user_id");
  if (ownErr) return out(req, 503, { error: "owner_setup_missing" });
  const ownerIds = new Set((owners || []).map((r: { user_id: string }) => r.user_id));
  if (!ownerIds.has(me.id)) return out(req, 403, { error: "not_owner" });

  let body: { ids?: unknown; confirm?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  if (body.confirm !== "DELETE") return out(req, 400, { error: "confirm" });
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((x) => typeof x === "string" && UUID.test(x)))] as string[] : [];
  if (!ids.length || ids.length > MAX_IDS) return out(req, 400, { error: "ids" });

  // the database call runs as the admin (their token), so auth.uid() and the guard in SQL see who is asking
  const asCaller = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const deleted: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  let mediaLeft = 0;
  for (const id of ids) {
    if (id === me.id) { failed.push({ id, reason: "not_yourself" }); continue; }
    if (ownerIds.has(id)) { failed.push({ id, reason: "target_is_admin" }); continue; }
    const { data, error } = await asCaller.rpc("community_delete_account", { target: id });
    if (error) { failed.push({ id, reason: reasonOf(error.message || "") }); continue; }
    deleted.push(id); // deleted now, or already gone (data.gone): either way the account no longer exists
    const media: string[] = Array.isArray(data && data.media) ? data.media.filter((p: unknown) => typeof p === "string") : [];
    try { mediaLeft += await removeMedia(media); } catch { mediaLeft += media.length; }
  }
  return out(req, 200, { deleted, failed, media_left: mediaLeft });
});
