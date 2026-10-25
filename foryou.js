/* LOWiSPIKE For You glue (browser). Rule and data are pure in foryou-core.js and inspo-core.js; this file wires them into
 * the For You feed (index.html feed()/slideHTML), the composer (doPost) and Share -> Community (meal-journal.js).
 *  - feed(list): the For You list (25 Oct: every real member's post; the app's own bot/crowd posts keep the insulin-friendly rule), plus the inspiration bot's daily slides.
 *  - slideHTML(p, env): the bot's slide (no like/chat/menu: there is nobody to like or chat with; Save and Share stay).
 *  - fromCommunityShare({row,name,lvl,caption}): a meal shared to Community also posts to For You when it passes.
 * The bot never posts to Chat, never appears in People, never pushes. */
(function (root) {
  'use strict';
  const C = root.LowiForYouCore, I = root.LowiInspoCore;
  if (!C) return;
  const doc = () => root.document;
  function lang() { const d = doc(); const l = String(d && d.documentElement && d.documentElement.lang || 'en').slice(0, 2).toLowerCase(); return /^(en|de|es)$/.test(l) ? l : 'en'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function recipes() { try { return typeof RECIPE_BOOK !== 'undefined' ? RECIPE_BOOK : []; } catch (e) { return []; } } // eslint-disable-line no-undef
  function foodImg(id) { try { return typeof FOOD_IMG !== 'undefined' && FOOD_IMG[id] ? FOOD_IMG[id] : ''; } catch (e) { return ''; } } // eslint-disable-line no-undef
  const ctx = {
    meal(m) { try { const S = root.LowiMealSnap; const c = S && S.clean ? S.clean(m) : null; return c && c.bs || ''; } catch (e) { return ''; } },
    recipe(id) { return recipes().find(r => r && r.id === id) || null; },
    /* 25 Oct: the app's own crowd/bot accounts keep the insulin rule; hidden test accounts never show; a real member's post shows */
    botAccount(p) { try { const B = root.LowiBotAccounts; return !!(B && p && !p.me && p.uid && B.isBot(p)); } catch (e) { return false; } },
    hidden(p) { try { const Hd = root.LowiHiddenAccounts; return !!(Hd && p && !p.me && p.uid && Hd.isHidden(p.uid)); } catch (e) { return false; } },
    inCloud(id) { try { const CL = root.LOWI_CLOUD; return !!(CL && CL.live && CL.live() && CL.post && CL.post(id)); } catch (e) { return false; } }
  };

  let botCache = { k: '', list: [] };
  function botPosts(now) {
    if (!I || !I.feed) return [];
    const t = typeof now === 'number' ? now : Date.now(), l = lang(), k = I.dayKey(I.cardDate(t)) + l;
    if (botCache.k !== k) {
      botCache = { k, list: I.feed({ now: t, lang: l }).map(p => { if (!p.img && !foodImg(p.rec)) p.img = ''; return p; }) };
    }
    return botCache.list;
  }
  const botPost = id => botPosts().find(p => p.id === id) || null;
  const feed = list => C.merge(list, botPosts(), ctx);
  const verdict = p => C.verdict(p, ctx);
  const passes = p => C.passes(p, ctx);

  const AV = '<svg class="fyb-av-svg" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="18" fill="#2fbf71" opacity=".22"/>' +
    '<path d="M18 8c5.5 0 9.5 4 9.5 9.6 0 5.8-4.3 10.4-9.5 10.4S8.5 23.4 8.5 17.6C8.5 12 12.5 8 18 8z" fill="#2fbf71"/>' +
    '<path d="M18 8.2c.4-2.3 2-3.9 4.4-4.4-.3 2.4-1.9 4.1-4.4 4.4z" fill="#8be0a8"/><circle cx="14.6" cy="16.8" r="1.6" fill="#0b2a1a"/>' +
    '<circle cx="21.4" cy="16.8" r="1.6" fill="#0b2a1a"/><path d="M14.8 21.2c1.8 1.7 4.6 1.7 6.4 0" stroke="#0b2a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';

  function dayWord(c, l) {
    const today = I.dayKey(I.cardDate(Date.now()));
    if (c.day === today) return { en: 'Today', de: 'Heute', es: 'Hoy' }[l];
    try { return new Date(c.ts).toLocaleDateString(l, { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return c.day; }
  }
  /* button sweep 16:20: the For You pane is data-noi18n, so the rail asks the app dictionary for Save / Saved / Share */
  function appT(s) { try { return root.LowiLang && root.LowiLang.t ? root.LowiLang.t(s) : s; } catch (e) { return s; } }
  function slideHTML(p, env) {
    env = env || {};
    const c = p.inspo, l = lang(), FIC = env.FIC || {}, saved = !!env.saved;
    if (!c) return '';
    const sw = c.swap, g = c.gold, lab = c.label || {};
    const gold = g ? '<section class="fyb-gold"><p class="fyb-k"><span>\u2605</span> ' + esc(lab.gold) + ' <small>' + esc(lab.goldSub) + '</small></p>' +
      '<div class="fyb-prod">' + (g.photo ? '<img class="fyb-img" src="' + esc(g.photo) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '') +
      '<div class="fyb-pt"><b>' + esc(g.name) + '</b><span>' + esc(g.brand) + ' \u00b7 ' + esc(g.store) + '</span><span class="fyb-nums">' + esc(g.nums) + '</span></div></div>' +
      '<p class="fyb-why">' + esc(g.why) + '</p><p class="fyb-src">' + esc(lab.goldSrc) + '</p></section>' : '';
    return '<section class="fy-slide fyb-slide" data-id="' + esc(p.id) + '" data-bot="nibblo">' + (env.bg || '') + '<div class="fy-shade"></div>' +
      '<div class="fy-rail">' +
        '<button class="fy-act' + (saved ? ' on' : '') + '" data-tr="save" data-id="' + esc(p.id) + '" aria-label="' + esc(appT('Save')) + '">' + (FIC.save || '') + '<span>' + esc(appT(saved ? 'Saved' : 'Save')) + '</span></button>' +
        '<button class="fy-act" data-tr="share" data-id="' + esc(p.id) + '" aria-label="' + esc(appT('Share')) + '">' + (FIC.share || '') + '<span>' + esc(appT('Share')) + '</span></button></div>' +
      '<div class="fy-meta fyb-meta"><div class="fy-by fyb-by" aria-label="' + esc(lab.aria) + '">' + AV + '<b>' + esc(I.NAME) + '</b><span class="fyb-tag">' + esc(lab.bot) + '</span><span>\u00b7 ' + esc(dayWord(c, l)) + '</span></div>' +
        '<p class="fyb-k">' + esc(sw.e) + ' ' + esc(lab.swap) + '</p>' +
        '<div class="fyb-swap"><span class="fyb-from"><small>' + esc(lab.craving) + '</small>' + esc(sw.from) + '</span><span class="fyb-arrow" aria-hidden="true">\u2192</span>' +
        '<span class="fyb-to"><small>' + esc(lab.tryIt) + '</small>' + esc(sw.to) + '</span></div>' +
        '<p class="fyb-why">' + esc(sw.why) + '</p>' + (env.chip || '') + gold + '</div></section>';
  }

  /* Share -> Community: the same meal becomes a For You post when it passes; the sender gets one line either way. */
  function fromCommunityShare(o) {
    o = o || {};
    const l = lang();
    const parse = root.LowiChatCore && root.LowiChatCore.meal;
    const src = C.srcOfRow(o.row, parse);
    if (!src) return { ok: false, text: '' }; /* nothing came back from the room (a companion room, a busy retry): plain "Shared" */
    const p = C.sharePost({ src, name: o.name, lvl: o.lvl, caption: o.caption, id: o.id });
    if (!p || !passes(p)) return { ok: false, text: C.note('only', l) };
    /* Oct 25 (task 31c545da): the poster's own meal details, whitelisted, so the For You spike label opens them too */
    try { const MD = root.LowiMealDetailCore, src0 = o.detail || (o.row && o.row.md), d = MD && src0 ? MD.clean(src0) : null; if (d) p.meta.detail = d; } catch (e) {}
    try {
      const T = root.TRIBE;
      if (T && T.post && T.post(p.id)) return { ok: true, post: p, text: C.note('both', l) }; /* the same meal shared twice: one For You post */
      if (T && T.addPost && !T.addPost(p)) return { ok: false, text: '' };
      const CL = root.LOWI_CLOUD;
      if (CL && CL.live && CL.live() && CL.publish) Promise.resolve(CL.publish(p)).catch(() => {});
    } catch (e) { return { ok: false, text: C.note('only', l) }; }
    return { ok: true, post: p, text: C.note('both', l) };
  }
  const note = (k, vars) => C.note(k, lang(), vars);
  const held = p => C.held(p, ctx);
  const toPublish = list => C.toPublish(list, ctx); /* 25 Oct 2026: own For You posts not in the shared table yet */
  const shows = p => C.shows(p, ctx);
  const love = p => C.love(p, lang());
  /* the For You list re-checks when the server's bot list arrives (a crowd account's post then follows the insulin rule) */
  try { root.addEventListener && root.addEventListener('lowi-bots', () => { try { const T = root.TRIBE; if (T && T.renderForYou && doc().getElementById('fyFeed')) T.renderForYou(); } catch (e) { /* not on screen */ } }); } catch (e) { /* no window */ }

  root.LowiForYou = { feed, botPosts, botPost, verdict, passes, held, toPublish, freeLinks: C.freeLinks, shows, love, external: C.external, thumbOf: C.thumbOf, creatorOf: C.creatorOf, slideHTML, fromCommunityShare, note, ctx };
})(typeof window !== 'undefined' ? window : this);
