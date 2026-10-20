'use strict';
/* Interface audit harness (20 Oct 2026). Serves this worktree's files at the Pages URL, blocks every other host and every
   non-GET request (production Supabase included), seeds a local fixture user and never writes anywhere but the throwaway browser.
   Playwright from /tmp/pw (1.64.x). Not a physical iPhone: WebKit in a VM with a software renderer. */
const fs = require('fs'), path = require('path');
const pw = require('/tmp/pw/node_modules/playwright');
const REPO = path.resolve(__dirname, '..', '..'), BASE = 'https://therealetm.github.io/lowispike/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.cjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm' };

function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/* existing user, set up, signed in locally (fake token, no network), news already seen for the current build */
function existingSeed(o) {
  o = o || {};
  const build = fs.readFileSync(path.join(REPO, 'version.json'), 'utf8').match(/"build":"([^"]+)"/)[1];
  const newsId = (fs.readFileSync(path.join(REPO, 'version.json'), 'utf8').match(/"id":"([^"]+)"/) || [])[1] || '';
  const S = Object.assign({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: o.lang || 'en' } }, o.state || {});
  const kv = Object.assign({
    'lowi.daily.seen': dayKey(), 'lowi.gate': 'done',
    'lowi.news.seen': JSON.stringify([newsId]), 'lowi.g1.bn': newsId, 'lowi.news.toured': newsId,
    'lowi.g1': JSON.stringify({ v: 1, t: 'done', s: 0, n: newsId }), 'lowi.g1.auto': '1',
    'lowispike.claimprompt.v1': '{"at":1,"from":"fixture"}',
    'lowispike.v2': JSON.stringify(S)
  }, o.kv || {});
  if (o.signedIn !== false) kv['lowi.auth'] = JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } });
  return { kv, session: { 'lowi.a2hs.x': '1' }, build };
}

async function launch(o) {
  o = o || {};
  const eng = o.engine || 'webkit';
  const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } : {});
  const dev = o.device ? Object.assign({}, pw.devices[o.device]) : Object.assign({}, pw.devices['iPhone 13']);
  if (o.viewport) dev.viewport = o.viewport;
  const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block', locale: o.locale || 'en-US', reducedMotion: o.reducedMotion ? 'reduce' : 'no-preference', timezoneId: 'Europe/Berlin' }));
  const blocked = {}; let offline = false;
  await ctx.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.protocol === 'data:' || u.protocol === 'blob:') return r.continue();
    if (u.host !== 'therealetm.github.io' || q.method() !== 'GET' || offline) { const k = u.host + ' ' + q.method(); blocked[k] = (blocked[k] || 0) + 1; return r.abort(); }
    let p = decodeURIComponent(u.pathname.replace(/^\/lowispike\//, '')); if (!p || p.endsWith('/')) p += 'index.html';
    const f = path.join(REPO, p); if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, contentType: TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  if (o.seed !== null) {
    const seed = o.seed || existingSeed(o);
    await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__ia')) { sessionStorage.setItem('__ia', '1'); Object.keys(s.kv).forEach(k => localStorage.setItem(k, s.kv[k])); Object.keys(s.session || {}).forEach(k => sessionStorage.setItem(k, s.session[k])); } } catch (e) { } }, seed);
  }
  const page = await ctx.newPage();
  const errors = [], consoleErr = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error') consoleErr.push(m.text().slice(0, 200)); });
  return { browser, ctx, page, errors, consoleErr, blocked, setOffline: v => { offline = v; return ctx.setOffline(v); } };
}

async function openApp(h, o) {
  o = o || {};
  await h.page.goto(BASE + (o.query || '') , { waitUntil: 'load', timeout: 120000 });
  if (o.waitReady !== false) await h.page.waitForFunction(() => typeof window.goTab === 'function' && document.documentElement.classList.contains('wh-home'), null, { timeout: 90000 }).catch(() => h.errors.push('HARNESS: app never reached Home'));
  await sleep(o.settle || 5000);
}

/* what is on top right now: visible dialogs/sheets/panels, the active tab, html classes of interest */
async function top(page) {
  return page.evaluate(() => {
    const vis = e => { if (!e || !e.isConnected) return false; const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < innerHeight; };
    const sel = '[role=dialog],[aria-modal=true],.r2-ov,.ss2-page,.ss2-layer,#sheetwrap.on,#sheetwrap.open,dialog[open],.sheet.open,.lh-sheet,.tut-card,[class*="-sheet"][class*="open"],[class*="sheet"].on';
    const list = [...document.querySelectorAll(sel)].filter(vis).map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), id: e.id || '', cls: String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className).slice(0, 80), label: (e.getAttribute('aria-label') || (e.querySelector('h1,h2,h3,[class*=title]') || {}).innerText || '').slice(0, 60).replace(/\s+/g, ' '), z: getComputedStyle(e).zIndex, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; });
    const tab = (document.querySelector('.tab.active,[id^="tab-"].active,section.on[id^="tab-"]') || {}).id || '';
    const cls = [...document.documentElement.classList].filter(c => /home|away|sheet|open|menubar|tut|modal|sp-|wh-|o8|ss2/.test(c)).join(' ');
    const ae = document.activeElement; const focus = ae && ae !== document.body ? (ae.tagName.toLowerCase() + (ae.id ? '#' + ae.id : '') + '.' + String(ae.className || '').split(' ')[0] + ' "' + (ae.getAttribute('aria-label') || ae.innerText || '').slice(0, 40).replace(/\s+/g, ' ') + '"') : 'body';
    return { layers: list, tab, cls, focus };
  });
}

/* buttons/links/inputs that are visible: accessible name, size, whether something covers its centre */
async function controls(page, scope) {
  return page.evaluate(scope => {
    const root = scope ? document.querySelector(scope) : document; if (!root) return [];
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const els = [...root.querySelectorAll('button,a[href],[role=button],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(vis);
    return els.map(e => { const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, cx)), Math.min(innerHeight - 1, Math.max(0, cy))); const name = (e.getAttribute('aria-label') || e.getAttribute('title') || (e.labels && e.labels[0] && e.labels[0].innerText) || e.innerText || e.getAttribute('placeholder') || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 50); return { tag: e.tagName.toLowerCase(), id: e.id, cls: String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className).split(' ').slice(0, 2).join('.'), name, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top), covered: !!(hit && hit !== e && !e.contains(hit) && !hit.contains(e)), coveredBy: hit && hit !== e && !e.contains(hit) ? (hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + '.' + String(hit.className && hit.className.baseVal != null ? hit.className.baseVal : hit.className).split(' ')[0]) : '' }; });
  }, scope || null);
}

async function shot(page, name) { const d = '/home/sprite/ia-shots'; fs.mkdirSync(d, { recursive: true }); const f = path.join(d, name + '.png'); await page.screenshot({ path: f }); return f; }

/* a finger tap at the centre of the first visible match (Home bubbles breathe, so Playwright's 'stable' wait never settles) */
async function tap(page, sel, o) {
  const box = await page.evaluate(sel => { for (const e of document.querySelectorAll(sel)) { const r = e.getBoundingClientRect(), s = getComputedStyle(e); if (r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none') return [r.left + r.width / 2, r.top + r.height / 2]; } return null; }, sel);
  if (!box) return false;
  if (o && o.mouse) await page.mouse.click(box[0], box[1]); else await page.touchscreen.tap(box[0], box[1]);
  return true;
}
module.exports = { tap, pw, REPO, BASE, sleep, dayKey, existingSeed, launch, openApp, top, controls, shot };
