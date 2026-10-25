/* 25 Oct 2026 (Emmanuel: "For the people who don't know their personality type, did you add a link for them to go do the personality type test?").
   The real app on a local server (outside requests aborted, service worker blocked). For EN/DE/ES, dark and day mode, iPhone 13 (390x844)
   and a small phone (375x667): setup's birthday step asks the type (optional) and links the free test in the app language while none is
   picked; picking one hides the link and Next saves it to Profile; the profile editor's type picker links the test only while no type is set;
   the own Community card has the link plus the 10 minute note; another member's card has neither. Every link and note: inside the screen,
   a 44px+ tap row, and WCAG AA contrast measured against the pixels behind it.
   Usage: node tests/personality-test-link-live.cjs [chromium|webkit] [http://base-url/ (default: local server of this checkout)] */
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const pw = require('/tmp/pw/node_modules/playwright');
const ROOT = path.join(__dirname, '..'), ENGINE = process.argv[2] || 'chromium', BASE = process.argv[3] || '', SHOTS = process.env.SHOTS || '/tmp/ptest-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const TEST = { en: 'https://www.16personalities.com/free-personality-test', de: 'https://www.16personalities.com/de/kostenloser-personlichkeitstest', es: 'https://www.16personalities.com/es/test-de-personalidad' };
const NOTE = { en: /About 10 minutes/, de: /etwa 10 Minuten/, es: /Unos 10 minutos/ };
const UID = '00000000-0000-4000-8000-00000000c0d0';
/* WCAG 2.x contrast against the real pixels behind the text (text made transparent for the screenshot) */
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }, lum = p => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
function decodePNG(buf) { let pos = 8, w = 0, h = 0, type = 0; const idat = []; while (pos < buf.length) { const len = buf.readUInt32BE(pos), kind = buf.toString('ascii', pos + 4, pos + 8), d = buf.subarray(pos + 8, pos + 8 + len); if (kind === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; } else if (kind === 'IDAT') idat.push(d); else if (kind === 'IEND') break; pos += 12 + len; }
  const bpp = type === 6 ? 4 : 3, st = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 3); let prev = Buffer.alloc(st), cur = Buffer.alloc(st);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], line = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1)); for (let i = 0; i < st; i++) { const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i]; if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); } cur[i] = v & 255; }
    for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) out[(y * w + x) * 3 + k] = cur[x * bpp + k]; const t = prev; prev = cur; cur = t; }
  return { w, h, px: out }; }
