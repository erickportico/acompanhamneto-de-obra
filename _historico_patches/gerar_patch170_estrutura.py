#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PATCH 170 - Correcoes estruturais do index.html
==============================================
Este patch corrige APENAS problemas de estrutura/limpeza que NAO mexem na
logica de negocio (nao altera pagamento, ocultos, diario, etc.).

O que corrige:
  1) DOCTYPE sem o caractere '>' de fechamento (<!DOCTYPE html  ->  <!DOCTYPE html>).
     Sem o '>', o parser do navegador \"engole\" a tag <html lang=\"pt-BR\">.
  2) Biblioteca supabase-js carregada DUAS vezes (no <head> e de novo mais
     abaixo). Remove a 2a carga (duplicada), mantendo a do <head>.
  3) Scripts colocados FORA do <body>/<html>:
       - patch166 estava entre </body> e </html>
       - patch167 estava DEPOIS de </html>
     Move os fechamentos </body></html> para o final real do arquivo, de
     modo que TODOS os scripts fiquem dentro do documento.

Seguro e idempotente: rodar de novo nao causa dano (nada a fazer na 2a vez).
NAO entrega HTML pronto - apenas aplica alteracoes pontuais no SEU arquivo,
preservando tudo o que voce ja modificou.

Uso:
    python gerar_patch170_estrutura.py
(ou passe um caminho:  python gerar_patch170_estrutura.py caminho\\index.html)
"""

import re
import sys
import os
import datetime
import subprocess

FILE_PATH = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html'


def main():
    file_path = sys.argv[1] if len(sys.argv) > 1 else FILE_PATH
    print('Lendo:', file_path)

    # newline='' preserva EXATAMENTE as quebras de linha (mistura de \\n e \\r\\n)
    with open(file_path, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    original = content
    print('Tamanho original: {:,} caracteres'.format(len(content)))

    if 'PATCH170 aplicado' in content:
        print('\nPATCH170 ja foi aplicado neste arquivo. Nada a fazer.')
        return

    applied = 0

    # ------------------------------------------------------------------
    # FIX 1: DOCTYPE sem '>'
    # ------------------------------------------------------------------
    novo, n = re.subn(r'<!DOCTYPE html>?(\r?\n)', r'<!DOCTYPE html>\1',
                      content, count=1, flags=re.IGNORECASE)
    if n and novo != content:
        content = novo
        print('  OK  FIX 1 - DOCTYPE corrigido (>)')
        applied += 1
    else:
        print('  --  FIX 1 - DOCTYPE ja estava correto')

    # ------------------------------------------------------------------
    # FIX 2: supabase-js carregado duas vezes -> remove a 2a carga
    # ------------------------------------------------------------------
    pat_dup = (r'<!-- 1\. Carrega o SDK do Supabase PRIMEIRO -->\s*'
               r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/'
               r'supabase-js@2"></script>')
    repl_dup = ('<!-- SDK do Supabase ja carregado no <head> '
                '(duplicata removida pelo PATCH170) -->')
    novo, n = re.subn(pat_dup, repl_dup, content, count=1)
    if n:
        content = novo
        print('  OK  FIX 2 - carga duplicada do supabase-js removida')
        applied += 1
    else:
        print('  --  FIX 2 - nenhuma carga duplicada de supabase-js encontrada')

    # ------------------------------------------------------------------
    # FIX 3: scripts fora do <body>/<html> -> reposiciona fechamentos
    # ------------------------------------------------------------------
    moveu = False

    # 3a) remove o </body> que aparece ANTES do comentario PATCH166
    novo, n = re.subn(r'</body>(\s*<!-- PATCH166:)', r'\1', content, count=1)
    if n:
        content = novo
        moveu = True

    # 3b) remove o </html> que aparece entre PATCH164 e PATCH165
    novo, n = re.subn(
        r'(PATCH164 aplicado[^\n]*-->\s*)</html>(\s*<!-- PATCH165)',
        r'\1\2', content, count=1)
    if n:
        content = novo
        moveu = True

    # 3c) garante </body></html> no final REAL do arquivo (apenas se removidos acima)
    tail = content.rstrip()[-40:]
    if moveu and not re.search(r'</body>\s*</html>\s*$', content.rstrip()):
        content = content.rstrip() + '\r\n</body>\r\n</html>\r\n'

    if moveu:
        print('  OK  FIX 3 - scripts patch166/patch167 agora dentro do <body>')
        applied += 1
    else:
        print('  --  FIX 3 - estrutura ja estava correta')

    # ------------------------------------------------------------------
    if content == original:
        print('\nNada a fazer - arquivo ja estava corrigido. Nenhuma alteracao.')
        return

    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if 'PATCH170 aplicado' not in content:
        content = content.rstrip() + '\r\n<!-- PATCH170 aplicado em {} -->\r\n'.format(ts)

    delta = len(content) - len(original)
    print('\nCorrecoes aplicadas: {}'.format(applied))
    print('Delta: {:+,} caracteres'.format(delta))
    print('Novo tamanho: {:,} caracteres'.format(len(content)))

    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('\nOK Arquivo salvo:', file_path)

    # ------------------------------------------------------------------
    # GIT: add, commit, push
    # ------------------------------------------------------------------
    repo_dir = os.path.dirname(os.path.abspath(file_path))
    git_cmds = [
        ['git', 'add', file_path],
        ['git', 'commit', '-m',
         'Patch 170 - correcoes estruturais: DOCTYPE, supabase duplicado, scripts dentro do body'],
        ['git', 'push'],
    ]
    for cmd in git_cmds:
        label = ' '.join(cmd[:2]) + (' ' + cmd[2] if len(cmd) > 2 else '')
        print('  GIT {} ...'.format(label))
        try:
            r = subprocess.run(cmd, cwd=repo_dir, capture_output=True, text=True)
        except Exception as e:
            print('    ERRO ao executar git:', e)
            break
        if r.returncode != 0:
            print('    (git avisou):', (r.stderr or r.stdout).strip().split(chr(10))[0])
        else:
            msg = (r.stdout.strip() or r.stderr.strip() or 'ok').split(chr(10))[0]
            print('    OK:', msg)

    print('\nPatch 170 concluido.')


if __name__ == '__main__':
    main()
