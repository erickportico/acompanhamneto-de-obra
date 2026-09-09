/* =====================================================================
 * PATCH: Obras ao lado do Menu
 * - Move #obrGavetaBtn para a mesma fileira de #orMenuBtn
 * - Mesmo tamanho e alinhamento
 * - Tira itens de obra da gaveta do Menu (ficam só na gaveta Obras)
 *
 * Uso: <script src="patch_obrasAoLadoDoMenu.js"></script>
 *      no final do index.html, depois dos scripts da gaveta.
 * ===================================================================== */
(function () {
  "use strict";
  if (window.__patchObrasAoLadoDoMenu) { return; }
  window.__patchObrasAoLadoDoMenu = true;

  var CSS = [
    "#pToolbarAbas{",
    "display:flex!important;flex-direction:row!important;align-items:center!important;",
    "gap:10px!important;flex-wrap:wrap!important;margin:10px 0 18px 0!important;width:100%;",
    "}",
    "#pToolbarAbas .or-launcher,#pToolbarAbas .obr-launcher{",
    "margin:0!important;height:44px!important;min-height:44px!important;",
    "box-sizing:border-box!important;padding:8px 16px 8px 12px!important;",
    "font:600 14px/1.2 inherit!important;border-radius:12px!important;",
    "gap:10px!important;align-items:center!important;vertical-align:middle;",
    "}",
    "#pToolbarAbas .or-launcher .or-burg,#pToolbarAbas .obr-launcher .obr-ico{",
    "width:26px!important;height:26px!important;border-radius:8px!important;flex-shrink:0;",
    "}",
    "#pToolbarAbas .or-launcher .or-rot,#pToolbarAbas .obr-launcher .obr-rot{",
    "font-weight:600!important;font-size:14px!important;color:#c3d1ea!important;",
    "}",
    "#pToolbarAbas .or-launcher .or-atual,#pToolbarAbas .obr-launcher .obr-atual{",
    "font-weight:500!important;font-size:13px!important;color:#9fb3d9!important;max-width:240px;",
    "}",
    ".project-selector #obrGavetaBtn{display:none!important;}",
    "#orMenu .or-item[data-obra-id],#orMenu .or-grupo[data-grupo-obras],",
    "#meu-menu-abas .tab-btn[data-obra-id],#meu-menu-abas .obr-obra{display:none!important;}"
  ].join("");

  function injetarCss() {
    if (document.getElementById("pToolbarAbasCss")) { return; }
    var s = document.createElement("style");
    s.id = "pToolbarAbasCss";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
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

  function encaixar() {
    var menu = document.getElementById("orMenuBtn");
    var obras = document.getElementById("obrGavetaBtn");
    var antigo = document.getElementById("meu-menu-abas");
    var pai = (menu && menu.parentNode && menu.parentNode.id !== "pToolbarAbas" && menu.parentNode) ||
              (antigo && antigo.parentNode) ||
              document.querySelector(".content-area") ||
              document.body;
    if (!pai) { return false; }

    var row = barra();
    if (row.parentNode !== pai && row.parentNode !== document.body) {
      /* ok */
    }
    if (!row.parentNode || row.parentNode === document.body && pai !== document.body) {
      if (menu && menu.parentNode === pai) { pai.insertBefore(row, menu); }
      else if (antigo && antigo.parentNode === pai) { pai.insertBefore(row, antigo); }
      else { pai.insertBefore(row, pai.firstChild); }
    } else if (row.parentNode !== pai && menu && menu.parentNode === pai) {
      pai.insertBefore(row, menu);
    }

    if (menu && menu.parentNode !== row) { row.appendChild(menu); }
    if (obras && obras.parentNode !== row) { row.appendChild(obras); }

    if (menu && obras && row.firstChild !== menu) {
      row.insertBefore(menu, row.firstChild);
      if (obras.parentNode === row) { row.appendChild(obras); }
    }
    return !!(menu || obras);
  }

  function eItemDeObra(n) {
    if (!n || !n.getAttribute) { return false; }
    if (n.hasAttribute("data-obra-id") || (n.classList && n.classList.contains("obr-obra"))) {
      return true;
    }
    var aba = String(n.getAttribute("data-aba") || n.id || "").toLowerCase();
    var chave = String(n.getAttribute("data-chave") || n.textContent || "").toLowerCase();
    if (aba.indexOf("obra-") === 0) { return true; }
    if (/trocarobra|selecionar obra|lista de obras|gerenciar obra|nova obra/.test(chave)) {
      return true;
    }
    return false;
  }

  function limparObrasDoMenu() {
    var nos = document.querySelectorAll("#orMenu .or-item, #meu-menu-abas .tab-btn");
    for (var i = 0; i < nos.length; i++) {
      if (eItemDeObra(nos[i])) { nos[i].style.display = "none"; }
    }
    var grupos = document.querySelectorAll("#orMenu .or-grupo");
    for (var j = 0; j < grupos.length; j++) {
      var t = String(grupos[j].textContent || "").toUpperCase();
      if (t.indexOf("OBRAS") >= 0 || t.indexOf("PROJETOS") >= 0) {
        grupos[j].setAttribute("data-grupo-obras", "1");
        grupos[j].style.display = "none";
      }
    }
  }

  function interceptarGavetaObras() {
    var G = window.GAVETA_OBRAS;
    if (!G || G.__patchLadoMenu) { return; }
    G.__patchLadoMenu = true;
    var orig = G.arrumar;
    if (typeof orig === "function") {
      G.arrumar = function () {
        var r = orig.apply(this, arguments);
        encaixar();
        return r;
      };
    }
  }

  function ligar() {
    injetarCss();
    interceptarGavetaObras();
    encaixar();
    limparObrasDoMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(ligar, 250); });
  } else {
    setTimeout(ligar, 250);
  }
  window.addEventListener("load", function () { setTimeout(ligar, 500); });
  setInterval(function () {
    interceptarGavetaObras();
    var row = document.getElementById("pToolbarAbas");
    var menu = document.getElementById("orMenuBtn");
    var obras = document.getElementById("obrGavetaBtn");
    if (!row || (menu && menu.parentNode !== row) || (obras && obras.parentNode !== row)) {
      encaixar();
    }
    limparObrasDoMenu();
  }, 1600);
})();
