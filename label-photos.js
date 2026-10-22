/* label-photos.js (food engine scanfe-f2, 22 Oct 2026): the scanner's missing-data sheet. When the database lacks the
   nutrition label or the ingredient list, the card offers "Add label photos". Two photos (label + ingredients); where the
   browser can read text on the device (TextDetector) it pre-fills the form, marked "check this". Photos stay on the device,
   nothing is uploaded. Values only count after the person ticks that they checked them against the pack; the engine
   validates the numbers; anything left blank stays unknown. Logic: label-photos-core.js. */
(function(){'use strict';
const D=document,K=window.LowiLabelPhotosCore;if(!K)return;
const TX={
  ask:['Add label photos','Etikett-Fotos hinzufügen','Añadir fotos de la etiqueta'],
  askS:['Missing here: {m}. Two photos fill the gaps, you check every value.','Fehlt hier: {m}. Zwei Fotos füllen die Lücken, du prüfst jeden Wert.','Falta: {m}. Dos fotos completan los datos y tú revisas cada valor.'],
  label_photo:['nutrition label','Nährwerttabelle','tabla nutricional'],ingredients_photo:['ingredient list','Zutatenliste','lista de ingredientes'],
  title:['Check the label','Etikett prüfen','Revisar la etiqueta'],
  intro:['Take a photo of the nutrition table and one of the ingredient list. What we can read fills the form. Nothing counts until you check it against the pack.','Fotografiere die Nährwerttabelle und die Zutatenliste. Was wir lesen können, füllt das Formular. Nichts zählt, bevor du es mit der Packung abgleichst.','Haz una foto de la tabla nutricional y otra de los ingredientes. Lo que podamos leer rellena el formulario. Nada cuenta hasta que lo compruebes con el envase.'],
  local:['Photos stay on this device.','Fotos bleiben auf diesem Gerät.','Las fotos se quedan en este dispositivo.'],
  shotL:['Nutrition table photo','Foto der Nährwerttabelle','Foto de la tabla nutricional'],shotI:['Ingredient list photo','Foto der Zutatenliste','Foto de los ingredientes'],
  needed:['needed','fehlt','falta'],
  reading:['Reading the photo…','Foto wird gelesen…','Leyendo la foto…'],
  read:['Read from the photo. Check each value.','Aus dem Foto gelesen. Prüf jeden Wert.','Leído de la foto. Revisa cada valor.'],
  readNone:['Couldn\'t read numbers from this photo. Type what the label says.','Keine Werte im Foto erkannt. Tipp ab, was auf dem Etikett steht.','No se leyeron valores en la foto. Escribe lo que pone la etiqueta.'],
  noOcr:['This device can\'t read text from photos. Type what the label says.','Dieses Gerät kann keinen Text aus Fotos lesen. Tipp ab, was auf dem Etikett steht.','Este dispositivo no puede leer texto de fotos. Escribe lo que pone la etiqueta.'],
  name:['Product name','Produktname','Nombre del producto'],brand:['Brand (optional)','Marke (optional)','Marca (opcional)'],
  per:['Values per','Werte pro','Valores por'],g:['100 g','100 g','100 g'],ml:['100 ml','100 ml','100 ml'],
  carbs:['Carbohydrates (g)','Kohlenhydrate (g)','Hidratos de carbono (g)'],sugar:['of which sugars (g)','davon Zucker (g)','de los cuales azúcares (g)'],fibre:['Fibre (g)','Ballaststoffe (g)','Fibra (g)'],
  protein:['Protein (g)','Eiweiß (g)','Proteínas (g)'],fat:['Fat (g)','Fett (g)','Grasas (g)'],kcal:['Energy (kcal)','Brennwert (kcal)','Energía (kcal)'],
  ingredients:['Ingredient list','Zutatenliste','Lista de ingredientes'],blank:['Leave blank what the pack doesn\'t show. Blank stays unknown.','Leer lassen, was nicht auf der Packung steht. Leer bleibt unbekannt.','Deja en blanco lo que no aparece. En blanco queda como desconocido.'],
  confirm:['I checked these against the pack','Ich habe das mit der Packung abgeglichen','Lo he comprobado con el envase'],
  confirmNeed:['Tick that you checked the values against the pack','Bestätige, dass du die Werte mit der Packung abgeglichen hast','Confirma que has comprobado los valores con el envase'],
  nameNeed:['Give the product a name','Gib dem Produkt einen Namen','Ponle un nombre al producto'],
  save:['Use these values','Diese Werte verwenden','Usar estos valores'],anyway:['Use them anyway','Trotzdem verwenden','Usar de todos modos'],
  done:['Label checked. Here\'s the new estimate.','Etikett geprüft. Hier die neue Schätzung.','Etiqueta revisada. Aquí la nueva estimación.']
};
const li=()=>({en:0,de:1,es:2})[(D.documentElement.lang||'en').slice(0,2)]||0,lang=()=>['en','de','es'][li()];
const tr=k=>{const a=TX[k];return a?a[li()]||a[0]:k;};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function askHTML(p){if(!p||p.offline)return '';let g;try{g=K.gaps(p);}catch(e){return '';}if(!g.needs.length)return '';
  return '<div class="lp-ask"><button type="button" class="r2-btn lp-askb" data-b3="lphoto">'+esc(tr('ask'))+'</button><div class="tiny dim lp-asks">'+esc(tr('askS').replace('{m}',g.needs.map(tr).join(', ')))+'</div></div>';}
let OPEN=null;
function open(p,done){if(!p)return null;if(OPEN&&OPEN.isConnected){try{window.LowiR2.close(OPEN);}catch(e){}}
  const g=K.gaps(p),f=p.facts||{},needName=!(p.name&&String(p.name).trim()),urls=[];
  const val=k=>{const a=(K.FIELDS.find(x=>x[0]===k)||[])[1];const v=f[a];return v==null?'':String(v);};
  const slot=(kind,label)=>'<div class="lp-slot'+(g.needs.includes(kind==='label'?'label_photo':'ingredients_photo')?' need':'')+'"><label class="lp-shot"><input type="file" accept="image/*" capture="environment" data-lp="'+kind+'"><span class="lp-cam" aria-hidden="true"></span><span>'+esc(label)+(g.needs.includes(kind==='label'?'label_photo':'ingredients_photo')?' <em>'+esc(tr('needed'))+'</em>':'')+'</span></label><img class="lp-prev" alt="" hidden><div class="tiny lp-st" role="status"></div></div>';
  let h='<h2>'+esc(tr('title'))+'</h2><p class="small">'+esc(tr('intro'))+'</p><p class="tiny dim">'+esc(tr('local'))+'</p><form class="lp-form" novalidate>';
  if(needName)h+='<label class="dg-field">'+esc(tr('name'))+'<input class="input" name="name" maxlength="80" autocomplete="off"></label><label class="dg-field">'+esc(tr('brand'))+'<input class="input" name="brand" maxlength="60" autocomplete="off"></label>';
  h+='<div class="lp-slots">'+slot('label',tr('shotL'))+slot('ing',tr('shotI'))+'</div>';
  h+='<label class="dg-field lp-unit">'+esc(tr('per'))+'<select class="input" name="unit"><option value="g"'+(g.unit==='g'?' selected':'')+'>'+esc(tr('g'))+'</option><option value="ml"'+(g.unit==='ml'?' selected':'')+'>'+esc(tr('ml'))+'</option></select></label>';
  h+='<div class="dg-form-grid lp-grid">'+K.FIELDS.map(([k])=>'<label class="dg-field">'+esc(tr(k))+'<input class="input" name="'+k+'" inputmode="decimal" autocomplete="off" value="'+esc(val(k))+'"></label>').join('')+'</div><p class="tiny dim">'+esc(tr('blank'))+'</p>';
  h+='<label class="dg-field">'+esc(tr('ingredients'))+'<textarea class="input" name="ingredients" maxlength="3000">'+esc(p.ingredients||'')+'</textarea></label>';
  h+='<label class="dg-check"><input type="checkbox" name="ok">'+esc(tr('confirm'))+'</label><div class="dg-form-error" role="alert"></div><div class="lp-warn small" role="status"></div><button class="r2-btn pri big lp-save" type="submit">'+esc(tr('save'))+'</button></form>';
  const ov=OPEN=window.LowiR2.sheet('<div class="lp-sheet">'+h+'</div>',{cls:'lp-ov',onClose:()=>{urls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});if(OPEN===ov)OPEN=null;}});
  const form=ov.querySelector('.lp-form'),err=form.querySelector('.dg-form-error'),warn=form.querySelector('.lp-warn'),btn=form.querySelector('.lp-save');
  const photos=[];let ocr=false,warned='';
  form.addEventListener('input',e=>{if(e.target&&e.target.classList)e.target.classList.remove('lp-read');warned='';btn.textContent=tr('save');warn.textContent='';});
  form.querySelectorAll('input[type=file]').forEach(inp=>inp.addEventListener('change',async()=>{const file=inp.files&&inp.files[0],box=inp.closest('.lp-slot'),st=box.querySelector('.lp-st'),img=box.querySelector('.lp-prev');if(!file)return;
    const kind=inp.dataset.lp;if(!photos.includes(kind))photos.push(kind);box.classList.add('got');
    try{const u=URL.createObjectURL(file);urls.push(u);img.src=u;img.hidden=false;}catch(e){}
    const TD=window.TextDetector;if(!TD||!window.createImageBitmap){st.textContent=tr('noOcr');return;}
    st.textContent=tr('reading');let text='';
    try{const bmp=await createImageBitmap(file),hits=await new TD().detect(bmp);text=(hits||[]).map(x=>x.rawValue||'').join('\n');}catch(e){text='';}
    if(!ov.isConnected)return;
    if(kind==='label'){const r=K.parseLabel(text);let n=0;r.found.forEach(k=>{const el=form.elements[k];if(el&&!el.value&&r.per100[k]!=null){el.value=String(r.per100[k]).replace('.',li()?',':'.');el.classList.add('lp-read');n++;}});
      if(r.unit&&form.elements.unit)form.elements.unit.value=r.unit;st.textContent=n?tr('read'):tr('readNone');if(n)ocr=true;}
    else{const r=K.parseIngredients(text),ta=form.elements.ingredients;if(r.text.length>=3&&ta&&!ta.value.trim()){ta.value=r.text;ta.classList.add('lp-read');st.textContent=tr('read');ocr=true;}else st.textContent=tr('readNone');}
  }));
  form.addEventListener('submit',e=>{e.preventDefault();err.textContent='';const el=form.elements;
    if(needName&&String(el.name.value||'').trim().length<2){err.textContent=tr('nameNeed');return;}
    const values={unit:el.unit.value,ingredients:el.ingredients.value};K.FIELDS.forEach(([k])=>{values[k]=el[k].value;});
    const res=K.check(values,{needLabel:g.needs.includes('label_photo')}),L=lang();
    if(!res.ok){err.textContent=res.errors.map(c=>res.text(c,L)).join(' · ');return;}
    if(!el.ok.checked){err.textContent=tr('confirmNeed');return;}
    const w=res.warnings.join(',');if(w&&warned!==w){warned=w;warn.textContent=res.warnings.map(c=>res.text(c,L)).join(' · ');btn.textContent=tr('anyway');return;}
    const q=K.apply(p,res,{name:needName?el.name.value:'',brand:needName&&el.brand?el.brand.value:'',ocr,photos});
    try{window.LowiR2.close(ov);}catch(x){}try{window.LowiR2.toast(tr('done'));}catch(x){}
    if(typeof done==='function')done(q);});
  return ov;}
window.LowiLabelPhotos={askHTML,open,TX};
})();
