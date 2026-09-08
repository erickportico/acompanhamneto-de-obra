/* ============================================================
 * PATCH OBRA DRAWER v4
 * ============================================================
 * Mudancas:
 *   1. Obra controls APENAS na gaveta OBMENU — esconde do header
 *   2. Botao launcher "Obra" AO LADO do "Menu de Abas" (apos </details>)
 *   3. Configuracoes movido para DENTRO do <div class="tabs">
 *   4. Botoes Nuvem padronizados e posicionados em header-badges-right
 *
 * Aplicar com:  node patch_obraDrawer_v4.js
 * ============================================================ */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARQ = path.join(__dirname, 'index.html');

if (!fs.existsSync(ARQ)) {
  console.error('index.html nao encontrado em', __dirname);
  process.exit(1);
}

let html = fs.readFileSync(ARQ, 'utf8');

/* ================================================================== *
 * 0. INJETAR CSS
 * ================================================================== */
const CSS = `
/* === GAVETA OBRAS v4 === */
.ob-launcher {
  display:inline-flex!important;
  align-items:center;
  gap:10px;
  margin:0 0 0 8px!important;
  padding:8px 14px 8px 11px!important;
  font:600 13.5px/1.2 inherit;
  color:#e8eefc;
  background:linear-gradient(135deg,#1b2540 0%,#111827 100%);
  border:1px solid rgba(255,255,255,.14)!important;
  border-radius:10px!important;
  box-shadow:0 4px 14px rgba(2,8,23,.3);
  cursor:pointer;
  user-select:none;
  transition:transform .15s,box-shadow .15s,border-color .15s;
}
.ob-launcher:hover {
  transform:translateY(-1px);
  box-shadow:0 6px 20px rgba(59,130,246,.25);
  border-color:rgba(59,130,246,.4)!important;
}
.ob-launcher:focus-visible { outline:2px solid #60a5fa; outline-offset:2px; }
.ob-launcher .ob-ico { font-size:1.3em; }
.ob-launcher .ob-rot { font-weight:600; color:#c3d1ea; }
.ob-launcher .ob-atual { font-size:.78em; color:#93c5fd; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ob-launcher .ob-atual:before { content:"\u2022"; margin-right:8px; color:#3b82f6; }

#obMenu {
  position:fixed!important;
  top:0; left:0;
  width:310px; height:100vh;
  max-width:90vw;
  background:#0f172a;
  border-right:1px solid rgba(255,255,255,.1);
  box-shadow:4px 0 24px rgba(0,0,0,.55);
  z-index:99999!important;
  transform:translateX(-100%);
  transition:transform .28s cubic-bezier(.4,0,.2,1);
  overflow-y:auto;
  padding:14px 12px 24px;
  font-family:inherit;
}
#obMenu.ob-open { transform:translateX(0)!important; }
#obMenu .ob-tit { font:700 15px/1.3 inherit; color:#e8eefc; padding:10px 0 6px; border-bottom:1px solid rgba(255,255,255,.1); margin:0 0 8px; }
#obMenu .ob-item { display:flex!important; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; cursor:pointer; transition:background .15s; color:#c3d1ea; font:500 13.5px/1.3 inherit; border:none; background:transparent; width:100%; text-align:left; }
#obMenu .ob-item:hover { background:rgba(59,130,246,.12); }
#obMenu .ob-item.ob-sel { background:rgba(59,130,246,.18)!important; color:#60a5fa; font-weight:600; }
#obMenu .ob-ico2 { font-size:1.1em; width:22px; text-align:center; }
#obMenu .ob-sep { height:1px; background:rgba(255,255,255,.08); margin:8px 0; }
#obMenu .ob-foot { padding:10px 0 0; border-top:1px solid rgba(255,255,255,.1); margin-top:10px; display:flex; flex-wrap:wrap; gap:6px; }
#obMenu .ob-foot button { font:500 12px/1.3 inherit; padding:7px 12px; border-radius:6px; border:1px solid rgba(255,255,255,.12); cursor:pointer; transition:background .15s,opacity .15s; }
#obMenu .ob-foot .ob-btn-add { background:#166534; color:#fff; border-color:#22c55e!important; }
#obMenu .ob-foot .ob-btn-add:hover { background:#15803d; }
#obMenu .ob-foot .ob-btn-mgr { background:#92400e; color:#fff; border-color:#f59e0b!important; }
#obMenu .ob-foot .ob-btn-mgr:hover { background:#a16207; }
#obMenu .ob-foot .ob-btn-del { background:#991b1b; color:#fff; border-color:#ef4444!important; }
#obMenu .ob-foot .ob-btn-del:hover { background:#b91c1c; }

#obOverlay { position:fixed!important; inset:0; background:rgba(0,0,0,.45); z-index:99998; display:none; }
#obOverlay.ob-show { display:block!important; }

/* selectObra escondido */
#selectObra.ob-hide { position:absolute!important; left:-9999px!important; width:1px!important; height:1px!important; opacity:0!important; pointer-events:none!important; }

/* botoes obra escondidos no header */
.ob-hide-btn { display:none!important; }

/* nuvem buttons padronizados */
.ob-nuvem-row { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; align-items:center; }
.ob-nuvem-btn { display:inline-flex!important; align-items:center; justify-content:center; min-width:38px!important; height:32px!important; padding:4px 10px!important; border-radius:6px!important; font:500 .75rem/1.2 inherit!important; border:1px solid rgba(255,255,255,.12)!important; background:transparent!important; color:#c3d1ea!important; cursor:pointer; transition:background .15s; white-space:nowrap; }
.ob-nuvem-btn:hover { background:rgba(255,255,255,.08)!important; }

/* Configuracoes dentro das tabs */
.tabs > .ob-settings-block { margin-top:8px; border-top:1px solid rgba(255,255,255,.1); padding-top:8px; }
.tabs > .ob-settings-block > button { width:100%; text-align:left; margin:0 0 6px; }
.tabs > .ob-settings-block .settings-dropdown { position:relative!important; top:auto!important; right:auto!important; }

@media (max-width:520px) { .ob-launcher .ob-atual{display:none} #obMenu{width:290px!important} }
@media print { #obMenu,.ob-launcher{display:none!important;visibility:hidden!important} }
`;

