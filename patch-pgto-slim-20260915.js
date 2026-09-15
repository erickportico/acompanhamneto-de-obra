(function () {
  'use strict';
  if (window.__patchPgtoSlim20260915b) return;
  window.__patchPgtoSlim20260915 = true;
  window.__patchPgtoSlim20260915b = true;

  var s = document.createElement('style');
  s.id = 'pgtoSlimCss';
  s.textContent =
    '#tab-pagamento .lanc-form-grid,' +
    '#tab-pagamento .lanc-task-fields{align-items:end}' +
    '#tab-pagamento button[onclick*="adicionar"],' +
    '#tab-pagamento button.btn-add-tarefa,' +
    '#tab-pagamento .btn-add-lanc,' +
    '#tab-pagamento button.success{' +
    'height:38px!important;min-height:38px!important;max-height:38px!important;' +
    'width:auto!important;min-width:180px!important;padding:0 16px!important;' +
    'line-height:38px!important;align-self:end!important;border-radius:8px!important;' +
    'display:inline-flex!important;align-items:center!important;justify-content:center!important}' +
    '#tab-pagamento input[type="number"],#tab-pagamento .valor-pago-input,' +
    '#tab-pagamento td input{' +
    'height:32px!important;min-height:32px!important;text-align:right!important;' +
    'padding:0 8px!important;box-sizing:border-box!important;margin:0 auto!important}' +
    '#tab-pagamento td:last-child, #tab-pagamento td.col-pago{text-align:right!important;vertical-align:middle!important}' +
    '#tab-pagamento .totais, #tab-pagamento [class*="totais"] span, #tab-pagamento [class*="totais"] div{white-space:nowrap}#tab-pagamento [class*="custo"],#tab-pagamento [class*="Custo"]{display:flex!important;justify-content:space-between!important;align-items:center!important}#tab-pagamento .pgto-setas, #tab-pagamento [data-print-hide]{display:none!important}';
  document.head.appendChild(s);

  function acharBotao() {
    var root = document.getElementById('tab-pagamento');
    if (!root) return;
    var btns = root.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      if (/Adicionar Tarefa/i.test(btns[i].textContent || '')) {
        btns[i].classList.add('btn-add-lanc');
        var linha = btns[i].closest('div');
        if (linha) linha.style.alignItems = 'end';
      }
    }
  }
  acharBotao();
  setTimeout(acharBotao, 800);
  console.log('[pgto-slim] botao e valor pago alinhados');
})();
