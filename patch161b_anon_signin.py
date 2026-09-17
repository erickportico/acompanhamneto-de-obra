#!/usr/bin/env python3
# Patch 161b - Adiciona signInAnonymously() no PATCH156 (versao robusta)
# O patch 161 falhou porque as quebras de linha nao bateram.
# Esta versao procura pela string exata no arquivo.

import sys, os

# A linha exata que precisa ser trocada
OLD_LINE = "                    console.warn('[P156] Sem sessao Supabase ainda. Entre com e-mail e senha na tela de login.');"

# Novo bloco que substitui
NEW_BLOCK = """                    console.log('[P161] Sem sessao. Tentando signInAnonymously()...');
                    try {
                        var anonRes = await _supabase.auth.signInAnonymously();
                        if (anonRes && anonRes.data && anonRes.data.session) {
                            console.log('[P161] Sessao anonima criada com sucesso!');
                            ok = true;
                        } else if (anonRes && anonRes.error) {
                            console.warn('[P161] signInAnonymously falhou:', anonRes.error.message);
                        }
                    } catch (eAnon) {
                        console.warn('[P161] Excecao em signInAnonymously:', eAnon.message || eAnon);
                    }"""

def main():
    if len(sys.argv) < 2:
        print("USO: python patch161b_anon_signin.py <caminho/do/index.html>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"ERRO: arquivo nao encontrado: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if OLD_LINE not in content:
        if "signInAnonymously()" in content and "[P161]" in content:
            print("[P161b] Patch ja aplicado! signInAnonymously() ja esta no HTML.")
        else:
            print("[P161b] ERRO: linha antiga nao encontrada. HTML pode ter mudado.")
            print(f"[P161b] Procurando por: {OLD_LINE[:60]}...")
            # Tenta buscar trecho similar
            import re
            matches = re.findall(r"console\.warn\('\[P156\].*?\')", content)
            if matches:
                print(f"[P161b] Encontrado algo similar: {matches}")
        sys.exit(1)

    content = content.replace(OLD_LINE, NEW_BLOCK)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print("[P161b] signInAnonymously() adicionado com sucesso!")
    print("[P161b] Agora o painel cria sessao anonima automaticamente.")
    print()
    print("Depois rode no git:")
    print('  git add index.html')
    print('  git commit -m "feat: adiciona signInAnonymously() para auth automatica"')
    print('  git push')

if __name__ == "__main__":
    main()
