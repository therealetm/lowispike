// studio-ai: the small AI helper behind LOWiSPIKE Studio (22 Nov 2026, Emmanuel: "my workflow is going to be simple. I copy the link of
// their TikTok video and the rest should be done ... it transcribes the video, it can translate the video, and based on the transcript it
// can fill up the strategy section").
// Uses the project's existing GEMINI_API_KEY secret (the same key food-photo uses); the browser never sees it.
//
//   POST {action:"fill", link, transcript?, lang}  owner only (public.is_app_owner()):
//        reads the TikTok link (creator, caption, cover, via the tiktok-meta function), tries to fetch the video and have Gemini
//        transcribe it when no transcript is given, then writes a short strategy. Returns {ok, meta, transcript, transcribed, hook, strategy, why}.
//        If TikTok refuses the video download, transcribed=false and the owner pastes the transcript (then the strategy is written from it).
//   POST {action:"profile", link}  anyone (30 a day per connection): a TikTok / Instagram profile -> {name, handle, bio, avatar, followers}
//   POST {action:"translate", text, to}  anyone on the app's origin: translates text (max 6000 chars) into en / de / es, or (since
//        23 Nov 2026) into any language named in `to` ("Italian", "Türkçe", "Brazilian Portuguese").
//   POST {action:"captions", bio, examples:[{hook,text}], clips:[{sec, style}], lang}  every signed-in person, 20 a day (owner: no cap) (24 Nov 2026, Emmanuel: "upload that
//        60-second video and it will automatically be cut ... every chopped up version has a text on screen that's been generated
//        automatically ... based on the text on screen details that I want ... one is in I form, one is in U form ... one is teaching"):
//        one text-on-screen line per clip, in the creator's own voice (bio), learning the style from the playlist examples, sized so it
//        can be read in the clip's seconds. Returns {texts:[...]} in the same order.
//   POST {action:"words", link}  every signed-in person, 10 a day (owner: no cap) (23 Nov 2026, Emmanuel: "I send a link of a video that I'm about to copy, and it then gives
//        me the transcript, if there is a transcript, or the text on the screen ... and the bio. And then I can translate it"):
//        a TikTok video -> {caption, author, transcript (spoken words), onscreen (text shown on screen), transcribed}. When the video
//        file cannot be fetched (Instagram, or TikTok refuses), only the caption comes back and transcribed=false.
// Deploy: supabase functions deploy studio-ai --no-verify-jwt  (it checks the session itself for fill)
const ORIGINS = [/^https:\/\/therealetm\.github\.io$/, /^https:\/\/(www\.)?lowispike\.com$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, /^capacitor:\/\/localhost$/];
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
/* the signed-in person's id (their session token), "" when not signed in */
async function userId(req: Request): Promise<string> {
  const auth = req.headers.get("authorization") || "", url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!/^Bearer\s+\S+/.test(auth) || !url || !anon) return "";
  try { const r = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: auth } }); if (!r.ok) return ""; const u = await r.json(); return typeof u?.id === "string" ? u.id : ""; } catch (_e) { return ""; }
}
/* 25 Nov 2026 (Emmanuel: "Why would I be owner only? I'm doing this so people can also use this exact thing like me"): the video machine's
   texts (captions) and a video's words from a link (words) are for every signed-in person, each with their own daily limit; the owner
   keeps his bigger one. Adding to the shared Swipe file (fill) stays the owner's. Returns the limit subject, or "" (then: sign_in). */
