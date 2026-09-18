#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Organizador de patches obsoletos
================================
Cria a pasta  _historico_patches/  e MOVE (nao apaga) para dentro dela os
arquivos que nao sao mais usados pelo index.html:

  * Os 13 scripts .js que o PATCH164 ja desligou (nao sao mais carregados).
  * Os geradores de patch de uso unico (.py) e arquivos auxiliares (.dat)
    cujas alteracoes ja estao embutidas no index.html.

NUNCA move (lista de protegidos):
  - index.html
  - supabase_auth_client.js
  - patch_relocate_header_buttons.js
  - patch_correcao.js
  - patch_centro-custo-dinamico.js
  - o proprio script que esta rodando

Mover e reversivel (os arquivos continuam na pasta _historico_patches).
Idempotente: rodar de novo apenas move o que ainda estiver sobrando.

Uso:
    python organizar_historico_patches.py
(ou passe a pasta do projeto:  python organizar_historico_patches.py "C:\\...\\ACOMPANHAMENTO DE OBRAS")
"""

import os
import sys
import glob
import shutil
import subprocess

# Pasta do projeto (onde esta o index.html)
PROJETO_PADRAO = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS'
HIST_DIR = '_historico_patches'

# --- NUNCA mover estes (arquivos ainda ativos / criticos) ---
PROTEGIDOS = {
    'index.html',
    'supabase_auth_client.js',
    'patch_relocate_header_buttons.js',
    'patch_correcao.js',
    'patch_centro-custo-dinamico.js',
}

# --- .js ja DESLIGADOS pelo PATCH164 (nao sao mais carregados) ---
JS_OBSOLETOS = [
    'patch-custo-colab-20260914.js',
    'patch-anti-flicker.js',
    'patch-fpdo-modelo-20260914.js',
    'patch-fpdo-enq-salvar.js',
    'patch-header-contrato-20260915.js',
    'patch-print-isolamento-20260915.js',
    'patch-pgto-slim-20260915.js',
    'patch-fpdo-editor-livre.js',
    'patch-fpdo-fotos-mover.js',
    'patch-hide-selo-espera.js',
    'patch-fpdo-graf-inserir.js',
    'patch-painel-responsivo.js',
    'patch-fpdo-texto-toolbar.js',
]

# --- padroes de geradores/auxiliares de uso unico ---
PADROES_PY = ['gerar_patch*.py', 'bootstrap*.py', 'patch*.py', '*.dat']


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else PROJETO_PADRAO
    base = os.path.abspath(base)
    print('Pasta do projeto:', base)

    if not os.path.isdir(base):
        print('ERRO: pasta do projeto nao encontrada.')
        return

    este_script = os.path.basename(os.path.abspath(__file__))
    protegidos = set(n.lower() for n in PROTEGIDOS)
    protegidos.add(este_script.lower())
    # tambem nao mover o patch estrutural mais recente, caso ainda nao tenha rodado
    protegidos.add('organizar_historico_patches.py')

    destino = os.path.join(base, HIST_DIR)
    os.makedirs(destino, exist_ok=True)
    print('Pasta de historico:', destino)

    # Monta a lista de candidatos
    candidatos = set()

    # 1) os .js explicitamente obsoletos
    for nome in JS_OBSOLETOS:
        p = os.path.join(base, nome)
        if os.path.isfile(p):
            candidatos.add(nome)

    # 2) geradores/auxiliares por padrao
    for padrao in PADROES_PY:
        for p in glob.glob(os.path.join(base, padrao)):
            candidatos.add(os.path.basename(p))

    # Remove protegidos
    candidatos = sorted(n for n in candidatos if n.lower() not in protegidos)

    if not candidatos:
        print('\nNada a mover - nenhum arquivo obsoleto encontrado na pasta.')
        return

    movidos = []
    for nome in candidatos:
        origem = os.path.join(base, nome)
        alvo = os.path.join(destino, nome)
        if not os.path.isfile(origem):
            continue
        if os.path.exists(alvo):
            # ja existe no historico: renomeia para nao sobrescrever
            raiz, ext = os.path.splitext(nome)
            i = 1
            while os.path.exists(os.path.join(destino, '{}_{}{}'.format(raiz, i, ext))):
                i += 1
            alvo = os.path.join(destino, '{}_{}{}'.format(raiz, i, ext))
        try:
            shutil.move(origem, alvo)
            movidos.append(nome)
            print('  MOVIDO ->', nome)
        except Exception as e:
            print('  ERRO ao mover', nome, ':', e)

    print('\nTotal movido: {} arquivo(s).'.format(len(movidos)))
    print('Protegidos (mantidos na raiz):', ', '.join(sorted(PROTEGIDOS)))

    if not movidos:
        return

    # ------------------------------------------------------------------
    # GIT: registra a reorganizacao
    # ------------------------------------------------------------------
    git_cmds = [
        ['git', 'add', '-A'],
        ['git', 'commit', '-m',
         'Organizacao: patches obsoletos movidos para _historico_patches'],
        ['git', 'push'],
    ]
    for cmd in git_cmds:
        label = ' '.join(cmd[:2]) + (' ' + cmd[2] if len(cmd) > 2 else '')
        print('  GIT {} ...'.format(label))
        try:
            r = subprocess.run(cmd, cwd=base, capture_output=True, text=True)
        except Exception as e:
            print('    ERRO ao executar git:', e)
            break
        if r.returncode != 0:
            print('    (git avisou):', (r.stderr or r.stdout).strip().split(chr(10))[0])
        else:
            msg = (r.stdout.strip() or r.stderr.strip() or 'ok').split(chr(10))[0]
            print('    OK:', msg)

    print('\nConcluido. Se algo der errado, os arquivos estao em', HIST_DIR)


if __name__ == '__main__':
    main()
