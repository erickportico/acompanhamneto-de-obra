#!/usr/bin/env python3
"""
migrate.py — painel_dados (JSON) → tabelas normalizadas no Supabase

Uso (Windows CMD):
  python migrate.py          # respeita DRY_RUN do .env (padrão: true)
  set DRY_RUN=false
  python migrate.py

Requer:
  1. 001_schema_e_rls.sql já executado no Supabase
  2. arquivo .env preenchido (veja .env.example)
  3. pip install -r requirements.txt
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

URL = os.getenv("SUPABASE_URL", "").strip()
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
LINHA_ID = int(os.getenv("PAINEL_DADOS_ID") or "1")
DRY = os.getenv("DRY_RUN", "true").strip().lower() != "false"

if not URL or not KEY:
    print("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env")
    sys.exit(1)

sb = create_client(URL, KEY)

stats: dict[str, Any] = {
    "obras": 0,
    "itens": 0,
    "medicoes": 0,
    "recebimentos": 0,
    "colaboradores": 0,
    "lancamentos": 0,
    "centros": 0,
    "ctmSpecs": 0,
    "ctmLogs": 0,
    "cronograma": 0,
    "obraflow": 0,
    "membros": 0,
    "erros": [],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def uuid_from_legado(prefix: str, legado: str) -> str:
    """UUID determinístico (estilo v5) para reimportação idempotente."""
    digest = hashlib.sha1(f"{prefix}::{legado}".encode("utf-8")).digest()
    b = bytearray(digest[:16])
    b[6] = (b[6] & 0x0F) | 0x50
    b[8] = (b[8] & 0x3F) | 0x80
    h = b.hex()
    return f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def is_uuid(s: Any) -> bool:
    try:
        uuid.UUID(str(s))
        return True
    except Exception:
        return False


def s(v: Any, default: str = "") -> str:
    if v is None:
        return default
    return str(v)


def n(v: Any, default: float = 0) -> float:
    try:
        x = float(v)
        return x if x == x else default  # NaN check
    except Exception:
        return default


def b(v: Any, default: bool = True) -> bool:
    if v is None or v == "":
        return default
    if isinstance(v, bool):
        return v
    t = str(v).strip().lower()
    if t in ("false", "0", "nao", "não", "no"):
        return False
    if t in ("true", "1", "sim", "yes"):
        return True
    return default


def to_date(v: Any) -> str | None:
    if not v:
        return None
    try:
        if isinstance(v, (int, float)):
            return None
        txt = str(v).strip()
        if not txt:
            return None
        # já YYYY-MM-DD
        if len(txt) >= 10 and txt[4] == "-" and txt[7] == "-":
            return txt[:10]
        dt = datetime.fromisoformat(txt.replace("Z", "+00:00"))
        return dt.date().isoformat()
    except Exception:
        return None


def omit(obj: dict, keys: list[str]) -> dict:
    return {k: v for k, v in (obj or {}).items() if k not in keys}


def agora() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert(table: str, rows: list[dict], on_conflict: str) -> None:
    if not rows:
        return
    if DRY:
        print(f"  [DRY] {table}: {len(rows)} linha(s)")
        return
    # lotes
    lote = 150
    for i in range(0, len(rows), lote):
        fatia = rows[i : i + lote]
        try:
            sb.table(table).upsert(fatia, on_conflict=on_conflict).execute()
        except Exception as e:
            print(f"  ERRO {table}: {e}")
            raise


# ---------------------------------------------------------------------------
# Contagem / leitura
# ---------------------------------------------------------------------------

def contar_json(blob: dict) -> dict:
    obras = blob.get("obras") or []
    itens = receb = colab = lanc = med = 0
    for o in obras:
        itens += len(o.get("itens") or [])
        receb += len(o.get("recebimentos") or [])
        colab += len(o.get("colaboradores") or [])
        lanc += len(o.get("lancamentosProducao") or [])
        for it in o.get("itens") or []:
            hist = it.get("historicoMedicoes")
            if isinstance(hist, dict):
                med += len(hist)
    return {
        "obras": len(obras),
        "itens": itens,
        "receb": receb,
        "colab": colab,
        "lanc": lanc,
        "med": med,
    }


def carregar_blob() -> dict:
    print(f"\nLendo painel_dados id={LINHA_ID}...")
    res = (
        sb.table("painel_dados")
        .select("id, dados, updated_at")
        .eq("id", LINHA_ID)
        .maybe_single()
        .execute()
    )
    data = res.data
    if not data or not data.get("dados"):
        raise RuntimeError("painel_dados vazio ou inexistente")

    obras = data["dados"].get("obras") if isinstance(data["dados"], dict) else None
    qtd = len(obras) if isinstance(obras, list) else 0
    print(f"  updated_at: {data.get('updated_at')}")
    print(f"  obras no JSON: {qtd}")

    nome = Path(__file__).resolve().parent / (
        f"backup_painel_dados_{datetime.now().strftime('%Y-%m-%dT%H-%M-%S')}.json"
    )
    nome.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  backup local: {nome.name}")
    return data["dados"]


def listar_admins() -> list[dict]:
    try:
        res = (
            sb.table("painel_perfis")
            .select("id, email, perfil, ativo")
            .eq("ativo", True)
            .execute()
        )
        admins = [
            p
            for p in (res.data or [])
            if str(p.get("perfil") or "").lower() == "admin"
        ]
        print(f"  admins ativos: {len(admins)}")
        return admins
    except Exception as e:
        print(f"  Não li painel_perfis: {e}")
        return []


# ---------------------------------------------------------------------------
# Migração por entidade
# ---------------------------------------------------------------------------

def migrar_config(blob: dict) -> None:
    print("\n→ painel_config")
    upsert(
        "painel_config",
        [
            {
                "id": 1,
                "config": blob.get("config") or {},
                "agenda_obras": s(blob.get("agendaObras")),
                "versao_banco": s(blob.get("versaoBanco"), "migrado-json"),
                "atualizado_em": agora(),
            }
        ],
        "id",
    )


def resolver_obra_id(id_legado: str) -> str:
    leg = s(id_legado)
    if is_uuid(leg):
        return leg
    if not leg:
        leg = uuid.uuid4().hex
    return uuid_from_legado("obra", leg)


def migrar_itens(obra: dict, obra_id: str) -> None:
    itens = obra.get("itens") or []
    rows, maps, medicoes = [], [], []

    for it in itens:
        id_legado = s(it.get("id") or f"{it.get('ref')}-{uuid.uuid4().hex[:6]}")
        item_id = id_legado if is_uuid(id_legado) else uuid_from_legado(f"item:{obra_id}", id_legado)

        rows.append(
            {
                "id": item_id,
                "obra_id": obra_id,
                "id_legado": id_legado,
                "ref": s(it.get("ref")),
                "tipo": s(it.get("tipo")),
                "loc": s(it.get("loc")),
                "vidro": s(it.get("vidro")),
                "qtd": n(it.get("qtd"), 1),
                "larg": n(it.get("larg")),
                "alt": n(it.get("alt")),
                "fem": n(it.get("fem")),
                "fabricado": n(it.get("fabricado")),
                "instalado": n(it.get("instalado")),
                "data_instalacao": to_date(it.get("dataInstalacao")),
                "has_bottom": b(it.get("hasBottom"), True),
                "ctm_profile": s(it.get("ctmProfile"), "largo"),
                "dados_extras": omit(
                    it,
                    [
                        "id", "ref", "tipo", "loc", "vidro", "qtd", "larg", "alt",
                        "fem", "fabricado", "instalado", "dataInstalacao",
                        "hasBottom", "ctmProfile", "historicoMedicoes",
                        "m2MedicaoAnterior", "m2MedicaoAtual",
                    ],
                ),
                "atualizado_em": agora(),
            }
        )
        maps.append({"obra_id": obra_id, "id_legado": id_legado, "item_id": item_id})

        hist = dict(it.get("historicoMedicoes") or {}) if isinstance(it.get("historicoMedicoes"), dict) else {}
        if it.get("m2MedicaoAnterior") is not None and 1 not in hist and "1" not in hist:
            hist[1] = it.get("m2MedicaoAnterior")
        if it.get("m2MedicaoAtual") is not None:
            k = obra.get("numMedicaoMax") or 1
            if k not in hist and str(k) not in hist:
                hist[k] = it.get("m2MedicaoAtual")

        for k, v in hist.items():
            try:
                num_med = int(k)
            except Exception:
                continue
            medicoes.append({"item_id": item_id, "num_medicao": num_med, "m2": n(v)})

    upsert("itens", rows, "id")
    stats["itens"] += len(rows)
    upsert("item_id_map", maps, "obra_id,id_legado")
    upsert("item_medicoes", medicoes, "item_id,num_medicao")
    stats["medicoes"] += len(medicoes)


def migrar_recebimentos(obra: dict, obra_id: str) -> None:
    lista = obra.get("recebimentos") or []
    rows = []
    for i, r in enumerate(lista):
        id_legado = s(r.get("id") or f"rec-{i}")
        rows.append(
            {
                "id": id_legado if is_uuid(id_legado) else uuid_from_legado(f"rec:{obra_id}", id_legado),
                "obra_id": obra_id,
                "id_legado": id_legado,
                "data": to_date(r.get("data")),
                "lista_corte": s(r.get("listaCorte")),
                "nf": s(r.get("nf")),
                "classe": s(r.get("classe")),
                "marca": s(r.get("marca")),
                "codigo_cor": s(r.get("codigoCor")),
                "descricao": s(r.get("descricao")),
                "fornecedor": s(r.get("fornecedor")),
                "material": s(r.get("material")),
                "ref": s(r.get("ref")),
                "responsavel": s(r.get("responsavel")),
                "local": s(r.get("local")),
                "obs": s(r.get("obs")),
                "qtd_prevista": n(r.get("qtdPrevista")),
                "qtd_recebida": n(r.get("qtdRecebida")),
                "status": s(r.get("status"), "Pendente"),
                "dados_extras": r,
                "atualizado_em": agora(),
            }
        )
    upsert("recebimentos", rows, "id")
    stats["recebimentos"] += len(rows)


def migrar_colaboradores(obra: dict, obra_id: str) -> None:
    mapa: dict[str, dict] = {}

    def add(c: dict, origem: str) -> None:
        if not c:
            return
        id_legado = s(c.get("id") or c.get("nome"))
        if not id_legado:
            return
        colab_id = id_legado if is_uuid(id_legado) else uuid_from_legado(f"colab:{obra_id}", id_legado)
        prev = mapa.get(id_legado) or {
            "id": colab_id,
            "obra_id": obra_id,
            "id_legado": id_legado,
            "nome": s(c.get("nome"), "Sem nome"),
            "funcao": s(c.get("funcao")),
            "empresa": s(c.get("empresa")),
            "dados_extras": {},
            "atualizado_em": agora(),
        }
        prev["nome"] = s(c.get("nome"), prev["nome"])
        prev["funcao"] = s(c.get("funcao"), prev["funcao"])
        prev["empresa"] = s(c.get("empresa"), prev["empresa"])
        extras = {**(prev.get("dados_extras") or {}), **c}
        orig = list(dict.fromkeys((extras.get("origem") or []) + [origem]))
        extras["origem"] = orig
        if c.get("valorPagoManual"):
            extras["valorPagoManual"] = {
                **(extras.get("valorPagoManual") or {}),
                **c["valorPagoManual"],
            }
        prev["dados_extras"] = extras
        mapa[id_legado] = prev

    for c in obra.get("colaboradores") or []:
        add(c, "colaboradores")
    for c in obra.get("colaboradoresPgto") or []:
        add(c, "colaboradoresPgto")

    rows = list(mapa.values())
    maps = [
        {"obra_id": obra_id, "id_legado": r["id_legado"], "colab_id": r["id"]}
        for r in rows
    ]
    upsert("colaboradores", rows, "id")
    upsert("colab_id_map", maps, "obra_id,id_legado")
    stats["colaboradores"] += len(rows)


def migrar_lancamentos(obra: dict, obra_id: str) -> None:
    lista = obra.get("lancamentosProducao") or []
    rows = []
    for i, l in enumerate(lista):
        id_legado = s(l.get("id") or f"lanc-{i}")
        rows.append(
            {
                "id": id_legado if is_uuid(id_legado) else uuid_from_legado(f"lanc:{obra_id}", id_legado),
                "obra_id": obra_id,
                "id_legado": id_legado,
                "dados": l,
                "mes_ref": s(l.get("mesAnoKey") or l.get("mes")),
                "atualizado_em": agora(),
            }
        )
    upsert("lancamentos_producao", rows, "id")
    stats["lancamentos"] += len(rows)


def migrar_centros(obra: dict, obra_id: str) -> None:
    lista = obra.get("centrosCusto") or []
    rows = []
    for i, c in enumerate(lista):
        id_legado = s(c.get("id") or f"cc-{i}")
        rows.append(
            {
                "id": id_legado if is_uuid(id_legado) else uuid_from_legado(f"cc:{obra_id}", id_legado),
                "obra_id": obra_id,
                "id_legado": id_legado,
                "dados": c,
            }
        )
    upsert("centros_custo", rows, "id")
    stats["centros"] += len(rows)


def migrar_ctm(obra: dict, obra_id: str) -> None:
    specs = obra.get("ctmExtraSpecs") or []
    rows_specs = []
    for i, sp in enumerate(specs):
        rows_specs.append(
            {
                "id": uuid_from_legado(f"ctms:{obra_id}", s(sp.get("ref") or i)),
                "obra_id": obra_id,
                "ref": s(sp.get("ref")),
                "type": s(sp.get("type")),
                "l_mm": int(n(sp.get("L", sp.get("l_mm")), 0)),
                "h_mm": int(n(sp.get("H", sp.get("h_mm")), 0)),
                "qty": int(n(sp.get("qty"), 1)),
                "has_bottom": b(sp.get("hasBottom"), True),
                "ctm_profile": s(sp.get("ctmProfile"), "largo"),
                "dados_extras": sp,
            }
        )
    upsert("ctm_extra_specs", rows_specs, "id")
    stats["ctmSpecs"] += len(rows_specs)

    logs = obra.get("ctmLogs") or []
    rows_logs = []
    for i, lg in enumerate(logs):
        rows_logs.append(
            {
                "id": uuid_from_legado(f"ctml:{obra_id}", s(lg.get("id") or i)),
                "obra_id": obra_id,
                "dados": lg,
            }
        )
    upsert("ctm_logs", rows_logs, "id")
    stats["ctmLogs"] += len(rows_logs)


def migrar_cronograma(obra: dict, obra_id: str) -> None:
    tasks = obra.get("cronogramaTasks")
    if not isinstance(tasks, list):
        return
    rows = []
    for i, t in enumerate(tasks):
        id_legado = s(t.get("id") or f"task-{i}")
        rows.append(
            {
                "id": id_legado if is_uuid(id_legado) else uuid_from_legado(f"crono:{obra_id}", id_legado),
                "obra_id": obra_id,
                "id_legado": id_legado,
                "ordem": i,
                "grupo": s(t.get("group") or t.get("grupo")),
                "tarefa": s(t.get("name") or t.get("tarefa") or t.get("task")),
                "inicio": to_date(t.get("start") or t.get("inicio")),
                "fim": to_date(t.get("end") or t.get("fim")),
                "status": s(t.get("status")),
                "cor": s(t.get("color") or t.get("cor")),
                "dados": t,
            }
        )
    upsert("cronograma_tarefas", rows, "id")
    stats["cronograma"] += len(rows)


def migrar_obraflow(obra: dict, obra_id: str) -> None:
    of = obra.get("obraflow")
    if not isinstance(of, dict):
        return
    upsert(
        "obraflow_tarefas",
        [
            {
                "id": uuid_from_legado("oflow", obra_id),
                "obra_id": obra_id,
                "ordem": 0,
                "dados": of,
            }
        ],
        "id",
    )
    stats["obraflow"] += 1


def migrar_obra(obra: dict, admins: list[dict]) -> str | None:
    id_legado = s(obra.get("id") or obra.get("nome") or uuid.uuid4().hex)
    obra_id = resolver_obra_id(id_legado)

    campos = {
        "id", "nome", "numContrato", "valorContrato", "pctServico", "numMedicaoMax",
        "consideracoesPorMedicao", "medicoesFinais", "itens", "recebimentos",
        "colaboradores", "colaboradoresPgto", "lancamentosProducao", "centrosCusto",
        "ctmExtraSpecs", "ctmLogs", "cronogramaTasks", "cronogramaTitle",
        "obraflow", "lancExcluidos",
    }

    try:
        upsert(
            "obras",
            [
                {
                    "id": obra_id,
                    "nome": s(obra.get("nome"), "Sem nome"),
                    "num_contrato": s(obra.get("numContrato")),
                    "valor_contrato": n(obra.get("valorContrato")),
                    "pct_servico": n(obra.get("pctServico"), 20),
                    "num_medicao_max": max(1, int(n(obra.get("numMedicaoMax"), 1))),
                    "consideracoes": obra.get("consideracoesPorMedicao") or {},
                    "medicoes_finais": obra.get("medicoesFinais") or {},
                    "cronograma_title": s(obra.get("cronogramaTitle")),
                    "dados_extras": {
                        **omit(obra, list(campos)),
                        "id_legado": id_legado,
                        "lancExcluidos": obra.get("lancExcluidos") or [],
                    },
                    "criado_por": (admins[0]["id"] if admins else None),
                    "atualizado_em": agora(),
                }
            ],
            "id",
        )
    except Exception as e:
        stats["erros"].append({"obra": id_legado, "erro": str(e)})
        return None

    stats["obras"] += 1
    upsert("obra_id_map", [{"id_legado": id_legado, "obra_id": obra_id}], "id_legado")

    if admins:
        membros = [
            {"obra_id": obra_id, "user_id": a["id"], "papel": "dono"} for a in admins
        ]
        upsert("obra_membros", membros, "obra_id,user_id")
        stats["membros"] += len(membros)

    migrar_itens(obra, obra_id)
    migrar_recebimentos(obra, obra_id)
    migrar_colaboradores(obra, obra_id)
    migrar_lancamentos(obra, obra_id)
    migrar_centros(obra, obra_id)
    migrar_ctm(obra, obra_id)
    migrar_cronograma(obra, obra_id)
    migrar_obraflow(obra, obra_id)
    return obra_id


def contar_banco() -> dict | None:
    if DRY:
        return None

    def q(table: str) -> int:
        try:
            res = sb.table(table).select("*", count="exact").limit(1).execute()
            return int(res.count or 0)
        except Exception:
            return -1

    return {
        "obras": q("obras"),
        "itens": q("itens"),
        "recebimentos": q("recebimentos"),
        "colaboradores": q("colaboradores"),
        "lancamentos": q("lancamentos_producao"),
        "medicoes": q("item_medicoes"),
    }


def main() -> None:
    print("========================================")
    print(" Migração painel_dados → tabelas (Python)")
    print(f" DRY_RUN = {DRY}")
    print("========================================")

    blob = carregar_blob()
    json_count = contar_json(blob)
    print("\nContagem JSON:", json_count)

    admins = listar_admins()
    if not admins:
        print(
            "\n⚠️  Nenhum admin em painel_perfis. Obras podem ficar sem membros.\n"
            "    Com RLS ativo, usuários comuns não verão as obras."
        )

    migrar_config(blob)

    print("\n→ obras e filhos")
    for obra in blob.get("obras") or []:
        if not obra or not obra.get("nome"):
            print("  pulando obra sem nome", (obra or {}).get("id"))
            continue
        print(f"  • {obra.get('nome')} ({obra.get('id')}) ... ", end="", flush=True)
        oid = migrar_obra(obra, admins)
        print("ok" if oid else "FALHOU")

    print("\n========== RESUMO ==========")
    print(json.dumps(stats, ensure_ascii=False, indent=2))

    db_count = contar_banco()
    if db_count:
        print("\nContagem no banco:", db_count)
        print("Compare com JSON:", json_count)

    if stats["erros"]:
        print("\nErros:")
        for e in stats["erros"]:
            print(" ", e)

    if DRY:
        print("\nNada foi gravado (DRY_RUN=true).")
        print("Para gravar no Windows CMD:")
        print("  set DRY_RUN=false")
        print("  python migrate.py")
    else:
        print("\nMigração concluída. Rode: python validate.py")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("\nFalha fatal:", e)
        sys.exit(1)
