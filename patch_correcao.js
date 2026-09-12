(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  function ocultarCaixaDeCodigo() {
    // Procura por qualquer elemento que contenha trechos do código vazado
    const elementos = document.querySelectorAll('div, p, span, section, footer, td');

    elementos.forEach((el) => {
      if (
        el.innerText &&
        (el.innerText.includes('function exportar()') ||
         el.innerText.includes('janelaimpressao.document.close()') ||
         el.innerText.includes('window.P84AbrirDiario'))
      ) {
        // Sobe na árvore de elementos para encontrar a div pai container e esconder a caixa inteira
        let alvo = el;
        while (alvo.parentElement && alvo.parentElement !== document.body) {
          // Se o pai tiver classe ou estilo de caixa, pega ele, senão sobe até um nível alto
          if (alvo.offsetHeight > 50 || alvo.tagName === 'DIV') {
            alvo.style.display = 'none';
          }
          alvo = alvo.parentElement;
        }
        alvo.style.display = 'none';
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', ocultarCaixaDeCodigo);
  } else {
    ocultarCaixaDeCodigo();
  }

  const observer = new MutationObserver(() => {
    ocultarCaixaDeCodigo();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();