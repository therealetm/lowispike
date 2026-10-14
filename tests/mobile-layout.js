/* Source-based component fixture. Never boots authentication, cloud state, camera or rewards. */
(async()=>{
window.LOWI_HERB_FIXTURE=true;
const source=await(await fetch('../index.html')).text(),parsed=new DOMParser().parseFromString(source,'text/html'),D=document;
for(const st of parsed.querySelectorAll('style'))D.head.append(st.cloneNode(true));
for(const href of ['../apple-ui.css','../herb-tamagotchi.css']){const l=D.createElement('link');l.rel='stylesheet';l.href=href;D.head.append(l);}
const overrides=D.createElement('style');overrides.textContent=':root{--sat:44px;--sab:24px}.qa-preview-note{font-size:12px;color:var(--muted)} #tab-shelf .r5-stage{width:220px;margin:30px auto}#tab-shelf .r5-go{width:100%}#qaSpinState{font-size:13px;margin:12px 0}.lh-guide-herb{display:none}';D.head.append(overrides);
const nav=parsed.getElementById('tabbar');D.getElementById('main').append(nav);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 5h12v14H6zM9 8v8m3-8v8m3-8v8"/></svg>';
const home=D.getElementById('tab-home');home.innerHTML='<div class="td-top"><div><div class="small muted">Good morning, Alex</div><div class="h1 td-date">Wednesday 14 October</div></div></div><section id="f3Board" class="f3-board"><div class="f3-hd"><span class="f3-tag">◆ Daily quest</span><span class="f3-cnt">1/6</span></div><div class="f3-bar"><i class="on"></i><i class="cur"></i><i></i><i></i><i></i><i></i></div><div class="f3-cur"><span class="f3-ic">💧</span><span class="f3-ct"><span class="f3-nx">Next · +10 XP</span><b>Drink 2 glasses of water</b></span><button class="f3-go">+1 glass ›</button></div><button class="f3-tog">All quests · 5 left ▾</button></section>';
// The production fasting card, including the long goal and next-stage copy.
const fast=new Function('window','esc',`const shows=()=>true,fsLoc=()=>{},hrs=()=>9,goal=()=>18,stageAt=()=>0,STAGES=[{n:'Liver takes over'},{n:'Fat burning ramps up',h:12}],dayKey=()=>'',st=()=>({water:{},last:1}),FU=k=>({status:'Fasting details',of:'of',now:'Now',next:(n,d)=>'Next: '+n+' in '+d,last:'Last meal',water:'＋ Water',waterAria:'Log water'}[k]),clock=()=> '9:02',dur=()=> '2 h 58 m',feAt=()=> '11:11',lastTxt=()=> '23:11',lineHTML=()=>'';${part('function cardHTML(d, sl){','\nfunction stageSheet(i)')}return cardHTML({},[]);`);
window.LowiFE={atTxt:()=> '17:00',goalLine:()=>'<div class="fe-goal">Goal 17:49 h · ends at 17:00</div>'};
window.LowiFastStop={stopPill:()=>'<button class="fst-stop">Stop</button>',bigBtn:()=>'<button class="fst-btn btn primary">I just ate · end fast</button>'};
home.insertAdjacentHTML('beforeend',fast(window,esc));
home.insertAdjacentHTML('beforeend','<div id="g2hTiles">'+['Check-ins','Meals','Your plate','Medicine','Shopping','Extras'].map(x=>'<button class="g2h-tile"><span class="g2h-ic">'+icon+'</span><b>'+x+'</b></button>').join('')+'</div>');
// Production Scan markup and translations. Platform operations are deliberately inert.
const scanText=part('const B3_TX = {','\n(function(){');
let labels={};try{labels=new Function(scanText+';return B3_TX;')();}catch(e){labels={title:['Scan'],scanBig:['Scan a barcode'],scanBigS:['Packaged food'],plateBig:['Snap your plate'],plateBigS:['Any meal, no barcode'],photoBc:['Photo of the barcode'],typeBc:['Type the number'],dexTitle:['Field guide'],classics:['Classic foods'],brandsT:['Brands'],check:['Search']};}
const scan=new Function('tab','meal','esc','labels',`const $=s=>s==='#tab-scan'?tab:tab.querySelector(s),stats=()=>({mine:12,comm:13}),level=()=>({}),LI=()=>0,t=k=>(labels[k]||[k])[0],IC=new Proxy({},{get:()=>${JSON.stringify(icon)}}),loadComm=()=>Promise.resolve(false),nameSearch=()=>{},curTab=()=> 'scan';${part("let captureMode = 'barcode';",'\nconst curTab =')}captureMode=meal;renderTab();`);
let mode='barcode';const renderScan=()=>scan(D.getElementById('tab-scan'),mode,esc,labels);renderScan();
// A representative Move screen uses the production compactor synchronously.
const mv=D.getElementById('tab-move');mv.innerHTML='<div id="mv-screen" class="tabmode on"></div>';
function renderMove(){const s=D.getElementById('mv-screen');s.innerHTML='<div class="stack"><div class="mv-head"><div class="h1">Move</div></div><div class="card goldline mv-hero"><div class="mv-row"><span class="mv-ic">'+icon+'</span><div><div class="tiny gold">No getting up</div><div class="h3">In-Bed Training</div></div></div><button class="btn primary mv-go">▶ Start 5-min In-Bed Training</button><div class="mv-row mv-mins">'+[5,10,15,20,30,45,60].map(n=>'<button class="chip">'+n+' min</button>').join('')+'</div></div><div class="mv-quick"><div class="tiny">Or tap one to start now</div><div class="mv-fmts">'+['Desk Spike Breaker','Seated Strength','Walk Anywhere','Walk and Lift'].map(n=>'<button class="mv-fmt"><span class="mv-ic">'+icon+'</span><span><b>'+n+'</b><span class="small">Session details</span></span><span class="mv-fmt-go">▶</span></button>').join('')+'</div></div><div class="mv-kit">Your equipment</div><p class="foot">Safety</p></div>';if(window.LowiG2)LowiG2.prepare(s);}
new Function(parsed.getElementById('g2js').textContent)();renderMove();
// Real shuffle logic, two deterministic image candidates, no XP or remote writes.
const svg=(color,letter)=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="'+color+'"/><text x="120" y="140" text-anchor="middle" font-size="80" fill="white">'+letter+'</text></svg>');
const foods=[{id:'a',n:'Snack A',buy:true,img:svg('#c79251','A')},{id:'b',n:'Snack B',buy:true,img:svg('#629f92','B')}];let pickIndex=0;
D.getElementById('tab-shelf').innerHTML='<h1>Cook</h1><p class="qa-preview-note">Buy · two-image shuffle check</p><div class="r5-stage has" id="r5Stage"><i class="r5-ring"></i><div class="r5-win"><div id="r5Strip" class="r5-strip"><div class="r5-cell"><img src="'+foods[0].img+'"></div></div></div></div><button id="r5Go" class="btn primary r5-go"><span>Shuffle again</span></button><div id="r5Pick"></div><p id="qaSpinState" role="status">Ready</p>';
window.LowiSwaflo={prefs:()=>({mode:'buy'}),pool:p=>p,saveBuy(){}};
const shuffle=new Function('foods',`const r5$=s=>document.querySelector(s),R5={},r5save=()=>{},fPick=()=>foods[Math.round(Math.random())],fPool=()=>foods,fRevealHTML=f=>'<p>'+f.n+'</p>';let fSpinning=false;${part('function fShuffle(instant){','function fShowPick')}return fShuffle;`)(foods);
D.getElementById('r5Go').onclick=()=>{shuffle();D.getElementById('qaSpinState').textContent='Shuffling';setTimeout(()=>{D.getElementById('qaSpinState').textContent='Settled';},1450);};
const S={xp:1432,ledger:[],logs:[],herb:{stageIndex:3},user:{name:'Layout fixture',bday:'1994-03-09',mbti:'INFP'}};
window.LowiR2={S:()=>S,X:()=>({state:()=>({uid:'mobile-layout-qa'})}),toast:()=>{}};
localStorage.removeItem('lowi.herb.tamagotchi.v2:mobile-layout-qa');
for(const f of ['herb-config.js','herb-core.js','herb-tamagotchi-core.js','herb-tamagotchi.js'])await new Promise((resolve,reject)=>{const s=D.createElement('script');s.src='../'+f;s.onload=resolve;s.onerror=reject;D.body.append(s);});
D.addEventListener('click',e=>{const tab=e.target.closest('.tb[data-tab]');if(tab){const key=tab.dataset.tab;D.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+key));nav.querySelectorAll('.tb').forEach(t=>t.classList.toggle('active',t===tab));if(key==='move')renderMove();LowiHerbTamagotchi.refresh();}
const choice=e.target.closest('[data-b3="mode"]');if(choice){mode=choice.dataset.mode;renderScan();}});
nav.querySelector('[data-tab="home"]').classList.add('active');
})().catch(e=>{document.body.insertAdjacentHTML('beforeend','<pre role="alert">'+String(e)+'</pre>');console.error(e);});
