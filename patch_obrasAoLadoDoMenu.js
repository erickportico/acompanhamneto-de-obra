/* =====================================================================
 * PATCH: Obras ao lado do Menu  v2
 * Cria o botão Obras se ele não existir e coloca na mesma fileira do Menu.
 * ===================================================================== */
(function () {
  "use strict";
  if (window.__patchObrasAoLadoDoMenuV2) { return; }
  window.__patchObrasAoLadoDoMenuV2 = true;

  var CSS = ""
    + "#pToolbarAbas{display:flex!important;flex-direction:row!important;align-items:center!important;"
    + "gap:10px!important;flex-wrap:wrap!important;margin:10px 0 18px 0!important;width:100%;}"
    + "#pToolbarAbas .or-launcher,#pToolbarAbas .obr-launcher{"
    + "margin:0!important;height:44px!important;min-height:44px!important;box-sizing:border-box!important;"
    + "padding:8px 16px 8px 12px!important;font:600 14px/1.2 inherit!important;border-radius:12px!important;"
    + "gap:10px!important;align-items:center!important;display:inline-flex!important;cursor:pointer;"
    + "color:#e8eefc;background:linear-gradient(135deg,#1b2540 0%,#111827 100%);"
    + "border:1px solid rgba(255,255,255,.14)!important;box-shadow:0 6px 18px rgba(2,8,23,.35);}"
    + "#pToolbarAbas .or-launcher .or-burg,#pToolbarAbas .obr-launcher .obr-ico{"
    + "width:26px!important;height:26px!important;border-radius:8px!important;flex-shrink:0;"
    + "display:grid;place-items:center;background:rgba(245,158,11,.18);font-size:15px;}"
    + "#pToolbarAbas .or-launcher .or-rot,#pToolbarAbas .obr-launcher .obr-rot{"
    + "font-weight:600!important;font-size:14px!important;color:#c3d1ea!important;}"
    + "#pToolbarAbas .or-launcher .or-atual,#pToolbarAbas .obr-launcher .obr-atual{"
    + "font-weight:500!important;font-size:13px!important;color:#9fb3d9!important;max-width:240px;"
    + "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
    + "#pToolbarAbas .obr-launcher .obr-atual:before{content:'•';margin-right:6px;color:#f59e0b;}"
    + ".project-selector #obrGavetaBtn{display:none!important;}"
    + ".project-selector select#selectObra,"
    + ".project-selector button[onclick='abrirModalObra()'],"
    + ".project-selector button[onclick='abrirModalNovaObra()'],"
    + ".project-selector button[onclick='excluirObraAtual()']{display:none!important;}"
    + "#pObrasMini{position:fixed;inset:0;z-index:2147483000;display:none;}"
    + "#pObrasMini.on{display:block;}"
    + "#pObrasMini .pof{position:absolute;inset:0;background:rgba(2,8,23,.45);}"
    + "#pObrasMini .pop{position:absolute;left:16px;top:90px;width:min(360px,calc(100vw - 24px));"
    + "background:#111827;color:#e8eefc;border:1px solid #334155;border-radius:14px;"
    + "box-shadow:0 18px 40px rgba(0,0,0,.4);padding:12px;}"
    + "#pObrasMini h4{margin:0 0 10px;font:700 14px Inter,sans-serif;}"
    + "#pObrasMini .poi{display:block;width:100%;text-align:left;margin:0 0 6px;padding:9px 10px;"
    + "border:0;border-radius:8px;background:#1e293b;color:#e2e8f0;cursor:pointer;font:600 13px Inter,sans-serif;}"
    + "#pObrasMini .poi.on{background:#2563eb;color:#fff;}"
    + "#pObrasMini .pofoot{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}"
    + "#pObrasMini .pofoot button{flex:1;min-width:90px;padding:8px;border:0;border-radius:8px;"
    + "cursor:pointer;font:600 12px Inter,sans-serif;color:#fff;}"
    + "#orMenu .or-item[data-obra-id],#orMenu .or-grupo[data-grupo-obras]{display:none!important;}";

  function css() {
    if (document.getElementById("pToolbarAbasCss")) { return; }
    var s = document.createElement("style");
    s.id = "pToolbarAbasCss";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function obrasLista() {
    try {
      if (typeof db !== "undefined" && db && Array.isArray(db.obras)) { return db.obras; }
    } catch (e) {}
    try {
      if (window.db && Array.isArray(window.db.obras)) { return window.db.obras; }
    } catch (e2) {}
    return [];
  }

  function obraAtual() {
    var lista = obrasLista();
    var id = "";
    try { id = (typeof db !== "undefined" && db && db.obraAtualId) ? db.obraAtualId : ""; } catch (e) {}
    var o = lista.filter(function (x) { return x && x.id === id; })[0];
    return o || lista[0] || null;
  }

  function nomeAtual() {
    var o = obraAtual();
    return o ? (o.nome || "Sem nome") : "Sem obras";
  }

  function barra() {
    var b = document.getElementById("pToolbarAbas");
    if (b) { return b; }
    b = document.createElement("div");
    b.id = "pToolbarAbas";
    b.setAttribute("role", "toolbar");
    b.setAttribute("aria-label", "Menu e Obras");
    return b;
  }

  function atualizarRotulo() {
    var r = document.getElementById("obrAtual");
    if (r) { r.textContent = nomeAtual(); }
  }

  function mini() {
    var box = document.getElementById("pObrasMini");
    if (box) { return box; }
    box = document.createElement("div");
    box.id = "pObrasMini";
    box.innerHTML = '<div class="pof"></div><div class="pop">'
      + "<h4>Obras</h4><div id='pObrasMiniLista'></div>"
      + '<div class="pofoot">'
      + '<button type="button" style="background:#10b981" id="pObNova">+ Nova</button>'
      + '<button type="button" style="background:#f59e0b;color:#111" id="pObGer">Gerenciar</button>'
      + '<button type="button" style="background:#64748b" id="pObX">Fechar</button>'
      + "</div></div>";
    document.body.appendChild(box);
    box.querySelector(".pof").addEventListener("click", fecharMini);
    box.querySelector("#pObX").addEventListener("click", fecharMini);
    box.querySelector("#pObNova").addEventListener("click", function () {
      fecharMini();
      if (typeof abrirModalNovaObra === "function") { abrirModalNovaObra(); }
    });
    box.querySelector("#pObGer").addEventListener("click", function () {
      fecharMini();
      if (typeof abrirModalObra === "function") { abrirModalObra(); }
    });
    return box;
  }

  function abrirMini() {
    var box = mini();
    var lista = document.getElementById("pObrasMiniLista");
    var atual = obraAtual();
    lista.innerHTML = "";
    obrasLista().forEach(function (o) {
      if (!o) { return; }
      var bt = document.createElement("button");
      bt.type = "button";
      bt.className = "poi" + (atual && atual.id === o.id ? " on" : "");
      bt.textContent = o.nome || o.id || "Obra";
      bt.addEventListener("click", function () {
        fecharMini();
        if (typeof trocarObra === "function") { trocarObra(o.id); }
        setTimeout(atualizarRotulo, 80);
      });
      lista.appendChild(bt);
    });
    if (!lista.firstChild) {
      lista.textContent = "Nenhuma obra carregada.";
    }
    box.classList.add("on");
  }

  function fecharMini() {
    var box = document.getElementById("pObrasMini");
    if (box) { box.classList.remove("on"); }
  }

  function criarBotaoObras() {
    var b = document.getElementById("obrGavetaBtn");
    if (b) { return b; }
    b = document.createElement("button");
    b.id = "obrGavetaBtn";
    b.type = "button";
    b.className = "obr-launcher";
    b.setAttribute("aria-haspopup", "true");
    b.innerHTML = '<span class="obr-ico" aria-hidden="true">🏗️</span>'
      + '<span class="obr-rot">Obras</span>'
      + '<span class="obr-atual" id="obrAtual"></span>';
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (window.GAVETA_OBRAS && typeof window.GAVETA_OBRAS.abrir === "function") {
        window.GAVETA_OBRAS.abrir();
        return;
      }
      abrirMini();
    });
    return b;
  }

  function alvoToolbar() {
    var menu = document.getElementById("orMenuBtn");
    var antigo = document.getElementById("meu-menu-abas");
    if (menu && menu.parentNode && menu.parentNode.id !== "pToolbarAbas") {
      return { pai: menu.parentNode, antes: menu };
    }
    if (antigo && antigo.parentNode) {
      return { pai: antigo.parentNode, antes: antigo };
    }
    var ca = document.querySelector(".content-area") || document.body;
    return { pai: ca, antes: ca.firstChild };
  }

  function encaixar() {
    var menu = document.getElementById("orMenuBtn");
    var obras = criarBotaoObras();
    var row = barra();
    var t = alvoToolbar();
    if (!row.parentNode || (t.pai && row.parentNode !== t.pai && t.pai.id !== "pToolbarAbas")) {
      if (t.antes && t.antes.parentNode === t.pai) { t.pai.insertBefore(row, t.antes); }
      else if (t.pai) { t.pai.insertBefore(row, t.pai.firstChild); }
    }
    if (menu && menu.parentNode !== row) { row.appendChild(menu); }
    if (obras.parentNode !== row) { row.appendChild(obras); }
    if (menu && row.firstChild !== menu) { row.insertBefore(menu, row.firstChild); }
    if (menu && obras && menu.nextSibling !== obras) { row.appendChild(obras); }
    atualizarRotulo();
    return true;
  }

  function limparMenu() {
    var nos = document.querySelectorAll("#orMenu .or-item, #meu-menu-abas .tab-btn");
    for (var i = 0; i < nos.length; i++) {
      var n = nos[i];
      var chave = String(n.getAttribute("data-chave") || n.textContent || "").toLowerCase();
      if (n.hasAttribute("data-obra-id") || /gerenciar obra|nova obra|lista de obras/.test(chave)) {
        n.style.display = "none";
      }
    }
  }

  function ligar() {
    css();
    encaixar();
    limparMenu();
    atualizarRotulo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(ligar, 200); });
  } else {
    setTimeout(ligar, 200);
  }
  window.addEventListener("load", function () { setTimeout(ligar, 600); });
  setInterval(function () {
    if (!document.getElementById("obrGavetaBtn") || !document.getElementById("pToolbarAbas")) {
      ligar();
    } else {
      atualizarRotulo();
    }
  }, 1800);
})();
