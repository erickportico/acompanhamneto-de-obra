#!/usr/bin/env python3
# Patch 160b - Corrige URL e anon key do Supabase no index.html
# O HTML aponta para o projeto antigo (hosvxz...) mas as tabelas
# estao no projeto correto (eqtxfp...). Este patch troca ambos.
#
# USO:
#   python patch160b_fix_supabase_project.py "Caminho/para/index.html"

import sys, os

OLD_URL = "https://hosvxzayiuklouhrqeuv.supabase.co"
NEW_URL = "https://eqtxfpjrqlkhqgckbyxb.supabase.co"

OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvc3Z4emF5aXVrbG91aHJxZXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NDIyMzYsImV4cCI6MjEwMzAxODIzNn0.sq3JsZyT7TKPQpQTsD9Ykn-V1FSWm2o8R4Eud-7yewQ"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdHhmcGpycWxraHFnY2tieXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDYxMTgsImV4cCI6MjEwNDMyMjExOH0.9foJNAUKPqeygHjPL6P-7jP94zn-jEOaEh_kgF3VU5I"

def main():
    if len(sys.argv) < 2:
        print("USO: python patch160b_fix_supabase_project.py <caminho/do/index.html>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"ERRO: arquivo nao encontrado: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    url_count = content.count(OLD_URL)
    key_count = content.count(OLD_KEY)

    if url_count == 0 and key_count == 0:
        print("[P160b] AVISO: URL e chave antigas nao encontradas.")
        if NEW_URL in content and NEW_KEY in content:
            print("[P160b] URL e chave corretas ja estao no HTML. Nada a fazer.")
        sys.exit(0)

    content = content.replace(OLD_URL, NEW_URL)
    content = content.replace(OLD_KEY, NEW_KEY)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[P160b] Supabase corrigido no HTML:")
    print(f"  URL: hosvxzayiuklouhrqeuv -> eqtxfpjrqlkhqgckbyxb ({url_count} substituicao(oes))")
    print(f"  Key: chave antiga -> chave correta ({key_count} substituicao(oes))")
    print()
    print("Agora rode no git:")
    print('  git add index.html')
    print('  git commit -m "fix: corrige URL e anon key do Supabase para projeto correto"')
    print('  git push')

if __name__ == "__main__":
    main()
