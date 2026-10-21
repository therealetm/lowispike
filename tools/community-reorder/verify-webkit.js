/* verify (synthetic touch pointer events, WebKit-safe): reorder, persistence, first tab, Cook/Move gone, hold Move -> Move page */
const xfail = m => console.log('[cs] FAIL ' + m);
const xok = m => console.log('[cs] ok ' + m);
await page.evaluate(() => {
  window.__pt = (type, x, y) => { const el = document.elementFromPoint(x, y) || document.body; const tgt = (type === 'pointerdown') ? el : (window.__ptT || el); if (type === 'pointerdown') window.__ptT = el;
    tgt.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 11, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    if (type === 'pointerup') { tgt.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y })); } };
});
const pt = (type, x, y) => page.evaluate(([t, x, y]) => window.__pt(t, x, y), [type, x, y]);
const st = () => page.evaluate(() => {
  const t = document.querySelector('#cmPaneChat .rm-tabs');
  const tabs = t ? [...t.querySelectorAll('.rm-tab')].map(b => b.dataset.rm + (b.getAttribute('aria-selected') === 'true' ? '*' : '')) : null;
  const tb = [...document.querySelectorAll('#tabbar .tb')].filter(b => getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0).map(b => b.dataset.tab);
  return { tabs, tb, saved: localStorage.getItem('lowispike.community.tabs'), arranging: !!(t && t.classList.contains('rm-arranging')) };
});
const stWait = async () => { let s; for (let i = 0; i < 30; i++) { s = await st(); if (s.tabs && s.tabs.some(t => t.endsWith('*'))) return s; await sleep(500); } return s; };
const box = async id => page.evaluate(id => { const r = document.querySelector('#cmPaneChat .rm-tab[data-rm="' + id + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);
await page.evaluate(() => goTab('foryou'));
await sleep(3500);
let s = await st(); console.log('[cs] community', JSON.stringify(s));
let b = await box('chat');
await page.mouse.click(b.x, b.y); await sleep(900);
s = await st(); console.log('[cs] chat view bar: ' + s.tb.join(','));
if (s.tb.length && !s.tb.includes('shelf') && !s.tb.includes('move')) xok('Community bar without Cook/Move: ' + s.tb.join(',')); else xfail('bar ' + s.tb);
if (s.tabs.includes('chat*')) xok('tap switches to chat'); else xfail('tap: ' + JSON.stringify(s.tabs));
await shot('A-community-no-cook-move');
/* moving before the hold ends = scroll, no lift */
b = await box('aff');
await pt('pointerdown', b.x, b.y); await sleep(60); await pt('pointermove', b.x, b.y + 25); await sleep(700);
s = await st(); await pt('pointerup', b.x, b.y + 25); await sleep(500);
if (!s.arranging && !s.saved) xok('moving before the hold ends cancels'); else xfail('cancel: ' + JSON.stringify(s));
/* hold aff, drag to the front */
await page.evaluate(() => LowiRoomsUI.setTab(true)); await sleep(500);
b = await box('aff'); const f = await box('room');
await pt('pointerdown', b.x, b.y); await sleep(700);
s = await st(); if (s.arranging) xok('hold lifts the tab'); else xfail('no lift');
for (let i = 1; i <= 6; i++) { await pt('pointermove', b.x - (b.x - f.x) * i * 0.11, b.y); await sleep(60); }
await sleep(250);
await shot('B-reorder-in-progress');
for (let i = 7; i <= 11; i++) { await pt('pointermove', b.x - (b.x - f.x + 8) * i / 11, b.y); await sleep(60); }
await pt('pointerup', f.x - 8, b.y); await sleep(700);
s = await st(); console.log('[cs] after drop', JSON.stringify(s));
if (s.saved && JSON.parse(s.saved)[0] === 'aff' && s.tabs[0].startsWith('aff')) xok('dropped first + saved'); else xfail('drop');
if (s.tabs.includes('chat*')) xok('drop did not switch tab'); else xfail('drop switched tab ' + s.tabs);
await page.evaluate(() => goTab('today')); await sleep(1500);
await page.evaluate(() => goTab('foryou')); await sleep(1500);
s = await stWait(); if (s.tabs && s.tabs[0] === 'aff*') xok('reopen lands on the first tab (aff)'); else xfail('reopen ' + JSON.stringify(s.tabs));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await sleep(9000);
await page.evaluate(() => goTab('foryou')); await sleep(2000);
s = await stWait(); if (s.tabs && s.tabs[0] === 'aff*') xok('after reload: ' + s.tabs.join(',')); else xfail('reload ' + JSON.stringify(s));
await shot('C-community-after-reorder');
/* hold Move on Home */
await page.evaluate(() => goTab('today')); await sleep(3000);
const mv = await page.evaluate(() => { const e = document.querySelector('#whHud .wh-move'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
console.log('[cs] move bubble', JSON.stringify(mv));
if (mv) {
  await pt('pointerdown', mv.x, mv.y); await sleep(1000); await page.evaluate(([x, y]) => window.__ptT.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 11, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y })), [mv.x, mv.y]); await sleep(2500);
  const r = await page.evaluate(() => { const p = document.getElementById('tab-move'); const g = document.querySelector('#tab-move .wm-guess-row'); return { active: !!(p && p.classList.contains('active')), row: g ? g.textContent : null, sheet: !!document.querySelector('.wm-sheet') }; });
  console.log('[cs] after hold move', JSON.stringify(r));
  if (r.active && !r.sheet) xok('hold Move opened the Move page'); else xfail('hold move');
  if (r.row) xok('guess row: ' + r.row); else xfail('no guess row');
  await shot('D-move-page-by-hold');
  await page.evaluate(() => document.querySelector('#tab-move .wm-guess-row').click()); await sleep(1000);
  const sh = await page.evaluate(() => !!document.querySelector('.wm-sheet, .r2-sheet, [role="dialog"]')); if (sh) xok('guess row opens today sheet'); else xfail('guess row sheet');
  await page.keyboard.press('Escape'); await sleep(500);
  await page.evaluate(() => goTab('today')); await sleep(2500);
  await page.mouse.click(mv.x, mv.y); await sleep(1500);
  const mvAct = await page.evaluate(() => document.getElementById('tab-move').classList.contains('active'));
  if (!mvAct) xok('tap Move stays on Home (bloom)'); else xfail('tap Move opened page');
  await shot('E-tap-move');
} else xfail('no move bubble');
await page.evaluate(() => goTab('shelf')); await sleep(2500);
const ck = await page.evaluate(() => [...document.querySelectorAll('#tab-shelf button')].map(e => (e.getAttribute('aria-label') || e.textContent || '').trim()).filter(t => /for you|shuffle|swipe|mischen|für dich/i.test(t)).slice(0, 6));
console.log('[cs] cook entries ' + JSON.stringify(ck));
