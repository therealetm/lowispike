/* Oct 23 2026, Emmanuel's setup feedback, checked in a real browser (local folder or the live site):
   1. the step about the person is titled "About you" (Über dich / Sobre ti) with a short why
   2. the shopping step in setup shows one plain line: no worlds, scanning or glowing
   3. the companion reveal has "New name" + "Type my own": a typed name shows in the big name and is the one saved
   Usage: node tools/check-onboarding-feedback.cjs [url] [lang] [device] [shotPrefix]
   device: 'iPhone' (390x844, default) or 'iPad' (820x1180), mobile Chromium. Screens go to /tmp/obfb-<prefix>-<n>.png */
'use strict';
const H = require('./sim/harness.cjs');
const url = process.argv[2] || '', lang = process.argv[3] || 'de', device = process.argv[4] || 'iPhone 13', pre = process.argv[5] || 'local';
const T = {
  de: { about: 'Über dich', why: 'Damit deine Tipps zu dir passen', own: 'Selbst benennen', next: 'Weiter', bad: /Welt|scann|leucht/i },
  en: { about: 'About you', why: 'So your tips fit you', own: 'Type my own', next: 'Next', bad: /world|scan|glow/i },
  es: { about: 'Sobre ti', why: 'Así tus consejos se adaptan a ti', own: 'Ponerle nombre', next: 'Siguiente', bad: /mundo|escane|brill/i }
}[lang];
const noX = async (R, what) => { const o = await R.page.evaluate(() => { let bad = 0; document.querySelectorAll('#r2ob *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1)) bad++; }); return bad; }); ok(o === 0, what + ': nothing sticks out sideways (' + o + ')'); };
const fails = [], ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };
(async () => {
  const ipad = /ipad/i.test(device);
  const R = await H.open({ url, lang, device, fresh: true, engine: 'chromium', viewport: ipad ? { width: 820, height: 1180 } : { width: 390, height: 844 }, dpr: ipad ? 2 : 3 });
  const p = R.page;
  try {
    await p.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
    await R.goto(); await H.sleep(6000);
    await p.waitForSelector('#r2obB', { timeout: 60000 });
    if (await p.$('#r2obName')) await p.fill('#r2obName', 'Lena');
    await p.fill('#r2obB', '1994-03-10');
    await p.evaluate(() => { const b = document.getElementById('r2obB'); b.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true })); });
    await R.tap('[data-r2o="next"]');
    await p.waitForSelector('#r2obRev [data-lc="own"]:not([disabled])', { timeout: 30000 });
    const before = await p.textContent('#r2obRev .lc-name');
    ok(before && !/^(Mito|Glyco|Cyto|Ribo|Insu|Lepti|Kreb|Keto|Lipo|Enzy)/.test(before), 'random name is friendly: ' + before);
    await R.tap('#r2obRev [data-lc="shuffle"]'); await H.sleep(500);
    const after = await p.textContent('#r2obRev .lc-name');
    ok(after && after !== before, 'New name gives another: ' + after);
    const ownTxt = (await p.textContent('#r2obRev [data-lc="own"]')).trim();
    ok(ownTxt === T.own, 'own-name button reads ' + ownTxt);
    await R.tap('#r2obRev [data-lc="own"]'); await H.sleep(400);
    ok(await p.isVisible('#r2obRev .lc-in'), 'name field opens');
    await p.fill('#r2obRev .lc-in', 'Funky'); await H.sleep(300);
    ok((await p.textContent('#r2obRev .lc-name')) === 'Funky', 'typed name shows in the big name');
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    const fit = await p.evaluate(() => { const r = document.querySelector('#r2obRev [data-lc="go"]').getBoundingClientRect(); const own = document.querySelector('#r2obRev [data-lc="own"]').getBoundingClientRect(); return { goH: r.height, ownH: own.height, w: innerWidth, ownR: own.right, ownL: own.left }; });
    ok(fit.ownH >= 44 && fit.goH >= 44 && fit.ownL >= 0 && fit.ownR <= fit.w, 'buttons thumb-sized and on screen ' + JSON.stringify(fit));
    await noX(R, 'name'); await R.shot('/tmp/obfb-' + pre + '-1-name.png');
    await R.tap('#r2obRev [data-lc="go"]'); await H.sleep(1500);
    const saved = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.companion.v1') || 'null'); } catch (e) { return null; } });
    ok(saved && saved.name === 'Funky', 'typed name is saved: ' + (saved && saved.name));
    /* photo step: use my initial */
    await p.waitForSelector('[data-r2o="initial"],[data-r2o="next"]', { timeout: 20000 });
    await R.tap('[data-r2o="initial"]'); await H.sleep(1200);
    const t2 = (await p.textContent('#r2ob .r2-obt')).trim(), s2 = (await p.textContent('#r2ob .r2-obs')).trim();
    ok(t2 === T.about, 'step title: ' + t2);
    ok(s2.startsWith(T.why), 'step subtitle: ' + s2);
    await noX(R, 'about'); await R.shot('/tmp/obfb-' + pre + '-2-about.png');
    await R.tap('#r2ob [data-r2o="next"]'); await H.sleep(1200);
    await p.waitForSelector('#r2ob .spl-first', { timeout: 20000 });
    const line = (await p.textContent('#r2ob .spl-first')).trim();
    ok(!T.bad.test(line) && line.length < 140, 'shop line is plain: ' + line);
    ok(!(await p.$('#r2ob .spl-does')), 'no glow rule in setup');
    await noX(R, 'shop'); await R.shot('/tmp/obfb-' + pre + '-3-shop.png');
    const errs = R.errs.filter(e => !/supabase|fetch|network/i.test(e.m));
    ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
  } catch (e) { ok(false, 'run: ' + e.message.split('\n')[0]); await R.shot('/tmp/obfb-' + pre + '-err.png'); }
  await R.close();
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
