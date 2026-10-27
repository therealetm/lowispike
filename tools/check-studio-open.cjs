'use strict';
/* 27 Oct 2026 (Emmanuel: "we can open it up now. Delete the password or whatever."): Studio opens for everyone.
   Opens Community > Studio by finger, checks there is no lock panel, that Affiliates loads with its content, that the switch
   opens Creation, that the menu has the Studio page link, and that nothing overflows sideways. Screenshots in /home/sprite/studio-open/.
   node tools/check-studio-open.cjs <phone|small|ipad|ipadl> [url|root] [lang] [engine] */
const H = require('./sim/harness.cjs'), fs = require('fs');
const SIZES = { phone: { width: 390, height: 844 }, small: { width: 375, height: 667 }, ipad: { width: 820, height: 1180 }, ipadl: { width: 1180, height: 820 } };
(async () => {
  const size = process.argv[2] || 'phone', where = process.argv[3] || require('path').join(__dirname, '..'), lang = process.argv[4] || 'en', engine = process.argv[5] || 'chromium';
  const o = { engine, viewport: SIZES[size], dpr: size.startsWith('ipad') ? 2 : 3, members: 20, messages: 40, probe: false, lang, device: 'iPhone 13' };
  if (/^https?:/.test(where)) o.url = where; else o.root = where;
  fs.mkdirSync('/home/sprite/studio-open', { recursive: true });
  const R = await H.open(o), P = R.page, tag = '/home/sprite/studio-open/' + size + '-' + lang;
  /* the harness's little local server has no directory index; GitHub Pages serves affiliates/ and create/ as their index.html */
  if (o.root) await R.ctx.route(u => { try { const x = new URL(u); return x.hostname === '127.0.0.1' && /\/(affiliates|create)\/$/.test(x.pathname); } catch (e) { return false; } },
    r => { const x = new URL(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(require('path').join(o.root, x.pathname, 'index.html')) }); });
  await R.ctx.addInitScript((l) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const out = { size, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content) };
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('foryou'); } catch (e) { } }); await H.sleep(1200);
  await R.tap('#cmPaneChat .rm-tab[data-rm="studio"]'); await H.sleep(2500);
  const state = () => P.evaluate(() => {
    const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; };
    const f = [...document.querySelectorAll('.rm-frame')].find(x => !x.hidden);
    let doc = null; try { doc = f && f.contentDocument; } catch (e) { }
    const body = doc && doc.body ? doc.body.innerText.replace(/\s+/g, ' ').trim() : '';
    const tab = document.querySelector('#cmPaneChat .rm-tab[data-rm="studio"]');
    const sw = document.querySelector('.rm-sw');
    const wide = doc ? [...doc.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > doc.documentElement.clientWidth + 2; }).slice(0, 5).map(e => e.tagName + '.' + e.className) : [];
    return {
      view: window.LowiRoomsUI && LowiRoomsUI.view(), tabOn: tab && tab.getAttribute('aria-selected'),
      lockEls: [...document.querySelectorAll('[class*="sl-"],[id^="sl"]')].filter(vis).map(e => e.className || e.id).slice(0, 5),
      lockText: /Gesperrt|Im Aufbau|Under construction|En construcci/.test(document.body.innerText),
      frame: !!f, frameVis: vis(f), frameSrc: f && f.getAttribute('src'), frameRect: f && (r => [Math.round(r.top), Math.round(r.height), Math.round(r.width)])(f.getBoundingClientRect()),
      frameLang: doc && doc.documentElement.lang, frameLockText: /Gesperrt|Im Aufbau|Under construction|En construcci|PIN/.test(body),
      frameHead: body.slice(0, 260), frameLen: body.length, frameWide: wide,
      switchVis: vis(sw), switchText: sw ? sw.innerText.replace(/\s+/g, ' ').trim() : '',
    };
  });
  out.aff = await state(); await R.shot(tag + '-aff.png');
  /* Affiliates works inside: tap its Start and check the next screen comes up */
  { const fr = P.frames().find(f => /affiliates\//.test(f.url()));
    if (fr) { const st = fr.locator('button, a').filter({ hasText: /Start|Los|Empezar|Comenzar/ }).first();
      await st.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(600); const bb = await st.boundingBox().catch(() => null); const fe = await P.locator('.rm-frame:not([hidden])').boundingBox();
      if (bb && fe) { const before = (await fr.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
        await P.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await H.sleep(2000);
        const after = (await fr.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
        out.affStart = { changed: before !== after, head: after.slice(0, 220) }; await R.shot(tag + '-aff-start.png'); } else out.affStart = 'no Start button found'; } else out.affStart = 'no frame'; }
  /* Creation half via the switch */
  const cb = await P.evaluate(() => { const b = document.querySelector('.rm-sw [data-rmsw="create"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (cb) { await P.touchscreen.tap(cb.x, cb.y); await H.sleep(2500); out.create = await state(); await R.shot(tag + '-create.png'); }
  /* back to Affiliates, then the menu */
  const ab = await P.evaluate(() => { const b = document.querySelector('.rm-sw [data-rmsw="aff"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (ab) { await P.touchscreen.tap(ab.x, ab.y); await H.sleep(1500); out.backToAff = await P.evaluate(() => LowiRoomsUI.view()); }
  out.menuKeys = await P.evaluate(() => { try { return LowiRoomsUI._menuKeys(); } catch (e) { return String(e); } });
  out.errs = R.errs; out.crashed = R.crashed;
  console.log(JSON.stringify(out, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
