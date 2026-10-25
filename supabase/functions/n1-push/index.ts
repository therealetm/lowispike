/* LOWiSPIKE N1 part 2: phone notifications. One edge function, two callers:
   - the app (POST {a:"save"|"unsub"|"test", sub:{endpoint, keys:{p256dh, auth}}, st:{...}}) stores its push subscription
     and the little snapshot the nudges need (language, time zone, reminder settings, fast start + goal, quests open today,
     streak, last time the app was open). The push endpoint itself is the secret, no account needed.
   - pg_cron every 5 minutes (header x-n1-key) sends the timed nudges: morning hello, fast end with the clock time,
     evening streak saver, bedtime "close your day" (E1 part 2); quiet hours and how often respected. Gone subscriptions (404/410) are deleted.
   25 Oct 2026, four pillars (pillars.ts): the app may send its login token (tok) so a subscription belongs to an account,
   the companion name (cn) and which pillars are on; action "energy" lets a sender's phone ask for a push to the receiver's
   phones (also when the receiver is offline), checked against the sender's login and limited per pair; the morning and
   evening nudges are replaced by the companion (D), For You (A) and product (B) pushes. */
import { after, decide, okEndpoint, push, type Row, words, lang } from "./logic.ts";
import { afterPillar, decidePillar, energyNow, energyNudge, energyOpen, on, safeName, type Ctx, type PRow } from "./pillars.ts";

