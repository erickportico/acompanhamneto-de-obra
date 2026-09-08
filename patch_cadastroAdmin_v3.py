#!/usr/bin/env python3
"""
patch_cadastroAdmin_v3.py — Correções no painel "Administração de Usuários"
  1) podeMexer() retorna false para admin → corrigir lógica
  2) Guarda "Somente o administrador pode cadastrar." → trocar podeMexer por ehAdmin
  3) Modal aparece descentralizado e pula ao centro → corrigir CSS do #p87Caixa
  4) ehAdmin() retorna true quando sem sessão → corrigir para false

Uso:
  python patch_cadastroAdmin_v3.py                          (procura index.html na pasta atual)
  python patch_cadastroAdmin_v3.py  caminho/para/index.html   (caminho específico)
"""
import sys, os

def main():
    # Descobrir o caminho do index.html
    if len(sys.argv) >= 2:
        path = sys.argv[1]
    else:
        # Procurar index.html na pasta atual
        path = os.path.join(os.getcwd(), "index.html")
        if not os.path.isfile(path):
            print("ERRO: Nao encontrei 'index.html' na pasta atual.")
            print(f"Pasta atual: {os.getcwd()}")
            print("Uso: python patch_cadastroAdmin_v3.py <caminho_do_index.html>")
            sys.exit(1)
        print(f"Arquivo encontrado automaticamente: {path}")

    if not os.path.isfile(path):
        print(f"ERRO: Arquivo nao encontrado: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        src = f.read()

    # Criar backup
    bak = path + ".bak_cadastroAdmin_v3"
    if not os.path.exists(bak):
        with open(bak, "w", encoding="utf-8") as f:
            f.write(src)
        print(f"Backup criado: {bak}")
    else:
        print(f"Backup ja existe: {bak}")

    patches_applied = 0
    patches_total   = 4

    # ── CORREÇÃO 1: podeMexer() — adicionar perfil 'administrador' ──
    old_podeMexer = (
        "  function podeMexer() {\n"
        "    try {\n"
        "      var s = (window.PainelNucleo && PainelNucleo.sessao) ? PainelNucleo.sessao() : sessao();\n"
        "      if (!s) return false;\n"
        "      var p = String(s.perfil || '').toLowerCase();\n"
        "      return p === 'admin' || p === 'editor';\n"
        "    } catch (e) {\n"
        "      return false;\n"
        "    }\n"
        "  }"
    )
    new_podeMexer = (
        "  function podeMexer() {\n"
        "    try {\n"
        "      var s = (window.PainelNucleo && PainelNucleo.sessao) ? PainelNucleo.sessao() : sessao();\n"
        "      if (!s) return false;\n"
        "      var p = String(s.perfil || '').toLowerCase();\n"
        "      return p === 'admin' || p === 'editor' || p === 'administrador';\n"
        "    } catch (e) {\n"
        "      return false;\n"
        "    }\n"
        "  }"
    )
    if old_podeMexer in src:
        src = src.replace(old_podeMexer, new_podeMexer, 1)
        patches_applied += 1
        print("[OK] Correcao 1: podeMexer() — adicionado perfil 'administrador'")
    else:
        print("[FALHOU] Correcao 1: trecho de podeMexer() nao encontrado")
        lines = src.split("\n")
        for i, line in enumerate(lines, 1):
            if "function podeMexer()" in line:
                snippet = "\n".join(lines[i-1:i+12])
                print(f"  Encontrado na linha {i}:\n{snippet}")
                break

    # ── CORREÇÃO 2: guarda de cadastro — trocar podeMexer() por ehAdmin() ──
    old_guard = "      if (!podeMexer()) { aviso('Somente o administrador pode cadastrar.', 'err'); return; }"
    new_guard = "      if (!ehAdmin()) { aviso('Somente o administrador pode cadastrar.', 'err'); return; }"
    if old_guard in src:
        src = src.replace(old_guard, new_guard, 1)
        patches_applied += 1
        print("[OK] Correcao 2: guarda de cadastro trocada de podeMexer() para ehAdmin()")
    else:
        print("[FALHOU] Correcao 2: trecho da guarda de cadastro nao encontrado")
        lines = src.split("\n")
        for i, line in enumerate(lines, 1):
            if "Somente o administrador pode cadastrar" in line:
                print(f"  Encontrado na linha {i}: [{line}]")
                break

    # ── CORREÇÃO 3: ehAdmin() — sem sessão deve retornar false ──
    old_ehAdmin = (
        "  function ehAdmin() {\n"
        "    var s = sessao();\n"
        "    if (!s) { return true; }\n"
        "    return String(s.perfil || '').toLowerCase() === 'admin';\n"
        "  }"
    )
    new_ehAdmin = (
        "  function ehAdmin() {\n"
        "    var s = sessao();\n"
        "    if (!s) { return false; }\n"
        "    return String(s.perfil || '').toLowerCase() === 'admin';\n"
        "  }"
    )
    if old_ehAdmin in src:
        src = src.replace(old_ehAdmin, new_ehAdmin, 1)
        patches_applied += 1
        print("[OK] Correcao 3: ehAdmin() — sem sessao retorna false (era true)")
    else:
        print("[FALHOU] Correcao 3: trecho de ehAdmin() nao encontrado")
        lines = src.split("\n")
        for i, line in enumerate(lines, 1):
            if "function ehAdmin()" in line:
                snippet = "\n".join(lines[i-1:i+6])
                print(f"  Encontrado na linha {i}:\n{snippet}")
                break

    # ── CORREÇÃO 4: CSS #p87Caixa — centralização imediata ──
    old_css = (
        "'#p87Caixa{background:#fff;border-radius:14px;width:100%;max-width:860px;"
        "max-height:92vh;display:flex;flex-direction:column;overflow:hidden;"
        "box-shadow:0 20px 60px rgba(0,0,0,.4)}',"
    )
    new_css = (
        "'#p87Caixa{background:#fff;border-radius:14px;width:100%;max-width:860px;"
        "max-height:92vh;display:flex;flex-direction:column;overflow:hidden;"
        "box-shadow:0 20px 60px rgba(0,0,0,.4);"
        "position:fixed !important;left:50% !important;top:50% !important;"
        "transform:translate(-50%,-50%) !important}',"
    )
    if old_css in src:
        src = src.replace(old_css, new_css, 1)
        patches_applied += 1
        print("[OK] Correcao 4: #p87Caixa CSS — centralizacao imediata via position:fixed+transform")
    else:
        print("[FALHOU] Correcao 4: trecho CSS #p87Caixa nao encontrado")
        lines = src.split("\n")
        for i, line in enumerate(lines, 1):
            if "#p87Caixa{background" in line:
                print(f"  Encontrado na linha {i}: [{line[:150]}...]")
                break

    # ── Salvar ──
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)

    print(f"\nResultado: {patches_applied}/{patches_total} correcoes aplicadas com sucesso.")
    if patches_applied == patches_total:
        print("Todas as correcoes foram aplicadas!")
    else:
        print("Algumas correcoes falharam — verifique as mensagens acima.")
    sys.exit(0 if patches_applied == patches_total else 1)

if __name__ == "__main__":
    main()
