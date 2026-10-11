/* Personal recipe collection. Kept on this device, separately for each account. */
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const words = {
    title:["My Recipe Book","Mein Rezeptbuch","Mi recetario"],
    save:["Save recipe","Rezept speichern","Guardar receta"],
    remove:["Remove from my book","Aus meinem Buch entfernen","Quitar de mi recetario"],
    empty:["Save a recipe while browsing Cook. Your favourites will appear here.","Speichere beim Stöbern in Kochen ein Rezept. Deine Favoriten erscheinen hier.","Guarda una receta al explorar Cocinar. Tus favoritas aparecerán aquí."],
    local:["Saved on this device for your account.","Auf diesem Gerät für dein Konto gespeichert.","Guardado en este dispositivo para tu cuenta."],
    search:["Search my recipes","Meine Rezepte durchsuchen","Buscar mis recetas"],
    browse:["Browse recipes","Rezepte entdecken","Explorar recetas"],
    saved:["Recipe saved","Rezept gespeichert","Receta guardada"],
    removed:["Recipe removed","Rezept entfernt","Receta eliminada"],
    failed:["Could not save. Free some storage and try again.","Speichern fehlgeschlagen. Gib Speicher frei und versuche es erneut.","No se pudo guardar. Libera espacio e inténtalo de nuevo."],
    full:["Your book has 250 recipes. Remove one before adding another.","Dein Buch enthält 250 Rezepte. Entferne eines, um ein neues hinzuzufügen.","Tu recetario tiene 250 recetas. Quita una para añadir otra."],
    ingredients:["Ingredients","Zutaten","Ingredientes"],
    steps:["Steps","Zubereitung","Preparación"],
    cook:["Start cooking","Kochen starten","Empezar a cocinar"],
    noresult:["No matching recipes.","Keine passenden Rezepte.","No hay recetas coincidentes."]
  };
  const lang = () => { const v = document.documentElement.lang || "en"; return v.startsWith("de") ? 1 : v.startsWith("es") ? 2 : 0; };
  const t = k => words[k][lang()];
  const account = () => { try { const x = window.LOWI_CLOUD_X; return x && x.state().uid || "local"; } catch (_) { return "local"; } };
  const key = () => "lowi.recipe-book." + account();
  function list() { try { const v = JSON.parse(localStorage.getItem(key()) || "[]"); return Array.isArray(v) ? v.filter(r => r && typeof r.id === "string" && typeof r.n === "string" && Array.isArray(r.ing) && Array.isArray(r.steps)) : []; } catch (_) { return []; } }
  const has = id => list().some(r => r.id === id);
  const say = m => { if (window.LowiR2) LowiR2.toast(m); };
  function normal(r) {
    return {id:String(r.id), n:String(r.n || ""), e:r.e || "🍽️", sub:String(r.sub || ""), mins:Number(r.mins) || 0, book:!!r.book,
      ing:(r.ing || []).map(i => typeof i === "string" ? {n:i.split("|").slice(1).join("|") || i, g:i.split("|")[0], q:""} : {n:String(i.n || ""), q:String(i.q || ""), g:String(i.g || ""), k:String(i.k || i.n || "").toLowerCase(), e:i.e || "🛒", p:Number(i.p) || 0}),
      steps:(r.book && r.make ? [].concat(r.prep || [], r.make) : r.steps || []).map(String), at:Date.now()};
  }
  function write(items) { try { localStorage.setItem(key(), JSON.stringify(items)); return true; } catch (_) { say(t("failed")); return false; } }
  function source(id) { const p = window.LowiP2 && LowiP2.rec(id); return p || (window.LowiAllRecipes && LowiAllRecipes().find(r => r.id === id)) || list().find(r => r.id === id); }
  function toggle(id) {
    const old = list();
    if (old.some(r => r.id === id)) { if (!write(old.filter(r => r.id !== id))) return; say(t("removed")); }
    else { const r = source(id); if (!r) return; if (old.length >= 250) { say(t("full")); return; } if (!write([normal(r)].concat(old))) return; say(t("saved")); }
    refresh(); if (ov && ov.isConnected) paint();
  }
  function button(r) { return '<button type="button" class="btn ghost mybook-save" data-mybook="toggle" data-recipe-id="' + esc(r.id) + '" aria-pressed="' + has(r.id) + '">' + esc(t(has(r.id) ? "remove" : "save")) + '</button>'; }
  function entry() { return '<button type="button" id="myBookEntry" class="card" style="width:100%;text-align:left;margin:10px 0" data-mybook="open"><b>📖 ' + esc(t("title")) + '</b><span class="small muted" style="display:block;margin-top:4px">' + list().length + ' · ' + esc(t("local")) + '</span></button>'; }
  let ov = null, query = "";
  function row(r) {
    const pic = typeof FOOD_IMG !== "undefined" && FOOD_IMG[r.id];
    return '<div class="mybook-row"><button type="button" class="mybook-recipe" data-mybook="recipe" data-recipe-id="' + esc(r.id) + '">' + (pic ? '<img src="' + esc(pic) + '" alt="" loading="lazy">' : '<span aria-hidden="true">' + esc(r.e) + '</span>') + '<b>' + esc(r.n) + '</b></button><button type="button" class="btn ghost sm" data-mybook="toggle" data-recipe-id="' + esc(r.id) + '" aria-label="' + esc(t("remove") + ": " + r.n) + '">×</button></div>';
  }
  function paint() { const target = ov && ov.querySelector("#myBookRows"); if (!target) return; const all = list(), shown = all.filter(r => (r.n + " " + r.ing.map(i => i.n).join(" ")).toLocaleLowerCase().includes(query.toLocaleLowerCase())); target.innerHTML = shown.length ? shown.map(row).join("") : '<p class="small muted">' + esc(t(all.length ? "noresult" : "empty")) + '</p>'; }
  function open() {
    if (!window.LowiR2) return;
    if (ov && ov.isConnected) LowiR2.close(ov);
    query = "";
    const here = ov = LowiR2.sheet('<div class="h2">' + esc(t("title")) + '</div><p class="small muted">' + esc(t("local")) + '</p><label for="myBookSearch" class="small">' + esc(t("search")) + '</label><input id="myBookSearch" class="input" type="search" autocomplete="off"><div id="myBookRows"></div><button class="btn ghost" data-mybook="browse">' + esc(t("browse")) + '</button>', {cls:"mybook-ov", onClose:() => { if (ov === here) ov = null; }});
    paint();
  }
  function view(id) {
    const r = source(id); if (!r) return;
    if (window.LowiP2 && LowiP2.rec(id)) { LowiP2.open(id); return; }
    const z = normal(r);
    LowiR2.sheet('<div class="h2">' + esc(z.n) + '</div>' + button(z) + '<h3>' + esc(t("ingredients")) + '</h3><ul>' + z.ing.map(i => '<li>' + esc(i.q ? i.q + " " + i.n : i.n) + '</li>').join("") + '</ul><h3>' + esc(t("steps")) + '</h3><ol>' + z.steps.map(s => '<li>' + esc(s) + '</li>').join("") + '</ol>');
  }
  function refresh() { document.querySelectorAll('[data-mybook="toggle"]').forEach(b => { if (!b.classList.contains("mybook-save")) return; const on = has(b.dataset.recipeId); b.setAttribute("aria-pressed", on); b.textContent = t(on ? "remove" : "save"); }); }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-mybook]"); if (!b) return; e.preventDefault();
    switch (b.dataset.mybook) {
      case "open": open(); break;
      case "toggle": toggle(b.dataset.recipeId); break;
      case "recipe": view(b.dataset.recipeId); break;
      case "browse": if (ov) LowiR2.close(ov); if (window.LowiHost) LowiHost.go("shelf"); if (window.LowiG2C) LowiG2C.open("all"); break;
    }
  });
  document.addEventListener("input", e => { if (e.target.id === "myBookSearch") { query = e.target.value; paint(); } });
  addEventListener("storage", e => { if (e.key === key()) { refresh(); paint(); } });
  window.LowiBook = {list, has, toggle, button, entry, open};
})();
