/**
 * PATCH OBRA DRAWER v2
 * =====================
 * Cria gaveta lateral "Obras" que centraliza:
 *   - Lista de obras (selecionar/trocar)
 *   - Botao Gerenciar Obra
 *   - Botao + Nova Obra
 *   - Botao Excluir Obra
 * Remove esses controles do header toolbar.
 *
 * CORRECAO v1->v2: Injecao de JS agora usa lastIndexOf('</body>')
 * para evitar que o script caia dentro de document.write() de
 * impressao (linhas 41649 e 42685). O </body> real esta na
 * ultima ocorrencia (~linha 72086).
 *
 * Aplicar com:  node patch_obraDrawer_v2.js
 */

const fs   = require('fs');
const path = require('path');

const ARQ = path.join(__dirname, 'index.html');

if (!fs.existsSync(ARQ)) {
  console.error('index.html nao encontrado em', __dirname);
  process.exit(1);
}

let html = fs.readFileSync(ARQ, 'utf8');

/* ------------------------------------------------------------------ *
 * 1. INJETAR CSS da gaveta Obras
 * ------------------------------------------------------------------ */
var CSS_OBRA = [
'/* === GAVETA OBRAS — launcher + painel lateral === */',
'.ob-launcher {',
'  display: inline-flex !important;',
'  align-items: center;',
'  gap: 10px;',
'  margin: 0 0 0 4px !important;',
'  padding: 7px 14px 7px 11px !important;',
'  font: 600 13.5px/1.2 inherit;',
'  color: #e8eefc;',
'  background: linear-gradient(135deg, #1b2540 0%, #111827 100%);',
'  border: 1px solid rgba(255,255,255,.14) !important;',
'  border-radius: 10px !important;',
'  box-shadow: 0 4px 14px rgba(2,8,23,.3);',
'  cursor: pointer;',
'  user-select: none;',
'  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;',
'}',
'.ob-launcher:hover {',
'  transform: translateY(-1px);',
'  border-color: rgba(96,165,250,.55) !important;',
'  box-shadow: 0 8px 20px rgba(2,8,23,.4);',
'}',
'.ob-launcher:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }',
'.ob-launcher .ob-ico {',
'  display: grid; place-items: center;',
'  width: 26px; height: 26px; font-size: 15px;',
'  background: rgba(96,165,250,.16); border-radius: 8px;',
'}',
'.ob-launcher .ob-rot { font-weight: 600; color: #c3d1ea; }',
'.ob-launcher .ob-atual {',
'  max-width: 200px; overflow: hidden;',
'  text-overflow: ellipsis; white-space: nowrap;',
'  font-weight: 500; color: #9fb3d9;',
'}',
'.ob-launcher .ob-atual:before { content: "\2022"; margin-right: 8px; color: #3b82f6; }',
'',
'#obMenu:not(.ob-on) { display:none!important; visibility:hidden!important; pointer-events:none!important; opacity:0!important; }',
'#obMenu.ob-on { display:block!important; visibility:visible!important; pointer-events:auto!important; opacity:1!important; position:fixed!important; top:0!important; left:0!important; right:0!important; bottom:0!important; width:100%!important; height:100%!important; max-width:none!important; margin:0!important; padding:0!important; z-index:100095!important; }',
'.ob-fundo { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; background:rgba(3,7,18,.62); backdrop-filter:blur(3px); animation:obFade .18s ease; }',
'@keyframes obFade { from{opacity:0} to{opacity:1} }',
'@keyframes obSlide { from{transform:translateX(-24px);opacity:.4} to{transform:none;opacity:1} }',
'.ob-painel { position:absolute!important; top:0!important; left:0!important; bottom:0!important; right:auto!important; display:flex!important; flex-direction:column!important; width:340px!important; max-width:90vw!important; height:100%!important; margin:0!important; padding:0!important; background:#0d1424; border-right:1px solid rgba(255,255,255,.08); box-shadow:24px 0 60px rgba(2,6,23,.55); animation:obSlide .2s ease; overflow:hidden; }',
'.ob-topo { display:flex!important; align-items:center; gap:12px; width:auto!important; padding:18px 16px 14px 18px!important; border-bottom:1px solid rgba(255,255,255,.07); }',
'.ob-logo { display:grid!important; place-items:center; width:38px!important; height:38px; flex:0 0 38px; font:800 15px/1 inherit; color:#fff; background:linear-gradient(135deg,#f59e0b,#d97706); border-radius:11px; box-shadow:0 6px 16px rgba(245,158,11,.35); }',
'.ob-nomes { flex:1 1 auto; min-width:0; width:auto!important; }',
'.ob-nomes b { display:block; font-size:13.5px; letter-spacing:.3px; color:#f1f5f9; }',
'.ob-nomes span { display:block; font-size:11.5px; color:#7f92b5; margin-top:2px; }',
'.ob-x { width:32px!important; height:32px; flex:0 0 32px; padding:0!important; font-size:18px; line-height:1; color:#9fb3d9; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1)!important; border-radius:9px!important; cursor:pointer; }',
'.ob-x:hover { color:#fff; background:rgba(239,68,68,.22); }',
'.ob-lista { flex:1 1 auto; width:auto!important; padding:8px 10px 14px 10px!important; overflow-y:auto; overflow-x:hidden; }',
'.ob-grupo { padding:12px 8px 6px 8px; font:700 10.5px/1 inherit; letter-spacing:1.2px; text-transform:uppercase; color:#5d708f; }',
'.ob-obra { display:flex!important; align-items:center; gap:11px; width:100%!important; max-width:100%!important; margin:3px 0!important; padding:10px 12px!important; font:500 13.5px/1.25 inherit; text-align:left!important; color:#c3d1ea; background:transparent!important; border:1px solid transparent!important; border-radius:10px!important; cursor:pointer; box-sizing:border-box; transition:background .14s ease,color .14s ease,transform .14s ease; }',
'.ob-obra:hover { color:#fff; background:rgba(245,158,11,.1)!important; transform:translateX(2px); }',
'.ob-obra:focus-visible { outline:2px solid #f59e0b; outline-offset:1px; }',
'.ob-obra .ob-ico2 { display:grid; place-items:center; width:28px; height:28px; flex:0 0 28px; font-size:15px; background:rgba(255,255,255,.05); border-radius:8px; }',
'.ob-obra .ob-txt { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
'.ob-obra.ob-ativo { color:#fff; background:linear-gradient(90deg,rgba(245,158,11,.22),rgba(245,158,11,.06))!important; border-color:rgba(245,158,11,.3)!important; font-weight:700; }',
'.ob-obra.ob-ativo .ob-ico2 { background:rgba(245,158,11,.22); }',
'.ob-obra.ob-ativo:after { content:""; width:6px; height:6px; flex:0 0 6px; border-radius:50%; background:#f59e0b; box-shadow:0 0 8px #f59e0b; }',
'.ob-vazio { padding:18px 12px; font-size:12.5px; color:#6b7f9f; text-align:center; }',
'.ob-rodape { width:auto!important; padding:12px 14px 16px 14px!important; border-top:1px solid rgba(255,255,255,.07); display:flex; flex-direction:column; gap:8px; }',
'.ob-rodape button { width:100%; padding:9px 12px!important; font:500 13px/1.2 inherit; border-radius:8px!important; cursor:pointer; border:1px solid rgba(255,255,255,.1)!important; transition:background .14s ease; }',
'.ob-btn-gerenciar { color:#000!important; background:#f59e0b!important; border-color:rgba(245,158,11,.4)!important; }',
'.ob-btn-gerenciar:hover { background:#d97706!important; }',
'.ob-btn-nova { color:#fff!important; background:#16a34a!important; border-color:rgba(22,163,74,.4)!important; }',
'.ob-btn-nova:hover { background:#15803d!important; }',
'.ob-btn-excluir { color:#fff!important; background:#dc2626!important; border-color:rgba(220,38,38,.4)!important; }',
'.ob-btn-excluir:hover { background:#b91c1c!important; }',
'.ob-pe { width:auto!important; padding:8px 16px 12px 16px!important; font-size:11px; color:#5d708f; border-top:1px solid rgba(255,255,255,.05); }',
'body.ob-aberto { overflow:hidden!important; }',
'#selectObra.ob-escondido { position:absolute!important; left:-9999px!important; width:1px!important; height:1px!important; opacity:0!important; pointer-events:none!important; }',
'@media (max-width:520px) { .ob-launcher .ob-atual{display:none} .ob-painel{width:290px!important} }',
'@media print { #obMenu,.ob-launcher{display:none!important;visibility:hidden!important} }',
].join('\n');

