'use strict';
/* Bug hunt probe (Community chat): tap one member's avatar, close the person card (how=escape|x|back|tap-out), tap the next
   member's avatar, and report which person card a finger actually sees and can tap (name on top, Talk-to button target).
   node tools/hunt-person-card-probe.cjs <device> [url|root] [how] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', how = process.argv[4] || 'escape';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1500);
  const names = await P.evaluate(() => [...new Set([...document.querySelectorAll('#cmList button[data-chat="profile"]')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 4 && r.top > 120 && r.bottom < innerHeight - 140; }).map(b => b.dataset.name))]);
  console.log('avatars on screen', JSON.stringify(names));
  const seen = () => P.evaluate(() => {
    const cards = [...document.querySelectorAll('.cp-card')].map(c => { const r = c.getBoundingClientRect(); const ov = c.closest('.r2-ov'); return { name: (c.querySelector('h2') || {}).textContent, top: Math.round(r.top), h: Math.round(r.height), ovOn: ov ? ov.classList.contains('on') : null }; });
    const talk = [...document.querySelectorAll('.cp-card [data-chat="select-close"]')].map(b => { const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); const hit = t && t.closest('[data-chat="select-close"]'); return { label: b.getAttribute('aria-label'), y: Math.round(y), onScreen: y > 0 && y < innerHeight, hitLabel: hit ? hit.getAttribute('aria-label') : (t ? (t.id || String(t.className).slice(0, 40)) : null) }; });
    const ovl = [...document.querySelectorAll('.r2-ov')].map(o => { const r = o.getBoundingClientRect(); return String(o.className).slice(0, 50) + '@' + Math.round(r.top) + 'h' + Math.round(r.height) + ':' + (o.textContent || '').trim().slice(0, 40); });
    return { cards, talk, ovs: document.querySelectorAll('.r2-ov.on').length, ovl };
  });
  for (let i = 0; i < Math.min(3, names.length); i++) {
    const n = names[i];
    const b = P.locator('#cmList button[data-chat="profile"][data-name="' + n + '"]').first();
    await b.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { });
    await H.sleep(300);
    const bb = await b.boundingBox(); console.log('tap at', JSON.stringify(bb), await P.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); return t ? (t.closest('button') || t).outerHTML.slice(0, 160) : null; }, [bb.x + bb.width / 2, bb.y + bb.height / 2])); await R.tapEl(b); await H.sleep(1800);
    console.log('opened', n, JSON.stringify(await seen()));
    await R.shot('/tmp/hunt/pc-' + device.replace(/\W/g, '') + '-' + how + '-' + i + '.png');
    if (how === 'escape') await P.keyboard.press('Escape');
    else if (how === 'back') await P.evaluate(() => history.back());
    else if (how === 'x') { const x = P.locator('.r2-ov.on .r2-x, .r2-ov.on [data-r2="close"], .r2-ov.on button[aria-label="Close"]').first(); if (await x.count()) await R.tapEl(x); else console.log('no X found'); }
    else if (how === 'tap-out') await P.touchscreen.tap(20, 60);
    await H.sleep(1200);
    console.log('closed', JSON.stringify(await seen()));
  }
  console.log('errs', JSON.stringify(R.errs));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
