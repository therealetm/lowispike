'use strict';
/* Bug hunt (Community tabs): the Creation and Affiliates tabs are iframes (community-rooms-ui.js rm-frame). Open each tab on
   the live site, then tap every visible control inside its frame, one at a time from a fresh frame load, and record page
   errors, dead taps, horizontal overflow, controls a finger can't reach, and blank frames. Screenshots to outdir.
   node tools/hunt-community-frames.cjs <device> [url|root] [outdir] [theme] [lang] [tabs create,aff] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/hunt', theme = process.argv[5] || 'dark', lang = process.argv[6] || 'en', TABS = (process.argv[7] || 'create,aff').split(',');
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = 'cf-' + device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  const ferrs = []; P.on('console', m => { if (m.type() === 'error' && m.location && !/index\.html/.test(m.location().url || '') && !/Failed to load resource|net::|blocked|aborted|access control/i.test(m.text())) ferrs.push(m.location().url.split('/').slice(-2).join('/') + ': ' + m.text().slice(0, 200)); });
  await R.goto(); await H.sleep(5000);
  const findings = [];
  const note = async (kind, info) => { const f = path.join(out, tag + '-' + findings.length + '.png'); await R.shot(f); findings.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info)); };
  const frameOf = async (view) => { for (let i = 0; i < 30; i++) { const el = await P.$('iframe.rm-frame[data-view="' + view + '"]'); const f = el && await el.contentFrame(); if (f) { try { await f.waitForLoadState('load', { timeout: 15000 }); } catch (e) { } return { el, f }; } await H.sleep(500); } return null; };
  const openTab = async (view) => { await P.keyboard.press('Escape').catch(() => { }); await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } goTab('foryou'); }); await H.sleep(700); await R.tap('#cmPaneChat .rm-tab[data-rm="' + view + '"]'); await H.sleep(1500); return frameOf(view); };
  const SKIP = /delete|löschen|eliminar|sign out|abmelden|camera|kamera|upload|hochladen|subir|record|aufnehmen|grabar|mic/i;
  const listIn = (f) => f.evaluate(() => {
    const outL = [], seen = new Set();
    document.querySelectorAll('button,[role=button],a[href],input,select,textarea,summary').forEach((b, i) => {
      const r = b.getBoundingClientRect(), s = getComputedStyle(b);
      if (r.width < 4 || r.height < 4 || s.visibility === 'hidden' || s.display === 'none' || +s.opacity < .05 || b.closest('[hidden],[aria-hidden="true"]')) return;
      if (b.parentElement && b.parentElement.closest('button,[role=button]')) return;
      if (b.tagName === 'A' && /^https?:/.test(b.getAttribute('href') || '') && !b.href.includes(location.host)) return;
      const key = (b.id ? '#' + b.id : b.tagName) + '|' + (b.getAttribute('aria-label') || b.textContent || b.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      if (seen.has(key)) return; seen.add(key); b.setAttribute('data-hunt', 'f' + i);
      outL.push({ h: 'f' + i, key, label: key.split('|')[1], tag: b.tagName, type: b.type || '' });
    });
    return { list: outL, overflow: document.documentElement.scrollWidth - innerWidth, text: (document.body.innerText || '').trim().length, w: innerWidth, h: innerHeight };
  });
  for (const view of TABS) {
    const fr = await openTab(view);
    if (!fr) { await note('no frame', { view }); continue; }
    const box = await fr.el.boundingBox();
    const first = await listIn(fr.f);
    console.log('TAB', view, 'frame', JSON.stringify(box), 'text', first.text, 'controls', first.list.length, JSON.stringify(first.list.map(x => x.label)));
    await R.shot(path.join(out, tag + '-' + view + '.png'));
    if (!first.text) await note('blank frame', { view });
    if (first.overflow > 2) await note('overflow', { view, px: first.overflow });
    if (box && (box.height < 200 || box.y + box.height > (P.viewportSize().height + 4))) console.log('frame box', JSON.stringify(box), 'viewport', JSON.stringify(P.viewportSize()));
    for (const c of first.list.slice(0, 40)) {
      if (SKIP.test(c.label)) { console.log('skip', c.label); continue; }
      const fr2 = await openTab(view); if (!fr2) break;
      const again = await listIn(fr2.f); const m = again.list.find(x => x.key === c.key); if (!m) continue;
      const loc = fr2.f.locator('[data-hunt="' + m.h + '"]').first();
      await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(250);
      const pos = await loc.evaluate(e => { const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, ok: !!(t && (t === e || e.contains(t) || t.contains(e) || (t.closest('label') && t.closest('label').contains(e)))), by: t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : null }; }).catch(() => null);
      if (!pos) continue;
      const fb = await fr2.el.boundingBox();
      const px = fb.x + pos.x, py = fb.y + pos.y, vp = P.viewportSize();
      if (!pos.ok) { await note('covered (in frame)', { view, label: c.label, by: pos.by }); continue; }
      if (py < 0 || py > vp.height || px < 0 || px > vp.width) { await note('off screen', { view, label: c.label, px: Math.round(px), py: Math.round(py) }); continue; }
      const topAt = await P.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); return t ? (t.tagName === 'IFRAME' ? 'IFRAME' : (t.id || String(t.className).slice(0, 40) || t.tagName)) : null; }, [px, py]);
      if (topAt !== 'IFRAME') { await note('frame control covered by app', { view, label: c.label, by: topAt, at: [Math.round(px), Math.round(py)] }); continue; }
      const s0 = await fr2.f.evaluate(() => ({ h: document.body.innerHTML.length, u: location.href, t: (document.body.innerText || '').length, a: document.activeElement && document.activeElement.tagName })).catch(() => null);
      const e0 = R.errs.length + ferrs.length, pages = R.ctx.pages().length;
      await P.touchscreen.tap(px, py); await H.sleep(1300);
      if (R.crashed) { await note('crash', { view, label: c.label }); break; }
      const f3 = (await frameOf(view)) || fr2;
      const s1 = await f3.f.evaluate(() => ({ h: document.body.innerHTML.length, u: location.href, t: (document.body.innerText || '').length, a: document.activeElement && document.activeElement.tagName, ov: document.documentElement.scrollWidth - innerWidth })).catch(() => null);
      if (R.errs.length + ferrs.length > e0) await note('error', { view, label: c.label, errs: R.errs.slice(-3).concat(ferrs.slice(-3)) });
      if (s1 && s1.ov > 2) await note('overflow', { view, label: c.label, px: s1.ov });
      const topNow = await P.evaluate(() => ({ tab: (document.querySelector('#tab-foryou') || {}).className, sheets: document.querySelectorAll('.r2-ov.on').length, loc: location.hash }));
      const changed = !s0 || !s1 || s0.h !== s1.h || s0.u !== s1.u || s0.t !== s1.t || s0.a !== s1.a || topNow.sheets > 0 || R.ctx.pages().length !== pages || !/active/.test(topNow.tab || '');
      if (!changed && !/INPUT|SELECT|TEXTAREA/.test(c.tag)) await note('dead tap', { view, label: c.label });
      else console.log('ok', view, c.label, s1 && s0 && s1.u !== s0.u ? '-> ' + s1.u.split('/').slice(-2).join('/') : '');
    }
  }
  console.log(JSON.stringify({ device, theme, lang, crashed: R.crashed, errs: R.errs, ferrs, findings }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
