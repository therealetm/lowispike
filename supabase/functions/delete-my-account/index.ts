// LOWiSPIKE delete-my-account (Oct 21, 2026)
// Why: App Store guideline 5.1.1(v) says an app with sign-up must let people start deleting their account inside the app.
// Settings > Delete account (home-settings-sleep-v2.js) calls this after the person confirmed. Deleting a login needs
// auth.admin.deleteUser() with the service role key, on a server only; this function is that server.
//   POST { confirm: "DELETE" }   Authorization: Bearer <the person's own access token>
//   -> 200 { ok: true }  or  4xx/5xx { ok: false, error }
// Who it deletes: only the signed-in caller, read from their own token. No ids are accepted, so nobody can delete anyone else.
// It refuses an owner account (public.app_admins), so the owner can't lock themselves out by accident.
// What goes (same list as owner-delete-account): media/<id>/..., their rows in reactions, post_likes, messages, posts,
// user_state, community_kicks and profiles, then the login itself. Nothing about the account is logged.
// Deploy once: supabase functions deploy delete-my-account   (Supabase injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).
import { createClient } from "npm:@supabase/supabase-js@2";

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
  if (req.method !== "POST") return out(req, 405, { ok: false, error: "method" });

  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = jwt ? await admin.auth.getUser(jwt) : { data: null };
  const me = who && who.user;
  if (!me) return out(req, 401, { ok: false, error: "signed_out" });

  let body: { confirm?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  if (body.confirm !== "DELETE") return out(req, 400, { ok: false, error: "confirm" });

  const { data: owners, error: ownErr } = await admin.from("app_admins").select("user_id");
  if (!ownErr && (owners || []).some((r: { user_id: string }) => r.user_id === me.id)) return out(req, 403, { ok: false, error: "owner" });

  try {
    await removeMedia(me.id);
    for (const [table, col] of ROWS) {
      const { error } = await admin.from(table).delete().eq(col, me.id);
      if (error && !missingTable(error)) return out(req, 500, { ok: false, error: `rows: ${table}` });
    }
    const { error } = await admin.auth.admin.deleteUser(me.id);
    if (error && !/not.?found/i.test(error.message)) return out(req, 500, { ok: false, error: "login" });
    return out(req, 200, { ok: true });
  } catch (e) {
    return out(req, 500, { ok: false, error: String((e as Error).message || e).slice(0, 120) });
  }
});
