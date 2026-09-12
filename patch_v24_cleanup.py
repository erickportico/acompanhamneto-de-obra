# -*- coding: utf-8 -*-
"""
PATCH V24 — LIMPEZA COMPLETA DO REPOSITÓRIO E DA PASTA LOCAL
===========================================================

Este script faz DUAS coisas:

  PARTE A – Remove do repositório Git (git rm) os arquivos
           obsoletos que estão no GitHub, e comita/push.

  PARTE B – Remove da pasta local os arquivos órfãos
           (backups antigos, patches já aplicados, scripts
           de validação, etc.).

COMO USAR:
  1. Abra o terminal (cmd ou PowerShell)
  2. cd /d "C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS"
  3. python patch_v24_cleanup.py

O script pede confirmação antes de cada parte.
"""

import os
import subprocess
import sys

# ── Caminho base do projeto ──────────────────────────────
BASE = r"C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS"

# ── PARTE A: Arquivos a remover do Git (git rm) ──────────
#    Esses arquivos existem no repositório remoto e devem
#    ser removidos via `git rm` para que saiam do GitHub.
GIT_RM_FILES = [
    # Duplicata de .gitignore
    "gitignore",

    # Scripts JS antigos — suas funções já estão embutidas no index.html
    "admin-painel.js",                    # → P79/P80 embutido no index.html
    "supabase_auth_client.js",            # → P128 embutido no index.html
    "patch_centro-custo-dinamico.js",      # → PATCH137 embutido no index.html
    "patch_correcao.js",                  # → patch antigo, função já no index.html
    "patch_relocate_header_buttons.js",   # → PATCH124 embutido no index.html

    # Scripts de migração one-shot (já executados)
    "migrate.js",
    "migrate.py",

    # Scripts de validação one-shot (já executados)
    "validate.js",
    "validate.py",

    # Script SQL de migração (já executado)
    "sql-painel-arquivos.sql",

    # Sync local obsoleto
    "sync-local.js",

    # Helpers de servidor local (não pertencem ao repo)
    "iniciar-servidor.bat",
    "iniciar-servidor-express.bat",
    "servidor_painel.py",

    # Backups HTML antigos na pasta data/
    "data/index.html.bak_v10_20260911_184903",
    "data/index.html.bak_v11_20260911_190228",
    "data/index.html.bak_v11_20260911_191125",
    "data/index.html.bak_v12b_20260911_191837",
    "data/index.html.bak_v8_20260911_164249",
    "data/index.html.bak_v9_20260911_171139",
    "data/index.html.bak_v9_20260911_183148",
    "data/index.html.bak_v9_20260911_183350",

    # Backups JSON antigos na pasta data/backups/
    "data/backups/banco_2026-09-07T06-12-03-992Z.json",
    "data/backups/banco_2026-09-07T06-14-43-082Z.json",
    "data/backups/banco_2026-09-07T06-18-50-570Z.json",
    "data/backups/banco_2026-09-07T06-22-27-017Z.json",
    "data/backups/banco_2026-09-07T06-24-19-715Z.json",
    "data/backups/banco_2026-09-07T06-26-26-419Z.json",
    "data/backups/banco_2026-09-07T06-43-01-578Z.json",
]

