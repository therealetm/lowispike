/* LOWiSPIKE birth companion (Oct 16, 2026, Eman: "their final form is determined by their birthday, their star sign...
   so that everyone who uses our stuff always gets a different-looking companion. It's not a she nor a him. It's an entity.")
   Pure rules, no DOM: runs in the page (window.LowiBirthCompanionCore) and in node tests (module.exports).

   THE FORMULA (deterministic: the same birthday + time gives the same companion on every device)
   1. sign        western star sign from the birth date (same edges as herb-identity-core.js and index.html zodiac()).
   2. colour      the sign's colour pair (the same colours as LowiGlass / LS_PAL in index.html), hue nudged by up to
                  +-14 degrees from the seed, so two Pisces never share the exact shade.
   3. motif       the sign's mythology feature, drawn on every companion of that sign (ram curls, bull horns, twin orbs,
                  moon claws, sun mane, star wheat, balance halo, scorpion tail, archer's arrow tail, sea-goat fin,
                  water crest, fish fins).
   4. personality element of the sign (fire/earth/air/water = Spark/Root/Breeze/Tide)
                  x rhythm (birth hour: dawn 5-10, day 11-16, dusk 17-22, night 23-4; no time given -> weekday of birth)
                  x modality of the sign (cardinal leads the way / fixed never gives up / mutable goes with the flow)
                  = 4 x 4 x 3 = 48 personality types, e.g. "Dusk Tide · goes with the flow".
   5. look        seed = FNV-1a 32-bit hash of "YYYY-MM-DD|HH:MM" (time empty when not given) -> mulberry32 PRNG, which picks
                  body (8) x eyes (7) x mouth (4) x markings (7) x aura (5) x accessory (8) x particles (5) x hue (29)
                  plus size and squish: about 4.5 million looks before the sign colour and motif are added.
   6. name        metabolic/cellular syllable + the sign's mythic root + an ending, or mythic root + a cellular tail,
                  or two words. Shuffle n picks another name from the same seed; the look never changes on a shuffle.
   The companion is an entity: copy uses its name or "it" (de "es", es neutral phrasing), never she/he. */
