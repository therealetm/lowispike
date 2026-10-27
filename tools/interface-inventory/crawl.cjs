'use strict';
/* Interface inventory crawler (27 Oct 2026, Maya 1). Serves this worktree at the Pages URL through ../interface-audit/lib.cjs
   (every other host and every non-GET request is blocked, local fixture user, nothing leaves the throwaway browser).
   Breadth-first: from a root (Home after the news tour), tap every visible control once, record each new surface
   (signature = top surface + heading + active sub-tab), screenshot it, then go back (Escape, close button, or reload + replay).
   Usage: node crawl.cjs <runName> [maxDepth]   env ROOT=json steps, OUT=dir, BUDGET_S=seconds
   Progress is written to OUT/<runName>.json after every new screen, and a rerun resumes from it. */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const RUN = process.argv[2] || 'main', MAXD = +(process.argv[3] || 3);
const OUT = process.env.OUT || '/home/sprite/inv-shots';
const BUDGET = +(process.env.BUDGET_S || 540) * 1000, T0 = Date.now();
const VP = process.env.VP ? JSON.parse(process.env.VP) : { width: 390, height: 844 };
fs.mkdirSync(OUT, { recursive: true });
const STATE = path.join(OUT, RUN + '.json');
const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { screens: [], queue: null, done: [], skipped: [] };
const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 1));
const ROOT = process.env.ROOT ? JSON.parse(process.env.ROOT) : [];
const DANGER = /endg\u00fcltig|jetzt l\u00f6schen|ja,? l\u00f6sch|alles l\u00f6schen|daten l\u00f6schen|ger\u00e4t leeren|delGo|abmelden|sign out|log out|zur\u00fccksetzen|reset|kaufen|bezahlen|checkout|absenden|senden$|^senden|posten|ver\u00f6ffentlichen|teilen|share|install|herunterladen|download|kamera|camera|mikro|diktier|vorlesen|anh\u00f6ren|abspielen|play/i;

const today = L.dayKey();
function seed() {
  const s = L.existingSeed({ lang: 'de', state: { settings: { lang: 'de' }, logs: [
    { id: 'inv-1', eventId: 'inv-1', ts: Date.now() - 5 * 3600e3, day: today, t: 'Haferflocken mit Beeren', lvl: 'low', r: 'ja', e: '\ud83e\udd63', slot: 'breakfast' },
    { id: 'inv-2', eventId: 'inv-2', ts: Date.now() - 2 * 3600e3, day: today, t: 'Linsensalat', lvl: 'low', r: 'ja', e: '\ud83e\udd57', slot: 'lunch' }] } });
  s.kv['lowi.news.build'] = s.build; s.kv['lowi.news.tourbuild'] = s.build;
  s.kv['lowi.tutorial.v1'] = JSON.stringify({ v: 999, at: Date.now(), done: true });
  return s;
}

async function fresh() {
  const h = await L.launch({ viewport: VP, locale: 'de-DE', lang: 'de', seed: process.env.NEWUSER ? null : seed() });
  await h.page.emulateMedia({ colorScheme: 'dark' });
  await L.openApp(h, { settle: 4500, waitReady: !process.env.NEWUSER });
  return h;
}

/* the surface on top: walk up from a few probe points to the nearest big fixed/absolute layer */
async function sig(page) {
  return page.evaluate(() => {
    const W = innerWidth, H = innerHeight;
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W; };
    const pts = [[W / 2, H * .5], [W / 2, H * .3], [W / 2, H * .75], [W * .2, H * .6], [W * .8, H * .4]];
    const cands = new Map();
    for (const [x, y] of pts) {
      let e = document.elementFromPoint(x, y);
      while (e && e !== document.body && e !== document.documentElement) {
        const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        if ((cs.position === 'fixed' || e.matches('dialog,[role=dialog],[aria-modal=true]')) && r.width * r.height > W * H * .18 && !/^tab-/.test(e.id) && e.id !== 'app' && !e.classList.contains('tab')) { cands.set(e, (cands.get(e) || 0) + 1); break; }
        e = e.parentElement;
      }
    }
    let surf = null, best = 0; for (const [e, n] of cands) if (n > best) { best = n; surf = e; }
    const tab = (document.querySelector('section.on[id^="tab-"],.tab.active,[id^="tab-"].active') || {}).id || '';
    const root = surf || document.getElementById(tab) || document.body;
    const key = surf ? ((surf.id ? '#' + surf.id : '') + '.' + String(surf.className && surf.className.baseVal != null ? surf.className.baseVal : surf.className).split(/\s+/).filter(c => c && !/^(on|open|show|in|vis|active|is-|anim)/.test(c)).slice(0, 2).join('.')) : '';
    const hs = [...root.querySelectorAll('h1,h2,h3,[role=heading],[class*=title],[class*=Title],[class*=head] b,legend')].filter(vis).map(e => (e.innerText || '').trim().replace(/\s+/g, ' ')).filter(t => t && t.length < 80);
    const head = [...new Set(hs.map(t => t.replace(/\d+/g, '#')))].slice(0, 3).join(' / ');
    const act = [...root.querySelectorAll('[role=tab][aria-selected=true],[aria-current=page],[aria-current=true],.seg .on,.seg .active,[role=tablist] .on,[role=tablist] .active')].filter(vis).map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)).join('/');
    const txt = (root.innerText || '').replace(/\s+/g, ' ').replace(/\d+/g, '#').slice(0, 160);
    return { s: tab + '|' + key + '|' + head + '|' + act, tab, key, head: hs[0] || '', act, txt, cls: [...document.documentElement.classList].join(' ').slice(0, 200) };
  });
}

