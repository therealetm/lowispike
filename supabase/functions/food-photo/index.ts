// LOWiSPIKE food-photo (Oct 19, 2026)
// Why: Scan > Snap food took a photo but nothing looked at it (Emmanuel: "no AI analyses it"). This function sends the
// photo to Google's Gemini API (free tier, Flash-Lite) and returns the dishes it sees with an estimated portion and
// kcal, protein, carbs, sugar, fiber and fat per dish. The Gemini key lives ONLY here, as the Supabase secret
// GEMINI_API_KEY; the browser never sees it.
//   GET [?tz=Europe/Berlin]               -> { ok, configured, limit, used?, left? }  (used/left only with a user token)
//   POST { image: <base64 jpeg>, lang, tz } -> { dishes:[...], confidence, note, is_food, model, limit, left }
// Rules: only callers with a LOWiSPIKE sign-in (any Supabase session, guests included) and only from the app's origin.
// Oct 19 (Emmanuel: "people only get to unlock three meals and pictures a day, so that we don't reach that limit"):
// every signed-in user gets DAY_MAX = 3 photo reads per day, Snap food and Community together. The day is the user's own
// calendar day (tz from the app, checked; UTC when missing), and never more than 2 x DAY_MAX in any 24 hours, so
// changing the phone's time zone buys nothing real. The count is durable: it lives in the user's auth app_metadata
// (food_photo.t = timestamps of the last 24 h), written with the service role key that Supabase gives every function.
// A photo is counted when the read starts and handed back if Google fails (busy / error), so a failed read costs nothing.
// Sharing a photo to Community reuses the read the app already has and never calls this function again.
// Typed meals never come here and stay unlimited. All users still share one Google project quota: 3 a day per person
// lowers the load, it does not guarantee Google never says busy. Max 1.5 MB image. Images and keys are never
// logged or stored. Deploy: Supabase dashboard > Edge Functions > Deploy a new function > name "food-photo" > paste this file.
// Optional secret GEMINI_MODEL picks the model; default tries gemini-3.5-flash-lite, then 3.1, then 2.5 Flash-Lite
// (2.5 answers 404 since Oct 2026 and is skipped in a fraction of a second).

const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const MAX_B64 = 1_500_000;
const WIN_MS = 10 * 60 * 1000, WIN_MAX = 12, DAY_MAX = 3, ROLL_MAX = DAY_MAX * 2, DAY_MS = 24 * 3600 * 1000;
const MODELS = (Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash-lite")
  .split(",").map((s) => s.trim()).filter(Boolean);
const hits = new Map<string, number[]>();

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  const ok = ORIGINS.some((r) => r.test(o));
  return {
    "Access-Control-Allow-Origin": ok ? o : "https://therealetm.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
function out(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

type Who = { id: string; anon: boolean; stamps: number[] };
async function who(req: Request): Promise<Who | null> {
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  try {
    const r = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u || typeof u.id !== "string") return null;
    const t = u.app_metadata && u.app_metadata.food_photo && Array.isArray(u.app_metadata.food_photo.t) ? u.app_metadata.food_photo.t : [];
    return { id: u.id, anon: !!u.is_anonymous, stamps: t.map(Number).filter((x: number) => isFinite(x) && x > 0) };
  } catch (_e) { return null; }
}

// The user's calendar day for a moment, in their time zone (checked), else UTC.
export function zone(tz: unknown): string {
  const z = typeof tz === "string" ? tz.slice(0, 64) : "";
  if (!z || !/^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$|^UTC$/.test(z)) return "UTC";
  try { new Intl.DateTimeFormat("en-CA", { timeZone: z }); return z; } catch (_e) { return "UTC"; }
}
export function dayOf(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}
// Pure rule (unit tested): how many photo reads were used today, and may one more start now?
export function tally(stamps: number[], now: number, tz: string) {
  const recent = stamps.filter((t) => t <= now + 60000 && now - t < DAY_MS);
  const today = dayOf(now, tz);
  const used = recent.filter((t) => dayOf(t, tz) === today).length;
  const ok = used < DAY_MAX && recent.length < ROLL_MAX;
  return { recent, used: Math.min(DAY_MAX, used), left: ok ? DAY_MAX - used : 0, ok };
}

async function store(uid: string, stamps: number[]): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL"), svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return false;
  try {
    const r = await fetch(url + "/auth/v1/admin/users/" + encodeURIComponent(uid), {
      method: "PUT",
      headers: { apikey: svc, Authorization: "Bearer " + svc, "Content-Type": "application/json" },
      body: JSON.stringify({ app_metadata: { food_photo: { t: stamps.slice(-ROLL_MAX) } } }),
    });
    if (!r.ok) console.error("food-photo: count write failed", r.status);
    return r.ok;
  } catch (_e) { console.error("food-photo: count write failed"); return false; }
}

// Per worker: a burst guard, and the fallback count when the durable write is not possible.
function burst(uid: string, durable: boolean): boolean {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter((t) => now - t < DAY_MS);
  const recent = list.filter((t) => now - t < WIN_MS).length;
  if (recent >= WIN_MAX || (!durable && list.length >= DAY_MAX)) { hits.set(uid, list); return false; }
  list.push(now); hits.set(uid, list);
  return true;
}
function unburst(uid: string) { const l = hits.get(uid) || []; l.pop(); hits.set(uid, l); }

const LANGS: Record<string, string> = { en: "English", de: "German", es: "Spanish" };
function prompt(lang: string): string {
  return "You are a careful nutrition assistant for a healthy-eating game. Look at this photo. " +
    "If it shows no food or drink, set is_food to false and return an empty dishes list. " +
    "Otherwise list each separate dish, food or drink you can see (at most 8), with a short everyday name in " +
    (LANGS[lang] || "English") + ", the visible portion in plain words (for example '1 bowl', '2 slices', 'about 150 g'), " +
    "its estimated weight in grams, and your best estimate for that portion of kcal, protein, carbohydrates, sugar, " +
    "fiber and fat in grams. Use typical recipes and plate sizes. Do not give medical advice. " +
    "confidence is low, medium or high for the whole photo. note is one short sentence in the same language, " +
    "for example what was hard to see, or an empty string.";
}
const NUM = { type: "NUMBER" };
const SCHEMA = {
  type: "OBJECT",
  properties: {
    is_food: { type: "BOOLEAN" },
    dishes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, portion: { type: "STRING" }, grams: NUM, kcal: NUM, protein_g: NUM, carbs_g: NUM, sugar_g: NUM, fiber_g: NUM, fat_g: NUM },
        required: ["name", "portion", "grams", "kcal", "protein_g", "carbs_g", "sugar_g", "fiber_g", "fat_g"],
      },
    },
    confidence: { type: "STRING", enum: ["low", "medium", "high"] },
    note: { type: "STRING" },
  },
  required: ["is_food", "dishes", "confidence", "note"],
};