(function(root){
'use strict';
const LANGS=['en','de','es'];
const L=l=>{l=String(l||'').slice(0,2).toLowerCase();return LANGS.includes(l)?l:'en';};

/* [key, element, modality, glyph, colour a, colour b, colour name en/de/es, mythic roots] */
const SIGNS={
 aries:['fire','cardinal','\u2648','#ff7a63','#ffb36b',['coral red','Korallenrot','rojo coral'],['Chrysa','Phrix','Aren']],
 taurus:['earth','fixed','\u2649','#7fd6a3','#e7d9a8',['sage green','Salbeigr\u00fcn','verde salvia'],['Europa','Apis','Taur']],
 gemini:['air','mutable','\u264a','#ffe27a','#9fe6ff',['lemon and sky','Zitrone und Himmel','lim\u00f3n y cielo'],['Castor','Pollux','Dios']],
 cancer:['water','cardinal','\u264b','#b9d4ff','#f0e6ff',['moon silver','Mondsilber','plata lunar'],['Karkin','Luna','Hera']],
 leo:['fire','fixed','\u264c','#ffc24d','#ff8a3d',['sun gold','Sonnengold','oro solar'],['Nemea','Leon','Sol']],
 virgo:['earth','mutable','\u264d','#9fd8b8','#d8c9a3',['mint','Minze','menta'],['Astrae','Spica','Dike']],
 libra:['air','cardinal','\u264e','#ffb3d1','#c9b8ff',['rose','Rosa','rosa'],['Themis','Zuben','Libr']],
 scorpio:['water','fixed','\u264f','#c86bff','#ff5f8f',['magenta','Magenta','magenta'],['Antar','Selket','Skorp']],
 sagittarius:['fire','mutable','\u2650','#a98bff','#ff9f6b',['violet','Violett','violeta'],['Chiron','Krotos','Sagit']],
 capricorn:['earth','cardinal','\u2651','#8fc3b4','#d4c6a2',['jade','Jade','jade'],['Amalth','Aigi','Pan']],
 aquarius:['air','fixed','\u2652','#5fd8ff','#8f9bff',['electric blue','Elektroblau','azul el\u00e9ctrico'],['Ganym','Hydra','Aqua']],
 pisces:['water','mutable','\u2653','#7fe0e0','#b8a6ff',['seafoam','Meeresschaum','espuma de mar'],['Ichthy','Aphro','Eros']]
};
const SIGN_KEYS=Object.keys(SIGNS);
const EDGES=[['capricorn',1,19],['aquarius',2,18],['pisces',3,20],['aries',4,19],['taurus',5,20],['gemini',6,20],['cancer',7,22],['leo',8,22],['virgo',9,22],['libra',10,22],['scorpio',11,21],['sagittarius',12,21],['capricorn',13,0]];
const SIGN_LABEL={
 en:{aries:'Aries',taurus:'Taurus',gemini:'Gemini',cancer:'Cancer',leo:'Leo',virgo:'Virgo',libra:'Libra',scorpio:'Scorpio',sagittarius:'Sagittarius',capricorn:'Capricorn',aquarius:'Aquarius',pisces:'Pisces'},
 de:{aries:'Widder',taurus:'Stier',gemini:'Zwillinge',cancer:'Krebs',leo:'L\u00f6we',virgo:'Jungfrau',libra:'Waage',scorpio:'Skorpion',sagittarius:'Sch\u00fctze',capricorn:'Steinbock',aquarius:'Wassermann',pisces:'Fische'},
 es:{aries:'Aries',taurus:'Tauro',gemini:'G\u00e9minis',cancer:'C\u00e1ncer',leo:'Leo',virgo:'Virgo',libra:'Libra',scorpio:'Escorpio',sagittarius:'Sagitario',capricorn:'Capricornio',aquarius:'Acuario',pisces:'Piscis'}};
const MYTH={
 en:{aries:'the golden ram',taurus:'the bull of Europa',gemini:'the twins Castor and Pollux',cancer:'the moon crab of Hera',leo:'the sun lion of Nemea',virgo:'the star harvest of Astraea',libra:'the scales of Themis',scorpio:'the star scorpion Antares',sagittarius:'the archer Chiron',capricorn:'the sea goat Amalthea',aquarius:'the water bearer Ganymede',pisces:'the two fish of Aphrodite and Eros'},
 de:{aries:'der goldene Widder',taurus:'der Stier der Europa',gemini:'die Zwillinge Castor und Pollux',cancer:'der Mondkrebs der Hera',leo:'der Sonnenl\u00f6we von Nemea',virgo:'die Sternenernte der Astraea',libra:'die Waage der Themis',scorpio:'der Sternskorpion Antares',sagittarius:'der Bogensch\u00fctze Chiron',capricorn:'die Meeresziege Amalthea',aquarius:'der Wassertr\u00e4ger Ganymed',pisces:'die zwei Fische von Aphrodite und Eros'},
 es:{aries:'el carnero dorado',taurus:'el toro de Europa',gemini:'los gemelos C\u00e1stor y P\u00f3lux',cancer:'el cangrejo lunar de Hera',leo:'el le\u00f3n solar de Nemea',virgo:'la cosecha de estrellas de Astrea',libra:'la balanza de Temis',scorpio:'el escorpi\u00f3n estelar Antares',sagittarius:'el arquero Quir\u00f3n',capricorn:'la cabra marina Amaltea',aquarius:'el aguador Gan\u00edmedes',pisces:'los dos peces de Afrodita y Eros'}};

/* personality: every line is gender-neutral (German predicates, Spanish noun/verb phrasing, no -o/-a adjectives) */
const CORE={
 en:{fire:['Spark','Brave and quick to cheer.'],earth:['Root','Steady, cozy and patient.'],air:['Breeze','Curious, chatty and full of ideas.'],water:['Tide','Gentle, caring and intuitive.']},
 de:{fire:['funke','Mutig und schnell begeistert.'],earth:['wurzel','Best\u00e4ndig, gem\u00fctlich und geduldig.'],air:['brise','Neugierig, gespr\u00e4chig und voller Ideen.'],water:['welle','Sanft, f\u00fcrsorglich und intuitiv.']},
 es:{fire:['Chispa','Tiene valor y se entusiasma r\u00e1pido.'],earth:['Ra\u00edz','Tiene calma, constancia y paciencia.'],air:['Brisa','Tiene curiosidad, charla e ideas sin fin.'],water:['Marea','Tiene ternura, cuidado e intuici\u00f3n.']}};
const RHYTHM={
 en:{dawn:['Dawn','Wakes up with the sun.'],day:['Sun','Loves bright, busy days.'],dusk:['Dusk','Dreams big in the evening.'],night:['Night','Wide awake when the stars come out.']},
 de:{dawn:['Morgen','Wacht mit der Sonne auf.'],day:['Sonnen','Liebt helle, volle Tage.'],dusk:['Abend','Tr\u00e4umt abends gro\u00df.'],night:['Nacht','Hellwach, wenn die Sterne leuchten.']},
 es:{dawn:['del alba','Despierta con el sol.'],day:['del sol','Disfruta los d\u00edas llenos de luz.'],dusk:['del ocaso','Sue\u00f1a a lo grande al anochecer.'],night:['de la noche','Cobra vida cuando salen las estrellas.']}};
const MODAL={
 en:{cardinal:'Leads the way.',fixed:'Never gives up.',mutable:'Goes with the flow.'},
 de:{cardinal:'Geht voran.',fixed:'Gibt nie auf.',mutable:'Passt sich jedem Tag an.'},
 es:{cardinal:'Abre el camino.',fixed:'Nunca se rinde.',mutable:'Se adapta a cada d\u00eda.'}};

/* name parts: metabolic / cellular words + the sign's mythic roots */
const META=['Mito','Glyco','Cyto','Ribo','Insu','Lepti','Kreb','Keto','Endo','Lyso','Myo','Axo','Vesi','Lipo','Enzy','Hemo','Gluca','Nucle'];
const TAILS=['cyte','some','zyme','plast','lin','gen','mer','dria','lix','tin'];
const ENDS=['ix','el','yn','is','i','ae','eon','ux','en','ie'];

/* ---------- hashing + PRNG ---------- */
function fnv(str){let h=0x811c9dc5;str=String(str);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h>>>0;}
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const pickI=(r,n)=>Math.floor(r()*n)%n;

/* ---------- inputs ---------- */
function validDate(b){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(b||'')))return '';const [y,m,d]=b.split('-').map(Number);const v=new Date(y,m-1,d);
 if(y<1900||y>2100||v.getMonth()!==m-1||v.getDate()!==d)return '';return b;}
