(function () {
  'use strict';
  if (window.__patchPgtoSlim20260915e) return;
  window.__patchPgtoSlim20260915e = true;

  var old = document.getElementById('pgtoSlimCss');
  if (old) old.remove();
  var s = document.createElement('style');
  s.id = 'pgtoSlimCss';
  s.textContent =
    '#tab-pagamento .totais-item{display:flex!important;justify-content:space-between!important;' +
    'align-items:center!important;gap:8px!important;width:100%!important;box-sizing:border-box}' +
    '#tab-pagamento .totais-item span:first-child{text-align:left;flex:1}' +
    '#tab-pagamento .totais-value{text-align:right!important;white-space:nowrap!important;flex:0 0 auto}';
  document.head.appendChild(s);
  console.log('[pgto-slim] totais label esquerda / valor direita numa linha');
})();
