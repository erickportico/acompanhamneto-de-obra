(function () {
  'use strict';

  function limparCodigoVazado() {
    const elementos = document.querySelectorAll('div, p, span, tooltip');

    elementos.forEach((el) => {
      if (
        el.innerText &&
        (el.innerText.includes('function exportar()') ||
         el.innerText.includes('janelaimpressao.document.close()'))
      ) {
        el.style.display = 'none';
        console.log('[PATCH] Elemento com código vazado foi ocultado.');
      }
    });
  }

  window.addEventListener('DOMContentLoaded', limparCodigoVazado);

  const observer = new MutationObserver(() => {
    limparCodigoVazado();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();