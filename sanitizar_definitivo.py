#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.sanitizar-definitivo-bkp'

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: Arquivo {ARQUIVO} não encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Backup de segurança
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(html)

    # Expressão regular para capturar o bloco cru do PDF.js vazado (desde "ou importacao" até "PARSING MULTI-ESTRATEGIA DO")
    padrao_vazamento = re.compile(
        r'ou\s+importacao\s+dinamica.*?PARSING\s+MULTI-ESTRATEGIA\s+DO[^\n]*', 
        re.DOTALL | re.IGNORECASE
    )

    if padrao_vazamento.search(html):
        html = padrao_vazamento.sub('<!-- P118 PDF JS REMOVIDO DA INTERFACE -->', html)
        print("[OK] Texto cru de código vazado foi encontrado e removido com sucesso!")
    else:
        print("[AVISO] Padrão exato do vazamento não encontrado. Aplicando limpeza de tags soltas...")

    # Limpa possíveis fechos corrompidos e comentários do final
    html = re.sub(r'(-->\s*){2,}', '-->', html)
    
    # Garante encerramento estruturado
    if '</body>' not in html:
        html += '\n</body>\n</html>'

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(html)

    print("[OK] Arquivo index.html atualizado e sanitizado.")

if __name__ == '__main__':
    main()