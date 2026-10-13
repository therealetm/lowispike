/* Reads the existing XP total. No second XP ledger, deductions or astrology health rules. */
(function(root){
  'use strict';
  const C=typeof module==='object'&&module.exports?require('./herb-config.js'):root.LOWI_HERB_CONFIG;
  const validXP=x=>Number.isFinite(+x)?Math.max(0,+x):0;
  function stage(xp,retained){
    xp=validXP(xp);let index=0;
    C.stages.forEach((s,i)=>{if(xp>=s.xp)index=i;});
    index=Math.max(index,Math.min(C.stages.length-1,Math.max(0,Math.floor(+retained||0))));
    const current=C.stages[index],next=C.stages[index+1]||null;
    return {index,current,next,xp,left:next?Math.max(0,next.xp-xp):0,progress:next?Math.max(0,Math.min(1,(xp-current.xp)/(next.xp-current.xp))):1};
  }
  const signs=[['Capricorn','♑','earth',1,19],['Aquarius','♒','air',2,18],['Pisces','♓','water',3,20],['Aries','♈','fire',4,19],['Taurus','♉','earth',5,20],['Gemini','♊','air',6,20],['Cancer','♋','water',7,22],['Leo','♌','fire',8,22],['Virgo','♍','earth',9,22],['Libra','♎','air',10,22],['Scorpio','♏','water',11,21],['Sagittarius','♐','fire',12,21],['Capricorn','♑','earth',13,0]];
  const palettes={earth:{a:'#8bcfa4',b:'#dfc886',suggestion:'Sage'},water:{a:'#78d6da',b:'#aca2ed',suggestion:'Misty'},fire:{a:'#edbc73',b:'#d698bd',suggestion:'Ember'},air:{a:'#a4cce9',b:'#c6a4e4',suggestion:'Zephyr'},neutral:{a:'#8dcfbc',b:'#c4b1eb',suggestion:'Minti'}};
  function zodiac(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
    const [y,m,d]=date.split('-').map(Number),v=new Date(y,m-1,d);
    if(m<1||m>12||d<1||v.getMonth()!==m-1||v.getDate()!==d)return null;
    const s=d<=signs[m-1][4]?signs[m-1]:signs[m];return {name:s[0],symbol:s[1],element:s[2]};
  }
  function flavor(profile,personalize){
    profile=profile||{};const z=personalize===false?null:zodiac(profile.bday),mb=personalize===false?'':String(profile.mbti||profile.personality||'').toUpperCase();
    const type=/^[IE][NS][TF][JP]$/.test(mb)?mb:'';
    return {zodiac:z,mbti:type,palette:palettes[z?z.element:'neutral'],detail:type?(type[0]==='I'?'moon':'star'):'leaf',voice:type?(type[2]==='T'?'practical':'warm'):'warm'};
  }
  function meaningful(e){return !!e&&+e.amt>0&&Number.isFinite(+e.ts)&&/meal|swap|recipe|cook|move|walk|step|quest|check.?in|glow|r3a_|fast|e1:/i.test((e.src||'')+' '+(e.label||''));}
  function sync(s,now){
    if(!s||typeof s!=='object')return null;now=now||Date.now();
    const initialized=!!s.herb,prior=initialized?s.herb.stageIndex:undefined;
    if(!s.herb||typeof s.herb!=='object')s.herb={name:'',personalize:true};
    const g=stage(s.xp,prior);s.herb.version=C.version;s.herb.stageIndex=g.index;
    if(s.herb.personalize===undefined)s.herb.personalize=true;
    const stamps=(s.ledger||[]).filter(meaningful).map(e=>+e.ts).concat((s.logs||[]).map(l=>+l.ts)).filter(t=>t>0&&t<=now);
    const last=stamps.length?Math.max(...stamps):0;
    if(last)s.herb.lastActionAt=Math.max(+s.herb.lastActionAt||0,last);
    const actionAt=+s.herb.lastActionAt||0;
    return {...g,flavor:flavor(s.user,s.herb.personalize),name:String(s.herb.name||'').slice(0,24),dim:!!actionAt&&now-actionAt>C.gentleDimAfterHours*3600000,evolved:initialized&&g.index>(+prior||0)};
  }
  function hasReward(ledger,eventId){return !!eventId&&(ledger||[]).some(e=>e.eventId===eventId);}
  const api={stage,zodiac,flavor,sync,meaningful,hasReward};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiHerbCore=api;
})(typeof window!=='undefined'?window:globalThis);