// Oct 19 (Emmanuel, iPad: "It's not working anymore. We already hit a limit?"): no limit was hit. Gemini had become slow
// (25-50 s for a new photo, 2-4 s earlier the same day) and the app gave up at 30 s with "couldn't read this photo",
// while this function still finished and counted the read. Now: Gemini 3.x is asked for minimal thinking (2.5: none),
// each model gets its own deadline, a slow or broken model hands over to the next one, the whole read stops at BUDGET_MS
// (well under the app's wait) and an unfinished read is handed back. Errors say what really happened: ai_slow (504),
// ai_key (503, the GEMINI_API_KEY secret is missing, wrong or deleted), ai_quota (429, Google's free daily quota for the
// whole project is used up), busy (429, Google rate limit), ai_failed (502). Logs carry status and ms, never images or keys.
const BUDGET_MS = 26_000, MODEL_MS = 20_000, HEDGE_MS = 8_000;
function think(model: string): Record<string, unknown> {
  if (/^gemini-3/.test(model)) return { thinkingConfig: { thinkingLevel: "minimal" } };
  if (/^gemini-2\.5/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
  return {};
}
type Out = { status: number; body: Record<string, unknown> };
async function ask(key: string, model: string, image: string, mime: string, lang: string, ms: number, thinking: boolean) {
  const gen: Record<string, unknown> = { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json", responseSchema: SCHEMA };
  if (thinking) Object.assign(gen, think(model));
  // A plain timer plus abort, raced: AbortSignal.timeout() fired 10+ s late in the edge runtime (seen Oct 19).
  const c = new AbortController();
  let id: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_r, reject) => { id = setTimeout(() => { c.abort(); reject(new Error("timeout")); }, ms); });
  try {
    return await Promise.race([fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: c.signal,
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: image } }, { text: prompt(lang) }] }], generationConfig: gen }),
    }), late]);
  } finally { clearTimeout(id); }
}
// One model, one try. Returns the final answer (200 or a key error, which no other model can fix) or a "move on" result.
async function attempt(key: string, model: string, image: string, mime: string, lang: string, ms: number): Promise<Out & { next?: boolean }> {
  const t1 = Date.now();
  let r: Response, text = "";
  try {
    r = await ask(key, model, image, mime, lang, ms, true);
    if (r.status === 400) {
      text = await r.text();
      if (/thinking/i.test(text)) { r = await ask(key, model, image, mime, lang, Math.max(2000, ms - (Date.now() - t1)), false); text = ""; }
    }
  } catch (_e) {
    console.error("food-photo: gemini slow", model, Date.now() - t1, "ms");
    return { status: 504, body: { error: "ai_slow" }, next: true };
  }
  if (!text && !r.ok) text = await r.text().catch(() => "");
  console.log("food-photo: gemini", model, r.status, Date.now() - t1, "ms");
  if (r.ok) {
    const j = await r.json().catch(() => null);
    const out = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    try { return { status: 200, body: { ...JSON.parse(out), model } }; } catch (_e) {
      console.error("food-photo: unreadable answer", model);
      return { status: 502, body: { error: "ai_failed" }, next: true };
    }
  }
  if (r.status === 404 || r.status === 400 && /not found|not supported|unknown model/i.test(text)) {
    console.error("food-photo: model unavailable", model, r.status);
    return { status: 502, body: { error: "no_model" }, next: true };
  }
  if (r.status === 401 || r.status === 403 || r.status === 400 && /API_KEY|api key|PERMISSION_DENIED/i.test(text)) {
    console.error("food-photo: gemini key rejected", r.status);
    return { status: 503, body: { error: "ai_key" } };
  }
  if (r.status === 429) {
    const daily = /per ?day|PerDay|daily/i.test(text);
    console.error("food-photo: gemini 429", model, daily ? "daily quota" : "rate");
    return { status: 429, body: { error: daily ? "ai_quota" : "busy" }, next: true }; // another model has its own quota
  }
  console.error("food-photo: gemini status", model, r.status);
  return { status: 502, body: { error: "ai_failed" }, next: r.status >= 500 };
}
// Models in order. If the current one has not answered after HEDGE_MS, the next one is asked as well and the first good
// answer wins (Google's slow spells hit one model at a time). A model that fails fast hands over at once.
async function gemini(key: string, image: string, mime: string, lang: string): Promise<Out> {
  const t0 = Date.now();
  const left = () => BUDGET_MS - (Date.now() - t0);
  let i = 0, running = 0, last: Out = { status: 502, body: { error: "no_model" } };
  const rank = (o: Out) => ({ ai_quota: 5, busy: 4, ai_slow: 3, ai_failed: 2, no_model: 1 } as Record<string, number>)[String(o.body.error)] || 0;
  return await new Promise<Out>((resolve) => {
    let done = false, hedge: ReturnType<typeof setTimeout> | undefined;
    const finish = (o: Out) => { if (done) return; done = true; clearTimeout(hedge); resolve(o); };
    const start = () => {
      if (done || i >= MODELS.length || left() < 2500) { if (!running) finish(last); return; }
      const model = MODELS[i++];
      running++;
      clearTimeout(hedge);
      hedge = setTimeout(start, HEDGE_MS);
      attempt(key, model, image, mime, lang, Math.min(MODEL_MS, left())).then((o) => {
        running--;
        if (!o.next) return finish(o);
        if (rank(o) >= rank(last)) last = { status: o.status, body: o.body };
        start();
      }, () => { running--; start(); });
    };
    start();
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  if (req.method === "GET") {
    const base = { ok: true, configured: !!key, limit: DAY_MAX };
    const u = await who(req);
    if (!u) return out(req, 200, base);
    const tz = zone(new URL(req.url).searchParams.get("tz"));
    const c = tally(u.stamps, Date.now(), tz);
    return out(req, 200, { ...base, used: c.used, left: c.left });
  }
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  const o = req.headers.get("origin") || "";
  if (o && !ORIGINS.some((r) => r.test(o))) return out(req, 403, { error: "origin" });
  if (!key) return out(req, 503, { error: "not_configured" });
  const u = await who(req);
  if (!u) return out(req, 401, { error: "sign_in" });
  let body: { image?: string; mime?: string; lang?: string; tz?: string };
  try { body = await req.json(); } catch (_e) { return out(req, 400, { error: "bad_request" }); }
  const image = String(body.image || "").replace(/^data:[^,]*,/, "");
  const mime = /^image\/(jpeg|png|webp)$/.test(String(body.mime)) ? String(body.mime) : "image/jpeg";
  const lang = ["en", "de", "es"].includes(String(body.lang)) ? String(body.lang) : "en";
  if (!image || image.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(image)) return out(req, 400, { error: "bad_image" });
  const tz = zone(body.tz), now = Date.now();
  const c = tally(u.stamps, now, tz);
  if (!c.ok) return out(req, 429, { error: "limit", limit: DAY_MAX, left: 0 });
  // Count it before Google is asked (a second phone cannot slip in between), hand it back if the read fails.
  const durable = await store(u.id, c.recent.concat(now));
  if (!burst(u.id, durable)) {
    if (durable) await store(u.id, c.recent);
    return out(req, 429, { error: durable ? "busy" : "limit", limit: DAY_MAX, left: durable ? c.left : 0 });
  }
  const left = Math.max(0, c.left - 1);
  try {
    const r = await gemini(key, image, mime, lang);
    if (r.status !== 200) {
      if (durable) await store(u.id, c.recent);
      unburst(u.id);
      return out(req, r.status, { ...r.body, limit: DAY_MAX, left: c.left });
    }
    return out(req, 200, { ...r.body, limit: DAY_MAX, left });
  } catch (_e) {
    console.error("food-photo: request failed");
    if (durable) await store(u.id, c.recent);
    unburst(u.id);
    return out(req, 502, { error: "ai_failed", limit: DAY_MAX, left: c.left });
  }
});
