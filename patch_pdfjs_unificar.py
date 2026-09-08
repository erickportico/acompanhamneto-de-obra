#!/usr/bin/env python3
"""
Patch: Unifica PDF.js — remove versao 2.16.105 legada e a tag duplicada 4.10.38,
instala UMA so importacao moderna no <head> e converte o leitor de esquadria
para import() dinamico (mesmo padrao que o leitor de CTM).

Uso:  python patch_pdfjs_unificar.py  caminho/para/index.html
"""

import re, sys, os

def patch(caminho):
    with open(caminho, 'r', encoding='utf-8') as f:
        txt = f.read()

    linhas = txt.split('\n')
    mudancas = []

    # ─────────────────────────────────────────────────────
    # 1) Remove o bloco legado pdf.js 2.16.105 do <head>
    #    Linhas ~603-607:  <script src="...2.16.105/pdf.min.js"> + worker
    # ─────────────────────────────────────────────────────
    bloco_legado_start = None
    bloco_legado_end = None
    for i, linha in enumerate(linhas):
        if 'pdf.js/2.16.105/pdf.min.js' in linha:
            bloco_legado_start = i
            for j in range(i+1, min(i+10, len(linhas))):
                if '</script>' in linhas[j]:
                    bloco_legado_end = j
                    break
            break

    if bloco_legado_start is not None and bloco_legado_end is not None:
        comentario_idx = bloco_legado_start - 1
        if comentario_idx >= 0 and ('Importa' in linhas[comentario_idx] and 'PDF' in linhas[comentario_idx]):
            bloco_legado_start = comentario_idx

        for i in range(bloco_legado_start, bloco_legado_end + 1):
            linhas[i] = ''
        mudancas.append(f'Removido bloco legado pdf.js 2.16.105 (linhas {bloco_legado_start+1}-{bloco_legado_end+1})')
    else:
        mudancas.append('AVISO: bloco legado pdf.js 2.16.105 NAO encontrado')

    # ─────────────────────────────────────────────────────
    # 2) Remove a tag duplicada pdf.js 4.10.38 inline no body
    #    Linha ~6922: <script src="...4.10.38/pdf.min.mjs" type="module">
    # ─────────────────────────────────────────────────────
    tag_dup_idx = None
    for i, linha in enumerate(linhas):
        if 'pdf.js/4.10.38/pdf.min.mjs' in linha and '<script' in linha and 'type="module"' in linha:
            tag_dup_idx = i
            break

    if tag_dup_idx is not None:
        linhas[tag_dup_idx] = ''
        mudancas.append(f'Removida tag duplicada pdf.js 4.10.38 inline (linha {tag_dup_idx+1})')
    else:
        mudancas.append('AVISO: tag duplicada pdf.js 4.10.38 NAO encontrada')

    # ─────────────────────────────────────────────────────
    # 3) Insere NOVO bloco moderno no <head>, antes do XLSX
    # ─────────────────────────────────────────────────────
    xlsx_idx = None
    for i, linha in enumerate(linhas):
        if 'xlsx@0.18.5/dist/xlsx.full.min.js' in linha:
            xlsx_idx = i
            break

    novo_bloco = [
        '',
        '    <!-- PDF.js unificado (v4.10.38 ES module) -->',
        '    <script type="module">',
        '      /* Carrega pdfjs como modulo ES e expoe globalmente */',
        '      import * as _pdfjs from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";',
        '      _pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";',
        '      window.pdfjsLib = _pdfjs;',
        '      window["pdfjs-dist/build/pdf"] = _pdfjs;',
        '    </script>',
        '',
    ]

    if xlsx_idx is not None:
        for offset, linha_nova in enumerate(novo_bloco):
            linhas.insert(xlsx_idx + offset, linha_nova)
        mudancas.append(f'Inserido bloco pdf.js 4.10.38 unificado antes do XLSX (posicao ~{xlsx_idx+1})')
    else:
        mudancas.append('AVISO: tag XLSX nao encontrada para posicionar o novo bloco')

    # ─────────────────────────────────────────────────────
    # 4) Converte o leitor de esquadria para v4.10.38
    # ─────────────────────────────────────────────────────
    txt = '\n'.join(linhas)

    # 4a) Troca a linha "const pdfjs = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;"
    padrao_global = re.compile(
        r"const\s+pdfjs\s*=\s*window\[\'pdfjs-dist/build/pdf\'\]\s*\|\|\s*window\.pdfjsLib;"
    )
    if padrao_global.search(txt):
        txt = padrao_global.sub(
            "const pdfjs = window.pdfjsLib || (await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs'));",
            txt
        )
        mudancas.append('Leitor de esquadria: linha const pdfjs convertida')

    # 4b) Troca o comentario obsoleto (case-insensitive para PDF.js)
    txt = re.sub(
        r'//\s*Obtem[^\n]*[Pp][Dd][Ff]\.js[^\n]*v2\.16\.105[^\n]*\n',
        '// PDF.js: usa global do <head> ou importacao dinamica (v4.10.38)\n',
        txt,
        flags=re.IGNORECASE
    )

    # 4c) Troca workerSrc 2.16.105 -> 4.10.38 .mjs
    txt = txt.replace(
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
    )
    # 4d) Corrige .worker.min.js -> .worker.min.mjs na v4.10.38
    txt = txt.replace(
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
    )

    # 4e) Atualiza comentario do worker
    txt = re.sub(
        r'//\s*OBRIGATORIO[^\n]*worker[^\n]*\n',
        '// Worker do PDF.js (v4.10.38)\n',
        txt
    )

    # ─────────────────────────────────────────────────────
    # 5) Verificacao final
    # ─────────────────────────────────────────────────────
    restos = [i for i, l in enumerate(txt.split('\n')) if 'pdf.js/2.16.105' in l]
    if restos:
        mudancas.append(f'AVISO: ainda restam referencias a pdf.js 2.16.105 nas linhas: {restos}')
    else:
        mudancas.append('Nenhuma referencia a pdf.js 2.16.105 restante — limpo!')

    refs_novas = [i for i, l in enumerate(txt.split('\n')) if 'pdf.js/4.10.38' in l]
    mudancas.append(f'Referencias a pdf.js 4.10.38: {len(refs_novas)} (esperado: 4 — head, CTM, esquadria, worker)')

    # ─────────────────────────────────────────────────────
    # 6) Salva
    # ─────────────────────────────────────────────────────
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(txt)

    print('=' * 55)
    print('Patch PDF.js Unificar — concluido')
    print('=' * 55)
    for m in mudancas:
        print(f'  * {m}')
    print()
    print(f'Arquivo salvo: {caminho}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python patch_pdfjs_unificar.py  caminho/para/index.html')
        sys.exit(1)
    alvo = sys.argv[1]
    if not os.path.isfile(alvo):
        print(f'Arquivo nao encontrado: {alvo}')
        sys.exit(1)
    patch(alvo)
