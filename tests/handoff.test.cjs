// Sign-in continuity Safari -> Home Screen app (hofjs + supabase/functions/auth-handoff). Offline: VM with stubs.
// The live backend round trip is tests/handoff-live.cjs (needs network + service key).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const SRC = HTML.match(/<script id="hofjs">([\s\S]*?)<\/script>/)[1];
const FNSRC = fs.readFileSync(path.join(ROOT, "supabase/functions/auth-handoff/index.ts"), "utf8");
const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

function el(tag){
  const e = { tagName: tag, id: "", attrs: {}, children: [], hidden: false, dataset: {}, textContent: "", innerHTML: "", disabled: false,
    classList: { s: new Set(), add(c){ this.s.add(c); }, remove(c){ this.s.delete(c); }, toggle(c, on){ on ? this.s.add(c) : this.s.delete(c); }, contains(c){ return this.s.has(c); } },
    setAttribute(k, v){ this.attrs[k] = v; if (k === "id") this.id = v; }, getAttribute(k){ return this.attrs[k]; },
    appendChild(c){ this.children.push(c); c.parent = this; return c; }, remove(){ if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null; },
    querySelector(){ return null; }, querySelectorAll(){ return []; } };
  return e;
}
function world(o = {}){
  const ls = new Map(Object.entries(o.ls || {})), ss = new Map();
  const store = (m) => ({ getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) });
  const body = el("body"), docEl = el("html");
  const listeners = {};
  const calls = [];
  const cacheMap = new Map(Object.entries(o.cache || {}));
  let clock = o.now || 1_800_000_000_000;
  let codeN = 0;
  const issued = [];
  const fetchImpl = o.fetch || (async (url, init) => {
    const b = JSON.parse(init.body);
    calls.push({ url, b, auth: init.headers.Authorization || "", apikey: init.headers.apikey });
    if (b.action === "issue") { const c = "ABCDEFGHJK" + String(23 + (codeN++)).padStart(2, "2"); issued.push(c); return { status: 200, json: async () => ({ code: c, expires_in: 1800 }) }; }
    if (b.action === "revoke") return { status: 200, json: async () => ({ ok: true }) };
    if (b.action === "redeem") return o.redeem ? o.redeem(b) : { status: 200, json: async () => ({ token_hash: "th_" + b.code }) };
    return { status: 400, json: async () => ({}) };
  });
  const verify = [];
  const sb = { auth: {
    getSession: async () => ({ data: { session: o.session === undefined ? { access_token: "AT", user: { id: "u1", email: "a@b.c", is_anonymous: false } } : o.session } }),
    verifyOtp: async (p) => { verify.push(p); return o.verifyErr ? { error: { message: "x" }, data: {} } : { data: { user: { id: "u1", email: "a@b.c" }, session: {} } }; } } };
  const cloud = { setUserArg: null, restored: false, client: async () => sb, setUser(u){ this.setUserArg = u; }, restore: async function(){ this.restored = true; return true; } };
  let reloaded = 0, clip = o.clip || "";
  const doc = { body, documentElement: docEl, visibilityState: "visible",
    getElementById: id => body.children.find(c => c.id === id) || null,
    querySelector: () => null, createElement: el,
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); } };
  const timers = [];
  const ctx = {
    window: null, document: doc, localStorage: store(ls), sessionStorage: store(ss), console,
    navigator: { userAgent: o.ua || IOS, standalone: !!o.standalone, maxTouchPoints: 5, onLine: true,
      clipboard: o.noClip ? undefined : { writeText: async t => { if (o.clipDeny) throw new Error("denied"); clip = t; }, readText: async () => { if (o.clipDeny) throw new Error("denied"); return clip; } } },
    location: { protocol: "https:", reload(){ reloaded++; } },
    matchMedia: () => ({ matches: !!o.standalone }),
    fetch: fetchImpl,
    caches: { open: async () => ({ put: async (k, r) => { cacheMap.set(k, await r.text()); }, match: async k => cacheMap.has(k) ? { json: async () => JSON.parse(cacheMap.get(k)) } : undefined }), delete: async () => { const had = cacheMap.size > 0; cacheMap.clear(); return had; } },
    Response: class { constructor(b){ this.b = b; } async text(){ return this.b; } },
    Blob, Promise, JSON, Date: class extends Date { constructor(...a){ a.length ? super(...a) : super(clock); } static now(){ return clock; } },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, setInterval: () => 0, clearInterval: () => {},
    LOWI_CFG: { url: "https://x.supabase.co", key: "sb_publishable_test" },
    LOWI_CLOUD_X: cloud,
    LowiR2: { isAccount: () => o.account !== false },
    LowiLang: { get: () => o.lang || "de" },
    addEventListener: () => {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, H: ctx.LowiHandoff, calls, issued, verify, cloud, ls, ss, cacheMap, body, docEl, listeners, timers,
    get reloaded(){ return reloaded; }, get clip(){ return clip; }, tick(ms){ clock += ms; }, click(attr){ const t = { getAttribute: () => attr, closest(){ return this; } }; listeners.click[0]({ target: t, preventDefault(){} }); } };
}
const flush = () => new Promise(r => setImmediate(r));

