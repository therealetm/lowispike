/* Feedback behaviour check (simulated Chromium, iPhone size, Nov 5 2026). Real app from this folder, a fake signed-in cloud client
   (records uploads and the inserted row) and a synthetic microphone (an oscillator), so nothing leaves the machine.
   Checks: Settings rows (owner / not owner), 8 screenshots added + reordered, recording while swiping the screenshots (the
   recorder keeps running and the viewer is not rebuilt), send uploads every file under one folder and inserts the row, anonymous
   sends no device, the owner inbox: select all, Transcribe selected, Copy, Download package (zip names), Mark done; Day look; reduced
   motion. Usage: node tools/feedback/flow.cjs [outdir]   (screenshots go to outdir, default /tmp/fbk-shots) */
'use strict';
const H = require('../sim/harness.cjs'), fs = require('fs'), path = require('path');
const OUT = process.argv[2] || '/tmp/fbk-shots';
fs.mkdirSync(OUT, { recursive: true });
const ok = [], bad = [];
const check = (c, m) => { (c ? ok : bad).push(m); console.log((c ? 'ok   ' : 'FAIL ') + m); };

/* a PNG screenshot with a number on it, made in the page */
const FAKE = () => {
    const log = window.__fb = { uploads: [], inserts: [], updates: [], invokes: [], signed: 0 };
    const rows = [];
    const mk = (i, o) => Object.assign({ id: (0x1a2b3c00 + i).toString(16) + '-1111-4222-8333-' + String(i).padStart(12, '0'), created_at: new Date(Date.now() - i * 3600e3).toISOString(), anonymous: false, name: 'Tester ' + i, user_id: 'u' + i, message: 'Idea number ' + i, voice_path: i % 2 ? null : 'fb/key' + String(i).padStart(6, '0') + 'ab/voice.m4a', voice_secs: 20 + i, shots: Array.from({ length: i % 4 }, (_, k) => 'fb/key' + String(i).padStart(6, '0') + 'ab/shot-' + (k + 1) + '.jpg'), transcript: null, status: 'new', lang: 'de', app_version: 'sim' }, o || {});
    for (let i = 0; i < 12; i++) rows.push(mk(i, i === 3 ? { anonymous: true, name: null, user_id: null } : null));
    const q = (tbl) => {
        const b = {
            _f: null,
            select() { return b; }, order() { return b; }, limit() { return Promise.resolve({ data: window.__fbOwner ? rows.slice() : [], error: null }); },
            insert(r) { log.inserts.push(r); return Promise.resolve({ data: null, error: null }); },
            update(v) { b._u = v; return b; },
            in(col, ids) { log.updates.push({ v: b._u, ids }); rows.forEach(r => { if (ids.includes(r.id)) Object.assign(r, b._u); }); return Promise.resolve({ error: null }); }
        };
        return b;
    };
    const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const client = {
        from: q,
        storage: { from: () => ({
            upload: (p, blob, o) => new Promise(r => setTimeout(() => { log.uploads.push({ p, size: blob.size, type: o.contentType }); r({ data: { path: p }, error: null }); }, 30)),
            createSignedUrls: (paths) => { log.signed += paths.length; return Promise.resolve({ data: paths.map(p => ({ path: p, signedUrl: /voice/.test(p) ? 'data:audio/mp4;base64,AAAA' : PNG1 })) }); }
        }) },
        functions: { invoke: (n, o) => { log.invokes.push(o.body.id); return new Promise(r => setTimeout(() => r({ data: { transcript: 'Transcribed ' + o.body.id.slice(0, 8) }, error: null }), 50)); } }
    };
    window.LOWI_CLOUD_X = { state: () => ({ uid: 'u-sim', live: true }), client: async () => client };
    /* synthetic microphone */
    navigator.mediaDevices.getUserMedia = async () => { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.frequency.value = 440; o.connect(d); o.start(); window.__mic = ac; return d.stream; };
};

