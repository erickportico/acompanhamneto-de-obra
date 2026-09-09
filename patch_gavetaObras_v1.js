/* =====================================================================
 * patch_gavetaObras_v1.js
 * GAVETA DO TAB OBRAS — gaveta lateral para gerenciar obras
 *
 * O que faz:
 *   1. Remove o CSS antigo "GAVETA OBRAS" (ob-*) entre PATCH 62 e </style>
 *   2. Remove o div.ob-nuvem-row duplicado no header-badges-right
 *   3. Remove o script tag do patch-estoque-obra.js (API morta)
 *   4. Insere novo bloco <style> com prefixo "obr-" antes de </head>
 *   5. Insere novo bloco <script> IIFE (GAVETA OBRAS) antes de </body>
 *   6. Esconde o selectObra + botoes Gerenciar/Nova/Excluir via JS
 *   7. NAO toca no PATCH 62 (orMenu / or-*) de forma alguma
 *
 * Prefixo: obr- (obr-launcher, #obrGaveta, obr-painel, etc.)
 * Cor accent: amber/laranja (#f59e0b) — diferencia do orMenu (azul #3b82f6)
 * API publica: window.GAVETA_OBRAS (abrir, fechar, alternar, arrumar)
 *
 * USO:  node patch_gavetaObras_v1.js
 * DEPOIS: git add index.html && git commit -m "Gaveta OBRAS v1" && git push
 * ===================================================================== */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');

