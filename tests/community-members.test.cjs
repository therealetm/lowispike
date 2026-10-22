'use strict';
/* 22 Oct 2026 (Emmanuel, iPhone 14:29): tapping the members count opens its own Members page instead of a card over the chat. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const K=require('../community-chat-core.js'),js=read('community-chat.js'),css=read('community-members.css'),html=read('index.html'),sw=read('sw.js');
const ui=read('tests/community-chat-ui.test.cjs');
const fixture=new Function('require','assert','fs','vm','path','__dirname','K',ui.slice(ui.indexOf('function fixture(){'),ui.indexOf('\ntest('))+'\nreturn fixture;')(require,assert,fs,vm,path,path.join(__dirname),K);

test('member list: admins first, then online, then the rest; only public fields; search ignores case and accents',()=>{
  const out=K.members([
    {uid:'z',n:'Zoe',last:5,w:95,weight:95,bday:'1980-01-01',health:'x'},
    {uid:'o',n:'Óscar',online:true,last:1},
    {uid:'a',n:'Ada',admin:true,last:0},
    {uid:'me',n:'Me',me:true,online:true,last:0},
    {uid:'z',n:'Zoe again'},{uid:'e',n:'  '},null
  ]);
  assert.equal(out.count,4,'duplicates and empty names never count');
  assert.deepEqual(out.rows.map(r=>r.uid),['a','me','o','z']);
  for(const r of out.rows)assert.deepEqual(Object.keys(r).sort(),['admin','last','lv','lvHidden','me','n','online','uid','xp']);
  assert.doesNotMatch(JSON.stringify(out),/95|1980|health/);
  assert.deepEqual(K.members(out.rows,'osc').rows.map(r=>r.n),['Óscar']);
  assert.equal(K.members(out.rows,'nobody').count,4,'the title keeps the full count while you search');
  assert.equal(K.memberGroup({admin:true,online:true}),0);
});

function room(){
  const f=fixture(),now=Date.now();
  f.host.people=()=>[{uid:'e',n:'Bea',lv:3,xp:350,w:95},{uid:'c',n:'Cy',lv:1,xp:20},{uid:'d',n:'Dee',lv:2,xp:120,wk:'x:h'}];
  f.host.messages=()=>[{id:'1',uid:'e',by:'Bea',t:'hi',ts:now-3*36e5},{id:'2',uid:'d',by:'Dee',t:'yo',ts:now-60e3},{id:'3',uid:'q',by:'Quinn',t:'hey',ts:now-5*36e5}];
  f.win.LowiRooms={active:()=>true,members:()=>['a','c'],has:id=>id==='a'||id==='c',room:()=>'r1',count:()=>2,cap:()=>30,status:()=>'joined',knocks:()=>[]};
  f.win.LowiChatAdmins=['e'];
  f.win.LowiWorldHomeCore=require('../world-home-core.js');
  f.scope('a');f.win.LowiCommunity.thread(true);f.flush();return f;
}

test('members button opens the Members page; never the Recent voices card over the chat',()=>{
  const f=room();
  assert(f.nodes.crMem.hidden!==false,'closed until you tap the count');
  f.nodes.cmList.scrollTop=123;
  f.click({chat:'members'});
  assert.equal(f.nodes.crMem.hidden,false);assert('open' in f.nodes.crMem.dataset);
  assert(!('open' in f.nodes.crCrew.dataset),'the old popover stays shut');
  assert(f.classes.has('cr-mem-open'));
  assert.equal(f.nodes.crMembers.attrs['aria-expanded'],'true');
  const list=f.nodes.crMemList.innerHTML,title=f.nodes.crMemTitle.textContent;
  const n=f.win.LowiCommunity.members().count;
  assert.equal(title,'Members · '+n);
  assert.equal(f.nodes.crMcount.textContent,String(n),'the badge shows the same live count');assert.match(f.nodes.crMembers.attrs['aria-label'],new RegExp('· '+n+'$'));
  assert.match(list,/Admins[\s\S]*Bea[\s\S]*Admin[\s\S]*Online now[\s\S]*(Cy|Dee)[\s\S]*Other members[\s\S]*Quinn/);
  assert.match(list,/Level 3 · Glow cell/,'level and cell name from the cell system');
  assert.doesNotMatch(list,/95|kg|BMI/i,'never weight or health');
  assert.match(list,/class="cr-mdot"/,'online dot');
  assert.match(list,/Recent voices/,'recent voices stays as a small section on the page');
  assert.match(list,/Only nicknames, companions and levels/);
  f.click({chat:'members-close'});
  assert.equal(f.nodes.crMem.hidden,true);assert(!f.classes.has('cr-mem-open'));
  assert.equal(f.nodes.cmList.scrollTop,123,'back to the same scroll spot in the chat');
});

test('leaderboard opt-out hides that level; Escape (swipe back) closes the page first; rows open the public profile',async()=>{
  const f=room();
  f.win.LowiLeaderboardCore={parse:wk=>({hide:/:h$/.test(String(wk||''))})};
  f.click({chat:'members'});
  const rows=f.win.LowiCommunity.members().rows;
  assert.equal(rows.find(r=>r.uid==='d').lvHidden,true);assert.equal(rows.find(r=>r.uid==='e').lvHidden,false);
  assert.doesNotMatch(f.nodes.crMemList.innerHTML,/Dee<\/b>[^]*?Level 2 · Little cell/);
  f.event('input',{target:{id:'crMemQ',value:'qui'}});await new Promise(r=>setTimeout(r,150));
  assert.match(f.nodes.crMemList.innerHTML,/Quinn/);assert.doesNotMatch(f.nodes.crMemList.innerHTML,/Bea/);
  f.event('input',{target:{id:'crMemQ',value:'zzz'}});await new Promise(r=>setTimeout(r,150));
  assert.match(f.nodes.crMemList.innerHTML,/No one here is called/);
  f.click({chat:'member',uid:'e',name:'Bea'});assert.equal(f.sheets.length,1,'a member row opens their public profile');
  assert.doesNotMatch(f.sheets[0],/95 kg/);
  f.event('keydown',{key:'Escape',target:{id:''},preventDefault(){}});
  assert.equal(f.nodes.crMem.hidden,true,'Escape closes the members page, not the room');
});

test('Members page: own stylesheet with theme tokens only, cached offline, texts in EN/DE/ES',()=>{
  assert.match(html,/id="ctgCss"[^>]*>\s*<link rel="stylesheet" id="cmemCss" href="community-members\.css\?v=/);
  assert.match(sw,/const STATIC = \[[^\]]*"community-members\.css"/);
  const colours=(css.replace(/var\(--[a-z0-9-]+,[^)]*\)/g,'').match(/#[0-9a-f]{3,8}\b|rgba?\(/gi)||[]);
  assert.deepEqual(colours,['#34d399'],'only the green online dot is a fixed colour; teal and the rest come from the room tokens');
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  for(const k of ['memTitle','memBack','memSearch','memAdmins','memOnline','memOthers','memAdmin','memNone','memEmpty','memNote'])assert.match(js,new RegExp(k+":\\['[^']+','[^']+','[^']+'\\]"),k);
  assert.match(js,/memTitle:\['Members','Mitglieder','Miembros'\]/);
});
