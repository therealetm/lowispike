'use strict';
/* Bug hunt 24 Oct 11:02: where do English lines in Cook come from in de/es? Opens Cook, shuffles, opens All recipes > first category,
   then My recipe book + back. Dumps the parent markup of every visible English text node it is told to look for.
   node tools/hunt-cook-lang-1102.cjs <device> <lang> [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'de', where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: 'webkit', members: 4, messages: 4, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const LOOK = /Fried rice craving|Your pick|All recipes|By ingredient|Swap ingredients|Healthier swaps|My Recipe Book/;
  const dump = (tag) => P.evaluate(([re, tag]) => {
    const rx = new RegExp(re); const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.nodeValue; if (!rx.test(t)) continue; const p = n.parentElement; if (!p || p.closest('script,style')) continue; const r = p.getBoundingClientRect(); const s = getComputedStyle(p); const vis = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; let anc = p, path = []; for (let i = 0; i < 4 && anc; i++, anc = anc.parentElement) path.push(anc.tagName + (anc.id ? '#' + anc.id : '') + (anc.className && typeof anc.className === 'string' ? '.' + anc.className.split(' ').slice(0, 2).join('.') : ''));
      out.push({ tag, vis, t: t.trim().slice(0, 90), path: path.join(' < '), html: p.outerHTML.slice(0, 260) }); }
    return out; }, [LOOK.source, tag]);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('shelf'); } catch (e) { } }); await H.sleep(1500);
  console.log('LANG', await P.evaluate(() => (window.LowiLang && LowiLang.get()) || null));
  for (const x of await dump('cook')) console.log(JSON.stringify(x));
  await P.evaluate(() => { const b = document.getElementById('r5Go'); b && b.scrollIntoView({ block: 'center' }); }); await R.tap('#r5Go').catch(e => console.log('tap r5Go', e.message)); await H.sleep(3500);
  for (const x of await dump('reveal')) console.log(JSON.stringify(x));
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('shelf'); } catch (e) { } }); await H.sleep(1200);
  const tiles = await P.evaluate(() => [...document.querySelectorAll('#tab-shelf button')].filter(b => b.getBoundingClientRect().width > 60).map((b, i) => { b.setAttribute('data-p', i); return i + ':' + b.textContent.replace(/\s+/g, ' ').trim().slice(0, 40); }));
  console.log('TILES', JSON.stringify(tiles));
  const pick = async (re) => { const t = tiles.find(x => re.test(x)); if (!t) { console.log('no tile', re); return false; } const i = t.split(':')[0]; const loc = P.locator(`[data-p="${i}"]`); await loc.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(300); await R.tapEl(loc); await H.sleep(1800); return true; };
  const recs = await P.evaluate(() => [...document.querySelectorAll('.sh-rec .small.muted')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  const engl = recs.filter(t => /\b(with|the|and|craving|rebuilt|crunch|your)\b/i.test(t));
  console.log('RECIPE ROWS', recs.length, 'english-looking', engl.length, JSON.stringify(engl.slice(0, 6)), 'sample', JSON.stringify(recs.slice(0, 4)));
  console.log('SWAP TILE', JSON.stringify(await P.evaluate(() => { const t = document.querySelector('[data-b-open="swap"]'); return t && t.textContent; })));
  await P.evaluate(() => { for (let i = 0; i < 3; i++) history.back(); }); await H.sleep(1500);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('shelf'); } catch (e) { } }); await H.sleep(1200);
  const ov = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov.on,[role=dialog],.b-ov.on,#sheetwrap.open')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.id || e.className.split(' ').slice(0, 2).join('.')) + (e.querySelector('header,h2,h3,b') ? ' «' + (e.querySelector('header,h2,h3,b').textContent || '').trim().slice(0, 40) + '»' : '')));
  if (await pick(/Rezeptbuch|recetario|Recipe Book/)) {
    console.log('BOOK open', JSON.stringify(await ov()));
    await P.evaluate(() => history.back()); await H.sleep(1500);
    console.log('BOOK after 1 back', JSON.stringify(await ov()), 'inApp', await P.evaluate(() => !!document.getElementById('whPad')));
    await P.evaluate(() => history.back()); await H.sleep(1500);
    console.log('BOOK after 2 back', JSON.stringify(await ov()), 'inApp', await P.evaluate(() => !!document.getElementById('whPad')));
  }
  console.log('ERRS', JSON.stringify(R.errs.slice(0, 8)), 'crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
