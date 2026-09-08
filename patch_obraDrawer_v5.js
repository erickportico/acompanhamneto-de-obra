/* ============================================================
 * PATCH OBRA DRAWER v5
 * ============================================================
 * Correcoes v4 -> v5:
 *   - Launcher "Obra" no mesmo alinhamento e proporcao do
 *     summary "Menu de Abas" (mesma altura, largura similar)
 *   - Launcher envolvido num flex-row junto com o <details>
 *   - Botoes nuvem ABAIXO (nova linha) do valor do contrato,
 *     nao ao lado — header-badges-right vira flex-column
 *   - JS com bindEvents mais robusto (click delegado)
 *
 * Aplicar com:  node patch_obraDrawer_v5.js
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
/* === GAVETA OBRAS v5 === */
.ob-menu-row {
  display:flex!important;
  align-items:flex-start!important;
  gap:8px!important;
  margin:10px 0 20px 0!important;
  position:relative!important;
  z-index:9999!important;
}
.ob-menu-row > details,
.ob-menu-row > .ob-launcher {
  flex-shrink:0!important;
}
.ob-launcher {
  display:inline-flex!important;
  align-items:center!important;
  gap:8px!important;
  padding:8px 16px!important;
  font:bold 14px/1.2 inherit!important;
  color:#fff!important;
  background:#1e293b!important;
  border:1px solid rgba(255,255,255,.2)!important;
  border-radius:6px!important;
  box-shadow:0 4px 10px rgba(0,0,0,.3)!important;
  cursor:pointer!important;
  user-select:none!important;
  transition:transform .12s,box-shadow .12s,border-color .12s!important;
}
.ob-launcher:hover {
  transform:translateY(-1px)!important;
  box-shadow:0 6px 18px rgba(59,130,246,.22)!important;
  border-color:rgba(59,130,246,.45)!important;
}
.ob-launcher:focus-visible { outline:2px solid #60a5fa; outline-offset:2px; }
.ob-launcher .ob-ico { font-size:1.15em!important; }
.ob-launcher .ob-rot { font-weight:700!important; }
.ob-launcher .ob-atual { font-size:.8em!important; color:#93c5fd!important; max-width:110px!important; overflow:hidden!important; text-overflow:ellipsis!important; white-space:nowrap!important; }
.ob-launcher .ob-atual:before { content:"\u2022"!important; margin-right:6px!important; color:#3b82f6!important; }

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
#obMenu .ob-foot button { font:500 12px/1.3 inherit; padding:7px 12px; border-radius:6px; border:1px solid rgba(255,255,255,.12); cursor:pointer; transition:background .15s; }
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

/* header-badges-right: coluna para colocar nuvem ABAIXO do contrato */
.header-badges-right.ob-col {
  flex-direction:column!important;
  align-items:flex-end!important;
  gap:4px!important;
}

/* nuvem buttons padronizados */
.ob-nuvem-row { display:flex!important; flex-wrap:wrap!important; gap:4px!important; align-items:center!important; justify-content:flex-end!important; width:100%!important; }
.ob-nuvem-btn { display:inline-flex!important; align-items:center!important; justify-content:center!important; min-width:38px!important; height:32px!important; padding:4px 10px!important; border-radius:6px!important; font:500 .75rem/1.2 inherit!important; border:1px solid rgba(255,255,255,.12)!important; background:transparent!important; color:#c3d1ea!important; cursor:pointer!important; transition:background .15s!important; white-space:nowrap!important; }
.ob-nuvem-btn:hover { background:rgba(255,255,255,.08)!important; }

/* Configuracoes dentro das tabs */
.tabs > .ob-settings-block { margin-top:8px; border-top:1px solid rgba(255,255,255,.1); padding-top:8px; }
.tabs > .ob-settings-block > button { width:100%; text-align:left; margin:0 0 6px; }
.tabs > .ob-settings-block .settings-dropdown { position:relative!important; top:auto!important; right:auto!important; }

@media (max-width:520px) { .ob-launcher .ob-atual{display:none!important} #obMenu{width:290px!important} }
@media print { #obMenu,.ob-launcher,.ob-menu-row{display:none!important;visibility:hidden!important} }
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
 * 1. ESCONDER selectObra
 * ================================================================== */
html = html.replace(
  /(<select\s+id="selectObra")/,
  '$1 class="ob-hide"'
);
console.log('[OK] selectObra marcado como escondido');

/* ================================================================== *
 * 2. ESCONDER botoes de obra no header
 * ================================================================== */
html = html.replace(
  /(<button[^>]*onclick="abrirModalObra\(\)"[^>]*>)/,
  '<span class="ob-hide-btn">$1'
);
html = html.replace(
  /(<button[^>]*onclick="abrirModalNovaObra\(\)"[^>]*>)/,
  '<span class="ob-hide-btn">$1'
);
html = html.replace(
  /(<button[^>]*onclick="excluirObraAtual\(\)"[^>]*>)/,
  '<span class="ob-hide-btn">$1'
);
console.log('[OK] Botoes de obra no header escondidos');

/* ================================================================== *
 * 3. MOVER Configuracoes para DENTRO do <div class="tabs">
 * ================================================================== */
var settingsRegex = /<div\s+class="settings-menu">[\s\S]*?<\/div>\s*<\/div>\s*<input[^>]*id="fileRestoreInput"[^>]*>/;
var settingsMatch = html.match(settingsRegex);
if (settingsMatch) {
  html = html.replace(settingsRegex, '');
  console.log('[OK] Bloco Configuracoes removido do header');

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

  /* Injeta dentro de .tabs, ANTES do fechamento </div> */
  var tabsAnchor = /(<\/div>\s*<!--[\s]*3\.[\s]*Seu\s+conte[u\u00fa]+do\s+principal)/;
  if (tabsAnchor.test(html)) {
    html = html.replace(tabsAnchor, settingsBlock + '\n$1');
    console.log('[OK] Configuracoes injetado dentro do Menu de Abas (.tabs)');
  } else {
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
 * 4. REPOSICIONAR BOTOES NUVEM ABAIXO do valor do contrato
 *    header-badges-right vira flex-column (classe ob-col)
 * ================================================================== */
var nuvemRegex = /(<span\s+id="statusNuvem"[^>]*>[\s\S]*?<\/span>)\s*(<button[^>]*onclick="carregarBancoDaNuvem\(\)"[^>]*>[\s\S]*?<\/button>)\s*(<button[^>]*onclick="alternarTema\(\)"[^>]*id="btnThemeToggle"[^>]*>[\s\S]*?<\/button>)/;
var nuvemMatch = html.match(nuvemRegex);
if (nuvemMatch) {
  var spanNuvem = nuvemMatch[1];
  var btnCarregar = nuvemMatch[2];
  var btnTema    = nuvemMatch[3];

  /* Remove do project-selector */
  html = html.replace(nuvemRegex, '');

  /* Padroniza com ob-nuvem-btn */
  spanNuvem  = spanNuvem.replace(/id="statusNuvem"/, 'id="statusNuvem" class="ob-nuvem-btn"');
  btnCarregar = btnCarregar.replace(/class="secondary"/, 'class="secondary ob-nuvem-btn"');
  btnTema    = btnTema.replace(/class="secondary"/, 'class="secondary ob-nuvem-btn"');

  var nuvemRow = '<div class="ob-nuvem-row">' + spanNuvem + btnCarregar + btnTema + '</div>';

  /* Adiciona classe ob-col ao header-badges-right para virar coluna */
  html = html.replace(
    /(<div class="header-badges-right")/,
    '$1 class-extra="ob-col"'
  );
  /* Melhor: injetar a classe direto */
  html = html.replace(
    'class-extra="ob-col"',
    ''
  );
  html = html.replace(
    /(<div class="header-badges-right")/,
    '$1 style="flex-direction:column!important;align-items:flex-end!important;gap:4px!important"'
  );

  /* Injeta nuvem row DENTRO de header-badges-right, apos contract-badges */
  /* Ancora: o </div> que fecha header-badges-right, antes de </div> que fecha header-title-container, antes de project-selector */
  var badgesAnchor = /(<\/div>\s*<\/div>\s*)(<div class="project-selector">)/;
  if (badgesAnchor.test(html)) {
    html = html.replace(badgesAnchor, nuvemRow + '\n$1$2');
    console.log('[OK] Botoes nuvem reposicionados ABAIXO do contrato em header-badges-right');
  } else {
    console.warn('[AVISO] Nao achou ancora header-badges-right');
  }
} else {
  console.warn('[AVISO] Padrao dos botoes nuvem nao encontrado');
}

/* ================================================================== *
 * 5. EMPACOTAR <details> + launcher num flex-row (.ob-menu-row)
 *    para ficarem no mesmo alinhamento horizontal
 * ================================================================== */
var launcherHTML =
  '<button type="button" id="obMenuBtn" class="ob-launcher" ' +
  'aria-haspopup="true" aria-expanded="false" aria-controls="obMenu">' +
  '<span class="ob-ico" aria-hidden="true">\ud83c\udfd7\ufe0f</span>' +
  '<span class="ob-rot">Obra</span>' +
  '<span class="ob-atual" id="obAtual"></span>' +
  '</button>';

/* Remove o style inline de margin do <details> pq o .ob-menu-row ja cuida */
html = html.replace(
  /(<details\s+id="meu-menu-abas"\s+)style="margin:\s*10px\s+0\s+20px\s+0;\s*position:\s*relative;\s*z-index:\s*9999;"/,
  '$1style="position:relative;z-index:9999;"'
);

/* Envolve <details>...</details> num div.ob-menu-row junto com launcher */
html = html.replace(
  /(<details\s+id="meu-menu-abas"[\s\S]*?<\/details>)/,
  '<div class="ob-menu-row">$1\n' + launcherHTML + '</div>'
);
console.log('[OK] Launcher Obra envolvido com Menu de Abas em .ob-menu-row');

/* ================================================================== *
 * 6. INJETAR OVERLAY + PAINEL OBMENU NO BODY
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
/* === PATCH OBRA DRAWER v5: gaveta lateral de Obras === */
(function () {
  "use strict";

  var O = window.OBMENU = window.OBMENU || {};
  if (O.__v5) { return; }
  O.__v5 = true;

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

  /* --- Delegacao de click para o launcher --- */
  D.addEventListener("click", function(e) {
    var btn = e.target.closest("#obMenuBtn");
    if (btn) { e.preventDefault(); e.stopPropagation(); toggle(); }
    var ov = e.target.closest("#obOverlay");
    if (ov) { fechar(); }
  });

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

  /* --- Manter selectObra escondido apos render --- */
  function garantirEscondido() {
    var sel = el("selectObra");
    if (sel && !sel.classList.contains("ob-hide")) { sel.classList.add("ob-hide"); }
  }

  /* --- Garantir launcher no runtime --- */
  function garantirLauncher() {
    if (el("obMenuBtn")) return;
    var row = D.querySelector(".ob-menu-row");
    if (row) {
      var b = D.createElement("button");
      b.type = "button";
      b.id = "obMenuBtn";
      b.className = "ob-launcher";
      b.setAttribute("aria-haspopup","true");
      b.setAttribute("aria-expanded","false");
      b.setAttribute("aria-controls","obMenu");
      b.innerHTML = '<span class="ob-ico" aria-hidden="true">\ud83c\udfd7\ufe0f</span><span class="ob-rot">Obra</span><span class="ob-atual" id="obAtual"></span>';
      row.appendChild(b);
    }
  }

  /* --- Hook em render() e trocarObra() --- */
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

  /* --- MutationObserver para manter selectObra escondido --- */
  var observer = new MutationObserver(function() { garantirEscondido(); });
  observer.observe(D.body, { childList:true, subtree:true, attributes:true, attributeFilter:["class","style"] });

  /* --- Init --- */
  function init() { garantirLauncher(); garantirEscondido(); renderLista(); }
  D.addEventListener("DOMContentLoaded", init);
  if (D.readyState !== "loading") { init(); }
})();
<\/script>`;

/* Encontra o verdadeiro </body> */
var bodyPos = html.lastIndexOf('</body>');
if (bodyPos === -1) { bodyPos = html.lastIndexOf('</BODY>'); }
if (bodyPos > -1) {
  var context = html.substring(bodyPos - 100, bodyPos);
  console.log('[INFO] Contexto antes do </body> real:');
  console.log('  ...' + context.slice(-80));
  html = html.substring(0, bodyPos) + JS + '\n</body>' + html.substring(bodyPos + 7);
  console.log('[OK] JS injetado ANTES do </body> real');
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
  execSync('git commit -m "feat: gaveta Obras v5 - launcher alinhado com Menu Abas, nuvem abaixo do contrato"', { stdio: 'inherit', cwd: __dirname });
  execSync('git push', { stdio: 'inherit', cwd: __dirname });
  console.log('Git push OK!');
} catch (e) {
  console.warn('Git commands falhou. Rode manualmente:');
  console.log('   git add index.html');
  console.log('   git commit -m "feat: gaveta Obras v5"');
  console.log('   git push');
}

console.log('PATCH OBRA DRAWER v5 aplicado!');
