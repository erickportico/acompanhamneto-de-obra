
                /* ====== PATCH80_MENU_IMPRESSAO_GRAVACAO_OK ====== */
                (function () {
                  'use strict';
                  if (window.__PS80) { return; }
                  window.__PS80 = true;
                
                  var K_AG = 'painelAgendaObras_v1';
                  var CAMPO_DB = 'agendaObras';
                
                  /* ---------------------------------------------------------------- *
                   * 0) avisinho na tela (usa o toast do painel quando existir)
                   * ---------------------------------------------------------------- */
                  function aviso(msg, tipo) {
                    try {
                      if (typeof window.mostrarToastPainel === 'function') {
                        window.mostrarToastPainel(msg, tipo || 'ok');
                        return;
                      }
                    } catch (e) {}
                    var d = document.getElementById('ps80Aviso');
                    if (!d) {
                      d = document.createElement('div');
                      d.id = 'ps80Aviso';
                      d.setAttribute('data-ps80', '1');
                      document.body.appendChild(d);
                    }
                    d.textContent = msg;
                    d.className = 'on' + (tipo === 'erro' ? ' erro' : '');
                    if (d.__t) { clearTimeout(d.__t); }
                    d.__t = setTimeout(function () { d.className = ''; }, 2600);
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 1) estilos: barra dentro do menu, aviso e impressao
                   * ---------------------------------------------------------------- */
                  function estilo() {
                    if (document.getElementById('ps80Estilo')) { return; }
                    var css = [
                      /* barra do administrador quando esta dentro do Menu de Abas */
                      '#meu-menu-abas .tabs > #ps79Barra{position:static !important;left:auto !important;right:auto !important;',
                      'top:auto !important;bottom:auto !important;width:100% !important;max-width:100% !important;',
                      'box-sizing:border-box !important;margin:0 0 6px 0 !important;padding:8px 10px !important;',
                      'border-radius:8px !important;flex-wrap:wrap !important;justify-content:flex-start !important;',
                      'z-index:auto !important;box-shadow:none !important;border:1px solid rgba(255,255,255,.14) !important}',
                      '#meu-menu-abas .tabs > #ps79Barra button{margin:2px 0 !important}',
                      /* aviso simples de "salvo" */
                      '#ps80Aviso{position:fixed;right:16px;top:16px;z-index:2147482500;background:#16a34a;color:#fff;',
                      'font:13px Segoe UI,Arial,sans-serif;padding:9px 14px;border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.3);',
                      'opacity:0;transform:translateY(-8px);transition:opacity .2s,transform .2s;pointer-events:none}',
                      '#ps80Aviso.on{opacity:1;transform:translateY(0)}',
                      '#ps80Aviso.erro{background:#dc2626}',
                      /* impressao: nada de botao flutuante de link, janela ou barra */
                      '@media print{',
                      'html body #pbxBotao,html body #pbxJanela,html body #pbxBotao *,html body #pbxJanela *,',
                      'html body #ps79Barra,html body #ps80Aviso{display:none !important;visibility:hidden !important;',
                      'width:0 !important;height:0 !important;margin:0 !important;padding:0 !important;border:0 !important;',
                      'box-shadow:none !important;opacity:0 !important}',
                      '}'
                    ].join('');
                    var s = document.createElement('style');
                    s.id = 'ps80Estilo';
                    s.setAttribute('data-ps80', '1');
                    s.appendChild(document.createTextNode(css));
                    (document.head || document.documentElement).appendChild(s);
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 2) levar a barra do administrador para dentro do Menu de Abas
                   * ---------------------------------------------------------------- */
                  function caixaMenu() {
                    return document.querySelector('#meu-menu-abas .tabs') ||
                           document.querySelector('details#meu-menu-abas .tabs') ||
                           null;
                  }
                
                  function mover() {
                    var b = document.getElementById('ps79Barra');
                    if (!b) { return; }
                    var cx = caixaMenu();
                    if (!cx) { return; }
                    if (b.parentNode === cx) { return; }
                    cx.insertBefore(b, cx.firstChild);
                  }
                
                  function vigiarBarra() {
                    mover();
                    window.__varreduraUnica(mover);
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 3) Agenda de Obras: espelhar no banco e mandar para a nuvem
                   * ---------------------------------------------------------------- */
                  var setOriginal = null;
                  var timerAgenda = null;
                
                  function banco() {
                    try { if (window.db && typeof window.db === 'object') { return window.db; } } catch (e) {}
                    return null;
                  }
                
                  function guardarNoBanco(texto) {
                    var d = banco();
                    if (!d) { return false; }
                    d[CAMPO_DB] = texto;
                    try {
                      if (typeof window.salvarLocalComoBackup === 'function') { window.salvarLocalComoBackup(); }
                    } catch (e) {}
                    try {
                      if (typeof window.sincronizarBancoNuvem === 'function') { window.sincronizarBancoNuvem(); }
                    } catch (e) {}
                    return true;
                  }
                
                  function espelharAgenda(texto) {
                    if (timerAgenda) { clearTimeout(timerAgenda); }
                    timerAgenda = setTimeout(function () {
                      var ok = guardarNoBanco(texto);
                      aviso(ok ? 'Agenda de Obras salva.' : 'Agenda salva neste navegador.', ok ? 'ok' : 'erro');
                    }, 900);
                  }
                
                  function envolverArmazenamento() {
                    try {
                      var P = window.Storage && window.Storage.prototype;
                      if (!P || P.__ps80) { return; }
                      P.__ps80 = true;
                      setOriginal = P.setItem;
                      P.setItem = function (chave, valor) {
                        var r = setOriginal.apply(this, arguments);
                        try {
                          if (String(chave) === K_AG) { espelharAgenda(String(valor)); }
                        } catch (e) {}
                        return r;
                      };
                    } catch (e) {}
                  }
                
                  function gravarDireto(chave, valor) {
                    try {
                      if (setOriginal) { setOriginal.call(window.localStorage, chave, valor); }
                      else { window.localStorage.setItem(chave, valor); }
                      return true;
                    } catch (e) { return false; }
                  }
                
                  function temEventos(texto) {
                    try {
                      var o = JSON.parse(texto);
                      return !!(o && o.eventos && o.eventos.length);
                    } catch (e) { return false; }
                  }
                
                  /* se o navegador foi limpo mas o banco/nuvem tem a agenda, traz de volta */
                  function recuperarAgenda() {
                    var d = banco();
                    if (!d) { return; }
                    var doBanco = d[CAMPO_DB];
                    if (typeof doBanco !== 'string' || !temEventos(doBanco)) { return; }
                    var local = null;
                    try { local = window.localStorage.getItem(K_AG); } catch (e) {}
                    if (local && temEventos(local)) { return; }
                    if (gravarDireto(K_AG, doBanco)) {
                      aviso('Agenda de Obras restaurada do backup.');
                      try {
                        if (typeof window.abrirAgendaObras === 'function' &&
                            document.querySelector('[data-agenda-obras], #agendaObrasPainel')) {
                          window.abrirAgendaObras();
                        }
                      } catch (e) {}
                    }
                  }
                
                  function vigiarAgenda() {
                    var voltas = 0;
                    var t = setInterval(function () {
                      voltas++;
                      if (banco()) { recuperarAgenda(); clearInterval(t); return; }
                      if (voltas > 60) { clearInterval(t); }
                    }, 1000);
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 4) ObraFlow EAP: confirmar que gravou
                   * ---------------------------------------------------------------- */
                  function envolverEAP() {
                    var OF = window.OF;
                    if (!OF || typeof OF.save !== 'function' || OF.__ps80) { return false; }
                    OF.__ps80 = true;
                    var original = OF.save;
                    OF.save = function () {
                      var r;
                      try {
                        r = original.apply(this, arguments);
                      } catch (e) {
                        aviso('Nao foi possivel salvar a EAP.', 'erro');
                        throw e;
                      }
                      try {
                        if (typeof window.salvarLocalComoBackup === 'function') { window.salvarLocalComoBackup(); }
                        if (typeof window.sincronizarBancoNuvem === 'function') { window.sincronizarBancoNuvem(); }
                      } catch (e2) {}
                      aviso('ObraFlow EAP salvo.');
                      return r;
                    };
                    return true;
                  }
                
                  function vigiarEAP() {
                    if (envolverEAP()) { return; }
                    var voltas = 0;
                    var t = setInterval(function () {
                      voltas++;
                      if (envolverEAP() || voltas > 90) { clearInterval(t); }
                    }, 1000);
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 5) partida
                   * ---------------------------------------------------------------- */
                  envolverArmazenamento();
                
                  function iniciar() {
                    estilo();
                    vigiarBarra();
                    vigiarAgenda();
                    vigiarEAP();
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                })();
            
