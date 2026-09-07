#!/usr/bin/env python3
"""validate.py — compara contagens do JSON legado vs tabelas."""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

URL = os.getenv("SUPABASE_URL", "").strip()
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
LINHA_ID = int(os.getenv("PAINEL_DADOS_ID") or "1")

if not URL or not KEY:
    print("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env")
    sys.exit(1)

sb = create_client(URL, KEY)


def count_table(table: str):
    try:
        res = sb.table(table).select("*", count="exact").limit(1).execute()
        return res.count, None
    except Exception as e:
        return None, str(e)


def main() -> None:
    print("Validação JSON × tabelas\n")

    res = (
        sb.table("painel_dados")
        .select("dados")
        .eq("id", LINHA_ID)
        .maybe_single()
        .execute()
    )
    data = res.data
    if not data or not data.get("dados"):
        print("Não li painel_dados")
        sys.exit(1)

    obras = data["dados"].get("obras") or []
    itens = receb = colab = lanc = med = ctms = crono = 0
    for o in obras:
        itens += len(o.get("itens") or [])
        receb += len(o.get("recebimentos") or [])
        colab += len(o.get("colaboradores") or [])
        lanc += len(o.get("lancamentosProducao") or [])
        ctms += len(o.get("ctmExtraSpecs") or [])
        if isinstance(o.get("cronogramaTasks"), list):
            crono += len(o["cronogramaTasks"])
        for it in o.get("itens") or []:
            hist = it.get("historicoMedicoes")
            if isinstance(hist, dict):
                med += len(hist)

    json_counts = {
        "obras": len(obras),
        "itens": itens,
        "recebimentos": receb,
        "colaboradores": colab,
        "lancamentos": lanc,
        "medicoes": med,
        "ctm_specs": ctms,
        "cronograma": crono,
    }

    tables = {
        "obras": "obras",
        "itens": "itens",
        "recebimentos": "recebimentos",
        "colaboradores": "colaboradores",
        "lancamentos": "lancamentos_producao",
        "medicoes": "item_medicoes",
        "ctm_specs": "ctm_extra_specs",
        "cronograma": "cronograma_tarefas",
    }

    print(f"{'Campo':<16}{'JSON':>8}{'Banco':>8}  Status")
    print("-" * 44)

    ok = True
    for key, table in tables.items():
        j = json_counts[key]
        b, err = count_table(table)
        if err:
            status = f"ERRO: {err}"
            ok = False
        elif b != j:
            status = "VERIFICAR" if key == "colaboradores" else "DIVERGE"
            if key != "colaboradores":
                ok = False
        else:
            status = "OK"
        print(f"{key:<16}{j:>8}{str(b):>8}  {status}")

    print("\nAmostra de obras:")
    try:
        obras_db = sb.table("obras").select("id, nome").limit(20).execute().data or []
        for o in obras_db:
            c, _ = count_table_eq("itens", "obra_id", o["id"])
            print(f"  - {o['nome']}: {c} item(ns)")
    except Exception as e:
        print("  (falha ao listar obras)", e)

    print("\n✓ Validação básica OK" if ok else "\n✗ Há divergências — revise o log")
    sys.exit(0 if ok else 1)


def count_table_eq(table: str, col: str, val) -> tuple:
    try:
        res = sb.table(table).select("*", count="exact").eq(col, val).limit(1).execute()
        return res.count, None
    except Exception as e:
        return None, str(e)


if __name__ == "__main__":
    main()
