/* Controller on autopilot inside a world (Oct 17, 2026). Emmanuel: the controller (#whPad + #whPadChip) is "supposed to fade out
   when you are in auto mode". Inside a place she flew into, misty-pad.css forces the controller back on (mf-in.wh-away) so you can
   keep steering; that rule must never apply on autopilot with the clean flight view on (lw-clean-auto), so the controller fades
   completely there, independent of selector specificity. Steering (lw-clean without -auto) and the tapped-back menus keep it. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const CV = require('../clean-view-core.js');
const css = fs.readFileSync(path.join(__dirname, '..', 'misty-pad.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/* every rule in misty-pad.css that turns the controller or its chip back ON (opacity 1 or pointer-events auto with !important) */
function forcingRules() {
    const out = [];
    const re = /([^{}]+)\{([^{}]*)\}/g; let m;
    while ((m = re.exec(css))) {
        const body = m[2];
        if (!/(opacity:\s*1\s*!important|pointer-events:\s*auto\s*!important)/.test(body)) continue;
        for (const sel of m[1].split(',').map(s => s.trim()).filter(Boolean))
            if (/\.wh-pad(-chip)?\b/.test(sel) && /^html/.test(sel)) out.push(sel);
    }
    return out;
}

/* a selector can match a given html class list (only the html compound matters here) */
function htmlMatches(sel, classes) {
    const head = sel.split(/\s+/)[0];
    const has = classes.split(/\s+/);
    for (const c of (head.replace(/:not\([^)]*\)/g, '').match(/\.[\w-]+/g) || [])) if (!has.includes(c.slice(1))) return false;
    for (const n of head.match(/:not\(([^)]*)\)/g) || []) {
        const inner = n.slice(5, -1);
        if ((inner.match(/\.[\w-]+/g) || []).every(c => has.includes(c.slice(1)))) return false;
    }
    return true;
}

test('the in-world "keep steering" rule exists and is the one that forces the controller on', () => {
    const f = forcingRules();
    assert.ok(f.some(s => s.includes('.mf-in') && s.includes('.wh-away')), 'in-world controller rule found: ' + f.join(' | '));
});

test('on autopilot with the clean view, no rule turns the controller back on, in a world or out', () => {
    for (const cls of ['wh-home wh-away mf-in lw-clean lw-clean-auto', 'wh-home wh-away mf-in wh-r2-on lw-clean lw-clean-auto', 'wh-home lw-clean lw-clean-auto'])
        for (const s of forcingRules()) assert.ok(!htmlMatches(s, cls), 'forces the controller on during autopilot (' + cls + '): ' + s);
    assert.deepEqual(CV.HIDE_AUTO, ['#whPad', '#whPadChip'], 'the clean view still fades the controller and its chip on autopilot');
    assert.ok(CV.css().includes('html.lw-clean.lw-clean-auto #whPad') && CV.css().includes('html.lw-clean.lw-clean-auto #whPadChip'));
});

test('manual steering in a world keeps the controller touchable', () => {
    const keep = forcingRules().filter(s => s.includes('.mf-in') && s.includes('.wh-away'));
    for (const cls of ['wh-home wh-away mf-in lw-clean', 'wh-home wh-away mf-in'])
        assert.ok(keep.some(s => htmlMatches(s, cls)), 'controller stays while steering / with the menus tapped back: ' + cls);
    let r = CV.step(CV.init(), { type: 'mode', mode: 'auto' });
    r = CV.step(r.st, { type: 'steer' });
    assert.equal(r.st.view, 'drive', 'steering leaves the autopilot view, so lw-clean-auto comes off');
    assert.ok(CV.padLive(r.st), 'the controller is live while you steer');
});

test('the controller is never hidden by the in-world menu rule', () => {
    const bare = CV.worldCss().replace(/:not\([^)]*\)/g, '');
    assert.ok(!bare.includes('#whPad'), 'world rule leaves the controller to the autopilot/steering rules');
});
