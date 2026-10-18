// LOWiSPIKE owner-delete-account (Oct 18, 2026)
// Why: the app owner wants to remove test accounts for good. Supabase's documented way to delete a user is
// auth.admin.deleteUser() with the service role key, on a server only. This function is that server.
//   POST { ids: string[] (1-50 user ids), confirm: "DELETE" }   Authorization: Bearer <owner's access token>
//   -> { deleted: string[], failed: [{ id, reason }] }
// Who may call it: only a user listed in public.app_admins (created by supabase/proposals/owner_admin_20261018.sql).
// It refuses the caller's own account and any other owner. The service role key stays inside this function
// (Supabase injects SUPABASE_SERVICE_ROLE_KEY); it is never sent to the app. Nothing is logged about the accounts.
// What goes: the person's media files (media/<id>/...), their rows in reactions, post_likes, messages, posts,
// profiles, user_state and community_kicks, then the login itself.
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_IDS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const ROWS: Array<[string, string]> = [
  ["reactions", "user_id"], ["post_likes", "user_id"], ["messages", "user_id"], ["posts", "user_id"],
  ["user_state", "id"], ["community_kicks", "user_id"], ["profiles", "id"],
];

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
const missingTable = (e: { code?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205" || e.code === "42703");

async function removeMedia(id: string) {
  const { data } = await admin.storage.from("media").list(id, { limit: 1000 });
  const paths = (data || []).filter((f) => f && f.name).map((f) => `${id}/${f.name}`);
  if (paths.length) await admin.storage.from("media").remove(paths);
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
  try { body = await req.json(); } catch { return out(req, 400, { error: "bad_json" }); }
  if (body.confirm !== "DELETE") return out(req, 400, { error: "confirm_required" });
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((x) => typeof x === "string" && UUID.test(x)))] as string[] : [];
  if (!ids.length || ids.length > MAX_IDS) return out(req, 400, { error: "pick_1_to_50" });

  const deleted: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  for (const id of ids) {
    if (id === me.id) { failed.push({ id, reason: "self" }); continue; }
    if (ownerIds.has(id)) { failed.push({ id, reason: "owner" }); continue; }
    try {
      await removeMedia(id);
      let rowErr = "";
      for (const [table, col] of ROWS) {
        const { error } = await admin.from(table).delete().eq(col, id);
        if (error && !missingTable(error)) { rowErr = `${table}: ${error.message}`; break; }
      }
      if (rowErr) { failed.push({ id, reason: rowErr }); continue; }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error && !/not.?found/i.test(error.message)) { failed.push({ id, reason: error.message }); continue; }
      deleted.push(id);
    } catch (e) {
      failed.push({ id, reason: String((e as Error).message || e) });
    }
  }
  return out(req, 200, { deleted, failed });
});
