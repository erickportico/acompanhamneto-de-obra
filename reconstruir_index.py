#!/usr/bin/env python3
import os
import re
import sys

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
BKP = ARQUIVO + '.reconstruir-bkp'

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: {ARQUIVO} não encontrado.')
        sys.exit(1)

    with open(ARQUIVO, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Backup de segurança
    with open(BKP, 'w', encoding='utf-8') as f:
        f.write(html)

    # 1. Procura onde começa o código JS cru (ex: colab.valorPagoManual ou janelaImpressao ou renderPagamento)
    # Procuramos o primeiro indicador claro de JS solto no corpo da pagina
    pos_js = -1
    indicadores = [
        "colab.valorPagoManual",
        "janelaImpressao.document.close()",
        "function renderPagamento()",
        "ou importacao dinamica (v4.10.38)"
    ]

    for ind in indicadores:
        p = html.find(ind)
        if p != -1 and (pos_js == -1 or p < pos_js):
            pos_js = p

    if pos_js != -1:
        # Recua até o início da linha ou tag anterior
        corte = html.rfind('<', 0, pos_js)
        if corte == -1:
            corte = pos_js

        parte_html = html[:corte].strip()
        parte_js = html[corte:].strip()

        # Se a parte_html não fechou a tag body/html, tratamos isso
        parte_html = re.sub(r'</body>.*', '', parte_html, flags=re.DOTALL)
        parte_html = re.sub(r'</html>.*', '', parte_html, flags=re.DOTALL)

        # Envelopa o JS cru dentro de uma tag <script> válida
        # Remove marcadores corrompidos no final do JS
        parte_js = re.sub(r'(-->\s*)+$', '', parte_js)
        
        novo_conteudo = f"{parte_html}\n\n<script>\n/* RECONSTRUCAO DE JS EMBUTIDO */\ntry {{\n{parte_js}\n}} catch(e) {{\n  console.error('Erro no script reconstruido:', e);\n}}\n</script>\n</body>\n</html>"

        with open(ARQUIVO, 'w', encoding='utf-8') as f:
            f.write(novo_conteudo)

        print("[OK] O código JS solto foi encapsulado com sucesso em uma tag <script>!")
    else:
        print("[AVISO] Nenhum vazamento grave detectado pela busca automática.")

if __name__ == '__main__':
    main()