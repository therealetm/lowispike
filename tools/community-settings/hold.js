/* hold check for probe.cjs (22 Oct 2026, item 42): a long press on the Community bubble opens the profile hub (#cmeSheet, community-me.js)
   and keeps it open however long the finger stays; Settings does not open; a normal tap still opens Community; the click that ends the
   hold (it lands on the hub's backdrop or a row) reaches nothing; a drifting finger opens nothing; a light cue while held; no text
   selection; the picture, the name and the Profile row in the hub open the Profile tab.
   node tools/community-settings/probe.cjs --script tools/community-settings/hold.js --views se,i13,ipad */
const q = s => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 2 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, s);
const state = () => page.evaluate(() => {
    const H = document.documentElement, hub = document.getElementById('cmeSheet');
    let vis = false; if (hub) { const r = hub.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 30); vis = r.width > 100 && r.height > 100 && !!(e && hub.contains(e)); }
    return { home: H.classList.contains('wh-home') && !H.classList.contains('wh-away'), hub: !!hub, hubOnTop: vis, settings: window.LowiHomeSettingsSleepV2 && window.LowiHomeSettingsSleepV2.isOpen(),
        rows: hub ? [...hub.querySelectorAll('[data-cme]')].map(b => b.getAttribute('data-cme')) : [], sel: String(getSelection && getSelection() || ''),
        holding: !!document.querySelector('#whHud [data-orbit="settings"].ss2-holding'), profile: !!(document.getElementById('tab-profile') && document.getElementById('tab-profile').classList.contains('active')) };
});
/* what a real iPhone hold makes: pointerdown, still, pointerup, then (WebKit) a click on whatever is under the finger now */
async function hold(x, y, ms, move) {
    await page.evaluate(([x, y, ms, move]) => new Promise(res => {
        const el = document.elementFromPoint(x, y), o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 };
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        if (move) setTimeout(() => el.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, { clientX: x + move, clientY: y + move }))), 120);
        setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); /* a finger that drifted is a drag: browsers make no click then */ if (!move) { const at = document.elementFromPoint(x, y) || el; window.__csUnder = at.className + ''; at.dispatchEvent(new MouseEvent('click', o)); } res(); }, ms);
    }), [x, y, ms, move || 0]);
}
const closeAll = () => page.evaluate(() => { if (window.LowiCommunityMe) window.LowiCommunityMe.close(); if (window.LowiHomeSettingsSleepV2) window.LowiHomeSettingsSleepV2.close(); });
await sleep(9000);
const BUB = '#whHud [data-orbit="settings"]';
let b = await q(BUB); if (!b) { fail('no Community bubble'); return; }
/* the ring can move between steps (Misty, layout): find the bubble again before each one */
const rq = async () => { const n = await q(BUB); if (n) b = n; return b; };
for (const ms of [700, 2000, 3500]) {
    await rq(); await hold(b.x, b.y, ms); await sleep(600);
    const s = await state(); const under = await page.evaluate(() => window.__csUnder);
    console.log('[cs] hold ' + ms + ' ms: ' + JSON.stringify({ home: s.home, hub: s.hub, onTop: s.hubOnTop, settings: s.settings, rows: s.rows.join(','), under }));
    if (!s.hub) fail('hold ' + ms + ' ms: profile hub not open');
    else if (!s.hubOnTop) fail('hold ' + ms + ' ms: hub is open but covered');
    if (s.settings) fail('hold ' + ms + ' ms: Settings opened (' + s.settings + ')');
    if (!s.home) fail('hold ' + ms + ' ms: also left Home (the tap fired)');
    if (s.sel) fail('hold ' + ms + ' ms: text got selected: ' + s.sel);
    for (const id of ['settings', 'close', 'me']) if (!s.rows.includes(id)) fail('hold ' + ms + ' ms: hub missing ' + id);
    if (ms === 700) await shot('hold-hub');
    await sleep(800); const s2 = await state(); if (!s2.hub) fail('hold ' + ms + ' ms: hub closed by itself after the finger lifted');
    await closeAll(); await sleep(500);
}
/* a drifting finger (a swipe or a drag of the world) opens nothing */
await rq(); await hold(b.x, b.y, 800, 30); await sleep(500);
let s = await state(); if (s.hub || s.settings) fail('a drifting finger opened hub=' + s.hub + ' settings=' + s.settings);
if (!s.home) fail('a drifting finger left Home');
await closeAll(); await sleep(300);
/* light cue while held, gone on cancel */
await rq(); console.log('[cs] bubble at ' + Math.round(b.x) + ',' + Math.round(b.y) + ' under: ' + await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className) : ''; }, [b.x, b.y]));
await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: true, button: 0 })); }, [b.x, b.y]);
await sleep(200); s = await state(); console.log('[cs] holding cue at 200 ms: ' + s.holding); if (!s.holding) fail('no visual cue while the finger is down');
await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: true })); }, [b.x, b.y]);
await sleep(700); s = await state(); if (s.holding || s.hub || s.settings) fail('cancelled hold left cue=' + s.holding + ' hub=' + s.hub);
/* after a hold, a real tap on a hub row works straight away (only the hold's own click is swallowed) */
await rq(); await hold(b.x, b.y, 700); await sleep(700);
const cl = await q('#cmeSheet [data-cme="close"]'); if (cl) { await page.mouse.click(cl.x, cl.y); await sleep(400); s = await state(); if (s.hub) fail('the X in the hub did not close it after a hold'); } else fail('no X in the hub');
/* the picture opens your profile */
await rq(); await hold(b.x, b.y, 700); await sleep(700);
const av = await q('#cmeSheet .cme-av'); if (av) { await page.mouse.click(av.x, av.y); await sleep(1500); s = await state(); console.log('[cs] after picture tap: ' + JSON.stringify({ hub: s.hub, profile: s.profile, home: s.home })); if (s.hub) fail('picture tap left the hub open'); if (!s.profile) fail('picture tap did not open Profile'); } else fail('no picture in the hub');
await page.evaluate(() => window.goTab('home')); await sleep(2500);
/* the Profile row too */
const b2 = await q('#whHud [data-orbit="settings"]');
if (b2) { await hold(b2.x, b2.y, 700); await sleep(700); const pr = await q('#cmeSheet [data-cme="me"]'); if (pr) { await page.mouse.click(pr.x, pr.y); await sleep(1500); s = await state(); if (!s.profile) fail('Profile row did not open Profile'); } else fail('no Profile row'); await page.evaluate(() => window.goTab('home')); await sleep(2500); }
/* a normal tap still opens Community */
const b3 = await q('#whHud [data-orbit="settings"]');
if (b3) { await page.touchscreen.tap(b3.x, b3.y); await sleep(1800); s = await state(); const comm = await page.evaluate(() => { const t = document.getElementById('tab-foryou'); return !!(t && t.classList.contains('active')); }); console.log('[cs] tap: community=' + comm + ' hub=' + s.hub + ' settings=' + s.settings); if (!comm) fail('a tap no longer opens Community'); if (s.hub || s.settings) fail('a tap opened hub/settings'); }
