'use strict';
/* Oct 16: Community person cards showed "In the galaxy since 1775005826187" (a raw ms timestamp). The date helpers must read numbers too and never print digits. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'..','community-chat.js'),'utf8');
function grab(name){const m=js.match(new RegExp('function '+name+'\\([^)]*\\)\\{[^\\n]*'));assert(m,name+' not found');return m[0];}
function helpers(langIdx){const ctx={};vm.createContext(ctx);vm.runInContext('function lang(){return '+langIdx+';}\n'+grab('pcParse')+'\n'+grab('pcDate')+'\nthis.pcDate=pcDate;',ctx);return ctx.pcDate;}
const MS=1775005826187,want=new Date(MS);

test('a numeric "since" (number or digit string) renders as a real date with the year, never as digits',()=>{
 const pcDate=helpers(0);
 for(const v of [MS,String(MS)]){
  const out=pcDate(v,1);
  assert.ok(out,'empty for '+v);
  assert.doesNotMatch(out,/\d{5,}/,'raw number shown: '+out);
  assert.match(out,new RegExp(String(want.getFullYear())));
  assert.match(out,/January|February|March|April|May|June|July|August|September|October|November|December/);
 }
 assert.equal(pcDate(Date.UTC(2026,9,16,12),1),'16 October 2026');
});

test('YYYY-MM-DD days still work, and unreadable values give an empty string so the row hides',()=>{
 const pcDate=helpers(0);
 assert.equal(pcDate('2026-10-16',1),'16 October 2026');
 assert.equal(pcDate('1994-03-09'),'9 March');
 for(const v of [null,undefined,'',0,'abc','12345',NaN,true])assert.equal(pcDate(v,1),'','value '+String(v));
 assert.equal(helpers(1)('2026-10-16',1),'16. Oktober 2026');
});

test('a "since" in seconds (10 digits) is read as seconds, not as a 1970 date, in en, de and es',()=>{
 const SEC=Math.floor(Date.UTC(2026,9,16,12)/1000);
 for(const v of [SEC,String(SEC)]){
  assert.equal(helpers(0)(v,1),'16 October 2026','en '+v);
  assert.equal(helpers(1)(v,1),'16. Oktober 2026','de '+v);
  assert.equal(helpers(2)(v,1),'16 de octubre de 2026','es '+v);
 }
 assert.equal(helpers(2)(Date.UTC(2026,9,16,12),1),'16 de octubre de 2026');
 assert.equal(helpers(0)(12345,1),'','tiny numbers hide the row');
});

test('the real person card markup shows a proper date for a ms and a seconds since',()=>{
 const SEC=Math.floor(Date.UTC(2026,9,16,12)/1000);
 const pcDate=helpers(0);
 for(const v of [Date.UTC(2026,9,16,12),SEC]){
  const bt={since:v};
  const row=(bt&&pcDate(bt.since,1))?'<div class="pc-row"><b>In the galaxy since</b><span>'+pcDate(bt.since,1)+'</span></div>':'';
  assert.match(row,/In the galaxy since<\/b><span>16 October 2026<\/span>/);
  assert.doesNotMatch(row,/\d{5,}/);
 }
});

test('person card and bot profile never fall back to the raw since value',()=>{
 assert.doesNotMatch(js,/String\(bt\.since\)/);
 assert.match(js,/if\(bt&&pcDate\(bt\.since,1\)\)rows\+=pcRow\(tr\('withUs'\),pcDate\(bt\.since,1\)\)/);
 assert.match(js,/const d=s=>pcDate\(s,1\);/);
 assert.match(js,/\(d\(b\.since\)\?row\(tr\('withUs'\),d\(b\.since\)\):''\)/);
});
