#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.sanitizar-bkp'

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: Arquivo {ARQUIVO} não encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Backup de segurança
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(html)

    # 1. Localiza a frase de vazamento do leitor de PDF
    termo_vazado = "ou importacao dinamica (v4.10.38) const pdfjs = window.pdfjsLib"
    
    if termo_vazado in html:
        # Encontra o inicio da sujeira e o encerramento do bloco mal formatado
        idx_inicio = html.find(termo_vazado)
        
        # Recua para encontrar se havia alguma tag antes
        idx_corte = html.rfind('<', 0, idx_inicio)
        if idx_corte == -1 or (idx_inicio - idx_corte) > 100:
            idx_corte = idx_inicio

        # Localiza o final da instrução corrompida do PARSING MULTI-ESTRATEGIA DO
        idx_fim = html.find("PARSING MULTI-ESTRATEGIA DO", idx_inicio)
        if idx_fim != -1:
            idx_fim = html.find('\n', idx_fim)
            if idx_fim == -1:
                idx_fim = len(html)
        else:
            idx_fim = idx_inicio + 500

        # Remove o trecho vazado que estava renderizando em tela
        html = html[:idx_corte] + "\n<!-- P118 PDF FIX SANITIZADO -->\n" + html[idx_fim:]
        print("[OK] Bloco de codigo cru do PDF.js removido da interface!")

    # 2. Garante que os scripts utilitarios no final do arquivo fiquem envelopados corretamente
    # Remove fechos soltos de tag que estejam soltos no final do arquivo
    html = re.sub(r'(<!--\s*-->\s*)+', '', html)
    html = re.sub(r'(-->\s*){2,}', '-->', html)

    # 3. Reescreve com as tags de fechamento corretas
    if '</body>' not in html:
        html += '\n</body>\n</html>'

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(html)

    print("[OK] Arquivo index.html sanitizado e estrutura DOM corrigida!")

if __name__ == '__main__':
    main()