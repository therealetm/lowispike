'use strict';
/* Bug hunt (Settings, What's New, language switch, day/night; Oct 23 2026). On the live site like a user:
   1. opens the You/Settings hub (the hold on the Community bubble opens LowiCommunityMe), lists its rows, checks layout + language;
   2. Day/night row: taps it, checks the theme really flips (html, LowiTopBar state, the row's own label), reloads, checks it stuck, flips back;
   3. EN/DE/ES buttons: taps each, checks <html lang>, the hub re-renders in that language, the tab bar and Home words follow, no
      English left in obvious places, and that it survives a reload;
   4. every other row (Profile, Your presence, Weight & BMI, Weight journey, Tutorial, Account, Look & sound, More places, Delete
      account -> Cancel) from a fresh hub: what opens on top, page errors, whether you can close it again;
   5. What's New: a launch with nothing seen shows the running build's news once, in the app language; Later; a reload does not repeat it.
   node tools/hunt-settings.cjs <device> [url] [theme] [lang] [outdir] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', url = A[1] || 'https://therealetm.github.io/lowispike/index.html';
  const theme = A[2] || 'dark', lang = A[3] || 'en', out = A[4] || '/tmp/hunt-set';
  fs.mkdirSync(out, { recursive: true });
  const tag = device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([t, l]) => { try { if (!sessionStorage.getItem('hunt.init')) { sessionStorage.setItem('hunt.init', '1'); localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } } catch (e) { } }, [theme, lang]);
  const P = R.page, F = [];
  const find = async (kind, info) => { const f = path.join(out, tag + '-' + F.length + '.png'); await R.shot(f); F.push({ kind, info, f }); console.log('FIND', kind, JSON.stringify(info)); };
  const errMark = () => R.errs.length;
  const errsSince = n => R.errs.slice(n).map(e => e.m);
  await R.goto(); await H.sleep(6000);
  const st = () => P.evaluate(() => ({ lang: document.documentElement.lang, theme: (window.LowiTopBar && LowiTopBar.state && LowiTopBar.state().theme) || '', cls: document.documentElement.className.match(/\b(light|dark|day|night|lt|theme-\w+)\b/g), lsTheme: localStorage.getItem('lowi.theme'), lsLang: localStorage.getItem('lowispike.lang'), hub: !!(window.LowiCommunityMe && LowiCommunityMe.isOpen()), top: (() => { const o = [...document.querySelectorAll('.r2-ov.on,.r2-ov')].filter(e => e.getBoundingClientRect().height > 50).pop(); return o ? (o.className + ' ' + (o.querySelector('h1,h2,h3,b') || {}).textContent).slice(0, 120) : ''; })(), bg: getComputedStyle(document.body).backgroundColor }));
  const hubInfo = () => P.evaluate(() => {
    const s = document.querySelector('.cme-ov.on #cmeSheet') || document.querySelector('.cme:not(.cme-ov) #cmeSheet'); if (!s) return null;
    const rows = [...s.querySelectorAll('[data-cme],[data-lang]')].map(b => { const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, Math.min(Math.max(y, 1), innerHeight - 1)); return { id: b.getAttribute('data-cme') || 'lang-' + b.getAttribute('data-lang'), tx: (b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), hit: !!(t && (t === b || b.contains(t))), by: t ? (t.id || String(t.className).slice(0, 30)) : null }; });
    const cut = [...s.querySelectorAll('b,small,span,h3,p')].filter(e => !e.closest('.cme-av') && e.scrollWidth > e.clientWidth + 2 && /hidden|clip/.test(getComputedStyle(e).overflow + getComputedStyle(e).textOverflow)).map(e => e.textContent.trim().slice(0, 30));
    const ov = [...s.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right)).slice(0, 5);
    return { text: s.innerText.replace(/\s+/g, ' ').slice(0, 900), rows, cut, ov, docOv: document.documentElement.scrollWidth - innerWidth };
  });
  const openHub = async () => { const was = await P.evaluate(() => { const o = !!(window.LowiCommunityMe && LowiCommunityMe.isOpen()) || !!document.querySelector('.r2-ov.on'); try { if (LowiCommunityMe.isOpen()) LowiCommunityMe.close(); else if (document.querySelector('.r2-ov.on') && LowiR2.close) LowiR2.close(); } catch (e) { } return o; }); if (was) await H.sleep(2000); const ok = await P.evaluate(() => window.LowiCommunityMe ? LowiCommunityMe.open() : 'missing'); await H.sleep(2600); return ok; };
  const tapIn = async (sel) => { const loc = P.locator(sel).first(); await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(350); const b = await loc.evaluate(e => { const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, ok: !!(t && (t === e || e.contains(t))), by: t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : 'nothing (off screen?) y=' + Math.round(y) }; }).catch(() => null); if (!b) return { gone: true }; if (!b.ok) return { covered: b.by }; await P.touchscreen.tap(b.x, b.y); await H.sleep(1200); return { ok: true }; };

  /* 1. hub */
  R.step = 'hub';
  let ok = await openHub(); let hi = await hubInfo();
  if (!hi) await find('hub did not open', { ok });
  else {
    console.log('HUB', JSON.stringify({ text: hi.text.slice(0, 400), rows: hi.rows.map(r => r.id + (r.hit ? '' : '(covered by ' + r.by + ')')) }));
    if (hi.cut.length) await find('hub text cut', hi.cut);
    if (hi.ov.length || hi.docOv > 1) await find('hub overflow', { ov: hi.ov, docOv: hi.docOv });
    const small = hi.rows.filter(r => r.h < 30 || r.w < 30); if (small.length) await find('hub small controls', small);
    if (lang !== 'en' && /\b(Settings|Profile|Account|Weight journey|Delete account|Language|Tutorial|More places|Your presence)\b/.test(hi.text)) await find('English left in hub', { lang, text: hi.text.slice(0, 500) });
  }

  /* 2. day/night */
  R.step = 'theme';
  if (hi) {
    const s0 = await st(), row0 = (hi.rows.find(r => r.id === 'theme') || {}).tx;
    let m = errMark(); const t = await tapIn('[data-cme="theme"]'); await H.sleep(800);
    const s1 = await st(), hi1 = await hubInfo(), row1 = hi1 && (hi1.rows.find(r => r.id === 'theme') || {}).tx;
    console.log('THEME', JSON.stringify({ t, before: s0, after: s1, row0, row1 }));
    if (!t.ok) await find('theme row not tappable', t);
    else {
      if (s0.theme === s1.theme && s0.lsTheme === s1.lsTheme) await find('theme did not change', { s0, s1 });
      if (!hi1) await find('hub closed on theme tap', {});
      else if (row0 === row1) await find('theme row label did not change', { row0, row1 });
      if (s0.bg === s1.bg) console.log('NOTE body bg same', s0.bg);
      if (errsSince(m).length) await find('errors on theme tap', errsSince(m));
      await P.reload({ waitUntil: 'load' }); await H.sleep(6000);
      const s2 = await st(); if (s2.theme !== s1.theme || s2.lsTheme !== s1.lsTheme) await find('theme did not stick after reload', { s1, s2 });
      await openHub(); m = errMark(); await tapIn('[data-cme="theme"]'); await H.sleep(800);
      const s3 = await st(); if (s3.theme !== s0.theme) await find('theme did not flip back', { s0, s3 });
      await P.evaluate(() => { try { LowiCommunityMe.close(); } catch (e) { } });
    }
  }

  /* 3. language */
  R.step = 'lang';
  const homeWords = () => P.evaluate(() => { const pick = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().width > 0).map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 14); return { orbit: pick('[data-orbit]'), tabbar: pick('#tabbar .tb, #tabbar button'), hud: pick('#whHud button') }; });
  const order = lang === 'en' ? ['de', 'es', 'en'] : lang === 'de' ? ['es', 'en', 'de'] : ['en', 'de', 'es'];
  for (const L of order) {
    await openHub(); let m = errMark();
    const t = await tapIn('.cme-ov.on #cmeSheet [data-lang="' + L + '"]'); await H.sleep(1500);
    const s1 = await st(), hi2 = await hubInfo();
    if (!t.ok) { await find('language button not tappable', { L, t }); continue; }
    if (s1.lang.slice(0, 2) !== L) await find('html lang did not change', { L, s1 });
    if (!hi2) await find('hub closed on language tap', { L });
    else {
      const pressed = hi2.rows.find(r => r.id === 'lang-' + L);
      const sett = ((hi2.text.match(/Settings|Einstellungen|Ajustes/i) || [])[0] || '').toLowerCase();
      const want = { en: 'settings', de: 'einstellungen', es: 'ajustes' }[L];
      if (sett !== want) await find('hub not in new language', { L, text: hi2.text.slice(0, 300) });
      if (L !== 'en' && /\b(Profile|Account|Weight journey|Delete account|Language|More places|Your presence|Look & sound|Day \/ night)\b/.test(hi2.text)) await find('English left in hub after switch', { L, text: hi2.text.slice(0, 600) });
    }
    await P.evaluate(() => { try { LowiCommunityMe.close(); } catch (e) { } }); await H.sleep(900);
    const w = await homeWords(); console.log('WORDS', L, JSON.stringify(w));
    if (errsSince(m).length) await find('errors on language switch', { L, e: errsSince(m) });
    await P.reload({ waitUntil: 'load' }); await H.sleep(6000);
    const s2 = await st(), w2 = await homeWords();
    if (s2.lang.slice(0, 2) !== L) await find('language did not stick after reload', { L, s2 });
    const srt = a => JSON.stringify(a.map(x => x.replace(/\d+/g, '#')).sort()); if (srt(w.orbit) !== srt(w2.orbit) || srt(w.tabbar) !== srt(w2.tabbar)) await find('Home words differ before/after reload (switch not applied live?)', { L, before: w, after: w2 });
  }

  /* 4. every other row */
  R.step = 'rows';
  await openHub(); hi = await hubInfo();
  const ids = hi ? hi.rows.map(r => r.id).filter(id => !/^lang-|^theme$|^close$|^more$/.test(id)) : [];
  for (const id of [...new Set(ids)]) {
    await openHub(); const m = errMark();
    if (!(await P.locator('.cme-ov.on #cmeSheet [data-cme="' + id + '"]').count())) { /* inside More places */ await tapIn('.cme-ov.on #cmeSheet [data-cme="more"]'); }
    const t = await tapIn('.cme-ov.on #cmeSheet [data-cme="' + id + '"]'); await H.sleep(1500);
    const s1 = await st();
    const vis = await P.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov,.ns-ov,[role=dialog]')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 80 && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .1; }).map(e => (e.id || String(e.className).slice(0, 40))); return { o, tab: [...document.querySelectorAll('[id^=tab-]')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none').map(e => e.id), tour: document.documentElement.classList.contains('g1-tour') || !!document.querySelector('.tut-on,.tutorial-on,#tutBox:not([hidden])') }; });
    console.log('ROW', id, JSON.stringify({ t, hub: s1.hub, top: s1.top, vis }));
    if (!t.ok) await find('row not tappable', { id, t });
    else if (id === 'deleteAccount') { const ask = await P.locator('.cme-ov.on #cmeSheet [data-cme="delCancel"]').count(); if (!ask) await find('delete account did not ask', { id }); else { await tapIn('.cme-ov.on #cmeSheet [data-cme="delCancel"]'); const back = await P.locator('.cme-ov.on #cmeSheet [data-cme="deleteAccount"]').count(); if (!back) await find('cancel did not return to hub', {}); } }
    else if (s1.hub && id !== 'deleteAccount') await find('row tap left hub open (dead row?)', { id, top: s1.top });
    if (errsSince(m).length) await find('errors on row', { id, e: errsSince(m) });
    await R.shot(path.join(out, tag + '-row-' + id + '.png'));
    await P.reload({ waitUntil: 'load' }); await H.sleep(6000);
  }

  /* 5. What's New */
  R.step = 'news';
  await P.evaluate(() => { localStorage.removeItem('lowi.news.seen'); localStorage.removeItem('lowi.g1.bn'); try { const m = JSON.parse(localStorage.getItem('lowi.g1') || '{}'); delete m.n; delete m.t; localStorage.setItem('lowi.g1', JSON.stringify(m)); } catch (e) { } });
  let m = errMark();
  await P.reload({ waitUntil: 'load' }); await H.sleep(14000);
  const news = await P.evaluate(() => { const b = [...document.querySelectorAll('#g1Z,#g1Z2,#n1B,.g1-bub,.g1-news,[class*=g1-]')].filter(e => e.getBoundingClientRect().height > 20 && getComputedStyle(e).visibility !== 'hidden'); return { lang: document.documentElement.lang, n: b.map(e => (e.id || e.className) + ': ' + (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 220)).slice(0, 4), seen: localStorage.getItem('lowi.news.seen') }; });
  console.log('NEWS', JSON.stringify(news));
  await R.shot(path.join(out, tag + '-news.png'));
  if (errsSince(m).length) await find('errors around news', errsSince(m));
  console.log('DONE', tag, 'findings', F.length, 'errors', R.errs.length, JSON.stringify(R.errs.slice(0, 6)));
  await R.close();
})().catch(e => { console.log('TOOL ERROR', e && e.stack); process.exit(1); });
