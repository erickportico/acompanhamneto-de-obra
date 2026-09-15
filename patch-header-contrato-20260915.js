(function () {
  'use strict';
  if (window.__patchHeaderContrato20260915) return;
  window.__patchHeaderContrato20260915 = true;

  if (!document.getElementById('hdrContratoCss')) {
    var s = document.createElement('style');
    s.id = 'hdrContratoCss';
    s.textContent =
      'header{display:flex;flex-direction:column;gap:10px}' +
      '.header-title-container{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}' +
      '.header-badges-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px}' +
      '.header-badges-right .hdr-acoes{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}' +
      '.header-badges-right .contract-badge{min-width:180px}' +
      '.project-selector{display:flex;flex-wrap:wrap;align-items:center;gap:8px}';
    document.head.appendChild(s);
  }

  function montar() {
    var box = document.querySelector('.header-badges-right');
    if (!box) return;
    var acoes = document.getElementById('hdrAcoesNuvem');
    if (!acoes) {
      acoes = document.createElement('div');
      acoes.id = 'hdrAcoesNuvem';
      acoes.className = 'hdr-acoes';
      box.appendChild(acoes);
    }
    ['statusNuvem', 'btnThemeToggle'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n && n.parentNode !== acoes) acoes.appendChild(n);
    });
    document.querySelectorAll('.project-selector button').forEach(function (b) {
      var t = String(b.textContent || '');
      if (t.indexOf('Carregar Nuvem') >= 0 && b.parentNode !== acoes) acoes.appendChild(b);
    });
  }

  montar();
  setTimeout(montar, 800);
  console.log('[header-contrato] contrato a direita, botoes abaixo');
})();
