// studio-ai: the small AI helper behind LOWiSPIKE Studio (22 Nov 2026, Emmanuel: "my workflow is going to be simple. I copy the link of
// their TikTok video and the rest should be done ... it transcribes the video, it can translate the video, and based on the transcript it
// can fill up the strategy section").
// Uses the project's existing GEMINI_API_KEY secret (the same key food-photo uses); the browser never sees it.
//
//   POST {action:"fill", link, transcript?, lang}  owner only (public.is_app_owner()):
//        reads the TikTok link (creator, caption, cover, via the tiktok-meta function), tries to fetch the video and have Gemini
//        transcribe it when no transcript is given, then writes a short strategy. Returns {ok, meta, transcript, transcribed, hook, strategy, why}.
//        If TikTok refuses the video download, transcribed=false and the owner pastes the transcript (then the strategy is written from it).
//   POST {action:"translate", text, to}  anyone on the app's origin: translates text (max 6000 chars) into en / de / es.
// Deploy: supabase functions deploy studio-ai --no-verify-jwt  (it checks the session itself for fill)
const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, /^capacitor:\/\/localhost$/];
const MODELS = (Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash-lite").split(",").map((s) => s.trim()).filter(Boolean);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const MAX_VIDEO = 18 * 1024 * 1024;
const LANG: Record<string, string> = { en: "English", de: "German", es: "Spanish" };

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.some((r) => r.test(o)) ? o : "https://therealetm.github.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}
const out = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
const clip = (s: unknown, n: number) => String(s == null ? "" : s).replace(/\u0000/g, "").trim().slice(0, n);

async function isOwner(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") || "", url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!/^Bearer\s+\S+/.test(auth) || !url || !anon) return false;
  try { const r = await fetch(url + "/rest/v1/rpc/is_app_owner", { method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" }, body: "{}" }); return r.ok && (await r.json()) === true; } catch (_e) { return false; }
}
async function gemini(parts: unknown[], schema: unknown, maxTokens = 2048) {
  const key = Deno.env.get("GEMINI_API_KEY") || ""; if (!key) throw new Error("not_configured");
  for (const model of MODELS) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens, responseMimeType: "application/json", responseSchema: schema } }),
    });
    if (r.status === 404 || r.status === 400 && /not found|not supported|unknown model/i.test(await r.clone().text())) continue;
    if (r.status === 429) throw new Error("busy");
    if (!r.ok) throw new Error("ai_failed " + r.status);
    const j = await r.json(), text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    return JSON.parse(text);
  }
  throw new Error("no_model");
}
/* the video file behind a TikTok link: its page carries the play address and the cookies TikTok wants back. Best effort. */
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
    return { b64: btoa(s), mime: "video/mp4" };
  } catch (_e) { return null; }
}
async function meta(link: string) {
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  try { const r = await fetch(url + "/functions/v1/tiktok-meta", { method: "POST", headers: { apikey: anon!, Authorization: "Bearer " + anon, "Content-Type": "application/json" }, body: JSON.stringify({ url: link }) }); const j = await r.json(); return j && j.ok && j.meta ? j.meta : {}; } catch (_e) { return {}; }
}
const FILL = { type: "OBJECT", properties: { transcript: { type: "STRING" }, hook: { type: "STRING" }, strategy: { type: "ARRAY", items: { type: "STRING" } }, why: { type: "STRING" } }, required: ["hook", "strategy", "why"] };
const TRANS = { type: "OBJECT", properties: { text: { type: "STRING" } }, required: ["text"] };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  const o = req.headers.get("origin") || ""; if (o && !ORIGINS.some((r) => r.test(o))) return out(req, 403, { error: "origin" });
  let body: Record<string, unknown> = {}; try { body = await req.json(); } catch (_e) { return out(req, 400, { error: "bad_request" }); }
  const lang = LANG[String(body.lang || body.to || "en")] ? String(body.lang || body.to) : "en";
  try {
    if (body.action === "translate") {
      const text = clip(body.text, 6000); if (!text) return out(req, 400, { error: "bad_request" });
      const r = await gemini([{ text: "Translate the following text into " + LANG[lang] + ". Keep line breaks, keep names, handles and numbers as they are. Return JSON {text}.\n\n" + text }], TRANS, 4096);
      return out(req, 200, { ok: true, text: clip(r.text, 8000) });
    }
    if (body.action === "fill") {
      if (!(await isOwner(req))) return out(req, 403, { error: "owner_only" });
      const link = clip(body.link, 400); if (!/^https:\/\/([a-z0-9-]+\.)*(tiktok\.com|instagram\.com)\//i.test(link)) return out(req, 400, { error: "bad_link" });
      const m = await meta(link); let transcript = clip(body.transcript, 8000), transcribed = false;
      const parts: unknown[] = [];
      if (!transcript && /tiktok\.com/i.test(link)) { const v = await tiktokVideo(link); if (v) { parts.push({ inlineData: { mimeType: v.mime, data: v.b64 } }); transcribed = true; } }
      parts.push({ text: [
        "You help a content creator study a viral short video so they can make their own version.",
        "Creator: " + clip(m.author || m.handle, 80) + ". Caption: " + clip(m.title, 400) + ".",
        transcript ? "Transcript (given by the user):\n" + transcript : transcribed ? "Transcribe the spoken words of the attached video word for word (and any text on screen in [brackets]) into `transcript`." : "No transcript is available; leave `transcript` empty and work from the caption only.",
        "Then fill: `hook` = the first line that stops the scroll (as said or shown); `strategy` = 3 to 6 short steps describing the structure of the video (what happens in order, one short sentence each, no fluff); `why` = one or two sentences on why it works.",
        "Write `hook`, `strategy` and `why` in " + LANG[lang] + ". Keep `transcript` in the video's own language. Return JSON.",
      ].join("\n") });
      const r = await gemini(parts, FILL, 4096);
      return out(req, 200, { ok: true, meta: { thumb: m.thumb || "", author: m.author || "", handle: m.handle || "", title: m.title || "" }, transcript: transcript || clip(r.transcript, 8000), transcribed: transcribed && !!clip(r.transcript, 10), hook: clip(r.hook, 300), strategy: (Array.isArray(r.strategy) ? r.strategy : []).map((s: unknown) => clip(s, 200)).filter(Boolean).slice(0, 6), why: clip(r.why, 400) });
    }
    return out(req, 400, { error: "bad_action" });
  } catch (e) {
    const msg = String((e as Error).message || e);
    return out(req, msg === "busy" ? 429 : msg === "not_configured" ? 503 : 502, { error: msg.split(" ")[0] });
  }
});
