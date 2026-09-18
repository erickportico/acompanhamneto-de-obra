(function () {
  'use strict';
  if (window.__patchPrintIsolamento20260915) return;
  window.__patchPrintIsolamento20260915 = true;

  if (!document.getElementById('printIsoCss')) {
    var st = document.createElement('style');
    st.id = 'printIsoCss';
    st.textContent =
      '@media print{' +
      'header,.project-selector,.tabs,nav,#orLista,#orMenu,#meu-menu-abas,' +
      '#statusNuvem,.pmenu-rail,#fpdoLivreBar{display:none!important}' +
      'body.print-so-pgto #tab-itens,body.print-so-pgto #tab-graficos,' +
      'body.print-so-pgto #tab-recebimento,body.print-so-pgto #tab-cronograma,' +
      'body.print-so-pgto [id*="obraflow" i],body.print-so-pgto [id*="eap" i],' +
      'body.print-so-pgto [id*="gantt" i]{display:none!important}' +
      'body.print-so-plano #tab-pagamento,body.print-so-plano #tab-itens,' +
      'body.print-so-plano #tab-graficos,body.print-so-plano #tab-recebimento{display:none!important}' +
      '}';
    document.head.appendChild(st);
  }

  function limparSetas() {
    document.querySelectorAll('body *').forEach(function (n) {
      if (n.children && n.children.length) return;
      var t = String(n.textContent || '').replace(/\s/g, '');
      if (/^(→)+$/.test(t) || t === '\\n' || /^(\\n)+$/.test(t)) {
        n.setAttribute('data-print-hide', '1');
        n.style.setProperty('display', 'none', 'important');
      }
    });
  }

  var orig = window.print.bind(window);
  window.print = function () {
    document.body.classList.remove('print-so-pgto', 'print-so-plano');
    var pg = document.getElementById('tab-pagamento');
    var visPg = pg && pg.offsetParent !== null && pg.style.display !== 'none';
    if (visPg) document.body.classList.add('print-so-pgto');
    else document.body.classList.add('print-so-plano');
    limparSetas();
    orig();
    setTimeout(function () {
      document.body.classList.remove('print-so-pgto', 'print-so-plano');
    }, 800);
  };

  console.log('[print-iso] impressao isolada pagamento vs plano');
})();
