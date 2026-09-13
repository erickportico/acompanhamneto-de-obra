#!/usr/bin/env python3
import os
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.tooltip-safe-bkp'

HOOK_TOOLTIP = """
<!-- FIX SAFE TOOLTIP P120 -->
<style id="fix-p120-css">
  /* Garante que o tooltip nunca retenha o ponteiro do mouse */
  #p120Dica, .p120-tooltip-fixed {
    pointer-events: none !important;
    transition: opacity 0.15s ease-in-out;
  }
</style>
<script id="fix-p120-js">
(function() {
  'use strict';

  function ocultarDicaP120() {
    var el = document.getElementById('p120Dica');
    if (el) {
      el.style.display = 'none';
      el.style.opacity = '0';
    }
  }

  // Monitora a saida do mouse do container do grafico de rosca e evolucao
  document.addEventListener('mousemove', function(ev) {
    var target = ev.target;
    var el = document.getElementById('p120Dica');
    if (!el || el.style.display === 'none') return;

    // Se o mouse nao estiver diretamente sobre um canvas do P120, oculta
    var isCanvas = target && target.tagName === 'CANVAS' && (
      target.id === 'p120Rosca' || 
      target.id === 'p120Evol' || 
      target.id === 'p120Rank' ||
      (target.parentElement && target.parentElement.id && target.parentElement.id.indexOf('p120') !== -1)
    );

    if (!isCanvas) {
      ocultarDicaP120();
    }
  }, true);

  // Oculta ao rolar a tela ou trocar de aba
  window.addEventListener('scroll', ocultarDicaP120, true);
  document.addEventListener('click', function(ev) {
    if (ev.target && ev.target.tagName !== 'CANVAS') {
      ocultarDicaP120();
    }
  }, true);
})();
</script>
<!-- FIM FIX SAFE TOOLTIP P120 -->
"""

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: {ARQUIVO} nao encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Se ja foi inserido, remove a versao antiga para nao duplicar
    if 'FIX SAFE TOOLTIP P120' in html:
        import re
        html = re.sub(r'<!-- FIX SAFE TOOLTIP P120 -->.*?<!-- FIM FIX SAFE TOOLTIP P120 -->', '', html, flags=re.DOTALL)

    # Backup
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(html)

    # Injeta de forma totalmente isolada logo apos a abertura do <head>
    if '<head>' in html:
        novo_html = html.replace('<head>', '<head>\n' + HOOK_TOOLTIP)
    else:
        novo_html = HOOK_TOOLTIP + '\n' + html

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(novo_html)

    print("[OK] Patch de tooltip limpo injetado com sucesso no <head>!")

if __name__ == '__main__':
    main()