test("code parsing matches the server rules", () => {
  const { H } = world();
  assert.equal(H.parse("LOWiSPIKE-Anmeldung (einmalig, 30 Min): LOWI-ABCD-EFGH-JKMN"), "ABCDEFGHJKMN");
  assert.equal(H.parse("lowi abcd efgh jkmn"), "ABCDEFGHJKMN");
  assert.equal(H.parse("abcd-efgh-jkmn"), "ABCDEFGHJKMN");
  assert.equal(H.parse("hello"), "");
  assert.equal(H.parse("ABCDEFGHIJKL"), "", "I, L, O, 0, 1 are never in a code");
  // server copy of the rule is the same regex
  assert.ok(FNSRC.includes("LOWI[-\\s]*([2-9A-HJKMNP-Z]{4})[-\\s]*([2-9A-HJKMNP-Z]{4})[-\\s]*([2-9A-HJKMNP-Z]{4})(?![0-9A-Z])"));
  assert.ok(SRC.includes("LOWI[-\\s]*([2-9A-HJKMNP-Z]{4})[-\\s]*([2-9A-HJKMNP-Z]{4})[-\\s]*([2-9A-HJKMNP-Z]{4})(?![0-9A-Z])"));
});

test("the Safari bar is only for signed-in accounts in iPhone Safari", () => {
  assert.equal(world().H.want(), true);
  assert.equal(world({ standalone: true }).H.want(), false, "not inside the Home Screen app");
  assert.equal(world({ ua: ANDROID }).H.want(), false, "Android shares storage, nothing to carry");
  assert.equal(world({ account: false }).H.want(), false, "guests have nothing to carry");
  assert.equal(world({ ua: IOS + " Instagram 300.0" }).H.want(), false, "in-app browsers can't add to Home Screen");
});

test("accounts: the browser's Add-to-Home note gets the sign-in step; guests keep the plain note", async () => {
  const mkNote = (w) => { const d = w.ctx.document.createElement("div"); d.id = "lcA2hs"; const sp = { textContent: "Leg LOWiSPIKE auf deinen Home-Bildschirm, dann \u00f6ffnet es sich im Vollbild wie eine App." };
    const go = { attrs: { "data-cl": "a2hs" }, getAttribute(k){ return this.attrs[k]; }, setAttribute(k, v){ this.attrs[k] = v; }, removeAttribute(k){ delete this.attrs[k]; } };
    d.querySelector = (q) => q === "span" ? sp : (q === '[data-cl="a2hs"]' && go.attrs["data-cl"] === "a2hs") ? go : null; w.body.appendChild(d); return { d, sp, go }; };
  const w = world(); const n = mkNote(w);
  w.timers.find(t => t.ms === 1800).f(); await flush();
  assert.match(n.sp.textContent, /du bleibst angemeldet/);
  assert.equal(n.go.attrs["data-hof"], "go"); assert.equal(n.go.attrs["data-cl"], undefined, "old How sheet no longer opens");
  assert.equal(w.issued.length, 1, "a code is ready before the tap (clipboard needs the tap)");
  const g = world({ account: false }); const m = mkNote(g);
  g.timers.find(t => t.ms === 1800).f(); await flush();
  assert.match(m.sp.textContent, /Vollbild/); assert.equal(m.go.attrs["data-cl"], "a2hs"); assert.equal(g.calls.length, 0);
  assert.ok(!/id = "hofBar"/.test(SRC), "no second banner of our own");
});