const URL0 = Deno.env.get("SUPABASE_URL")!, SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWK = JSON.parse(Deno.env.get("N1_VAPID_JWK") || "{}"), PUB = Deno.env.get("N1_VAPID_PUB") || "", CRON = Deno.env.get("N1_CRON_KEY") || "";
const SUBJ = "https://therealetm.github.io/lowispike/";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const H = { apikey: SRK, Authorization: "Bearer " + SRK, "Content-Type": "application/json" };
const T = "/rest/v1/n1_push";

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(URL0 + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text(); if (!r.ok) throw new Error("db " + r.status + " " + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
const eq = (e: string) => "endpoint=eq." + encodeURIComponent(e);
const int = (v: unknown, a: number, b: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= a && n <= b ? n : null; };
const str = (v: unknown, n: number) => typeof v === "string" ? v.slice(0, n) : null;

function clean(st: Record<string, unknown>) {
  return {
    lang: str(st.lang, 5), tz: str(st.tz, 64), tzo: int(st.tzo, -900, 900),
    enabled: st.enabled !== false, freq: ["few", "normal", "more"].includes(st.freq as string) ? st.freq : "normal",
    qs: int(st.qs, 0, 24) ?? 22, qe: int(st.qe, 0, 23) ?? 7,
    fast_last: int(st.fast_last, 0, 9e15), fast_h: int(st.fast_h, 1, 96),
    day: typeof st.day === "string" && /^\d{4}-\d\d-\d\d$/.test(st.day) ? st.day : null,
    open: int(st.open, 0, 50), total: int(st.total, 0, 50), streak: int(st.streak, 0, 100000), seen: int(st.seen, 0, 9e15),
    e1_closed: typeof st.e1c === "string" && /^\d{4}-\d\d-\d\d$/.test(st.e1c) ? st.e1c : null,
    e1_inv: typeof st.e1i === "string" && /^\d{4}-\d\d-\d\d$/.test(st.e1i) ? st.e1i : null,
    ...(typeof st.cn === "string" ? { cn: safeName(st.cn) } : {}),
    ...(st.pillars && typeof st.pillars === "object" ? { pillars: pills(st.pillars as Record<string, unknown>) } : {}),
    updated_at: new Date().toISOString(),
  };
}

function pills(p: Record<string, unknown>) { const o: Record<string, boolean> = {}; for (const k of ["a", "b", "c", "d"]) o[k] = p[k] !== false && p[k] !== 0; return o; }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* the account behind a login token, checked by Supabase Auth itself; null when missing or not valid */
async function who(tok: unknown): Promise<string | null> {
  if (typeof tok !== "string" || tok.length < 20 || tok.length > 4000) return null;
  try {
    const r = await fetch(URL0 + "/auth/v1/user", { headers: { apikey: SRK, Authorization: "Bearer " + tok } });
    if (!r.ok) return null; const u = await r.json(); return u && typeof u.id === "string" && UUID.test(u.id) ? u.id : null;
  } catch (_e) { return null; }
}

async function fromApp(b: Record<string, unknown>) {
  const sub = (b.sub || {}) as Record<string, unknown>, keys = (sub.keys || {}) as Record<string, unknown>;
  const endpoint = sub.endpoint as string;
  if (!okEndpoint(endpoint)) return J({ ok: false, err: "endpoint" }, 400);
  if (b.a === "unsub") { await db(T + "?" + eq(endpoint), { method: "DELETE" }); return J({ ok: true }); }
  const p256dh = str(keys.p256dh, 200), auth = str(keys.auth, 100);
  if (!p256dh || !auth || p256dh.length < 80 || auth.length < 16) return J({ ok: false, err: "keys" }, 400);
  const row: Record<string, unknown> = { endpoint, p256dh, auth, ...clean((b.st || {}) as Record<string, unknown>) };
  const uid = await who(b.tok); if (uid) row.uid = uid;
  await db(T + "?on_conflict=endpoint", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
  if (b.a === "test") {
    const cur = (await db(T + "?select=last_test&" + eq(endpoint)))[0] || {};
    const now = Date.now(); if (cur.last_test && now - cur.last_test < 20000) return J({ ok: true, sent: false, wait: true });
    await db(T + "?" + eq(endpoint), { method: "PATCH", body: JSON.stringify({ last_test: now }) });
    const st = await push(row as Row, { t: "LOWiSPIKE", b: words(lang(row as Row), "test"), q: "", tag: "lowi-test" }, 600, JWK, PUB, SUBJ, "high");
    if (st === 404 || st === 410) await db(T + "?" + eq(endpoint), { method: "DELETE" });
    return J({ ok: st >= 200 && st < 300, sent: st >= 200 && st < 300, status: st });
  }
  return J({ ok: true });
}

/* what A and B can talk about: real recent feed photos (not test accounts) and community-rated products */
async function context(now: number): Promise<Ctx> {
  const ctx: Ctx = {};
  try {
    const since = new Date(now - 3 * 864e5).toISOString();
    const [posts, tests] = await Promise.all([
      db("/rest/v1/posts?select=id,who,cap,user_id,created_at&photo_url=not.is.null&cap=not.is.null&created_at=gte." + since + "&order=created_at.desc&limit=40"),
      db("/rest/v1/profiles?select=id&or=(test.eq.true,bot.eq.true)&limit=1000"),
    ]);
    const bad = new Set((tests || []).map((x: { id: string }) => x.id));
    ctx.posts = (posts || []).filter((p: { user_id?: string; cap?: string }) => !(p.user_id && bad.has(p.user_id)) && (p.cap || "").trim().length > 3)
      .map((p: { id: string; who: string; cap: string; user_id?: string; created_at: string }) => ({ id: p.id, who: p.who, cap: p.cap, user_id: p.user_id, at: Date.parse(p.created_at) }));
  } catch (_e) { ctx.posts = []; }
  try {
    ctx.products = await db("/rest/v1/products?select=id,name,brand,store,verdict&hidden=eq.false&verdict=in.(better,ok)&order=catches.desc&limit=60") || [];
  } catch (_e) { ctx.products = []; }
  return ctx;
}

async function send(r: PRow, n: { id: string; title: string; body: string; q: string; ttl: number }, now: number, urgency = "normal") {
  const st = await push(r, { t: n.title, b: n.body, q: n.q, tag: "lowi-" + n.id.replace(/^e.*/, "e") }, n.ttl, JWK, PUB, SUBJ, urgency);
  if (st === 404 || st === 410) { await db(T + "?" + eq(r.endpoint), { method: "DELETE" }); return "gone"; }
  if (st >= 200 && st < 300) { await db(T + "?" + eq(r.endpoint), { method: "PATCH", body: JSON.stringify({ ...after(r, n, now), ...afterPillar(r, n, now), fails: 0 }) }); return "sent"; }
  const f = (+((r as Record<string, unknown>).fails as number) || 0) + 1;
  if (f >= 6) await db(T + "?" + eq(r.endpoint), { method: "DELETE" }); else await db(T + "?" + eq(r.endpoint), { method: "PATCH", body: JSON.stringify({ fails: f, last_push: now }) });
  return "fail:" + st;
}

async function cron(dry: boolean, at?: number) {
  const rows: PRow[] = await db(T + "?select=*&enabled=eq.true&limit=2000");
  const now = at || Date.now(), out: unknown[] = []; let sent = 0, gone = 0, fail = 0;
  const ctx = await context(now);
  await Promise.all(rows.map(async r => {
    const n = decide(r, now) || decidePillar(r, now, ctx); if (!n) return;
    if (dry) { out.push({ e: r.endpoint.slice(0, 40), n }); return; }
    try {
      const res = await send(r, n, now);
      if (res === "sent") sent++; else if (res === "gone") gone++; else { fail++; out.push({ e: r.endpoint.slice(0, 40), st: res }); }
    } catch (e) { fail++; out.push({ e: r.endpoint.slice(0, 40), err: String(e).slice(0, 120) }); }
  }));
  return J({ ok: true, rows: rows.length, sent, gone, fail, out });
}

/* C: energy received. The sender's phone calls this after a shot lands on a real person. One push per sender and receiver
   every 6 hours, at most 30 a day per sender; the receiver's quiet hours, cap and half-hour bundling decide between now and
   the queue (sent later by cron as one summary). Nothing when the receiver has the app open on that device. */
async function energy(b: Record<string, unknown>) {
  const from = await who(b.tok); if (!from) return J({ ok: false, err: "login" }, 401);
  const to = String(b.to || ""); if (!UUID.test(to) || to === from) return J({ ok: false, err: "to" }, 400);
  const prof: { id: string; name?: string; bot?: boolean; test?: boolean }[] = await db("/rest/v1/profiles?select=id,name,bot,test&id=in.(" + from + "," + to + ")");
  const sp = prof.find(p => p.id === from), rp = prof.find(p => p.id === to);
  if (!rp || rp.bot || (rp.test && !(sp && sp.test))) return J({ ok: true, sent: 0, why: "target" }); /* test accounts only reach test accounts */
  const now = Date.now();
  const pair = await db("/rest/v1/n1_energy_log?select=at&from_uid=eq." + from + "&to_uid=eq." + to + "&at=gte." + new Date(now - 6 * 36e5).toISOString() + "&limit=1");
  if (pair.length) return J({ ok: true, sent: 0, why: "pair" });
  const day = await db("/rest/v1/n1_energy_log?select=at&from_uid=eq." + from + "&at=gte." + new Date(now - 864e5).toISOString() + "&limit=31");
  if (day.length >= 30) return J({ ok: true, sent: 0, why: "sender" });
  await db("/rest/v1/n1_energy_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ from_uid: from, to_uid: to }) });
  const name = safeName(sp && sp.name, 24) || "?";
  const rows: PRow[] = await db(T + "?select=*&enabled=eq.true&uid=eq." + to + "&limit=10");
  let sent = 0, queued = 0, skipped = 0;
  for (const r of rows) {
    if (!on(r, "c")) { skipped++; continue; }
    if (r.seen && now - r.seen < 2 * 6e4) { skipped++; continue; }
    if (energyOpen(r, now)) { const res = await send(r, energyNow(r, name), now, "high"); if (res === "sent") { sent++; continue; } }
    const q = (Array.isArray(r.energy_q) ? r.energy_q : []).filter(x => x && now - x.at < 3 * 864e5).slice(-9);
    q.push({ n: name, at: now });
    await db(T + "?" + eq(r.endpoint), { method: "PATCH", body: JSON.stringify({ energy_q: q }) }); queued++;
  }
  return J({ ok: true, sent, queued, skipped, devices: rows.length });
}

/* C, server side (25 Oct 2026, release task): every energy shot that lands is a row in public.energy_gifts (galaxy task,
   limits enforced there). A database trigger calls this action right after each insert, and cron calls it every 5 minutes as
   a fallback. Rows are claimed first (pushed_at set in one update that only takes rows still open), so two runs never push
   the same shot twice. A receiver who was online in the galaxy saw it happen: no push. One push per sender and receiver
   every 6 hours (n1_energy_log, shared with the older app hook); the receiver's quiet hours, cap and half-hour bundling
   decide between now and the queue. No secret needed: it only ever handles shots the database already accepted. */
async function gifts() {
  const since = new Date(Date.now() - 3 * 864e5).toISOString(), stamp = new Date().toISOString();
  const claimed: { id: number; from_id: string; to_id: string; to_online: boolean }[] = await db(
    "/rest/v1/energy_gifts?pushed_at=is.null&seen_at=is.null&created_at=gte." + since + "&select=id,from_id,to_id,to_online",
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ pushed_at: stamp }) }) || [];
  const todo = claimed.filter(g => !g.to_online && UUID.test(g.from_id) && UUID.test(g.to_id));
  if (!todo.length) return J({ ok: true, claimed: claimed.length, sent: 0, queued: 0 });
  const ids = [...new Set(todo.flatMap(g => [g.from_id, g.to_id]))];
  const prof: { id: string; name?: string }[] = await db("/rest/v1/profiles?select=id,name&id=in.(" + ids.join(",") + ")") || [];
  const nameOf = (id: string) => safeName((prof.find(p => p.id === id) || {}).name, 24) || "?";
  const now = Date.now(); let sent = 0, queued = 0, skipped = 0;
  const byTo = new Map<string, string[]>();
  for (const g of todo) {
    const pair = await db("/rest/v1/n1_energy_log?select=at&from_uid=eq." + g.from_id + "&to_uid=eq." + g.to_id + "&at=gte." + new Date(now - 6 * 36e5).toISOString() + "&limit=1");
    if (pair.length) { skipped++; continue; }
    await db("/rest/v1/n1_energy_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ from_uid: g.from_id, to_uid: g.to_id }) });
    const l = byTo.get(g.to_id) || []; const n = nameOf(g.from_id); if (l.indexOf(n) < 0) l.push(n); byTo.set(g.to_id, l);
  }
  for (const [to, names] of byTo) {
    const rows: PRow[] = await db(T + "?select=*&enabled=eq.true&uid=eq." + to + "&limit=10") || [];
    for (const r of rows) {
      if (!on(r, "c")) { skipped++; continue; }
      if (r.seen && now - r.seen < 2 * 6e4) { skipped++; continue; }
      if (energyOpen(r, now)) {
        const n = names.length === 1 ? energyNow(r, names[0]) : energyNudge(r, names);
        const res = await send(r, n, now, "high"); if (res === "sent") { sent++; continue; }
      }
      const q = (Array.isArray(r.energy_q) ? r.energy_q : []).filter(x => x && now - x.at < 3 * 864e5);
      for (const n of names) q.push({ n, at: now });
      await db(T + "?" + eq(r.endpoint), { method: "PATCH", body: JSON.stringify({ energy_q: q.slice(-9) }) }); queued++;
    }
  }
  return J({ ok: true, claimed: claimed.length, sent, queued, skipped });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return J({ ok: false }, 405);
  let b: Record<string, unknown> = {};
  try { const t = await req.text(); if (t.length > 8000) return J({ ok: false, err: "size" }, 413); b = t ? JSON.parse(t) : {}; } catch (_e) { return J({ ok: false, err: "json" }, 400); }
  try {
    if (b.a === "cron") {
      if (!CRON || req.headers.get("x-n1-key") !== CRON) return J({ ok: false }, 401);
      if (!b.dry) { try { await gifts(); } catch (_e) { /* the pillar pushes still go out */ } }
      return await cron(!!b.dry, typeof b.at === "number" ? b.at : undefined);
    }
    if (b.a === "save" || b.a === "unsub" || b.a === "test") return await fromApp(b);
    if (b.a === "energy") return await energy(b);
    if (b.a === "gifts") return await gifts();
    return J({ ok: false, err: "action" }, 400);
  } catch (e) { return J({ ok: false, err: String(e).slice(0, 200) }, 500); }
});
