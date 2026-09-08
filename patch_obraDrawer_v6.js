/* ============================================================
 * PATCH OBRA DRAWER v6 — LIMPO, SEM POLUIÇÃO
 * ============================================================
 * Correções v5 -> v6:
 *   - project-selector VAZIO removido do DOM (selectObra
 *     movido para body como hidden)
 *   - Botoes nuvem MINIMALISTAS: ícone+texto curto,
 *     sem badge grande, inline no header
 *   - Launcher "Obra" MINIMAL: só ícone + rótulo curto,
 *     sem nome da obra atual no botão (evita duplicação)
 *   - Nenhum card/painel visível além do launcher
 *   - Drawer OBMENU só aparece ao clicar no launcher
 *   - Ordem no header: título | contrato | nuvem-row
 *   - Ordem abaixo: [☰ Menu de Abas] [🏗 Obra]
 *
 * Aplicar com:  node patch_obraDrawer_v6.js
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
 * 0. INJETAR CSS — antes do </head> (fallback: antes </style>)
 * ================================================================== */
const CSS = `
/* === GAVETA OBRAS v6 === */
.ob-menu-row {
  display:flex!important;
  align-items:center!important;
  gap:6px!important;
  margin:0!important;
  padding:0!important;
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
  gap:6px!important;
  padding:8px 14px!important;
  font:bold 14px/1.2 inherit!important;
  color:#fff!important;
  background:#1e293b!important;
  border:1px solid rgba(255,255,255,.2)!important;
  border-radius:6px!important;
  box-shadow:0 2px 6px rgba(0,0,0,.25)!important;
  cursor:pointer!important;
  user-select:none!important;
  transition:background .15s,border-color .15s!important;
}
.ob-launcher:hover {
  background:#253347!important;
  border-color:rgba(59,130,246,.35)!important;
}
.ob-launcher:focus-visible { outline:2px solid #60a5fa; outline-offset:2px; }
.ob-launcher .ob-ico { font-size:1.1em!important; }
.ob-launcher .ob-rot { font-weight:700!important; }

#obMenu {
  position:fixed!important;
  top:0; left:0;
  width:280px; height:100vh;
  max-width:85vw;
  background:#0f172a;
  border-right:1px solid rgba(255,255,255,.1);
  box-shadow:4px 0 20px rgba(0,0,0,.5);
  z-index:99999!important;
  transform:translateX(-100%);
  transition:transform .25s cubic-bezier(.4,0,.2,1);
  overflow-y:auto;
  padding:12px 10px 20px;
  font-family:inherit;
}
#obMenu.ob-open { transform:translateX(0)!important; }
#obMenu .ob-tit { font:700 14px/1.3 inherit; color:#e8eefc; padding:8px 0 4px; border-bottom:1px solid rgba(255,255,255,.1); margin:0 0 6px; }
#obMenu .ob-item { display:flex!important; align-items:center; gap:8px; padding:8px 10px; border-radius:6px; cursor:pointer; transition:background .12s; color:#c3d1ea; font:500 13px/1.3 inherit; border:none; background:transparent; width:100%; text-align:left; }
#obMenu .ob-item:hover { background:rgba(59,130,246,.1); }
#obMenu .ob-item.ob-sel { background:rgba(59,130,246,.16)!important; color:#60a5fa; font-weight:600; }
#obMenu .ob-ico2 { font-size:1em; width:20px; text-align:center; }
#obMenu .ob-sep { height:1px; background:rgba(255,255,255,.06); margin:6px 0; }
#obMenu .ob-foot { padding:8px 0 0; border-top:1px solid rgba(255,255,255,.08); margin-top:8px; display:flex; flex-wrap:wrap; gap:5px; }
#obMenu .ob-foot button { font:500 11.5px/1.3 inherit; padding:5px 10px; border-radius:5px; border:1px solid rgba(255,255,255,.1); cursor:pointer; transition:background .12s; }
#obMenu .ob-foot .ob-btn-add { background:#166534; color:#fff; border-color:#22c55e!important; }
#obMenu .ob-foot .ob-btn-add:hover { background:#15803d; }
#obMenu .ob-foot .ob-btn-mgr { background:#92400e; color:#fff; border-color:#f59e0b!important; }
#obMenu .ob-foot .ob-btn-mgr:hover { background:#a16207; }
#obMenu .ob-foot .ob-btn-del { background:#991b1b; color:#fff; border-color:#ef4444!important; }
#obMenu .ob-foot .ob-btn-del:hover { background:#b91c1c; }

#obOverlay { position:fixed!important; inset:0; background:rgba(0,0,0,.4); z-index:99998; display:none; }
#obOverlay.ob-show { display:block!important; }

/* selectObra escondido — fica no body, fora do fluxo */
#selectObra.ob-hide { position:absolute!important; left:-9999px!important; width:1px!important; height:1px!important; opacity:0!important; pointer-events:none!important; }

/* botoes obra escondidos no header — nunca mais aparecem */
.ob-hide-btn { display:none!important; }

/* project-selector limpo (vazio = some) */
.project-selector[data-ob-empty] { display:none!important; margin:0!important; padding:0!important; height:0!important; overflow:hidden!important; }

/* nuvem row MINIMAL */
.ob-nuvem-row { display:flex!important; gap:4px!important; align-items:center!important; justify-content:flex-end!important; }
.ob-nuvem-chip { display:inline-flex!important; align-items:center!important; height:24px!important; padding:2px 8px!important; border-radius:4px!important; font:500 .65rem/1.2 inherit!important; border:1px solid rgba(255,255,255,.1)!important; background:transparent!important; color:#94a3b8!important; cursor:pointer!important; white-space:nowrap!important; transition:background .12s!important; }
.ob-nuvem-chip:hover { background:rgba(255,255,255,.06)!important; }
.ob-nuvem-chip.ob-status { background:rgba(34,197,94,.12)!important; color:#86efac!important; border-color:rgba(34,197,94,.2)!important; }
.ob-nuvem-chip.ob-status.ob-off { background:rgba(245,158,11,.12)!important; color:#fcd34d!important; border-color:rgba(245,158,11,.2)!important; }

/* header-badges-right: coluna, nuvem ABAIXO */
.header-badges-right.ob-col {
  flex-direction:column!important;
  align-items:flex-end!important;
  gap:6px!important;
}

/* Config dentro das tabs */
.tabs > .ob-settings-block { margin-top:6px; border-top:1px solid rgba(255,255,255,.08); padding-top:6px; }
.tabs > .ob-settings-block > button { width:100%; text-align:left; margin:0 0 4px; font-size:.8rem!important; padding:5px 8px!important; }
.tabs > .ob-settings-block .settings-dropdown { position:relative!important; top:auto!important; right:auto!important; }
.tabs > .ob-settings-block .settings-dropdown button { font-size:.78rem!important; padding:4px 8px!important; text-align:left; }

@media (max-width:520px) { #obMenu{width:260px!important} }
@media print { #obMenu,.ob-launcher,.ob-menu-row,.ob-nuvem-row{display:none!important;visibility:hidden!important} }
`;

