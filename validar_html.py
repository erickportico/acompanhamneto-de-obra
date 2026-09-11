#!/usr/bin/env python3
"""Valida index.html com BeautifulSoup (html.parser)."""
from __future__ import annotations
import argparse
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default="index.html")
    args = ap.parse_args()
    path = Path(args.arquivo)
    raw = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(raw, "html.parser")
    print("arquivo:", path)
    print("bytes:", len(raw), "linhas:", raw.count("\n") + 1)
    print("title:", soup.title.string if soup.title else "(sem title)")
    print("html/head/body:", len(soup.find_all("html")), len(soup.find_all("head")), len(soup.find_all("body")))
    print("script:", len(soup.find_all("script")), "style:", len(soup.find_all("style")))
    rest = raw[raw.rfind("</html>") + 7 :].strip() if "</html>" in raw else ""
    print("lixo depois de </html>:", len(rest), "chars")
    leaks = []
    for t in soup.find_all(string=True):
        if t.parent and t.parent.name in ("script", "style"):
            continue
        s = str(t)
        if "janelaImpressao" in s or "function exportar" in s or s.strip().startswith("');"):
            leaks.append(s[:140])
    print("texto JS vazando na pagina:", len(leaks))
    for x in leaks[:5]:
        print(" ", x.replace("\n", " "))
    dups = [(i, n) for i, n in Counter(el.get("id") for el in soup.find_all(id=True)).items() if n > 1]
    print("ids duplicados:", len(dups))
    for i, n in sorted(dups, key=lambda x: -x[1])[:20]:
        print(f"  {n}x #{i}")
    print("document.write quebrado:", (" + h + '\n<script>" in raw) or (" + h + '\r\n<script>" in raw))
    print("ok" if not leaks and not rest and not dups else "atenção")
    return 0 if not leaks and not rest else 1

if __name__ == "__main__":
    raise SystemExit(main())
