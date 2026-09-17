#!/usr/bin/env python3
# Patch 161 - Adiciona signInAnonymously() no PATCH156_AUTH_ANONIMO
# O patch 156 atual so checa se existe sessao, mas NAO cria sessao anonima.
# Sem sessao anonima, todo POST retorna 401.
# Este patch troca o fallback para chamar signInAnonymously().
#
# USO:
#   python patch161_anon_signin.py "Caminho/para/index.html"

import sys, os

# Texto antigo que so faz warn e desiste
OLD_CODE = "if (!ok) {\n                    console.warn('[P156] Sem sessao Supabase ainda. Entre com e-mail e senha na tela de login.');\n                }"

# Novo texto que tenta signInAnonymously
NEW_CODE = "if (!ok) {\n                    console.log('[P161] Sem sessao. Tentando signInAnonymously()...');\n                    try {\n                        var anonRes = await _supabase.auth.signInAnonymously();\n                        if (anonRes && anonRes.data && anonRes.data.session) {\n                            console.log('[P161] Sessao anonima criada com sucesso!');\n                            ok = true;\n                        } else if (anonRes && anonRes.error) {\n                            console.warn('[P161] signInAnonymously falhou:', anonRes.error.message);\n                            console.warn('[P161] Ative \"Anonymous Sign-ins\" em Authentication > Providers no Supabase Dashboard.');\n                        }\n                    } catch (eAnon) {\n                        console.warn('[P161] Excecao em signInAnonymously:', eAnon.message || eAnon);\n                        console.warn('[P161] Ative \"Anonymous Sign-ins\" em Authentication > Providers no Supabase Dashboard.');\n                    }\n                }"

def main():
    if len(sys.argv) < 2:
        print("USO: python patch161_anon_signin.py <caminho/do/index.html>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"ERRO: arquivo nao encontrado: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if OLD_CODE not in content:
        if NEW_CODE in content:
            print("[P161] Patch ja aplicado! signInAnonymously() ja esta no HTML.")
        else:
            print("[P161] ERRO: trecho antigo nao encontrado. O HTML pode ter mudado.")
            print("[P161] Procure por: \"Sem sessao Supabase ainda\" no HTML.")
        sys.exit(1)

    content = content.replace(OLD_CODE, NEW_CODE)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print("[P161] signInAnonymously() adicionado com sucesso!")
    print("[P161] Agora o painel cria sessao anonima automaticamente.")
    print()
    print("IMPORTANTE: Ative 'Anonymous Sign-ins' no Supabase Dashboard:")
    print("  https://supabase.com/dashboard/project/eqtxfpjrqlkhqgckbyxb/auth/providers")
    print()
    print("Depois rode no git:")
    print('  git add index.html')
    print('  git commit -m "feat: adiciona signInAnonymously() para auth automatica"')
    print('  git push')

if __name__ == "__main__":
    main()