(async () => {
    const R = await H.open({ engine: 'chromium', lang: 'en', viewport: { width: 390, height: 844 }, members: 3, messages: 4 });
    const P = R.page, ev = (f, a) => P.evaluate(f, a), sleep = H.sleep;
    try {
        await R.goto(); await sleep(1500);
        await ev(() => { try { LowiLang.set('en'); } catch (e) { } });
        await ev(FAKE);
        await ev(() => { document.querySelectorAll('.r2-ov').forEach(o => o.remove()); });

        /* Settings rows */
        const SS = await ev(() => { const S = window.LowiHomeSettingsSleepV2; window.__fbOwner = false; return { fb: S.has('feedback'), inbox: S.has('feedbackInbox'), label: S.label('feedback') }; });
        check(SS.fb && SS.label === 'Send feedback', 'Settings has "Send feedback" for everyone');
        check(!SS.inbox, 'Feedback inbox row hidden for a non-owner');
        const hub = await ev(() => { const M = window.LowiCommunityMe; if (!M || !M.open) return null; M.open(); const t = [...document.querySelectorAll('[data-cme]')].map(b => b.getAttribute('data-cme')); return t; });
        check(hub && hub.includes('feedback') && !hub.includes('feedbackInbox'), 'Community Settings page lists Send feedback (no inbox for non-owner): ' + (hub || []).filter(x => /tutorial|feedback|support|about/.test(x)).join(','));
        await R.shot(path.join(OUT, '01-settings-page.png'));
        await ev(() => { const b = document.querySelector('[data-cme="feedback"]'); b.scrollIntoView({ block: 'center' }); });
        await sleep(300);
        await R.shot(path.join(OUT, '01b-settings-row.png'));
        await ev(() => document.querySelector('[data-cme="feedback"]').click());
        await sleep(900);
        check(await ev(() => !!document.querySelector('.fbk-send') && !(window.LowiCommunityMe && window.LowiCommunityMe.isOpen && window.LowiCommunityMe.isOpen())), 'tapping the row closes Settings and opens the feedback sheet in front');
        await R.shot(path.join(OUT, '02-send-empty.png'));
        const first = await ev(() => { const r = document.querySelector('.fbk-rec').getBoundingClientRect(); return { h: r.height, send: document.querySelector('[data-fbk="send"]').disabled }; });
        check(first.h >= 64 && first.send, 'big voice button (' + Math.round(first.h) + ' px tall), Send disabled while empty');

        /* 8 screenshots */
        const files = [];
        for (let i = 1; i <= 8; i++) {
            const b64 = await ev(i => { const c = document.createElement('canvas'); c.width = 1170; c.height = 2532; const g = c.getContext('2d'); g.fillStyle = 'hsl(' + i * 40 + ',60%,40%)'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = 'bold 600px sans-serif'; g.fillText(String(i), 350, 1500); return c.toDataURL('image/png').split(',')[1]; }, i);
            files.push({ name: 'shot' + i + '.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
        }
        await P.setInputFiles('#fbkFile', files);
        await P.waitForFunction(() => document.querySelectorAll('.fbk-slide').length === 8, null, { timeout: 60000 }).catch(() => { });
        const n = await ev(() => ({ slides: document.querySelectorAll('.fbk-slide').length, thumbs: document.querySelectorAll('.fbk-th').length, sizes: window.LowiFeedback._S.shots.map(s => s.blob.size), type: window.LowiFeedback._S.shots[0].blob.type }));
        check(n.slides === 8 && n.thumbs === 8, '8 screenshots added: big viewer + strip');
        check(n.type === 'image/jpeg' && Math.max(...n.sizes) < 900000, 'screenshots shrunk to JPEG (largest ' + Math.round(Math.max(...n.sizes) / 1024) + ' KB)');
        /* reorder: move #1 right */
        check(await ev(() => window.LowiFeedback._S.cur === 7 && /8 of 8/.test(document.querySelector('.fbk-ctl-n').textContent)), 'after adding, the newest screenshot is in view (8 of 8)');
        await ev(() => document.querySelector('.fbk-th[data-i="0"]').click());
        await sleep(600);
        const before = await ev(() => window.LowiFeedback._S.shots.map(s => s.url));
        await ev(() => document.querySelector('.fbk-ctl [data-fbk="right"]').click());
        const after = await ev(() => window.LowiFeedback._S.shots.map(s => s.url));
        check(after[0] === before[1] && after[1] === before[0], 'move right swaps screenshot 1 and 2');
        const cur = await ev(() => ({ cur: window.LowiFeedback._S.cur, n: document.querySelector('.fbk-ctl-n').textContent }));
        check(cur.cur === 1 && /2 of 8/.test(cur.n), 'the moved screenshot stays in view (' + cur.n + ')');
        await ev(() => document.querySelector('.fbk-ctl [data-fbk="left"]').click());
        const back = await ev(() => window.LowiFeedback._S.shots.map(s => s.url));
        check(back[0] === before[0] && back[1] === before[1], 'move left puts it back');
        await ev(() => { document.querySelector('.fbk-view').scrollLeft = 0; });
        await sleep(300);
        await R.shot(path.join(OUT, '03-send-8-shots.png'));

        /* record and swipe */
        await ev(() => { window.__view = document.querySelector('.fbk-view'); document.querySelector('[data-fbk="rec"]').click(); });
        await sleep(1200);
        const rec = await ev(() => ({ on: !!window.LowiFeedback._S.rec, state: window.LowiFeedback._S.rec && window.LowiFeedback._S.rec.mr.state, addOff: [...document.querySelectorAll('[data-fbk="add"]')].every(b => b.disabled), sendOff: document.querySelector('[data-fbk="send"]').disabled }));
        check(rec.on && rec.state === 'recording', 'recording started (synthetic mic)');
        check(rec.addOff && rec.sendOff, 'while recording: add-screenshot and Send are paused');
        const micOff = await ev(() => { const m = document.querySelector('.fbk-ov .mic-btn'); return !m || getComputedStyle(m).pointerEvents === 'none'; });
        check(micOff, 'while recording: the text box dictation mic is paused (one microphone at a time)');
        const vb = await P.locator('.fbk-view').boundingBox();
        const seen = [];
        for (let k = 0; k < 7; k++) {
            await P.mouse.move(vb.x + vb.width * 0.85, vb.y + vb.height / 2);
            await P.evaluate(() => { const v = document.querySelector('.fbk-view'); v.scrollBy({ left: v.clientWidth, behavior: 'instant' }); });
            await sleep(250);
            seen.push(await ev(() => window.LowiFeedback._S.cur));
        }
        await R.shot(path.join(OUT, '04-recording-swiping.png'));
        await sleep(800);
        const mid = await ev(() => ({ same: window.__view === document.querySelector('.fbk-view'), state: window.LowiFeedback._S.rec && window.LowiFeedback._S.rec.mr.state, chunks: window.LowiFeedback._S.rec && window.LowiFeedback._S.rec.chunks.length, time: document.querySelector('.fbk-time').textContent, on: document.querySelector('.fbk-th.on b').textContent }));
        check(seen[seen.length - 1] === 7 && mid.on === '8', 'swiped through all 8 screenshots while recording (positions ' + seen.join(',') + ')');
        check(mid.same && mid.state === 'recording' && mid.chunks >= 2, 'recorder kept running and the viewer was never rebuilt (' + mid.time + ', ' + mid.chunks + ' chunks)');
        const closeTry = await ev(() => { window.LowiFeedback.close(); return { still: !!document.querySelector('.fbk-send'), msg: document.querySelector('.fbk-status').textContent }; });
        check(closeTry.still && /Stop the recording/.test(closeTry.msg), 'closing while recording asks to stop first');
        await ev(() => document.querySelector('[data-fbk="stop"]').click());
        await sleep(800);
        const v = await ev(() => { const x = window.LowiFeedback._S.voice; return x && { size: x.blob.size, type: x.type, secs: x.secs, player: !!document.querySelector('.fbk-voicebox audio') }; });
        check(v && v.size > 1000 && v.secs >= 4 && v.player, 'voice note kept with a player (' + (v && v.type) + ', ' + (v && v.secs) + ' s, ' + (v && Math.round(v.size / 1024)) + ' KB)');
        await ev(() => { document.querySelector('#fbkText').value = 'The camera button should say it scans food too'; document.querySelector('#fbkText').dispatchEvent(new Event('input', { bubbles: true })); });
        await R.shot(path.join(OUT, '05-ready-to-send.png'));
        await ev(() => document.querySelector('[data-fbk="send"]').click());
        await P.waitForFunction(() => !!document.querySelector('.fbk-thanks'), null, { timeout: 15000 }).catch(() => { });
        const sent = await ev(() => window.__fb);
        const folder = sent.uploads.length && sent.uploads[0].p.split('/')[1];
        const row = sent.inserts[0] || {};
        check(sent.uploads.length === 9 && sent.uploads.every(u => u.p.split('/')[1] === folder), '9 files uploaded into one submission folder');
        check(JSON.stringify(row.shots) === JSON.stringify(sent.uploads.filter(u => /shot/.test(u.p)).map(u => u.p)) && /voice\.(m4a|webm|ogg)$/.test(row.voice_path || ''), 'row links the 8 screenshots in order and the voice note');
        check(row.anonymous === false && !!row.device && !('name' in row) && /camera button/.test(row.message), 'named row: text and device, name left to the server');
        check(await ev(() => !!document.querySelector('.fbk-thanks')), 'thank-you screen shown');
        await R.shot(path.join(OUT, '06-thanks.png'));
        await ev(() => document.querySelector('.fbk-thanks [data-fbk="done"]').click());

        /* anonymous text-only */
        await ev(() => { window.LowiFeedback.open(); document.querySelector('#fbkText').value = 'anon idea'; document.querySelector('#fbkText').dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#fbkAnon').checked = true; });
        await R.shot(path.join(OUT, '07-anonymous.png'));
        await ev(() => document.querySelector('[data-fbk="send"]').click());
        await sleep(800);
        const an = await ev(() => window.__fb.inserts[1]);
        check(an && an.anonymous === true && an.device === null, 'anonymous row carries no device');
        await ev(() => window.LowiFeedback.close());

        /* owner inbox */
        await ev(() => { window.__fbOwner = true; window.LowiOwnerAdmin = Object.assign({}, window.LowiOwnerAdmin, { isOwner: () => true }); });
        check(await ev(() => window.LowiHomeSettingsSleepV2.has('feedbackInbox')), 'Feedback inbox row shows for the owner');
        await ev(() => window.LowiHomeSettingsSleepV2.run('feedbackInbox'));
        await P.waitForFunction(() => document.querySelectorAll('.fbk-card').length > 0, null, { timeout: 10000 }).catch(() => { });
        const ib = await ev(() => ({ cards: document.querySelectorAll('.fbk-card').length, anon: [...document.querySelectorAll('.fbk-card .fbk-meta b')].map(b => b.textContent).filter(t => /Without name/.test(t)).length, refs: [...document.querySelectorAll('.fbk-meta small')].slice(0, 2).map(s => s.textContent), audio: document.querySelectorAll('.fbk-card audio').length, thumbs: document.querySelectorAll('.fbk-tn img').length }));
        check(ib.cards === 12 && ib.anon === 1, 'inbox lists 12 submissions, the anonymous one as "Without name"');
        check(/^FB-1A2B3C00/.test(ib.refs[0]), 'each card shows its stable reference (' + ib.refs[0] + ')');
        check(ib.audio === 6 && ib.thumbs > 0, 'voice players and screenshot thumbnails shown (' + ib.audio + ' players, ' + ib.thumbs + ' thumbnails)');
        await R.shot(path.join(OUT, '08-inbox.png'));
        await ev(() => { const a = document.querySelector('#fbkAll'); a.checked = true; a.dispatchEvent(new Event('change', { bubbles: true })); });
        const sel = await ev(() => document.querySelector('.fbk-count').textContent);
        check(/12 selected/.test(sel), 'Select all picks all 12');
        await ev(() => document.querySelector('[data-fbk="trsel"]').click());
        await P.waitForFunction(() => /transcribed/.test((document.querySelector('.fbk-ov .fbk-status') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => { });
        const tr = await ev(() => ({ calls: window.__fb.invokes.length, msg: document.querySelector('.fbk-ov .fbk-status').textContent, shown: document.querySelectorAll('.fbk-tr').length }));
        check(tr.calls === 6 && tr.shown === 6 && /6 of 6 transcribed/.test(tr.msg), 'Transcribe selected: one call per untranscribed voice note, all 6 shown (' + tr.msg + ')');
        await ev(() => { const a = document.querySelector('#fbkAll'); a.checked = true; a.dispatchEvent(new Event('change', { bubbles: true })); });
        await P.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => { });
        await ev(() => document.querySelector('[data-fbk="copysel"]').click());
        await sleep(500);
        const clip = await ev(async () => { try { return await navigator.clipboard.readText(); } catch (e) { return 'ERR ' + e.message; } });
        check((clip.match(/^--- FB-/gm) || []).length === 12 && /Transcribed 1a2b3c00/.test(clip), 'Copy selected puts all 12 entries with transcripts on the clipboard');
        /* package: catch the download */
        const dl = P.waitForEvent('download', { timeout: 15000 }).catch(() => null);
        await ev(() => document.querySelector('[data-fbk="pkg"]').click());
        const d = await dl;
        if (d) {
            const f = path.join(OUT, 'package.zip'); await d.saveAs(f);
            const r = require('child_process').spawnSync('python3', ['-c', 'import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);n=z.namelist();print(z.testzip());print(len(n));[print(x) for x in n];j=json.loads(z.read("feedback.json"));print(j["count"], j["feedback"][3]["from"], j["feedback"][3]["user_id"])', f], { encoding: 'utf8' });
            console.log(r.stdout);
            const lines = r.stdout.trim().split('\n');
            check(lines[0] === 'None' && +lines[1] === 2 + 18 + 6, 'package zip opens: feedback.txt, feedback.json, 18 screenshots and 6 voice notes (' + lines[1] + ' files)');
            check(/^12 Without name None$/.test(lines[lines.length - 1]), 'feedback.json: 12 entries, anonymous one has no user id');
            check(lines.some(l => /FB-1A2B3C02_Tester-2\/screenshot-01\.jpg/.test(l)), 'folders named by date + FB reference + sender');
        } else check(false, 'package download happened');
        await ev(() => { const a = document.querySelector('#fbkAll'); a.checked = true; a.dispatchEvent(new Event('change', { bubbles: true })); });
        await ev(() => document.querySelector('.fbk-ibar [data-fbk="done"]').click());
        await sleep(400);
        const dn = await ev(() => ({ cards: document.querySelectorAll('.fbk-card').length, empty: (document.querySelector('.fbk-list').textContent || '').trim(), upd: window.__fb.updates.length }));
        check(dn.cards === 0 && /No new feedback/.test(dn.empty) && dn.upd === 1, 'Mark done empties the New view in one update');
        await ev(() => document.querySelector('[data-fbk="fall"]').click());
        await R.shot(path.join(OUT, '09-inbox-all-done.png'));
        await ev(() => window.LowiFeedback.close());

        /* Day look + reduced motion */
        await ev(() => { document.documentElement.setAttribute('data-theme', 'light'); window.LowiFeedback.open(); });
        await sleep(400);
        const day = await ev(() => { const p = getComputedStyle(document.querySelector('.fbk-panel')); return { bg: p.backgroundColor, fg: p.color }; });
        check(/250, 249, 246/.test(day.bg) && /28, 28, 30/.test(day.fg), 'Day look: light panel, dark text (' + day.bg + ' / ' + day.fg + ')');
        await R.shot(path.join(OUT, '10-day.png'));
        await ev(() => { window.LowiFeedback._S.shots = []; window.LowiFeedback.close(); document.documentElement.setAttribute('data-theme', 'dark'); });
        await P.emulateMedia({ reducedMotion: 'reduce' });
        await ev(() => window.LowiFeedback.open());
        const rm = await ev(() => getComputedStyle(document.querySelector('.fbk-panel')).animationName);
        check(rm === 'none', 'Reduce Motion: no slide-in animation');
        const night = await ev(() => getComputedStyle(document.querySelector('.fbk-panel')).backgroundColor);
        check(!/(\d+), (\d+), (\d+)/.exec(night) || (() => { const m = /(\d+), (\d+), (\d+)/.exec(night); return +m[3] - +m[1] <= 4; })(), 'dark panel is neutral, not navy (' + night + ')');
        const taps = await ev(() => [...document.querySelectorAll('.fbk-ov button, .fbk-ov label.fbk-anon, .fbk-ov .fbk-th')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return { k: (b.getAttribute('data-fbk') || b.className), m: Math.round(Math.min(r.width, r.height)) }; }));
        const small = taps.filter(x => x.m < 44 && !/mic-btn/.test(x.k)); /* mic-btn: the app-wide dictation mic, its own size rules */
        check(!small.length, 'every button in the empty sheet is at least 44 px' + (small.length ? ': ' + JSON.stringify(small) : ''));
        await ev(() => window.LowiFeedback.close());
        check(!R.errs.length, 'no page errors (' + R.errs.length + ')' + (R.errs.length ? ' ' + JSON.stringify(R.errs.slice(0, 3)) : ''));
    } catch (e) { check(false, 'flow threw: ' + (e && e.stack || e)); }
    await R.close();
    console.log('\n' + ok.length + ' ok, ' + bad.length + ' failed');
    process.exit(bad.length ? 1 : 0);
})();
