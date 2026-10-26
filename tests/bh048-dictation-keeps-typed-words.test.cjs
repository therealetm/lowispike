'use strict';
/* BH-048 (bug hunt run 48, Oct 26 2026), pattern P-STALE-BASE: dictation rebuilt the field from the text it held when the mic
   was tapped, on every result and again when listening ended.
   - Words typed while the mic listened vanished ("milk" + typed " and butter" + spoken "two eggs" -> "milk two eggs").
   - Words typed before the first spoken word vanished when listening ended with nothing heard.
   - Text the app cleared meanwhile (chat Send, a search reset) came back when the last words arrived.
   Seen on the live site (build 20261026-191635) with a simulated SpeechRecognition in Chrome (probe-mic-typed.cjs).
   These run the real startNative / insert / caret from mic-dictate.js and the real merge / tidy from mic-dictate-core.js in a
   sandbox, so they fail on the old code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const Core = require(path.join(root, 'mic-dictate-core.js'));

function cut(src, name) {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) throw new Error('missing ' + name);
    let j = src.indexOf('{', src.indexOf(')', i)), depth = 0;
    for (; j < src.length; j++) { const ch = src[j]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth) return src.slice(i, j + 1); } }
    throw new Error('unbalanced ' + name);
}

function sandbox() {
    const src = read('mic-dictate.js');
    const el = {
        value: '', maxLength: -1, selectionStart: 0, selectionEnd: 0, isConnected: true, events: [],
        setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
        dispatchEvent(e) { this.events.push(e.type); },
        getBoundingClientRect: () => ({ width: 300, height: 44 }), checkVisibility: () => true
    };
    const ctx = {
        Math, Date, el, C: Core, Event: function (t) { this.type = t; },
        D: { hidden: false, activeElement: el }, appleTouch: false, nativeBroken: false, session: null, navigator: { onLine: true },
        getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
        setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 1, clearInterval: () => { }
    };
    vm.createContext(ctx);
    vm.runInContext(`var last=null, hints=[];
      function SR(){ last=this; this.start=function(){}; this.abort=function(){ this.onend&&this.onend(); }; this.stop=function(){ this.onend&&this.onend(); }; }
      function lang(){return 'en';} function setState(){} function hint(k){ if(k) hints.push(k); } function markBroken(){} function refreshAll(){} function useKeyboard(){}
      function say(t, fin){ var r=[{transcript:t}]; r.isFinal=!!fin; last.onresult({resultIndex:0, results:[r]}); }
      function type(s){ var a=el.selectionStart, b=el.selectionEnd; el.value=el.value.slice(0,a)+s+el.value.slice(b); el.selectionStart=el.selectionEnd=a+s.length; }
      ` + cut(src, 'insert') + '\n' + cut(src, 'caret') + '\n' + cut(src, 'shownField') + '\n' + cut(src, 'startNative'), ctx);
    const run = code => vm.runInContext(code, ctx);
    return { el, run, start: () => run('startNative({el:el, ta:false});') };
}

test('words typed while the mic listens are kept, and the spoken words stay', () => {
    const s = sandbox();
    s.run("type('milk');");
    s.start();
    s.run("say('two eggs', false);");
    assert.equal(s.el.value, 'milk two eggs');
    s.run("el.selectionStart=el.selectionEnd=el.value.length; type(' and butter');");
    s.run("say('two eggs', true); last.onend();");
    assert.equal(s.el.value, 'milk two eggs and butter');
});

test('words typed before the first spoken word are kept when listening ends with nothing heard', () => {
    const s = sandbox();
    s.start();
    s.run("type('salt'); last.onend();");
    assert.equal(s.el.value, 'salt');
});

test('text the app cleared while listening (chat Send) does not come back', () => {
    const s = sandbox();
    s.start();
    s.run("say('bread', false);");
    s.run("el.value=''; el.selectionStart=el.selectionEnd=0;");
    s.run("say('bread', true); last.onend();");
    assert.equal(s.el.value, '');
});

test('after typing, new spoken words go on from the caret and are not repeated', () => {
    const s = sandbox();
    s.start();
    s.run("say('two eggs', true);");
    s.run("el.selectionStart=el.selectionEnd=el.value.length; type(' plus');");
    s.run("last.onresult({resultIndex:1, results:[Object.assign([{transcript:'two eggs'}],{isFinal:true}), Object.assign([{transcript:'butter'}],{isFinal:false})]});");
    assert.equal(s.el.value, 'two eggs plus butter');
    s.run("last.onresult({resultIndex:1, results:[Object.assign([{transcript:'two eggs'}],{isFinal:true}), Object.assign([{transcript:'butter'}],{isFinal:true})]}); last.onend();");
    assert.equal(s.el.value, 'two eggs plus butter');
    assert.ok(s.el.events.includes('input'), 'the field hears an input event for the final words');
});

test('plain dictation is unchanged: spoken words land at the caret of the typed text', () => {
    const s = sandbox();
    s.run("type('milk');");
    s.start();
    s.run("say('two', false); say('two eggs', false); say('two eggs', true); last.onend();");
    assert.equal(s.el.value, 'milk two eggs');
    assert.deepEqual(s.el.events, ['input', 'change']);
});