test("copy puts a one-time code on the clipboard and pins it until it expires", async () => {
  const w = world();
  const c1 = await w.H.issue();
  const r = await w.H.copy();
  assert.equal(r.ok, true); assert.equal(r.code, c1);
  assert.match(w.clip, /LOWI-ABCD-EFGH-JK\w\w/); assert.ok(w.clip.includes("30 Min"));
  assert.equal(w.calls[0].auth, "Bearer AT", "issue is authenticated with the user's own session");
  w.tick(20 * 60 * 1000);                       // fresh window over, but the copied code stays
  assert.equal(await w.H.issue(), c1); assert.equal(w.issued.length, 1);
  w.tick(11 * 60 * 1000);                       // expired -> a new one
  assert.notEqual(await w.H.issue(), c1); assert.equal(w.issued.length, 2);
});

test("an uncopied code is renewed so the bar never offers a stale one", async () => {
  const w = world();
  const c1 = await w.H.issue();
  w.tick(13 * 60 * 1000);
  const c2 = await w.H.issue();
  assert.notEqual(c1, c2);
  await flush();
  assert.ok(w.cacheMap.get("./__lowi_handoff__").includes(c2), "latest code mirrored to CacheStorage");
});

test("clipboard blocked: the sheet still shows the code to type", async () => {
  const w = world({ clipDeny: true });
  await w.H.issue();
  const r = await w.H.copy();
  assert.equal(r.ok, false); assert.ok(r.code);
  w.click("go"); await flush(); await flush();
  const s = w.ctx.document.getElementById("hofSheet");
  assert.ok(s && /Kopieren ging nicht/.test(s.innerHTML) && s.innerHTML.includes("LOWI-ABCD"));
});

test("guests and signed-out sessions never get a code", async () => {
  assert.equal(await world({ session: { access_token: "AT", user: { id: "g", is_anonymous: true } } }).H.issue(), "");
  const w = world({ session: null }); assert.equal(await w.H.issue(), ""); assert.equal(w.calls.length, 0);
});

test("Home Screen start screen offers Paste sign-in, Safari does not", () => {
  assert.equal(world().H.startHTML(), "");
  const h = world({ standalone: true }).H.startHTML();
  assert.ok(h.includes('data-hof="paste"') && h.includes("Anmeldung einfügen") && h.includes("form data-hofform hidden"));
  assert.ok(world({ standalone: true, lang: "en" }).H.startHTML().includes("Paste sign-in"));
  assert.ok(world({ standalone: true, lang: "es" }).H.startHTML().includes("Pegar acceso"));
  assert.ok(/LowiHandoff\.startHTML\(\)/.test(HTML.match(/function startHTML\(\)[\s\S]*?\n\}/)[0]), "hooked into the R2 start screen");
});

test("redeem: magic-link token hash -> verifyOtp -> same restore path as password sign-in", async () => {
  const w = world({ standalone: true, account: false });
  const ok = await w.H.redeem("ABCDEFGHJKMN");
  assert.equal(ok, true);
  const rc = w.calls.find(c => c.b.action === "redeem");
  assert.equal(rc.b.code, "ABCDEFGHJKMN"); assert.equal(rc.auth, "", "redeem sends no session");
  assert.deepEqual(JSON.parse(JSON.stringify(w.verify[0])), { token_hash: "th_ABCDEFGHJKMN", type: "magiclink" });
  assert.equal(w.cloud.setUserArg.id, "u1"); assert.equal(w.cloud.restored, true);
  assert.equal(w.ls.get("lowi.gate"), "done"); assert.equal(w.ss.get("r2.welcome"), "back");
  assert.equal(w.reloaded, 1);
});

