
                /* === PATCH 60: OBRAFLOW LIGACOES CORRECAO (janela de dependencias) === */
                (function () {
                  "use strict";
                
                  if (window.OFDEPFIX && window.OFDEPFIX.__v60) { return; }
                
                  var F = window.OFDEPFIX = window.OFDEPFIX || {};
                  F.__v60 = true;
                
                  function el(id) { return document.getElementById(id); }
                
                  /* ------------------------------------------------------------------ *
                   * 1) so pode existir UMA janela de ligacoes na pagina
                   * ------------------------------------------------------------------ */
                  function tirarSobras() {
                    var todos = document.querySelectorAll('.of-dep-modal');
                    if (todos.length < 2) { return; }
                    for (var i = 0; i < todos.length - 1; i++) {
                      var x = todos[i];
                      if (x.parentNode) { x.parentNode.removeChild(x); }
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 2) fechar de verdade
                   * ------------------------------------------------------------------ */
                  function fechar() {
                    var todos = document.querySelectorAll('.of-dep-modal');
                    for (var i = 0; i < todos.length; i++) {
                      todos[i].classList.remove('of-on');
                      todos[i].setAttribute('aria-hidden', 'true');
                    }
                    document.body.classList.remove('of-dep-aberto');
                  }
                  F.fechar = fechar;
                
                  function estaAberta() {
                    var m = el('ofDepModal');
                    return !!(m && m.classList.contains('of-on'));
                  }
                  F.aberta = estaAberta;
                
                  /* ------------------------------------------------------------------ *
                   * 3) rede de seguranca nos cliques
                   *    Os botoes originais continuam com os handlers do Patch 56.
                   *    Aqui so garantimos que Fechar / Cancelar / fundo sempre fechem,
                   *    mesmo se algum handler tiver se perdido.
                   * ------------------------------------------------------------------ */
                  function ligarCliques(m) {
                    if (!m || m.__of60liga) { return; }
                    m.__of60liga = true;
                
                    m.addEventListener('click', function (e) {
                      var alvo = e.target;
                      if (alvo === m) { fechar(); return; }
                
                      var bt = null;
                      if (alvo && alvo.closest) { bt = alvo.closest('button'); }
                      else {
                        var p = alvo;
                        while (p && p !== m) {
                          if (p.tagName && p.tagName.toLowerCase() === 'button') { bt = p; break; }
                          p = p.parentNode;
                        }
                      }
                      if (!bt) { return; }
                      if (bt.id === 'ofDepFechar' || bt.id === 'ofDepCancelar') { fechar(); }
                    }, false);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 4) deixar a janela pronta: ultima do corpo da pagina e fechada
                   * ------------------------------------------------------------------ */
                  function arrumar() {
                    tirarSobras();
                    var m = el('ofDepModal');
                    if (!m) { return false; }
                    if (m.parentNode !== document.body || document.body.lastElementChild !== m) {
                      document.body.appendChild(m);
                    }
                    ligarCliques(m);
                    return true;
                  }
                  F.arrumar = arrumar;
                
                  /* ------------------------------------------------------------------ *
                   * 5) abrir sempre centralizada e por cima de tudo
                   * ------------------------------------------------------------------ */
                  function envolverAbrir() {
                    var D = window.OFDEP;
                    if (!D || typeof D.abrirLigacoes !== 'function') { return false; }
                    if (D.abrirLigacoes.__of60) { return true; }
                
                    var antigo = D.abrirLigacoes;
                    var novo = function (id) {
                      arrumar();
                      var r;
                      try { r = antigo.apply(this, arguments); }
                      catch (e) { console.warn(e); }
                      var m = el('ofDepModal');
                      if (m) {
                        document.body.appendChild(m);
                        m.classList.add('of-on');
                        m.setAttribute('aria-hidden', 'false');
                        document.body.classList.add('of-dep-aberto');
                        m.scrollTop = 0;
                        var cx = m.querySelector('.of-dep-box');
                        if (cx) { cx.scrollTop = 0; }
                      }
                      return r;
                    };
                    novo.__of60 = true;
                    D.abrirLigacoes = novo;
                    return true;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 6) tecla Esc fecha
                   * ------------------------------------------------------------------ */
                  function ligarEsc() {
                    if (F.__esc) { return; }
                    F.__esc = true;
                    document.addEventListener('keydown', function (e) {
                      var k = e.key || '';
                      if (k !== 'Escape' && k !== 'Esc' && e.keyCode !== 27) { return; }
                      if (!estaAberta()) { return; }
                      fechar();
                    }, false);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 7) partida
                   * ------------------------------------------------------------------ */
                  function iniciar() {
                    arrumar();
                    fechar();            /* nunca comeca aberta */
                    envolverAbrir();
                    ligarEsc();
                    F.__pronto = true;
                  }
                  F.iniciar = iniciar;
                
                  function pronto() {
                    return !!(window.OFDEP && window.OFDEP.__v56 && typeof window.OFDEP.abrirLigacoes === 'function');
                  }
                
                  function esperar(tentativa) {
                    if (pronto()) { iniciar(); return; }
                    if (tentativa > 60) {
                      /* mesmo sem o Patch 56 pronto, se a janela existir deixamos fechada */
                      if (el('ofDepModal')) { arrumar(); fechar(); ligarEsc(); }
                      return;
                    }
                    setTimeout(function () { esperar(tentativa + 1); }, 200);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () {
                      setTimeout(function () { esperar(0); }, 1500);
                    });
                  } else {
                    setTimeout(function () { esperar(0); }, 1500);
                  }
                })();
            
