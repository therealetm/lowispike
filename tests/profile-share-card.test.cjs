'use strict';
/* 24 Oct 2026 (Emmanuel's screenshot: a real member's card said "Star sign: Not shared. Birthday: Not shared. Personality: Not shared.").
   The card now shows a shared birthday (day + month) with a countdown, the star sign from that day, the type if set; the own card links the
   personality test in the user's language; nothing is shown or published without the person's consent. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const K=require('../community-chat-core.js'),P=require('../profile-share-core.js');
function fixture(over){
 const nodes={},events={},winEvents={},rafs=[],attrs=new Set(),classes=new Set(),storage={},sheets=[];let actor='',online=true;
 function node(id){return nodes[id]||(nodes[id]={id,dataset:{},style:{setProperty(k,v){this[k]=v;}},value:'',innerHTML:'',textContent:'',scrollTop:0,scrollHeight:500,clientHeight:300,attrs:{},setAttribute(k,v){this.attrs[k]=v;},hasAttribute:k=>attrs.has(k),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({top:180,height:300}),focus(){doc.activeElement=this;}});}
 const el=node('cmPaneChat');el.setAttribute=(k,v)=>attrs.add(k);el.querySelector=s=>node(s.startsWith('#')?s.slice(1):s);const input=node('cmInput');input.closest=()=>null;
 const doc={hidden:false,activeElement:null,documentElement:{classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)}},getElementById:id=>id==='cmPaneChat'?el:id==='tabbar'?null:node(id),querySelector:()=>null,createElement:()=>node('new'),addEventListener:(e,f)=>(events[e]=events[e]||[]).push(f)};
 const host={state:()=>({uid:actor,chatRealtime:'SUBSCRIBED'}),messages:()=>[],reactions:()=>[],client:async()=>({from(){const q={};for(const m of ['select','eq','order','limit','in','abortSignal'])q[m]=()=>q;q.then=(a,b)=>Promise.resolve({data:[],error:null}).then(a,b);return q;}}),replace(){},upsert(){},remove(){},setReactions(){},people:()=>[{uid:'b',n:'Same name',bday:'1980-01-01',s:'Leo',t:'ENTJ',w:95}],identity:()=>({n:'Fixture A',t:'INFP',s:'Pisces',bday:'1990-03-01',w:70}),bubble:p=>'<span data-safe-sign="'+p.s+'">bubble</span>',sheet:s=>sheets.push(s),active:()=>true,install(){},typeLabel:()=> 'Mediator',color:s=>s==='Leo'?'#ffaa00':'#9fd8ff'};
 Object.assign(host,over||{});const win={document:doc,LowiChatCore:K,LowiProfileShare:P,LowiCommunityHost:host,innerWidth:390,innerHeight:844,visualViewport:{height:844,offsetTop:0,addEventListener(){}},addEventListener:(e,f)=>(winEvents[e]=winEvents[e]||[]).push(f)};
 const ctx={...win,window:win,document:doc,globalThis:win,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=String(v)},navigator:{get onLine(){return online;}},crypto:require('node:crypto').webcrypto,AbortController,setTimeout,clearTimeout,setInterval(){},requestAnimationFrame:f=>{rafs.push(f);return rafs.length;},console};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../community-galaxy.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../community-chat-cloud.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../community-chat.js'),'utf8'),ctx);
 const flush=()=>{for(let n=0;n<8&&rafs.length;n++)rafs.splice(0).forEach(f=>f());assert(rafs.length===0,'mount settles without a refresh/listener loop');};flush();
 return {win,doc,nodes,storage,sheets,classes,input,host,flush,scope(id){actor=id;win.LowiCommunity.refresh();flush();},offline(){online=false;win.LowiCommunity.refresh();flush();},event(type,event){for(const f of events[type]||[])f(event);flush();},click(data){const b={dataset:data,closest:()=>null};this.event('click',{target:{closest:()=>b},preventDefault(){},stopPropagation(){}});},el};
}
const SHARED={uid:'s',n:'Antje',bday:'0004-12-24',s:'Capricorn',t:'ENFP'},LEGACY={uid:'b',n:'Old row',bday:'1980-01-01',s:'Leo',t:'ENTJ'},NOTYPE={uid:'n',n:'No type',bday:'0004-07-30',s:'',t:''};
const people=()=>[SHARED,LEGACY,NOTYPE];
const card=(f,uid,name)=>{f.sheets.length=0;f.scope('a');f.click({chat:'profile',uid,name});return f.sheets[f.sheets.length-1]||'';};

test('someone who shared: birthday day + month with a countdown, star sign, personality; never a year or an age',()=>{
 const f=fixture({people});const h=card(f,'s','Antje'),nx=P.next({m:12,d:24}).days;
 assert.match(h,/24 December/);assert.match(h,new RegExp(P.countdown(nx,'en').replace(/[!.?]/g,'\\$&')));
 assert.match(h,/Capricorn/);assert.match(h,/ENFP/);assert.doesNotMatch(h,/0004|19\d\d|20\d\d|years? old/);
 assert.doesNotMatch(h,/16personalities|personality test/i,'no test link on someone else\'s card');
});
test('someone who shared no type: birthday and sign show, personality says not shared, no test link for the viewer',()=>{
 const f=fixture({people});const h=card(f,'n','No type');
 assert.match(h,/30 July/);assert.match(h,/Leo/);assert.match(h,/Personality<\/span><b class="cp-muted">Not shared/);assert.doesNotMatch(h,/16personalities|I know my type/);
});
test('an older row with a real birth year (no consent) stays private: no date, no sign, no type',()=>{
 const f=fixture({people});const h=card(f,'b','Old row');
 assert.doesNotMatch(h,/1980|January|Leo|ENTJ/);assert.match(h,/Birthday<\/span><b class="cp-muted">Not shared/);
});
test('own card before consent: shows own values marked not shared yet and a share button; nothing published',()=>{
 const calls=[];const f=fixture({people,identity:()=>({n:'Fixture A',t:'',s:'Pisces',bday:'1990-03-01',share:false,asked:false}),setShare:(on,b)=>{calls.push([on,b]);return {share:on};}});
 const h=card(f,'a','Fixture A');
 assert.match(h,/1 March/);assert.match(h,/Pisces/);assert.match(h,/not shared yet/);assert.match(h,/data-chat="share-ask"/);assert.doesNotMatch(h,/1990/);
 assert.equal(calls.length,0,'opening the card publishes nothing');
});
test('own card without a type links the free test in the app language and offers the picker to save it',()=>{
 for(const [lang,url,word] of [['en',P.TEST.en,'Take the free personality test'],['de',P.TEST.de,'Kostenlosen Persönlichkeitstest'],['es',P.TEST.es,'Hacer el test de personalidad']]){
  const f=fixture({people,identity:()=>({n:'A',t:'',s:'Pisces',bday:'1990-03-01',share:true,asked:true}),setShare:()=>({share:true})});
  f.storage['lowispike.lang']=lang;
  const h=card(f,'a','A');
  assert.ok(h.includes('href="'+url+'"'),lang+' link');assert.ok(h.includes(word),lang+' label');
  assert.match(h,/data-chat="type-pick"/);assert.match(h,/target="_blank" rel="noopener"/);
 }
});
test('own card with a type and consent: type and birthday marked shared, no test link',()=>{
 const f=fixture({people,identity:()=>({n:'A',t:'INTJ',s:'Pisces',bday:'1990-03-01',share:true,asked:true}),setShare:()=>({share:true})});
 const h=card(f,'a','A');assert.match(h,/INTJ · shared/);assert.match(h,/1 March · [^<]* · shared/);assert.doesNotMatch(h,/16personalities|share-ask/);
});
test('the consent sheet explains the rule, previews day + month and sign, and only the Share tap calls setShare',async()=>{
 const calls=[];const f=fixture({people,identity:()=>({n:'A',t:'',s:'Pisces',bday:'1990-03-01',share:false,asked:false}),setShare:(on,b)=>{calls.push([on,b]);return {share:on};}});
 f.scope('a');f.sheets.length=0;f.click({chat:'share-ask'});await new Promise(r=>setTimeout(r,300));
 const h=f.sheets[f.sheets.length-1]||'';assert.match(h,/never the year or your age/);assert.match(h,/1 March/);assert.match(h,/Pisces/);assert.match(h,/data-chat-form="share"/);assert.match(h,/data-chat="share-later"/);assert.doesNotMatch(h,/1990/);
 assert.equal(calls.length,0);
});
test('onboarding says what is shared at the birthday step, and its yes never overwrites an earlier choice; pushProfile publishes only through the consent rule',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const ob=html.slice(html.indexOf('if (ob.step === 0) {'),html.indexOf('} else if (ob.step === 1) {'));
 assert.match(ob,/never the year\) show on your Community card with a birthday countdown and your star sign/);
 assert.match(html,/Tag und Monat \(nie das Jahr\) erscheinen auf deiner Community-Karte/);
 const save=html.slice(html.indexOf('function saveOb(final){'),html.indexOf('function saveOb(final){')+900);
 assert.match(save,/if \(ob\.bday && !s\.user\.shareProfile\) s\.user\.shareProfile = \{v:1, at:Date\.now\(\), via:"onboarding"\}/);
 const push=html.slice(html.indexOf('function pushProfile()'),html.indexOf('function snapshot()'));
 assert.match(push,/row\.bday = ""; row\.mbti = ""; row\.sign = "";[\s\S]*LowiProfileShare\.publicRow\(S\.user, S\.user\.shareProfile/);
 assert.ok(/<script src="profile-share-core\.js\?v=/.test(html));
});