test("expired, used or bad codes sign nobody in", async () => {
  const w = world({ standalone: true, account: false, redeem: () => ({ status: 410, json: async () => ({ error: "expired" }) }) });
  assert.equal(await w.H.redeem("ABCDEFGHJKMN"), false);
  assert.equal(w.verify.length, 0); assert.equal(w.reloaded, 0); assert.equal(w.ls.get("lowi.gate"), undefined);
  const v = world({ standalone: true, account: false, verifyErr: true });
  assert.equal(await v.H.redeem("ABCDEFGHJKMN"), false); assert.equal(v.reloaded, 0); assert.equal(v.cloud.setUserArg, null);
});

test("auto path: a fresh code shared through CacheStorage signs in once; stale ones are ignored", async () => {
  const now = 1_800_000_000_000;
  const w = world({ standalone: true, account: false, now, cache: { "./__lowi_handoff__": JSON.stringify({ c: "ABCDEFGHJKMN", exp: now + 20 * 60e3 }) } });
  w.timers.find(t => t.ms === 1800).f(); await flush(); await flush(); await flush(); await flush();
  assert.equal(w.verify.length, 1); assert.equal(w.reloaded, 1); assert.equal(w.cacheMap.size, 0, "used code removed");
  const s = world({ standalone: true, account: false, now, cache: { "./__lowi_handoff__": JSON.stringify({ c: "ABCDEFGHJKMN", exp: now - 1 }) } });
  s.timers.find(t => t.ms === 1800).f(); await flush(); await flush(); await flush();
  assert.equal(s.calls.length, 0); assert.equal(s.reloaded, 0);
});

test("sign out and start fresh revoke open codes first", async () => {
  const w = world();
  await w.H.issue();
  await w.H.revoke();
  assert.ok(w.calls.some(c => c.b.action === "revoke" && c.auth === "Bearer AT"));
  assert.equal(w.cacheMap.size, 0); assert.equal(w.H._state().has, false);
  const so = HTML.match(/async function signOut\(\)\{[\s\S]*?\n\}/)[0], sf = HTML.match(/async function startFresh\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(so.indexOf("LowiHandoff.revoke()") > 0 && so.indexOf("LowiHandoff.revoke()") < so.indexOf("auth.signOut"));
  assert.ok(sf.indexOf("LowiHandoff.revoke()") > 0 && sf.indexOf("LowiHandoff.revoke()") < sf.indexOf("auth.signOut"));
});

test("nothing secret goes into URLs, history, the manifest or logs", () => {
  assert.ok(!/history\.(push|replace)State|location\.(href|search|hash)\s*=|[?&](code|token|hof)=/.test(SRC));
  assert.ok(!/console\./.test(SRC) && !/console\./.test(FNSRC));
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  assert.equal(man.start_url, "./");
  assert.ok(!/access_token|refresh_token/.test(SRC.replace(/s\.access_token/g, "")), "no session tokens handled besides the bearer for issue");
});

test("edge function: hashed, single use, 30 minutes, accounts only, CORS locked", () => {
  assert.ok(/const TTL_S = 30 \* 60;/.test(FNSRC));
  assert.ok(/crypto\.subtle\.digest\("SHA-256"/.test(FNSRC) && /code_hash: await sha\(code\)/.test(FNSRC));
  assert.ok(/\.update\(\{ used_at: now\.toISOString\(\) \}\)[\s\S]{0,120}\.is\("used_at", null\)\.gt\("expires_at"/.test(FNSRC), "atomic single-use + expiry");
  assert.ok(/u\.is_anonymous \|\| !u\.email\) return out\(req, 403/.test(FNSRC));
  assert.ok(/generateLink\(\{ type: "magiclink"/.test(FNSRC) && /token_hash: th/.test(FNSRC));
  assert.ok(!/access_token|refresh_token/.test(FNSRC), "the function never returns a session");
  assert.ok(/therealetm\\\.github\\\.io/.test(FNSRC));
  assert.ok(/MAX_PER_HOUR = 30/.test(FNSRC));
});

test("service worker keeps the handoff cache across updates; script parses", () => {
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  assert.ok(sw.includes('k !== "lowi-handoff"'));
  assert.doesNotThrow(() => new vm.Script(SRC));
});
