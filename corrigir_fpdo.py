#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.fpdo-bkp'

SCRIPT_FPDO = """
<!-- INI FIX_ABA_FPDO -->
<script>
(function() {
  'use strict';

  function forcarAberturaFPDO() {
    // Intercepta cliques no item de menu "Relatório FPDO"
    document.addEventListener('click', function(e) {
      var target = e.target;
      var texto = target ? (target.innerText || target.textContent || '') : '';
      
      if (texto.indexOf('Relatório FPDO') !== -1 || texto.indexOf('FPDO') !== -1) {
        // Esconde todas as outras abas ativas
        var abas = document.querySelectorAll('[id^="tab-"], [class*="tab-content"], .aba-conteudo');
        abas.forEach(function(aba) {
          aba.style.display = 'none';
        });

        // Procura o container do FPDO e exibe
        var tabFPDO = document.getElementById('tab-fpdo') || 
                      document.getElementById('aba-fpdo') || 
                      document.querySelector('[data-tab="fpdo"]');

        if (tabFPDO) {
          tabFPDO.style.display = 'block';
          tabFPDO.classList.remove('hidden');
        } else {
          console.warn('Container da aba FPDO não encontrado no DOM.');
        }
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forcarAberturaFPDO);
  } else {
    forcarAberturaFPDO();
  }
})();
</script>
<!-- FIM FIX_ABA_FPDO -->
"""

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: {ARQUIVO} não encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Backup
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(html)

    # Injeta a correção com segurança no final do arquivo
    if '</body>' in html:
        novo_html = html.replace('</body>', SCRIPT_FPDO + '\n</body>')
    else:
        novo_html = html + SCRIPT_FPDO

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(novo_html)

    print("[OK] Correção da aba Relatório FPDO aplicada com sucesso!")

if __name__ == '__main__':
    main()