function validTime(t){t=String(t||'').trim();const m=/^(\d{1,2}):(\d{2})/.exec(t);if(!m)return '';const h=+m[1],mi=+m[2];if(h>23||mi>59)return '';return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0');}
function signOf(b){b=validDate(b);if(!b)return '';const [,m,d]=b.split('-').map(Number);return d<=EDGES[m-1][2]?EDGES[m-1][0]:EDGES[m][0];}
function rhythmOf(b,t){t=validTime(t);if(t){const h=+t.slice(0,2);return h>=5&&h<=10?'dawn':h>=11&&h<=16?'day':h>=17&&h<=22?'dusk':'night';}
 const [y,m,d]=validDate(b).split('-').map(Number);const dow=new Date(y,m-1,d).getDay();return ['night','dawn','day','dusk'][dow%4];}
/* Oct 19: the optional personality type (16 types, MBTI letters) is a third input. Without a type the seed is exactly
   the old one, so every companion born before keeps its look and name; with a type, same-birthday twins split 16 ways. */
const TYPES=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
function validType(t){t=String(t||'').trim().toUpperCase().slice(0,4);return TYPES.indexOf(t)>=0?t:'';}
function seedOf(b,t,m){m=validType(m);return fnv(validDate(b)+'|'+validTime(t)+(m?'|'+m:''));}

/* ---------- colour ---------- */
function hexToHsl(h){const r=parseInt(h.substr(1,2),16)/255,g=parseInt(h.substr(3,2),16)/255,b=parseInt(h.substr(5,2),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let H=0,S=0;const Lg=(mx+mn)/2;
 if(mx!==mn){const d=mx-mn;S=Lg>.5?d/(2-mx-mn):d/(mx+mn);H=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;H*=60;}return [H,S,Lg];}
function hslToHex(H,S,Lg){H=((H%360)+360)%360;const c=(1-Math.abs(2*Lg-1))*S,x=c*(1-Math.abs((H/60)%2-1)),m=Lg-c/2;let r=0,g=0,b=0;
 if(H<60)[r,g,b]=[c,x,0];else if(H<120)[r,g,b]=[x,c,0];else if(H<180)[r,g,b]=[0,c,x];else if(H<240)[r,g,b]=[0,x,c];else if(H<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];
 return '#'+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');}
function shift(hex,dh,dl){const [h,s,l]=hexToHsl(hex);return hslToHex(h+dh,Math.min(1,s),Math.max(.25,Math.min(.88,l+(dl||0))));}

/* ---------- names ---------- */
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
const trimRoot=s=>{s=s.toLowerCase().replace(/[aeiouy]+$/,'');return s.slice(0,5);};
function tidy(n){return n.replace(/([a-z])\1\1+/gi,'$1$1').replace(/([aeiouy])([aeiouy])([aeiouy])/gi,'$1$2');}
function nameFor(seed,sign,n){const r=rng((seed^Math.imul((n|0)+1,0x9E3779B1))>>>0),roots=(SIGNS[sign]||SIGNS.pisces)[6];
 for(let tries=0;tries<6;tries++){const p=pickI(r,3),meta=META[pickI(r,META.length)],rt=roots[pickI(r,roots.length)];let out='';
  if(p===0)out=cap(meta+trimRoot(rt)+ENDS[pickI(r,ENDS.length)]);
  else if(p===1)out=cap(rt+TAILS[pickI(r,TAILS.length)]);
  else out=cap(meta)+' '+cap(rt);
  out=tidy(out);if(out.replace(/\s/g,'').length<=13)return out;}
 return cap(roots[0]);}

/* ---------- the companion ---------- */
function generate(o){o=o||{};const bday=validDate(o.bday);if(!bday)return null;const btime=validTime(o.btime),mbti=validType(o.mbti),sign=signOf(bday),S=SIGNS[sign];
 const seed=seedOf(bday,btime,mbti),r=rng(seed);
 const look={body:pickI(r,8),eyes:pickI(r,7),mouth:pickI(r,4),marks:pickI(r,7),aura:pickI(r,5),acc:pickI(r,8),parts:pickI(r,5),hue:pickI(r,29)-14,size:+(0.88+r()*0.2).toFixed(3),squish:+(0.9+r()*0.2).toFixed(3),wob:+(r()*6.283).toFixed(3)};
 const a=shift(S[3],look.hue,0),b=shift(S[4],look.hue*.6,0),deep=shift(S[3],look.hue,-.18);
 const n=Math.max(0,o.n|0),rh=rhythmOf(bday,btime);
 return {v:1,bday,btime,mbti,seed,n,sign,element:S[0],modality:S[1],glyph:S[2],rhythm:rh,type:S[0]+'-'+rh+'-'+S[1],palette:{a,b,deep,base:[S[3],S[4]]},look,
  name:o.name?cleanName(o.name):nameFor(seed,sign,n),autoName:nameFor(seed,sign,n)};}
function cleanName(v){return String(v||'').replace(/[<>"'`\\]/g,'').replace(/\s+/g,' ').trim().slice(0,24);}
function personality(c,lang){lang=L(lang);if(!c)return null;const co=CORE[lang][c.element],rh=RHYTHM[lang][c.rhythm],mo=MODAL[lang][c.modality];
 const title=lang==='de'?rh[0]+co[0]:lang==='es'?co[0]+' '+rh[0]:rh[0]+' '+co[0];
 return {title,line:co[1]+' '+rh[1]+' '+mo,code:c.type};}
function signLabel(s,lang){return (SIGN_LABEL[L(lang)]||SIGN_LABEL.en)[s]||'';}
function myth(s,lang){return (MYTH[L(lang)]||MYTH.en)[s]||'';}
function colourName(s,lang){const S=SIGNS[s];return S?S[5][LANGS.indexOf(L(lang))]:'';}

/* Misty: the fallback for existing users who have not brought their own companion to life yet */
const MISTY={v:1,misty:true,name:'Misty',sign:'pisces',element:'water',modality:'mutable',glyph:'\u2653',rhythm:'dusk',type:'water-dusk-mutable',seed:0,n:0,
 palette:{a:'#8fdcff',b:'#a9b8ff',deep:'#4f8fd6',base:['#8fdcff','#a9b8ff']},look:{body:1,eyes:0,mouth:0,marks:0,aura:0,acc:5,parts:3,hue:0,size:1,squish:1,wob:0}};

/* ---------- art: one SVG in the app's glass-bubble style ---------- */
let UID=0;
function bodyPath(look,R){const pts=[],N=56,k=look.body,w=look.wob;
 for(let i=0;i<N;i++){const t=i/N*Math.PI*2,ct=Math.cos(t),st=Math.sin(t);let r=R*(1+0.035*Math.sin(3*t+w)+0.025*Math.cos(5*t+w*2));
  if(k===1)r*=1+0.28*Math.max(0,-st)*Math.max(0,-st);          /* comet drop, tip up */
  else if(k===2)r*=1+0.14*ct*ct-0.06*st*st;                     /* bean, wide */
  else if(k===3)r*=1+0.13*Math.cos(5*t-Math.PI/2);              /* soft star */
  else if(k===4)r*=1+0.1*Math.max(0,-st)*Math.cos(6*t);          /* cloud top */
  else if(k===5)r*=1+0.12*st;                                   /* egg, heavy bottom */
  else if(k===6)r*=1+0.26*Math.max(0,st)*Math.max(0,st);         /* drop, tip down */
  else if(k===7)r*=st>0?1-0.22*st*st:1;                         /* mochi, flat bottom */
  pts.push([+(ct*r*look.squish).toFixed(1),+(st*r/look.squish).toFixed(1)]);}
 return 'M'+pts.map(p=>p.join(' ')).join('L')+'Z';}
function motif(sign,R,p,id){const A=p.a,B=p.b,s=R/24;const g=d=>'<g transform="scale('+s.toFixed(3)+')">'+d+'</g>';
 switch(sign){
  case 'aries':return g('<path d="M-15 -16c-9-6-14 4-7 8 5 3 8-3 4-5" fill="none" stroke="'+B+'" stroke-width="3.4" stroke-linecap="round"/><path d="M15 -16c9-6 14 4 7 8-5 3-8-3-4-5" fill="none" stroke="'+B+'" stroke-width="3.4" stroke-linecap="round"/>');
  case 'taurus':return g('<path d="M-11 -19c-4-5-5-10-2-14 1 5 4 8 7 10z" fill="'+B+'"/><path d="M11 -19c4-5 5-10 2-14-1 5-4 8-7 10z" fill="'+B+'"/>');
  case 'gemini':return g('<circle class="lc-orbit" cx="-27" cy="-10" r="4" fill="'+B+'"/><circle class="lc-orbit lc-o2" cx="27" cy="-10" r="4" fill="'+A+'"/>');
  case 'cancer':return g('<path d="M-25 -2a8 8 0 1 0 2-12l-2 5z" fill="'+B+'" opacity=".9"/><path d="M25 -2a8 8 0 1 1-2-12l2 5z" fill="'+B+'" opacity=".9"/>');
  case 'leo':{let d='';for(let i=0;i<14;i++){const t=i/14*Math.PI*2;d+='<circle cx="'+(Math.cos(t)*27).toFixed(1)+'" cy="'+(Math.sin(t)*27).toFixed(1)+'" r="6" fill="'+(i%2?A:B)+'" opacity=".85"/>';}return g(d);}
  case 'virgo':return g('<path d="M0 -22v-12" stroke="'+B+'" stroke-width="2" stroke-linecap="round"/><ellipse cx="-3.5" cy="-30" rx="2.4" ry="4" transform="rotate(-30 -3.5 -30)" fill="'+B+'"/><ellipse cx="3.5" cy="-27" rx="2.4" ry="4" transform="rotate(30 3.5 -27)" fill="'+B+'"/><ellipse cx="0" cy="-36" rx="2.2" ry="3.6" fill="'+A+'"/>');
  case 'libra':return g('<path d="M-16 -31h32" stroke="'+B+'" stroke-width="2.2" stroke-linecap="round"/><path d="M0 -31v6" stroke="'+B+'" stroke-width="2"/><circle cx="-16" cy="-27" r="3.2" fill="'+A+'"/><circle cx="16" cy="-27" r="3.2" fill="'+A+'"/>');
  case 'scorpio':return g('<path d="M18 14c12 4 16-8 10-16-3-4-8-3-8 1" fill="none" stroke="'+B+'" stroke-width="4" stroke-linecap="round"/><path d="M18 -3l4-5 2 6z" fill="'+B+'"/>');
  case 'sagittarius':return g('<path d="M-18 16l-16 14" stroke="'+B+'" stroke-width="3" stroke-linecap="round" opacity=".8"/><path d="M-31 22l-5 10 10-4" fill="none" stroke="'+B+'" stroke-width="2.4" stroke-linejoin="round"/><path d="M-22 19l-18 4M-22 19l-6 16" stroke="'+A+'" stroke-width="1.4" opacity=".6"/>');
  case 'capricorn':return g('<path d="M4 22c6 6 12 6 16 2-3 6-1 10 4 10-7 2-13-1-16-6" fill="'+B+'" opacity=".9"/>');
  case 'aquarius':return g('<path d="M-16 -24c4-5 8-5 11 0s7 5 11 0 8-5 10-1" fill="none" stroke="'+B+'" stroke-width="3" stroke-linecap="round"/>');
  case 'pisces':return g('<path d="M-23 2c-10-8-12 6-4 6-6 4 0 10 6 2z" fill="'+B+'" opacity=".9"/><path d="M23 2c10-8 12 6 4 6 6 4 0 10-6 2z" fill="'+B+'" opacity=".9"/>');}
 return '';}
function eyes(k,ink){const e=(x)=>'<g transform="translate('+x+' -2)">';const hi='<circle cx="1.3" cy="-1.5" r="1.2" fill="#fff"/>';
 switch(k){
  case 0:return e(-8)+'<circle r="3.4" fill="'+ink+'"/>'+hi+'</g>'+e(8)+'<circle r="3.4" fill="'+ink+'"/>'+hi+'</g>';
  case 1:return e(-7.5)+'<ellipse rx="2.6" ry="4.4" fill="'+ink+'"/>'+hi+'</g>'+e(7.5)+'<ellipse rx="2.6" ry="4.4" fill="'+ink+'"/>'+hi+'</g>';
  case 2:return '<path d="M-11 -1q3-5 6 0M5 -1q3-5 6 0" fill="none" stroke="'+ink+'" stroke-width="2.2" stroke-linecap="round"/>';
  case 3:{const st='<circle r="3.8" fill="'+ink+'"/><path d="M0 -2.6L.7 -.7 2.6 0 .7 .7 0 2.6-.7 .7-2.6 0-.7-.7z" fill="#fff"/>';return e(-8)+st+'</g>'+e(8)+st+'</g>';}
  case 4:{const st='<circle r="4.6" fill="'+ink+'"/><circle cx="1.6" cy="-1.8" r="1.6" fill="#fff"/><circle cx="-1.6" cy="1.8" r=".8" fill="#fff"/>';return e(-8.5)+st+'</g>'+e(8.5)+st+'</g>';}
  case 5:{const st='<circle r="3.6" fill="'+ink+'"/><path d="M-4 -.6h8" stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"/>';return e(-8)+st+'</g>'+e(8)+st+'</g>';}
  default:return '<g transform="translate(0 -3)"><circle r="6" fill="#fff" opacity=".9"/><circle r="4" fill="'+ink+'"/><circle cx="1.5" cy="-1.6" r="1.4" fill="#fff"/></g>';}}
function mouth(k,ink){switch(k){case 0:return '<path d="M-3 6q3 3 6 0" fill="none" stroke="'+ink+'" stroke-width="1.8" stroke-linecap="round"/>';
  case 1:return '<ellipse cx="0" cy="7" rx="2" ry="2.4" fill="'+ink+'"/>';case 2:return '<path d="M-4 6q2 2.4 4 0q2 2.4 4 0" fill="none" stroke="'+ink+'" stroke-width="1.6" stroke-linecap="round"/>';
  default:return '<path d="M-3.4 5.6q3.4 4 6.8 0z" fill="'+ink+'"/><path d="M-1.4 7.6q1.4 1.4 2.8 0" fill="#ff8fb4"/>';}}
function marks(k,p,R,r,glyph){const B=p.b,out=[];switch(k){
  case 1:for(let i=0;i<3;i++)out.push('<circle cx="'+((r()-.5)*R*1.1).toFixed(1)+'" cy="'+(R*.25+(r()-.5)*R*.6).toFixed(1)+'" r="'+(1.6+r()*2.2).toFixed(1)+'" fill="'+B+'" opacity=".55"/>');break;
  case 2:out.push('<ellipse cx="0" cy="'+(R*.45).toFixed(1)+'" rx="'+(R*.5).toFixed(1)+'" ry="'+(R*.32).toFixed(1)+'" fill="#fff" opacity=".22"/>');break;
  case 3:out.push('<path d="M'+(-R*.75).toFixed(1)+' '+(-R*.45).toFixed(1)+'q'+(R*.75).toFixed(1)+' -'+(R*.3).toFixed(1)+' '+(R*1.5).toFixed(1)+' 0M'+(-R*.8).toFixed(1)+' '+(R*.55).toFixed(1)+'q'+(R*.8).toFixed(1)+' '+(R*.3).toFixed(1)+' '+(R*1.6).toFixed(1)+' 0" fill="none" stroke="'+B+'" stroke-width="2.2" opacity=".5" stroke-linecap="round"/>');break;
  case 4:[[-13,5],[-11,8],[-15,8],[13,5],[11,8],[15,8]].forEach(q=>out.push('<circle cx="'+q[0]+'" cy="'+q[1]+'" r=".9" fill="'+p.deep+'" opacity=".7"/>'));break;
  case 5:{const y=R*.5,pts=[[-R*.3,y+2],[-R*.05,y-3],[R*.18,y+1],[R*.34,y-2]].map(q=>q.map(v=>+v.toFixed(1)));/* a tiny constellation on the belly */
   out.push('<path d="M'+pts.map(q=>q.join(' ')).join('L')+'" fill="none" stroke="#fff" stroke-width=".7" opacity=".45"/>'+pts.map(q=>'<circle cx="'+q[0]+'" cy="'+q[1]+'" r="1.2" fill="#fff" opacity=".75"/>').join(''));break;}
  case 6:out.push('<g opacity=".5" transform="translate('+(R*.42).toFixed(1)+' '+(R*.48).toFixed(1)+') rotate(-25)"><ellipse rx="5" ry="2.6" fill="none" stroke="'+B+'" stroke-width="1.2"/><path d="M-3.4 0q1-1.8 2 0t2 0 2 0" fill="none" stroke="'+B+'" stroke-width=".9"/></g>');break;}
 return out.join('');}
function accessory(k,p,R,id){const A=p.a,B=p.b;switch(k){
  case 1:return '<path d="M0 '+(-R)+'q-3 -8 2 -13" fill="none" stroke="'+B+'" stroke-width="1.8" stroke-linecap="round"/><circle class="lc-pulse" cx="2" cy="'+(-R-13)+'" r="3.2" fill="#fff" stroke="'+A+'" stroke-width="1.4"/>';
  case 2:return '<g class="lc-spin"><circle cx="'+(R+9)+'" cy="-6" r="3.6" fill="#eef4ff"/><circle cx="'+(R+10.4)+'" cy="-7" r="3" fill="'+p.deep+'" opacity=".55"/></g>';
  case 3:return '<path d="M0 '+(-R-12)+'l5 7-5 6-5-6z" fill="#fff" opacity=".85" stroke="'+A+'" stroke-width="1.2"/>';
  case 4:return [-7,0,7].map((x,i)=>'<circle cx="'+x+'" cy="'+(-R-4-(i===1?3:0))+'" r="2" fill="'+(i===1?'#fff':B)+'"/>').join('');
  case 5:return '<path d="M'+(R*.55)+' '+(R*.2)+'q'+(R*.9)+' '+(R*.2)+' '+(R*1.3)+' '+(R*.95)+'q-'+(R*.8)+' -'+(R*.15)+' -'+(R*1.2)+' -'+(R*.45)+'z" fill="url(#'+id+'t)" opacity=".8"/>';
  case 6:return '<path class="lc-pulse" d="M0 '+(-R-16)+'l1.8 4 4.2.4-3.2 2.8 1 4.2L0 '+(-R-6.8)+'l-3.8 2.4 1-4.2-3.2-2.8 4.2-.4z" fill="#fff6c8"/>';
  case 7:return '<ellipse cx="0" cy="'+(R*.15)+'" rx="'+(R*1.45)+'" ry="'+(R*.32)+'" fill="none" stroke="'+B+'" stroke-width="2" opacity=".7"/>';}
 return '';}
function particles(k,p,r){const out=[],A=p.a,B=p.b;for(let i=0;i<7;i++){const t=r()*Math.PI*2,d=26+r()*16,x=(60+Math.cos(t)*d).toFixed(1),y=(60+Math.sin(t)*d).toFixed(1),dl=(r()*3).toFixed(2);
  const c=i%2?A:B,st=' style="animation-delay:-'+dl+'s"';
  if(k===0)out.push('<path class="lc-tw"'+st+' transform="translate('+x+' '+y+')" d="M0 -3L.8 -.8 3 0 .8 .8 0 3-.8 .8-3 0-.8-.8z" fill="#fff"/>');
  else if(k===1)out.push('<circle class="lc-tw"'+st+' cx="'+x+'" cy="'+y+'" r="'+(1.4+r()*2).toFixed(1)+'" fill="none" stroke="'+c+'" stroke-width=".9"/>');
  else if(k===2)out.push('<g class="lc-tw"'+st+' transform="translate('+x+' '+y+')"><circle r="2.6" fill="'+c+'" opacity=".35"/><circle r="1" fill="'+c+'"/></g>');
  else if(k===3)out.push('<circle class="lc-tw"'+st+' cx="'+x+'" cy="'+y+'" r="'+(.6+r()*.9).toFixed(1)+'" fill="#fff"/>');
  else out.push('<path class="lc-tw"'+st+' transform="translate('+x+' '+y+') rotate(45)" d="M-1.6 -1.6h3.2v3.2h-3.2z" fill="'+c+'" opacity=".8"/>');}
 return out.join('');}
/* Oct 19 (E-man: "why wasn't the version shown in onboarding given to me?"): the companion's own pieces, in one place, so the
   reveal (svg below) and Home / Forms / care room / 3D sprite (cell-world.js compose) draw the very same companion: body shape,
   colours, sign motif, marks, cheeks, eyes, mouth, accessory, particles. Body pieces are in body units round (0,0) (R = its
   radius), particles round (60,60) of the 120 box. The rng is drawn in svg()'s old order (particles, then marks). */
function parts(c,id){c=c||MISTY;const p=c.palette,lk=c.look,R=+(22*lk.size).toFixed(1),r=rng((c.seed||7)^0xabcdef),ink='#0b1d3f';
 const pts=particles(lk.parts,p,r);
 return {R,ink,palette:p,sign:c.sign,
  grad:'<radialGradient id="'+id+'b" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="'+p.a+'"/><stop offset="1" stop-color="'+p.deep+'"/></radialGradient>'+
   '<linearGradient id="'+id+'t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p.a+'"/><stop offset="1" stop-color="'+p.b+'" stop-opacity="0"/></linearGradient>',
  parts:pts,motif:motif(c.sign,R,p,id),
  shape:'<path class="lc-shape" d="'+bodyPath(lk,R)+'" fill="url(#'+id+'b)" stroke="rgba(255,255,255,.55)" stroke-width="1"/>',
  marks:marks(lk.marks,p,R,r,c.glyph),
  cheeks:'<ellipse cx="-12.5" cy="5" rx="3.4" ry="2" fill="#ff9ec8" opacity=".4"/><ellipse cx="12.5" cy="5" rx="3.4" ry="2" fill="#ff9ec8" opacity=".4"/>',
  eyes:eyes(lk.eyes,ink),mouth:mouth(lk.mouth,ink),acc:accessory(lk.acc,p,R,id)};}
function svg(c,o){o=o||{};c=c||MISTY;const p=c.palette,lk=c.look,id='lc'+(++UID)+'x'+(c.seed%9973),q=parts(c,id);
 const aura=['<circle cx="60" cy="60" r="56" fill="url(#'+id+'g)"/>','<circle cx="60" cy="60" r="55" fill="none" stroke="'+p.a+'" stroke-width="1.4" opacity=".55"/>',
  '<circle cx="60" cy="60" r="55" fill="none" stroke="'+p.a+'" stroke-width="1" opacity=".5"/><circle cx="60" cy="60" r="58.5" fill="none" stroke="'+p.b+'" stroke-width=".8" opacity=".4"/>',
  Array.from({length:12},(_,i)=>{const t=i/12*Math.PI*2;return '<path d="M'+(60+Math.cos(t)*53).toFixed(1)+' '+(60+Math.sin(t)*53).toFixed(1)+'L'+(60+Math.cos(t)*59).toFixed(1)+' '+(60+Math.sin(t)*59).toFixed(1)+'" stroke="'+(i%2?p.a:p.b)+'" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>';}).join(''),
  Array.from({length:8},(_,i)=>'<ellipse cx="60" cy="5" rx="4" ry="6" transform="rotate('+(i*45)+' 60 60)" fill="'+(i%2?p.a:p.b)+'" opacity=".35"/>').join('')][lk.aura]||'';
 const label=o.label?'<title>'+String(o.label).replace(/[<&]/g,'')+'</title>':'';
 return '<svg class="lc-svg'+(o.cls?' '+o.cls:'')+'" viewBox="0 0 120 120" width="'+(o.size||120)+'" height="'+(o.size||120)+'"'+(o.label?' role="img" aria-label="'+String(o.label).replace(/["<&]/g,'')+'"':' aria-hidden="true"')+' data-lc-sign="'+c.sign+'">'+label+
  '<defs><radialGradient id="'+id+'g"><stop offset=".55" stop-color="'+p.a+'" stop-opacity="0"/><stop offset=".85" stop-color="'+p.a+'" stop-opacity=".28"/><stop offset="1" stop-color="'+p.a+'" stop-opacity="0"/></radialGradient>'+
  '<radialGradient id="'+id+'w" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".7" stop-color="'+p.a+'" stop-opacity=".06"/><stop offset="1" stop-color="'+p.b+'" stop-opacity=".22"/></radialGradient>'+
  '<linearGradient id="'+id+'r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p.a+'"/><stop offset="1" stop-color="'+p.b+'"/></linearGradient>'+
  q.grad+'</defs>'+
  '<g class="lc-aura">'+aura+'</g>'+
  '<circle class="lc-bubble" cx="60" cy="60" r="50" fill="url(#'+id+'w)" stroke="url(#'+id+'r)" stroke-width="1.6" stroke-opacity=".8"/>'+
  '<path d="M30 34a36 36 0 0 1 22-14" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>'+
  '<g class="lc-parts">'+q.parts+'</g>'+
  '<g class="lc-body" transform="translate(60 62)"><g class="lc-motif">'+q.motif+'</g>'+q.shape+q.marks+q.cheeks+
  '<g class="lc-face">'+q.eyes+q.mouth+'</g>'+q.acc+'</g></svg>';}
/* before the birthday: an entity nobody has seen yet. A spark of light in a bubble, no face, no colour, no name. */
function mysterySVG(o){o=o||{};return '<svg class="lc-svg lc-mystery'+(o.cls?' '+o.cls:'')+'" viewBox="0 0 120 120" width="'+(o.size||120)+'" height="'+(o.size||120)+'" aria-hidden="true">'+
 '<defs><radialGradient id="lcmS"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#dff3ff" stop-opacity=".9"/><stop offset=".6" stop-color="#9fd8ff" stop-opacity=".25"/><stop offset="1" stop-color="#9fd8ff" stop-opacity="0"/></radialGradient>'+
 '<radialGradient id="lcmW" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#9fb8ff" stop-opacity=".16"/></radialGradient></defs>'+
 '<circle class="lc-bubble" cx="60" cy="60" r="50" fill="url(#lcmW)" stroke="rgba(220,235,255,.55)" stroke-width="1.4"/><path d="M30 34a36 36 0 0 1 22-14" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".4"/>'+
 '<g class="lc-seedling"><circle cx="60" cy="62" r="26" fill="url(#lcmS)"/><path d="M60 46l2.6 13.4L76 62l-13.4 2.6L60 78l-2.6-13.4L44 62l13.4-2.6z" fill="#fff" opacity=".9"/></g>'+
 [[38,40],[84,44],[80,84],[40,82],[60,30]].map((q,i)=>'<circle class="lc-tw" style="animation-delay:-'+(i*.6)+'s" cx="'+q[0]+'" cy="'+q[1]+'" r="1.1" fill="#fff"/>').join('')+'</svg>';}

const api={SIGNS,SIGN_KEYS,LANGS,META,TAILS,ENDS,MISTY,fnv,rng,validDate,validTime,validType,TYPES,signOf,rhythmOf,seedOf,generate,nameFor,cleanName,personality,signLabel,myth,colourName,svg,parts,mysterySVG,shift};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LowiBirthCompanionCore=api;
})(typeof window!=='undefined'?window:(typeof self!=='undefined'?self:null));
