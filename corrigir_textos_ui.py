#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Correção segura de textos da UI no index.html.

Regra: NÃO altera nada dentro de <script> nem de <style>.
Só substitui frases completas no HTML visível (e, opcionalmente,
strings listadas na lista branca mesmo dentro de script).

Uso:
  python corrigir_textos_ui.py
  python corrigir_textos_ui.py --dry
  python corrigir_textos_ui.py --arquivo "C:\\Users\\OBRAS 8\\Desktop\\ACOPANHAMENTO DE OBRAS\\index.html"
"""
from __future__ import annotations

import argparse
import re
import shutil
from datetime import datetime
from pathlib import Path

# Trocas só no HTML (fora de script/style)
HTML_TROCAS = {
    "PROJECAO DESTE MES": "PROJEÇÃO DESTE MÊS",
    "DISTRIBUICAO": "DISTRIBUIÇÃO",
    "MEDIA POR LANCAMENTO": "MÉDIA POR LANÇAMENTO",
    "MES DE ": "MÊS DE ",
    "ULTIMO MES": "ÚLTIMO MÊS",
    "MEDIA POR MES": "MÉDIA POR MÊS",
    "CUSTO POR DIA": "CUSTO POR DIA",
}

# Só aplica se a frase inteira aparecer entre aspas simples/duplas no JS
JS_BRANCA = {
    "Nao consegui": "Não consegui",
    "Nao foi possivel": "Não foi possível",
    "Nao ha ": "Não há ",
    "Diario de Obra": "Diário de Obra",
    "Correcoes de autenticacao": "Correções de autenticação",
}

SCRIPT_RE = re.compile(
    r"(<script\b[^>]*>.*?</script>)|(<style\b[^>]*>.*?</style>)",
    re.I | re.S,
)


def partir(html: str):
    partes = []
    last = 0
    for m in SCRIPT_RE.finditer(html):
        if m.start() > last:
            partes.append(("html", html[last : m.start()]))
        partes.append(("skip", m.group(0)))
        last = m.end()
    if last < len(html):
        partes.append(("html", html[last:]))
    return partes


def aplicar_html(bloco: str) -> tuple[str, int]:
    n = 0
    for a, b in HTML_TROCAS.items():
        c = bloco.count(a)
        if c:
            bloco = bloco.replace(a, b)
            n += c
    return bloco, n


def aplicar_js_branca(bloco: str) -> tuple[str, int]:
    """Só troca se estiver entre aspas, para não quebrar identificadores."""
    n = 0
    for a, b in JS_BRANCA.items():
        pad = re.compile(r"(['\"`])" + re.escape(a) + r"(['\"`])")
        bloco, c = pad.subn(r"\1" + b + r"\2", bloco)
        n += c
    return bloco, n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default="index.html")
    ap.add_argument("--dry", action="store_true", help="só mostra o que mudaria")
    args = ap.parse_args()
    path = Path(args.arquivo)
    if not path.is_file():
        print("Arquivo não encontrado:", path)
        return 1
    raw = path.read_text(encoding="utf-8", errors="replace")
    out = []
    total = 0
    for tipo, bloco in partir(raw):
        if tipo == "html":
            bloco, n = aplicar_html(bloco)
            total += n
        else:
            bloco, n = aplicar_js_branca(bloco)
            total += n
        out.append(bloco)
    novo = "".join(out)
    print("Substituições:", total)
    if args.dry:
        print("Dry-run: nada gravado.")
        return 0
    if novo == raw:
        print("Nada a alterar.")
        return 0
    bak = path.with_name(path.stem + "_bak_" + datetime.now().strftime("%Y%m%d_%H%M%S") + path.suffix)
    shutil.copy2(path, bak)
    path.write_text(novo, encoding="utf-8")
    print("Backup:", bak)
    print("Gravado:", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
