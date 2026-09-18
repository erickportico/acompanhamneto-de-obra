#!/usr/bin/env python3
# Patch 160 Diagnostico - Encontra a chave Supabase real no index.html

import sys, os, re

def main():
    if len(sys.argv) < 2:
        print("USO: python patch160_diagnostico.py <caminho/do/index.html>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"ERRO: arquivo nao encontrado: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Procura todas as chaves JWT (padrao eyJ...)
    keys = re.findall(r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', content)

    if not keys:
        print("[P160-DIAG] Nenhuma chave JWT encontrada no HTML!")
        # Procura por SUPABASE_URL
        urls = re.findall(r'https://[a-z]+\.supabase\.co', content)
        if urls:
            print(f"[P160-DIAG] URLs Supabase encontradas: {urls}")
        sys.exit(0)

    print(f"[P160-DIAG] Encontradas {len(keys)} chave(s) JWT:")
    for i, k in enumerate(keys):
        # Decodifica o payload do JWT (segundo segmento)
        parts = k.split('.')
        if len(parts) >= 2:
            try:
                import base64
                padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
                decoded = base64.urlsafe_b64decode(padded).decode('utf-8', errors='replace')
                print(f"\n  Chave #{i+1}:")
                print(f"    JWT completo: {k}")
                print(f"    Payload decodificado: {decoded}")
            except Exception as e:
                print(f"  Chave #{i+1}: {k} (erro ao decodificar: {e})")

    # Procura a URL do Supabase
    urls = re.findall(r'https://[a-z]+\.supabase\.co', content)
    if urls:
        print(f"\n[P160-DIAG] URLs Supabase encontradas: {urls}")

if __name__ == "__main__":
    main()