/* Injeta CSS antes do ancora PATCH 62 */
var cssAnchor = /\/\* PATCH 62/;
if (cssAnchor.test(html)) {
  html = html.replace(cssAnchor, CSS + '\n/* PATCH 62');
  console.log('[OK] CSS injetado (ancora PATCH 62)');
} else {
  html = html.replace(/<\/style>\s*<\/head>/, CSS + '\n</style>\n</head>');
  console.log('[OK] CSS injetado (antes </head>)');
}

/* ================================================================== *
 * 1. ESCONDER selectObra (adiciona classe ob-hide)
 * ================================================================== */
html = html.replace(
  /(<select\s+id="selectObra")/,
  '$1 class="ob-hide"'
);
console.log('[OK] selectObra marcado como escondido');

/* ================================================================== *
 * 2. ESCONDER botoes de obra no header
 * ================================================================== */
/* Botao Gerenciar Obra */
html = html.replace(
  /(<button[^>]*onclick="abrirModalObra\(\)"[^>]*>)/,
  '<span class="ob-hide-btn">$1'
);

/* Botao Nova Obra */
html = html.replace(
  /(<button[^>]*onclick="abrirModalNovaObra\(\)"[^>]*>)/,
  '<span class="ob-hide-btn">$1'
);

/* Botao Excluir Obra */
html = html.replace(
  /(<button[^>]*onclick="excluirObraAtual\(\)"[^>]*>)/,
  '<span class="ob-hide-btn">$1'
);
console.log('[OK] Botoes de obra no header escondidos');

/* ================================================================== *
 * 3. MOVER Configuracoes para DENTRO do <div class="tabs">
 * ================================================================== */