async function who(req: Request, feature: string): Promise<{ sub: string; max: number }> {
  const PER = { captions: [0, 20], words: [0, 10] } as Record<string, number[]>;   /* [owner (no cap, see take), everyone else] */
  if (await isOwner(req)) return { sub: "owner", max: PER[feature][0] };
  const uid = await userId(req); return uid ? { sub: uid, max: PER[feature][1] } : { sub: "", max: 0 };
}
/* 22 Nov 2026: Studio shares the app's AI limits (public.ai_usage): translate 20 a day per person, fill 100 a day for the owner */
/* the owner (subject "owner") is counted but never stopped (25 Nov 2026, Emmanuel: "you are capping me, the admin. Don't do that") */
async function take(subject: string, feature: string, max: number): Promise<string> {
  const free = subject === "owner", NO_CAP = 1_000_000_000;
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  try { const r = await fetch(url + "/rest/v1/rpc/ai_take", { method: "POST", headers: { apikey: key!, Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ p_subject: subject, p_feature: feature, p_user_max: free ? NO_CAP : max, p_global_max: free ? NO_CAP : 400 }) }); return r.ok ? String(await r.json()) : "error"; } catch (_e) { return "error"; }
}
async function gemini(parts: unknown[], schema: unknown, maxTokens = 2048, plain = false) {
  const key = Deno.env.get("GEMINI_API_KEY") || ""; if (!key) throw new Error("not_configured");
  for (const model of MODELS) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: plain ? { temperature: 0.7, maxOutputTokens: maxTokens } : { temperature: 0.2, maxOutputTokens: maxTokens, responseMimeType: "application/json", responseSchema: schema } }),
    });
    if (r.status === 404 || r.status === 400 && /not found|not supported|unknown model/i.test(await r.clone().text())) continue;
    if (r.status === 429) throw new Error("busy");
    if (!r.ok) throw new Error("ai_failed " + r.status);
    const j = await r.json(), text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    if (plain) return text;
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
/* 22 Nov 2026 (Emmanuel: "they can even just paste in their profile link ... then that takes the bio and their profile picture"):
   a public TikTok or Instagram profile page -> name, @handle, bio, numbers and the picture (as a small data URL, because TikTok's own
   picture links expire). Best effort: when the page gives nothing, ok:false and the person types the name themselves. */