(async () => {
  let base = BASE; if (!base) { await new Promise(r => srv.listen(0, r)); base = 'http://localhost:' + srv.address().port + '/'; }
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw[ENGINE].launch();
  const devFor = (w, h) => ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13'], { viewport: { width: w, height: h } }) : { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const open = async (lang, ui, w, h, user) => {
    const ctx = await browser.newContext(Object.assign({}, devFor(w, h), { serviceWorkers: 'block' }));
    await ctx.route(u => !String(u).startsWith(base), r => r.abort());
    await ctx.addInitScript(([UID, lang, user, ui]) => { try {
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.theme', ui);
      localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
      localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, seen: 99, skipped: true }));
      if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 900, ledger: [], lang, user })); }
    } catch (e) {} }, [UID, lang, user || { name: 'eman', bday: '1990-03-01' }, ui]);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto(base + 'index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(6500);
    try { await page.waitForFunction(() => !document.documentElement.classList.contains('gate-up'), null, { timeout: 30000 }); } catch (e) { console.log('info the sign-in gate is still up: ' + await page.evaluate(() => (localStorage.getItem('lowi.auth') || 'no auth').slice(0, 120) + ' | ' + ((document.querySelector('#r2gate') || {}).innerText || '').slice(0, 120).replace(/\n/g, ' '))); }
    ok(await page.evaluate(ui => document.documentElement.getAttribute('data-theme') === ui, ui), lang + ' ' + ui + ' mode is on');
    await page.evaluate(() => { const rows = [{ uid: 'aaaaaaaa-0000-4000-8000-0000000000d1', n: 'Antje', bday: '0004-12-24', s: 'Capricorn', t: '', lv: 6, xp: 2400 }]; window.LOWI_CLOUD.people = () => rows.slice(); });
    return { ctx, page, errs };
  };
  /* one link/note: inside the screen, a real tap row, AA contrast against what is behind it */
  const checkEl = async (page, sel, label, W) => {
    await page.evaluate(sel => { const e = [...document.querySelectorAll(sel)].filter(x => x.getClientRects().length).pop(); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
    await page.waitForTimeout(450);
    const m = await page.evaluate(sel => { const e = [...document.querySelectorAll(sel)].filter(x => x.getClientRects().length).pop(); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      let op = 1; for (let n = e; n && n !== document.documentElement; n = n.parentElement) op *= +getComputedStyle(n).opacity;
      const c = cs.color.match(/[\d.]+/g).map(Number); return { x: r.x, y: r.y, w: r.width, h: r.height, fg: [c[0], c[1], c[2], (c[3] == null ? 1 : c[3]) * op], vw: innerWidth, vh: innerHeight, font: parseFloat(cs.fontSize), text: e.innerText.trim() }; }, sel);
    if (!m) { ok(false, label + ': not on screen'); return null; }
    ok(m.x >= 0 && m.x + m.w <= m.vw + 0.5 && m.y >= 0 && m.y + m.h <= m.vh + 0.5, label + ': inside the screen ' + JSON.stringify({ x: Math.round(m.x), y: Math.round(m.y), w: Math.round(m.w), h: Math.round(m.h) }));
    await page.evaluate(sel => { const e = [...document.querySelectorAll(sel)].filter(x => x.getClientRects().length).pop(); e.dataset.ptHide = e.getAttribute('style') || ''; e.style.setProperty('color', 'transparent', 'important'); e.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); e.style.setProperty('text-decoration-color', 'transparent', 'important'); }, sel);
    await page.waitForTimeout(150);
    Object.assign(m, await page.evaluate(sel => { const e = [...document.querySelectorAll(sel)].filter(x => x.getClientRects().length).pop(), r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel));
    const img = decodePNG(await page.screenshot({ type: 'png' })), scale = img.w / m.vw;
    await page.evaluate(sel => { const e = [...document.querySelectorAll(sel)].filter(x => x.getClientRects().length).pop(); e.setAttribute('style', e.dataset.ptHide); delete e.dataset.ptHide; }, sel);
    const rs = []; const x0 = Math.floor(m.x * scale), y0 = Math.floor(m.y * scale), x1 = Math.min(img.w, Math.ceil((m.x + m.w) * scale)), y1 = Math.min(img.h, Math.ceil((m.y + m.h) * scale));
    for (let y = y0; y < y1; y += Math.max(1, Math.floor((y1 - y0) / 8))) for (let x = x0; x < x1; x += Math.max(1, Math.floor((x1 - x0) / 24))) { const i = (y * img.w + x) * 3, bg = [img.px[i], img.px[i + 1], img.px[i + 2]]; rs.push(ratio(over(m.fg, bg), bg)); }
    rs.sort((a, b) => a - b); const worst = rs[Math.floor(rs.length * 0.2)];
    ok(worst >= 4.5, label + ': contrast ' + worst.toFixed(2) + ':1 (AA 4.5)');
    return m;
  };
  for (const [lang, ui, W, H] of [['en', 'dark', 390, 844], ['de', 'light', 390, 844], ['es', 'dark', 375, 667], ['de', 'dark', 375, 667], ['en', 'light', 390, 844]].slice(0, +process.env.ONLY || 9)) {
    const tag = lang + '/' + ui + '/' + W + 'x' + H;
    const { ctx, page, errs } = await open(lang, ui, W, H);
    /* setup, birthday step */
    await page.evaluate(() => { const s = LowiR2.S(); s.setupDone = false; s.setupMid = 0; LowiR2.onboard(); });
    await page.waitForTimeout(1200);
    console.log('info setup copies: ' + await page.evaluate(() => document.querySelectorAll('#r2obType').length + ' / overlays ' + [...document.querySelectorAll('#r2ob')].map(o => o.getClientRects().length).join(',') + ' ' + (() => { let n = document.querySelector('#r2obType'), hid = []; while (n && n !== document.documentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility !== 'visible' || +c.opacity < 0.1 || c.contentVisibility === 'hidden') hid.push((n.id || n.className) + '|' + c.display + '|' + c.visibility + '|' + c.opacity); n = n.parentElement; } return hid.join(' ; ') + ' html:' + document.documentElement.className + ' body:' + document.body.className; })()));
    const st = await page.evaluate(() => { const s = document.querySelector('#r2obType'), a = document.querySelector('#r2obTest [data-ps-test]'); return { opts: s ? s.options.length : 0, first: s ? s.options[0].text : '', label: s ? s.closest('label').querySelector('span').innerText : '', href: a ? a.href : '', tgt: a ? a.target : '', rel: a ? a.rel : '', h: a ? a.getBoundingClientRect().height : 0, note: (document.querySelector('#r2obTest .ps-test-note') || {}).innerText || '' }; });
    ok(st.opts === 17, tag + ' setup: type picker with "' + st.first + '" + the 16 types, label "' + st.label + '"');
    ok(st.href === TEST[lang] && st.tgt === '_blank' && /noopener/.test(st.rel), tag + ' setup: free test link in the app language opens in the browser ' + st.href);
    ok(st.h >= 44 && NOTE[lang].test(st.note), tag + ' setup: 44px+ tap row (' + Math.round(st.h) + ') and the note "' + st.note + '"');
    await checkEl(page, '#r2obTest .ps-test', tag + ' setup link', W); await checkEl(page, '#r2obTest .ps-test-note', tag + ' setup note', W);
    await page.screenshot({ path: SHOTS + '/' + ENGINE + '-' + tag.replace(/\//g, '-') + '-1-setup.png' });
    await page.selectOption('#r2obType', 'ENFP'); await page.waitForTimeout(250);
    ok(await page.evaluate(() => !document.querySelector('#r2obTest [data-ps-test]')), tag + ' setup: picking a type hides the link');
    await page.selectOption('#r2obType', ''); await page.waitForTimeout(250);
    ok(await page.evaluate(() => !!document.querySelector('#r2obTest [data-ps-test]')), tag + ' setup: back to "not sure" shows it again');
    await page.selectOption('#r2obType', 'ENFP');
    const nextVis = await page.evaluate(() => { const b = document.querySelector('[data-r2o="next"]'); b.scrollIntoView({ block: 'end' }); const r = b.getBoundingClientRect(); return r.bottom <= innerHeight + 0.5 && r.top >= 0; });
    ok(nextVis, tag + ' setup: Next is still reachable on this screen');
    await page.evaluate(() => document.querySelector('[data-r2o="next"]').click()); await page.waitForTimeout(900);
    const saved = await page.evaluate(() => ({ r5: LowiFood.state().mbti, user: LowiR2.S().user.mbti, pub: LowiProfileShare.publicRow(LowiR2.S().user, LowiFood.state().mbti).mbti }));
    ok(saved.r5 === 'ENFP' && saved.user === 'ENFP' && saved.pub === 'ENFP', tag + ' setup: Next saves the type to Profile and the card ' + JSON.stringify(saved));
    await page.evaluate(() => { try { LowiR2.close(); } catch (e) {} const s = LowiR2.S(); s.setupDone = true; LowiR2.save(); }); await page.waitForTimeout(500);
    /* profile editor: with a type -> no link; remove it -> link */
    const pick = () => page.evaluate(() => { const t = document.createElement('button'); t.setAttribute('data-r5', 'mbti-pick'); t.style.display = 'none'; document.body.appendChild(t); t.click(); t.remove(); });
    await pick(); await page.waitForTimeout(900);
    ok(await page.evaluate(() => !!document.querySelector('.r5-mbgrid') && ![...document.querySelectorAll('[data-ps-test]')].some(a => a.getClientRects().length)), tag + ' editor: with a type set, no test link');
    await page.evaluate(() => { LowiFood.state().mbti = ''; LowiHerbIdentity.setType(''); try { LowiR2.close(); } catch (e) {} try { closeSheet(); } catch (e) {} }); await page.waitForTimeout(600);
    await pick(); await page.waitForTimeout(900);
    const ed = await page.evaluate(() => { const a = [...document.querySelectorAll('[data-ps-test]')].filter(a => a.getClientRects().length).pop(); return a ? { href: a.href, tgt: a.target, h: a.getBoundingClientRect().height, grid: !!document.querySelector('.r5-mbgrid'), old: /16-type test/.test(document.body.innerText) } : null; });
    ok(ed && ed.grid && ed.href === TEST[lang] && ed.tgt === '_blank' && ed.h >= 44 && !ed.old, tag + ' editor: no type -> the 16 types plus the free test link ' + JSON.stringify(ed));
    await checkEl(page, '.sheet [data-ps-test], .sheetbody [data-ps-test]', tag + ' editor link', W); await checkEl(page, '.sheetbody .ps-test-note', tag + ' editor note', W);
    await page.screenshot({ path: SHOTS + '/' + ENGINE + '-' + tag.replace(/\//g, '-') + '-2-editor.png' });
    await page.evaluate(() => { try { closeSheet(); } catch (e) {} try { LowiR2.close(); } catch (e) {} }); await page.waitForTimeout(600);
    /* own card and someone else's */

    const me = await page.evaluate(() => LOWI_CLOUD_X.state().uid);
    await page.evaluate(id => LowiCommunity.openProfile(id, 'eman'), me); await page.waitForTimeout(1000);
    const own = await page.evaluate(() => { const a = [...document.querySelectorAll('[data-ps-test]')].filter(a => a.getClientRects().length).pop(), n = [...document.querySelectorAll('.cp-typeacts .ps-test-note')].filter(a => a.getClientRects().length).pop(); return { href: a ? a.href : '', note: n ? n.innerText : '' }; });
    ok(own.href === TEST[lang] && NOTE[lang].test(own.note), tag + ' own card: link in the app language and "' + own.note + '"');
    await checkEl(page, '.cp-typeacts .ps-test-note', tag + ' own card note', W);
    await page.screenshot({ path: SHOTS + '/' + ENGINE + '-' + tag.replace(/\//g, '-') + '-3-own.png' });
    await page.evaluate(() => { try { LowiR2.close(); } catch (e) {} }); await page.waitForTimeout(500);
    await page.evaluate(() => LowiCommunity.openProfile('aaaaaaaa-0000-4000-8000-0000000000d1', 'Antje')); await page.waitForTimeout(1000);
    const other = await page.evaluate(() => { const sh = [...document.querySelectorAll('.cs-sheet')].filter(s => s.getClientRects().length).pop() || document.body;
      return { sheets: document.querySelectorAll('.cs-sheet').length, els: [...sh.querySelectorAll('[data-ps-test], .ps-test-note')].filter(a => a.getClientRects().length).map(a => a.outerHTML.slice(0, 90)), txt: sh.innerText.slice(0, 200).replace(/\n/g, ' | '),
        link: [...sh.querySelectorAll('[data-ps-test], .ps-test-note')].some(a => a.getClientRects().length), none: /None yet|Noch keiner|Aún no/.test(sh.innerText), antje: /^\s*Antje/.test(sh.innerText) }; });
    ok(other.antje && !other.link && other.none, tag + ' someone else\'s card: "None yet" only, no link or note'); if (!other.none || other.link || !other.antje) console.log('info ' + JSON.stringify(other));
    ok(errs.length === 0, tag + ' no page errors ' + JSON.stringify(errs));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED' : 'all ok'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
