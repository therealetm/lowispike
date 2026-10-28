'use strict';
/* Navigation fixes check (Oct 28 2026, owner request 13 + chat notification). Local worktree (or live with "live"):
   1 Einkaufen > Hilf mit keeps the Einkaufen top bar and its tabs switch directly; 2 Kochen opens as an in-place panel with Home
   visible around it, Back returns to Home; 3 Profile opened from the Community "Du" panel goes Back to that panel in Community;
   4 the Essenspause panel is smaller and see-through; 5 a chat notification tap opens the Community chat (with that person).
   Plus: no page errors, nothing wider than the screen.
   node tools/check-navfix.cjs <dark|light> <WxH> [live]   Chromium. Not a real phone. */
const { launch, openApp, sleep, BASE, existingSeed } = require('./interface-audit/lib.cjs');
const theme = process.argv[2] || 'dark', vp = (process.argv[3] || '390x844').split('x').map(Number), live = process.argv[4] === 'live';
const SHOT = process.env.NAVFIX_SHOTS || '/home/sprite/navfix';
(async () => {
    const lang = 'de';
    const seed = existingSeed({ lang, kv: { 'lowi.giftBasket.server.v1': JSON.stringify({ ok: true, at: Date.now() }), 'lowispike.lang': lang, 'lowi.lang': lang, 'lowispike.theme': theme, 'lowi.theme': theme } });
    const h = await launch({ engine: 'chromium', seed, lang, locale: 'de-DE', viewport: { width: vp[0], height: vp[1] } });
    if (live) await h.ctx.route(u => String(u).startsWith(BASE), r => r.request().method() === 'GET' ? r.continue() : r.abort());
    await openApp(h, { query: '?dc=' + Date.now() });
    const P = h.page, out = { theme, vp: vp.join('x'), live }, tag = theme + '-' + vp.join('x') + (live ? '-live' : '');
    const shot = n => P.screenshot({ path: SHOT + '/' + n + '-' + tag + '.jpg', type: 'jpeg', quality: 55 }).catch(() => {});
    await P.evaluate(t => { try { window.LowiLang && LowiLang.set && LowiLang.set('de'); } catch (e) {} try { if (window.setTheme) setTheme(t); document.documentElement.setAttribute('data-ui', t); } catch (e) {} }, theme);
    await sleep(1500);
    const esc = async (n = 3) => { for (let i = 0; i < n; i++) { await P.keyboard.press('Escape'); await sleep(250); } };
    await esc();
    const tab = () => P.evaluate(() => { try { return TAB; } catch (e) { return ''; } });
    const wide = () => P.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    out.build = await P.evaluate(() => { const m = document.querySelector('meta[name="lowi-build"]'); return (m && m.content) || window.LOWI_BUILD || ''; });
    out.wide = {};
    /* 1 Einkaufen > Hilf mit */
    out.shop = await P.evaluate(async () => {
        const S = window.LowiStorePicks; if (!S || !S.open) return { err: 'no store picks' };
        S.open('home-bloom'); await new Promise(r => setTimeout(r, 900));
        const g = document.querySelector('.stp-ov [data-stp-tab="gift"]'); if (!g) return { err: 'no Hilf mit tab', tabs: [...document.querySelectorAll('[data-stp-tab]')].map(b => b.dataset.stpTab) };
        g.click(); await new Promise(r => setTimeout(r, 1100));
        const gb = document.querySelector('.gb-ov'); if (!gb) return { err: 'gift panel did not open' };
        const bar = gb.querySelector('.stp-tabs'), vis = bar && bar.getBoundingClientRect().height > 10 && getComputedStyle(bar).visibility !== 'hidden';
        const on = bar && bar.querySelector('[data-stp-tab].on'), labels = bar ? [...bar.querySelectorAll('[data-stp-tab]')].map(b => b.textContent.trim()) : [];
        return { barVisible: !!vis, active: on ? on.dataset.stpTab : '', labels };
    });
    await shot('1-hilfmit');
    out.shop.switch = await P.evaluate(async () => {
        const b = document.querySelector('.gb-ov .stp-tabs [data-stp-tab]:not([data-stp-tab="gift"])'); if (!b) return { err: 'no other tab in the bar' };
        const id = b.dataset.stpTab; b.click(); await new Promise(r => setTimeout(r, 1100));
        const gb = document.querySelector('.gb-ov'), on = document.querySelector('.stp-ov:not(.gb-ov) [data-stp-tab].on');
        return { to: id, giftClosed: !gb, shopTab: on ? on.dataset.stpTab : '', shopOpen: !!document.querySelector('.stp-ov:not(.gb-ov)') };
    });
    out.wide.shop = await wide();
    await esc(4);
    out.shop.closedAll = await P.evaluate(() => !document.querySelector('.stp-ov'));
    /* 2 Kochen */
    out.cook = await P.evaluate(async () => {
        if (!window.LowiHost || !LowiHost.go) return { err: 'no LowiHost.go' };
        LowiHost.go('shelf'); await new Promise(r => setTimeout(r, 1800));
        const s = document.getElementById('tab-shelf'), hm = document.getElementById('tab-home'), r = s.getBoundingClientRect();
        return { tab: TAB, holo: document.documentElement.classList.contains('cook-holo'), panel: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
            homeOpacity: getComputedStyle(hm).opacity, homeCV: getComputedStyle(hm).contentVisibility || '',
            center: (() => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && s.contains(e)); })(),
            beside: (() => { const e = document.elementFromPoint(4, innerHeight / 2); return e ? (e.id || e.className || e.tagName).toString().slice(0, 30) : ''; })(),
            backBtn: (() => { const x = document.getElementById('secX'); return !!(x && x.offsetWidth && x.getBoundingClientRect().bottom <= r.top + 2); })() };
    });
    await shot('2-kochen');
    out.cook.back = await P.evaluate(async () => {
        const x = document.getElementById('secX'); if (!x || !x.offsetWidth) return { err: 'no back button' };
        x.click(); await new Promise(r => setTimeout(r, 900));
        return { tab: TAB, holo: document.documentElement.classList.contains('cook-holo') };
    });
    out.cook.scrim = await P.evaluate(async () => { LowiHost.go('shelf'); await new Promise(r => setTimeout(r, 1200)); const sc = document.getElementById('cookHoloScrim'); if (!sc) return { err: 'no scrim' }; sc.click(); await new Promise(r => setTimeout(r, 900)); return { tab: TAB }; });
    out.wide.cook = await wide();
    /* 2b Kochen, Escape / swipe-back path (R2 back stack) */
    out.cook.escBack = await P.evaluate(async () => { LowiHost.go('shelf'); await new Promise(r => setTimeout(r, 1200)); return TAB; });
    await esc(1); await sleep(600);
    out.cook.escBack = { opened: out.cook.escBack, after: await tab() };
    await esc(2);
    /* 2c Kochen opened from Community: Community stays around it, back returns there */
    out.cook.fromCommunity = await P.evaluate(async () => {
        goTab('foryou'); await new Promise(r => setTimeout(r, 1000)); LowiHost.go('shelf'); await new Promise(r => setTimeout(r, 1200));
        const u = document.getElementById('tab-foryou'), under = u.classList.contains('holo-under') && getComputedStyle(u).opacity === '1';
        document.getElementById('secX').click(); await new Promise(r => setTimeout(r, 1000));
        return { under, back: TAB, holo: document.documentElement.classList.contains('cook-holo') };
    });
    await P.evaluate(() => goTab('home')); await sleep(900);
    /* 4 Essenspause */
    out.gap = await P.evaluate(async () => {
        const G = window.LowiGapView; if (!G || !G.open) return { err: 'no gap view' };
        G.open(); await new Promise(r => setTimeout(r, 1000));
        const o = document.getElementById('gvSheet'); if (!o) return { err: 'gap did not open' };
        const c = o.querySelector('.gv-card') || o.firstElementChild, r = c.getBoundingClientRect(), cs = getComputedStyle(c), os = getComputedStyle(o);
        return { card: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }, vw: innerWidth, vh: innerHeight, cardBg: cs.backgroundColor, cardImg: cs.backgroundImage.slice(0, 120), ovBg: os.backgroundColor, area: +(r.width * r.height / (innerWidth * innerHeight)).toFixed(2) };
    });
    await shot('4-essenspause');
    out.wide.gap = await wide();
    await esc(2);
    /* 3 Profile from the Community "Du" panel */
    out.profile = await P.evaluate(async () => {
        goTab('foryou'); await new Promise(r => setTimeout(r, 1500));
        const M = window.LowiCommunityMe; if (!M || !M.open) return { err: 'no community me' };
        M.open(); await new Promise(r => setTimeout(r, 700));
        const row = document.querySelector('#cmeSheet [data-cme="me"]'); if (!row) return { err: 'no Profil row' };
        row.click(); await new Promise(r => setTimeout(r, 1300));
        return { from: 'foryou', at: TAB };
    });
    await shot('3a-profil');
    out.profile.back = await P.evaluate(async () => {
        const b = document.getElementById('r3Back'); if (!b || !b.offsetParent && getComputedStyle(b).display === 'none') return { err: 'no visible back', tab: TAB };
        b.click(); await new Promise(r => setTimeout(r, 1300));
        return { tab: TAB, hubOpen: !!(window.LowiCommunityMe && LowiCommunityMe.isOpen()) };
    });
    await shot('3b-zurueck');
    await esc(2);
    /* 3c the round back button and Escape from that Profile */
    out.profile.secX = await P.evaluate(async () => {
        goTab('foryou'); await new Promise(r => setTimeout(r, 900)); LowiCommunityMe.open(); await new Promise(r => setTimeout(r, 600));
        document.querySelector('#cmeSheet [data-cme="me"]').click(); await new Promise(r => setTimeout(r, 1200));
        const x = document.getElementById('secX'), at = TAB, lbl = x ? x.getAttribute('aria-label') : ''; if (!x || !x.offsetWidth) return { err: 'no round back', at };
        x.click(); await new Promise(r => setTimeout(r, 1200));
        return { at, label: lbl, tab: TAB, hubOpen: LowiCommunityMe.isOpen() };
    });
    await esc(2);
    out.profile.esc = await P.evaluate(async () => { goTab('foryou'); await new Promise(r => setTimeout(r, 900)); LowiCommunityMe.open(); await new Promise(r => setTimeout(r, 600)); document.querySelector('#cmeSheet [data-cme="me"]').click(); await new Promise(r => setTimeout(r, 2800)); return TAB; });
    await P.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch (e) {} });
    const pre = await P.evaluate(() => ({ sheet: !!document.querySelector('#sheetwrap.open, #sheetwrap.show, .r2-ov, [aria-modal="true"]:not([hidden]), dialog[open], #lsCart.open, #lcShop.open'), which: [...document.querySelectorAll('.r2-ov, [aria-modal="true"]:not([hidden]), dialog[open]')].map(e => (e.id || e.className).toString().slice(0, 40)), act: (document.activeElement || {}).tagName }));
    await P.keyboard.press('Escape'); await sleep(1300);
    out.profile.escPre = pre;
    out.profile.esc = { at: out.profile.esc, tab: await tab(), hubOpen: await P.evaluate(() => LowiCommunityMe.isOpen()) };
    await esc(2);
    /* 3d the Du panel opened on Home (hold on the Community bubble) > Profile > back: Home with the panel again */
    out.profile.fromHome = await P.evaluate(async () => {
        goTab('home'); await new Promise(r => setTimeout(r, 1000)); LowiCommunityMe.open(); await new Promise(r => setTimeout(r, 600));
        const row = document.querySelector('#cmeSheet [data-cme="me"]'); if (!row) return { err: 'no Du panel on Home' };
        row.click(); await new Promise(r => setTimeout(r, 1200)); const at = TAB;
        document.getElementById('secX').click(); await new Promise(r => setTimeout(r, 1300));
        return { at, tab: TAB, hubOpen: LowiCommunityMe.isOpen() };
    });
    await esc(2);
    /* 3b Profile from Home's profile panel path (picture outside Community) */
    out.profileHome = await P.evaluate(async () => {
        goTab('home'); await new Promise(r => setTimeout(r, 900));
        goTab('profile'); await new Promise(r => setTimeout(r, 900));
        const b = document.getElementById('r3Back'); if (b) b.click(); await new Promise(r => setTimeout(r, 900));
        return { tab: TAB, hubOpen: !!(window.LowiCommunityMe && LowiCommunityMe.isOpen()) };
    });
    /* 5 chat notification */
    out.notif = await P.evaluate(async () => {
        goTab('home'); await new Promise(r => setTimeout(r, 900));
        const L = window.LisPush; if (!L || !L.route) return { err: 'no LisPush' };
        const ok = L.route('chat:00000000-0000-4000-8000-00000000abcd'); await new Promise(r => setTimeout(r, 1500));
        const chat = document.querySelector('#tab-foryou.active #cmPaneChat'), seg = document.querySelector('#tab-foryou [data-seg].on,#tab-foryou [aria-selected="true"]');
        return { routed: ok, tab: TAB, chatPane: !!chat, chatVisible: !!(chat && chat.getBoundingClientRect().height > 50 && getComputedStyle(chat).display !== 'none'), seg: seg ? (seg.dataset.seg || seg.textContent.trim()).slice(0, 20) : '' };
    });
    out.notif.sw = await P.evaluate(async () => { const t = await (await fetch('sw.js', { cache: 'no-store' })).text(); return { tabFallback: /d\.tab === "foryou"/.test(t) }; });
    out.notif.dm = await P.evaluate(async () => { const t = await (await fetch('community-chat.js', { cache: 'no-store' })).text(); return { chatQ: /q:'chat:'\+/.test(t) }; });
    await shot('5-chat');
    out.wide.end = await wide();
    out.errors = h.errors; out.consoleErr = h.consoleErr.filter(t => !/Failed to load resource|net::ERR|supabase|ERR_FAILED/i.test(t)).slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
