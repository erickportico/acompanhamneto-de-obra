#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.restaurar-bkp'

# Injeção limpa e sanitizada dos eventos das abas do Diário de Obra e Boletim de Inspeção
FIX_ABAS_SCRIPT = """
<!-- INI FIX_RESTAURAR_ABAS -->
<script>
(function() {
  'use strict';

  function registrarEvAba(seletorTexto, acao) {
    document.addEventListener('click', function(e) {
      var target = e.target;
      var texto = target ? (target.innerText || target.textContent || '') : '';
      if (texto.toLowerCase().indexOf(seletorTexto.toLowerCase()) !== -1) {
        try {
          acao();
        } catch(err) {
          console.error('Erro ao abrir aba ' + seletorTexto + ':', err);
        }
      }
    }, true);
  }

  // Mapeia cliques nas abas para chamar os métodos do sistema sem dependência de HTML corrompido
  registrarEvAba('Diário de Obra', function() {
    if (typeof window.p84AbrirDiario === 'function') {
      window.p84AbrirDiario();
    } else if (typeof window.abrirDiario === 'function') {
      window.abrirDiario();
    } else {
      var tab = document.getElementById('tab-diario') || document.getElementById('tab-p84');
      if (tab) tab.style.display = 'block';
    }
  });

  registrarEvAba('Boletim de Inspeção', function() {
    if (typeof window.p83AbrirBoletim === 'function') {
      window.p83AbrirBoletim();
    } else if (typeof window.abrirBoletim === 'function') {
      window.abrirBoletim();
    } else {
      var tab = document.getElementById('tab-boletim') || document.getElementById('tab-p83');
      if (tab) tab.style.display = 'block';
    }
  });

  registrarEvAba('Relatório FPDO', function() {
    var tab = document.getElementById('tab-fpdo') || document.getElementById('aba-fpdo');
    if (tab) tab.style.display = 'block';
  });

})();
</script>
<!-- FIM FIX_RESTAURAR_ABAS -->
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

    # Limpa as tags de comentário HTML quebradas (--> --> -->) do final do código
    html_limpo = re.sub(r'(-->\s*)+$', '', html, flags=re.MULTILINE)

    # Injeta a restauração dos eventos antes de </body>
    if '</body>' in html_limpo:
        novo_html = html_limpo.replace('</body>', FIX_ABAS_SCRIPT + '\n</body>')
    else:
        novo_html = html_limpo + FIX_ABAS_SCRIPT

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(novo_html)

    print("[OK] Limpeza e restauração das abas executada com sucesso!")

if __name__ == '__main__':
    main()