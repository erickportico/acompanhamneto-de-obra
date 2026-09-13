#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.vazamento-bkp'

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: {ARQUIVO} nao encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Backup de seguranca
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(html)

    # 1. Encontra a primeira ocorrencia do vazamento de JS (onde comeca o texto cru do diario/boletim no final)
    pos = html.find("janelaImpressao.document.close();")
    if pos != -1:
        # Volta um pouco para pegar o inicio da sujeira vazada
        corte = html.rfind('<', 0, pos)
        if corte != -1 and (pos - corte) < 200:
            html_limpo = html[:corte]
        else:
            html_limpo = html[:pos]
    else:
        html_limpo = html

    # 2. Limpa tags mal fechadas ou comentarios soltos no final
    html_limpo = re.sub(r'(-->\s*)+$', '', html_limpo)
    html_limpo = re.sub(r'(\}\)\(\);\s*)+$', '', html_limpo)

    # 3. Garante o fechamento correto do HTML
    if '</body>' not in html_limpo:
        html_limpo += '\n</body>\n</html>'
    elif '</html>' not in html_limpo:
        html_limpo += '\n</html>'

    with open(ARQUIVO, 'w', encoding='utf-8') as f:
        f.write(html_limpo)

    print("[OK] O código vazado na tela foi removido com sucesso!")
    print("[OK] Estrutura HTML/JS restaurada.")

if __name__ == '__main__':
    main()