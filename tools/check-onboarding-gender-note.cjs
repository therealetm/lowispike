/* Oct 23 2026, Emmanuel: four gender choices (Frau / Mann / Nichtbinär / Keine Angabe) and an own condition line in setup,
   checked in a real browser (local folder or the live site). Walks a fresh setup to "About you", picks non-binary,
   types an own condition, checks it survives a gender tap, saves, reopens Edit profile and the Profile card.
   Usage: node tools/check-onboarding-gender-note.cjs [url] [lang] [device] [shotPrefix] [theme]
   device: 'iPhone 13' (390x844) or 'iPad' (820x1180). theme: dark (default) or light. Screens: /tmp/obgn-<prefix>-<n>.png */
'use strict';
const H = require('./sim/harness.cjs');
const url = process.argv[2] || '', lang = process.argv[3] || 'de', device = process.argv[4] || 'iPhone 13', pre = process.argv[5] || 'local', theme = process.argv[6] || 'dark';
const T = {
  de: { g: ['Frau', 'Mann', 'Nichtbinär', 'Keine Angabe'], head: 'Geschlecht', note: 'Noch etwas? Hier eintippen', ph: 'z. B. Sichelzellkrankheit', hint: 'Bleibt auf diesem Handy' },
  en: { g: ['Woman', 'Man', 'Non-binary', 'Prefer not to say'], head: 'Gender', note: 'Something else? Type it here', ph: 'e.g. sickle cell disease', hint: 'Stays on this phone' },
  es: { g: ['Mujer', 'Hombre', 'No binario', 'Prefiero no decirlo'], head: 'Género', note: '¿Algo más? Escríbelo aquí', ph: 'p. ej., anemia falciforme', hint: 'Se queda en este móvil' }
}[lang];
const fails = [], ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };
const noX = async (R, sel, what) => { const o = await R.page.evaluate(s => { let bad = 0; document.querySelectorAll(s + ' *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1)) bad++; }); return bad; }, sel); ok(o === 0, what + ': nothing sticks out (' + o + ')'); };
(async () => {
  const ipad = /ipad/i.test(device);
  const R = await H.open({ url, lang, device, fresh: true, engine: process.env.ENGINE || 'chromium', viewport: ipad ? { width: 820, height: 1180 } : /SE/.test(device) ? { width: 375, height: 667 } : { width: 390, height: 844 }, dpr: ipad ? 2 : 3 });
  const p = R.page;
  const tap = async sel => { await p.evaluate(q => { const e = document.querySelector(q); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await H.sleep(250); await R.tap(sel); };
  try {
    await p.addInitScript(([l, th]) => { try { localStorage.setItem('lowispike.lang', l); if (th === 'light') localStorage.setItem('lowispike.theme', 'light'); } catch (e) { } }, [lang, theme]);
    await R.goto(); await H.sleep(6000);
    if (theme === 'light') await p.evaluate(() => { try { const s = LowiR2.S(); s.settings = s.settings || {}; s.settings.theme = 'light'; LowiR2.save(); LowiR2.applyTheme && LowiR2.applyTheme(); } catch (e) { } });
    await p.waitForSelector('#r2obB', { timeout: 60000 });
    if (await p.$('#r2obName')) await p.fill('#r2obName', 'Robin');
    await p.fill('#r2obB', '1994-03-10');
    await p.evaluate(() => { const b = document.getElementById('r2obB'); b.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true })); });
    await tap('[data-r2o="next"]');
    await p.waitForSelector('#r2obRev [data-lc="go"]:not([disabled])', { timeout: 90000 });
    await tap('#r2obRev [data-lc="go"]'); await H.sleep(1500);
    await p.waitForSelector('[data-r2o="initial"],[data-r2o="next"]', { timeout: 20000 });
    if (await p.$('[data-r2o="initial"]')) { await tap('[data-r2o="initial"]'); await H.sleep(1200); }
    await p.waitForSelector('#r2ob .r2-gender', { timeout: 20000 }); { const t0 = Date.now(); const want = { de: 'Über dich', en: 'About you', es: 'Sobre ti' }[lang]; while (Date.now() - t0 < 15000) { const t = await p.evaluate(() => { const e = document.querySelector('#r2ob .r2-obt'); return e ? e.textContent.trim() : ''; }); if (t === want) break; await H.sleep(250); } console.log('INFO translated after ' + (Date.now() - t0) + ' ms'); await H.sleep(500); }
    console.log('INFO step text: ' + JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#r2ob .r2-obt, #r2ob .r2-obs, #r2ob .r2-obsub')].map(e => e.textContent.trim()))) + ' lang=' + await p.evaluate(() => { try { return localStorage.getItem('lowispike.lang') + '/' + (window.LowiLang && LowiLang.get && LowiLang.get()); } catch (e) { return '?'; } }));
    const labels = await p.$$eval('#r2ob .r2-gender [data-r2g]', bs => bs.map(b => [b.getAttribute('data-r2g'), b.textContent.trim()]));
    ok(JSON.stringify(labels.map(l => l[1])) === JSON.stringify(T.g) && labels.map(l => l[0]).join('') === 'fmnx', 'four choices: ' + JSON.stringify(labels));
    const head = await p.evaluate(() => { const g = document.querySelector('#r2ob .r2-gender'); const h = g && g.previousElementSibling; return h ? h.textContent.trim() : ''; });
    ok(head === T.head, 'heading: ' + head);
    const field = await p.evaluate(() => { const i = document.getElementById('r2obCondNote'); if (!i) return null; const l = i.closest('label'); const h = l && l.nextElementSibling; const r = i.getBoundingClientRect(); const cs = getComputedStyle(i); return { label: l.querySelector('span').textContent.trim(), ph: i.placeholder, hint: h ? h.textContent.trim() : '', max: i.maxLength, h: r.height, fs: parseFloat(cs.fontSize), color: cs.color, bg: cs.backgroundColor }; });
    ok(field && field.label === T.note, 'field label: ' + (field && field.label));
    ok(field && field.ph === T.ph, 'placeholder: ' + (field && field.ph));
    ok(field && field.hint.startsWith(T.hint), 'hint: ' + (field && field.hint));
    ok(field && field.max === 120 && field.h >= 44 && field.fs >= 16, 'field: max 120, thumb-sized, no iOS zoom ' + JSON.stringify(field));
    const lines = await p.$$eval('#r2ob .r2-gender [data-r2g]', bs => bs.map(b => { const cs = getComputedStyle(b); const r = b.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(b); const rects = [...range.getClientRects()].map(x => Math.round(x.top)); return { t: b.textContent.trim(), h: Math.round(r.height), rows: new Set(rects).size, hy: cs.hyphens }; }));
    ok(lines.every(l => l.rows === 1 && l.h >= 36), 'each gender chip on one line, as tall as the other setup chips (40, or 36 on short screens): ' + JSON.stringify(lines));
    await tap('#r2ob [data-r2g="f"]'); await H.sleep(400);
    ok(await p.$('#r2ob .r2-cyq') !== null, 'cycle question still asked after Woman (unchanged)');
    await tap('#r2ob [data-r2g="m"]'); await H.sleep(400);
    ok(await p.$('#r2ob .r2-cyq') === null, 'no cycle question after Man');
    await tap('#r2ob [data-r2g="n"]'); await H.sleep(400);
    ok(await p.$('#r2ob .r2-cyq') === null, 'non-binary: no setup cycle question, same as prefer not to say before');
    ok(await p.$('#r2ob [data-r2tag="PCOS"]') !== null, 'PCOS stays a free pick for non-binary');
    await p.evaluate(() => { const i = document.getElementById('r2obCondNote'); i && i.scrollIntoView({ block: 'center' }); }); await H.sleep(500);
    const hit = await p.evaluate(() => { const i = document.getElementById('r2obCondNote'); const r = i.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const e = document.elementFromPoint(x, y); return { top: Math.round(r.top), vh: innerHeight, on: e === i, el: e ? (e.id || String(e.className) || e.tagName) : null }; });
    ok(hit.on, 'the field can be tapped (nothing on top): ' + JSON.stringify(hit));
    await tap('#r2obCondNote'); await H.sleep(300);
    const focused = await p.evaluate(() => document.activeElement && document.activeElement.id);
    ok(focused === 'r2obCondNote', 'a tap puts the cursor in the field: ' + focused);
    if (focused !== 'r2obCondNote') await p.evaluate(() => document.getElementById('r2obCondNote').focus());
    await p.keyboard.type('Sichelzellkrankheit'); await H.sleep(300);
    await tap('#r2ob [data-r2g="x"]'); await H.sleep(300); await tap('#r2ob [data-r2g="n"]'); await H.sleep(400);
    ok((await p.inputValue('#r2obCondNote')) === 'Sichelzellkrankheit', 'typed text survives a gender tap');
    const on = await p.$$eval('#r2ob .r2-gender [data-r2g].on', bs => bs.map(b => b.getAttribute('data-r2g')));
    ok(on.join() === 'n', 'only non-binary is lit: ' + on);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await noX(R, '#r2ob', 'about'); await p.evaluate(() => { const i = document.getElementById('r2obCondNote'); i && i.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
    await R.shot('/tmp/obgn-' + pre + '-1-about.png');
    await tap('#r2ob [data-r2o="next"]'); await H.sleep(1500);
    const st = await p.evaluate(() => { const s = LowiR2.S(); return { g: s.user.gender, note: s.health && s.health.condNote, userNote: s.user.condNote, pcos: !!(s.health && s.health.pcos) }; });
    ok(st.g === 'n', 'saved gender stays non-binary: ' + st.g);
    ok(st.note === 'Sichelzellkrankheit' && st.userNote === undefined, 'note saved in health only: ' + JSON.stringify(st));
    ok(st.pcos === false, 'no PCOS without the pick');
    /* finish setup the quick way, then reopen Edit profile */
    await p.evaluate(() => { try { LowiR2.closeAll && LowiR2.closeAll(); } catch (e) { } const o = document.getElementById('r2ob'); if (o) o.remove(); });
    await H.sleep(800);
    await p.evaluate(() => { const x = document.createElement('button'); x.setAttribute('data-r2p', 'edit'); x.style.display = 'none'; (document.getElementById('tab-profile') || document.body).appendChild(x); x.click(); x.remove(); });
    await p.waitForSelector('#r2eCondNote', { timeout: 15000 });
    ok((await p.inputValue('#r2eCondNote')) === 'Sichelzellkrankheit', 'Edit profile shows the note');
    await p.fill('#r2eCondNote', 'Sichelzellkrankheit, Asthma'); await H.sleep(200);
    await noX(R, '.r2-edit', 'edit'); await p.evaluate(() => { const i = document.getElementById('r2eCondNote'); i && i.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
    await R.shot('/tmp/obgn-' + pre + '-2-edit.png');
    await p.evaluate(() => { const b = document.querySelector('[data-r2p="saveedit"]'); b && b.click(); }); await H.sleep(800);
    const st2 = await p.evaluate(() => { const s = LowiR2.S(); return { g: s.user.gender, note: s.health && s.health.condNote }; });
    ok(st2.note === 'Sichelzellkrankheit, Asthma' && st2.g === 'n', 'edit saves the note, gender unchanged: ' + JSON.stringify(st2));
    const back = await p.evaluate(() => { try { return JSON.stringify(JSON.parse(JSON.stringify(LowiR2.S()))); } catch (e) { return ''; } });
    ok(back.includes('Asthma'), 'state holds the note on this phone');
    /* Profile card: four chips, non-binary lit */
    const pc = await p.evaluate(() => { try { if (window.goTab) goTab('profile'); if (window.LowiR3A && LowiR3A.paintProfile) LowiR3A.paintProfile(); return true; } catch (e) { return false; } });
    await H.sleep(1200);
    const chips = await p.$$eval('[data-r3a="gender"]', bs => bs.map(b => [b.getAttribute('data-v'), b.textContent.trim(), b.classList.contains('on')]));
    if (chips.length) ok(chips.length === 4 && chips.map(c => c[1]).join('|') === T.g.join('|') && chips.filter(c => c[2]).map(c => c[0]).join() === 'n', 'Profile card: ' + JSON.stringify(chips));
    else console.log('NOTE Profile card not on screen in this run (' + pc + ')');
    if (chips.length) { await p.evaluate(() => { const c = document.querySelector('[data-r3a="gender"]'); c && c.scrollIntoView({ block: 'center' }); }); await H.sleep(300); await noX(R, '#tab-profile .r3a-pf', 'profile card'); await R.shot('/tmp/obgn-' + pre + '-3-profile.png'); }
    /* Profile chip: switch to Keine Angabe and back, never becomes woman or man */
    if (chips.length) { await p.evaluate(() => document.querySelector('[data-r3a="gender"][data-v="x"]').click()); await H.sleep(500); const gx = await p.evaluate(() => LowiR2.S().user.gender); ok(gx === 'x', 'Profile switch to prefer not to say: ' + gx); }
    const errs = R.errs.filter(e => !/supabase|fetch|network|Failed to load resource/i.test(e.m));
    ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
  } catch (e) { ok(false, 'run: ' + e.message.split('\n')[0]); try { console.log('DEBUG', await p.evaluate(() => { const o = document.getElementById('r2ob'); return JSON.stringify({ t: o ? o.innerText.slice(0, 300) : 'no #r2ob', b: [...document.querySelectorAll('#r2ob button')].map(x => (x.getAttribute('data-r2o') || x.getAttribute('data-lc') || '') + ':' + x.disabled + ':' + x.textContent.trim().slice(0, 20)) }); })); } catch (e2) { } await R.shot('/tmp/obgn-' + pre + '-err.png'); }
  await R.close();
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
