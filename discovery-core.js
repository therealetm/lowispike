/* Pure, testable discovery rules. Browser storage is not an authoritative community ledger. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./discovery-config.js'));
  else root.LowiDiscoveryCore=factory(root.LOWI_DISCOVERY_CONFIG);
})(typeof window==='undefined'?globalThis:window,function(C){
  'use strict';
  const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').toLowerCase().replace(/[^a-z0-9]/g,'');
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const day=t=>new Date(t).toISOString().slice(0,10);
  function barcode(s){const v=String(s||'').replace(/[\s-]/g,'');if(!/^\d{8}$|^\d{12,14}$/.test(v))return '';let sum=0;for(let i=v.length-2,j=0;i>=0;i--,j++)sum+=Number(v[i])*(j%2?1:3);return (10-sum%10)%10===Number(v.at(-1))?v.padStart(14,'0'):'';}
  function quantity(s){const m=String(s||'').toLowerCase().replace(',','.').match(/^\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\s*$/);if(!m)return normalize(s);return String(Number(m[1])*(['kg','l'].includes(m[2])?1000:1))+(['kg','g'].includes(m[2])?'g':'ml');}
  function identity(p){const b=barcode(p.barcode);return b?'gtin:'+b:p.id?'product:'+p.id:'label:'+normalize(p.brand)+':'+normalize(p.name)+':'+quantity(p.quantity||p.facts&&p.facts.q)+':'+normalize(p.variant);}
  function duplicates(p,items){const id=identity(p),b=barcode(p.barcode),name=normalize(p.name),brand=normalize(p.brand),size=quantity(p.quantity||p.facts&&p.facts.q);return items.filter(q=>{
    if(p.id&&p.id===q.id||id===identity(q)||b&&b===barcode(q.barcode))return true;
    if(!name||!brand||brand!==normalize(q.brand)||size!==quantity(q.quantity||q.facts&&q.facts.q))return false;
    const other=normalize(q.name);return name===other||name.length>5&&other.length>5&&(name.includes(other)||other.includes(name));
  });}
  function missing(p){const f=p.facts||{},m=[];if(!p.name)m.push('name');if(!p.brand)m.push('brand');if(!String(p.quantity||f.q||'').trim())m.push('quantity');if(!String(p.ingredients||'').trim())m.push('ingredients');
    for(const k of ['c','s','f','p','fat'])if(!finite(f[k])||f[k]<0||f[k]>100)m.push(k);
    if(!finite(f.serving)||f.serving<=0||f.serving>2000)m.push('serving');
    if(!['g','ml'].includes(f.unit))m.push('unit');
    if(!['available','includes-fiber'].includes(f.carbBasis))m.push('carbBasis');
    if(!p.country)m.push('country');if(!['declared','not-declared'].includes(f.addedStatus))m.push('addedStatus');
    if(f.addedStatus==='declared'&&(!finite(f.added)||f.added<0||f.added>f.s))m.push('added');
    if(finite(f.c)&&finite(f.s)&&f.s>f.c)m.push('inconsistent');
    if(f.carbBasis==='includes-fiber'&&finite(f.f)&&finite(f.c)&&f.f>f.c)m.push('inconsistent');
    return [...new Set(m)];}
  function assessment(p,now){now=now||Date.now();const f=p.facts||{},miss=missing(p),reasons=[];
    const base={version:C.criteriaVersion,policyStatus:C.criteriaStatus,review:'unreviewed',confidence:'unverified-label',tier:'pending',category:'insufficient',missing:miss,reasons,reviewDate:null};
    if(miss.length){reasons.push('Required label information is missing or inconsistent.');return base;}
    const carbs=f.carbBasis==='includes-fiber'?Math.max(0,f.c-f.f):f.c;
    let category='fits';const outside=s=>{category='outside';reasons.push(s);},caution=s=>{if(category!=='outside')category='caution';reasons.push(s);};
    if(f.s>=C.nutrition.sugarOutside)outside('Sugars ≥ '+C.nutrition.sugarOutside+' g / 100 g.');else if(f.s>=C.nutrition.sugarCaution)caution('Sugars ≥ '+C.nutrition.sugarCaution+' g / 100 g.');
    if(carbs>=C.nutrition.carbsOutside)outside('Available carbohydrate ≥ '+C.nutrition.carbsOutside+' g / 100 g.');else if(carbs>=C.nutrition.carbsCaution)caution('Available carbohydrate ≥ '+C.nutrition.carbsCaution+' g / 100 g.');
    if(p.cat==='drink'&&f.s>=C.nutrition.drinkSugarOutside)outside('Drink sugars ≥ '+C.nutrition.drinkSugarOutside+' g / 100 g.');
    const ing=String(p.ingredients).toLowerCase(),top=ing.replace(/\([^)]*\)/g,'').split(/[,;]/).slice(0,3).join(' ');
    if(/sucralos|aspartam|acesulfam|stevi|erythrit|xylit|sorbit|maltit|saccharin|cyclamat|sweetener|edulcorante|süßstoff|suessstoff/.test(ing))outside('Sweetener listed: an existing LOWiSPIKE preference exclusion, not proof of a glucose response.');
    if(/\bpork\b|schwein|bacon|\bspeck\b|cerdo/.test(ing))outside('Pork listed: an existing LOWiSPIKE dietary preference exclusion, not a nutrition or ethics finding.');
    if(/sugar|zucker|syrup|sirup|honig|honey|maltodextrin|azúcar|azucar|rice|reis|arroz|wheat|weizen|corn|mais|maíz|potato|kartoffel|starch|stärke|harina/.test(top))outside('Sugar or a starch ingredient appears among the first three ingredients.');
    else if(/sugar|zucker|syrup|sirup|rice|reis|arroz|flour|mehl|hafer|oats|avena/.test(ing))caution('Sugar, grain or flour listed in ingredients.');
    if(!reasons.length)reasons.push('Sugars < '+C.nutrition.sugarCaution+' g and available carbohydrate < '+C.nutrition.carbsCaution+' g / 100 g; no listed preference exclusion.');
    const sourced=!!(p.labelPhoto||p.labelSource),review=p.review;
    for(let i=0;i<reasons.length;i++)reasons[i]=reasons[i].replace(/100 g/g,'100 '+f.unit);
    base.category=category;base.tier=sourced?(category==='fits'?'rare':'uncommon'):'common';
    base.perServing={c:carbs*f.serving/100,s:f.s*f.serving/100,f:f.f*f.serving/100,p:f.p*f.serving/100};
    // Never trust an arbitrary browser field as an independent review.
    if(review&&review.authority==='server-verified'&&C.backendAcceptanceEnabled){
      const valid=review.criteriaVersion===C.criteriaVersion&&review.date&&now-Date.parse(review.date)<=C.reviewFreshnessDays*864e5&&Date.parse(review.date)<=now&&review.source;
      if(valid){base.review='reviewed';base.reviewDate=review.date;base.confidence=review.confidence;
        if(category==='fits'&&sourced&&C.tiers.legendaryEnabled&&review.tier==='legendary')base.tier='legendary';
        else if(category==='fits'&&sourced&&C.tiers.epicEnabled&&review.tier==='epic')base.tier='epic';}
    }
    return base;
  }
  function candidatePoints(kind){return C.points[kind]||0;}
  function safeURL(s){try{const u=new URL(s);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch(e){return '';}}
  function priceState(p,now){const t=Date.parse(p.date);return !Number.isFinite(t)||t>now?'invalid':now-t>C.freshnessDays*864e5?'stale':'current';}
  function validateContribution(kind,p,data,ledger,now){now=now||Date.now();ledger=ledger||[];const errors=[];
    if(!p.name||!p.brand)errors.push('Product name and brand are required.');
    if(ledger.filter(x=>day(x.createdAt)===day(now)).length>=C.limits.contributionsPerDay)errors.push('Daily contribution limit reached. Try another day.');
    if(kind==='price'){
      if(!finite(data.amount)||data.amount<=0||data.amount>10000)errors.push('Enter a valid price.');
      if(!C.currencies.includes(data.currency))errors.push('Choose a supported currency.');
      if(!data.store||!data.date||priceState(data,now)!=='current')errors.push('A store and current reported date are required.');
      if(ledger.some(x=>x.kind==='price'&&x.productKey===identity(p)&&normalize(x.data.store)===normalize(data.store)&&x.data.date===data.date))errors.push('This product/store/date already has a price contribution. Add a correction instead.');
    }else{
      if(['first','evidence','correction','confirmation'].indexOf(kind)<0)errors.push('Invalid contribution type.');
      if(!data.note||String(data.note).trim().length<8)errors.push('Explain the contribution in at least 8 characters.');
      if(!data.labelPhoto&&!safeURL(data.source))errors.push('Attach a label photo or a source link.');
      if(kind==='first'&&!data.incompleteDraft)errors.push(...missing(p).map(k=>'Missing label field: '+k));
      if(ledger.some(x=>x.productKey===identity(p)&&x.kind===kind&&normalize(x.data.note)===normalize(data.note)&&x.data.source===data.source))errors.push('This contribution is already recorded.');
    }
    return {ok:!errors.length,errors};
  }
  function localPriceAward(p,ledger){const used=ledger.filter(x=>x.productKey===identity(p)&&x.kind==='price'&&x.state==='local-accepted').reduce((n,x)=>n+x.points,0);return Math.max(0,Math.min(C.points.price,C.caps.price-used));}
  function communityReward(c,ledger){
    if(!C.backendAcceptanceEnabled||c.state!=='accepted'||c.authority!=='server-verified')return {points:0,reason:'Community acceptance is not connected.'};
    if(ledger.some(x=>x.contributionId===c.id))return {points:0,reason:'Already awarded.'};
    if(c.kind==='first'&&(!c.complete||!c.duplicateChecked||ledger.some(x=>x.productKey===c.productKey&&x.kind==='first')))return {points:0,reason:'Not the first accepted complete discovery.'};
    const cap=c.kind==='first'?C.points.first:C.caps[c.kind]||0,used=ledger.filter(x=>x.productKey===c.productKey&&x.kind===c.kind).reduce((n,x)=>n+x.points,0);
    return {points:Math.max(0,Math.min(candidatePoints(c.kind),cap-used)),reason:c.kind};
  }
  return {config:C,normalize,barcode,quantity,identity,duplicates,missing,assessment,candidatePoints,safeURL,priceState,validateContribution,localPriceAward,communityReward};
});
