#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.tooltip-bkp'

PATCH_JS = """
<!-- PATCH125: Correção Definitiva de Tooltip Preso (#p120Dica) -->
<style>
  #p120Dica {
    pointer-events: none !important; /* Impede que o tooltip bloqueie os eventos do mouse no canvas */
    z-index: 99999 !important;
  }
</style>
<script>
(function() {
  'use strict';

  function esconderTooltip() {
    var d = document.getElementById('p120Dica');
    if (d) {
      d.style.display = 'none';
      d.style.opacity = '0';
      d.style.visibility = 'hidden';
    }
  }

  // Intercepta a função dica() global se existir
  function patchDicaFunction() {
    if (typeof window.dica === 'function' && !window.dica._patched) {
      var origDica = window.dica;
      window.dica = function(texto, ev) {
        var d = document.getElementById('p120Dica');
        if (!texto) {
          esconderTooltip();
          return;
        }
        origDica.apply(this, arguments);
        if (d) {
          d.style.pointerEvents = 'none';
          clearTimeout(d._autoHide);
          d._autoHide = setTimeout(esconderTooltip, 3000); // Esconde após 3s se estagnado
        }
      };
      window.dica._patched = true;
    }
  }

  function initFix() {
    patchDicaFunction();

    // Eventos globais para força o fechamento
    window.addEventListener('scroll', esconderTooltip, true);
    window.addEventListener('resize', esconderTooltip, true);
    
    document.addEventListener('mouseleave', esconderTooltip, true);
    document.addEventListener('mousedown', function(ev) {
      var t = ev.target;
      var isCanvas = t && (t.tagName === 'CANVAS' || (t.id && t.id.indexOf('p120') === 0));
      if (!isCanvas) esconderTooltip();
    }, true);

    // Esconde se a aba ou elemento ficar oculto
    if (window.MutationObserver) {
      var observer = new MutationObserver(function() {
        var tab = document.getElementById('tab-custo');
        if (tab && (tab.style.display === 'none' || tab.classList.contains('hidden') || !tab.offsetParent)) {
          esconderTooltip();
        }
      });
      observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFix);
  } else {
    initFix();
  }
})();
</script>
<!-- FIM PATCH125 -->
"""

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: Arquivo {ARQUIVO} não encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        conteudo = f.read()

    if 'PATCH125' in conteudo:
        print('[AVISO] O Patch 125 já foi aplicado anteriormente neste arquivo.')
        sys.exit(0)

    # Backup
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(conteudo)

    # Injeta antes de </body> ou </html>
    if '</body>' in conteudo:
        novo_conteudo = re.sub(r'(</body>)', PATCH_JS + r'\n\1', conteudo, flags=re.IGNORECASE)
    else:
        novo_conteudo = conteudo + PATCH_JS

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(novo_conteudo)

    print('[OK] Patch aplicado com sucesso no index.html!')
    print(f'[OK] Backup salvo em: {BKP}')

if __name__ == '__main__':
    main()