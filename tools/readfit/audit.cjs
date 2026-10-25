'use strict';
/* Oct 25, 2026 (readability + fit): the Playwright readability audit. For every screen x phone size x language x theme it lists
   text that is off the screen, under the notch / home indicator, cut off by a box, hidden behind a small fixed control,
   overlapping other text, or below WCAG AA contrast against the real pixels behind it (a second screenshot with all text made
   transparent gives the background, glass and blur included).

   Serves this worktree at the Pages address with a local fixture user (no network, nothing written anywhere), or the live site
   with LIVE=1 (GET from therealetm.github.io only, Supabase and every other host blocked).

   node tools/readfit/audit.cjs [--engine chromium|webkit] [--sizes se,13,max,android,ipad] [--langs de,en,es] [--themes dark,light]
        [--screens home,fuel,...] [--zoom 1.25] [--out /tmp/readfit/audit] [--shots]
   Exit code 1 when any problem is found (tests/readability-fit-live.cjs runs it). */
const fs = require('fs'), path = require('path');
const core = require('./core.cjs');
const REPO = path.resolve(__dirname, '..', '..');
const BASE = 'https://therealetm.github.io/lowispike/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* CSS size, the safe area the device really has (portrait, home-screen app) */
const SIZES = {
  se: { w: 375, h: 667, inset: { top: 20, bottom: 0 }, name: 'iPhone SE' },
  '13': { w: 390, h: 844, inset: { top: 47, bottom: 34 }, name: 'iPhone 13/14' },
  max: { w: 430, h: 932, inset: { top: 59, bottom: 34 }, name: 'iPhone 15 Pro Max' },
  android: { w: 360, h: 780, inset: { top: 24, bottom: 16 }, name: 'small Android' },
  ipad: { w: 820, h: 1180, inset: { top: 24, bottom: 20 }, name: 'iPad' }
};

