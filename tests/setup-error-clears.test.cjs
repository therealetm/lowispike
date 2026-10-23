'use strict';
/* Code error sweep Oct 23 2026, bug queue BQ-1 (from the 11:02 bug hunt):
   in setup, the error under the form ("Check your birthday." / "Add your name.") stayed on screen after the person
   corrected the birthday or name, until Next was tapped again. paintOb() now clears #r2obErr on every edit of the
   name or birthday (input, and change for iOS date pickers). Runs the real paintOb() listener code in a tiny DOM. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function listenerBlock() {
    const i = html.indexOf('function paintOb(){');
    assert.ok(i > 0, 'paintOb exists');
    const body = html.slice(i, html.indexOf('\nfunction saveOb(', i));
    const j = body.indexOf("el.innerHTML = '<div class=\"r2-obpane\">' + h + '</div>';");
    assert.ok(j > 0, 'paintOb writes the pane');
    return body.slice(body.indexOf('\n', j) + 1, body.lastIndexOf('}'));
}

function fakeEl(extra) {
    const ls = {};
    const cls = new Set();
    return Object.assign({
        value: '', textContent: '', innerHTML: '',
        classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) },
        addEventListener: (t, f) => { (ls[t] = ls[t] || []).push(f); },
        fire: t => (ls[t] || []).forEach(f => f({})),
        has: t => !!(ls[t] && ls[t].length)
    }, extra || {});
}

function run() {
    const els = { '#r2obB': fakeEl(), '#r2obName': fakeEl(), '#r2obT': fakeEl(), '#r2obErr': fakeEl(), '#r2obSign': fakeEl() };
    const ob = { bday: '', name: '', btime: '' };
    const ctx = { $: s => els[s] || null, ob, signReveal: () => 'sign' };
    vm.runInNewContext('(function(){' + listenerBlock() + '})()', ctx);
    return { els, ob };
}

test('correcting the birthday clears the old error', () => {
    const { els, ob } = run();
    els['#r2obErr'].textContent = 'Check your birthday.'; els['#r2obErr'].classList.add('shake');
    els['#r2obB'].value = '1990-08-01'; els['#r2obB'].fire('input');
    assert.equal(ob.bday, '1990-08-01');
    assert.equal(els['#r2obErr'].textContent, '', 'error gone after the birthday changed');
    assert.equal(els['#r2obErr'].classList.contains('shake'), false);
    assert.equal(els['#r2obSign'].innerHTML, 'sign', 'the sign preview still updates');
});

test('an iOS date picker that only sends change also clears it', () => {
    const { els, ob } = run();
    assert.ok(els['#r2obB'].has('change'), 'birthday listens to change too');
    els['#r2obErr'].textContent = 'Add your birthday to go on.';
    els['#r2obB'].value = '1985-02-10'; els['#r2obB'].fire('change');
    assert.equal(ob.bday, '1985-02-10');
    assert.equal(els['#r2obErr'].textContent, '');
});

test('typing the name clears "Add your name."', () => {
    const { els, ob } = run();
    els['#r2obErr'].textContent = 'Add your name.';
    els['#r2obName'].value = ' Zoë '; els['#r2obName'].fire('input');
    assert.equal(ob.name, 'Zoë');
    assert.equal(els['#r2obErr'].textContent, '');
});

test('the Next check still shows the error for a bad birthday', () => {
    assert.ok(html.includes('if (ag == null || ag < 1 || ag > 119) return bad("Check your birthday.", b);'));
});
