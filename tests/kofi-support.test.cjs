'use strict';
// Pay what you want via Ko-fi (Oct 15): voluntary tip, opens Ko-fi over the app, 0 € is real, nothing unlocks.
process.env.TZ='Europe/Berlin';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const K=require('../herb-shop-core.js');

function world(lang){
 const store={},L={};const on=(t,f)=>{(L[t]=L[t]||[]).push(f);};
 const el=()=>({dataset:{},style:{},innerHTML:'',setAttribute(){},focus(){},remove(){this.gone=true;},contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],appendChild(){}});
 const document={visibilityState:'visible',documentElement:{lang},head:{appendChild(){}},body:{appendChild(n){document.ov=n;}},activeElement:null,
  createElement:el,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],contains:()=>false,addEventListener:on};
 const win={document,addEventListener:on,dispatchEvent(){},CustomEvent:function(){},matchMedia:()=>({matches:false}),setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}},Date,JSON,Math,String,Number,Array,Object,Set,Map};
 win.window=win;win.CustomEvent=function(t,o){this.type=t;this.detail=o&&o.detail;};
 const T=require('../herb-tamagotchi-core.js');win.LowiHerbTamagotchiCore=T;win.LowiHerbShopCore=K;win.LowiHerbTamagotchi={current:()=>({m:{xp:0}})};
 vm.createContext(win);vm.runInContext(src('herb-shop.js'),win);
 const click=(dataset,tag)=>{const b={dataset,tagName:tag||'BUTTON'};let prevented=false,stopped=false;
  const e={target:{closest:()=>b},preventDefault(){prevented=true;},stopPropagation(){stopped=true;}};(L.click||[]).forEach(f=>f(e));return{prevented,stopped};};
 return{win,document,store,L,click,html:()=>document.ov.innerHTML,shop:win.LowiHerbShop};
}

test('core: Ko-fi page, support modes, 0 € default, stored choice is cleaned',()=>{
 assert.equal(K.kofiUrl(),'https://ko-fi.com/lowispike');
 assert.deepEqual(K.KOFI.modes,['free','once','month']);
 assert.equal(K.blank().support,'free','nothing is pre-selected that costs money');
 assert.equal(K.clean({support:'month'}).support,'month');
 assert.equal(K.clean({support:'gold'}).support,'free');
 assert.equal(K.clean(null).support,'free');
});

test('screen: 0 € by default, no Ko-fi link, nothing unlocks, no preview wording',()=>{
 const w=world('de');w.shop.open('plus');const h=w.html();
 assert.match(h,/data-view="plus"/);
 assert.match(h,/role="radiogroup"/);
 assert.match(h,/data-mode="free" aria-checked|aria-checked="true" data-shop="mode" data-mode="free"/);
 assert.match(h,/Unterstützen schaltet nichts frei: keine XP, keine Teile/);
 assert.match(h,/Nichts passiert, es wird nichts berechnet/);
 assert.ok(!/ko-fi\.com/.test(h),'at 0 € there is no payment link');
 assert.ok(!/noch nicht verfügbar|Vorschau/i.test(h),'preview wording is gone');
});

test('screen: one-time and monthly open Ko-fi over the app with honest terms (de/en/es)',()=>{
 const w=world('de');w.shop.open('plus');
 w.click({shop:'mode',mode:'once'});let h=w.html();
 assert.match(h,/<a class="hs-act hs-cta hs-kofi" href="https:\/\/ko-fi\.com\/lowispike" target="_blank" rel="noopener" data-shop="kofi">Einmalig bei Ko-fi unterstützen/);
 assert.match(h,/Kein Abo, nichts verlängert sich/);
 assert.equal(JSON.parse(w.store[K.SKEY]).support,'once','choice is saved with the shop state');
 w.click({shop:'mode',mode:'month'});h=w.html();
 assert.match(h,/Monatlich bei Ko-fi unterstützen/);
 assert.match(h,/jeden Monat am gleichen Tag/);assert.match(h,/Kündigen jederzeit/);
 const r=w.click({shop:'kofi'},'A');
 assert.equal(r.prevented,false,'the Ko-fi link is a real link, the browser opens it');
 for(const [lang,re] of [['en',/Cancel any time in your Ko-fi account[\s\S]*Support monthly on Ko-fi/],['es',/Cancela cuando quieras en tu cuenta de Ko-fi[\s\S]*Apoyar cada mes en Ko-fi/]]){
  const v=world(lang);v.shop.open('plus');v.click({shop:'mode',mode:'month'});assert.match(v.html(),re,lang);}
});

test('back from Ko-fi: one calm thank-you, nothing unlocked, no tracking',()=>{
 const w=world('de');w.shop.open('plus');w.click({shop:'mode',mode:'once'});
 const t0=Date.now;w.click({shop:'kofi'},'A');
 const real=Date.now;try{Date.now=()=>real()+5000;w.L.visibilitychange.forEach(f=>f());}finally{Date.now=real;}
 const h=w.html();assert.match(h,/Willkommen zurück\. Danke, falls du LOWiSPIKE unterstützt hast\. In der App ändert sich so oder so nichts\./);
 const st=JSON.parse(w.store[K.SKEY]);assert.deepEqual(st.owned,[],'paying or not, nothing is unlocked');
 void t0;
});

test('wiring + honesty: no payment code in the app, no iframe checkout, no XP/items for paying, update note',()=>{
 const ui=src('herb-shop.js');
 assert.ok(!/fetch\(|stripe|paymentrequest|<iframe/i.test(ui),'the app handles no payment');
 assert.ok(!/award|xp\s*\+|setOwned\([^)]*kofi/i.test(ui.slice(ui.indexOf('function plusHTML'),ui.indexOf('function paint'))),'support screen awards nothing');
 assert.ok(!/noch nicht verfügbar\.'|Not available yet'/.test(ui.slice(ui.indexOf('function plusHTML'),ui.indexOf('function paint'))));
 const v=JSON.parse(src('version.json'));const n=JSON.stringify(v);
 assert.match(n,/Ko-fi/);
});
