// lowi-ai: the app's AI for everyone (22 Nov 2026, Emmanuel: "apply all the AI stuff ... for the free stuff without me having to do
// nothing"). Uses the project's existing GEMINI_API_KEY (Google AI Studio, free tier, Flash-Lite); the browser never sees it.
// Every call first takes one unit from public.ai_usage (ai_take): per person per feature per day, and one whole-app cap per day so the
// free quota (about 500 requests a day for Flash-Lite, shared with food-photo) is never used up. Over a limit: {error:"limit"}.
//
//   POST {action:"ask", messages:[{role:"user"|"model", text}], image?:base64 jpeg, context?, name?, sign?, lang}
//        Misty / Ask LOWiSPIKE: the in-app chat that replaces the Custom GPT ("Deep analyze"), meal photos, swaps.
//   POST {action:"translate", text, to}       translate a chat message (en / de / es)
//   POST {action:"mealfix", dishes:[{name,grams,portion,kcal,protein,carbs,sugar,fiber,fat}], text, lang}  the photo check got the meal
//        wrong: the person says (voice or typed) how they made it; returns corrected dishes {ok, dishes, note}
//   POST {action:"transcribe", audio: base64, mime}  a review's voice note (max ~2 MB) -> {ok, text} word for word, its own language
//   POST {action:"linkcheck", title, caption, url}  is a For You link about insulin-friendly food / health? {ok, fits, why}
//   POST {action:"fyfill", id}  a For You post: write down its video's words (TikTok, YouTube) and a short summary once, kept on the
//        post (posts.meta.ai), so it is read by everyone and by the companion (25 Nov 2026). {ok, ai:{transcript, onscreen, sum}}
//   "ask" also reads the community's knowledge (25 Nov 2026, Emmanuel: "the videos that we post into our For You page actually becomes
//   a knowledge space ... same with what people post into the chat room ... the AI has access to that"): the For You posts most related
//   to the question (caption, title, dish, its AI summary) and meals shared in the public chat (dish and verdict only, never who or
//   their words), as anonymous notes the companion may use.
// Deploy: supabase functions deploy lowi-ai --no-verify-jwt
const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^https:\/\/(www\.)?lowispike\.com$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, /^capacitor:\/\/localhost$/];
const MODELS = (Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash-lite").split(",").map((s) => s.trim()).filter(Boolean);
const LANG: Record<string, string> = { en: "English", de: "German", es: "Spanish" };
/* the daily limits (per person per feature) and the whole-app cap */
export const LIMITS: Record<string, number> = { ask: 15, translate: 20, linkcheck: 10, mealfix: 15, transcribe: 5, fyfill: 8 };
export const GLOBAL = 400;

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.some((r) => r.test(o)) ? o : "https://therealetm.github.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}
const out = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
const clip = (s: unknown, n: number) => String(s == null ? "" : s).replace(/\u0000/g, "").trim().slice(0, n);

async function userId(req: Request): Promise<string> {
  const auth = req.headers.get("authorization") || "", url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!/^Bearer\s+\S+/.test(auth) || !url || !anon) return "";
  try { const r = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } }); if (!r.ok) return ""; const u = await r.json(); return typeof u?.id === "string" ? u.id : ""; } catch (_e) { return ""; }
}
async function take(subject: string, feature: string): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  try {
    const r = await fetch(url + "/rest/v1/rpc/ai_take", { method: "POST", headers: { apikey: key!, Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ p_subject: subject, p_feature: feature, p_user_max: LIMITS[feature] || 10, p_global_max: GLOBAL }) });
    return r.ok ? String(await r.json()) : "error";
  } catch (_e) { return "error"; }
}
async function gemini(body: Record<string, unknown>) {
  const key = Deno.env.get("GEMINI_API_KEY") || ""; if (!key) throw new Error("not_configured");
  for (const model of MODELS) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
    if (r.status === 404 || r.status === 400 && /not found|not supported|unknown model/i.test(await r.clone().text())) continue;
    if (r.status === 429) throw new Error("busy");
    if (!r.ok) throw new Error("ai_failed");
    const j = await r.json();
    return j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  }
  throw new Error("no_model");
}
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const MAX_VIDEO = 18 * 1024 * 1024;
function sb(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return fetch(url + "/rest/v1/" + path, { ...init, headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", ...(init.headers || {}) } });
}
/* a public TikTok's video file (same way as studio-ai) */
async function tiktokVideo(link: string): Promise<{ b64: string; mime: string } | null> {
  try {
    let r = await fetch(link, { headers: { "User-Agent": UA, "Accept-Language": "en" }, redirect: "follow" });
    if (!r.ok) return null;
    const cookies = (r.headers.get("set-cookie") || "").split(/,(?=\s*[A-Za-z0-9_-]+=)/).map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
    const h = await r.text(), m = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/.exec(h);
    const it = m ? JSON.parse(m[1])?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct : null;
    const src = it?.video?.playAddr || it?.video?.downloadAddr || "";
    if (!/^https:\/\//.test(src)) return null;
    r = await fetch(src, { headers: { "User-Agent": UA, Referer: "https://www.tiktok.com/", Cookie: cookies, Range: "bytes=0-" } });
    if (!r.ok && r.status !== 206) return null;
    const b = new Uint8Array(await r.arrayBuffer()); if (!b.length || b.length > MAX_VIDEO) return null;
    let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return { b64: btoa(s), mime: (r.headers.get("content-type") || "video/mp4").split(";")[0] };
  } catch (_e) { return null; }
}
/* the community's knowledge, read once every 10 minutes */
let KN: { at: number; items: { k: string; t: string }[] } = { at: 0, items: [] };
async function knowledge() {
  if (Date.now() - KN.at < 600_000 && KN.items.length) return KN.items;
  const items: { k: string; t: string }[] = [];
  try {
    const r = await sb("posts?select=cap,meta,plat,created_at&order=created_at.desc&limit=200"); const rows = r.ok ? await r.json() : [];
    for (const p of rows) {
      const m = p.meta || {}, ai = m.ai || {};
      const t = [m.dish ? "dish: " + clip(m.dish, 80) : "", m.spike ? "spike: " + clip(m.spike, 10) : "", clip(m.title || "", 160), clip(p.cap, 240), ai.sum ? "summary: " + clip(ai.sum, 400) : "", ai.onscreen ? "on screen: " + clip(ai.onscreen, 200) : ""].filter(Boolean).join(" | ");
      if (t) items.push({ k: "For You" + (p.plat ? " (" + p.plat + ")" : ""), t });
    }
  } catch (_e) { /* no posts */ }
  try {
    const r = await sb("messages?select=meal&room=eq.all&meal=not.is.null&order=created_at.desc&limit=80"); const rows = r.ok ? await r.json() : [];
    for (const x of rows) { const m = x.meal || {}; const t = [clip(m.name, 160), m.lvl ? "spike: " + clip(m.lvl, 10) : "", m.note ? clip(m.note, 160) : ""].filter(Boolean).join(" | "); if (t) items.push({ k: "Chat meal", t }); }
  } catch (_e) { /* no meals */ }
  KN = { at: Date.now(), items }; return items;
}
/* the notes most related to the question (shared words), else the newest few */
function pick(items: { k: string; t: string }[], q: string, n = 10) {
  const words = Array.from(new Set(q.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w.length > 3)));
  const scored = items.map((it, i) => { const t = it.t.toLowerCase().normalize("NFKD"); let s = 0; for (const w of words) if (t.includes(w)) s += 1; return { it, s, i }; });
  const hits = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, n).map((x) => x.it);
  return hits.length ? hits : items.slice(0, 5);
}
function mistyRules(name: string, sign: string, lang: string) {
  return [
    "You are " + (name || "Misty") + ", the glass-bubble companion inside the LOWiSPIKE app. LOWiSPIKE helps people eat in an insulin-friendly way (fewer blood sugar spikes) with simple, tasty food." + (sign ? " Your personality follows the star sign " + sign + "." : ""),
    "Answer in " + LANG[lang] + ". Be warm, playful and short: 1 to 4 short sentences, or a short list when the person asks for steps or a recipe. No guilt, no alarm, no lecturing.",
    "You help with: what to eat, insulin-friendly swaps for a craving, simple recipes, reading a meal photo (name the foods you see and say qualitatively if it is insulin-friendly: low, medium or high spike, and one easy improvement), questions about a scanned product or meal the person pastes.",
    "Hard rules: never give blood sugar or glucose numbers, never diagnose, never talk about medication doses or replace a doctor; for symptoms, medication or pregnancy say kindly to ask their doctor. Do not invent studies. If you are unsure, say so.",
    "Never ask for or repeat private health details. If someone shares something private, answer gently without repeating it.",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  const o = req.headers.get("origin") || ""; if (o && !ORIGINS.some((r) => r.test(o))) return out(req, 403, { error: "origin" });
  let b: Record<string, unknown> = {}; try { b = await req.json(); } catch (_e) { return out(req, 400, { error: "bad_request" }); }
  const action = String(b.action || ""); if (!LIMITS[action]) return out(req, 400, { error: "bad_action" });
  const uid = await userId(req);
  if (!uid && action !== "translate") return out(req, 401, { error: "sign_in" });
  const subject = uid || "ip:" + clip((req.headers.get("x-forwarded-for") || "").split(",")[0], 60);
  const lang = LANG[String(b.lang || b.to || "en")] ? String(b.lang || b.to) : "en";
  try {
    const t = await take(subject, action);
    if (t !== "ok") return out(req, 429, { error: "limit", scope: t });
    if (action === "fyfill") {
      const id = clip(b.id, 80); if (!id) return out(req, 400, { error: "bad_request" });
      const r0 = await sb("posts?select=id,url,plat,cap,meta&id=eq." + encodeURIComponent(id)); const row = r0.ok ? (await r0.json())[0] : null;
      if (!row) return out(req, 404, { error: "not_found" });
      const meta0 = row.meta || {}; if (meta0.ai && (meta0.ai.sum || meta0.ai.transcript)) return out(req, 200, { ok: true, ai: meta0.ai, cached: true });
      const url = clip(row.url, 400), parts: unknown[] = [];
      if (/^https:\/\/([a-z0-9-]+\.)*tiktok\.com\//i.test(url)) { const v = await tiktokVideo(url); if (v) parts.push({ inlineData: { mimeType: v.mime, data: v.b64 } }); }
      else if (/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url)) parts.push({ fileData: { fileUri: url } });
      parts.push({ text: [
        "This is a post on LOWiSPIKE's For You page (insulin-friendly eating). Caption: " + clip(row.cap, 600) + ". Title: " + clip(meta0.title, 300) + ".",
        parts.length ? "Write down the video's spoken words (`transcript`, its own language) and its text on screen (`onscreen`, one line per piece)." : "There is no video to watch: leave `transcript` and `onscreen` empty.",
        "Then `sum`: 2 to 4 short sentences in English with what someone can learn or cook from it for insulin-friendly eating (foods, swaps, steps). No numbers for blood sugar, no medical claims. Return JSON.",
      ].join("\n") });
      const schema = { type: "OBJECT", properties: { transcript: { type: "STRING" }, onscreen: { type: "STRING" }, sum: { type: "STRING" } }, required: ["sum"] };
      const txt = await gemini({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.2, maxOutputTokens: 3000, responseMimeType: "application/json", responseSchema: schema } });
      let j: Record<string, unknown> = {}; try { j = JSON.parse(txt); } catch (_e) { return out(req, 502, { error: "ai_failed" }); }
      const ai = { transcript: clip(j.transcript, 6000), onscreen: clip(j.onscreen, 2000), sum: clip(j.sum, 800), video: parts.length > 1, t: Date.now() };
      if (!ai.sum && !ai.transcript) return out(req, 502, { error: "ai_failed" });
      await sb("posts?id=eq." + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ meta: { ...meta0, ai } }), headers: { Prefer: "return=minimal" } });
      KN.at = 0;
      return out(req, 200, { ok: true, ai });
    }
    if (action === "translate") {
      const text = clip(b.text, 4000); if (!text) return out(req, 400, { error: "bad_request" });
      const r = await gemini({ contents: [{ role: "user", parts: [{ text: "Translate into " + LANG[lang] + ". Keep emojis, names, @handles and numbers. Reply with the translation only.\n\n" + text }] }], generationConfig: { temperature: 0, maxOutputTokens: 2048 } });
      return out(req, 200, { ok: true, text: clip(r, 6000) });
    }
    if (action === "linkcheck") {
      const info = "Title: " + clip(b.title, 300) + "\nCaption: " + clip(b.caption, 400) + "\nLink: " + clip(b.url, 300);
      const r = await gemini({ contents: [{ role: "user", parts: [{ text: "LOWiSPIKE's For You page only shows links about insulin-friendly eating, low-carb / low-sugar food, recipes, food swaps, blood sugar friendly habits, movement or healthy lifestyle. Decide if this link fits. Be generous: food, cooking, fitness and wellbeing fit; clearly unrelated topics (politics, pranks, gaming, dating, music, ads for unrelated products) do not. When there is too little information, it fits.\n" + info + "\nReturn JSON {fits:boolean, why:string (one short sentence in " + LANG[lang] + ")}." }] }], generationConfig: { temperature: 0, maxOutputTokens: 200, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { fits: { type: "BOOLEAN" }, why: { type: "STRING" } }, required: ["fits"] } } });
      let j: { fits?: boolean; why?: string } = {}; try { j = JSON.parse(r); } catch (_e) { j = { fits: true }; }
      return out(req, 200, { ok: true, fits: j.fits !== false, why: clip(j.why, 200) });
    }
    if (action === "transcribe") {
      const audio = typeof b.audio === "string" && /^[A-Za-z0-9+/=]+$/.test(b.audio) && b.audio.length < 2_800_000 ? b.audio : "";
      const mime = /^audio\/(webm|mp4|mpeg|ogg|wav|aac|x-m4a)(;.*)?$/.test(String(b.mime || "")) ? String(b.mime).split(";")[0] : "";
      if (!audio || !mime) return out(req, 400, { error: "bad_request" });
      const r = await gemini({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: mime, data: audio } }, { text: "Transcribe this voice note word for word in the language it is spoken in. It is a review of the app LOWiSPIKE (write it exactly like that), made by Eman. Only the words, no notes, no timestamps. If nothing is said, reply with an empty line." }] }], generationConfig: { temperature: 0, maxOutputTokens: 1500 } });
      return out(req, 200, { ok: true, text: clip(r, 2000) });
    }
    if (action === "mealfix") {
      const text = clip(b.text, 1500); if (!text) return out(req, 400, { error: "bad_request" });
      const dishes = (Array.isArray(b.dishes) ? b.dishes : []).slice(0, 8).map((d: Record<string, unknown>) => ({ name: clip(d && d.name, 80), portion: clip(d && d.portion, 40), grams: Number(d && d.grams) || 0, kcal: Number(d && d.kcal) || 0, carbs: Number(d && d.carbs) || 0, fiber: Number(d && d.fiber) || 0, protein: Number(d && d.protein) || 0 }));
      const N = { type: "NUMBER" };
      const schema = { type: "OBJECT", properties: { dishes: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, portion: { type: "STRING" }, grams: N, kcal: N, protein: N, carbs: N, sugar: N, fiber: N, fat: N }, required: ["name", "grams", "kcal", "protein", "carbs", "sugar", "fiber", "fat"] } }, note: { type: "STRING" } }, required: ["dishes"] };
      const prompt = [
        "A food photo check estimated this meal (one person's plate):", JSON.stringify(dishes),
        "The person says how they really made it and what is on the plate:", "\"" + text + "\"",
        "Rewrite the list of foods so it matches what the person says (they are right; keep foods they did not mention when they still make sense). Estimate realistic grams for the portion on the plate and the nutrition for that amount: kcal, protein, carbs (total, including sugar and fibre), sugar, fiber, fat in grams. Use typical values from food tables (e.g. USDA). Names short, in " + LANG[lang] + ". `portion` like \"about 200 g\" or \"2 pieces\". `note`: one short sentence in " + LANG[lang] + " on what changed. Return JSON.",
      ].join("\n");
      const r = await gemini({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1500, responseMimeType: "application/json", responseSchema: schema } });
      let j: { dishes?: Record<string, unknown>[]; note?: string } = {}; try { j = JSON.parse(r); } catch (_e) { return out(req, 502, { error: "ai_failed" }); }
      const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round((Number(v) || 0) * 10) / 10));
      const out2 = (j.dishes || []).slice(0, 8).map((d) => ({ name: clip(d.name, 60), portion: clip(d.portion, 40), grams: num(d.grams, 3000), kcal: Math.round(num(d.kcal, 3000)), protein: num(d.protein, 200), carbs: num(d.carbs, 400), sugar: num(d.sugar, 300), fiber: num(d.fiber, 100), fat: num(d.fat, 250) })).filter((d) => d.name);
      if (!out2.length) return out(req, 502, { error: "ai_failed" });
      return out(req, 200, { ok: true, dishes: out2, note: clip(j.note, 200) });
    }
    /* ask */
    const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-12).map((m: { role?: string; text?: string }) => ({ role: m && m.role === "model" ? "model" : "user", parts: [{ text: clip(m && m.text, 2000) || "…" }] }));
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") return out(req, 400, { error: "bad_request" });
    const ctx = clip(b.context, 3000);
    if (ctx) msgs[msgs.length - 1].parts.unshift({ text: "Context from the app (what the person is looking at):\n" + ctx });
    const img = typeof b.image === "string" && /^[A-Za-z0-9+/=]+$/.test(b.image) && b.image.length < 3_000_000 ? b.image : "";
    if (img) msgs[msgs.length - 1].parts.unshift({ inlineData: { mimeType: "image/jpeg", data: img } });
    let notes = ""; try { const last = String(msgs[msgs.length - 1].parts.map((p: { text?: string }) => p.text || "").join(" ")) + " " + ctx; const ks = pick(await knowledge(), last); if (ks.length) notes = "\n\nWhat LOWiSPIKE people shared (For You page and the public chat; anonymous notes, use them when they help, say \"someone in the community shared ...\", never invent more than they say, never name anyone):\n" + ks.map((x) => "- [" + x.k + "] " + x.t).join("\n"); } catch (_e) { notes = ""; }
    const r = await gemini({ systemInstruction: { parts: [{ text: mistyRules(clip(b.name, 40), clip(b.sign, 20), lang) + notes }] }, contents: msgs, generationConfig: { temperature: 0.6, maxOutputTokens: 700 } });
    return out(req, 200, { ok: true, text: clip(r, 4000) });
  } catch (e) {
    const m = String((e as Error).message || e);
    return out(req, m === "busy" ? 429 : 502, { error: m === "busy" ? "limit" : m });
  }
});