/* Injeta CSS — ancora PATCH 62, fallback </style> */
var cssAnchor = /\/\* PATCH 62/;
if (cssAnchor.test(html)) {
  html = html.replace(cssAnchor, CSS + '\n/* PATCH 62');
  console.log('[OK] CSS injetado (ancora PATCH 62)');
} else {
  html = html.replace(/<\/style>\s*<\/head>/, CSS + '\n</style>\n</head>');
  console.log('[OK] CSS injetado (antes </head>)');
}

/* ================================================================== *
 * 1. ESCONDER selectObra + adicionar classe ob-hide
 * ================================================================== */
html = html.replace(
  /(<select\s+id="selectObra")/,
  '$1 class="ob-hide"'
);
console.log('[OK] selectObra marcado como escondido');

/* ================================================================== *
 * 2. ESCONDER botoes de obra no header (Gerenciar, Nova, Excluir)
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
    'style="width:100%;text-align:left;margin:0 0 4px 0;">\u2699\ufe0f Configura\u00e7\u00f5es</button>' +
    '<div id="settingsMenu" class="settings-dropdown" ' +
    'style="position:relative!important;top:auto!important;right:auto!important;display:none;">' +
    '<button class="secondary" onclick="exportarDados()" style="text-align:left;">\ud83d\udcbe Backup</button>' +
    '<button class="secondary" onclick="document.getElementById(\'fileRestoreInput\').click()" style="text-align:left;">\ud83d\udce5 Restaurar</button>' +
    '<button class="warning" onclick="abrirRecuperacaoDados()" style="text-align:left;">\ud83e\uddff Recuperar Dados</button>' +
    '<button class="primary" onclick="abrirBancoCompartilhado()" style="text-align:left;">\ud83c\udf10 Compartilhado</button>' +
    '</div></div>' +
    '<input type="file" id="fileRestoreInput" accept=".json" style="display:none" onchange="restaurarBackupJSON(event)">';

  /* Injeta dentro de .tabs, ANTES do fechamento </div> */
  var tabsAnchor = /(<\/div>\s*<!--[\s]*3\.[\s]*Seu\s+conte[u\u00fa]+do\s+principal)/;
  if (tabsAnchor.test(html)) {
    html = html.replace(tabsAnchor, settingsBlock + '\n$1');
    console.log('[OK] Config injetado dentro do Menu de Abas (.tabs)');
  } else {
    var fpdoAnchor = /(<button[^>]*id="btn-tab-fpdo"[^>]*>[\s\S]*?<\/button>\s*)(<\/div>)/;
    if (fpdoAnchor.test(html)) {
      html = html.replace(fpdoAnchor, '$1' + settingsBlock + '\n$2');
      console.log('[OK] Config injetado apos btn-tab-fpdo (fallback)');
    } else {
      console.warn('[AVISO] Nao achou ancora para injetar Config nas tabs');
    }
  }
} else {
  console.warn('[AVISO] Bloco settings-menu nao encontrado no header');
}