/* Injeta CSS antes do </style> do patch ORMENU (PATCH 62) */
var styleAnchor = /<\/style>\s*<script>\s*\/\* === PATCH 62/;
if (styleAnchor.test(html)) {
  html = html.replace(styleAnchor, CSS_OBRA + '\n</style>\n<script>\n/* === PATCH 62');
  console.log('[OK] CSS da gaveta Obras injetado (ancora PATCH 62)');
} else {
  html = html.replace(/<\/head>/, '<style>' + CSS_OBRA + '</style>\n</head>');
  console.log('[OK] CSS da gaveta Obras injetado (fallback </head>)');
}

/* ------------------------------------------------------------------ *
 * 2. ESCONDER selectObra e botoes de obra no header
 * ------------------------------------------------------------------ */
html = html.replace(
  /<select\s+id="selectObra"\s+onchange="trocarObra\(this\.value\)"[^>]*>/,
  '<select id="selectObra" onchange="trocarObra(this.value)" class="ob-escondido">'
);
console.log('[OK] selectObra marcado como escondido');

/* Esconde botoes de obra do header envolvendo em span invisivel */
html = html.replace(
  /(<button[^>]*class="warning"[^>]*onclick="abrirModalObra\(\)"[^>]*>[^<]*<\/button>)/,
  '<span style="display:none!important">$1</span>'
);
html = html.replace(
  /(<button[^>]*class="success"[^>]*onclick="abrirModalNovaObra\(\)"[^>]*>[^<]*<\/button>)/,
  '<span style="display:none!important">$1</span>'
);
html = html.replace(
  /(<button[^>]*class="danger"[^>]*onclick="excluirObraAtual\(\)"[^>]*>[^<]*<\/button>)/,
  '<span style="display:none!important">$1</span>'
);
console.log('[OK] Botoes de obra no header escondidos');

