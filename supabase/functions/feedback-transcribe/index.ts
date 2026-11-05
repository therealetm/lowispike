// LOWiSPIKE feedback-transcribe (Nov 5 2026)
// Why: Emmanuel: "a Transcribe all button, and then Copy all transcribed, so if a hundred people send me stuff I don't have to do it
// one by one." Voice notes arrive without a transcript (the phone never transcribes while recording, so recording stays reliable);
// the owner's Feedback inbox sends the selected notes here, one call per note, only when the owner presses Transcribe. This function reads the note from the private 'feedback' bucket, asks
// Google's Gemini (free tier, Flash-Lite, the same GEMINI_API_KEY secret food-photo already uses) for a word-for-word transcript
// in the language spoken, and saves it on the row (transcript_by = 'gemini').
//   POST { id: <app_feedback id> } -> { id, transcript, model }
// Owner only: the caller's own sign-in must pass public.is_app_owner() (supabase/proposals/owner_admin_20261018.sql). Nothing else
// is accepted, and audio is never logged or kept here.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > name "feedback-transcribe" > paste this file.
// Needs supabase/proposals/feedback_20261105.sql first. Optional secret GEMINI_MODEL picks the model, like food-photo.

const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, /^capacitor:\/\/localhost$/];
const MODELS = (Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash-lite")
  .split(",").map((s) => s.trim()).filter(Boolean);
const MAX_BYTES = 8_400_000; // bucket limit is 8 MB per file (about 5 minutes of voice)
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
function mimeOf(path: string): string {
  return /\.webm$/.test(path) ? "audio/webm" : /\.ogg$/.test(path) ? "audio/ogg" : /\.aac$/.test(path) ? "audio/aac" : "audio/mp4";
}
function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function isOwner(url: string, anon: string, auth: string): Promise<boolean> {
  try {
    const r = await fetch(url + "/rest/v1/rpc/is_app_owner", {
      method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: "{}",
    });
    return r.ok && (await r.json()) === true;
  } catch (_e) { return false; }
}

async function gemini(key: string, audio: string, mime: string) {
  let last = 0;
  for (const model of MODELS) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: audio } }, {
          text: "This is app feedback someone recorded as a voice note. Write down exactly what they say, word for word, in the " +
            "language they speak (do not translate). Keep their wording, add normal punctuation, no summary, no comments. If nothing " +
            "is said, answer with an empty string.",
        }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
      }),
    });
    last = r.status;
    if (r.status === 404 || r.status === 400 && /not found|not supported|unknown model/i.test(await r.clone().text())) continue;
    if (r.status === 429) return { status: 429, body: { error: "busy" } };
    if (!r.ok) { console.error("feedback-transcribe: gemini status", r.status); return { status: 502, body: { error: "ai_failed" } }; }
    const j = await r.json();
    const text = (j?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
    return { status: 200, body: { transcript: text.slice(0, 20000), model } };
  }
  return { status: 502, body: { error: "no_model", status: last } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  const o = req.headers.get("origin") || "";
  if (o && !ORIGINS.some((r) => r.test(o))) return out(req, 403, { error: "origin" });
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  const url = Deno.env.get("SUPABASE_URL") || "", anon = Deno.env.get("SUPABASE_ANON_KEY") || "", svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!key) return out(req, 503, { error: "not_configured" });
  if (!url || !anon || !svc) return out(req, 503, { error: "server_setup" });
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return out(req, 401, { error: "sign_in" });
  if (!(await isOwner(url, anon, auth))) return out(req, 403, { error: "not_owner" });
  let body: { id?: string };
  try { body = await req.json(); } catch (_e) { return out(req, 400, { error: "bad_request" }); }
  const id = String(body.id || "");
  if (!ID.test(id)) return out(req, 400, { error: "bad_request" });
  const H = { apikey: svc, Authorization: "Bearer " + svc };
  const rr = await fetch(url + "/rest/v1/app_feedback?id=eq." + id + "&select=id,voice_path", { headers: H });
  if (!rr.ok) return out(req, 502, { error: "read_failed" });
  const row = (await rr.json())[0];
  if (!row) return out(req, 404, { error: "not_found" });
  const path = String(row.voice_path || "");
  if (!/^fb\/[0-9a-z-]{8,40}\/voice\.(m4a|webm|ogg|aac)$/.test(path)) return out(req, 400, { error: "no_voice" });
  const fr = await fetch(url + "/storage/v1/object/feedback/" + path, { headers: H });
  if (!fr.ok) return out(req, 404, { error: "voice_missing" });
  const bytes = new Uint8Array(await fr.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return out(req, 413, { error: "too_big" });
  const ct = (fr.headers.get("content-type") || "").split(";")[0].trim().replace(/^video\//, "audio/");
  const g = await gemini(key, b64(bytes), /^audio\/(mp4|aac|webm|ogg)$/.test(ct) ? ct : mimeOf(path));
  if (g.status !== 200) return out(req, g.status, g.body);
  const t = (g.body as { transcript: string }).transcript;
  const up = await fetch(url + "/rest/v1/app_feedback?id=eq." + id, {
    method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ transcript: t, transcript_by: "gemini" }),
  });
  if (!up.ok) return out(req, 502, { error: "save_failed" });
  return out(req, 200, { id, transcript: t, model: (g.body as { model: string }).model });
});