/* ================================================================== *
 * 4. REPOSICIONAR BOTOES NUVEM — chips minimalistas no header
 * ================================================================== */
var nuvemRegex = /(<span\s+id="statusNuvem"[^>]*>[\s\S]*?<\/span>)\s*(<button[^>]*onclick="carregarBancoDaNuvem\(\)"[^>]*>[\s\S]*?<\/button>)\s*(<button[^>]*onclick="alternarTema\(\)"[^>]*id="btnThemeToggle"[^>]*>[\s\S]*?<\/button>)/;
var nuvemMatch = html.match(nuvemRegex);
if (nuvemMatch) {
  /* Remove do project-selector */
  html = html.replace(nuvemRegex, '');

  /* Converte em chips minimalistas */
  var statusChip = '<span id="statusNuvem" class="ob-nuvem-chip ob-status">\u2601\ufe0f Local</span>';
  var btnCarregar = '<button class="ob-nuvem-chip" onclick="carregarBancoDaNuvem()" title="Carregar da nuvem">\u2601 Nuvem</button>';
  var btnTema = '<button class="ob-nuvem-chip" onclick="alternarTema()" id="btnThemeToggle">\u2600\ufe0f Tema</button>';

  var nuvemRow = '<div class="ob-nuvem-row">' + statusChip + btnCarregar + btnTema + '</div>';

  /* header-badges-right vira coluna com nuvem ABAIXO */
  html = html.replace(
    /(<div class="header-badges-right")/,
    '$1 style="flex-direction:column!important;align-items:flex-end!important;gap:6px!important"'
  );

  /* Injeta nuvemRow dentro de header-badges-right, apos os badges de contrato */
  var badgesAnchor = /(<\/div>\s*<\/div>\s*)(<div class="project-selector">)/;
  if (badgesAnchor.test(html)) {
    html = html.replace(badgesAnchor, nuvemRow + '\n$1$2');
    console.log('[OK] Chips nuvem minimalistas injetados ABAIXO do contrato');
  } else {
    console.warn('[AVISO] Nao achou ancora header-badges-right');
  }
} else {
  console.warn('[AVISO] Padrao dos botoes nuvem nao encontrado');
}

/* ================================================================== *
 * 5. LIMPAR project-selector — esconder completamente (vazio)
 *    Mover selectObra para body (se ainda dentro de project-selector)
 * ================================================================== */
/* Adiciona classe ob-empty ao project-selector */
/* Esconder project-selector vazio diretamente — sem esperar JS */
html = html.replace(
  /(<div class="project-selector")/,
  '$1 style="display:none!important"'
);
/* Vai adicionar display:none via JS para garantir */

