#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.duplicado-bkp'

FIX_DUPLICACAO = """
<!-- INI FIX_PAINEL_DUPLICADO -->
<style id="p125-painel-fix">
  /* Esconde qualquer tooltip/card clonado que tenha ficado fixado no topo ou com altura/posicao errada */
  body > div[style*="position: absolute"], 
  body > div[style*="position: fixed"] {
    /* Se o elemento nao for o modal principal ou overlay valido, nao deixa travar no topo */
    max-width: 100vw;
  }
  
  /* Remove a barra escura flutuante caso ela tenha sido injetada fora do container correto */
  .p120-tooltip-fixed, #p120Dica, [id*="dicaFlutuante"] {
    display: none !important;
  }
</style>

<script>
(function() {
  'use strict';

  function limparElementosOrfaos() {
    // Procura elementos div escuros flutuantes injetados diretamente no body que cobrem a tela
    var divs = document.querySelectorAll('body > div');
    divs.forEach(function(el) {
      // Se tiver background escuro e estiver flutuando sobre os cards
      var style = window.getComputedStyle(el);
      if ((style.position === 'absolute' || style.position === 'fixed') && style.zIndex > 10) {
        if (el.innerText.indexOf('Sem colaborador') !== -1 || el.innerText.indexOf('TOTAL NO FILTRO') !== -1) {
          el.remove(); // Remove o clone fantasma da tela
        }
      }
    });
  }

  // Intercepta e limpa antes de qualquer novo render
  var interval = setInterval(limparElementosOrfaos, 500);

  // Limpa ao trocar de aba ou rolar
  window.addEventListener('scroll', limparElementosOrfaos, true);
  document.addEventListener('click', function() {
    setTimeout(limparElementosOrfaos, 100);
  }, true);
})();
</script>
<!-- FIM FIX_PAINEL_DUPLICADO -->
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

    # Injeta antes de </body>
    if '</body>' in html:
        novo_html = html.replace('</body>', FIX_DUPLICACAO + '\n</body>')
    else:
        novo_html = html + FIX_DUPLICACAO

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(novo_html)

    print("[OK] Script de remocao de elementos duplicados aplicado!")

if __name__ == '__main__':
    main()