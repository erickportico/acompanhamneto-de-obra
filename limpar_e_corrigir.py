#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.limpeza-bkp'

FIX_DEFINITIVO = """
<!-- INI PATCH125_ULTIMATE -->
<style id="p125-style-fix">
  /* Desativa cliques/mouse over em QUALQUER tooltip da tela para nao travar o mouse no canvas */
  div[id*="dica"], div[id*="Dica"], div[class*="tooltip"], div[class*="dica"], #p120Dica {
    pointer-events: none !important;
    z-index: 999999 !important;
  }
</style>
<script id="p125-script-fix">
(function() {
  'use strict';

  function fecharTodosTooltips() {
    // Busca por ID ou Classe comum de tooltip do projeto
    var elementos = document.querySelectorAll('div[id*="dica"], div[id*="Dica"], div[class*="tooltip"], div[class*="dica"], #p120Dica');
    elementos.forEach(function(el) {
      el.style.display = 'none';
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
    });
  }

  // Intercepta a funcao dica global se ela existir
  var _tentativas = 0;
  var timerHook = setInterval(function() {
    _tentativas++;
    if (typeof window.dica === 'function') {
      if (!window.dica._hooked) {
        var origDica = window.dica;
        window.dica = function(texto, ev) {
          if (!texto) {
            fecharTodosTooltips();
            return;
          }
          origDica.apply(this, arguments);
        };
        window.dica._hooked = true;
      }
      clearInterval(timerHook);
    }
    if (_tentativas > 20) clearInterval(timerHook);
  }, 200);

  // Forca o fechamento em interacoes do usuario
  window.addEventListener('scroll', fecharTodosTooltips, true);
  window.addEventListener('resize', fecharTodosTooltips, true);
  
  document.addEventListener('mouseover', function(e) {
    // Se o mouse NAO estiver em cima de um canvas, esconde o tooltip
    if (e.target && e.target.tagName !== 'CANVAS') {
      fecharTodosTooltips();
    }
  }, true);

  document.addEventListener('mouseleave', fecharTodosTooltips, true);
})();
</script>
<!-- FIM PATCH125_ULTIMATE -->
"""

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: {ARQUIVO} nao encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Backup
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(html)

    # 1. Remove qualquer variacao de PATCH125 anterior para evitar codigo duplicado
    html = re.sub(r'<!-- INI PATCH125 -->.*?<!-- FIM PATCH125 -->', '', html, flags=re.DOTALL)
    html = re.sub(r'<!-- INI PATCH125_ULTIMATE -->.*?<!-- FIM PATCH125_ULTIMATE -->', '', html, flags=re.DOTALL)
    html = re.sub(r'/\* --- PATCH125: protecao contra tooltip preso --- \*/.*?}\)\(\);', '', html, flags=re.DOTALL)

    # 2. Injeta o fix limpo antes do fechamento do body (ou no final do arquivo)
    if '</body>' in html:
        novo_html = html.replace('</body>', FIX_DEFINITIVO + '\n</body>')
    else:
        novo_html = html + FIX_DEFINITIVO

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(novo_html)

    print("[OK] Limpeza de patches antigos realizada!")
    print("[OK] Novo Patch Ultimate aplicado com sucesso!")

if __name__ == '__main__':
    main()