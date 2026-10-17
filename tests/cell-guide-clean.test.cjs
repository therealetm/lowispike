/* Cell guide in the clean flight view (Oct 17, 2026; handoff item 7). E-man: the little cell guide vanished when the menus
   faded while Misty flies, and its speech bubble floated loose and could end up on the Daily Quest. Now the guide stays in the
   clean view, its bubble's tail ends at the guide's rim (full orb and the small sidekick orb), and the bubble keeps clear of the
   Daily Quest band even while that band is faded, on phone portrait, phone landscape and iPad. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../region-pals-core.js');
const CV = require('../clean-view-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('clean flight view never fades the cell guide, but still fades the rest of the HUD', () => {
    const hud = CV.HIDE.find(s => s.startsWith('#whHud >'));
    assert.ok(hud.includes(':not(#rpPal)'), 'the guide lives in #whHud on Home: the HUD rule must skip it');
    for (const k of ['#whPad', '#whPadChip', '#mhNudge']) assert.ok(hud.includes(':not(' + k + ')'), 'unchanged: ' + k);
    assert.ok(CV.KEEP.includes('#rpPal') && CV.KEEP.includes('.rp-say') && CV.KEEP.includes('.rp-body'));
    const bare = CV.HIDE.concat(CV.HIDE_AUTO).join(' ').replace(/:not\([^)]*\)/g, '');
    assert.ok(!/rpPal|\.rp-/.test(bare), 'no fade rule names the guide');
    assert.ok(!/rpPal|\.rp-/.test(CV.css().replace(/:not\([^)]*\)/g, '')));
    /* the menus still fade and still come back with one tap: the rules are untouched */
    let r = CV.step(CV.init(), { type: 'mode', mode: 'auto' });
    assert.strictEqual(r.act, 'hide');
    r = CV.step(r.st, { type: 'tap' });
    assert.strictEqual(r.act, 'show');
    for (const k of ['#f3Board', '#hcLine', '#tabbar', '#spFast']) assert.ok(CV.HIDE.includes(k), 'still fades ' + k);
    /* region-pals.js really builds the guide with that id, inside the HUD on Home */
    const js = read('region-pals.js');
    assert.ok(/el\.id = 'rpPal'/.test(js) && /getElementById\('whHud'\)/.test(js));
    assert.ok(!/lw-clean[^\n]*\.rp-pal|lw-clean[^\n]*#rpPal/.test(read('region-pals.css')), 'no css hides it in the clean view');
});