/* Regex flexivel para capturar o bloco settings-menu + o fileRestoreInput */
var settingsRegex = /<div\s+class="settings-menu">[\s\S]*?<\/div>\s*<\/div>\s*<input[^>]*id="fileRestoreInput"[^>]*>/;
var settingsMatch = html.match(settingsRegex);
if (settingsMatch) {
  /* Remove do header */
  html = html.replace(settingsRegex, '');
  console.log('[OK] Bloco Configuracoes removido do header');

  /* Monta o bloco compacto para injetar dentro de .tabs */
  var settingsBlock =
    '<div class="ob-settings-block">' +
    '<button type="button" class="secondary" onclick="toggleSettingsMenu()" ' +
    'style="width:100%;text-align:left;margin:0 0 6px 0;">\u2699\ufe0f Configura\u00e7\u00f5es</button>' +
    '<div id="settingsMenu" class="settings-dropdown" ' +
    'style="position:relative!important;top:auto!important;right:auto!important;display:none;">' +
    '<button class="secondary" onclick="exportarDados()" style="text-align:left;">\ud83d\udcbe Backup</button>' +
    '<button class="secondary" onclick="document.getElementById(\'fileRestoreInput\').click()" style="text-align:left;">\ud83d\udce5 Restaurar</button>' +
    '<button class="warning" onclick="abrirRecuperacaoDados()" style="text-align:left;">\ud83e\uddff Recuperar Dados Antigos</button>' +
    '<button class="primary" onclick="abrirBancoCompartilhado()" style="text-align:left;">\ud83c\udf10 Banco Compartilhado</button>' +
    '</div></div>' +
    '<input type="file" id="fileRestoreInput" accept=".json" style="display:none" onchange="restaurarBackupJSON(event)">';

  /* Injeta dentro de .tabs, ANTES do fechamento </div> que fecha .tabs */
  /* A ancora e: </div> seguido de "<!-- 3. Seu conte" (com acento) */
  var tabsAnchor = /(<\/div>\s*<!--[\s]*3\.[\s]*Seu\s+conte[u\u00fa]+do\s+principal)/;
  if (tabsAnchor.test(html)) {
    html = html.replace(tabsAnchor, settingsBlock + '\n$1');
    console.log('[OK] Configuracoes injetado dentro do Menu de Abas (.tabs)');
  } else {
    /* Fallback: injetar apos o ultimo botao das tabs (btn-tab-fpdo) */
    var fpdoAnchor = /(<button[^>]*id="btn-tab-fpdo"[^>]*>[\s\S]*?<\/button>\s*)(<\/div>)/;
    if (fpdoAnchor.test(html)) {
      html = html.replace(fpdoAnchor, '$1' + settingsBlock + '\n$2');
      console.log('[OK] Configuracoes injetado apos btn-tab-fpdo (fallback)');
    } else {
      console.warn('[AVISO] Nao achou ancora para injetar Configuracoes nas tabs');
    }
  }
} else {
  console.warn('[AVISO] Bloco settings-menu nao encontrado no header');
}

/* ================================================================== *
 * 4. REPOSICIONAR BOTOES SUPABASE / CARREGAR NUVEM / MODO ESCURO
 * ================================================================== */

var nuvemRegex = /(<span\s+id="statusNuvem"[^>]*>[\s\S]*?<\/span>)\s*(<button[^>]*onclick="carregarBancoDaNuvem\(\)"[^>]*>[\s\S]*?<\/button>)\s*(<button[^>]*onclick="alternarTema\(\)"[^>]*id="btnThemeToggle"[^>]*>[\s\S]*?<\/button>)/;
var nuvemMatch = html.match(nuvemRegex);
if (nuvemMatch) {
  var spanNuvem = nuvemMatch[1];
  var btnCarregar = nuvemMatch[2];
  var btnTema    = nuvemMatch[3];

  /* Remove do project-selector */
  html = html.replace(nuvemRegex, '');

  /* Adiciona classe ob-nuvem-btn */
  spanNuvem  = spanNuvem.replace(/id="statusNuvem"/, 'id="statusNuvem" class="ob-nuvem-btn"');
  btnCarregar = btnCarregar.replace(/class="secondary"/, 'class="secondary ob-nuvem-btn"');
  btnTema    = btnTema.replace(/class="secondary"/, 'class="secondary ob-nuvem-btn"');

  var nuvemRow = '<div class="ob-nuvem-row">' + spanNuvem + btnCarregar + btnTema + '</div>';

  /* Injeta dentro de header-badges-right, antes do fechamento */
  /* Ancora: </div></div> antes de <div class="project-selector"> */
  var badgesAnchor = /(<\/div>\s*<\/div>\s*)(<div class="project-selector">)/;
  if (badgesAnchor.test(html)) {
    html = html.replace(badgesAnchor, nuvemRow + '\n$1$2');
    console.log('[OK] Botoes nuvem reposicionados dentro de header-badges-right');
  } else {
    console.warn('[AVISO] Nao achou ancora header-badges-right');
  }
} else {
  console.warn('[AVISO] Padrao dos botoes nuvem nao encontrado');
}