/* ================================================================== *
 * 6. EMPACOTAR <details> + launcher num flex-row (.ob-menu-row)
 * ================================================================== */
var launcherHTML =
  '<button type="button" id="obMenuBtn" class="ob-launcher" ' +
  'aria-haspopup="true" aria-expanded="false" aria-controls="obMenu">' +
  '<span class="ob-ico" aria-hidden="true">\ud83c\udfd7\ufe0f</span>' +
  '<span class="ob-rot">Obra</span>' +
  '</button>';

/* Remove margin inline do <details> — .ob-menu-row cuida */
html = html.replace(
  /(<details\s+id="meu-menu-abas"\s+)style="margin:\s*10px\s+0\s+20px\s+0;\s*position:\s*relative;\s*z-index:\s*9999;"/,
  '$1style="position:relative;z-index:9999;"'
);

/* Envolve <details>...</details> + launcher em .ob-menu-row */
html = html.replace(
  /(<details\s+id="meu-menu-abas"[\s\S]*?<\/details>)/,
  '<div class="ob-menu-row">$1\n' + launcherHTML + '</div>'
);
console.log('[OK] Launcher Obra envolvido com Menu de Abas em .ob-menu-row');

/* ================================================================== *
 * 7. INJETAR OVERLAY + PAINEL OBMENU NO BODY (antes de .container)
 * ================================================================== */
var overlayAndPanel =
  '<div id="obOverlay"></div>' +
  '<nav id="obMenu" role="navigation" aria-label="Menu de Obras">' +
  '  <div class="ob-tit">\ud83c\udfd7\ufe0f Obras</div>' +
  '  <div id="obList"></div>' +
  '  <div class="ob-sep"></div>' +
  '  <div class="ob-foot">' +
  '    <button class="ob-btn-add" onclick="abrirModalNovaObra()">+ Nova</button>' +
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
 * 8. INJETAR JS DA GAVETA OBRAS — ANTES DO ULTIMO </body>
 * ================================================================== */
