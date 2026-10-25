// tiktok-meta: a stable thumbnail (and title, creator, video id) for a TikTok link in For You.
// Oct 25, 2026 (Emmanuel): "every TikTok video inside my app, we see a thumbnail, the thumbnail or preview at least."
// TikTok's oEmbed cannot be read from the app (CORS) and its picture links expire after a few days (x-expires), so the
// server reads it, copies the picture into our public `media` bucket at tiktok/<videoId>.<ext> (it never expires there),
// and writes that stable link on the post. Idempotent: a post that already has its stable picture is returned as it is.
//
// POST {id}  -> fills posts.meta of that TikTok post (thumb, vid, title/author/handle only where empty), returns {ok, meta}
// POST {url} -> the same metadata for the composer, before the post exists (the picture is stored by video id), no row written
// Deploy: supabase functions deploy tiktok-meta --no-verify-jwt   (anyone, signed in or not; it only ever writes derived data)
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const PUB = SB_URL.replace(/\/$/, "") + "/storage/v1/object/public/media/tiktok/";
const MAX_IMG = 3 * 1024 * 1024;

function ttUrl(u: unknown): URL | null {
  try {
    const x = new URL(String(u || "").trim());
    return /^https?:$/.test(x.protocol) && /(^|\.)tiktok\.com$/i.test(x.hostname) ? x : null;
  } catch { return null; }
}
const vidFrom = (s: string) => { const m = /\/(?:video|v|photo)\/(\d{8,25})/.exec(s); return m ? m[1] : ""; };
const clip = (s: unknown, n: number) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
async function get(u: string, ms = 8000, init: RequestInit = {}) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(u, { ...init, signal: c.signal, headers: { "User-Agent": UA, "Accept-Language": "en", ...(init.headers || {}) } }); }
  finally { clearTimeout(t); }
}

type Meta = { thumb: string; vid: string; title: string; author: string; handle: string };

async function resolve(link: URL, admin: ReturnType<typeof createClient>): Promise<Meta | null> {
  let vid = vidFrom(link.pathname), title = "", author = "", handle = "", src = "";
  // 1. oEmbed: title, creator, the video id (embed_product_id) and, when TikTok gives it, the picture
  try {
    const r = await get("https://www.tiktok.com/oembed?url=" + encodeURIComponent(link.href));
    if (r.ok) {
      const j = await r.json();
      vid = vid || (/^\d{8,25}$/.test(String(j.embed_product_id || "")) ? String(j.embed_product_id) : "");
      title = clip(j.title, 300); author = clip(j.author_name, 80);
      handle = j.author_unique_id ? "@" + clip(j.author_unique_id, 60) : "";
      if (/^https:\/\//.test(j.thumbnail_url || "")) src = j.thumbnail_url;
    }
  } catch { /* next way */ }
  // 2. a short link (vm.tiktok.com/...) without an id: where it leads
  if (!vid) {
    try { const r = await get(link.href, 8000, { redirect: "manual" }); vid = vidFrom(r.headers.get("location") || ""); } catch { /* none */ }
  }
  if (!vid) return null;
  // already copied for this video: nothing to download (still read the page below when the creator is unknown)
  let have = "";
  for (const ext of ["jpg", "webp", "png"]) {
    try {
      const h = await get(PUB + vid + "." + ext, 5000, { method: "HEAD" });
      if (h.ok) { have = PUB + vid + "." + ext; break; }
    } catch { /* go on */ }
  }
  if (have && (handle || author)) return { thumb: have, vid, title, author, handle };
  // 3. no picture in oEmbed: the video's own page carries its cover (and the caption and creator)
  if ((!src && !have) || !title || !handle) {
    try {
      const r = await get("https://www.tiktok.com/" + (handle || "@i") + "/video/" + vid, 10000);
      if (r.ok) {
        const h = await r.text();
        const m = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/.exec(h);
        const it = m ? JSON.parse(m[1])?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct : null;
        if (it) {
          const v = it.video || {};
          src = src || [v.cover, v.originCover, v.dynamicCover].find((x: unknown) => typeof x === "string" && /^https:\/\//.test(x)) || "";
          if (!src && it.imagePost?.cover?.imageURL?.urlList?.[0]) src = it.imagePost.cover.imageURL.urlList[0];
          title = title || clip(it.desc, 300);
          author = author || clip(it.author?.nickname, 80);
          handle = handle || (it.author?.uniqueId ? "@" + clip(it.author.uniqueId, 60) : "");
        }
      }
    } catch { /* no picture */ }
  }
  if (have) return { thumb: have, vid, title, author, handle };
  if (!src) return { thumb: "", vid, title, author, handle };
  // 4. copy the picture to our own storage, where the link never expires
  try {
    const r = await get(src, 10000);
    const type = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return { thumb: "", vid, title, author, handle };
    const b = new Uint8Array(await r.arrayBuffer());
    if (!b.length || b.length > MAX_IMG) return { thumb: "", vid, title, author, handle };
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const up = await admin.storage.from("media").upload("tiktok/" + vid + "." + ext, b, { contentType: type, upsert: true, cacheControl: "31536000" });
    if (up.error) return { thumb: "", vid, title, author, handle };
    return { thumb: PUB + vid + "." + ext, vid, title, author, handle };
  } catch { return { thumb: "", vid, title, author, handle }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body: { id?: string; url?: string } = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "body" }, 400); }
  const admin = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (body.id) {
    const id = String(body.id).slice(0, 80);
    const { data: row, error } = await admin.from("posts").select("id,url,meta").eq("id", id).maybeSingle();
    if (error) return json({ ok: false, error: "read" }, 500);
    const link = row && ttUrl(row.url);
    if (!row || !link) return json({ ok: false, error: "not a TikTok post" }, 404);
    const old = row.meta && typeof row.meta === "object" ? row.meta : {};
    // done: the stored picture and the creator; without a creator it tries again at most once a day
    if (typeof old.thumb === "string" && old.thumb.startsWith(PUB) && old.vid && (old.author || old.handle || Date.now() - Number(old.tt || 0) < 864e5)) return json({ ok: true, meta: old, cached: true });
    const m = await resolve(link, admin);
    if (!m) return json({ ok: false, error: "unknown video" }, 422);
    const meta = { ...old, vid: m.vid, tt: Date.now() } as Record<string, unknown>;
    if (m.thumb) meta.thumb = m.thumb;
    if (!old.title && m.title) meta.title = m.title;
    if (!old.author && m.author) meta.author = m.author;
    if (!old.handle && m.handle) meta.handle = m.handle;
    const u = await admin.from("posts").update({ meta }).eq("id", id);
    if (u.error) return json({ ok: false, error: "write" }, 500);
    return json({ ok: !!m.thumb, meta });
  }
  const link = ttUrl(body.url);
  if (!link) return json({ ok: false, error: "not a TikTok link" }, 400);
  const m = await resolve(link, admin);
  return m ? json({ ok: !!m.thumb, meta: m }) : json({ ok: false, error: "unknown video" }, 422);
});