/* ================================================================== *
 * 5. INJETAR BOTAO LAUNCHER "Obra" APOS </details>
 * ================================================================== */
var launcherHTML =
  '<button type="button" id="obMenuBtn" class="ob-launcher" ' +
  'aria-haspopup="true" aria-expanded="false" aria-controls="obMenu">' +
  '<span class="ob-ico" aria-hidden="true">\ud83c\udfd7\ufe0f</span>' +
  '<span class="ob-rot">Obra</span>' +
  '<span class="ob-atual" id="obAtual"></span>' +
  '</button>';

/* Insere logo apos </details> do meu-menu-abas */
html = html.replace(
  /(<\/details>)/,
  '</details>\n' + launcherHTML
);
console.log('[OK] Botao launcher Obra injetado ao lado do Menu de Abas');

/* ================================================================== *
 * 6. INJETAR OVERLAY + PAINEL OBMENU
 * ================================================================== */
var overlayAndPanel =
  '<div id="obOverlay"></div>' +
  '<nav id="obMenu" role="navigation" aria-label="Menu de Obras">' +
  '  <div class="ob-tit">\ud83c\udfd7\ufe0f Obras</div>' +
  '  <div id="obList"></div>' +
  '  <div class="ob-sep"></div>' +
  '  <div class="ob-foot">' +
  '    <button class="ob-btn-add" onclick="abrirModalNovaObra()">+ Nova Obra</button>' +
  '    <button class="ob-btn-mgr" onclick="abrirModalObra()">\u2699\ufe0f Gerenciar</button>' +
  '    <button class="ob-btn-del" onclick="excluirObraAtual()">\ud83d\uddd1\ufe0f Excluir</button>' +
  '  </div>' +
  '</nav>';

html = html.replace(
  /(<div class="container">)/,
  overlayAndPanel + '\n$1'
);
console.log('[OK] Overlay + Painel OBMENU injetados');

/* ================================================================== *
 * 7. INJETAR JS DA GAVETA OBRAS — ANTES DO ULTIMO </body>
 * ================================================================== */
