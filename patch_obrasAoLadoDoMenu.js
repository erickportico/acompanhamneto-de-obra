/* =====================================================================
 * PATCH v3 — Obras ao lado do Menu (Painel Servidor)
 * - Cria botão Obras do mesmo tamanho do Menu
 * - Move o grupo OBRAS para fora da gaveta Painel Servidor
 * ===================================================================== */
(function () {
  "use strict";
  if (window.__patchObrasMenuV3) { return; }
  window.__patchObrasMenuV3 = true;

  var CSS = ""
    + "#pToolbarAbas{display:flex!important;align-items:center!important;gap:10px!important;"
    + "flex-wrap:wrap!important;margin:10px 0 18px 0!important;width:auto;}"
    + "#orMenuBtn,#obrGavetaBtn,.obr-launcher{"
    + "height:44px!important;min-height:44px!important;box-sizing:border-box!important;"
    + "padding:8px 16px 8px 12px!important;border-radius:12px!important;"
    + "display:inline-flex!important;align-items:center!important;gap:10px!important;"
    + "font:600 14px/1.2 Inter,system-ui,sans-serif!important;margin:0!important;}"
    + "#obrGavetaBtn,.obr-launcher{"
    + "color:#e8eefc;background:linear-gradient(135deg,#1b2540 0%,#111827 100%);"
    + "border:1px solid rgba(255,255,255,.14)!important;cursor:pointer;"
    + "box-shadow:0 6px 18px rgba(2,8,23,.35);}"
    + "#obrGavetaBtn .obr-ico{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;"
    + "background:rgba(245,158,11,.18);font-size:15px;}"
    + "#obrGavetaBtn .obr-rot{color:#c3d1ea;}"
    + "#obrGavetaBtn .obr-atual{color:#9fb3d9;font-weight:500;max-width:220px;overflow:hidden;"
    + "text-overflow:ellipsis;white-space:nowrap;}"
    + "#obrGavetaBtn .obr-atual:before{content:'•';margin:0 6px 0 2px;color:#f59e0b;}"
    + ".project-selector select#selectObra,"
    + ".project-selector button[onclick*='abrirModalObra'],"
    + ".project-selector button[onclick*='abrirModalNovaObra'],"
    + ".project-selector button[onclick*='excluirObraAtual']{display:none!important;}"
    + "#orMenu .or-grupo[data-p-obras='1'],#orMenu .or-item[data-p-obras='1']{display:none!important;}"
    + "#obrDrawer{position:fixed;inset:0;z-index:2147483002;display:none;}"
    + "#obrDrawer.on{display:block;}"
    + "#obrDrawer .od-fundo{position:absolute;inset:0;background:rgba(2,8,23,.45);}"
    + "#obrDrawer .od-painel{position:absolute;left:0;top:0;bottom:0;width:min(340px,92vw);"
    + "background:#0f172a;color:#e2e8f0;box-shadow:8px 0 30px rgba(0,0,0,.35);"
    + "display:flex;flex-direction:column;}"
    + "#obrDrawer .od-topo{display:flex;align-items:center;gap:10px;padding:14px 14px 10px;"
    + "border-bottom:1px solid #1e293b;}"
    + "#obrDrawer .od-logo{width:34px;height:34px;border-radius:10px;background:#f59e0b;color:#111;"
    + "display:grid;place-items:center;font-weight:800;}"
    + "#obrDrawer .od-topo b{display:block;font-size:14px;}"
    + "#obrDrawer .od-topo span{display:block;font-size:11px;color:#94a3b8;}"
    + "#obrDrawer .od-x{margin-left:auto;border:0;background:transparent;color:#94a3b8;"
    + "font-size:22px;cursor:pointer;}"
    + "#obrDrawer .od-lista{overflow:auto;padding:10px;flex:1;}"
    + "#obrDrawer .od-item{display:block;width:100%;text-align:left;border:0;background:transparent;"
    + "color:#e2e8f0;padding:10px 12px;border-radius:8px;cursor:pointer;font:600 13px Inter,sans-serif;}"
    + "#obrDrawer .od-item:hover{background:#1e293b;}"
    + "#obrDrawer .od-item.on{background:#2563eb;color:#fff;}"
    + "#obrDrawer .od-foot{display:flex;gap:8px;padding:12px;border-top:1px solid #1e293b;}"
    + "#obrDrawer .od-foot button{flex:1;border:0;border-radius:8px;padding:9px 8px;cursor:pointer;"
    + "font:600 12px Inter,sans-serif;color:#fff;}";

  function css() {
    if (document.getElementById("pObrasMenuCss")) { return; }
    var s = document.createElement("style");
    s.id = "pObrasMenuCss";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function listaObras() {
    try {
      if (window.db && Array.isArray(window.db.obras)) { return window.db.obras; }
    } catch (e) {}
    try {
      if (typeof db !== "undefined" && db && Array.isArray(db.obras)) { return db.obras; }
    } catch (e2) {}
    return [];
  }

  function idAtual() {
    try {
      if (window.db && window.db.obraAtualId) { return window.db.obraAtualId; }
    } catch (e) {}
    try {
      if (typeof db !== "undefined" && db && db.obraAtualId) { return db.obraAtualId; }
    } catch (e2) {}
    return "";
  }

  function nomeAtual() {
    var id = idAtual();
    var o = listaObras().filter(function (x) { return x && x.id === id; })[0] || listaObras()[0];
    return o ? (o.nome || "Obra") : "Obras";
  }

  function marcarGrupoNoMenu() {
    var lista = document.getElementById("orLista");
    if (!lista) { return; }
    var filhos = lista.children;
    var dentro = false;
    for (var i = 0; i < filhos.length; i++) {
      var n = filhos[i];
      var cls = n.className || "";
      if (cls.indexOf("or-grupo") >= 0) {
        var t = String(n.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
        dentro = (t === "OBRAS" || t === "PROJETOS" || t.indexOf("OBRAS") === 0);
        if (dentro) { n.setAttribute("data-p-obras", "1"); }
        continue;
      }
      if (dentro) { n.setAttribute("data-p-obras", "1"); }
    }
  }

  function drawer() {
    var d = document.getElementById("obrDrawer");
    if (d) { return d; }
    d = document.createElement("div");
    d.id = "obrDrawer";
    d.innerHTML =
      '<div class="od-fundo"></div>' +
      '<div class="od-painel">' +
        '<div class="od-topo">' +
          '<span class="od-logo">OB</span>' +
          '<span><b>Obras</b><span>Trocar projeto</span></span>' +
          '<button type="button" class="od-x" id="odFechar">×</button>' +
        "</div>" +
        '<div class="od-lista" id="odLista"></div>' +
        '<div class="od-foot">' +
          '<button type="button" id="odNova" style="background:#10b981">+ Nova Obra</button>' +
          '<button type="button" id="odGer" style="background:#f59e0b;color:#111">Gerenciar</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(d);
    d.querySelector(".od-fundo").onclick = fechar;
    d.querySelector("#odFechar").onclick = fechar;
    d.querySelector("#odNova").onclick = function () {
      fechar();
      if (typeof abrirModalNovaObra === "function") { abrirModalNovaObra(); }
    };
    d.querySelector("#odGer").onclick = function () {
      fechar();
      if (typeof abrirModalObra === "function") { abrirModalObra(); }
    };
    return d;
  }

  function montarLista() {
    var box = document.getElementById("odLista");
    if (!box) { return; }
    var atual = idAtual();
    box.innerHTML = "";
    listaObras().forEach(function (o) {
      if (!o) { return; }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "od-item" + (o.id === atual ? " on" : "");
      b.textContent = o.nome || o.id;
      b.addEventListener("click", function () {
        fechar();
        if (typeof trocarObra === "function") { trocarObra(o.id); }
        setTimeout(atualizarRotulo, 50);
      });
      box.appendChild(b);
    });
    if (!box.firstChild) { box.textContent = "Nenhuma obra carregada."; }
  }

  function abrir() {
    if (window.ORMENU && typeof window.ORMENU.fechar === "function") {
      try { window.ORMENU.fechar(); } catch (e) {}
    }
    drawer();
    montarLista();
    document.getElementById("obrDrawer").classList.add("on");
  }

  function fechar() {
    var d = document.getElementById("obrDrawer");
    if (d) { d.classList.remove("on"); }
  }

  function atualizarRotulo() {
    var r = document.getElementById("obrAtual");
    if (r) { r.textContent = nomeAtual(); }
  }

  function botaoObras() {
    var b = document.getElementById("obrGavetaBtn");
    if (b) { return b; }
    b = document.createElement("button");
    b.id = "obrGavetaBtn";
    b.type = "button";
    b.className = "obr-launcher";
    b.innerHTML = '<span class="obr-ico" aria-hidden="true">🏗️</span>'
      + '<span class="obr-rot">Obras</span>'
      + '<span class="obr-atual" id="obrAtual"></span>';
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var d = document.getElementById("obrDrawer");
      if (d && d.classList.contains("on")) { fechar(); }
      else { abrir(); }
    });
    return b;
  }

  function encaixar() {
    var menu = document.getElementById("orMenuBtn");
    var obras = botaoObras();
    var row = document.getElementById("pToolbarAbas");
    if (!row) {
      row = document.createElement("div");
      row.id = "pToolbarAbas";
    }
    if (menu) {
      if (row.parentNode !== menu.parentNode) {
        menu.parentNode.insertBefore(row, menu);
      }
      if (menu.parentNode !== row) { row.appendChild(menu); }
    } else if (!row.parentNode) {
      var host = document.querySelector(".content-area") || document.body;
      host.insertBefore(row, host.firstChild);
    }
    if (obras.parentNode !== row) { row.appendChild(obras); }
    if (menu && row.firstChild !== menu) { row.insertBefore(menu, row.firstChild); }
    atualizarRotulo();
  }

  function ligar() {
    css();
    encaixar();
    marcarGrupoNoMenu();
    drawer();
    atualizarRotulo();
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { fechar(); }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(ligar, 250); });
  } else {
    setTimeout(ligar, 250);
  }
  window.addEventListener("load", function () { setTimeout(ligar, 700); });
  setInterval(function () {
    encaixar();
    marcarGrupoNoMenu();
    atualizarRotulo();
  }, 1500);
})();