/* ------------------------------------------------------------------ *
 * 3. INJETAR botao launcher no header
 * ------------------------------------------------------------------ */
html = html.replace(
  /(<select[^>]*id="selectObra"[^>]*><\/select>)/,
  '$1\n<button type="button" id="obMenuBtn" class="ob-launcher" aria-haspopup="true" aria-expanded="false" aria-controls="obMenu"><span class="ob-ico" aria-hidden="true">\ud83c\udfd7\ufe0f</span><span class="ob-rot">Obra</span><span class="ob-atual" id="obAtual"></span></button>'
);
console.log('[OK] Botao launcher Obra injetado no header');

/* ------------------------------------------------------------------ *
 * 4. INJETAR JS da gaveta Obras — ANTES do ULTIMO </body>
 *
 *    CORRECAO v1->v2: O regex /<\/body>/ substitui a PRIMEIRA
 *    ocorrencia, que esta dentro de document.write() de impressao
 *    (~linha 41649). Usamos lastIndexOf para pegar o </body>
 *    real (~linha 72086) que vem apos <!-- FIM PATCH150 -->.
 * ------------------------------------------------------------------ */
var JS_OBRA = [
'<script>',
'/* === PATCH OBRA DRAWER: gaveta lateral de Obras === */',
'(function () {',
'  "use strict";',
'',
'  var O = window.OBMENU = window.OBMENU || {};',
'  if (O.__v1) { return; }',
'  O.__v1 = true;',
'',
'  var D = document;',
'',
'  function el(id) { return D.getElementById(id); }',
'',
'  function criarGaveta() {',
'    var g = el("obMenu");',
'    if (g) { return g; }',
'    g = D.createElement("div");',
'    g.id = "obMenu";',
'    g.setAttribute("role", "dialog");',
'    g.setAttribute("aria-modal", "true");',
'    g.setAttribute("aria-label", "Gerenciar Obras");',
'    g.setAttribute("aria-hidden", "true");',
'    g.innerHTML =',
'      "<div class=\\"ob-fundo\\" id=\\"obFundo\\"></div>" +',
'      "<div class=\\"ob-painel\\">" +',
'        "<div class=\\"ob-topo\\">" +',
'          "<span class=\\"ob-logo\\" aria-hidden=\\"true\\">OB</span>" +',
'          "<span class=\\"ob-nomes\\"><b>Obras</b><span>Selecione e gerencie</span></span>" +',
'          "<button type=\\"button\\" class=\\"ob-x\\" id=\\"obFechar\\" title=\\"Fechar\\" aria-label=\\"Fechar menu\\">\u00d7</button>" +',
'        "</div>" +',
'        "<div class=\\"ob-lista\\" id=\\"obLista\\"></div>" +',
'        "<div class=\\"ob-rodape\\">" +',
'          "<button type=\\"button\\" class=\\"ob-btn-gerenciar\\" id=\\"obBtnGerenciar\\">\u2699\ufe0f Gerenciar Obra</button>" +',
'          "<button type=\\"button\\" class=\\"ob-btn-nova\\" id=\\"obBtnNova\\">+ Nova Obra</button>" +',
'          "<button type=\\"button\\" class=\\"ob-btn-excluir\\" id=\\"obBtnExcluir\\">\ud83d\uddd1\ufe0f Excluir Obra</button>" +',
'        "</div>" +',
'        "<div class=\\"ob-pe\\"><kbd>Esc</kbd> fecha \u00b7 <kbd>Ctrl+O</kbd> abre</div>" +',
'      "</div>";',
'    D.body.appendChild(g);',
'',
'    /* Fundo / overlay fecha ao clicar */',
'    g.addEventListener("click", function (ev) {',
'      if (ev.target === g || ev.target.id === "obFundo") { O.fechar(); }',
'    });',
'    /* Botao X */',
'    var x = g.querySelector("#obFechar");',
'    if (x) { x.addEventListener("click", function () { O.fechar(); }); }',
'',
'    /* Gerenciar Obra */',
'    var btnG = g.querySelector("#obBtnGerenciar");',
'    if (btnG) {',
'      btnG.addEventListener("click", function () {',
'        O.fechar();',
'        if (typeof window.abrirModalObra === "function") { window.abrirModalObra(); }',
'      });',
'    }',
'    /* + Nova Obra */',
'    var btnN = g.querySelector("#obBtnNova");',
'    if (btnN) {',
'      btnN.addEventListener("click", function () {',
'        O.fechar();',
'        if (typeof window.abrirModalNovaObra === "function") { window.abrirModalNovaObra(); }',
'      });',
'    }',
'    /* Excluir Obra */',
'    var btnE = g.querySelector("#obBtnExcluir");',
'    if (btnE) {',
'      btnE.addEventListener("click", function () {',
'        O.fechar();',
'        if (typeof window.excluirObraAtual === "function") { window.excluirObraAtual(); }',
'      });',
'    }',
'',
'    return g;',
'  }',
'',
'  function montarLista() {',
'    var caixa = el("obLista");',
'    if (!caixa) { return; }',
'    var db = window.db;',
'    if (!db || !db.obras) { return; }',
'',
'    var frag = D.createDocumentFragment();',
'    var cab = D.createElement("div");',
'    cab.className = "ob-grupo";',
'    cab.textContent = "OBRAS CADASTRADAS";',
'    frag.appendChild(cab);',
'',
'    db.obras.forEach(function (o) {',
'      var b = D.createElement("button");',
'      b.type = "button";',
'      b.className = "ob-obra";',
'      if (String(o.id) === String(db.obraAtualId)) { b.classList.add("ob-ativo"); }',
'      b.setAttribute("data-obra-id", o.id);',
'',
'      var ico = D.createElement("span");',
'      ico.className = "ob-ico2";',
'      ico.setAttribute("aria-hidden", "true");',
'      ico.textContent = "\ud83c\udfd7\ufe0f";',
'',
'      var txt = D.createElement("span");',
'      txt.className = "ob-txt";',
'      var nome = o.nome || "Obra sem nome";',
'      txt.textContent = (typeof window.titleCase === "function") ? window.titleCase(nome) : nome;',
'',
'      b.appendChild(ico);',
'      b.appendChild(txt);',
'',
'      if (String(o.id) === String(db.obraAtualId)) {',
'        b.setAttribute("aria-current", "true");',
'      }',
'',
'      var obraId = o.id;',
'      b.addEventListener("click", function () {',
'        O.fechar();',
'        if (typeof window.trocarObra === "function") { window.trocarObra(obraId); }',
'      });',
'',
'      frag.appendChild(b);',
'    });',
'',
'    if (!db.obras.length) {',
'      var vazio = D.createElement("div");',
'      vazio.className = "ob-vazio";',
'      vazio.textContent = "Nenhuma obra cadastrada.";',
'      frag.appendChild(vazio);',
'    }',
'',
'    caixa.textContent = "";',
'    caixa.appendChild(frag);',
'  }',
'',
'  function atualizarRotulo() {',
'    var r = el("obAtual");',
'    if (!r) { return; }',
'    var db = window.db;',
'    if (!db) { return; }',
'    var obra = db.obras.find(function (o) { return String(o.id) === String(db.obraAtualId); });',
'    var nome = obra ? (obra.nome || "Obra sem nome") : "";',
'    if (typeof window.titleCase === "function") { nome = window.titleCase(nome); }',
'    if (r.textContent !== nome) { r.textContent = nome; }',
'  }',
'',
'  function marcarAtivo() {',
'    var caixa = el("obLista");',
'    if (!caixa) { return; }',
'    var db = window.db;',
'    if (!db) { return; }',
'    var itens = caixa.querySelectorAll(".ob-obra");',
'    for (var i = 0; i < itens.length; i++) {',
'      var on = String(itens[i].getAttribute("data-obra-id")) === String(db.obraAtualId);',
'      var ja = itens[i].classList.contains("ob-ativo");',
'      if (on === ja) { continue; }',
'      if (on) {',
'        itens[i].classList.add("ob-ativo");',
'        itens[i].setAttribute("aria-current", "true");',
'      } else {',
'        itens[i].classList.remove("ob-ativo");',
'        itens[i].removeAttribute("aria-current");',
'      }',
'    }',
'  }',
'',
'  O.abrir = function () {',
'    var g = criarGaveta();',
'    if (!g) { return; }',
'    if (D.body.lastElementChild !== g) { D.body.appendChild(g); }',
'    montarLista();',
'    g.classList.add("ob-on");',
'    g.setAttribute("aria-hidden", "false");',
'    D.body.classList.add("ob-aberto");',
'    var lb = el("obMenuBtn");',
'    if (lb) { lb.setAttribute("aria-expanded", "true"); }',
'  };',
'',
'  O.fechar = function () {',
'    var g = el("obMenu");',
'    if (g) {',
'      g.classList.remove("ob-on");',
'      g.setAttribute("aria-hidden", "true");',
'    }',
'    D.body.classList.remove("ob-aberto");',
'    var lb = el("obMenuBtn");',
'    if (lb) { lb.setAttribute("aria-expanded", "false"); }',
'  };',
'',
'  O.aberto = function () {',
'    var g = el("obMenu");',
'    return !!(g && g.classList.contains("ob-on"));',
'  };',
'',
'  O.alternar = function () {',
'    if (O.aberto()) { O.fechar(); } else { O.abrir(); }',
'  };',
'',
'  O.arrumar = function () {',
'    montarLista();',
'    marcarAtivo();',
'    atualizarRotulo();',
'  };',
'',
'  /* Teclado: Esc fecha, Ctrl+O abre/fecha */',
'  D.addEventListener("keydown", function (ev) {',
'    if (ev.key === "Escape" && O.aberto()) { O.fechar(); return; }',
'    var comAtalho = (ev.ctrlKey || ev.metaKey) && !ev.altKey;',
'    if (comAtalho && (ev.key === "o" || ev.key === "O")) {',
'      ev.preventDefault();',
'      O.alternar();',
'    }',
'  });',
'',
'  function garantirLauncher() {',
'    var b = el("obMenuBtn");',
'    if (!b) { return; }',
'    if (b.__obBind) { return; }',
'    b.__obBind = true;',
'    b.addEventListener("click", function (ev) {',
'      ev.preventDefault();',
'      O.alternar();',
'    });',
'  }',
'',
'  /* Hook render() para re-sincronizar lista apos cada render */',
'  var _renderOriginal = window.render;',
'  if (typeof _renderOriginal === "function") {',
'    window.render = function () {',
'      var ret = _renderOriginal.apply(this, arguments);',
'      try { O.arrumar(); } catch (e) { }',
'      return ret;',
'    };',
'    if (!window.render._original) { window.render._original = _renderOriginal; }',
'    console.log("PATCH OBRA DRAWER: render() envelopado");',
'  }',
'',
'  /* Hook Painel.voltarObra para re-sincronizar ao voltar de obra */',
'  function hookVoltarObra() {',
'    if (window.Painel && typeof window.Painel.voltarObra === "function") {',
'      var _vO = window.Painel.voltarObra;',
'      if (!_vO.__obHooked) {',
'        window.Painel.voltarObra = function () {',
'          var ret = _vO.apply(this, arguments);',
'          try { marcarAtivo(); atualizarRotulo(); } catch (e) { }',
'          return ret;',
'        };',
'        window.Painel.voltarObra.__obHooked = true;',
'        console.log("PATCH OBRA DRAWER: Painel.voltarObra envelopado");',
'      }',
'    }',
'  }',
'',
'  /* MutationObserver garante que selectObra permaneca escondido */',
'  function observarSelect() {',
'    var sel = el("selectObra");',
'    if (!sel) { return; }',
'    if (!sel.classList.contains("ob-escondido")) { sel.classList.add("ob-escondido"); }',
'    if (typeof MutationObserver === "function") {',
'      var _obs = new MutationObserver(function () {',
'        if (sel && !sel.classList.contains("ob-escondido")) { sel.classList.add("ob-escondido"); }',
'      });',
'      _obs.observe(sel, { attributes: true, attributeFilter: ["class", "style"] });',
'      var parent = sel.parentNode;',
'      if (parent) {',
'        var _obsP = new MutationObserver(function (recs) {',
'          for (var i = 0; i < recs.length; i++) {',
'            for (var j = 0; j < recs[i].addedNodes.length; j++) {',
'              if (recs[i].addedNodes[j].id === "selectObra") {',
'                sel = el("selectObra");',
'                if (sel && !sel.classList.contains("ob-escondido")) { sel.classList.add("ob-escondido"); }',
'                return;',
'              }',
'            }',
'          }',
'        });',
'        _obsP.observe(parent, { childList: true });',
'      }',
'    }',
'  }',
'',
'  function partirAgora() {',
'    if (!D.body) { return; }',
'    garantirLauncher();',
'    atualizarRotulo();',
'    observarSelect();',
'    hookVoltarObra();',
'    O.__pronto = true;',
'    console.log("PATCH OBRA DRAWER ativo: gaveta de Obras pronta");',
'  }',
'',
'  if (D.body) { partirAgora(); }',
'  else { D.addEventListener("DOMContentLoaded", partirAgora); }',
'',
'  if (D.readyState === "complete") { hookVoltarObra(); observarSelect(); }',
'  else { window.addEventListener("load", function () { hookVoltarObra(); observarSelect(); }); }',
'',
'}());',
'</script>',
].join('\n');

