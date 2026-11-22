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
//   POST {action:"linkcheck", title, caption, url}  is a For You link about insulin-friendly food / health? {ok, fits, why}
// Deploy: supabase functions deploy lowi-ai --no-verify-jwt
const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, /^capacitor:\/\/localhost$/];
const MODELS = (Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash-lite").split(",").map((s) => s.trim()).filter(Boolean);
const LANG: Record<string, string> = { en: "English", de: "German", es: "Spanish" };
/* the daily limits (per person per feature) and the whole-app cap */
export const LIMITS: Record<string, number> = { ask: 15, translate: 20, linkcheck: 10, mealfix: 15 };
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
    const r = await gemini({ systemInstruction: { parts: [{ text: mistyRules(clip(b.name, 40), clip(b.sign, 20), lang) }] }, contents: msgs, generationConfig: { temperature: 0.6, maxOutputTokens: 700 } });
    return out(req, 200, { ok: true, text: clip(r, 4000) });
  } catch (e) {
    const m = String((e as Error).message || e);
    return out(req, m === "busy" ? 429 : 502, { error: m === "busy" ? "limit" : m });
  }
});