function main() {
  let h = fs.readFileSync(FILE, 'utf8');
  const origLen = h.length;
  let steps = 0;

  /* ================================================================ *
   * PASSO 1 — Remover CSS antigo GAVETA OBRAS (ob-*)
   * ================================================================ */
  const markerGaveta = '/* === GAVETA OBRAS';
  const iGav = h.indexOf(markerGaveta);
  if (iGav !== -1) {
    const styleClose = h.indexOf('</style>', iGav);
    if (styleClose !== -1) {
      const beforeStyleClose = h.lastIndexOf('\n', styleClose);
      const cutEnd = (beforeStyleClose > iGav) ? beforeStyleClose : styleClose;
      h = h.substring(0, iGav) + h.substring(cutEnd);
      steps++;
      console.log('1\u2713 CSS GAVETA OBRAS (ob-*) removido');
    }
  } else {
    console.log('1\u26a0 Marcador CSS GAVETA OBRAS nao encontrado');
  }

  /* ================================================================ *
   * PASSO 2 — Remover ob-nuvem-row duplicado no header-badges-right
   * ================================================================ */
  const reNuvem = /<div\s+class="ob-nuvem-row">[\s\S]*?<\/div>\s*\n(\s*<\/div>)/g;
  const antes2 = h.length;
  h = h.replace(reNuvem, '$1');
  if (h.length !== antes2) {
    steps++;
    console.log('2\u2713 ob-nuvem-row duplicado removido');
  } else {
    console.log('2\u26a0 ob-nuvem-row nao encontrado');
  }

  /* ================================================================ *
   * PASSO 3 — Remover script tag patch-estoque-obra.js (API morta)
   * ================================================================ */
  const reEstoque = /<script[^>]*src=["'][^"']*patch-estoque-obra\.js["'][^>]*><\/script>\s*/gi;
  const antes3 = h.length;
  h = h.replace(reEstoque, '');
  if (h.length !== antes3) {
    steps++;
    console.log('3\u2713 Script tag patch-estoque-obra.js removido');
  } else {
    console.log('3\u26a0 Script tag patch-estoque-obra.js nao encontrado');
  }

  /* ================================================================ *
   * PASSO 4 — Inserir novo CSS com prefixo obr- antes de </head>
   * ================================================================ */
  const BULLET = '\u2022';
  const OBR_CSS = `
<style>
/* === GAVETA OBRAS v1 \u2014 launcher + painel lateral (prefixo obr-) === */

/* launcher \u2014 botao que abre a gaveta */
.obr-launcher {
  display: inline-flex !important;
  align-items: center;
  gap: 8px;
  margin: 0 0 0 6px !important;
  padding: 6px 13px 6px 10px !important;
  font: 600 13px/1.2 inherit;
  color: #e8eefc;
  background: linear-gradient(135deg, #1b2540 0%, #111827 100%);
  border: 1px solid rgba(255,255,255,.14) !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 14px rgba(2,8,23,.3);
  cursor: pointer;
  user-select: none;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.obr-launcher:hover {
  transform: translateY(-1px);
  border-color: rgba(245,158,11,.55) !important;
  box-shadow: 0 8px 20px rgba(2,8,23,.4);
}
.obr-launcher:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }
.obr-launcher .obr-ico {
  display: grid; place-items: center;
  width: 24px; height: 24px; font-size: 15px;
  background: rgba(245,158,11,.18); border-radius: 7px;
}
.obr-launcher .obr-rot {
  font-weight: 600; color: #c3d1ea; font-size: 12.5px;
}
.obr-launcher .obr-atual {
  max-width: 200px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
  font-weight: 500; color: #9fb3d9; font-size: 12px;
}
.obr-launcher .obr-atual:before { content: '${BULLET}'; margin-right: 6px; color: #f59e0b; }

/* gaveta lateral \u2014 overlay + painel */
#obrGaveta:not(.obr-on) {
  display: none !important; visibility: hidden !important;
  pointer-events: none !important; opacity: 0 !important;
}
#obrGaveta.obr-on {
  display: block !important; visibility: visible !important;
  pointer-events: auto !important; opacity: 1 !important;
  position: fixed !important; top: 0 !important; left: 0 !important;
  right: 0 !important; bottom: 0 !important;
  width: 100% !important; height: 100% !important;
  max-width: none !important; margin: 0 !important; padding: 0 !important;
  z-index: 100095 !important;
}
.obr-fundo {
  position: absolute !important; inset: 0 !important;
  width: 100% !important; height: 100% !important;
  background: rgba(3,7,18,.62);
  backdrop-filter: blur(3px);
  animation: obrFade .18s ease;
}
@keyframes obrFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes obrSlide { from { transform: translateX(-24px); opacity: .4; } to { transform: none; opacity: 1; } }

.obr-painel {
  position: absolute !important; top: 0 !important; left: 0 !important;
  bottom: 0 !important; right: auto !important;
  display: flex !important; flex-direction: column !important;
  width: 340px !important; max-width: 90vw !important;
  height: 100% !important; margin: 0 !important; padding: 0 !important;
  background: #0d1424;
  border-right: 1px solid rgba(255,255,255,.08);
  box-shadow: 24px 0 60px rgba(2,6,23,.55);
  animation: obrSlide .2s ease;
  overflow: hidden;
}

/* topo da gaveta */
.obr-topo {
  display: flex !important; align-items: center; gap: 12px;
  width: auto !important;
  padding: 18px 16px 14px 18px !important;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.obr-logo {
  display: grid !important; place-items: center;
  width: 38px !important; height: 38px; flex: 0 0 38px;
  font: 800 15px/1 inherit; color: #fff;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 11px;
  box-shadow: 0 6px 16px rgba(245,158,11,.35);
}
.obr-nomes { flex: 1 1 auto; min-width: 0; width: auto !important; }
.obr-nomes b { display: block; font-size: 13.5px; letter-spacing: .3px; color: #f1f5f9; }
.obr-nomes span { display: block; font-size: 11.5px; color: #7f92b5; margin-top: 2px; }
.obr-x {
  width: 32px !important; height: 32px; flex: 0 0 32px;
  padding: 0 !important; font-size: 18px; line-height: 1;
  color: #9fb3d9; background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1) !important;
  border-radius: 9px !important; cursor: pointer;
}
.obr-x:hover { color: #fff; background: rgba(239,68,68,.22); }

/* busca */
.obr-buscabox { padding: 10px 14px 6px 14px !important; width: auto !important; }
.obr-busca {
  width: 100% !important; max-width: 100% !important;
  padding: 8px 11px !important; font: 400 12.5px/1.3 inherit;
  color: #e8eefc; background: #131c2f !important;
  border: 1px solid rgba(255,255,255,.1) !important;
  border-radius: 10px !important; box-sizing: border-box;
}
.obr-busca::placeholder { color: #6b7f9f; }
.obr-busca:focus { outline: none; border-color: rgba(245,158,11,.6) !important; background: #16203a !important; }

/* lista de obras */
.obr-lista {
  flex: 1 1 auto; width: auto !important;
  padding: 8px 10px 14px 10px !important;
  overflow-y: auto; overflow-x: hidden;
}
.obr-grupo {
  padding: 12px 8px 6px 8px;
  font: 700 10.5px/1 inherit;
  letter-spacing: 1.2px; text-transform: uppercase;
  color: #5d708f;
}
.obr-obra {
  display: flex !important; align-items: center; gap: 11px;
  width: 100% !important; max-width: 100% !important;
  margin: 3px 0 !important; padding: 10px 12px !important;
  font: 500 13.5px/1.25 inherit;
  text-align: left !important; color: #c3d1ea;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 10px !important; cursor: pointer;
  box-sizing: border-box;
  transition: background .14s ease, color .14s ease, transform .14s ease;
}
.obr-obra:hover {
  color: #fff; background: rgba(245,158,11,.1) !important;
  transform: translateX(2px);
}
.obr-obra:focus-visible { outline: 2px solid #f59e0b; outline-offset: 1px; }
.obr-obra .obr-ico2 {
  display: grid; place-items: center;
  width: 28px; height: 28px; flex: 0 0 28px; font-size: 14px;
  background: rgba(255,255,255,.05); border-radius: 8px;
}
.obr-obra .obr-txt {
  flex: 1 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.obr-obra.obr-ativo {
  color: #fff;
  background: linear-gradient(90deg, rgba(245,158,11,.22), rgba(245,158,11,.06)) !important;
  border-color: rgba(245,158,11,.3) !important;
  font-weight: 700;
}
.obr-obra.obr-ativo .obr-ico2 { background: rgba(245,158,11,.22); }
.obr-obra.obr-ativo:after {
  content: ''; width: 6px; height: 6px; flex: 0 0 6px;
  border-radius: 50%; background: #f59e0b; box-shadow: 0 0 8px #f59e0b;
}
.obr-vazio { padding: 18px 12px; font-size: 12.5px; color: #6b7f9f; text-align: center; }
.obr-esconde { display: none !important; }

/* rodape com botoes de acao */
.obr-rodape {
  width: auto !important; padding: 12px 14px 16px 14px !important;
  border-top: 1px solid rgba(255,255,255,.07);
  display: flex; flex-direction: column; gap: 8px;
}
.obr-rodape button {
  width: 100%; padding: 9px 12px !important;
  font: 500 13px/1.2 inherit; border-radius: 8px !important;
  cursor: pointer; border: 1px solid rgba(255,255,255,.1) !important;
  transition: background .14s ease;
}
.obr-btn-gerenciar {
  color: #000 !important; background: #f59e0b !important;
  border-color: rgba(245,158,11,.4) !important;
}
.obr-btn-gerenciar:hover { background: #d97706 !important; }
.obr-btn-nova {
  color: #fff !important; background: #16a34a !important;
  border-color: rgba(22,163,74,.4) !important;
}
.obr-btn-nova:hover { background: #15803d !important; }
.obr-btn-excluir {
  color: #fff !important; background: #dc2626 !important;
  border-color: rgba(220,38,38,.4) !important;
}
.obr-btn-excluir:hover { background: #b91c1c !important; }

/* info de contrato no rodape */
.obr-info {
  width: auto !important; padding: 8px 16px 10px 16px !important;
  font-size: 11px; color: #5d708f;
  border-top: 1px solid rgba(255,255,255,.05);
}

/* esconder elementos antigos do project-selector */
.obr-substitui {
  position: absolute !important; left: -9999px !important;
  width: 1px !important; height: 1px !important;
  opacity: 0 !important; pointer-events: none !important;
}

body.obr-aberto { overflow: hidden !important; }

@media (max-width: 520px) {
  .obr-launcher .obr-atual { display: none; }
  .obr-painel { width: 290px !important; }
}
@media print {
  #obrGaveta, .obr-launcher { display: none !important; visibility: hidden !important; }
}
</style>
`;

  const headClose = h.indexOf('</head>');
  if (headClose !== -1) {
    h = h.substring(0, headClose) + OBR_CSS + h.substring(headClose);
    steps++;
    console.log('4\u2713 CSS obr- inserido antes de </head>');
  }

  /* ================================================================ *
   * PASSO 5 — Inserir JS da Gaveta OBRAS antes de </body>
   * Para evitar problemas de escape, vou construir o JS como string
   * bruta linha por linha.
   * ================================================================ */
  var jsLines = [];
  jsLines.push('');
  jsLines.push('<script>');
  jsLines.push('/* === GAVETA OBRAS v1 \u2014 gaveta lateral para gerenciar obras === */');
  jsLines.push('(function () {');
  jsLines.push('  "use strict";');
  jsLines.push('');
  jsLines.push('  var G = window.GAVETA_OBRAS = window.GAVETA_OBRAS || {};');
  jsLines.push('  if (G.__v1) { return; }');
  jsLines.push('  G.__v1 = true;');
  jsLines.push('');
  jsLines.push('  var D = document;');
  jsLines.push('');
  jsLines.push('  /* estado */');
  jsLines.push('  var gaveta = null;');
  jsLines.push('  var launcher = null;');
  jsLines.push('  var montada = false;');
  jsLines.push('  var sigAtual = "";');
  jsLines.push('  var nos = {};');
  jsLines.push('  var noVazio = null;');
  jsLines.push('');
  jsLines.push('  function el(id) { return D.getElementById(id); }');
  jsLines.push('');
  jsLines.push('  /* ler db.obras de forma segura */');
  jsLines.push('  function obras() {');
  jsLines.push('    try {');
  jsLines.push('      if (typeof db !== "undefined" && db.obras && Array.isArray(db.obras)) { return db.obras; }');
  jsLines.push('    } catch (e) { }');
  jsLines.push('    return [];');
  jsLines.push('  }');
  jsLines.push('  function obraAtualId() {');
  jsLines.push('    try {');
  jsLines.push('      if (typeof db !== "undefined" && db.obraAtualId) { return db.obraAtualId; }');
  jsLines.push('    } catch (e) { }');
  jsLines.push('    return "";');
  jsLines.push('  }');
  jsLines.push('  function obraAtual() {');
  jsLines.push('    var id = obraAtualId();');
  jsLines.push('    var lista = obras();');
  jsLines.push('    var o = lista.find(function (x) { return x.id === id; });');
  jsLines.push('    return o || lista[0] || null;');
  jsLines.push('  }');
  jsLines.push('');
  jsLines.push('  function assinatura() {');
  jsLines.push('    var lista = obras();');
  jsLines.push('    return lista.length + ":" + lista.map(function (o) { return o.id; }).join(",");');
  jsLines.push('  }');
  jsLines.push('');
  jsLines.push('  function nomeAtual() {');
  jsLines.push('    var o = obraAtual();');
  jsLines.push('    return o ? (o.nome || "Sem nome") : "Sem obras";');
  jsLines.push('  }');
  jsLines.push('');
  // esconderAntigos
  jsLines.push('  function esconderAntigos() {');
  jsLines.push('    var sel = el("selectObra");');
  jsLines.push('    if (sel && !sel.classList.contains("obr-substitui")) {');
  jsLines.push('      sel.classList.add("obr-substitui");');
  jsLines.push('    }');
  jsLines.push('    var ps = D.querySelector(".project-selector");');
  jsLines.push('    if (!ps) { return; }');
  jsLines.push('    var btns = ps.querySelectorAll("button");');
  jsLines.push('    for (var i = 0; i < btns.length; i++) {');
  jsLines.push('      var txt = (btns[i].textContent || "").trim();');
  jsLines.push('      var onc = btns[i].getAttribute("onclick") || "";');
  jsLines.push('      if (txt.indexOf("Gerenciar Obra") >= 0 ||');
  jsLines.push('          txt.indexOf("Nova Obra") >= 0 ||');
  jsLines.push('          onc === "excluirObraAtual()") {');
  jsLines.push('        if (!btns[i].classList.contains("obr-substitui")) {');
  jsLines.push('          btns[i].classList.add("obr-substitui");');
  jsLines.push('        }');
  jsLines.push('      }');
  jsLines.push('    }');
  jsLines.push('  }');
  jsLines.push('');
  // garantirLauncher
  jsLines.push('  function garantirLauncher() {');
  jsLines.push('    var antigo = D.querySelector(".project-selector");');
  jsLines.push('    if (!antigo) { return null; }');
  jsLines.push('    var b = el("obrGavetaBtn");');
  jsLines.push('    if (!b) {');
  jsLines.push('      b = D.createElement("button");');
  jsLines.push('      b.id = "obrGavetaBtn";');
  jsLines.push('      b.type = "button";');
  jsLines.push('      b.className = "obr-launcher";');
  jsLines.push('      b.setAttribute("aria-haspopup", "true");');
  jsLines.push('      b.setAttribute("aria-expanded", "false");');
  jsLines.push('      b.setAttribute("aria-controls", "obrGaveta");');
  // innerHTML do launcher — usando concat com caracteres unicode
  jsLines.push('      b.innerHTML = ');
  jsLines.push('        \'<span class="obr-ico" aria-hidden="true">\u{1F3D7}\uFE0F</span>\' +');
  jsLines.push('        \'<span class="obr-rot">Obras</span>\' +');
  jsLines.push('        \'<span class="obr-atual" id="obrAtual"></span>\';');
  jsLines.push('      b.addEventListener("click", function (ev) {');
  jsLines.push('        ev.preventDefault();');
  jsLines.push('        G.abrir();');
  jsLines.push('      });');
  jsLines.push('    }');
  jsLines.push('    if (b.parentNode !== antigo) {');
  jsLines.push('      antigo.insertBefore(b, antigo.firstChild);');
  jsLines.push('    }');
  jsLines.push('    launcher = b;');
  jsLines.push('    return b;');
  jsLines.push('  }');
  jsLines.push('');
  // criarGaveta
  jsLines.push('  function criarGaveta() {');
  jsLines.push('    var g = el("obrGaveta");');
  jsLines.push('    if (g) { gaveta = g; return g; }');
  jsLines.push('    g = D.createElement("div");');
  jsLines.push('    g.id = "obrGaveta";');
  jsLines.push('    g.setAttribute("role", "dialog");');
  jsLines.push('    g.setAttribute("aria-modal", "true");');
  jsLines.push('    g.setAttribute("aria-label", "Gaveta de Obras");');
  jsLines.push('    g.setAttribute("aria-hidden", "true");');
  jsLines.push('    g.innerHTML =');
  jsLines.push('      \'<div class="obr-fundo" id="obrFundo"></div>\' +');
  jsLines.push('      \'<div class="obr-painel">\' +');
  jsLines.push('        \'<div class="obr-topo">\' +');
  jsLines.push('          \'<span class="obr-logo" aria-hidden="true">OB</span>\' +');
  jsLines.push('          \'<span class="obr-nomes"><b>Gaveta de Obras</b><span>Gerenciar projetos</span></span>\' +');
  jsLines.push('          \'<button type="button" class="obr-x" id="obrFechar" title="Fechar" aria-label="Fechar gaveta">\u00d7</button>\' +');
  jsLines.push('        \'</div>\' +');
  jsLines.push('        \'<div class="obr-buscabox">\' +');
  jsLines.push('          \'<input type="text" class="obr-busca" id="obrBusca" placeholder="Buscar obra..." autocomplete="off">\' +');
  jsLines.push('        \'</div>\' +');
  jsLines.push('        \'<div class="obr-lista" id="obrLista"></div>\' +');
  jsLines.push('        \'<div class="obr-rodape">\' +');
  jsLines.push('          \'<button type="button" class="obr-btn-nova" id="obrNovaObra">+ Nova Obra</button>\' +');
  jsLines.push('          \'<button type="button" class="obr-btn-gerenciar" id="obrGerenciar">\u2699\uFE0F Gerenciar Obra</button>\' +');
  jsLines.push('          \'<button type="button" class="obr-btn-excluir" id="obrExcluir">\u{1F5D1}\uFE0F Excluir Obra</button>\' +');
  jsLines.push('        \'</div>\' +');
  jsLines.push('        \'<div class="obr-info" id="obrInfo"></div>\' +');
  jsLines.push('      \'</div>\';');
  jsLines.push('    D.body.appendChild(g);');
  jsLines.push('');
  jsLines.push('    g.addEventListener("click", function (ev) {');
  jsLines.push('      if (ev.target === g || ev.target.id === "obrFundo") { G.fechar(); }');
  jsLines.push('    });');
  jsLines.push('    var x = g.querySelector("#obrFechar");');
  jsLines.push('    if (x) { x.addEventListener("click", function () { G.fechar(); }); }');
  jsLines.push('');
  jsLines.push('    var busca = g.querySelector("#obrBusca");');
  jsLines.push('    if (busca) {');
  jsLines.push('      busca.addEventListener("input", function () { filtrar(busca.value); });');
  jsLines.push('      busca.addEventListener("keydown", function (ev) {');
  jsLines.push('        if (ev.key !== "Enter") { return; }');
  jsLines.push('        var alvo = g.querySelector(".obr-obra:not(.obr-esconde)");');
  jsLines.push('        if (alvo) { alvo.click(); }');
  jsLines.push('      });');
  jsLines.push('    }');
  jsLines.push('');
  jsLines.push('    var btnNova = g.querySelector("#obrNovaObra");');
  jsLines.push('    if (btnNova) {');
  jsLines.push('      btnNova.addEventListener("click", function () {');
  jsLines.push('        G.fechar();');
  jsLines.push('        if (typeof abrirModalNovaObra === "function") { abrirModalNovaObra(); }');
  jsLines.push('      });');
  jsLines.push('    }');
  jsLines.push('    var btnGerenciar = g.querySelector("#obrGerenciar");');
  jsLines.push('    if (btnGerenciar) {');
  jsLines.push('      btnGerenciar.addEventListener("click", function () {');
  jsLines.push('        G.fechar();');
  jsLines.push('        if (typeof abrirModalObra === "function") { abrirModalObra(); }');
  jsLines.push('      });');
  jsLines.push('    }');
  jsLines.push('    var btnExcluir = g.querySelector("#obrExcluir");');
  jsLines.push('    if (btnExcluir) {');
  jsLines.push('      btnExcluir.addEventListener("click", function () {');
  jsLines.push('        G.fechar();');
  jsLines.push('        if (typeof excluirObraAtual === "function") { excluirObraAtual(); }');
  jsLines.push('      });');
  jsLines.push('    }');
  jsLines.push('');
  jsLines.push('    gaveta = g;');
  jsLines.push('    return g;');
  jsLines.push('  }');
  jsLines.push('');
  // noVazioNode
  jsLines.push('  function noVazioNode() {');
  jsLines.push('    if (!noVazio) {');
  jsLines.push('      noVazio = D.createElement("div");');
  jsLines.push('      noVazio.className = "obr-vazio obr-esconde";');
  jsLines.push('      noVazio.textContent = "Nenhuma obra encontrada.";');
  jsLines.push('    }');
  jsLines.push('    return noVazio;');
  jsLines.push('  }');
  jsLines.push('');
  // noItemObra
  jsLines.push('  function noItemObra(obra) {');
  jsLines.push('    var b = nos[obra.id];');
  jsLines.push('    if (b) {');
  jsLines.push('      var t = b.querySelector(".obr-txt");');
  jsLines.push('      if (t && t.textContent !== obra.nome) { t.textContent = obra.nome; }');
  jsLines.push('      return b;');
  jsLines.push('    }');
  jsLines.push('    b = D.createElement("button");');
  jsLines.push('    b.type = "button";');
  jsLines.push('    b.className = "obr-obra";');
  jsLines.push('    b.setAttribute("data-obra-id", obra.id);');
  jsLines.push('    var ico = D.createElement("span");');
  jsLines.push('    ico.className = "obr-ico2";');
  jsLines.push('    ico.setAttribute("aria-hidden", "true");');
  jsLines.push('    ico.textContent = "\u{1F3D7}\uFE0F";');
  jsLines.push('    var txt = D.createElement("span");');
  jsLines.push('    txt.className = "obr-txt";');
  jsLines.push('    txt.textContent = obra.nome || "Sem nome";');
  jsLines.push('    b.appendChild(ico);');
  jsLines.push('    b.appendChild(txt);');
  jsLines.push('');
  jsLines.push('    var oid = obra.id;');
  jsLines.push('    b.addEventListener("click", function () {');
  jsLines.push('      G.fechar();');
  jsLines.push('      if (typeof trocarObra === "function") { trocarObra(oid); }');
  jsLines.push('    });');
  jsLines.push('    nos[obra.id] = b;');
  jsLines.push('    return b;');
  jsLines.push('  }');
  jsLines.push('');
  // montarLista
  jsLines.push('  function montarLista() {');
  jsLines.push('    var caixa = el("obrLista");');
  jsLines.push('    if (!caixa) { return; }');
  jsLines.push('    var lista = obras();');
  jsLines.push('    var frag = D.createDocumentFragment();');
  jsLines.push('    var titulo = D.createElement("div");');
  jsLines.push('    titulo.className = "obr-grupo";');
  jsLines.push('    titulo.textContent = "PROJETOS";');
  jsLines.push('    frag.appendChild(titulo);');
  jsLines.push('    for (var i = 0; i < lista.length; i++) {');
  jsLines.push('      frag.appendChild(noItemObra(lista[i]));');
  jsLines.push('    }');
  jsLines.push('    frag.appendChild(noVazioNode());');
  jsLines.push('    caixa.textContent = "";');
  jsLines.push('    caixa.appendChild(frag);');
  jsLines.push('    montada = true;');
  jsLines.push('    marcarAtivo();');
  jsLines.push('  }');
  jsLines.push('');
  // marcarAtivo
  jsLines.push('  function marcarAtivo() {');
  jsLines.push('    var caixa = el("obrLista");');
  jsLines.push('    if (!caixa) { return; }');
  jsLines.push('    var idAtual = obraAtualId();');
  jsLines.push('    var itens = caixa.querySelectorAll(".obr-obra");');
  jsLines.push('    for (var i = 0; i < itens.length; i++) {');
  jsLines.push('      var on = itens[i].getAttribute("data-obra-id") === idAtual;');
  jsLines.push('      if (on === itens[i].classList.contains("obr-ativo")) { continue; }');
  jsLines.push('      if (on) {');
  jsLines.push('        itens[i].classList.add("obr-ativo");');
  jsLines.push('        itens[i].setAttribute("aria-current", "true");');
  jsLines.push('      } else {');
  jsLines.push('        itens[i].classList.remove("obr-ativo");');
  jsLines.push('        itens[i].removeAttribute("aria-current");');
  jsLines.push('      }');
  jsLines.push('    }');
  jsLines.push('    var info = el("obrInfo");');
  jsLines.push('    var o = obraAtual();');
  jsLines.push('    if (info && o) {');
  jsLines.push('      var contrato = o.numContrato || "\u2014";');
  jsLines.push('      var valor = o.valorContrato ? "R$ " + Number(o.valorContrato).toLocaleString("pt-BR", {minimumFractionDigits:2}) : "\u2014";');
  jsLines.push('      var pct = (o.pctServico !== undefined && o.pctServico !== null) ? o.pctServico + "%" : "\u2014";');
  jsLines.push('      info.textContent = "Contrato: " + contrato + "  |  Valor: " + valor + "  |  Servi\u00e7o: " + pct;');
  jsLines.push('    }');
  jsLines.push('  }');
  jsLines.push('');
  // filtrar
  jsLines.push('  function mostrar(n, ok) {');
  jsLines.push('    if (!n) { return; }');
  jsLines.push('    var escondido = n.classList.contains("obr-esconde");');
  jsLines.push('    if (ok === escondido) {');
  jsLines.push('      if (ok) { n.classList.remove("obr-esconde"); } else { n.classList.add("obr-esconde"); }');
  jsLines.push('    }');
  jsLines.push('  }');
  jsLines.push('');
  jsLines.push('  function filtrar(txt) {');
  jsLines.push('    var caixa = el("obrLista");');
  jsLines.push('    if (!caixa) { return; }');
  jsLines.push('    var busca = (txt || "").toLowerCase().trim();');
  jsLines.push('    var f = caixa.children;');
  jsLines.push('    var grupo = null;');
  jsLines.push('    var vistos = 0;');
  jsLines.push('    var achou = 0;');
  jsLines.push('    for (var i = 0; i < f.length; i++) {');
  jsLines.push('      var n = f[i];');
  jsLines.push('      var cls = n.className || "";');
  jsLines.push('      if (cls.indexOf("obr-grupo") >= 0) {');
  jsLines.push('        if (grupo) { mostrar(grupo, vistos > 0); }');
  jsLines.push('        grupo = n;');
  jsLines.push('        vistos = 0;');
  jsLines.push('        continue;');
  jsLines.push('      }');
  jsLines.push('      if (cls.indexOf("obr-vazio") >= 0) { continue; }');
  jsLines.push('      var nome = (n.querySelector(".obr-txt") || {}).textContent || "";');
  jsLines.push('      var ok = !busca || nome.toLowerCase().indexOf(busca) >= 0;');
  jsLines.push('      mostrar(n, ok);');
  jsLines.push('      if (ok) { achou++; vistos++; }');
  jsLines.push('    }');
  jsLines.push('    if (grupo) { mostrar(grupo, vistos > 0); }');
  jsLines.push('    mostrar(noVazioNode(), achou === 0);');
  jsLines.push('  }');
  jsLines.push('');
  // atualizarRotulo
  jsLines.push('  function atualizarRotulo() {');
  jsLines.push('    var r = el("obrAtual");');
  jsLines.push('    if (!r) { return; }');
  jsLines.push('    var t = nomeAtual();');
  jsLines.push('    if (r.textContent !== t) { r.textContent = t; }');
  jsLines.push('  }');
  jsLines.push('');
  // prepararGaveta
  jsLines.push('  function prepararGaveta() {');
  jsLines.push('    if (!D.body) { return null; }');
  jsLines.push('    var g = criarGaveta();');
  jsLines.push('    var sig = assinatura();');
  jsLines.push('    if (montada && sig !== sigAtual) { montada = false; }');
  jsLines.push('    if (!montada) { montarLista(); filtrar(""); }');
  jsLines.push('    sigAtual = sig;');
  jsLines.push('    return g;');
  jsLines.push('  }');
  jsLines.push('  G.preparar = prepararGaveta;');
  jsLines.push('');
  // API publica
  jsLines.push('  G.abrir = function () {');
  jsLines.push('    var g = prepararGaveta();');
  jsLines.push('    if (!g) { return; }');
  jsLines.push('    if (D.body.lastElementChild !== g) { D.body.appendChild(g); }');
  jsLines.push('    var b = el("obrBusca");');
  jsLines.push('    if (b && b.value !== "") { b.value = ""; }');
  jsLines.push('    marcarAtivo();');
  jsLines.push('    filtrar("");');
  jsLines.push('    g.classList.add("obr-on");');
  jsLines.push('    g.setAttribute("aria-hidden", "false");');
  jsLines.push('    D.body.classList.add("obr-aberto");');
  jsLines.push('    if (launcher || el("obrGavetaBtn")) {');
  jsLines.push('      (launcher || el("obrGavetaBtn")).setAttribute("aria-expanded", "true");');
  jsLines.push('    }');
  jsLines.push('    if (window.ORMENU && window.ORMENU.aberto && window.ORMENU.aberto()) {');
  jsLines.push('      window.ORMENU.fechar();');
  jsLines.push('    }');
  jsLines.push('    if (b && b.focus) { try { b.focus(); } catch (e) { } }');
  jsLines.push('  };');
  jsLines.push('');
  jsLines.push('  G.fechar = function () {');
  jsLines.push('    var g = el("obrGaveta");');
  jsLines.push('    if (g) {');
  jsLines.push('      g.classList.remove("obr-on");');
  jsLines.push('      g.setAttribute("aria-hidden", "true");');
  jsLines.push('    }');
  jsLines.push('    D.body.classList.remove("obr-aberto");');
  jsLines.push('    var lb = el("obrGavetaBtn");');
  jsLines.push('    if (lb) { lb.setAttribute("aria-expanded", "false"); }');
  jsLines.push('  };');
  jsLines.push('');
  jsLines.push('  G.aberto = function () {');
  jsLines.push('    var g = el("obrGaveta");');
  jsLines.push('    return !!(g && g.classList.contains("obr-on"));');
  jsLines.push('  };');
  jsLines.push('');
  jsLines.push('  G.alternar = function () {');
  jsLines.push('    if (G.aberto()) { G.fechar(); } else { G.abrir(); }');
  jsLines.push('  };');
  jsLines.push('');
  jsLines.push('  G.arrumar = function () {');
  jsLines.push('    if (!D.body) { return; }');
  jsLines.push('    garantirLauncher();');
  jsLines.push('    esconderAntigos();');
  jsLines.push('    var sig = assinatura();');
  jsLines.push('    if (montada && sig !== sigAtual) { montada = false; }');
  jsLines.push('    if (!montada && G.aberto()) { prepararGaveta(); }');
  jsLines.push('    atualizarRotulo();');
  jsLines.push('    marcarAtivo();');
  jsLines.push('  };');
  jsLines.push('');
  // teclado
  jsLines.push('  function ligarTeclado() {');
  jsLines.push('    if (G.__teclado) { return; }');
  jsLines.push('    G.__teclado = true;');
  jsLines.push('    D.addEventListener("keydown", function (ev) {');
  jsLines.push('      if (ev.key === "Escape" && G.aberto()) { G.fechar(); return; }');
  jsLines.push('      var comAtalho = (ev.ctrlKey || ev.metaKey) && ev.shiftKey;');
  jsLines.push('      if (comAtalho && (ev.key === "o" || ev.key === "O")) {');
  jsLines.push('        ev.preventDefault(); G.alternar();');
  jsLines.push('      }');
  jsLines.push('    });');
  jsLines.push('  }');
  jsLines.push('');
  // observer
  jsLines.push('  function ligarVigia() {');
  jsLines.push('    if (G.__vigia || typeof MutationObserver !== "function") { return; }');
  jsLines.push('    var agendado = false;');
  jsLines.push('    function agenda() {');
  jsLines.push('      if (agendado) { return; }');
  jsLines.push('      agendado = true;');
  jsLines.push('      setTimeout(function () { agendado = false; G.arrumar(); }, 80);');
  jsLines.push('    }');
  jsLines.push('    var sel = el("selectObra");');
  jsLines.push('    if (sel) {');
  jsLines.push('      var o1 = new MutationObserver(agenda);');
  jsLines.push('      o1.observe(sel, { childList: true, attributes: true, attributeFilter: ["class"] });');
  jsLines.push('      G.__vigia = o1;');
  jsLines.push('    }');
  jsLines.push('    var ps = D.querySelector(".project-selector");');
  jsLines.push('    if (ps) {');
  jsLines.push('      var o2 = new MutationObserver(agenda);');
  jsLines.push('      o2.observe(ps, { childList: true, subtree: true });');
  jsLines.push('      G.__vigia2 = o2;');
  jsLines.push('    }');
  jsLines.push('  }');
  jsLines.push('');
  // hooks
  jsLines.push('  function ligarHooks() {');
  jsLines.push('    if (G.__hooks) { return; }');
  jsLines.push('    G.__hooks = true;');
  jsLines.push('    var trocarOriginal = (typeof window.trocarObra === "function") ? window.trocarObra : null;');
  jsLines.push('    if (trocarOriginal) {');
  jsLines.push('      window.trocarObra = function (id) {');
  jsLines.push('        trocarOriginal(id);');
  jsLines.push('        setTimeout(function () { G.arrumar(); }, 50);');
  jsLines.push('      };');
  jsLines.push('    }');
  jsLines.push('    var salvarOriginal = (typeof window.salvarDB === "function") ? window.salvarDB : null;');
  jsLines.push('    if (salvarOriginal) {');
  jsLines.push('      window.salvarDB = function () {');
  jsLines.push('        salvarOriginal();');
  jsLines.push('        setTimeout(function () { G.arrumar(); }, 80);');
  jsLines.push('      };');
  jsLines.push('    }');
  jsLines.push('  }');
  jsLines.push('');
  // partida
  jsLines.push('  function partirAgora() {');
  jsLines.push('    if (!D.body) { return; }');
  jsLines.push('    garantirLauncher();');
  jsLines.push('    esconderAntigos();');
  jsLines.push('    atualizarRotulo();');
  jsLines.push('    ligarTeclado();');
  jsLines.push('    ligarVigia();');
  jsLines.push('    setTimeout(ligarHooks, 500);');
  jsLines.push('    G.__pronto = true;');
  jsLines.push('  }');
  jsLines.push('');
  jsLines.push('  if (D.body) { partirAgora(); }');
  jsLines.push('  else { D.addEventListener("DOMContentLoaded", partirAgora); }');
  jsLines.push('');
  jsLines.push('  D.addEventListener("DOMContentLoaded", function () {');
  jsLines.push('    garantirLauncher();');
  jsLines.push('    esconderAntigos();');
  jsLines.push('    atualizarRotulo();');
  jsLines.push('  });');
  jsLines.push('');
  jsLines.push('  if (D.readyState === "complete") {');
  jsLines.push('    setTimeout(function () {');
  jsLines.push('      G.arrumar();');
  jsLines.push('      console.log("GAVETA OBRAS v1 ativa \u2014 launcher + gaveta pronta.");');
  jsLines.push('    }, 200);');
  jsLines.push('  } else {');
  jsLines.push('    window.addEventListener("load", function () {');
  jsLines.push('      setTimeout(function () {');
  jsLines.push('        G.arrumar();');
  jsLines.push('        console.log("GAVETA OBRAS v1 ativa \u2014 launcher + gaveta pronta.");');
  jsLines.push('      }, 200);');
  jsLines.push('    });');
  jsLines.push('  }');
  jsLines.push('');
  jsLines.push('}());');
  jsLines.push('</script>');
  jsLines.push('');

  var OBR_JS = jsLines.join('\n');

  /* usar lastIndexOf para evitar o </body> dentro de strings JS (impressão) */
  const bodyClose = h.lastIndexOf('</body>');
  if (bodyClose !== -1) {
    h = h.substring(0, bodyClose) + OBR_JS + h.substring(bodyClose);
    steps++;
    console.log('5\u2713 JS GAVETA OBRAS inserido antes de </body>');
  }

  /* ================================================================ *
   * FIM \u2014 salvar
   * ================================================================ */
  fs.writeFileSync(FILE, h, 'utf8');
  const delta = h.length - origLen;
  console.log('---');
  console.log('patch_gavetaObras_v1.js completo');
  console.log('Passos executados: ' + steps);
  console.log('Tamanho original: ' + origLen + ' bytes');
  console.log('Tamanho final:     ' + h.length + ' bytes');
  console.log('Diferenca:         ' + (delta >= 0 ? '+' : '') + delta + ' bytes');
  console.log('');
  console.log('COMANDOS GIT:');
  console.log('  git add index.html');
  console.log('  git commit -m "feat: Gaveta OBRAS v1 \u2014 gaveta lateral para gerenciar obras"');
  console.log('  git push');
}

main();