const JS = `<script>
/* === PATCH OBRA DRAWER v4: gaveta lateral de Obras === */
(function () {
  "use strict";

  var O = window.OBMENU = window.OBMENU || {};
  if (O.__v4) { return; }
  O.__v4 = true;

  var D = document;
  function el(id) { return D.getElementById(id); }

  /* --- Abrir / Fechar --- */
  function abrir() {
    el("obMenu").classList.add("ob-open");
    el("obOverlay").classList.add("ob-show");
    el("obMenuBtn").setAttribute("aria-expanded","true");
    renderLista();
  }
  function fechar() {
    el("obMenu").classList.remove("ob-open");
    el("obOverlay").classList.remove("ob-show");
    el("obMenuBtn").setAttribute("aria-expanded","false");
  }
  function toggle() { el("obMenu").classList.contains("ob-open") ? fechar() : abrir(); }

  /* --- Render lista de obras --- */
  function renderLista() {
    var lista = el("obList");
    if (!lista) return;
    var db = window.db;
    if (!db || !db.obras) { lista.innerHTML = '<p style="color:#94a3b8;padding:8px">Nenhuma obra cadastrada.</p>'; return; }
    var itens = db.obras.map(function(o) {
      var sel = (db.obraAtualId === o.id) ? " ob-sel" : "";
      return '<button class="ob-item' + sel + '" data-obra-id="' + o.id + '">' +
        '<span class="ob-ico2">\ud83c\udfd7\ufe0f</span>' +
        '<span>' + (o.nome || o.titulo || "Obra " + o.id) + '</span>' +
        '</button>';
    }).join("");
    lista.innerHTML = itens;
    /* Atualiza badge do launcher */
    var atual = el("obAtual");
    if (atual && db.obraAtualId) {
      var ob = db.obras.find(function(o){ return o.id === db.obraAtualId; });
      if (ob) atual.textContent = ob.nome || ob.titulo || "";
    }
  }

  /* --- Trocar obra ao clicar na lista --- */
  D.addEventListener("click", function(e) {
    var btn = e.target.closest("[data-obra-id]");
    if (btn) {
      var id = btn.getAttribute("data-obra-id");
      if (id && window.trocarObra) {
        window.trocarObra(id);
        fechar();
      }
    }
  });

  /* --- Eventos do launcher e overlay --- */
  function bindEvents() {
    var btn = el("obMenuBtn");
    var overlay = el("obOverlay");
    if (btn) btn.addEventListener("click", toggle);
    if (overlay) overlay.addEventListener("click", fechar);
  }

  /* --- Manter selectObra escondido apos render --- */
  function garantirEscondido() {
    var sel = el("selectObra");
    if (sel && !sel.classList.contains("ob-hide")) { sel.classList.add("ob-hide"); }
  }

  /* --- Garantir que o launcher existe (runtime fallback) --- */
  function garantirLauncher() {
    if (el("obMenuBtn")) return;
    var details = D.querySelector("details#meu-menu-abas");
    if (!details) return;
    var p = details.parentElement;
    if (!p) return;
    var b = D.createElement("button");
    b.type = "button";
    b.id = "obMenuBtn";
    b.className = "ob-launcher";
    b.setAttribute("aria-haspopup","true");
    b.setAttribute("aria-expanded","false");
    b.setAttribute("aria-controls","obMenu");
    var ico = D.createElement("span");
    ico.className = "ob-ico";
    ico.setAttribute("aria-hidden","true");
    ico.textContent = "\ud83c\udfd7\ufe0f";
    var rot = D.createElement("span");
    rot.className = "ob-rot";
    rot.textContent = "Obra";
    var atu = D.createElement("span");
    atu.className = "ob-atual";
    atu.id = "obAtual";
    b.appendChild(ico);
    b.appendChild(rot);
    b.appendChild(atu);
    details.insertAdjacentElement("afterend", b);
  }

  /* --- Hook em render() e trocarObra() para atualizar lista --- */
  var _render = window.render;
  if (typeof _render === "function") {
    window.render = function() {
      if (_render) _render.apply(this, arguments);
      garantirEscondido();
      renderLista();
    };
  }
  var _trocarObra = window.trocarObra;
  if (typeof _trocarObra === "function") {
    window.trocarObra = function(id) {
      if (_trocarObra) _trocarObra.apply(this, arguments);
      garantirEscondido();
      renderLista();
    };
  }

  /* --- Observar mutacoes para manter selectObra escondido --- */
  var observer = new MutationObserver(function() { garantirEscondido(); });
  observer.observe(D.body, { childList:true, subtree:true, attributes:true, attributeFilter:["class","style"] });

  /* --- Init --- */
  D.addEventListener("DOMContentLoaded", function() {
    bindEvents();
    garantirLauncher();
    garantirEscondido();
    renderLista();
  });
  /* Se DOM ja carregou */
  if (D.readyState !== "loading") {
    bindEvents();
    garantirLauncher();
    garantirEscondido();
    renderLista();
  }
})();
<\/script>`;

/* Encontra o verdadeiro </body> usando lastIndexOf */
var bodyPos = html.lastIndexOf('</body>');
if (bodyPos === -1) { bodyPos = html.lastIndexOf('</BODY>'); }
if (bodyPos > -1) {
  var context = html.substring(bodyPos - 100, bodyPos);
  console.log('[INFO] Contexto antes do </body> real:');
  console.log('  ...' + context.slice(-80));
  html = html.substring(0, bodyPos) + JS + '\n</body>' + html.substring(bodyPos + 7);
  console.log('[OK] JS da gaveta Obras injetado ANTES do </body> real');
} else {
  console.error('[ERRO] </body> nao encontrado!');
}

/* ================================================================== *
 * 8. SALVAR + GIT
 * ================================================================== */
fs.writeFileSync(ARQ, html, 'utf8');
console.log('index.html salvo com sucesso');

try {
  execSync('git add index.html', { stdio: 'inherit', cwd: __dirname });
  execSync('git commit -m "feat: gaveta Obras v4 - obras so no drawer, launcher ao lado de Menu Abas, config dentro do menu, botoes nuvem padronizados"', { stdio: 'inherit', cwd: __dirname });
  execSync('git push', { stdio: 'inherit', cwd: __dirname });
  console.log('Git push OK!');
} catch (e) {
  console.warn('Git commands falhou. Rode manualmente:');
  console.log('   git add index.html');
  console.log('   git commit -m "feat: gaveta Obras v4"');
  console.log('   git push');
}

console.log('PATCH OBRA DRAWER v4 aplicado!');
