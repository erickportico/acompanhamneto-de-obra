/**
 * Anti-flicker: depois do primeiro paint estável, para a varredura
 * que redesenha o painel e esconde nós que são só setas.
 * Não altera render(), login, custos nem o miolo do index.
 */
(function () {
  'use strict';
  if (window.__patchAntiFlicker20260914) return;
  window.__patchAntiFlicker20260914 = true;

  var GUARDA = window.__varreduraUnica;
  var cortou = false;

  function soSeta(el) {
    if (!el || el.closest && (el.closest('input') || el.closest('textarea') || el.closest('select'))) return false;
    if (el.children && el.children.length) return false;
    var t = String(el.textContent || '').trim();
    return t.length > 0 && /^[→▸▾>\s]+$/.test(t);
  }

  function esconderSetas() {
    var nos = document.querySelectorAll('div,span,p,li,button,i');
    for (var i = 0; i < nos.length; i++) {
      if (soSeta(nos[i])) nos[i].style.setProperty('display', 'none', 'important');
    }
  }

  function cortarVarredura() {
    if (cortou) return;
    cortou = true;
    window.__varreduraUnica = function () {};
    console.log('[anti-flicker] varredura unica desligada');
  }

  function css() {
    if (document.getElementById('antiFlickerCss')) return;
    var s = document.createElement('style');
    s.id = 'antiFlickerCss';
    s.textContent =
      '#p137Faixa,.lixo-setas{display:none!important}' +
      '#p120Dica{pointer-events:none}' +
      '.or-item:empty{display:none!important}';
    document.head.appendChild(s);
  }

  css();
  esconderSetas();

  if (document.readyState === 'complete') {
    setTimeout(function () { esconderSetas(); cortarVarredura(); }, 3000);
  } else {
    window.addEventListener('load', function () {
      setTimeout(function () { esconderSetas(); cortarVarredura(); }, 3000);
    });
  }

  window.antiFlickerRestaurar = function () {
    if (typeof GUARDA === 'function') window.__varreduraUnica = GUARDA;
    cortou = false;
    console.log('[anti-flicker] varredura restaurada');
  };

  console.log('[anti-flicker] ativo. Restaurar: antiFlickerRestaurar()');
})();
