(function(root){
  'use strict';
  const C=typeof module==='object'&&module.exports?require('./herb-config.js'):root.LOWI_HERB_CONFIG;
  const K=typeof module==='object'&&module.exports?require('./herb-core.js'):root.LowiHerbCore;
  const ZODIAC=[['Aries','♈','fire'],['Taurus','♉','earth'],['Gemini','♊','air'],['Cancer','♋','water'],['Leo','♌','fire'],['Virgo','♍','earth'],['Libra','♎','air'],['Scorpio','♏','water'],['Sagittarius','♐','fire'],['Capricorn','♑','earth'],['Aquarius','♒','air'],['Pisces','♓','water']];
  const MBTI=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
  const lines={
    home:['Your little herb is keeping score of the good stuff.','Tiny choices, real progress — your herb sees it.','Your XP is turning into leaves right here.','Today is a good day for one small win.','Your herb is ready to grow with your next healthy action.','Keep it simple: one useful action is enough.'],
    foryou:['Community time — take what helps and leave the noise.','See what people found; your herb likes useful discoveries.','A good idea from the community can become your next win.','Browse, borrow, improve — no perfection required.','Your herb is listening for practical tips, not pressure.','Community discoveries can make the next choice easier.'],
    scan:['Scan first, then decide — curiosity counts.','Let’s see what the label actually says.','One scan can turn a mystery snack into useful information.','Your herb likes evidence more than guesses.','Check the product; you choose what fits your goals.','Point the camera at something worth learning about.'],
    shelf:['Same food idea, smarter ingredients — let’s cook.','Your next recipe can grow this little herb.','Pick something you would actually enjoy eating.','Good swaps should still feel like your food.','Cook something satisfying; your herb will handle the cheering.','A saved swap is a future decision made easier.'],
    move:['A little movement counts — you do not need to crush a workout.','Use the energy you have, not the energy you wish you had.','Short and comfortable still counts.','Your herb grows from movement, not punishment.','A few minutes is enough to make this a win.','Move in a way that feels doable today.'],
    profile:['This is where your herb gets its personal style.','Your sign and personality change the vibe, never your score.','Make the herb feel like yours — the XP rules stay the same.','Personalize the look; your progress remains untouched.','Your profile gives the herb flavor, not health predictions.','Tune the personality without changing a single XP rule.']
  };
  const wiltLines=['Your herb misses you — one healthy action brings the glow back.','A little quiet today? One positive action brings the sparkle back.','Your progress is safe. One small healthy action restores the glow.'];
  const validSign=s=>ZODIAC.find(z=>z[0]===s)||null;
  function profile(user,prefs){
    user=user||{};prefs=prefs||{};let z=validSign(prefs.starSign);
    if(!z){const dz=K.zodiac(user.bday);if(dz)z=[dz.name,dz.symbol,dz.element];}
    const p=z?K.palettes[z[2]]:K.palettes.neutral;
    let personality=String(prefs.personality||user.mbti||user.personality||'').toUpperCase();if(!MBTI.includes(personality))personality='';
    return {sign:z?{name:z[0],symbol:z[1],element:z[2]}:null,personality,palette:p,voice:personality&&personality[2]==='T'?'practical':'warm'};
  }
  function recentXP(state){return (state&&Array.isArray(state.ledger)?state.ledger:[]).filter(e=>e&&+e.amt>0).slice().sort((a,b)=>(+b.ts||0)-(+a.ts||0)).slice(0,8).map(e=>({amt:+e.amt,label:String(e.label||e.src||'XP'),src:String(e.src||''),ts:+e.ts||0}));}
  function latestHealthy(state,prefs){
    const xs=[];(state&&Array.isArray(state.ledger)?state.ledger:[]).forEach(e=>{if(K.meaningful(e))xs.push(+e.ts||0);});
    (state&&Array.isArray(state.logs)?state.logs:[]).forEach(e=>{if(e&&+e.ts)xs.push(+e.ts);});
    if(prefs&&+prefs.lastActionAt)xs.push(+prefs.lastActionAt);
    return xs.length?Math.max(...xs):+(prefs&&prefs.createdAt)||Date.now();
  }
  function model(state,prefs,now){
    state=state||{xp:0,ledger:[],logs:[],user:{}};prefs=prefs||{};now=+now||Date.now();
    const retained=Math.max(+prefs.highestStage||0,+(state.herb&&state.herb.stageIndex)||0),g=K.stage(+state.xp||0,retained),p=profile(state.user,prefs),last=latestHealthy(state,prefs);
    return {...g,profile:p,dim:now-last>=C.gentleDimAfterHours*3600000,lastActionAt:last,recent:recentXP(state)};
  }
  function nextLine(page,used,opts){
    page=lines[page]?page:'home';used=used||[];opts=opts||{};const pool=opts.dim?wiltLines:lines[page];
    const found=pool.find(x=>!used.includes(x));return found||null;
  }
  const api={model,profile,recentXP,latestHealthy,nextLine,lines,wiltLines,ZODIAC,MBTI};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiHerbTamagotchiCore=api;
})(typeof window!=='undefined'?window:globalThis);
