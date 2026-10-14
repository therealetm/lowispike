/* Local visual atmosphere controls (theme, time of day, mood). Real weather is on Home via Open-Meteo. */
(function(){
  'use strict';
  const H = document.documentElement, K = 'lowi.appearance', R2 = window.LowiR2;
  const words = {
    en:['Appearance','Time of day','Weather look','Mood','Night','Day','Sunrise · automatic','Clear','Cloudy','Rain','Calm','Focus','Energy','Choose the atmosphere you want.','Close'],
    de:['Aussehen','Tageszeit','Wetteroptik','Stimmung','Nacht','Tag','Sonnenaufgang · automatisch','Klar','Bewölkt','Regen','Ruhe','Fokus','Energie','Wähle deine gewünschte Atmosphäre.','Schließen'],
    es:['Apariencia','Hora del día','Aspecto del clima','Ánimo','Noche','Día','Amanecer · automático','Despejado','Nublado','Lluvia','Calma','Enfoque','Energía','Elige la atmósfera que quieras.','Cerrar']
  };
  let prefs = {hour:12, weather:'clear', mood:'calm'}, panel, button;
  try { const saved = JSON.parse(localStorage.getItem(K) || '{}');
    if (Number.isFinite(saved.hour) && saved.hour >= 0 && saved.hour <= 23) prefs.hour = saved.hour;
    /* real weather lives on Home (Open-Meteo); the old manual weather look is retired */
    if (['calm','focus','energy'].includes(saved.mood)) prefs.mood = saved.mood;
  } catch(e){}
  const t = () => words[(H.lang || 'en').slice(0,2)] || words.en;
  const save = () => { try { localStorage.setItem(K,JSON.stringify(prefs)); } catch(e){} };
  function paint(){
    const light = H.dataset.theme === 'light', w = prefs.weather, m = prefs.mood;
    const palettes = light ? {calm:['#f9e3b1','#7ecfe0','#c3a0ee'],focus:['#d2f5ff','#76a4e8','#a4b7fa'],energy:['#ffe3a0','#f29ec2','#fbba77']} : {calm:['#d3b7ff','#705fe0','#4ebccc'],focus:['#bceeff','#3975c5','#7762d1'],energy:['#ffcc79','#b258c7','#ef7685']};
    const colors = palettes[m];
    H.style.setProperty('--orb-day',colors[0]); H.style.setProperty('--orb-deep',colors[1]); H.style.setProperty('--orb-mood',colors[2]);
    H.style.setProperty('--orb-saturation',w === 'cloud' ? '.65' : w === 'rain' ? '.85' : '1.2');
    H.style.setProperty('--orb-speed',m === 'energy' ? '5s' : m === 'focus' ? '9s' : '15s');
    H.style.setProperty('--orb-time',String(.6 + Math.sin(prefs.hour / 24 * Math.PI) * .4));
    H.dataset.weatherLook = w; H.dataset.moodLook = m;
    const W=t(), wi={clear:7,cloud:8,rain:9}[w], mi={calm:10,focus:11,energy:12}[m];
    if (button) {
      const ic=light?'<path d="M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>':'<path d="M18 18A9 9 0 0 1 6 6C5 13 11 20 18 18Z"/>';
      button.innerHTML='<span class="ap-day" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ic+'</svg></span>';
      button.title=W[0]+' · '+W[mi];
      button.setAttribute('aria-label',button.title);
    }
    if (panel && !panel.hidden) sync();
  }
  function sync(){
    panel.querySelector('[data-ap-hour]').value = prefs.hour;
    panel.querySelector('output').textContent = String(prefs.hour).padStart(2,'0') + ':00';
    panel.querySelectorAll('[data-ap-mode]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.apMode === R2.theme())));
    ['weather','mood'].forEach(key => panel.querySelectorAll('[data-ap-'+key+']').forEach(b => b.setAttribute('aria-pressed',String(b.dataset['ap'+key[0].toUpperCase()+key.slice(1)] === prefs[key]))));
    const preview=panel.querySelector('.ap-preview'), W=t();
    if(preview){
      preview.dataset.weather=prefs.weather; preview.dataset.mood=prefs.mood;
      preview.querySelector('b').textContent=W[0];
      preview.querySelector('small').textContent=W[{calm:10,focus:11,energy:12}[prefs.mood]]+' · '+String(prefs.hour).padStart(2,'0')+':00';
    }
  }
  function close(){ panel.hidden = true; button.setAttribute('aria-expanded','false'); button.focus(); }
  function open(){
    const W = t();
    const choices = (key,items) => '<div class="ap-wheel" role="group" aria-label="'+W[key === 'weather' ? 2 : 3]+'">'+items.map(([value,label]) => '<button type="button" data-ap-'+key+'="'+value+'" aria-pressed="false">'+label+'</button>').join('')+'</div>';
    panel.innerHTML = '<section class="ap-sheet" role="dialog" aria-modal="true" aria-labelledby="apTitle"><button class="ap-close" aria-label="'+W[14]+'">×</button><h2 id="apTitle">'+W[0]+'</h2><p>'+W[13]+'</p><div class="ap-preview" aria-live="polite"><i aria-hidden="true"></i><span><b></b><small></small></span></div><div class="ap-wheel ap-modes">'+[['dark',W[4]],['light',W[5]],['sunrise',W[6]]].map(([v,label])=>'<button data-ap-mode="'+v+'" aria-pressed="false">'+label+'</button>').join('')+'</div><label class="ap-time">'+W[1]+' <output></output><input data-ap-hour type="range" min="0" max="23" step="1" aria-label="'+W[1]+'"><span>00:00 <i>12:00</i> 23:00</span></label><h3>'+W[3]+'</h3>'+choices('mood',[['calm',W[10]],['focus',W[11]],['energy',W[12]]])+'</section>';
    panel.hidden = false; button.setAttribute('aria-expanded','true'); sync(); panel.querySelector('.ap-close').focus();
  }
  function boot(){
    if (!R2 || !R2.applyTheme || !document.getElementById('pfBtn')) return;
    button = document.createElement('button'); button.id='appearanceBtn'; button.type='button'; button.setAttribute('aria-haspopup','dialog'); button.setAttribute('aria-expanded','false');
    document.getElementById('pfBtn').after(button);
    panel = document.createElement('div'); panel.id='appearancePanel'; panel.hidden=true; document.body.append(panel);
    const apply = R2.applyTheme;
    R2.applyTheme = function(mode){ const result=apply.apply(this,arguments);
      if (R2.theme() === 'sunrise') prefs.hour = new Date().getHours();
      else if (mode && (prefs.hour >= 7 && prefs.hour < 19) !== (mode === 'light')) prefs.hour=mode === 'light' ? 12 : 23;
      save(); paint(); return result;
    };
    button.addEventListener('click',open);
    panel.addEventListener('click',e=>{
      if(e.target === panel || e.target.closest('.ap-close')) return close();
      const mode=e.target.closest('[data-ap-mode]'); if(mode) return R2.applyTheme(mode.dataset.apMode);
      for(const key of ['mood']) { const b=e.target.closest('[data-ap-'+key+']'); if(b){ prefs[key]=b.dataset['ap'+key[0].toUpperCase()+key.slice(1)]; save(); paint(); } }
    });
    panel.addEventListener('input',e=>{if(e.target.matches('[data-ap-hour]')){ prefs.hour=Number(e.target.value); R2.applyTheme(prefs.hour>=7 && prefs.hour<19 ? 'light':'dark'); }});
    panel.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();}
      if(e.key==='Tab'){ const nodes=Array.from(panel.querySelectorAll('button,input'));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();} }
    });
    new MutationObserver(paint).observe(H,{attributes:true,attributeFilter:['data-theme','lang']});
    if(R2.theme()==='sunrise') prefs.hour=new Date().getHours();
    else if((prefs.hour>=7 && prefs.hour<19)!==(R2.theme()==='light')) prefs.hour=R2.theme()==='light'?12:23;
    paint();
    setInterval(()=>{if(R2.theme()==='sunrise') {prefs.hour=new Date().getHours();paint();}},60000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
