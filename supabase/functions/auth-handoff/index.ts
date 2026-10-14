// LOWiSPIKE auth-handoff (Oct 14, 2026)
// Why: on iPhone, Safari and the Home Screen app keep separate storage, so someone who signed in in Safari
// is signed out in the Home Screen app. This function carries the sign-in across with a one-time code:
//   issue  (signed in, in Safari):  Authorization: Bearer <access token>  -> { code, expires_in }
//   redeem (Home Screen app):       { code }                              -> { token_hash }  (client: auth.verifyOtp)
//   revoke (sign out):              Authorization: Bearer <access token>  -> { ok }
// Codes: 12 random chars (~59 bits), single use, 30 minutes, stored only as SHA-256 hashes in public.auth_handoff
// (RLS on, no policies: only this function, with the service role, can touch the table). Codes never go into URLs.
// Only real accounts (email, not anonymous guests) can issue. No tokens or codes are logged.
import { createClient } from "npm:@supabase/supabase-js@2";

const TTL_S = 30 * 60;
const MAX_PER_HOUR = 30;
const ABC = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
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
function newCode(): string {
  const b = new Uint8Array(12);
  let s = "";
  while (s.length < 12) {
    crypto.getRandomValues(b);
    for (const x of b) { if (x < 248 && s.length < 12) s += ABC[x % 31]; } // 248 = 8*31: no modulo bias
  }
  return s;
}
export function norm(c: unknown): string {
  const u = String(c || "").toUpperCase().slice(0, 400);
  const m = u.match(/LOWI[-\s]*([2-9A-HJKMNP-Z]{4})[-\s]*([2-9A-HJKMNP-Z]{4})[-\s]*([2-9A-HJKMNP-Z]{4})(?![0-9A-Z])/);
  if (m) return m[1] + m[2] + m[3];
  const s = u.replace(/[^0-9A-Z]/g, "");
  return /^[2-9A-HJKMNP-Z]{12}$/.test(s) ? s : "";
}
async function sha(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("lowi-handoff:" + s));
  return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function caller(req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data || !data.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action || "");
  const now = new Date();
  try {
    if (action === "issue" || action === "revoke") {
      const u = await caller(req);
      if (!u) return out(req, 401, { error: "auth" });
      // retire this person's open codes (a new one replaces them; sign-out kills them)
      await admin.from("auth_handoff").update({ expires_at: now.toISOString() }).eq("user_id", u.id).is("used_at", null).gt("expires_at", now.toISOString());
      if (action === "revoke") return out(req, 200, { ok: true });
      if (u.is_anonymous || !u.email) return out(req, 403, { error: "account" });
      const hourAgo = new Date(now.getTime() - 3600e3).toISOString();
      const { count } = await admin.from("auth_handoff").select("code_hash", { count: "exact", head: true }).eq("user_id", u.id).gt("created_at", hourAgo);
      if ((count || 0) >= MAX_PER_HOUR) return out(req, 429, { error: "rate" });
      const code = newCode();
      const ins = await admin.from("auth_handoff").insert({ code_hash: await sha(code), user_id: u.id, expires_at: new Date(now.getTime() + TTL_S * 1000).toISOString() });
      if (ins.error) return out(req, 500, { error: "store" });
      // housekeeping: forget codes older than a day
      admin.from("auth_handoff").delete().lt("created_at", new Date(now.getTime() - 86400e3).toISOString()).then(() => {}, () => {});
      return out(req, 200, { code, expires_in: TTL_S });
    }
    if (action === "redeem") {
      const code = norm(body.code);
      if (!code) return out(req, 400, { error: "code" });
      const { data, error } = await admin.from("auth_handoff").update({ used_at: now.toISOString() })
        .eq("code_hash", await sha(code)).is("used_at", null).gt("expires_at", now.toISOString()).select("user_id");
      if (error) return out(req, 500, { error: "store" });
      if (!data || !data.length) return out(req, 410, { error: "expired" });
      const got = await admin.auth.admin.getUserById(data[0].user_id);
      const u = got.data && got.data.user;
      if (!u || u.is_anonymous || !u.email || (u.banned_until && new Date(u.banned_until) > now)) return out(req, 410, { error: "expired" });
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email: u.email });
      const th = link.data && link.data.properties && link.data.properties.hashed_token;
      if (link.error || !th) return out(req, 500, { error: "link" });
      return out(req, 200, { token_hash: th });
    }
    return out(req, 400, { error: "action" });
  } catch (_e) {
    return out(req, 500, { error: "server" });
  }
});
