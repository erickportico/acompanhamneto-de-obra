(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1. Injeta CSS para esconder o container especifico imediatamente via seletores
  const style = document.createElement('style');
  style.innerHTML = `
    /* Oculta divs no rodape que contenham textos gigantes de script */
    div[style*="font-family: monospace"],
    div:has(> script),
    .code-dump-container {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // 2. Limpeza agressiva via JS removendo o no do DOM (nao apenas display:none)
  function expurgarCodigoVazado() {
    // Busca todos os nós de texto da página
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    const nosParaRemover = [];

    while ((node = walker.nextNode())) {
      if (
        node.nodeValue &&
        (node.nodeValue.includes('function exportar()') ||
         node.nodeValue.includes('janelaimpressao.document.close()') ||
         node.nodeValue.includes('window.P84AbrirDiario'))
      ) {
        // Acha o container div principal mais alto antes do body
        let el = node.parentElement;
        while (el && el.parentElement && el.parentElement !== document.body) {
          el = el.parentElement;
        }
        if (el && el !== document.body) {
          nosParaRemover.push(el);
        }
      }
    }

    // Remove do DOM para garantir que nao ocupe espaco nem renderize
    nosParaRemover.forEach((el) => {
      try {
        el.remove();
        console.log('[PATCH] Elemento vazado removido com sucesso do DOM.');
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', expurgarCodigoVazado);
  } else {
    expurgarCodigoVazado();
  }

  const observer = new MutationObserver(() => {
    expurgarCodigoVazado();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();