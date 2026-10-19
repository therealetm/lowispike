// LOWiSPIKE food-photo (Oct 19, 2026)
// Why: Scan > Snap food took a photo but nothing looked at it (Emmanuel: "no AI analyses it"). This function sends the
// photo to Google's Gemini API (free tier, Flash-Lite) and returns the dishes it sees with an estimated portion and
// kcal, protein, carbs, sugar, fiber and fat per dish. The Gemini key lives ONLY here, as the Supabase secret
// GEMINI_API_KEY; the browser never sees it.
//   GET                                   -> { ok, configured }      (the app asks once whether photo AI is switched on)
//   POST { image: <base64 jpeg>, lang }   -> { dishes:[...], confidence, note, is_food, model }
// Rules: only callers with a LOWiSPIKE sign-in (any Supabase session, guests included) and only from the app's origin.
// Per user at most 12 photos per 10 minutes and 60 a day (soft, per worker). Max 1.5 MB image. Images and keys are never
// logged or stored. Deploy: Supabase dashboard > Edge Functions > Deploy a new function > name "food-photo" > paste this file.
// Optional secret GEMINI_MODEL picks the model; default tries gemini-3.5-flash-lite, then 3.1, then 2.5 Flash-Lite.

const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const MAX_B64 = 1_500_000;
const WIN_MS = 10 * 60 * 1000, WIN_MAX = 12, DAY_MAX = 60;
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

async function userId(req: Request): Promise<string> {
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return "";
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return "";
  try {
    const r = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!r.ok) return "";
    const u = await r.json();
    return u && typeof u.id === "string" ? u.id : "";
  } catch (_e) { return ""; }
}

function allowed(uid: string): boolean {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter((t) => now - t < 24 * 3600 * 1000);
  const recent = list.filter((t) => now - t < WIN_MS).length;
  if (recent >= WIN_MAX || list.length >= DAY_MAX) { hits.set(uid, list); return false; }
  list.push(now); hits.set(uid, list);
  return true;
}

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

async function gemini(key: string, image: string, mime: string, lang: string) {
  let last = 0;
  for (const model of MODELS) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: image } }, { text: prompt(lang) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json", responseSchema: SCHEMA },
      }),
    });
    last = r.status;
    if (r.status === 404 || r.status === 400 && /not found|not supported|unknown model/i.test(await r.clone().text())) {
      console.error("food-photo: model unavailable", model, r.status);
      continue;
    }
    if (r.status === 429) return { status: 429, body: { error: "busy" } };
    if (!r.ok) { console.error("food-photo: gemini status", r.status); return { status: 502, body: { error: "ai_failed" } }; }
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    try {
      const data = JSON.parse(text);
      return { status: 200, body: { ...data, model } };
    } catch (_e) {
      console.error("food-photo: unreadable answer", model);
      return { status: 502, body: { error: "ai_failed" } };
    }
  }
  return { status: 502, body: { error: "no_model", status: last } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  if (req.method === "GET") return out(req, 200, { ok: true, configured: !!key });
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  const o = req.headers.get("origin") || "";
  if (o && !ORIGINS.some((r) => r.test(o))) return out(req, 403, { error: "origin" });
  if (!key) return out(req, 503, { error: "not_configured" });
  const uid = await userId(req);
  if (!uid) return out(req, 401, { error: "sign_in" });
  let body: { image?: string; mime?: string; lang?: string };
  try { body = await req.json(); } catch (_e) { return out(req, 400, { error: "bad_request" }); }
  const image = String(body.image || "").replace(/^data:[^,]*,/, "");
  const mime = /^image\/(jpeg|png|webp)$/.test(String(body.mime)) ? String(body.mime) : "image/jpeg";
  const lang = ["en", "de", "es"].includes(String(body.lang)) ? String(body.lang) : "en";
  if (!image || image.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(image)) return out(req, 400, { error: "bad_image" });
  if (!allowed(uid)) return out(req, 429, { error: "limit" });
  try {
    const r = await gemini(key, image, mime, lang);
    return out(req, r.status, r.body);
  } catch (_e) {
    console.error("food-photo: request failed");
    return out(req, 502, { error: "ai_failed" });
  }
});
