/* Run 24: VoiceOver / keyboard "focus dropped" sweep by playing. For every Home bubble ([data-orbit]) that opens a panel: press every
   button inside the panel with the keyboard (Enter). If the panel is still open afterwards but focus fell to <body> (or onto a removed
   node), the screen reader lost its place. Fake Supabase from the harness: nothing is written anywhere.
   node probe-focus-drop.cjs [url] [engine] */
'use strict';
const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const H = require(WT + '/tools/regress/harness.cjs');
const URL_ = process.argv[2] || '', ENG = process.argv[3] || 'chromium';
const SKIP = /delete|löschen|sign ?out|abmelden|log ?out|reset|remove|entfernen|clear|wipe|erase|block|report|close|schließen|done|fertig|back|zurück|^×$|^x$/i;
(async () => {
  const R = await H.open(Object.assign({ probe: false, lang: 'en', url: URL_, engine: ENG }, ENG === 'webkit' ? { device: 'iPhone 13', viewport: { width: 390, height: 844 } } : { viewport: { width: 390, height: 844 } }));
  const p = R.page, errs = [], drops = [], seen = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await R.goto(); await H.sleep(4000);
  const orbits = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-orbit]')].map(e => e.dataset.orbit))]);
  const top = () => p.evaluate(() => { const d = [...document.querySelectorAll('.r2-ov.on:not(.off) .r2-sh, .ss2-page, [role=dialog][aria-modal=true], #hb2Bloom.on')].filter(e => e.isConnected && e.getBoundingClientRect().width > 0 && !e.closest('.off,[hidden],.r2-parked')); return d.length; });
  const closeAll = async () => { for (let i = 0; i < 5; i++) { if (!(await top())) break; await p.keyboard.press('Escape'); await p.waitForTimeout(500); } await p.evaluate(() => { try { window.LowiR2 && LowiR2.closeAll && LowiR2.closeAll(); } catch (e) {} }); await p.waitForTimeout(700); };
  const open = async o => { await p.evaluate(o => { const e = document.querySelector('[data-orbit="' + o + '"]'); e && e.click(); }, o); await p.waitForTimeout(1500); return top(); };
  for (const o of orbits) {
    await closeAll();
    if (!(await open(o))) { seen.push(o + ': no panel'); continue; }
    const btns = await p.evaluate(() => { const d = [...document.querySelectorAll('.r2-ov.on:not(.off) .r2-sh, .ss2-page, [role=dialog][aria-modal=true], #hb2Bloom.on')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('.off,[hidden],.r2-parked')).pop(); if (!d) return [];
      return [...d.querySelectorAll('button,[role=button],[role=tab],[role=switch],input[type=checkbox]')].filter(b => b.getBoundingClientRect().width > 0 && !b.disabled).map((b, i) => { b.dataset.fdp = String(i); return { i, t: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) }; }); });
    seen.push(o + ': ' + btns.length + ' buttons');
    for (const b of btns.slice(0, 14)) {
      if (SKIP.test(b.t) || !b.t) continue;
      if (!(await top())) { await closeAll(); await open(o); await p.evaluate(() => { const d = [...document.querySelectorAll('.r2-ov.on:not(.off) .r2-sh, .ss2-page, [role=dialog][aria-modal=true], #hb2Bloom.on')].filter(e => e.getBoundingClientRect().width > 0).pop(); d && [...d.querySelectorAll('button,[role=button],[role=tab],[role=switch],input[type=checkbox]')].filter(b => b.getBoundingClientRect().width > 0 && !b.disabled).forEach((b, i) => b.dataset.fdp = String(i)); }); }
      const ok = await p.evaluate(i => { const e = document.querySelector('[data-fdp="' + i + '"]'); if (!e || !e.isConnected) return false; e.focus(); return document.activeElement === e; }, b.i);
      if (!ok) continue;
      const before = await top();
      await p.keyboard.press(/checkbox/.test(b.t) ? 'Space' : 'Enter'); await p.waitForTimeout(700);
      const r = await p.evaluate(() => { const a = document.activeElement; const dlg = [...document.querySelectorAll('.r2-ov.on:not(.off) .r2-sh, .ss2-page, [role=dialog][aria-modal=true], #hb2Bloom.on')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('.off,[hidden],.r2-parked')); const topD = dlg.pop();
        return { open: !!topD, onBody: !a || a === document.body || a === document.documentElement, inTop: !!(topD && a && topD.contains(a)), act: a ? (a.tagName + '.' + String(a.className).slice(0, 30) + '|' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 30)) : null }; });
      if (before && r.open && !r.inTop) drops.push({ panel: o, pressed: b.t, focus: r.act, onBody: r.onBody });
    }
  }
  console.log(JSON.stringify({ seen, drops, errs }, null, 1));
  await R.close();
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
