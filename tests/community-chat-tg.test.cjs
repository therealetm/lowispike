'use strict';
/* 21 Oct 2026, Community room in the exact Eden/Telegram layout, brand dark theme instead of white. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const js=read('community-chat.js'),css=read('community-tg.css'),html=read('index.html'),sw=read('sw.js');
/* reuse the chat UI test's DOM fixture as is, so both suites drive the same fake page */
const ui=read('tests/community-chat-ui.test.cjs');
const fixture=new Function('require','assert','fs','vm','path','__dirname','K',ui.slice(ui.indexOf('function fixture(){'),ui.indexOf('\ntest('))+'\nreturn fixture;')(require,assert,fs,vm,path,path.join(__dirname),require('../community-chat-core.js'));

test('room top bar: round back, centred pill with room icon + name + community name, round members button, pinned pill',()=>{
 const f=fixture(),m=f.el.innerHTML;
 assert.match(m,/class="cg-thead cr-head"[\s\S]*class="cg-x cr-back"[\s\S]*class="cr-id"><span class="cr-ic"[\s\S]*id="cgThreadTitle"[\s\S]*id="crCname"[\s\S]*class="cr-members" id="crMembers" data-chat="members"[\s\S]*<\/header><button type="button" class="cr-pin" id="crPin" data-chat="pin"/);
 assert.match(m,/id="crLink"/,'connection state is kept (a dot in the pill)');
 f.scope('a');
 assert.equal(f.nodes.crCname.textContent,'LOWiSPIKE Community');
 assert.match(f.nodes.crPin.innerHTML,/cr-pinl">Pinned Message<[\s\S]*cr-pint">Welcome to the galaxy/);
 assert.equal(f.nodes.crMembers.attrs['aria-expanded'],'false');
 f.click({chat:'members'});assert.equal(f.nodes.crMembers.attrs['aria-expanded'],'true');assert('open' in f.nodes.crCrew.dataset);
 assert.match(f.nodes.crCrew.innerHTML,/Recent voices/,'the members list never opens empty');
 f.click({chat:'members'});assert.equal(f.nodes.crMembers.attrs['aria-expanded'],'false');
 f.click({chat:'pin'});assert.equal(f.nodes.crPin.attrs['aria-expanded'],'true');
});
test('bubble: sender name on top, reply quote, time bottom-right inside the bubble in a footer with the actions button',()=>{
 const f=fixture(),out=f.win.LowiCommunity.messageHTML({id:'m',uid:'b',by:'Same name',t:'Hello https://example.com',ts:Date.now(),rx:{}},[]);
 assert.match(out,/<div class="cm-bub"[^>]*>[\s\S]*cs-name[\s\S]*Hello[\s\S]*<div class="cm-foot">[\s\S]*data-chat="more"[\s\S]*<time datetime=[\s\S]*<\/time><\/div>/);
 assert.doesNotMatch(out,/class="cs-by"[^]*?<time[^]*?<\/div>[^]*?cm-foot/,'the time is no longer in the name row');
});
test('room strings exist in English, German and Spanish',()=>{
 for(const k of ['roomCommunity','roomMembers','roomPinned','roomPin','roomMsg','roomJoined','roomJoinedMany','roomWave','roomNoCrew']){const m=js.match(new RegExp('[ ,]'+k+":\\['([^']+)','([^']+)','([^']+)'\\]"));assert(m,k);}
 assert.match(js,/roomJoinedMany:\['\{n\} and \{c\} others joined'/);
});
test('join pills come only from real room presence and carry a Wave button that greets that person',()=>{
 assert.match(js,/function joinTrack\(\)\{const R=W\.LowiRooms;if\(!R\|\|!R\.active\|\|!R\.active\(\)/);
 assert.match(js,/joinSeen=new Set\(cur\);return;/,'people already in the room when you arrive are not announced');
 assert.match(js,/button\('wave'/);assert.match(js,/a==='wave'\)\{draft\('\\u\{1F44B\} @'/);
});
test('room composer: photo button moves left of the field in the room (DOM order too), right of it in the galaxy',()=>{
 assert.match(js,/const left=!!threadOpen&&!selN;if\(left&&ph\.nextElementSibling!==inp\)inp\.parentNode\.insertBefore\(ph,inp\)/);
 assert.match(js,/threadOpen\?tr\('roomMsg'\):tr\('message'\)/,'the room field says Message');
});
test('Telegram sheet is scoped to the room, loads after the other community sheets, is precached, and never uses white borders',()=>{
 const i=html.indexOf('community-tg.css');assert(i>html.indexOf('community-room.css')&&i>html.indexOf('community-composer.css')&&i>html.indexOf('community-chat.css'));
 assert.match(sw,/"community-tg\.css"/);
 const body=css.replace(/\/\*[\s\S]*?\*\//g,'');
 for(const r of body.split('}')){const sel=r.split('{')[0].trim();if(!sel||sel.startsWith('@'))continue;for(const s of sel.split(/,(?![^(]*\))/))assert.match(s,/#cmPaneChat\[data-spirit-chat\]|html\.cr-room/,'unscoped: '+s);}
 assert.doesNotMatch(body,/border[^;{}]*:(?:[^;{}]*)(#fff\b|#ffffff|white|rgba\(255,\s*255,\s*255,\s*\.[5-9])/i,'glowing brand edges, not white borders');
 assert.match(body,/\.cr-pin::before\{[^}]*background:linear-gradient\(180deg,#64d2ff,#0a84ff\)/,'pinned bar in brand colours');
});
