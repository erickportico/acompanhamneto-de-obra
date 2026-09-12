
                /* === PATCH 50: barra lateral de abas que abre para o lado (funcionamento) === */
                (function () {
                  "use strict";
                
                  var ABERTA = 'p50-aberta';
                  var FECHADA = 'p50-fechada';
                  var ligado = false;
                  var timerFecha = null;
                
                  function menu() { return document.getElementById('meu-menu-abas'); }
                
                  /* diz se a barra deve estar aberta agora */
                  function deveAbrir(m) {
                    if (m.hasAttribute('open')) { return true; }
                    if (m.getAttribute('data-p50-hover') === '1') { return true; }
                    try {
                      if (m.matches(':hover')) { return true; }
                      if (m.querySelector(':focus')) { return true; }
                    } catch (e) { /* navegador antigo: segue sem isso */ }
                    return false;
                  }
                
                  function pintar() {
                    var m = menu();
                    if (!m || !m.classList.contains('pmenu-rail')) { return; }
                    var abrir = deveAbrir(m);
                    m.classList.toggle(ABERTA, abrir);
                    m.classList.toggle(FECHADA, !abrir);
                    m.setAttribute('aria-expanded', abrir ? 'true' : 'false');
                    if (document.body) { document.body.classList.add('p50-com-rail'); }
                  }
                
                  function ligar() {
                    var m = menu();
                    if (!m || !m.classList.contains('pmenu-rail') || ligado) { return !!ligado; }
                    ligado = true;
                
                    m.addEventListener('mouseenter', function () {
                      if (timerFecha) { clearTimeout(timerFecha); timerFecha = null; }
                      m.setAttribute('data-p50-hover', '1');
                      pintar();
                    });
                
                    m.addEventListener('mouseleave', function () {
                      if (timerFecha) { clearTimeout(timerFecha); }
                      /* pequena espera: nao fecha na cara do usuario ao passar rapido */
                      timerFecha = setTimeout(function () {
                        m.removeAttribute('data-p50-hover');
                        pintar();
                      }, 160);
                    });
                
                    m.addEventListener('focusin', pintar);
                    m.addEventListener('focusout', function () { setTimeout(pintar, 0); });
                    m.addEventListener('toggle', pintar);
                
                    /* ESC fecha a barra travada */
                    document.addEventListener('keydown', function (ev) {
                      if (ev.key !== 'Escape') { return; }
                      m.removeAttribute('open');
                      m.removeAttribute('data-p50-hover');
                      pintar();
                      setTimeout(pintar, 0);
                    });
                
                    /* se outra parte do painel abrir/fechar o menu, a barra acompanha */
                    try {
                      if (window.MutationObserver) {
                        new window.MutationObserver(function () { pintar(); })
                          .observe(m, { attributes: true, attributeFilter: ['open'] });
                      }
                    } catch (e) { /* navegador antigo: segue sem isso */ }
                
                    /* clicar fora fecha a barra travada */
                    document.addEventListener('click', function (ev) {
                      if (!m.hasAttribute('open')) { return; }
                      if (ev.target === m || m.contains(ev.target)) { return; }
                      m.removeAttribute('open');
                      m.removeAttribute('data-p50-hover');
                      pintar();
                    }, true);
                
                    /* clicar numa aba: solta a barra travada e volta ao formato icones */
                    var lst = m.querySelector('.tabs');
                    if (lst) {
                      lst.addEventListener('click', function (ev) {
                        var alvo = ev.target;
                        while (alvo && alvo !== lst && !(alvo.classList && alvo.classList.contains('tab-btn'))) {
                          alvo = alvo.parentNode;
                        }
                        if (!alvo || alvo === lst) { return; }
                        setTimeout(function () {
                          m.removeAttribute('open');
                          m.removeAttribute('data-p50-hover');
                          pintar();
                        }, 120);
                      });
                    }
                
                    pintar();
                    return true;
                  }
                
                  function iniciar() {
                    if (ligar()) { return; }
                    var n = 0;
                    var t = setInterval(function () {
                      n++;
                      if (ligar() || n > 80) { clearInterval(t); }
                    }, 250);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                
                  window.addEventListener('resize', pintar);
                  setTimeout(pintar, 1500);
                  setTimeout(pintar, 3500);
                })();
            
