#!/usr/bin/env python3
# Patch 160 - Corrige a anon key do Supabase no index.html
# A chave antiga no HTML pertencia a um projeto diferente (ref eqtfp...).
# Este patch substitui pela chave correta do projeto eqtxfpjrqlkhqgckbyxb.
#
# USO:
#   python patch160_fix_supabase_key.py "Caminho/para/index.html"

import sys, os

OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdGZwanJxbGtocWdja2J5eGIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY4ODk5NTMzMCwiZXhwIjoyMDA0NTcxMzMwfQ.R68XpX4O-sZ4723w9yR1g1L114XpD5y56k6Y5zO2eYg"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdHhmcGpycWxraHFnY2tieXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDYxMTgsImV4cCI6MjEwNDMyMjExOH0.9foJNAUKPqeygHjPL6P-7jP94zn-jEOaEh_kgF3VU5I"

def main():
    if len(sys.argv) < 2:
        print("USO: python patch160_fix_supabase_key.py <caminho/do/index.html>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"ERRO: arquivo nao encontrado: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    count = content.count(OLD_KEY)
    if count == 0:
        print("[P160] AVISO: chave antiga nao encontrada no HTML. Ja foi corrigida?")
        if NEW_KEY in content:
            print("[P160] Chave correta ja esta no HTML. Nada a fazer.")
        sys.exit(0)

    content = content.replace(OLD_KEY, NEW_KEY)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[P160] Chave do Supabase corrigida! ({count} substituicao(oes))")
    print(f"[P160] Projeto correto: eqtxfpjrqlkhqgckbyxb")
    print()
    print("Agora rode no git:")
    print('  git add index.html')
    print('  git commit -m "fix: corrige anon key do Supabase"')
    print('  git push')

if __name__ == "__main__":
    main()