test('a real speech bubble: the tail ends at the guide\'s rim, for the full guide and the small sidekick', () => {
    const view = { w: 1000, h: 844, top: 6, bottom: 6 }, b = { w: 240, h: 80 }, pal = { x: 500, y: 420 };
    for (const r of [C.ORB_R.full, C.ORB_R.side]) {
        const g = C.gapFor(r);
        const tip = { a: pal.y - C.spotRect('ar', pal, b, view, g).b - 7, b: C.spotRect('br', pal, b, view, g).t - 7 - pal.y,
            sr: C.spotRect('sr', pal, b, view, g).l - 7 - pal.x, sl: pal.x - C.spotRect('sl', pal, b, view, g).r - 7 };
        for (const k of Object.keys(tip)) assert.ok(tip[k] >= r - 1 && tip[k] <= r + 4, 'orb ' + r + ' ' + k + ': tail tip ' + tip[k] + ' px from centre');
    }
    /* the old fixed gaps left a 16-20 px hole between the tail and the small sidekick orb */
    const old = C.spotRect('ar', pal, b, view);
    assert.ok(pal.y - old.b - 7 - C.ORB_R.side >= 16, 'the default gap is still the old one when no gap is passed');
    const css = read('region-pals.css');
    assert.ok(/\.rp-side \.rp-orb \{ inset: 15px;/.test(css) && /\.rp-body \{[^}]*width: 64px;/.test(css) && /\.rp-orb \{[^}]*inset: 4px;/.test(css), 'ORB_R matches the css (64 px button, 4 / 15 px inset)');
});

test('the Daily Quest band: board, crumb line and arrival slot count as one, nothing else does', () => {
    assert.strictEqual(C.questBottom([]), null);
    assert.strictEqual(C.questBottom([{ k: 'tabbar', b: 800 }]), null);
    assert.strictEqual(C.questBottom([{ k: 'f3Board', b: 139 }, { k: 'hcLine', b: 175 }, { k: 'whPad', b: 800 }]), 175);
    assert.strictEqual(C.questBottom([{ k: 'f3Board', b: 139 }, { k: 'hqSlot', b: 220 }]), 220);
    assert.ok(C.QUEST_W > 4, 'covering the Daily Quest costs more than covering Misty (4) or a control (2)');
    assert.ok(/w: C\.QUEST_IDS\.indexOf\(e\.id\) >= 0 \? C\.QUEST_W : 2/.test(read('region-pals.js')));
});

const SCREENS = {
    'iPhone 390x844': { w: 390, h: 844, quest: { l: 60, t: 55, r: 330, b: 139 }, crumbs: 32, misty: [195, 470], pad: { l: 120, t: 690, r: 270, b: 800 } },
    'iPhone SE 375x667': { w: 375, h: 667, quest: { l: 52, t: 48, r: 322, b: 124 }, crumbs: 30, misty: [187, 380], pad: { l: 112, t: 540, r: 262, b: 630 } },
    'iPhone landscape 844x390': { w: 844, h: 390, quest: { l: 200, t: 30, r: 640, b: 100 }, crumbs: 24, misty: [422, 230], pad: { l: 700, t: 250, r: 820, b: 370 } },
    'iPad 820x1180': { w: 820, h: 1180, quest: { l: 230, t: 70, r: 590, b: 170 }, crumbs: 32, misty: [410, 640], pad: { l: 330, t: 990, r: 490, b: 1120 } },
    'iPad landscape 1180x820': { w: 1180, h: 820, quest: { l: 400, t: 50, r: 780, b: 140 }, crumbs: 30, misty: [590, 440], pad: { l: 1000, t: 600, r: 1140, b: 780 } }
};
const pad6 = q => ({ l: q.l - 6, t: q.t - 6, r: q.r + 6, b: q.b + 6 });

test('the bubble never covers the Daily Quest band, its own guide; a clear spot when there is one: phone portrait, landscape and iPad', () => {
    for (const name of Object.keys(SCREENS)) {
        const S = SCREENS[name], view = { w: S.w, h: S.h, top: 6, bottom: 6 };
        const board = Object.assign(pad6(S.quest), { w: C.QUEST_W, k: 'f3Board' });
        const crumbs = Object.assign(pad6({ l: S.quest.l, t: S.quest.b, r: S.quest.r, b: S.quest.b + S.crumbs }), { w: C.QUEST_W, k: 'hcLine' });
        const pad = Object.assign(pad6(S.pad), { w: 2, k: 'whPad' });
        const misty = { l: S.misty[0] - 46, t: S.misty[1] - 46, r: S.misty[0] + 46, b: S.misty[1] + 46, w: 4 };
        const band = { l: board.l, t: board.t, r: board.r, b: C.questBottom([board, crumbs]) };   /* with its 6 px margin */
        const real = { l: S.quest.l, t: S.quest.t, r: S.quest.r, b: S.quest.b + S.crumbs };       /* the board + crumb line themselves */
        const b = S.h < 460 ? { w: 300, h: 64 } : { w: 250, h: 84 };
        for (const side of [false, true]) for (const fx of [0.12, 0.3, 0.5, 0.7, 0.88]) {
            const orb = side ? C.ORB_R.side : C.ORB_R.full;
            /* where region-pals.js keeps a talking guide: below the band by the bubble's height + room (capped at 55 %) */
            const pal = { x: fx * S.w, y: Math.min(0.55, (band.b + 34 + b.h + 12) / S.h) * S.h };
            const self = { l: pal.x - orb - 3, t: pal.y - orb - 3, r: pal.x + orb + 3, b: pal.y + orb + 3, w: 2 };
            const r = C.place(pal, b, [board, crumbs, pad, misty, self], view, null, C.gapFor(orb));
            const at = name + ' x=' + fx + (side ? ' sidekick' : '') + ' ' + JSON.stringify(r);
            assert.strictEqual(C.overlap(r, real), 0, 'Daily Quest covered: ' + at);
            if (S.h >= 460) assert.strictEqual(C.overlap(r, band), 0, 'Daily Quest margin touched: ' + at);
            assert.strictEqual(C.overlap(r, self), 0, 'covers its own guide: ' + at);
            assert.ok(r.l >= 10 && r.r <= S.w - 10 && r.t >= 6 && r.b <= S.h - 6, 'off screen: ' + at);
            /* when some spot is clear of everything, that is where it goes (crowded landscape corners may have none) */
            const clear = q => q.l >= 10 && q.r <= S.w - 10 && q.t >= 6 && q.b <= S.h - 6 && [band, self, pad, misty].every(o => !C.overlap(q, o));
            if (C.SPOTS.some(s => clear(C.spotRect(s, pal, b, view, C.gapFor(orb))))) assert.ok(clear(r), 'a clear spot existed: ' + at);
        }
    }
});

test('wiring: faded Daily Quest still counts, the menus coming back re-places the bubble, the gap follows the orb', () => {
    const js = read('region-pals.js');
    assert.ok(/const FADED_KEEP_CLEAR = '#f3Board, #hcLine\.on:not\(\.hc-away\), #hqSlot\.arr-on, #whPad'/.test(js));
    assert.ok(/if \(!visible\(e\) && !\(cleanOn\(\) && e\.matches && e\.matches\(FADED_KEEP_CLEAR\)\)\) return;/.test(js), 'faded only by the clean view: still kept clear');
    assert.ok(/const cleanOn = \(\) => H\.classList\.contains\('lw-clean'\)/.test(js));
    assert.ok(/const AVOID = '#f3Board, #hcLine\.on, #hqSlot\.arr-on,/.test(js), 'the crumb line and arrival slot under the quest are avoided too');
    assert.ok(/W\.addEventListener\('lowi:clean-view', \(\) => \{ st\.obs = null; if \(st\.el\) \{ obstacles\(\); placeSay\(true\); \} \}\)/.test(js));
    assert.ok(/C\.place\(pal, st\.size, obs, view, force \? null : st\.spot, C\.gapFor\(orb\)\)/.test(js));
    assert.ok(/const orb = st\.side \? C\.ORB_R\.side : C\.ORB_R\.full;/.test(js));
    assert.ok(/const qb = C\.questBottom\(st\.obs\);/.test(js), 'the guide itself stays below the whole band');
    /* clean-view.js still fires the event region-pals listens to, and still never loops while she flies */
    const cv = read('clean-view.js');
    assert.ok(/new CustomEvent\('lowi:clean-view'/.test(cv) && !/requestAnimationFrame/.test(cv));
    /* no new frame loop, no layout read per frame: obstacles stay cached */
    assert.ok(/now - st\.obsT < 600/.test(js) && /now - st\.placeT < 160/.test(js));
});
