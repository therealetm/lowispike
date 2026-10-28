/* LOWiSPIKE For You rule (pure logic, no DOM). 24 Oct 2026, Emmanuel: "all the images there don't fit our standard,
 * insulin friendly. Clear all of them ... From now on make sure they're always insulin friendly and fit our whole LOWiSPIKE
 * scene." and "when you share to the community, it should also land on the For You page."
 *
 * Standing rule (DECISIONS.md, 24 Oct 2026): For You only shows items with an insulin-friendly verdict from the app's own
 * logic. An item's verdict is the WORST of what it carries:
 *   - meta.meal: the meal read from a photo, rebuilt and re-scored on this phone (LowiMealSnap.clean -> bs, never trusted);
 *   - meta.spike: the spike level the app gave a logged meal (meal journal), set when a meal is shared to Community;
 *   - rec: a Recipe Book recipe, by its own verdict (r: "ja" -> low, "selten" -> mid, "nein" -> high).
 * Only "low" (the app's "Low spike" / "No spike") passes. An item that carries none of these (a plain link, a video, a
 * text, a crowd "Just ate" post) has no verdict and does not show. The inspiration bot's slides carry a Recipe Book recipe
 * and pass the same rule; nothing gets a free pass.
 *
 * 25 Oct 2026, Emmanuel (voice, 10:02): "I post stuff to the For You page and it automatically goes to only for you ...
 * when someone, me or anyone, posts on the For You page, it's actually there." and "if it's a video from someone else, it
 * shouldn't play in our platform. It should take them to their platform ... We're a supportive tribe."
 * So (DECISIONS.md, 25 Oct 2026) the rule above now holds for what the APP adds on its own (the inspiration bot, the crowd
 * accounts, a meal shared to Community that also lands in For You). A real member's own post to For You always shows:
 * shows(p). A post that is kept back is labelled and the poster can share it from My posts (held(p)). Videos from
 * another platform never play inside LOWiSPIKE: external(url) names the creator's platform, the tap opens the original. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiForYouCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const RANK = { low: 0, mid: 1, high: 2 };
  function level(v) { v = String(v || '').toLowerCase(); if (v === 'medium') v = 'mid'; return RANK.hasOwnProperty(v) ? v : ''; }
  function recipeLevel(r) { const v = typeof r === 'string' ? r : r && r.r; return v === 'ja' ? 'low' : v === 'selten' ? 'mid' : v === 'nein' ? 'high' : ''; }

  /* ctx: {meal(m) -> 'low'|'mid'|'high' (re-scored), recipe(id) -> recipe object or null} */
  function verdict(p, ctx) {
    if (!p || typeof p !== 'object') return '';
    ctx = ctx || {};
    const got = [];
    const meta = p.meta && typeof p.meta === 'object' ? p.meta : null;
    if (meta && meta.meal) {
      const l = ctx.meal ? level(ctx.meal(meta.meal)) : '';
      got.push(l || 'high'); /* a meal we cannot score does not pass */
    }
    if (meta && meta.spike != null) got.push(level(meta.spike) || 'high');
    if (p.rec) {
      const l = ctx.recipe ? recipeLevel(ctx.recipe(p.rec)) : '';
      got.push(l || 'high'); /* an unknown recipe id does not pass */
    }
    if (!got.length) return '';
    return got.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'low');
  }
  const passes = (p, ctx) => verdict(p, ctx) === 'low';
  const filter = (list, ctx) => (Array.isArray(list) ? list : []).filter(p => passes(p, ctx));

  /* The For You feed: members' posts (shows, 25 Oct), plus the bot's slides (bot posts pass the insulin rule), newest first, no duplicates. */
  function merge(list, bot, ctx) {
    const seen = new Set(), out = [];
    for (const p of (bot || []).concat(list || [])) { if (!p || !p.id || seen.has(p.id)) continue; seen.add(p.id); if (shows(p, ctx)) out.push(p); }
    out.sort((a, b) => (+b.ts || 0) - (+a.ts || 0));
    /* 28 Oct 2026 (Emmanuel, call): today's Tausch des Tages stays at the top of For You. It is dated 08:00, so the bot's
     * lunch and dinner recipe posts and member posts used to push it down during the day. Only today's card is pinned:
     * bot[0] is the current day's slide (inspo-core feed(), newest first); the older swaps keep their place by date. */
    const today = (bot || [])[0];
    if (today && today.bot && today.inspo) { const i = out.indexOf(today); if (i > 0) { out.splice(i, 1); out.unshift(today); } }
    return out;
  }

  /* Share -> Community also lands in For You. The meal journal posts {photo url, dish name, spike level, caption} to the
   * Community room; the same meal becomes a For You post with meta.spike, so the rule above decides. */
  function str(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); }
  function sharePost(o) {
    o = o || {};
    const src = String(o.src || ''), name = str(o.name, 80), lvl = level(o.lvl);
    if (!/^https:\/\//.test(src) || !name || !lvl) return null;
    const caption = str(o.caption, 140);
    return { id: 's' + String(o.id || Date.now().toString(36)), ts: typeof o.now === 'number' ? o.now : Date.now(), plat: '', url: '',
      meta: { spike: lvl, dish: name, from: 'community' }, cap: caption || name, photo: src, rec: '', vis: 'tribe', mine: false };
  }
  /* The photo url of a shared meal, read back from the Community row (any text field that holds a meal body). */
  function srcOfRow(row, parseMeal) {
    if (!row || typeof parseMeal !== 'function') return '';
    const vals = typeof row === 'string' ? [row] : Object.keys(row).map(k => row[k]);
    for (const v of vals) { if (typeof v !== 'string') continue; const m = parseMeal(v); if (m && m.src) return m.src; }
    return '';
  }

  /* ---------- 25 Oct 2026: what For You shows ----------
   * ctx may add: botAccount(p) -> true for the app's own crowd/bot accounts (LowiBotAccounts), hidden(p) -> true for
   * accounts the app keeps out (LowiHiddenAccounts), inCloud(id) -> true when the post is in the shared posts table. */
  /* An own post the member meant for For You that is not in it: publishing failed, or it was kept back by the old rule
   * (before 25 Oct only low-spike items were published; those posts carry none of the new pub / pend / fail marks). */
  function held(p, ctx) {
    ctx = ctx || {};
    if (!p || p.vis !== 'tribe' || p.cloud || p.bot) return false;
    if (p.pub) return false;
    if (p.fail) return true;
    if (p.pend) return false;
    if (ctx.inCloud && p.id && ctx.inCloud(p.id)) return false;
    return verdict(p, ctx) !== 'low';
  }
  /* 25 Oct 2026: what still has to go out. Every own For You post that is not in the shared table yet, also the ones made before
   * the 11:41 release, which carry no pub / pend / fail mark (his 10:56 TikTok). The caller skips the ones it is sending now. */
  function toPublish(posts, ctx) {
    ctx = ctx || {};
    if (!Array.isArray(posts)) return [];
    return posts.filter(p => p && typeof p === 'object' && p.id && p.vis === 'tribe' && !p.bot && !p.cloud && !p.pub &&
      !(ctx.inCloud && ctx.inCloud(p.id)));
  }
  /* 25 Oct 2026, once: an old link (TikTok, YouTube, a web page) marked Only me before `before` goes to For You. A link to a public
   * video is nobody's secret, and Emmanuel said his posts kept landing on Only me. Photos, videos from the phone, plain notes
   * and anything set to Only me after the fix stay private. Returns how many moved. */
  function freeLinks(posts, before) {
    if (!Array.isArray(posts)) return 0;
    let n = 0;
    for (const p of posts) {
      if (!p || p.vis !== 'me' || p.bot || !p.url || p.photo || p.vid || p.video) continue;
      if (!(typeof p.ts === 'number' && p.ts < before)) continue;
      p.vis = 'tribe'; n++;
    }
    return n;
  }
  function shows(p, ctx) {
    ctx = ctx || {};
    if (!p || typeof p !== 'object' || !p.id) return false;
    if (p.bot) return passes(p, ctx);
    if (ctx.hidden && ctx.hidden(p)) return false;
    if (ctx.botAccount && ctx.botAccount(p)) return passes(p, ctx);
    /* 25 Oct 2026 (Emmanuel: "I post that ... I still can't see them"): his own For You posts always show on his own phone, sent,
     * on their way or stuck (the slide says which); everyone else only ever sees what is in the shared table. */
    if (p.me) return p.vis !== 'me';
    if (p.uid) return true; /* a real member's post from the shared table */
    return passes(p, ctx); /* no known author (old samples, seeded rows): the insulin rule */
  }

  /* ---------- videos from other platforms open there, never here ---------- */
  const PLAT = [
    ['youtube', 'YouTube', /^(?:[\w-]+\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)$/i],
    ['tiktok', 'TikTok', /^(?:[\w-]+\.)?tiktok\.com$/i],
    ['instagram', 'Instagram', /^(?:[\w-]+\.)?(?:instagram\.com|instagr\.am)$/i],
    ['vimeo', 'Vimeo', /^(?:[\w-]+\.)?vimeo\.com$/i],
    ['facebook', 'Facebook', /^(?:[\w-]+\.)?(?:facebook\.com|fb\.watch)$/i],
    ['x', 'X', /^(?:[\w-]+\.)?(?:x\.com|twitter\.com)$/i],
    ['twitch', 'Twitch', /^(?:[\w-]+\.)?twitch\.tv$/i],
    ['pinterest', 'Pinterest', /^(?:[\w-]+\.)?(?:pinterest\.[a-z.]+|pin\.it)$/i],
    ['threads', 'Threads', /^(?:[\w-]+\.)?threads\.(?:net|com)$/i],
    ['snapchat', 'Snapchat', /^(?:[\w-]+\.)?snapchat\.com$/i]
  ];
  function httpUrl(u) {
    try { const x = new URL(String(u || '').trim()); return /^https?:$/.test(x.protocol) && x.hostname ? x : null; } catch (e) { return null; }
  }
  /* {plat, name, url} for a link on a creator platform (the url is the original, http(s) only), else null */
  function external(url) {
    const x = httpUrl(url); if (!x) return null;
    const h = x.hostname.toLowerCase();
    for (const [plat, name, re] of PLAT) if (re.test(h)) return { plat, name, url: x.href };
    return null;
  }
  function ytId(url) {
    const x = httpUrl(url); if (!x) return '';
    const h = x.hostname.replace(/^(www|m|music)\./i, '').toLowerCase(); let id = '';
    if (h === 'youtu.be') id = x.pathname.slice(1).split('/')[0];
    else if (/youtube(-nocookie)?\.com$/.test(h)) { const m = /^\/(shorts|embed|live|v)\/([\w-]{11})/.exec(x.pathname); id = m ? m[2] : (x.searchParams.get('v') || ''); }
    return /^[\w-]{11}$/.test(id) ? id : '';
  }
  /* the picture for a link post: YouTube's own still (stable, works for everyone), else the https preview the link gave */
  function thumbOf(p) {
    if (!p || !p.url) return '';
    const id = ytId(p.url); if (id) return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    const t = p.meta && typeof p.meta.thumb === 'string' ? p.meta.thumb : '';
    return /^https:\/\//.test(t) && !expired(t) ? t : '';
  }
  /* 25 Oct 2026: TikTok's own picture links stop working at their x-expires time (old posts kept them); those count as no picture,
     so the slide shows the platform colours until the stored copy (tiktok-meta) arrives, never a broken image */
  function expired(t, now) {
    const x = httpUrl(t); if (!x) return true;
    if (!/(^|\.)(tiktokcdn(-[a-z]+)?\.com|tiktokcdn\.[a-z.]+|tiktokv\.com|ibyteimg\.com|byteimg\.com)$/i.test(x.hostname)) return false;
    const e = Number(x.searchParams.get('x-expires') || 0);
    return !!e && e * 1000 <= (now || Date.now());
  }
  /* the creator's name as the link preview gave it ("@handle" or the channel), else '' */
  function creatorOf(p) {
    const m = p && p.meta && typeof p.meta === 'object' ? p.meta : {};
    return str(m.author || m.handle || '', 60);
  }

  const NOTE = {
    both: ['Shared to Community and For You', 'In der Community und in Für dich geteilt', 'Compartida en la Comunidad y en Para ti'],
    only: ['Shared to Community. For You only shows low-spike meals, so this one stays in Community.',
      'In der Community geteilt. Für dich zeigt nur Mahlzeiten mit wenig Spike, darum bleibt diese in der Community.',
      'Compartida en la Comunidad. Para ti solo muestra comidas de pico bajo, así que esta se queda en la Comunidad.'],
    post: ['Saved in My posts, but it could not reach For You yet (no connection). It tries again by itself, or tap ··· and Share to For You.',
      'In Meine Posts gespeichert, aber noch nicht in Für dich (keine Verbindung). Es versucht es von selbst noch einmal, oder tippe auf ··· und In Für dich teilen.',
      'Guardado en Mis publicaciones, pero aún no llegó a Para ti (sin conexión). Lo intenta de nuevo solo, o toca ··· y Compartir en Para ti.'],
    shared: ['Posted. It\'s in For You for everyone.', 'Gepostet. Es ist jetzt für alle in Für dich.', 'Publicado. Ya está en Para ti para todos.'],
    nowIn: ['Now in For You', 'Jetzt in Für dich', 'Ya está en Para ti'],
    onlyNow: ['Now only visible to you', 'Jetzt nur für dich sichtbar', 'Ahora solo lo ves tú'],
    inFy: ['In For You', 'In Für dich', 'En Para ti'],
    onlyYou: ['Only you', 'Nur du', 'Solo tú'],
    sending: ['Sharing…', 'Wird geteilt…', 'Compartiendo…'],
    mine: ['My posts', 'Meine Beiträge', 'Mis publicaciones'],
    retrying: ['Not sent yet · trying again', 'Noch nicht gesendet · neuer Versuch', 'Aún no enviado · reintentando'],
    heldTag: ['Not in For You yet', 'Noch nicht in Für dich', 'Aún no está en Para ti'],
    shareNow: ['Share to For You', 'In Für dich teilen', 'Compartir en Para ti'],
    onlyMe: ['Only show it to me', 'Nur mir zeigen', 'Mostrármelo solo a mí'],
    heldWhy: ['{n} of your posts are not in For You yet. Until today For You only took low-spike meals, so they stayed private. Want them in For You?',
      '{n} deiner Posts sind noch nicht in Für dich. Bis heute nahm Für dich nur Mahlzeiten mit wenig Spike, darum blieben sie privat. Sollen sie in Für dich?',
      '{n} de tus publicaciones aún no están en Para ti. Hasta hoy Para ti solo aceptaba comidas de pico bajo, así que se quedaron privadas. ¿Las quieres en Para ti?'],
    heldOne: ['This post is not in For You yet. Until today For You only took low-spike meals, so it stayed private. Want it in For You?',
      'Dieser Post ist noch nicht in Für dich. Bis heute nahm Für dich nur Mahlzeiten mit wenig Spike, darum blieb er privat. Soll er in Für dich?',
      'Esta publicación aún no está en Para ti. Hasta hoy Para ti solo aceptaba comidas de pico bajo, así que se quedó privada. ¿La quieres en Para ti?'],
    shareAll: ['Share all {n} to For You', 'Alle {n} in Für dich teilen', 'Compartir las {n} en Para ti'],
    sharedN: ['{n} posts are now in For You', '{n} Posts sind jetzt in Für dich', '{n} publicaciones ya están en Para ti'],
    watchOn: ['Watch on {p}', 'Auf {p} ansehen', 'Ver en {p}'],
    openOn: ['Open on {p}', 'Auf {p} öffnen', 'Abrir en {p}'],
    byWho: ['by {who}', 'von {who}', 'de {who}'],
    /* 25 Oct 2026 (Emmanuel): "Show the creator some love ... it's a bit long" - the button says it, one short line under it */
    loveBtn: ['Show the creator some love', 'Zeig dem Creator etwas Liebe', 'Dale amor al creador'],
    loveSub: ['Follow & like the original \u{1F49C}', 'Folgen & das Original liken \u{1F49C}', 'S\u00edguele y dale like al original \u{1F49C}'],
    love: ['Show {who} some love: watch it on {p}, follow them and like the original. We\'re a supportive tribe.',
      'Zeig {who} etwas Liebe: schau es auf {p}, folge und like das Original. Wir sind ein Tribe, der zusammenhält.',
      'Dale amor a {who}: míralo en {p}, síguele y dale like al original. Somos una tribu que se apoya.'],
    loveAnon: ['Show the creator some love: watch it on {p}, follow them and like the original. We\'re a supportive tribe.',
      'Zeig dem Creator etwas Liebe: schau es auf {p}, folge und like das Original. Wir sind ein Tribe, der zusammenhält.',
      'Dale amor a quien lo creó: míralo en {p}, síguele y dale like al original. Somos una tribu que se apoya.'],
    opening: ['Opening on {p}. Follow and like the original, so the creator feels the love.',
      'Öffnet auf {p}. Folge und like das Original, damit der Creator die Liebe spürt.',
      'Se abre en {p}. Sigue y dale like al original, para que quien lo creó sienta el amor.'],
    foot: ['Only this meal is shared: the photo, its name and whether it is insulin-friendly. Insulin-friendly meals also show in For You. Never your weight or other health data.',
      'Geteilt wird nur diese Mahlzeit: das Foto, ihr Name und ob sie insulinfreundlich ist. Insulinfreundliche Mahlzeiten erscheinen auch in Für dich. Nie dein Gewicht oder andere Gesundheitsdaten.',
      'Solo se comparte esta comida: la foto, su nombre y si es apta para la insulina. Las comidas aptas para la insulina también salen en Para ti. Nunca tu peso ni otros datos de salud.'],
    badge: ['Insulin-friendly', 'Insulinfreundlich', 'Apto para la insulina']
  };
  function note(key, lang, vars) {
    const i = ['en', 'de', 'es'].indexOf(String(lang || 'en').slice(0, 2).toLowerCase()); const a = NOTE[key] || [];
    let t = a[i < 0 ? 0 : i] || a[0] || '';
    if (vars) t = t.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    return t;
  }
  /* the support line under a creator's video: their name when the link gave one, else "the creator" */
  function love(p, lang) {
    const e = external(p && p.url); if (!e) return '';
    const who = creatorOf(p);
    return note(who ? 'love' : 'loveAnon', lang, { who, p: e.name });
  }

  return { level, recipeLevel, verdict, passes, filter, merge, sharePost, srcOfRow, NOTE, note, held, shows, toPublish, freeLinks, external, ytId, thumbOf, expired, creatorOf, love };
});