/* tappable controls on the current surface, repeated list items collapsed to the first one */
async function ctrls(page) {
  return page.evaluate(() => {
    const W = innerWidth, H = innerHeight;
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05 || s.pointerEvents === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 6 && r.height > 6 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W; };
    const els = [...document.querySelectorAll('button,a[href],[role=button],[role=tab],[role=menuitem],[role=link],[role=option],summary,[onclick],[data-go],[data-tab]')].filter(vis);
    const out = [], seenCls = {};
    els.forEach(e => {
      if (e.matches('input,textarea,select') || e.closest('input,textarea,select')) return;
      if (e.parentElement && e.parentElement.closest('button,a[href],[role=button]') ) return;
      const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(Math.min(W - 1, Math.max(0, cx)), Math.min(H - 1, Math.max(0, cy)));
      if (!hit || !(hit === e || e.contains(hit) || hit.contains(e))) return;
      const href = e.getAttribute('href') || '';
      if (href && /^https?:/.test(href) && !href.includes('therealetm.github.io/lowispike')) return;
      if (/^(mailto|tel|sms):/.test(href)) return;
      const cls = String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className).split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      const name = (e.getAttribute('aria-label') || e.getAttribute('title') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const k = e.tagName + '.' + cls + '|' + (e.parentElement ? e.parentElement.className : '');
      seenCls[k] = (seenCls[k] || 0) + 1;
      out.push({ k, name, tag: e.tagName.toLowerCase(), id: e.id || '', cls, x: Math.round(cx), y: Math.round(cy) });
    });
    const used = {};
    return out.filter(c => { if (!c.cls || seenCls[c.k] < 5 || c.id) return true; used[c.k] = (used[c.k] || 0) + 1; return used[c.k] <= 2; });
  });
}

async function doStep(page, step) {
  if (step.kind === 'eval') { await page.evaluate(step.js); await L.sleep(step.wait || 1500); return true; }
  if (step.kind === 'scroll') { await page.evaluate(y => { const els = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY)); const top = els.sort((a, b) => b.getBoundingClientRect().width * b.clientHeight - a.getBoundingClientRect().width * a.clientHeight)[0]; (top || document.scrollingElement).scrollBy(0, y); }, step.y || 600); await L.sleep(700); return true; }
  const cs = await ctrls(page);
  let m = cs.filter(c => c.name === step.name && c.cls === step.cls && c.id === step.id);
  if (!m.length) m = cs.filter(c => c.name === step.name && (c.id === step.id || c.cls === step.cls));
  if (!m.length && step.id) m = cs.filter(c => c.id === step.id);
  if (!m.length) m = cs.filter(c => c.name && c.name === step.name);
  let x, y;
  if (m.length) { x = m[0].x; y = m[0].y; } else if (step.sel) { const b = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, step.sel); if (!b) return false; [x, y] = b; } else return false;
  if (step.kind === 'hold') { await page.mouse.move(x, y); await page.mouse.down(); await L.sleep(step.ms || 900); await page.mouse.up(); }
  else await page.touchscreen.tap(x, y);
  await L.sleep(step.wait || 1400);
  return true;
}

async function replay(h, steps) {
  for (const s of steps) { if (!await doStep(h.page, s)) return false; }
  return true;
}

const known = new Set(st.screens.map(s => s.sig));
const doneP = new Set(st.done);
let shotN = st.screens.length;
async function record(h, steps, sg, via) {
  if (known.has(sg.s)) return null;
  known.add(sg.s);
  const id = RUN + '-' + String(++shotN).padStart(3, '0');
  try { await h.page.screenshot({ path: path.join(OUT, id + '.jpg'), type: 'jpeg', quality: 72, timeout: 60000 }); } catch (e) { try { await L.sleep(3000); await h.page.screenshot({ path: path.join(OUT, id + '.jpg'), type: 'jpeg', quality: 72, timeout: 90000 }); } catch (e2) { console.log('SHOTFAIL', id); } }
  const rec = { id, sig: sg.s, tab: sg.tab, key: sg.key, head: sg.head, act: sg.act, txt: sg.txt, steps, via, depth: steps.length, errors: h.errors.slice(-3) };
  st.screens.push(rec); save();
  console.log('NEW', id, steps.length, JSON.stringify(sg.s).slice(0, 140), '<=', via);
  return rec;
}