async function asDataUrl(src: string): Promise<string> {
  try { const r = await fetch(src, { headers: { "User-Agent": UA, Referer: "https://www.tiktok.com/" } }); if (!r.ok) return "";
    const b = new Uint8Array(await r.arrayBuffer()); if (!b.length || b.length > 200_000) return "";
    let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return "data:" + (r.headers.get("content-type") || "image/jpeg").split(";")[0] + ";base64," + btoa(s); } catch (_e) { return ""; }
}
const og = (h: string, k: string) => { const m = new RegExp('<meta[^>]+(?:property|name)="' + k + '"[^>]+content="([^"]*)"', "i").exec(h) || new RegExp('<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="' + k + '"', "i").exec(h); return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'") : ""; };
async function profile(link: string) {
  const tt = /tiktok\.com\/@([A-Za-z0-9._]+)/i.exec(link), ig = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(link);
  const url = tt ? "https://www.tiktok.com/@" + tt[1] : ig ? "https://www.instagram.com/" + ig[1] + "/" : "";
  if (!url) return null;
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" }, redirect: "follow" }); if (!r.ok) return { handle: "@" + (tt || ig)![1] };
  const h = await r.text();
  if (tt) {
    const m = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/.exec(h);
    try { const ui = m ? JSON.parse(m[1])?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo : null, u = ui?.user || {}, st = ui?.stats || {};
      if (u.uniqueId) return { name: clip(u.nickname, 80), handle: "@" + clip(u.uniqueId, 60), bio: clip(u.signature, 300), avatar: await asDataUrl(u.avatarMedium || u.avatarThumb || ""), followers: Number(st.followerCount) || 0, likes: Number(st.heartCount) || 0, videos: Number(st.videoCount) || 0 }; } catch (_e) { /* fall through */ }
  }
  const title = og(h, "og:title"), desc = og(h, "og:description"), img = og(h, "og:image");
  return { name: clip(title.replace(/\s*[(|•].*$/, ""), 80), handle: "@" + (tt || ig)![1], bio: clip(desc, 300), avatar: img ? await asDataUrl(img) : "" };
}
const FILL = { type: "OBJECT", properties: { transcript: { type: "STRING" }, hook: { type: "STRING" }, strategy: { type: "ARRAY", items: { type: "STRING" } }, why: { type: "STRING" } }, required: ["hook", "strategy", "why"] };
const TRANS = { type: "OBJECT", properties: { text: { type: "STRING" } }, required: ["text"] };
const CAPS = { type: "OBJECT", properties: { texts: { type: "ARRAY", items: { type: "STRING" } } }, required: ["texts"] };
const WORDS = { type: "OBJECT", properties: { transcript: { type: "STRING" }, onscreen: { type: "STRING" } }, required: ["transcript", "onscreen"] };
/* any language a person names, kept to letters, spaces and a few marks so it cannot carry an instruction */
const anyLang = (v: unknown) => { const x = clip(v, 40); return /^[\p{L}][\p{L} ()'-]{1,39}$/u.test(x) ? x : ""; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return out(req, 405, { error: "method" });
  const o = req.headers.get("origin") || ""; if (o && !ORIGINS.some((r) => r.test(o))) return out(req, 403, { error: "origin" });
  let body: Record<string, unknown> = {}; try { body = await req.json(); } catch (_e) { return out(req, 400, { error: "bad_request" }); }
  const lang = LANG[String(body.lang || body.to || "en")] ? String(body.lang || body.to) : "en";
  const toName = LANG[String(body.to || "")] || anyLang(body.to) || LANG[lang];
  try {
    if (body.action === "translate") {
      const text = clip(body.text, 6000); if (!text) return out(req, 400, { error: "bad_request" });
      const sub = "ip:" + clip((req.headers.get("x-forwarded-for") || "").split(",")[0], 60) + ":" + clip((req.headers.get("authorization") || "").slice(-24), 24);
      if ((await take(sub, "translate", 20)) !== "ok") return out(req, 429, { error: "limit" });
      const r = await gemini([{ text: "Translate the following text into " + toName + ". Keep line breaks, keep names, handles and numbers as they are. Return JSON {text}.\n\n" + text }], TRANS, 4096);
      return out(req, 200, { ok: true, text: clip(r.text, 8000) });
    }
    if (body.action === "profile") {
      const link = clip(body.link, 300); if (!/^https:\/\/([a-z0-9-]+\.)*(tiktok\.com\/@|instagram\.com\/)/i.test(link)) return out(req, 400, { error: "bad_link" });
      const sub = "ip:" + clip((req.headers.get("x-forwarded-for") || "").split(",")[0], 60);
      if ((await take(sub, "profile", 30)) !== "ok") return out(req, 429, { error: "limit" });
      const p = await profile(link); if (!p) return out(req, 400, { error: "bad_link" });
      return out(req, 200, { ok: true, profile: p });
    }
    if (body.action === "captions") {
      const w = await who(req, "captions"); if (!w.sub) return out(req, 401, { error: "sign_in" });
      const clips = (Array.isArray(body.clips) ? body.clips : []).slice(0, 12).map((c: Record<string, unknown>) => ({ sec: Math.max(3, Math.min(60, Math.round(Number(c && c.sec) || 8))), style: clip(c && c.style, 40) || "general" }));
      if (!clips.length) return out(req, 400, { error: "bad_request" });
      if ((await take(w.sub, "captions", w.max)) !== "ok") return out(req, 429, { error: "limit" });
      /* 25 Nov 2026 (Emmanuel: "how does it learn from the viral text in the playlists and actually utilizes it? ... I don't want this to
         become a guessing game"): each example now carries its text on screen (for B-roll posts that is the viral text itself), then
         its hook and what is said; before, only the hook and the spoken words were sent. */
      const ex = (Array.isArray(body.examples) ? body.examples : []).slice(0, 20).map((e: Record<string, unknown>, i: number) => {
        const scr = clip(e && e.screen, 500), hk = clip(e && e.hook, 200), sp = clip(e && e.text, 260);
        return (i + 1) + "." + (scr ? "\n   on screen: " + scr.replace(/\n+/g, " / ") : "") + (hk ? "\n   hook: " + hk : "") + (sp ? "\n   said: " + sp : "");
      }).join("\n");
      /* 24 Nov 2026 (Emmanuel: "it did not generate me the texts"): never an empty answer without a reason. The JSON answer first
         (with room to think); when it fails or comes back short, once more as plain text, one block per clip between --- lines.
         The reason goes to the caller and to the function log. */
      const prompt = [
        "You write the text on screen for short vertical videos (TikTok / Reels): one short text over a calm B-roll clip, like viral 'text tweet' posts.",
        "The creator, in their own words (their voice, topics, audience and pillars; use it, never quote it as a whole):\n" + clip(body.bio, 3000),
        ex ? "Viral videos the creator picked to learn from (their text on screen, hook and spoken words):\n" + ex + "\n\nStudy them before you write: how the first line stops the scroll, how long each line is, where the line breaks fall, the point of view, the emotional turn near the end, the plain everyday words. Write NEW texts about the creator's own message (above) with those same patterns. Never copy or lightly reword an example." : "",
        "Write one text per clip, in this order. Each clip has its length in seconds and a style:",
        clips.map((c, i) => (i + 1) + ". " + c.sec + " s, style: " + c.style).join("\n"),
        "Styles: 'I' = first person, a confession or realisation; 'you' = speaks to the viewer; 'general' = a universal truth; 'teaching' = one useful tip; 'relatable' = a feeling people share; 'funny' = light and witty.",
        "Length: it must be readable in the clip's seconds, about 2.5 words per second minus 1 second (5 s about 10 words, 8 s about 18, 13 s about 30, 21 s about 48). Use line breaks between thoughts. Lowercase is fine. No hashtags, no emojis unless they add meaning, no quotes around it.",
        "No medical claims, no diagnoses, no promises about blood sugar numbers.",
        "Write in " + (LANG[lang] || "English") + ".",
      ].filter(Boolean).join("\n\n");
      let texts: string[] = [], why = "";
      try {
        const r = await gemini([{ text: prompt + "\n\nReturn JSON {texts}." }], CAPS, 8192);
        texts = (Array.isArray(r?.texts) ? r.texts : Array.isArray(r) ? r : []).map((x: unknown) => clip(typeof x === "string" ? x : (x as Record<string, unknown>)?.text, 600));
      } catch (e) { why = String((e as Error).message || e); console.error("captions json", why); }
      if (texts.filter(Boolean).length < clips.length) {
        try {
          const raw = String(await gemini([{ text: prompt + "\n\nAnswer with the texts only, in order, one block per clip, with a line containing only --- between them. No numbers, no labels." }], null, 8192, true));
          const blocks = raw.split(/\n\s*-{3,}\s*\n/).map((x) => clip(x.replace(/^\s*\d+[.)]\s*/, ""), 600)).filter(Boolean);
          texts = clips.map((_c, i) => texts[i] || blocks[i] || "");
        } catch (e) { why = why || String((e as Error).message || e); console.error("captions text", String(e)); }
      }
      if (!texts.some(Boolean)) return out(req, why === "busy" ? 429 : 502, { error: why === "busy" ? "busy" : "ai_failed", detail: clip(why, 300) });
      return out(req, 200, { ok: true, texts: clips.map((_c, i) => texts[i] || "") });
    }
    if (body.action === "words") {
      const w = await who(req, "words"); if (!w.sub) return out(req, 401, { error: "sign_in" });
      const link = clip(body.link, 400); if (!/^https:\/\/([a-z0-9-]+\.)*(tiktok\.com|instagram\.com)\//i.test(link)) return out(req, 400, { error: "bad_link" });
      if ((await take(w.sub, "words", w.max)) !== "ok") return out(req, 429, { error: "limit" });
      const m = await meta(link), v = /tiktok\.com/i.test(link) ? await tiktokVideo(link) : null;
      if (!v) return out(req, 200, { ok: true, caption: clip(m.title, 2200), author: clip(m.author || m.handle, 80), thumb: m.thumb || "", transcript: "", onscreen: "", transcribed: false });
      const r = await gemini([{ inlineData: { mimeType: v.mime, data: v.b64 } }, { text: [
        "Write down the words of this short video exactly, in the video's own language. Do not translate, do not summarise, do not add anything.",
        "`transcript`: every spoken word, in order, as sentences (empty if nobody speaks).",
        "`onscreen`: every piece of text shown on screen (captions burned into the video, titles, stickers), one line per piece, in order, without repeating the same line (empty if there is none).",
        "Return JSON." ].join("\n") }], WORDS, 4096);
      return out(req, 200, { ok: true, caption: clip(m.title, 2200), author: clip(m.author || m.handle, 80), thumb: m.thumb || "", transcript: clip(r.transcript, 8000), onscreen: clip(r.onscreen, 3000), transcribed: true });
    }
    if (body.action === "fill") {
      if (!(await isOwner(req))) return out(req, 403, { error: "owner_only" });
      if ((await take("owner", "fill", 100)) !== "ok") return out(req, 429, { error: "limit" });
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
