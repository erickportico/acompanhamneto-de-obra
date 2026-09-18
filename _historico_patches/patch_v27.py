#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PATCH V27 — Corrige 2 bugs críticos da aba Administração:
  1) PATCH103: ABAS array não inclui {id:'admin',nome:'Administracao'}
     → podeVer('admin') retorna false → envolverTroca bloqueia a aba
  2) HTML do #tab-admin: sequências de escape Python (\U0001f527, \u00e7, etc.)
     foram gravadas como texto literal — renderizam como "\U0001f527" em vez
     de 🔧, ç, ã, etc. Substituir por caracteres UTF-8 reais.

Uso:  python patch_v27.py
Arquivo alvo: index.html (mesma pasta do script, ou passe o caminho como argumento)
Modo: leitura/escrita binária para preservar codificação
"""

import os, sys, re

ARQ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')

def main():
    if not os.path.isfile(ARQ):
        print(f'ERRO: arquivo não encontrado: {ARQ}')
        sys.exit(1)

    with open(ARQ, 'rb') as f:
        raw = f.read()

    txt = raw.decode('utf-8')
    original = txt
    mudancas = 0

    # ==================================================================
    # CORREÇÃO 1 — Adicionar 'admin' ao ABAS array do PATCH103
    # ==================================================================
    # O array ABAS do PATCH103 termina com:
    #   { id: 'fpdo', nome: 'Relatório FPDO' }
    # e falta a entrada admin. Vamos inserir logo depois do fpdo.
    #
    # Trecho exato no arquivo (linha ~54614):
    #   { id: 'fpdo',       nome: 'Relatorio FPDO' }
    #   ];
    #
    # Precisamos trocar para:
    #   { id: 'fpdo',       nome: 'Relatorio FPDO' },
    #   { id: 'admin',      nome: 'Administracao' }
    #   ];

    alvo1 = "{ id: 'fpdo',       nome: 'Relatorio FPDO' }"
    novo1  = "{ id: 'fpdo',       nome: 'Relatorio FPDO' },\n            { id: 'admin',      nome: 'Administracao' }"

    # Verificação de segurança: o fpdo SEM vírgula (fechando o array)
    if alvo1 in txt:
        txt = txt.replace(alvo1, novo1, 1)
        mudancas += 1
        print(f'[OK] PATCH103 ABAS: entrada admin adicionada após fpdo')
    else:
        # Talvez já tenha vírgula — verificar se já foi corrigido
        if "{ id: 'fpdo',       nome: 'Relatorio FPDO' }," in txt and "{ id: 'admin',      nome: 'Administracao' }" in txt:
            print(f'[SKIP] PATCH103 ABAS: admin já existe no array')
        else:
            # Fallback: buscar o padrão com regex (pode haver variação de espaços)
            pad = r"(\{\s*id\s*:\s*'fpdo'\s*,\s*nome\s*:\s*'Relatorio FPDO'\s*\})\s*\n(\s*\];)"
            repl = r"\1,\n            { id: 'admin',      nome: 'Administracao' }\n\2"
            m = re.search(pad, txt)
            if m:
                txt = re.sub(pad, repl, txt, count=1)
                mudancas += 1
                print(f'[OK] PATCH103 ABAS: entrada admin adicionada (regex fallback)')
            else:
                print(f'[ERRO] Não encontrei o ABAS array do PATCH103. O patch pode falhar.')

    # ==================================================================
    # CORREÇÃO 2 — Unicode escapes no HTML #tab-admin → UTF-8 real
    # ==================================================================
    # O Python gravou \U0001f527, \u00e7, etc. como literal text no HTML.
    # O navegador mostra a string literal em vez do caractere real.
    # Precisamos substituir TODOS esses escapes no div #tab-admin
    # por caracteres UTF-8 reais (o arquivo é UTF-8).
    #
    # Mapeamento completo dos escapes encontrados no #tab-admin:

    mapa_unicode = {
        # Emoji (\U0001fXXXX — Python long escape, inválido em HTML)
        r'\U0001f527': '🔧',   # wrench
        r'\U0001f465': '👥',   # users
        r'\U0001f512': '🔒',   # lock
        r'\U0001f504': '🔄',   # refresh
        r'\U0001f4e5': '📥',   # inbox tray
        r'\U0001f4be': '💾',   # floppy
        r'\U0001f513': '🔓',   # unlock
        r'\U0001f4a3': '💣',   # bomb

        # BMP symbols (\uXXXX — válido em JS mas NÃO em HTML)
        r'\u2795': '➕',   # heavy plus
        r'\u2699': '⚙',    # gear
        r'\ufe0f': '️',     # variation selector-16
        r'\u2705': '✅',   # check mark
        r'\u274c': '❌',   # cross mark
        r'\u2601': '☁',    # cloud

        # Latin accents (\u00XX — válido em JS mas NÃO em HTML)
        r'\u00e7': 'ç',    # cedilha
        r'\u00e3': 'ã',    # a tilde
        r'\u00e1': 'á',    # a acute
        r'\u00ed': 'í',    # i acute
        r'\u00f5': 'õ',    # o tilde
        r'\u00ea': 'ê',    # e circumflex
    }

    # Aplicar substituições — apenas na seção do #tab-admin
    # Primeiro delimitar a seção: do comentário "PATCH V26" ao "FIM PATCH V26"
    v26_start_marker = '<!-- PATCH V26: Aba Administração -->'
    v26_end_marker   = '<!-- FIM PATCH V26 -->'

    s = txt.find(v26_start_marker)
    e = txt.find(v26_end_marker)
    if s < 0 or e < 0:
        # Fallback: buscar pela div #tab-admin
        s = txt.find('<div id="tab-admin"')
        e = txt.find('FIM PATCH V26')
        if s < 0 or e < 0:
            print('[ERRO] Não encontrei a seção #tab-admin. Aplicando no arquivo inteiro...')
            s = 0
            e = len(txt)

    bloco = txt[s:e+len(v26_end_marker)]
    bloco_original = bloco
    count_unicode = 0

    for escape, char_real in mapa_unicode.items():
        # O escape no arquivo é literal: backslash + u + hex
        # Ex: \U0001f527 (8 chars: \ U 0 0 0 1 f 5 2 7)
        # Precisamos buscar a string literal como aparece no arquivo
        # Já que lemos com decode('utf-8'), o backslash é um char real
        vezes = bloco.count(escape)
        if vezes > 0:
            bloco = bloco.replace(escape, char_real)
            count_unicode += vezes
            print(f'  [OK] {escape} → {char_real}  ({vezes}x)')

    # Re-montar o arquivo
    txt = txt[:s] + bloco + txt[e+len(v26_end_marker):]
    mudancas += count_unicode

    if count_unicode == 0:
        print('[AVISO] Nenhum escape Unicode encontrado no bloco #tab-admin')
    else:
        print(f'[OK] Unicode: {count_unicode} substituições no bloco #tab-admin')

    # ==================================================================
    # VERIFICAÇÃO FINAL
    # ==================================================================
    if txt == original:
        print('\n[AVISO] Nenhuma alteração foi aplicada — arquivo já está correto ou padrões não encontrados.')
        sys.exit(0)

    # Garantir que admin está no ABAS do PATCH103
    abas_patch103 = re.search(r'var ABAS\s*=\s*\[([^\]]+)\];', txt[txt.find('K_PERM'):txt.find('function esc')]) if 'K_PERM' in txt else None
    if abas_patch103:
        if "'admin'" in abas_patch103.group(1):
            print('[OK] Verificação: admin está no ABAS do PATCH103 ✓')
        else:
            print('[ERRO] Verificação: admin NÃO está no ABAS do PATCH103 ✗')

    # Salvar
    with open(ARQ, 'wb') as f:
        f.write(txt.encode('utf-8'))

    print(f'\n[PATCH V27] {mudancas} correção(ões) aplicada(s) em {ARQ}')
    print('Recarregue a página no navegador para testar a aba Administração.')

if __name__ == '__main__':
    main()