const TAP = async (page, sel) => { const l = page.locator(sel).first(); if (!(await l.count())) return false; try { await l.click({ timeout: 4000, force: true }); return true; } catch (e) { return false; } };
const HOLD = async (page, sel, ms) => { const b = await page.locator(sel).first().boundingBox().catch(() => null); if (!b) return false; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await sleep(ms || 900); await page.mouse.up(); return true; };
const EV = (page, fn, arg) => page.evaluate(fn, arg).catch(e => 'ERR ' + e.message.slice(0, 120));
const HOME = async page => { await EV(page, () => { try { document.querySelectorAll('.r2-ov,.ss2-page,.ss2-layer').forEach(e => { try { e.querySelector('[data-close],.r2-x,.ss2-back')?.click(); } catch (x) { } }); } catch (e) { } try { LowiTutorial && LowiTutorial.isOn() && LowiTutorial.stop('audit'); } catch (e) { } try { LowiCart.close(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await page.keyboard.press('Escape').catch(() => { }); await sleep(900); };

/* each screen: how to open it from Home, and the root to audit (optional, default: the whole top layer) */
const SCREENS = {
  home: { open: async p => { await HOME(p); } },
  fuel: { open: async p => { await HOME(p); await TAP(p, '[data-orbit="fuel"]'); } },
  water: { open: async p => { await HOME(p); await TAP(p, '[data-orbit="water"]'); } },
  move: { open: async p => { await HOME(p); await TAP(p, '[data-orbit="move"]'); } },
  gap: { open: async p => { await HOME(p); await TAP(p, '[data-orbit="gap"]'); } },
  sleep: { open: async p => { await HOME(p); await TAP(p, '[data-orbit="sleep"]'); } },
  settings: { open: async p => { await HOME(p); await HOLD(p, '[data-orbit="settings"]', 1000); } },
  cook: { open: async p => { await HOME(p); await EV(p, () => goTab('shelf')); } },
  shop: { open: async p => { await HOME(p); await EV(p, () => LowiCart.open()); } },
  room: { open: async p => { await HOME(p); await EV(p, () => { goTab('foryou'); }); await sleep(1500); await EV(p, () => { try { cmSeg('chat'); LowiRoomsUI.setTab(false); } catch (e) { } }); } },
  chat: { open: async p => { await HOME(p); await EV(p, () => { goTab('foryou'); }); await sleep(1500); await EV(p, () => { try { cmSeg('chat'); LowiRoomsUI.showView('chans'); } catch (e) { } }); } },
  ranking: { open: async p => { await HOME(p); await EV(p, () => { goTab('foryou'); }); await sleep(1500); await EV(p, () => { try { cmSeg('chat'); LowiRoomsUI.showView('rank'); } catch (e) { } }); } },
  foryou: { open: async p => { await HOME(p); await EV(p, () => { goTab('foryou'); }); await sleep(1500); await EV(p, () => { try { cmSeg('chat'); LowiRoomsUI.showView('fy'); } catch (e) { } }); } },
  studio: { open: async p => { await HOME(p); await EV(p, () => { goTab('foryou'); }); await sleep(1500); await EV(p, () => { try { cmSeg('chat'); LowiRoomsUI.showView('studio'); } catch (e) { } }); } },
  profile: { open: async p => { await HOME(p); await EV(p, () => { goTab('foryou'); }); await sleep(1200); await EV(p, () => { try { const me = (JSON.parse(localStorage.getItem('lowi.auth') || '{}').user || {}).id; LowiCommunity.openProfile(me, 'Fixture'); } catch (e) { } }); } },
  people: { open: async p => { await HOME(p); await EV(p, () => { goTab('foryou'); }); await sleep(1200); await EV(p, () => { try { LowiPeopleDir.open(); } catch (e) { } }); } },
  tutorial: { open: async p => { await HOME(p); await EV(p, () => { try { LowiTutorial.start({ from: 'audit' }); } catch (e) { } }); } },
  news: { open: async p => { await HOME(p); await EV(p, () => { try { LowiTutorial.news(); } catch (e) { } }); } }
};

function args() {
  const a = process.argv.slice(2), o = { engine: 'chromium', sizes: Object.keys(SIZES), langs: ['de'], themes: ['dark', 'light'], screens: Object.keys(SCREENS), zoom: 1, out: '/tmp/readfit/audit', shots: false };
  for (let i = 0; i < a.length; i++) {
    const k = a[i].replace(/^--/, ''), v = a[i + 1];
    if (k === 'shots') { o.shots = true; continue; }
    if (k === 'live') { o.live = true; continue; }
    i++;
    if (k === 'engine') o.engine = v; else if (k === 'zoom') o.zoom = +v; else if (k === 'out') o.out = v; else o[k] = v.split(',').filter(Boolean);
  }
  if (process.env.LIVE === '1') o.live = true;
  return o;
}

function seed(lang, theme) {
  const v = fs.readFileSync(path.join(REPO, 'version.json'), 'utf8');
  const newsId = (v.match(/"id":"([^"]+)"/) || [])[1] || '';
  const d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const S = { v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-03-01', avatar: '', tags: ['steady'], gender: 'woman' }, xp: 900, ledger: [], logs: [], settings: { lang, theme }, lang, theme };
  return { 'lowi.daily.seen': day, 'lowi.gate': 'done', 'lowi.news.seen': JSON.stringify([newsId]), 'lowi.g1.bn': newsId, 'lowi.news.toured': newsId,
    'lowi.g1': JSON.stringify({ v: 1, t: 'done', s: 0, n: newsId }), 'lowi.g1.auto': '1', 'lowispike.claimprompt.v1': '{"at":1,"from":"fixture"}', 'lowispike.v2': JSON.stringify(S),
    'lowi.tutorial.done': '1', 'lowi.lang': lang,
    'lowi.auth': JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000f1f1', email: 'fixture@example.invalid', user_metadata: { name: 'Fixture' } } }) };
}

async function launch(pw, o, size, lang, theme) {
  const eng = o.engine;
  const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } : {});
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1, hasTouch: true, isMobile: eng === 'chromium' ? true : undefined, serviceWorkers: 'block', colorScheme: theme === 'light' ? 'light' : 'dark', reducedMotion: 'reduce', locale: lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US', timezoneId: 'Europe/Berlin' });
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
  await ctx.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.protocol === 'data:' || u.protocol === 'blob:') return r.continue();
    if (u.host !== 'therealetm.github.io' || q.method() !== 'GET') return r.abort();
    if (o.live) return r.continue();
    let p = decodeURIComponent(u.pathname.replace(/^\/lowispike\//, '')); if (!p || p.endsWith('/')) p += 'index.html';
    const f = path.join(REPO, p); if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, contentType: TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__rf')) { sessionStorage.setItem('__rf', '1'); sessionStorage.setItem('lowi.a2hs.x', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); } } catch (e) { } }, seed(lang, theme));
  await ctx.addInitScript({ path: path.join(__dirname, 'collect.js') });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
  let insetApplied = false;
  if (eng === 'chromium') { try { const cdp = await ctx.newCDPSession(page); const i = size.inset; await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: i.top, topMax: i.top, bottom: i.bottom, bottomMax: i.bottom, left: 0, leftMax: 0, right: 0, rightMax: 0 } }); insetApplied = true; } catch (e) { } }
  await page.goto(BASE + '?rf=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.goTab === 'function' && document.documentElement.classList.contains('wh-home'), null, { timeout: 90000 }).catch(() => errors.push('HARNESS: app never reached Home'));
  await sleep(+process.env.RF_SETTLE || 5000);
  await EV(page, ([lang, theme]) => { try { LowiR2.applyTheme(theme); } catch (e) { } try { if (window.LowiLang && LowiLang.set) LowiLang.set(lang); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); }, [lang, theme]);
  if (o.zoom && o.zoom !== 1) await EV(page, z => { document.documentElement.style.fontSize = Math.round(z * 100) + '%'; document.documentElement.style.webkitTextSizeAdjust = Math.round(z * 100) + '%'; document.documentElement.classList.add('rf-bigtext'); }, o.zoom);
  return { browser, page, errors, insetApplied };
}

async function auditScreen(page, name, size, insetApplied, o, tag) {
  const sc = SCREENS[name];
  await sc.open(page); await sleep(+process.env.RF_WAIT || 1800);
  const got = await EV(page, root => window.__rfCollect(root), sc.root || '');
  if (typeof got === 'string') return { name, error: got, problems: [] };
  await EV(page, () => window.__rfHide(true)); await sleep(120);
  const buf = await page.screenshot({ type: 'png' });
  await EV(page, () => window.__rfHide(false));
  const img = core.decodePNG(buf);
  /* the safe area is judged at the device's real insets; in WebKit the app cannot see them, so it is judged without */
  const frame = { w: got.frame.w, h: got.frame.h, inset: insetApplied ? size.inset : { top: 0, bottom: 0 } };
  let problems = core.judge(got.items, frame, img, img.w / got.frame.w);
  const byId = {}; got.items.forEach(it => { byId[it.id] = it; }); problems.forEach(p => { p.el = (byId[p.id] || {}).el || ''; });
  if (process.env.RF_DEBUG) got.items.forEach(it => console.log('     · ' + it.el + ' ' + JSON.stringify(it.text.slice(0, 40)) + ' ' + it.fontPx + 'px ' + it.color + ' op' + it.opacity.toFixed(2) + ' @' + [it.rect.x, it.rect.y, it.rect.w, it.rect.h].map(Math.round).join(',')));
  problems = problems.filter(p => !allowed(name, p));
  if (o.shots || problems.length) { fs.mkdirSync(o.out, { recursive: true }); await page.screenshot({ path: path.join(o.out, tag + '-' + name + '.png') }).catch(() => { }); }
  return { name, texts: got.items.length, problems };
}

/* deliberate exceptions, each with its reason. Keep this list short. */
const ALLOW = [
  /* the joystick hint ring and the companion speech bubble animate in and out; judged on their own screen */
];
function allowed(screen, p) { return ALLOW.some(a => (!a.screen || a.screen === screen) && a.kind === p.kind && a.re.test(p.text)); }

async function main() {
  const o = args();
  const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
  const report = { at: new Date().toISOString(), live: !!o.live, engine: o.engine, zoom: o.zoom, runs: [] };
  let total = 0;
  for (const sk of o.sizes) for (const lang of o.langs) for (const theme of o.themes) {
    const size = SIZES[sk]; const tag = [o.engine, sk, lang, theme, o.zoom !== 1 ? 'z' + o.zoom : ''].filter(Boolean).join('-');
    const s = await launch(pw, o, size, lang, theme);
    const run = { tag, size: size.name, lang, theme, insetApplied: s.insetApplied, screens: [] };
    for (const name of o.screens) {
      if (!SCREENS[name]) continue;
      let r; try { r = await auditScreen(s.page, name, size, s.insetApplied, o, tag); } catch (e) { r = { name, error: e.message.slice(0, 200), problems: [] }; }
      run.screens.push(r); total += r.problems.length;
      console.log(tag + ' ' + name + ': ' + (r.error ? 'ERROR ' + r.error : r.texts + ' texts, ' + r.problems.length + ' problems'));
      for (const p of r.problems.slice(0, 12)) console.log('   ' + p.kind + ' ' + p.text + (p.ratio ? ' ' + p.ratio + ':1 (needs ' + p.need + ') ' + p.color + ' op ' + (+p.opacity).toFixed(2) + ' ' + p.fontPx + 'px' : '') + (p.by ? ' by ' + p.by : '') + (p.rect ? ' @' + [p.rect.x, p.rect.y, p.rect.w, p.rect.h].map(Math.round).join(',') : '') + ' [' + p.el + ']');
    }
    run.errors = s.errors.slice(0, 5); report.runs.push(run);
    await s.browser.close();
  }
  fs.mkdirSync(o.out, { recursive: true });
  fs.writeFileSync(path.join(o.out, 'report-' + o.engine + '.json'), JSON.stringify(report, null, 1));
  console.log('TOTAL problems: ' + total);
  process.exit(total ? 1 : 0);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(2); });
module.exports = { SIZES, SCREENS, ALLOW };
