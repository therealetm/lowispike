/* Composer + room bar fit probe (21 Oct 2026, Eman: camera/mic cover "Write to the galaxy", day/night button covers
   the word "room"). Opens Community on small and large iPhones and prints the boxes of the composer controls and the
   room bar, plus any overlap between them. Usage: node tools/regress/p-composer-fit.cjs [outdir] [url] */
'use strict';
const path = require('path'), fs = require('fs');
const H = require('./harness.cjs');
const out = path.resolve(process.argv[2] || path.join(__dirname, 'out', 'composer-fit'));
const url = process.argv[3] || '';
fs.mkdirSync(out, { recursive: true });
const DEVICES = (process.env.DEVICES || 'iPhone SE,iPhone 13,iPhone 14 Pro Max').split(',');
(async () => {
    let bad = 0;
    for (const device of DEVICES) {
        const R = await H.open({ engine: 'webkit', device, url, members: 12, messages: 40 });
        try {
            await R.goto();
            await R.page.evaluate(() => window.goTab && goTab('foryou'));
            await R.page.waitForFunction(() => { const i = document.getElementById('cmInput'); return i && i.getBoundingClientRect().width > 20; }, null, { timeout: 30000 }).catch(() => console.log(device, 'composer never showed'));
            await H.sleep(7000);
            if (process.env.TYPE) { await R.page.locator('#cmInput').fill('Write to the galaxy and some more words'); await H.sleep(800); }
            if (process.env.THREAD) { await R.page.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await H.sleep(800); await R.page.locator('.rm-ch[data-ch="galaxy"]').click({ force: true }).catch(() => { }); await H.sleep(2000); } /* Chat tab = channel list since 21 Oct; the galaxy channel is the thread */
            const res = await R.page.evaluate(() => {
                const box = el => { if (!el) return null; const r = el.getBoundingClientRect(), s = getComputedStyle(el); if (r.width < 1 || r.height < 1 || s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return null; return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; };
                const hit = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
                const q = s => document.querySelector(s);
                /* text box of the placeholder: the textarea minus its own padding */
                const inp = q('#cmInput'); let text = null;
                if (inp) { const b = box(inp), s = getComputedStyle(inp); if (b) text = { l: b.l + parseFloat(s.paddingLeft), t: b.t + parseFloat(s.paddingTop), r: b.r - parseFloat(s.paddingRight), b: b.b - parseFloat(s.paddingBottom) }; }
                const ctl = { photo: box(q('#cmPhoto')), mic: box(q('#cmMic')), send: box(q('#cmSend') || q('.cm-inrow .cm-send') || q('.cm-inrow button[data-chat="send"]')) };
                const overlaps = [];
                for (const [k, v] of Object.entries(ctl)) if (hit(v, text)) overlaps.push('composer: ' + k + ' over input text');
                const field = box(inp);
                for (const k of ['photo', 'mic', 'send']) if (ctl[k] && field && ctl[k].l < field.r) overlaps.push('composer: ' + k + ' not right of the field');
                for (const k of ['photo', 'mic', 'send']) if (ctl[k] && (ctl[k].r > innerWidth || ctl[k].r - ctl[k].l < 44)) overlaps.push('composer: ' + k + ' off screen or under 44 px');
                /* the room bar: tabs and room chip must be clear of the floating Day/Night switch and profile picture */
                const floats = [['tbTheme', box(q('#tbTheme'))], ['pfBtn', box(q('#pfBtn'))]];
                const bar = [...document.querySelectorAll('#cmPaneChat .rm-tab,#cmPaneChat .rm-chip')].map(e => [e.textContent.trim(), box(e)]);
                for (const [n, b] of bar) for (const [f, fb] of floats) if (hit(b, fb)) overlaps.push('room bar: ' + f + ' over "' + n + '"');
                /* everything visible in the top area of the screen that sits over the room title text */
                const title = q('#cpTitle'); const tb = box(title);
                const topEls = [...document.querySelectorAll('button,[role=button],img,.tb-av,[class*=avatar],[class*=daynight],[class*=dn-],[data-dn]')].map(e => ({ e, b: box(e) })).filter(o => o.b && o.b.t < 200 && !o.e.contains(title) && !(title && title.contains(o.e)));
                for (const o of topEls) if (hit(o.b, tb)) overlaps.push('room bar: ' + (o.e.id || o.e.className || o.e.tagName).toString().slice(0, 60) + ' over title "' + (title.textContent || '').trim() + '"');
                return { vw: innerWidth, vh: innerHeight, text, field, ctl, floats, bar, title: tb && Object.assign({ txt: (title.textContent || '').trim() }, tb), sub: box(q('#cpSub')), controls: box(q('#csControls')), placeholder: inp && inp.placeholder, overlaps,
                    top: topEls.slice(0, 14).map(o => [(o.e.id || String(o.e.className)).slice(0, 40), o.b]) };
            });
            bad += res.overlaps.length;
            console.log(device, JSON.stringify(res));
            await R.shot(path.join(out, device.replace(/\s+/g, '') + '.png'));
            if (R.errs.length) console.log(device, 'errors', JSON.stringify(R.errs.slice(0, 3)));
        } finally { await R.close(); }
    }
    console.log(bad ? 'OVERLAPS: ' + bad : 'NO OVERLAPS');
    process.exit(bad ? 1 : 0);
})();
