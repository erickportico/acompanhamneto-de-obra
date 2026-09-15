(function () {
  'use strict';
  if (window.__patchPgtoSlim20260915d) return;
  window.__patchPgtoSlim20260915 = true;
  window.__patchPgtoSlim20260915d = true;

  var old = document.getElementById('pgtoSlimCss');
  if (old) old.remove();
  var s = document.createElement('style');
  s.id = 'pgtoSlimCss';
  s.textContent =
    '#tab-pagamento .totais-item{display:flex!important;justify-content:flex-start!important;' +
    'align-items:baseline!important;gap:12px!important;text-align:left!important}' +
    '#tab-pagamento .totais-item span:first-child{min-width:148px;text-align:left}' +
    '#tab-pagamento .totais-value{text-align:left!important;margin-left:0!important;white-space:nowrap!important}' +
    '#tab-pagamento button.btn-add-lanc,#tab-pagamento button.success{' +
    'height:38px!important;min-height:38px!important;padding:0 16px!important;' +
    'line-height:38px!important;border-radius:8px!important}';
  document.head.appendChild(s);
  console.log('[pgto-slim] totais alinhados a esquerda');
})();
