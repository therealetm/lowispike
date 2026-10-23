'use strict';
/* Bug hunt (Community tabs + galaxy chat): open Community on the live site, and on each Community tab (Room, Chat, Creation,
   Affiliates) tap every visible control one at a time from a clean tab, then up to 12 controls inside what it opened.
   Records page errors, renderer crashes, reloads, dead taps (nothing changed), horizontal overflow and controls a finger
   cannot reach (covered / off screen), with a screenshot each.
   node tools/hunt-community-monkey.cjs <device> [url|root] [outdir] [theme light|dark] [lang en|de|es] [tabs room,chat,create,aff] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/hunt', theme = process.argv[5] || 'dark', lang = process.argv[6] || 'en';
  const TABS = (process.argv[7] || 'room,chat,create,aff').split(',');
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = 'cm-' + device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const loads0 = R.loads;
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  const reset = async (tab) => {
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(120); }
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('foryou'); } catch (e) { } window.scrollTo(0, 0); });
    await H.sleep(700);
    const t = P.locator('#cmPaneChat .rm-tab[data-rm="' + tab + '"]').first();
    if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(900); }
  };
  const SCOPE = '#tab-foryou';
  const list = (scopeSel) => P.evaluate((scopeSel) => {
    const scope = scopeSel ? document.querySelector(scopeSel) : document;
    if (!scope) return [];
    const els = [...scope.querySelectorAll('button,[role=button],a[href],[data-rm],[data-chat],[data-cm],[data-act],input,select,textarea')];
    const seen = new Set(), outL = [];
    els.forEach((b, i) => {
      const r = b.getBoundingClientRect(), s = getComputedStyle(b);
      if (r.width < 4 || r.height < 4 || s.visibility === 'hidden' || s.display === 'none' || +s.opacity < .05 || b.closest('[hidden],[aria-hidden="true"],[inert]')) return;
      if (r.bottom < 0 || r.top > innerHeight * 3) return;
      if (b.parentElement && b.parentElement.closest('button,[role=button]')) return;
      if (b.tagName === 'A' && /^https?:/.test(b.getAttribute('href') || '') && !b.href.includes(location.host)) return;
      const id = b.id ? '#' + b.id : null;
      const attrs = ['data-rm', 'data-chat', 'data-cm', 'data-act', 'data-id', 'aria-label'].map(a => b.getAttribute(a) != null ? `[${a}="${String(b.getAttribute(a)).replace(/"/g, '\\"')}"]` : '').join('');
      const key = id || (b.tagName.toLowerCase() + attrs) + '|' + (b.textContent || '').trim().slice(0, 30);
      if (seen.has(key)) return; seen.add(key);
      b.setAttribute('data-hunt', 'h' + i);
      outL.push({ h: 'h' + i, key, label: ((b.getAttribute('aria-label') || b.textContent || b.value || b.placeholder || '').replace(/\s+/g, ' ').trim()).slice(0, 50), tag: b.tagName });
    });
    return outL;
  }, scopeSel);
  const state = () => P.evaluate(() => ({
    html: document.body.innerHTML.length,
    sheets: [...document.querySelectorAll('.r2-ov.on, [role=dialog]:not([hidden]), .cm-sheet.on, [data-open]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).length,
    community: !!(document.getElementById('tab-foryou') || {}).classList && document.getElementById('tab-foryou').classList.contains('active'),
    url: location.hash, overflow: document.documentElement.scrollWidth - innerWidth, text: (document.body.innerText || '').length,
    focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : ''
  }));
  const tapH = async (h) => {
    const loc = P.locator(`[data-hunt="${h}"]`).first();
    await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { });
    await H.sleep(250);
    const cover = await loc.evaluate(e => { const r = e.getBoundingClientRect(); if (!r.width) return 'gone'; const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return 'offscreen ' + Math.round(x) + ',' + Math.round(y); const t = document.elementFromPoint(x, y); return t && (t === e || e.contains(t) || t.contains(e) || (t.closest('label') && t.closest('label').contains(e))) ? '' : 'covered by ' + (t ? (t.id || String(t.className).slice(0, 50) || t.tagName) : 'nothing'); }).catch(() => 'gone');
    if (cover) return cover;
    await R.tapEl(loc).catch(() => { });
    return '';
  };
  const findings = [];
  const note = async (kind, info) => { const f = path.join(out, tag + '-' + findings.length + '.png'); await R.shot(f); findings.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info)); };
  const SKIP = /camera|kamera|cámara|sign out|abmelden|delete|löschen|eliminar|block|blockier|bloque|report|melden|denunciar|leave|verlassen|salir|photo|foto|share|teilen|compartir|mic|voice|sprach/i;
  for (const tab of TABS) {
    await reset(tab);
    const top = await list(SCOPE);
    console.log('TAB', tab, 'controls', top.length, JSON.stringify(top.map(t => t.label)));
    await R.shot(path.join(out, tag + '-' + tab + '.png'));
    for (const t of top) {
      if (SKIP.test(t.label)) { console.log('skip', t.label); continue; }
      await reset(tab);
      const again = await list(SCOPE); const m = again.find(x => x.key === t.key); if (!m) continue;
      const e0 = R.errs.length, s0 = await state(); R.step = tab + ': tap ' + t.label;
      const why = await tapH(m.h);
      if (why && why !== 'gone') { await note('cannot tap', { tab, label: t.label, key: t.key, why }); continue; }
      await H.sleep(1300);
      if (R.crashed) { await note('crash', { tab, label: t.label }); break; }
      const s1 = await state();
      if (R.errs.length > e0) await note('error', { tab, label: t.label, errs: R.errs.slice(e0) });
      if (s1.overflow > 2) await note('overflow', { tab, label: t.label, px: s1.overflow });
      if (R.loads > loads0) { await note('reload', { tab, label: t.label }); }
      const changed = s1.html !== s0.html || s1.sheets !== s0.sheets || s1.url !== s0.url || s1.text !== s0.text || s1.focus !== s0.focus;
      if (!changed && !/INPUT|SELECT|TEXTAREA/.test(t.tag)) await note('dead tap', { tab, label: t.label, key: t.key });
      if (s1.sheets > s0.sheets) {
        const sel = await P.evaluate(() => { const s = [...document.querySelectorAll('.r2-ov.on, [role=dialog]:not([hidden])')].filter(e => e.getBoundingClientRect().height > 0).pop(); if (!s) return null; s.setAttribute('data-hunt-sheet', '1'); return '[data-hunt-sheet="1"]'; });
        const inner = sel ? await list(sel) : [];
        console.log('  ', t.label, 'opened', inner.length, 'controls:', JSON.stringify(inner.map(x => x.label)));
        for (const c of inner.slice(0, 12)) {
          if (SKIP.test(c.label)) continue;
          if (!await P.locator(`[data-hunt="${c.h}"]`).count()) continue;
          const e1 = R.errs.length; R.step = tab + ': ' + t.label + ' > ' + c.label;
          const w2 = await tapH(c.h);
          if (w2 && w2 !== 'gone') { await note('cannot tap (sheet)', { tab, label: t.label + ' > ' + c.label, why: w2 }); continue; }
          await H.sleep(1000);
          if (R.crashed) { await note('crash', { tab, label: t.label + ' > ' + c.label }); break; }
          if (R.errs.length > e1) await note('error', { tab, label: t.label + ' > ' + c.label, errs: R.errs.slice(e1) });
          const s2 = await state(); if (s2.overflow > 2) await note('overflow', { tab, label: t.label + ' > ' + c.label, px: s2.overflow });
        }
      }
      if (R.crashed) break;
    }
    if (R.crashed) break;
  }
  R.step = 'reload mid-community'; await reset('chat'); await P.reload({ waitUntil: 'load' }).catch(() => { }); await H.sleep(5000);
  const after = await state(); if (after.overflow > 2) await note('overflow after reload', { px: after.overflow });
  console.log(JSON.stringify({ device, theme, lang, build, crashed: R.crashed, loads: R.loads, errs: R.errs, findings }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