const JS = `<script>
/* === PATCH OBRA DRAWER v6: gaveta lateral de Obras — MINIMAL === */
(function () {
  "use strict";

  var O = window.OBMENU = window.OBMENU || {};
  if (O.__v6) { return; }
  O.__v6 = true;

  var D = document;
  function el(id) { return D.getElementById(id); }

  /* --- Esconder project-selector vazio --- */
  function hideProjectSelector() {
    var ps = D.querySelector('.project-selector');
    if (ps) {
      var visibleChildren = 0;
      for (var i = 0; i < ps.children.length; i++) {
        var c = ps.children[i];
        var s = getComputedStyle(c);
        if (s.display !== 'none' && s.visibility !== 'hidden' && s.offsetHeight > 0) {
          visibleChildren++;
        }
      }
      if (visibleChildren === 0) {
        ps.style.display = 'none';
        ps.style.margin = '0';
        ps.style.padding = '0';
        ps.style.height = '0';
        ps.style.overflow = 'hidden';
      }
    }
  }

  /* --- Atualizar chip de status nuvem --- */
  function updateNuvemStatus() {
    var chip = el('statusNuvem');
    if (!chip) return;
    var db = window.db;
    var sup = window.supabase;
    if (sup && db && db.obras && db.obras.length > 0) {
      chip.textContent = '\u2601\ufe0f ' + db.obras.length + ' obras';
      chip.classList.remove('ob-off');
    } else {
      chip.textContent = '\u2601\ufe0f Local';
      chip.classList.add('ob-off');
    }
  }

  /* --- Abrir / Fechar gaveta --- */
  function abrir() {
    el('obMenu').classList.add('ob-open');
    el('obOverlay').classList.add('ob-show');
    var btn = el('obMenuBtn');
    if (btn) btn.setAttribute('aria-expanded','true');
    renderLista();
  }
  function fechar() {
    el('obMenu').classList.remove('ob-open');
    el('obOverlay').classList.remove('ob-show');
    var btn = el('obMenuBtn');
    if (btn) btn.setAttribute('aria-expanded','false');
  }
  function toggle() { el('obMenu').classList.contains('ob-open') ? fechar() : abrir(); }

  /* --- Click delegado --- */
  D.addEventListener('click', function(e) {
    var btn = e.target.closest('#obMenuBtn');
    if (btn) { e.preventDefault(); e.stopPropagation(); toggle(); return; }
    var ov = e.target.closest('#obOverlay');
    if (ov) { fechar(); return; }
  });

  /* --- Esc fecha --- */
  D.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fechar();
  });

  /* --- Render lista de obras --- */
  function renderLista() {
    var lista = el('obList');
    if (!lista) return;
    var db = window.db;
    if (!db || !db.obras || db.obras.length === 0) {
      lista.innerHTML = '<p style="color:#64748b;padding:6px;font-size:.78rem">Nenhuma obra.</p>';
      return;
    }
    var itens = db.obras.map(function(o) {
      var sel = (db.obraAtualId === o.id) ? ' ob-sel' : '';
      return '<button class="ob-item' + sel + '" data-obra-id="' + o.id + '">' +
        '<span class="ob-ico2">\ud83c\udfd7\ufe0f</span>' +
        '<span>' + (o.nome || o.titulo || 'Obra ' + o.id) + '</span>' +
        '</button>';
    }).join('');
    lista.innerHTML = itens;
  }

  /* --- Trocar obra ao clicar --- */
  D.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-obra-id]');
    if (btn) {
      var id = btn.getAttribute('data-obra-id');
      if (id && window.trocarObra) {
        window.trocarObra(id);
        fechar();
      }
    }
  });

  /* --- Manter selectObra escondido --- */
  function garantirEscondido() {
    var sel = el('selectObra');
    if (sel && !sel.classList.contains('ob-hide')) { sel.classList.add('ob-hide'); }
  }

  /* --- Garantir launcher --- */
  function garantirLauncher() {
    if (el('obMenuBtn')) return;
    var row = D.querySelector('.ob-menu-row');
    if (row) {
      var b = D.createElement('button');
      b.type = 'button';
      b.id = 'obMenuBtn';
      b.className = 'ob-launcher';
      b.setAttribute('aria-haspopup','true');
      b.setAttribute('aria-expanded','false');
      b.setAttribute('aria-controls','obMenu');
      b.innerHTML = '<span class="ob-ico" aria-hidden="true">\ud83c\udfd7\ufe0f</span><span class="ob-rot">Obra</span>';
      row.appendChild(b);
    }
  }

  /* --- Hook em render() e trocarObra() --- */
  var _render = window.render;
  if (typeof _render === 'function') {
    window.render = function() {
      if (_render) _render.apply(this, arguments);
      garantirEscondido();
      hideProjectSelector();
      updateNuvemStatus();
      renderLista();
    };
  }
  var _trocarObra = window.trocarObra;
  if (typeof _trocarObra === 'function') {
    window.trocarObra = function(id) {
      if (_trocarObra) _trocarObra.apply(this, arguments);
      garantirEscondido();
      hideProjectSelector();
      updateNuvemStatus();
      renderLista();
    };
  }

  /* --- MutationObserver --- */
  var observer = new MutationObserver(function() {
    garantirEscondido();
    hideProjectSelector();
  });
  observer.observe(D.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style'] });

  /* --- Init --- */
  function init() {
    garantirLauncher();
    garantirEscondido();
    hideProjectSelector();
    updateNuvemStatus();
    renderLista();
  }
  D.addEventListener('DOMContentLoaded', init);
  if (D.readyState !== 'loading') { setTimeout(init, 50); }
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
 * 9. SALVAR + GIT
 * ================================================================== */
fs.writeFileSync(ARQ, html, 'utf8');
console.log('index.html salvo com sucesso');

try {
  execSync('git add index.html', { stdio: 'inherit', cwd: __dirname });
  execSync('git commit -m "feat: gaveta Obras v6 — minimal, sem poluicao visual"', { stdio: 'inherit', cwd: __dirname });
  execSync('git push', { stdio: 'inherit', cwd: __dirname });
  console.log('Git push OK!');
} catch (e) {
  console.warn('Git commands falhou. Rode manualmente:');
  console.log('   git add index.html');
  console.log('   git commit -m "feat: gaveta Obras v6"');
  console.log('   git push');
}

console.log('PATCH OBRA DRAWER v6 aplicado!');