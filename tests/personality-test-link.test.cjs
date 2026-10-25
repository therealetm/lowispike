'use strict';
/* 25 Oct 2026 (Emmanuel, voice: "For the people who don't know their personality type, did you add a link for them to go do the personality type test?").
   Before: only the own Community card linked the test. Setup had no type question at all, and the profile editor's type picker (mbtiSheet,
   reached from Your details, Profile and Finish profile) only said "Don't know yours? A free 16-type test takes about 10 minutes." with no link.
   Now: wherever the person has no type, "Don't know yours? Take the free test" opens 16Personalities' free test in their language in the browser,
   with a note that it takes about 10 minutes; afterwards they pick one of the 16 types in the app. Other people's cards keep only "None yet". */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../profile-share-core.js');
const HTML=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const CHAT=fs.readFileSync(path.join(__dirname,'../community-chat.js'),'utf8');

test('core: the 16 types, each with a name in English, German and Spanish',()=>{
 assert.equal(P.TYPES.length,16);assert.equal(new Set(P.TYPES).size,16);
 for(const t of P.TYPES){assert.match(t,/^[IE][NS][TF][JP]$/);for(const l of ['en','de','es'])assert.ok(P.typeName(t,l).length>2,t+' '+l);}
 assert.equal(P.typeName('INTJ','en'),'Architect');assert.equal(P.typeName('INTJ','de'),'Architekt');assert.equal(P.typeName('INTJ','es'),'Arquitecto');
 assert.equal(P.typeName('XXXX','en'),'');
});

test('core: the test link block opens the free test in the app language in the browser, says about 10 minutes, and is never translated twice',()=>{
 const want={en:[/Don't know yours\? Take the free test/,/About 10 minutes/],de:[/Du kennst deinen nicht\? Mach den kostenlosen Test/,/etwa 10 Minuten/],es:[/¿No sabes el tuyo\? Haz el test gratis/,/Unos 10 minutos/]};
 for(const l of ['en','de','es']){
  const h=P.testHTML(l);
  assert.ok(h.includes('href="'+P.TEST[l]+'"'),l+' link');assert.match(h,/target="_blank"/);assert.match(h,/rel="noopener noreferrer"/);assert.match(h,/data-ps-test/);assert.match(h,/data-noi18n/);
  for(const re of want[l])assert.match(h,re,l);
  assert.match(h,/class="ps-test-note"/);
 }
 assert.equal(P.testHTML('fr'),P.testHTML('en'),'unknown language falls back to English');
 const n=P.testNoteHTML('de');assert.match(n,/etwa 10 Minuten/);assert.doesNotMatch(n,/href/);
});

test('profile editor: the type picker links the test only while no type is set (no more plain text without a link)',()=>{
 const i=HTML.indexOf('function mbtiSheet(){'),body=HTML.slice(i,HTML.indexOf('\nfunction ',i+10));
 assert.ok(i>0);
 assert.doesNotMatch(body,/A free 16-type test takes about 10 minutes\./,'old line without a link is gone');
 assert.match(body,/R5\.mbti \? "" : .*LowiProfileShare.*testHTML\(/,'test link when no type is set');
});

test('setup: the birthday step asks the type (optional, the 16 types, "Not sure yet"), links the test while none is picked, and saves the pick everywhere',()=>{
 const s0=HTML.indexOf('if (ob.step === 0) {'),step0=HTML.slice(s0,HTML.indexOf('} else if (ob.step === 1)',s0));
 assert.match(step0,/id="r2obType"/);assert.match(step0,/PS\.TYPES\.map/);assert.match(step0,/id="r2obTest"/);assert.match(step0,/ob\.mbti \? "" : PS\.testHTML\(/);
 const paint=HTML.slice(HTML.indexOf('function paintOb(){'),HTML.indexOf('function saveOb(final){'));
 assert.match(paint,/\$\("#r2obType"\)/);assert.match(paint,/ob\.mbti = /);
 const save=HTML.slice(HTML.indexOf('function saveOb(final){'),HTML.indexOf('function finishOb(){'));
 assert.match(save,/LowiHerbIdentity\.setType\(ob\.mbti\)/);
 assert.ok(save.indexOf('setType(ob.mbti)')<save.indexOf('R2.save()'),'type saved before the profile is pushed');
 const init=HTML.slice(HTML.indexOf('R2.onboard = function(opts){'),HTML.indexOf('const ov = R2.sheet(\'<div class="r2-ob" id="r2ob">'));
 assert.match(init,/ob\.mbti = /,'an existing type is kept when setup resumes');
});

test('own Community card: the test link also says about 10 minutes; other people\'s cards never get a link or the note',()=>{
 const line=CHAT.split('\n').find(l=>l.includes('if(mine)rows+=type?pcRow('));
 assert.ok(line);assert.match(line,/testNoteHTML\(L\)/);
 const other=CHAT.split('\n').find(l=>l.includes("if(!bt&&!mine)rows+=pcRow(tr('pcType')"));
 assert.ok(other);assert.doesNotMatch(other,/test/i);
});