/* ---- CORRECAO: usar lastIndexOf para achar o </body> REAL ---- */
var posBody = html.lastIndexOf('</body>');
if (posBody === -1) {
  console.error('[ERRO] Nenhuma tag </body> encontrada!');
  process.exit(1);
}
console.log('[OK] </body> real encontrado na posicao', posBody, '(caractere)');

/* Verificar que NAO esta dentro de document.write */
var trechoAntes = html.substring(Math.max(0, posBody - 80), posBody);
console.log('[INFO] Contexto antes do </body> real:');
console.log('  ...' + trechoAntes);

if (trechoAntes.indexOf('document.write') !== -1) {
  console.error('[ERRO] lastIndexOf </body> ainda esta dentro de document.write! Abortando.');
  process.exit(1);
}

html = html.substring(0, posBody) + JS_OBRA + '\n' + html.substring(posBody);
console.log('[OK] JS da gaveta Obras injetado ANTES do </body> real');

/* ------------------------------------------------------------------ *
 * 5. SALVAR
 * ------------------------------------------------------------------ */
fs.writeFileSync(ARQ, html, 'utf8');
console.log('index.html salvo com sucesso');

/* ------------------------------------------------------------------ *
 * 6. GIT — commit e push para deploy no Render
 * ------------------------------------------------------------------ */
var execSync = require('child_process').execSync;

try {
  execSync('git add index.html', { stdio: 'inherit', cwd: __dirname });
  execSync('git commit -m "feat: gaveta lateral Obras (v2) - centraliza select, gerenciar, nova e excluir obra"', { stdio: 'inherit', cwd: __dirname });
  execSync('git push', { stdio: 'inherit', cwd: __dirname });
  console.log('Deploy: git add + commit + push concluidos!');
} catch (err) {
  console.warn('Git commands falhou. Rode manualmente:');
  console.warn('   git add index.html');
  console.warn('   git commit -m "feat: gaveta lateral Obras (v2)"');
  console.warn('   git push');
}

console.log('PATCH OBRA DRAWER v2 aplicado!');