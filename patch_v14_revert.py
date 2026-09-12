#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r'''
REVERT v14 — Restaura backup do index.html
========================================

Se a pagina ficou em branco apos o patch v14, rode este script
para restaurar o backup automatico que o v14 criou.

COMO RODAR:
  cd "C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS"
  python patch_v14_revert.py
'''

import os, sys, glob

CAMINHO = os.path.join(
    os.environ.get("USERPROFILE", os.path.expanduser("~")),
    "Desktop",
    "ACOMPANHAMENTO DE OBRAS",
    "index.html"
)

PASTA = os.path.dirname(CAMINHO)

# Procurar backup mais recente do v14
backups = sorted(
    glob.glob(os.path.join(PASTA, "index.html.v14bak_*")),
    reverse=True
)

if not backups:
    print("[REVERT] ERRO: Nao encontrei nenhum backup do v14.")
    print(f"  Procurei em: {PASTA}")
    print(f"  Padrao: index.html.v14bak_*")
    print()
    print("  Voce pode restaurar manualmente:")
    print("    1. Abra a pasta do projeto no Explorador")
    print("    2. Procure arquivo 'index.html.v14bak_...' ")
    print("    3. Renomeie para 'index.html' (apague o .v14bak_...)")
    sys.exit(1)

bkp = backups[0]
print(f"[REVERT] Backup encontrado: {os.path.basename(bkp)}")
print(f"[REVERT] Tamanho: {os.path.getsize(bkp):,} bytes")

# Verificar se o arquivo atual nao esta maior que o backup
# (se o atual esta maior, pode ter patches adicionais que queremos preservar)
atual_size = os.path.getsize(CAMINHO) if os.path.isfile(CAMINHO) else 0
bkp_size = os.path.getsize(bkp)
print(f"[REVERT] Arquivo atual: {atual_size:,} bytes")
print(f"[REVERT] Backup:       {bkp_size:,} bytes")

if atual_size > 0 and atual_size < bkp_size * 0.5:
    print("[REVERT] ALERTA: Arquivo atual esta muito menor que o backup!")
    print("[REVERT] Isso sugere corrupcao — revertendo automaticamente.")
else:
    resp = input("[REVERT] Restaurar este backup? (s/n): ").strip().lower()
    if resp != 's':
        print("[REVERT] Cancelado.")
        sys.exit(0)

# Copiar backup sobre o arquivo atual (binary mode!)
import shutil
shutil.copy2(bkp, CAMINHO)
print(f"[REVERT] Restaurado: {os.path.getsize(CAMINHO):,} bytes")
print()
print("GIT (apos verificar que a pagina voltou):")
print('  git add index.html')
print('  git commit -m "revert: restaura backup pre-v14"')
print('  git push')
