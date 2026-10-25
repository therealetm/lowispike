/* Oct 25 2026 (Emmanuel: "it's about becoming your optimal healthy self"): the new message on the screens a stranger sees first,
   in a real browser (this folder or the live site).
   Usage: node tools/check-optimal-self.cjs [url] [lang] [device] [shotPrefix]
   device: 'iPhone 13' (390x844) or 'iPad' (820x1180). Screens: /tmp/opt-<prefix>-<n>.png
   Checks: title + meta, the install guide line, the first welcome screen headline; no word split across two lines,
   nothing wider than the screen, no page errors; then the setup goals step lists Just be healthier / lose / gain / keep. */
'use strict';
const H = require('./sim/harness.cjs');
const url = process.argv[2] || '', lang = process.argv[3] || 'de', device = process.argv[4] || 'iPhone 13', pre = process.argv[5] || 'local';
const W = {
  en: { h: 'Eat smarter. Become your healthiest self, as a game.', ig: 'Free app: eat smarter and become your healthiest self, as a game.', goals: ['Just be healthier', 'Lose weight', 'Gain weight', 'Keep my weight'] },
  de: { h: 'Iss klüger. Werde dein gesündestes Ich, als Spiel.', ig: 'Kostenlose App: klüger essen und dein gesündestes Ich werden, als Spiel.', goals: ['Einfach gesünder leben', 'Gewicht verlieren', 'Zunehmen', 'Gewicht halten'] },
  es: { h: 'Come mejor. Conviértete en tu versión más sana, jugando.', ig: 'App gratis: come mejor y conviértete en tu versión más sana, jugando.', goals: ['Cuidar más mi salud', 'Perder peso', 'Ganar peso', 'Mantener mi peso'] }
}[lang];
const fails = [], ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };
/* every word of the element's text: does it sit on one line? (a word cut at a hyphen or mid-word shows up as 2 rects) */
const WRAP = el => { if (!el) return null; const out = { lines: 0, split: [], over: false, text: el.textContent.trim() }; const tops = new Set();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
  while ((n = walker.nextNode())) { const s = n.textContent; const re = /\S+/g; let m;
    while ((m = re.exec(s))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const rs = [...r.getClientRects()].filter(x => x.width > 0);
      const ys = new Set(rs.map(x => Math.round(x.top))); if (ys.size > 1) out.split.push(m[0]); rs.forEach(x => { tops.add(Math.round(x.top / 4)); if (x.right > innerWidth + 1) out.over = true; }); } }
  out.lines = tops.size; out.hyph = getComputedStyle(el).hyphens; return out; };