# ── PARTE B: Arquivos locais a apagar (não rastreados pelo Git) ──
LOCAL_DELETE_FILES = [
    # Backups HTML locais antigos
    "index.html.bak.v16",
    "index.html.bak.v17",
    "index.html.bak.v14bak",
    "index.html.bak.v15bak",
    "index.html.bak.v18bak",

    # Backups do dia 12/09
    "index.html.bak-20260912-pre-v19",
    "index.html.bak-20260912-pre-v20",
    "index.html.bak-20260912-pre-v21",

    # Scripts Python antigos de patch (já aplicados)
    "patch_v14_custo_fix.py",
    "patch_v14_revert.py",
    "patch_v15_custo_fix.py",
    "patch_v16_custo_comprehensive.py",
    "patch_v17_custo_fix.py",
    "patch_v18_syntax_fix.py",
    "patch_v19_fix_indent.py",
    "patch_v20_syntax_safe.py",
    "patch_v21_fix_eof.py",
    "patch_v22_fix_imports.py",
    "patch_v23_apply_p128.py",

    # Scripts de correção e validação antigos
    "corrigir_textos_ui.py",
    "validar_html.py",

    # Scripts PowerShell / Shell auxiliares
    "corrigir-index-windows.ps1",
    "validar-index-windows.ps1",
    "subir-correcao-git.sh",

    # Arquivo de teste
    "index_teste.html",

    # Notas de correção antigas
    "p84-correcao-trecho-1-bloco-impressao.txt",
    "p84-correcao-trecho-2-bloco-impressao.txt",
    "p84-correcao-trecho-3-bloco-impressao.txt",

    # Arquivo de duplicadas
    "duplicadas no recebimento - solução.txt",

    # Patch JS antigo na pasta data/
    "data/patch_centro-custo-dinamico.js",
]

# Diretórios locais a apagar
LOCAL_DELETE_DIRS = [
    "index-audit",
]


# ══════════════════════════════════════════════════════════
#  FUNÇÕES AUXILIARES
# ══════════════════════════════════════════════════════════

def run(cmd, cwd=None):
    """Roda um comando shell e imprime saída."""
    print(f"  > {cmd}")
    result = subprocess.run(
        cmd, shell=True, cwd=cwd or BASE,
        capture_output=True, text=True
    )
    if result.stdout.strip():
        print(result.stdout.rstrip())
    if result.returncode != 0 and result.stderr.strip():
        print(f"  [STDERR] {result.stderr.strip()}")
    return result.returncode == 0


def confirm(msg):
    """Pede confirmação sim/não."""
    resp = input(f"\n{msg} (s/N): ").strip().lower()
    return resp in ("s", "sim", "y", "yes")


# ══════════════════════════════════════════════════════════
#  PARTE A — Limpeza do repositório Git
# ══════════════════════════════════════════════════════════

def parte_a_git_rm():
    print("\n" + "=" * 60)
    print("PARTE A — Remover arquivos obsoletos do GitHub (git rm)")
    print("=" * 60)
    print(f"\nSerão removidos {len(GIT_RM_FILES)} arquivos do repositório:")
    for f in GIT_RM_FILES:
        print(f"   - {f}")

    if not confirm("\nProsseguir com git rm desses arquivos?"):
        print("PARTE A pulada.")
        return False

    # Verificar que estamos no diretório certo
    result = subprocess.run(
        "git rev-parse --show-toplevel", shell=True,
        cwd=BASE, capture_output=True, text=True
    )
    if result.returncode != 0:
        print("ERRO: Não encontrei repositório Git em", BASE)
        print("  Verifique se a pasta está correta.")
        return False

    top = result.stdout.strip().replace("/", "\\")
    print(f"  Repo detectado em: {top}")

    # git rm cada arquivo
    ok_count = 0
    for f in GIT_RM_FILES:
        full = os.path.join(BASE, f)
        # Se o arquivo existe localmente, git rm normal;
        # se já foi deletado localmente, git rm --cached
        if os.path.isfile(full):
            success = run(f'git rm "{f}"')
        else:
            success = run(f'git rm --cached "{f}"')
        if success:
            ok_count += 1
        else:
            print(f"  [AVISO] Falha ao remover '{f}' — pode já não existir")

    print(f"\n  {ok_count}/{len(GIT_RM_FILES)} arquivos removidos do índice Git.")

    # Commit + push
    if ok_count == 0:
        print("Nenhum arquivo foi removido. Nada a comitar.")
        return False

    if confirm("Comitar e enviar (push) a limpeza para o GitHub?"):
        run('git add -A')
        run('git commit -m "chore: limpeza — remove arquivos obsoletos, backups antigos e patches já aplicados"')
        print("\nEnviando para o GitHub...")
        run('git push')
        print("\n✅ PARTE A concluída! Repositório limpo no GitHub.")
        return True
    else:
        print("Commit/push cancelado. Arquivos estão staged mas não commitados.")
        print("Para commitar depois:")
        print('  git commit -m "chore: limpeza"')
        print('  git push')
        return False


