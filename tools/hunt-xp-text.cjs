'use strict';
/* Bug hunt (companion / XP / forms): dump what Misty's card, the forms panel and the details tabs say about level, XP and sparks,
   for one seeded XP, so the numbers can be compared across surfaces. Also lists every control in the forms panel.
   node tools/hunt-xp-text.cjs <device> <lang> <xp> [url] */
const H = require('./sim/harness.cjs'), fs = require('fs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en', xp = +(A[2] || 2400), url = A[3] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: 'webkit', probe: false, lang, members: 5, messages: 5 }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o);
  await R.ctx.addInitScript(([l, xp]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); const s = JSON.parse(localStorage.getItem('lowispike.v2') || 'null'); if (!s) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '1990-08-01' }, xp, ledger: [], logs: [], saved: [], settings: { lang: l } })); } catch (e) { } }, [lang, xp]);
  await R.goto(); await H.sleep(5000); const P = R.page;
  const txt = (sel) => P.evaluate(sel => { const e = [...document.querySelectorAll(sel)].pop(); return e ? e.innerText.replace(/\n+/g, ' | ').slice(0, 900) : '(none)'; }, sel);
  const closeAll = async () => { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiCompanion.close && LowiCompanion.close(); } catch (e) { } }); await H.sleep(9000); };
  console.log('STATE', await P.evaluate(() => { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); return JSON.stringify({ xp: s.xp, keys: Object.keys(localStorage).filter(k => /xp|spark|aura|evo|companion|cell|misty/i.test(k)) }); }));
  await P.evaluate(() => LowiMistyHub.open()); await H.sleep(3500); console.log('HUB', await txt('#mistyHub')); await R.shot('/tmp/hunt-cp/xp-hub-' + lang + '.png'); await closeAll();
  await P.evaluate(() => LowiCompanion.open()); await H.sleep(3500);
  console.log('FORMS', await txt('.cf-panel'));
  console.log('FORMS controls', await P.evaluate(() => { const p = [...document.querySelectorAll('.cf-panel')].pop(); return p ? JSON.stringify([...p.querySelectorAll('button,input,select,label,[role=button]')].map(b => b.tagName + ':' + (b.getAttribute('aria-label') || b.innerText || b.value || '').trim().slice(0, 30) + (b.type ? '(' + b.type + ')' : '') + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height))) : '(none)'; }));
  await R.shot('/tmp/hunt-cp/xp-forms-' + lang + '.png'); await closeAll();
  for (const t of ['aura', 'grow', 'found']) { await P.evaluate(t => LowiWorldHome.openDetails(t), t); await H.sleep(3500); console.log(t.toUpperCase(), await txt('.wh-ms-ov.on .r2-sh')); await R.shot('/tmp/hunt-cp/xp-' + t + '-' + lang + '.png'); }
  console.log('errs', JSON.stringify(R.errs.slice(0, 8)));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
