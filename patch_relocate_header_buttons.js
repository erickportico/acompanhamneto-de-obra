/* ============================================================
 * patch_relocate_header_buttons.js
 * Reorganiza o header do index.html:
 *   1) Move Supabase / Carregar Nuvem / Modo Claro para
 *      a coluna da direita (abaixo do Contrato Global)
 *   2) Remove o dropdown Configurações da project-selector
 *      e injeta os mesmos botões no rodapé da Gaveta Menu
 *      (#orMenu .or-painel, após or-lista)
 *   3) Os launchers (Menu + Obras) permanecem intactos
 *      em #pToolbarAbas
 *
 * USO: coloque este arquivo no mesmo diretório do index.html
 *       e adicione no final do <body>:
 *       <script src="patch_relocate_header_buttons.js"></script>
 * ============================================================ */
(function () {
  'use strict';
  if (window.__patchRelocateHeaderBtns) return;
  window.__patchRelocateHeaderBtns = true;

  var D = document;
  var tentativas = 0;
  var MAX = 30;

  /* ------------------------------------------------------------ *
   * CSS injetado — utilities na direita + seção config no ORMENU *
   * ------------------------------------------------------------ */
  function injetarCSS() {
    if (D.getElementById('pRelocCss')) return;
    var s = D.createElement('style');
    s.id = 'pRelocCss';
    s.textContent =
      /* --- Coluna de utilities no header direito --- */
      '.header-right-utilities {' +
        'display:flex;' +
        'gap:6px;' +
        'align-items:center;' +
        'flex-wrap:wrap;' +
        'margin-top:8px;' +
      '}' +
      '.header-right-utilities .secondary,' +
      '.header-right-utilities #statusNuvem {' +
        'font-size:0.72rem!important;' +
        'padding:4px 10px!important;' +
        'border-radius:8px!important;' +
      '}' +

      /* --- Seção Configurações no rodapé do ORMENU --- */
      '.or-config {' +
        'padding:14px 14px 18px 14px!important;' +
        'border-top:1px solid rgba(255,255,255,.1);' +
        'margin-top:auto;' +
      '}' +
      '.or-config-titulo {' +
        'font:700 10.5px/1 inherit;' +
        'letter-spacing:1.2px;' +
        'text-transform:uppercase;' +
        'color:#5d708f;' +
        'padding:0 2px 8px 2px;' +
      '}' +
      '.or-config-grid {' +
        'display:grid;' +
        'grid-template-columns:1fr 1fr;' +
        'gap:6px;' +
      '}' +
      '.or-config-btn {' +
        'display:flex!important;' +
        'align-items:center;' +
        'gap:8px;' +
        'width:100%!important;' +
        'padding:9px 10px!important;' +
        'font:500 12.5px/1.25 inherit!important;' +
        'text-align:left!important;' +
        'color:#c3d1ea!important;' +
        'background:transparent!important;' +
        'border:1px solid transparent!important;' +
        'border-radius:9px!important;' +
        'cursor:pointer;' +
        'transition:background .12s ease,color .12s ease;' +
      '}' +
      '.or-config-btn:hover {' +
        'color:#fff!important;' +
        'background:rgba(96,165,250,.12)!important;' +
      '}' +
      '.or-config-btn.or-config-full {' +
        'grid-column:1/-1;' +
      '}' +
      '.or-config-btn .or-cfg-ico {' +
        'display:grid;' +
        'place-items:center;' +
        'width:24px;' +
        'height:24px;' +
        'flex:0 0 24px;' +
        'font-size:13px;' +
        'background:rgba(255,255,255,.05);' +
        'border-radius:7px;' +
      '}' +

      /* --- Tema claro (light-mode) para or-config --- */
      'body:not(.dark-mode) .or-config {' +
        'border-top-color:rgba(0,0,0,.08);' +
      '}' +
      'body:not(.dark-mode) .or-config-titulo {' +
        'color:#6b7280;' +
      '}' +
      'body:not(.dark-mode) .or-config-btn {' +
        'color:#374151!important;' +
      '}' +
      'body:not(.dark-mode) .or-config-btn:hover {' +
        'color:#1e293b!important;' +
        'background:rgba(37,99,235,.08)!important;' +
      '}' +

      /* --- Responsivo: utilities abaixo de 860px --- */
      '@media(max-width:860px){' +
        '.header-right-utilities{justify-content:flex-start;}' +
      '}' +

      /* --- Esconder o settings-menu original da project-selector --- */
      '.project-selector > .settings-menu{display:none!important;}' +

      /* --- Esconder os 3 botões de utilidade da project-selector --- */
      '.project-selector > #statusNuvem,' +
      '.project-selector > button[onclick="carregarBancoDaNuvem()"],' +
      '.project-selector > button#btnThemeToggle{' +
        'display:none!important;' +
      '}';
    (D.head || D.documentElement).appendChild(s);
  }

  /* ------------------------------------------------------------ *
   * Mover os 3 botões de utilidade para o header direito         *
   * ------------------------------------------------------------ */
  function moverUtilities() {
    var badges = D.querySelector('.header-badges-right');
    if (!badges) return false;

    /* Criar container de utilities se não existe */
    var utilBox = badges.querySelector('.header-right-utilities');
    if (!utilBox) {
      utilBox = D.createElement('div');
      utilBox.className = 'header-right-utilities';
      badges.appendChild(utilBox);
    }

    /* Referências aos 3 elementos */
    var statusNuvem = D.getElementById('statusNuvem');
    var btnNuvem = D.querySelector('.project-selector > button[onclick="carregarBancoDaNuvem()"]');
    var btnTheme = D.getElementById('btnThemeToggle');

    if (!statusNuvem || !btnNuvem || !btnTheme) return false;

    /* Mover cada um para o utilBox */
    if (statusNuvem.parentNode !== utilBox) utilBox.appendChild(statusNuvem);
    if (btnNuvem.parentNode !== utilBox) utilBox.appendChild(btnNuvem);
    if (btnTheme.parentNode !== utilBox) utilBox.appendChild(btnTheme);

    /* Remover display:none inline do statusNuvem se tiver */
    statusNuvem.style.removeProperty('display');

    return true;
  }

  /* ------------------------------------------------------------ *
   * Injetar Configurações no fundo do ORMENU (após or-lista)     *
   * ------------------------------------------------------------ */
  function injetarConfigNoMenu() {
    var painel = D.querySelector('#orMenu .or-painel');
    if (!painel) return false;

    /* Não injetar duas vezes */
    if (painel.querySelector('.or-config')) return true;

    /* Criar seção de config */
    var sec = D.createElement('div');
    sec.className = 'or-config';
    sec.innerHTML =
      '<div class="or-config-titulo">Configurações</div>' +
      '<div class="or-config-grid">' +
        '<button type="button" class="or-config-btn" data-cfg="backup">' +
          '<span class="or-cfg-ico">💾</span><span>Backup</span>' +
        '</button>' +
        '<button type="button" class="or-config-btn" data-cfg="restaurar">' +
          '<span class="or-cfg-ico">📥</span><span>Restaurar</span>' +
        '</button>' +
        '<button type="button" class="or-config-btn" data-cfg="recuperar">' +
          '<span class="or-cfg-ico">🧿</span><span>Recuperar Dados Antigos</span>' +
        '</button>' +
        '<button type="button" class="or-config-btn" data-cfg="compartilhado">' +
          '<span class="or-cfg-ico">🌐</span><span>Banco Compartilhado</span>' +
        '</button>' +
      '</div>';

    /* Inserir ao final do painel (após or-lista, antes do fim) */
    painel.appendChild(sec);

    /* Ligar handlers — chama as mesmas funções que os botões originais */
    sec.querySelector('[data-cfg="backup"]')
      .addEventListener('click', function () {
        if (typeof window.exportarDados === 'function') window.exportarDados();
      });

    sec.querySelector('[data-cfg="restaurar"]')
      .addEventListener('click', function () {
        var f = D.getElementById('fileRestoreInput');
        if (f) f.click();
      });

    sec.querySelector('[data-cfg="recuperar"]')
      .addEventListener('click', function () {
        if (typeof window.abrirRecuperacaoDados === 'function') window.abrirRecuperacaoDados();
      });

    sec.querySelector('[data-cfg="compartilhado"]')
      .addEventListener('click', function () {
        if (typeof window.abrirBancoCompartilhado === 'function') window.abrirBancoCompartilhado();
      });

    return true;
  }

  /* ------------------------------------------------------------ *
   * Esconder o .settings-menu original da project-selector         *
   * (CSS já faz display:none, mas removemos também do fluxo DOM   *
   *  para evitar bugs do MutationObserver da Gaveta Obras)         *
   * ------------------------------------------------------------ */
  function removerSettingsOriginal() {
    var sm = D.querySelector('.project-selector > .settings-menu');
    if (sm && sm.parentNode) {
      /* Mover para um repositório oculto em vez de destruir,
         para preservar o #settingsMenu e o #fileRestoreInput
         (algum JS pode fazer getElementById neles) */
      var hide = D.getElementById('pRelocHide');
      if (!hide) {
        hide = D.createElement('div');
        hide.id = 'pRelocHide';
        hide.style.cssText = 'position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;';
        D.body.appendChild(hide);
      }
      /* Mover o settings-menu inteiro (inclui settingsMenu e botões) */
      hide.appendChild(sm);

      /* Mover o fileRestoreInput também, pois estava dentro de project-selector */
      var fri = D.getElementById('fileRestoreInput');
      if (fri && fri.parentNode === D.querySelector('.project-selector')) {
        hide.appendChild(fri);
      }
    }
    return true;
  }

  /* ------------------------------------------------------------ *
   * Loop de tentativas — espera o DOM estar pronto                 *
   * ------------------------------------------------------------ */
  function tentar() {
    tentativas++;
    if (tentativas > MAX) {
      try { console.warn('[patchRelocate] Desisti após ' + MAX + ' tentativas'); } catch (e) {}
      return;
    }

    var ps = D.querySelector('.project-selector');
    var badges = D.querySelector('.header-badges-right');
    var statusNuvem = D.getElementById('statusNuvem');

    /* Precisamos que os elementos existam */
    if (!ps || !badges || !statusNuvem) {
      setTimeout(tentar, 300);
      return;
    }

    /* Injetar CSS */
    injetarCSS();

    /* Passo 1: mover os 3 botões de utilidade */
    moverUtilities();

    /* Passo 2: injetar Config no fundo do ORMENU */
    injetarConfigNoMenu();

    /* Passo 3: remover settings-menu original do fluxo */
    removerSettingsOriginal();

    try { console.log('[patchRelocate] Aplicado com sucesso (tentativa ' + tentativas + ')'); } catch (e) {}
  }

  /* ------------------------------------------------------------ *
   * Garantir que patches futuros que recriem o ORMENU também     *
   * recebam a seção de config (reativa ao subtree de #orMenu)    *
   * ------------------------------------------------------------ */
  function vigiarOrMenu() {
    if (typeof MutationObserver !== 'function') return;
    var alvo = D.getElementById('orMenu');
    if (!alvo) {
      /* Se o orMenu ainda não existe, observar o body */
      var ob = new MutationObserver(function () {
        var m = D.getElementById('orMenu');
        if (m) {
          ob.disconnect();
          vigiarOrMenu(); /* reconectar no orMenu real */
        }
      });
      ob.observe(D.body, { childList: true, subtree: true });
      return;
    }
    var obs = new MutationObserver(function () {
      var painel = alvo.querySelector('.or-painel');
      if (painel && !painel.querySelector('.or-config')) {
        injetarConfigNoMenu();
      }
    });
    obs.observe(alvo, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------ *
   * Garantir que os utilities voltem ao lugar certo se alguém     *
   * mover eles de volta para a project-selector (ex: patch p124)  *
   * ------------------------------------------------------------ */
  function vigiarUtilities() {
    if (typeof MutationObserver !== 'function') return;
    var ps = D.querySelector('.project-selector');
    if (!ps) return;
    var obs = new MutationObserver(function () {
      var statusNuvem = D.getElementById('statusNuvem');
      var btnNuvem = D.querySelector('.project-selector > button[onclick="carregarBancoDaNuvem()"]');
      var btnTheme = D.getElementById('btnThemeToggle');
      if ((statusNuvem && statusNuvem.parentNode === ps) ||
          (btnNuvem && btnNuvem.parentNode === ps) ||
          (btnTheme && btnTheme.parentNode === ps)) {
        moverUtilities();
      }
    });
    obs.observe(ps, { childList: true });
  }

  /* ------------------------------------------------------------ *
   * Iniciar                                                      *
   * ------------------------------------------------------------ */
  function iniciar() {
    tentar();
    setTimeout(vigiarOrMenu, 600);
    setTimeout(vigiarUtilities, 600);
    /* Re-check periódico por segurança */
    setInterval(function () {
      moverUtilities();
      injetarConfigNoMenu();
    }, 5000);
  }

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
  setTimeout(iniciar, 400);
  setTimeout(iniciar, 1200);
})();