# ══════════════════════════════════════════════════════════
#  PARTE B — Limpeza de arquivos locais
# ══════════════════════════════════════════════════════════

def parte_b_local_cleanup():
    print("\n" + "=" * 60)
    print("PARTE B — Remover arquivos órfãos da pasta local")
    print("=" * 60)

    all_files = LOCAL_DELETE_FILES + [
        # Arquivos de patch também existem em data/ (podem ter cópia)
    ]

    print(f"\nSerão apagados {len(all_files)} arquivos e {len(LOCAL_DELETE_DIRS)} pastas:")
    print("\nArquivos:")
    for f in all_files:
        print(f"   - {f}")
    print("\nPastas:")
    for d in LOCAL_DELETE_DIRS:
        print(f"   - {d}/")

    if not confirm("\nProsseguir com a exclusão local?"):
        print("PARTE B pulada.")
        return

    deleted = 0
    missing = 0

    for f in all_files:
        full = os.path.join(BASE, f)
        if os.path.isfile(full):
            try:
                os.remove(full)
                print(f"   ✅ Apagado: {f}")
                deleted += 1
            except Exception as e:
                print(f"   ❌ Erro ao apagar '{f}': {e}")
        else:
            missing += 1

    for d in LOCAL_DELETE_DIRS:
        full = os.path.join(BASE, d)
        if os.path.isdir(full):
            try:
                import shutil
                shutil.rmtree(full)
                print(f"   ✅ Pasta apagada: {d}/")
                deleted += 1
            except Exception as e:
                print(f"   ❌ Erro ao apagar pasta '{d}': {e}")
        else:
            missing += 1

    print(f"\n  {deleted} itens apagados, {missing} não encontrados (já limpos).")
    print("\n✅ PARTE B concluída! Pasta local limpa.")

    # Sugere git add -A para limpar o index dos arquivos locais deletados
    if confirm("Rodar 'git add -A && git commit -m \"chore: limpeza local\"' para sincronizar?"):
        run('git add -A')
        run('git commit -m "chore: limpeza local — remove backups e patches antigos"')
        if confirm("Push?"):
            run('git push')
            print("\n✅ Push concluído!")


# ══════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════

def main():
    print("╔══════════════════════════════════════════════════╗")
    print("║  PATCH V24 — LIMPEZA COMPLETA                    ║")
    print("║  Repo + Pasta Local                              ║")
    print("╚══════════════════════════════════════════════════╝")

    # Verificar diretório
    if not os.path.isdir(BASE):
        print(f"\nERRO: Pasta não encontrada: {BASE}")
        print("  Verifique o caminho e tente novamente.")
        sys.exit(1)

    os.chdir(BASE)
    print(f"\nPasta de trabalho: {BASE}")

    # ── Parte A: limpeza do repo ──
    parte_a_git_rm()

    # ── Parte B: limpeza local ──
    parte_b_local_cleanup()

    print("\n" + "=" * 60)
    print("🎉 LIMPEZA COMPLETA FINALIZADA!")
    print("=" * 60)
    print("\nArquivos mantidos (essenciais):")
    print("  ✓ index.html")
    print("  ✓ .gitignore")
    print("  ✓ README.md")
    print("  ✓ package.json / package-lock.json / server.js")
    print("  ✓ 001_schema_e_rls.sql")
    print("  ✓ requirements.txt")
    print("  ✓ LEIA-ME-COPIA-LOCAL.md")
    print("  ✓ LEIA-ME-PYTHON.md")
    print("  ✓ data/banco.json")
    print("\nTodos os backups antigos, patches já aplicados")
    print("e scripts de migração one-shot foram removidos.")


if __name__ == "__main__":
    main()
