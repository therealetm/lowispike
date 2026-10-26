// LOWiSPIKE voice-text (Oct 26, 2026)
// Why: Emmanuel: "So, I can click on a microphone and then I can just speak and it writes it ... basically everywhere where
// you're supposed to type." iPhone Safari's own speech API (webkitSpeechRecognition) does not work in web apps added to the
// Home Screen (WebKit bug 225298, "LATER"), so on Apple devices the app records a short clip itself (only after the user taps
// the mic), turns it into a small 16 kHz mono WAV and sends it here. This function asks Google Gemini (same GEMINI_API_KEY
// secret as food-photo; the browser never sees it) for the words and returns { text }.
//   GET                                   -> { ok, configured, max_s }
//   POST { audio: <base64 wav>, lang, field? } -> { text, model }
// Rules: only callers with a LOWiSPIKE sign-in (any Supabase session, guests included) and only from the app's origin.
// Max 30 s of audio (about 1.3 MB base64). Per person and worker: 20 clips per 10 minutes, 200 a day. Audio and transcripts are
// never logged or stored. Deploy: Supabase Management API or dashboard > Edge Functions > new function "voice-text", verify_jwt
// off (it checks the session itself, like food-photo). Optional secret GEMINI_MODEL picks the model chain.

const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const MAX_B64 = 1_400_000, MIN_B64 = 2_000, MAX_S = 30;
const WIN_MS = 10 * 60 * 1000, WIN_MAX = 20, DAY_MS = 24 * 3600 * 1000, DAY_MAX = 200;
const MODELS = (Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash-lite")
  .split(",").map((s) => s.trim()).filter(Boolean);
const LANGS: Record<string, string> = { en: "English", de: "German", es: "Spanish" };
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

async function who(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  try {
    const r = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && typeof u.id === "string" ? u.id : null;
  } catch (_e) { return null; }
}

function allow(uid: string): boolean {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter((t) => now - t < DAY_MS);
  if (list.filter((t) => now - t < WIN_MS).length >= WIN_MAX || list.length >= DAY_MAX) { hits.set(uid, list); return false; }
  list.push(now); hits.set(uid, list);
  return true;
}
function giveBack(uid: string) { const l = hits.get(uid); if (l && l.length) l.pop(); }

// What kind of field the words go into helps with food words ("Skyr", "Hähnchen"), nothing more.
export function fieldHint(v: unknown): string {
  const f = String(v == null ? "" : v).toLowerCase();
  return f === "food" ? "a food or meal name (food words, dishes, brands)" : f === "search" ? "a search box" : f === "name" ? "a short name" : "a text field";
}
export function prompt(lang: string, field: unknown): string {
  const l = LANGS[lang] || "English";
  return "Transcribe this short voice recording word for word. The speaker most likely speaks " + l +
    " (they may mix in other languages or brand names; keep those as spoken). The words will be typed into " + fieldHint(field) +
    " in a food and health app. Write numbers as digits when the speaker says amounts (\"2 eggs\", \"500 g\"). Use normal" +
    " capitalization and punctuation for " + l + ". Do not answer, translate, summarize or add anything. If there is no clear" +
    " speech, return an empty text.";
}
export function clean(v: unknown): string {
  let s = String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}`]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^["“„«']+|["”«»']+$/g, "").trim();
  return s.slice(0, 600);
}

const SCHEMA = { type: "OBJECT", properties: { text: { type: "STRING" } }, required: ["text"] };

async function gemini(key: string, audio: string, lang: string, field: unknown) {
  let last = 0;
  for (const model of MODELS) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: "audio/wav", data: audio } }, { text: prompt(lang, field) }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 512, responseMimeType: "application/json", responseSchema: SCHEMA },
      }),
    });
    last = r.status;
    if (r.status === 404 || r.status === 400 && /not found|not supported|unknown model/i.test(await r.clone().text())) {
      console.error("voice-text: model unavailable", model, r.status);
      continue;
    }
    if (r.status === 429) return { status: 429, body: { error: "busy" } };
    if (!r.ok) { console.error("voice-text: gemini status", r.status); return { status: 502, body: { error: "ai_failed" } }; }
    const j = await r.json();
    const raw = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    let text = "";
    try { text = clean(JSON.parse(raw).text); } catch (_e) { text = clean(raw); }
    return { status: 200, body: { text, model } };
  }
  return { status: 502, body: { error: "no_model", status: last } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  if (req.method === "GET") return out(req, 200, { ok: true, configured: !!key, max_s: MAX_S });
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  const o = req.headers.get("origin") || "";
  if (o && !ORIGINS.some((r) => r.test(o))) return out(req, 403, { error: "origin" });
  if (!key) return out(req, 503, { error: "not_configured" });
  const uid = await who(req);
  if (!uid) return out(req, 401, { error: "sign_in" });
  let body: { audio?: string; lang?: string; field?: string };
  try { body = await req.json(); } catch (_e) { return out(req, 400, { error: "bad_request" }); }
  const audio = String(body.audio || "").replace(/^data:[^,]*,/, "");
  const lang = LANGS[String(body.lang)] ? String(body.lang) : "en";
  if (audio.length < MIN_B64 || audio.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(audio) || !audio.startsWith("UklGR")) {
    return out(req, 400, { error: "bad_audio" });
  }
  if (!allow(uid)) return out(req, 429, { error: "busy" });
  try {
    const r = await gemini(key, audio, lang, body.field);
    if (r.status !== 200) giveBack(uid);
    return out(req, r.status, r.body);
  } catch (_e) {
    console.error("voice-text: request failed");
    giveBack(uid);
    return out(req, 502, { error: "ai_failed" });
  }
});