const CLOSE = /^(schlie\u00dfen|zur\u00fcck|close|back|fertig|abbrechen|sp\u00e4ter|nicht jetzt|\u00d7|\u2715|x|ok|verstanden|weiter so|alles klar)$/i;
async function goBack(h, parentSig) {
  await h.page.keyboard.press('Escape'); await L.sleep(900);
  if ((await sig(h.page)).s === parentSig) return true;
  const cs = await ctrls(h.page);
  for (const c of cs.filter(c => CLOSE.test(c.name) || /schlie\u00dfen|zur\u00fcck|close/i.test(c.name)).slice(0, 3)) {
    await h.page.touchscreen.tap(c.x, c.y); await L.sleep(1000);
    if ((await sig(h.page)).s === parentSig) return true;
  }
  return false;
}

(async () => {
  if (!st.queue) st.queue = [ROOT];
  let h = await fresh(), reloads = 0;
  // the root itself (and the news tour on the way)
  const s0 = await sig(h.page); await record(h, [], s0, 'start');
  if (!ROOT.length && await L.tap(h.page, '.lt-skipall')) { await L.sleep(1500); }
  while (st.queue.length && Date.now() - T0 < BUDGET) {
    const steps = st.queue.shift(); const pk = JSON.stringify(steps);
    if (doneP.has(pk)) continue;
    try {
    // load parent
    await h.browser.close().catch(() => { }); h = await fresh(); reloads++;
    if (!ROOT.length) { await L.tap(h.page, '.lt-skipall'); await L.sleep(1200); }
    if (!await replay(h, steps)) { st.skipped.push({ steps, why: 'replay failed' }); doneP.add(pk); st.done.push(pk); save(); continue; }
    const ps = await sig(h.page); await record(h, steps, ps, 'parent');
    if (steps.length >= MAXD) { doneP.add(pk); st.done.push(pk); save(); continue; }
    let cs = await ctrls(h.page);
    // also what is below the fold of the main scroller
    const more = await h.page.evaluate(() => { const els = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 120 && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.getBoundingClientRect().height > 300); return els.length; });
    const list = cs.slice(0, 45);
    for (let i = 0; i < list.length && Date.now() - T0 < BUDGET; i++) {
      const c = list[i];
      if (DANGER.test(c.name) || DANGER.test(c.id) || DANGER.test(c.cls)) { st.skipped.push({ steps, c: c.name, why: 'unsafe/side effect' }); continue; }
      const step = { kind: 'tap', name: c.name, cls: c.cls, id: c.id, tag: c.tag };
      const ok = await doStep(h.page, step);
      if (!ok) continue;
      const s1 = await sig(h.page);
      if (s1.s !== ps.s) {
        const r = await record(h, steps.concat([step]), s1, c.name);
        if (r) st.queue.push(steps.concat([step]));
        if (!await goBack(h, ps.s)) {
          await h.browser.close().catch(() => { }); h = await fresh(); reloads++;
          if (!ROOT.length) { await L.tap(h.page, '.lt-skipall'); await L.sleep(1200); }
          if (!await replay(h, steps) || (await sig(h.page)).s !== ps.s) { st.skipped.push({ steps, why: 'could not return after ' + c.name }); break; }
        }
      }
    }
    if (more) st.queue.push(steps.concat([{ kind: 'scroll', y: 700 }]).length <= MAXD + 1 && !steps.some(s => s.kind === 'scroll') ? steps.concat([{ kind: 'scroll', y: 700 }]) : null), st.queue = st.queue.filter(Boolean);
    doneP.add(pk); st.done.push(pk); save();
    } catch (e) { console.log('PARENTFAIL', pk.slice(0, 200), String(e.message).slice(0, 200)); st.skipped.push({ steps, why: 'error ' + String(e.message).slice(0, 100) }); doneP.add(pk); st.done.push(pk); save(); try { await h.browser.close(); } catch (e2) { } h = await fresh(); }
  }
  save();
  console.log('END screens', st.screens.length, 'queue', st.queue.length, 'reloads', reloads, 's', Math.round((Date.now() - T0) / 1000));
  await h.browser.close().catch(() => { });
})().catch(e => { console.error('FATAL', e); save(); process.exit(1); });