(async () => {
  const ipad = /ipad/i.test(device);
  const R = await H.open({ url, lang, device, fresh: true, engine: process.env.ENGINE || 'chromium', viewport: ipad ? { width: 820, height: 1180 } : { width: 390, height: 844 } });
  const p = R.page, errs = [];
  p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
  let shot = 0; const snap = async () => { try { await p.screenshot({ path: `/tmp/opt-${pre}-${++shot}.png` }); } catch (e) { } };
  try {
    await p.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
    await R.goto(); await H.sleep(5000);
    const head = await p.evaluate(() => ({ title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '', og: (document.querySelector('meta[property="og:description"]') || {}).content || '' }));
    ok(head.title === 'LOWiSPIKE · Eat smarter, become your healthiest self', 'title: ' + head.title);
    ok(/healthiest self/.test(head.desc) && /healthiest self/.test(head.og) && !/lose weight/i.test(head.desc + head.og), 'meta + link preview: ' + head.og);
    const man = await p.evaluate(async () => { try { const l = document.querySelector('link[rel=manifest]'); const r = await fetch(l.href, { cache: 'no-store' }); return (await r.json()).description; } catch (e) { return 'ERR ' + e; } });
    ok(/^Eat smarter and become your healthiest self/.test(man), 'manifest: ' + man);
    /* the install guide (the browser visitor's first screen) */
    /* the sim profile counts as signed in (no gate); act as a brand-new visitor: no account, setup not done */
    await p.evaluate(() => { try { LowiR2.isAccount = () => false; LowiR2.showGate('home'); } catch (e) { } }); await H.sleep(3000);
    const ig = await p.evaluate(want => { const all = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && e.textContent.trim() === want); const vis = all.find(e => e.getBoundingClientRect().width > 0); return { n: all.length, vis: !!vis }; }, W.ig);
    if (!ig.vis) { await p.evaluate(() => { try { window.LowiIG && LowiIG.open(); } catch (e) { } }); await H.sleep(1500); }
    const igw = await p.evaluate(([want, src]) => { const WRAP = eval('(' + src + ')'); const e = [...document.querySelectorAll('body *')].find(x => x.children.length === 0 && x.textContent.trim() === want && x.getBoundingClientRect().width > 0); return e ? WRAP(e) : null; }, [W.ig, WRAP.toString()]);
    await snap();
    if (igw) ok(!igw.split.length && !igw.over, 'install guide line on screen, no word split, fits: ' + JSON.stringify(igw));
    else { const anyOld = await p.evaluate(() => /lose weight|abnehmen|adelgaza/i.test(document.body.innerText)); ok(!anyOld, 'install guide line not on this first screen (' + device + '), and no old "lose weight" text on it'); console.log('INFO install-guide line in DOM: ' + JSON.stringify(ig)); }
    /* the welcome gate */
    await p.evaluate(() => { try { localStorage.removeItem('lowi.gate'); sessionStorage.setItem('lowi.a2hs.x', '1'); } catch (e) { } });
    let gate = await p.$('.hs-copy h1');
    if (!gate) { await p.evaluate(() => { const b = document.querySelector('[data-a1="continue"]'); if (b) b.click(); }); await H.sleep(3000); gate = await p.$('.hs-copy h1'); }
    if (!gate) { await p.evaluate(() => { try { LowiR2.showGate('signup'); } catch (e) { } }); await H.sleep(3000); gate = await p.$('.hs-copy h1'); }
    ok(!!gate, 'welcome screen reached');
    if (gate) {
      await H.sleep(1200);
      const g = await p.evaluate(src => { const WRAP = eval('(' + src + ')'); const h = document.querySelector('.hs-copy h1'); const r = h.getBoundingClientRect(); const o = WRAP(h); o.fs = parseFloat(getComputedStyle(h).fontSize); o.inView = r.top >= 0 && r.bottom <= innerHeight; return o; }, WRAP.toString());
      await snap();
      ok(g.text === W.h, 'headline: ' + g.text);
      ok(!g.split.length && !g.over && g.inView, 'headline: no word split across lines, fits the screen, in view: ' + JSON.stringify(g));
      const page = await p.evaluate(() => document.body.innerText);
      ok(!/lose weight|abnehmen|nimm ab|adelgaza/i.test(page), 'no "lose weight" wording on the welcome screen');
    }
    /* goals: rendered list from the same source the setup uses */
    const goals = await p.evaluate(() => { try { return (window.LowiTags ? LowiTags.goals : []).map(g => g[1]); } catch (e) { return []; } });
    if (goals.length) { const tr = await p.evaluate(gs => gs.map(g => { try { return window.LowiI18n && LowiI18n.t ? LowiI18n.t(g) : g; } catch (e) { return g; } }), goals); console.log('INFO goals: ' + JSON.stringify(tr)); ok(goals.includes('Gain weight') && goals.includes('Keep my weight') && goals[0] === 'Just be healthier', 'goal list: healthier first, lose / gain / keep'); }
    else console.log('INFO LowiTags not exposed; goal list checked in unit tests');
    /* the setup step with the goal chips ("About you"), as a new player walks it */
    await p.reload(); await H.sleep(6000);
    const tap = async sel => { await p.evaluate(q => { const e = document.querySelector(q); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await H.sleep(250); await R.tap(sel); };
    await p.waitForSelector('#r2obB', { timeout: 60000 });
    if (await p.$('#r2obName')) await p.fill('#r2obName', 'Robin');
    await p.fill('#r2obB', '1994-03-10');
    await p.evaluate(() => { const b = document.getElementById('r2obB'); b.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true })); });
    await tap('[data-r2o="next"]');
    await p.waitForSelector('#r2obRev [data-lc="go"]:not([disabled])', { timeout: 90000 });
    await tap('#r2obRev [data-lc="go"]'); await H.sleep(1500);
    await p.waitForSelector('[data-r2o="initial"],[data-r2o="next"]', { timeout: 20000 });
    if (await p.$('[data-r2o="initial"]')) { await tap('[data-r2o="initial"]'); await H.sleep(1200); }
    await p.waitForSelector('#r2ob .r2-goals [data-r2tag]', { timeout: 20000 }); await H.sleep(2500);
    await p.evaluate(() => { const g = document.querySelector('#r2ob .r2-goals'); g && g.scrollIntoView({ block: 'center' }); }); await H.sleep(600);
    const chips = await p.$$eval('#r2ob .r2-goals [data-r2tag]', bs => bs.map(b => { const r = b.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(b); const rows = new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size; return { k: b.getAttribute('data-r2tag'), t: b.textContent.trim(), rows, h: Math.round(r.height), over: r.right > innerWidth + 1 || r.left < -1 }; }));
    await snap();
    console.log('INFO chips ' + JSON.stringify(chips));
    const texts = chips.map(c => c.t);
    ok(W.goals.every(g => texts.includes(g)) && texts[0] === W.goals[0], 'goal chips in setup: ' + JSON.stringify(texts));
    ok(chips.every(c => c.rows === 1 && !c.over), 'every goal chip on one line, on screen');
    await tap('#r2ob [data-r2tag="Gain weight"]'); await H.sleep(300);
    ok(await p.$eval('#r2ob [data-r2tag="Gain weight"]', b => b.getAttribute('aria-pressed') === 'true'), 'Gain weight can be picked (lights up)');
    ok(!errs.length, 'no page errors ' + JSON.stringify(errs));
  } catch (e) { ok(false, 'run: ' + (e && e.message || e)); await snap(); }
  await R.close();
  console.log(fails.length ? 'RESULT FAIL ' + fails.length : 'RESULT PASS');
  process.exit(fails.length ? 1 : 0);
})();
