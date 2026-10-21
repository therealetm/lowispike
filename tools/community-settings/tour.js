/* default tour for probe.cjs: hint, tap = Community, hold = slim Settings (and no tap), You panel, gear. node probe.cjs --script tools/community-settings/tour.js */
const q = s => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 2 ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width } : null; }, s);
const state = () => page.evaluate(() => ({ tab: (document.querySelector('[id^="tab-"].active') || {}).id || '', home: document.documentElement.classList.contains('wh-home') && !document.documentElement.classList.contains('wh-away'), open: window.LowiHomeSettingsSleepV2 && window.LowiHomeSettingsSleepV2.isOpen(), rows: [...document.querySelectorAll('#ss2Bloom .ss2-page [data-ss2],#ss2Bloom .ss2-langs button')].map(b => b.getAttribute('data-ss2') || b.getAttribute('data-lang')), cme: !!document.getElementById('cmeSheet'), hint: (document.querySelector('.ss2-hint') || {}).textContent || '' }));
async function touchHold(x, y, ms) {
    const c = await page.context().newCDPSession(page).catch(() => null);
    if (c) { await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(ms); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); return 'cdp'; }
    /* webkit: synthesize the pointer + touch + click sequence a real hold makes */
    await page.evaluate(([x, y, ms]) => new Promise(res => { const el = document.elementFromPoint(x, y); const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true };
        el.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); if (ms < 400) el.dispatchEvent(new MouseEvent('click', o)); else el.dispatchEvent(new MouseEvent('click', o)); res(); }, ms); }), [x, y, ms]);
    return 'synth';
}
async function tapSel(sel) { const r = await q(sel); if (!r) throw new Error('not visible ' + sel); await page.touchscreen.tap(r.x, r.y); }
await sleep(4000);
let s = await state();
if (!s.hint) fail('no one-time hint on Home'); else console.log('[cs] hint: ' + s.hint);
await shot('1-home-hint');
await sleep(7000);
const b = await q('#whHud [data-orbit="settings"]'); if (!b) { fail('no Community bubble'); return; }
const lbl = await page.evaluate(() => { const e = document.querySelector('#whHud [data-orbit="settings"]'); return e.getAttribute('aria-label') + ' / ' + e.textContent.trim(); }); console.log('[cs] bubble: ' + lbl);
if (!/Community/.test(lbl)) fail('bubble not labelled Community: ' + lbl);
/* hold */
const how = await touchHold(b.x, b.y, 800); await sleep(700);
s = await state(); console.log('[cs] after hold (' + how + '): ' + JSON.stringify(s));
if (s.open !== 'page') fail('hold did not open Settings'); if (!s.home) fail('hold also navigated away from Home (tap fired)');
for (const id of ['theme', 'look', 'en', 'de', 'es', 'account', 'deleteAccount']) if (!s.rows.includes(id)) fail('Settings missing ' + id);
for (const id of ['me', 'body', 'vr', 'weather', 'care', 'community']) if (s.rows.includes(id)) fail('Settings still has ' + id);
await shot('2-settings');
/* overflow check */
const ov = await page.evaluate(() => { const p = document.querySelector('#ss2Bloom .ss2-page'); if (!p) return 'none'; const r = p.getBoundingClientRect(); const bad = r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1; const cut = [...p.querySelectorAll('.ss2-lbl')].filter(l => l.scrollWidth > l.clientWidth + 1).map(l => l.textContent); return (bad ? 'offscreen ' : '') + (cut.length ? 'cut ' + cut.join(',') : ''); });
if (ov) fail('Settings layout: ' + ov);
/* delete account asks first */
await tapSel('#ss2Bloom [data-ss2="deleteAccount"]'); await sleep(400);
const del = await page.evaluate(() => [...document.querySelectorAll('#ss2Bloom [data-ss2]')].map(b => b.getAttribute('data-ss2')).join(','));
if (!/delGo/.test(del) || !/delCancel/.test(del)) fail('delete account did not ask: ' + del);
await shot('3-delete-ask');
await tapSel('#ss2Bloom [data-ss2="delCancel"]'); await sleep(300);
await tapSel('#ss2Bloom [data-ss2="close"]'); await sleep(500);
/* tap */
await page.touchscreen.tap(b.x, b.y); await sleep(2500);
s = await state(); console.log('[cs] after tap: ' + JSON.stringify({ tab: s.tab, home: s.home, open: s.open }));
if (s.home || s.open) fail('tap did not open Community');
await shot('4-community');
const pf = await q('#pfBtn'); if (!pf) { fail('no profile picture in Community'); return; }
await page.touchscreen.tap(pf.x, pf.y); await sleep(800);
s = await state(); if (!s.cme) fail('picture did not open the You panel');
const rows = await page.evaluate(() => [...document.querySelectorAll('#cmeSheet [data-cme]')].map(b => b.getAttribute('data-cme')).join(',')); console.log('[cs] you panel: ' + rows);
const ov2 = await page.evaluate(() => { const p = document.getElementById('cmeSheet'); if (!p) return ''; const r = p.getBoundingClientRect(); return (r.left < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) ? 'offscreen ' + JSON.stringify(r) : ''; }); if (ov2) fail('You panel ' + ov2);
await shot('5-you');
{ const g = await q('#cmeSheet [data-cme="settings"]'); if (!g) { fail('no gear'); return; } await page.touchscreen.tap(g.x, g.y); } await sleep(2200);
s = await state(); if (s.open !== 'page') fail('gear did not open Settings (or it closed again): ' + s.open); if (s.home) fail('gear moved to Home');
await shot('6-gear-settings');
await tapSel('#ss2Bloom [data-ss2="close"]'); await sleep(300);
/* a row runs: Weight & BMI */
await page.touchscreen.tap(pf.x, pf.y); await sleep(600);
if (await q('#cmeSheet [data-cme="body"]')) { await tapSel('#cmeSheet [data-cme="body"]'); await sleep(1200); const bs = await page.evaluate(() => !!document.querySelector('.bs-sheet,[class*="body-stats"],#bsSheet,[id^="bs"]')); console.log('[cs] body stats opened: ' + bs); }
