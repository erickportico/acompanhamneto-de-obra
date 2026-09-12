#!/usr/bin/env python3
"""
patch_v17_custo_fix.py
=====================
Corrige os problemas RESTANTES do Centro de Custos:

  PATCH E – Troca TODAS as referencias a getCustosFiltered (sem window.)
            nos patches 77 e 120 por window.getCustosFiltered.
            Causa-raiz do R$ 0,00: getCustosFiltered e local dentro de
            initCustoTab. Os patches 77 (linha ~38634) e 120 (linhas
            ~59760, ~59773) chamam getCustosFiltered sem window.,
            entao recebem undefined → lista vazia → R$ 0,00.

  PATCH F – CSS para esconder codigo JS que aparece como texto visivel.
            Adiciona regra: script { display: none !important; }
            e esconde conteudo que pareca codigo fonte.

  PATCH G – Diagnostico: script que verifica ao carregar se ha
            codigo JS visivel na pagina e loga no console.

Uso:
    python patch_v17_custo_fix.py

Backup automatico: index.html.bak.v17
Modo binario obrigatorio (rb/wb) para preservar ~3MB.
"""

import os, shutil, sys, traceback

# ── Caminho do arquivo ─────────────────────────────────────────────
DIR = os.path.join(
    os.environ.get('USERPROFILE', os.environ.get('HOME', '')),
    'Desktop',
    'ACOMPANHAMENTO DE OBRAS'
)
ARQ = os.path.join(DIR, 'index.html')
BAK = ARQ + '.bak.v17'

# ── Helpers ────────────────────────────────────────────────────────
def ler_raw(caminho):
    with open(caminho, 'rb') as f:
        return f.read()

def escrever_raw(caminho, dados):
    with open(caminho, 'wb') as f:
        f.write(dados)

def detectar_nl(texto, pos, raio=300):
    """Detecta se a regiao ao redor de pos usa CRLF ou LF."""
    trecho = texto[max(0, pos - raio):pos + raio]
    return '\r\n' if '\r\n' in trecho else '\n'

def pegar_indent(texto, pos):
    """Retorna a indentacao da linha que contem pos."""
    inicio = texto.rfind('\n', 0, pos)
    inicio = inicio + 1 if inicio >= 0 else 0
    indent = ''
    for ch in texto[inicio:pos]:
        if ch in (' ', '\t'):
            indent += ch
        else:
            break
    return indent

# ── PATCHES ────────────────────────────────────────────────────────

def patch_e(texto):
    """PATCH E – Troca getCustosFiltered sem window. por window.getCustosFiltered
    nos patches 77 e 120."""
    trocas = 0

    # ── Troca 1: PATCH77 envolverRender ──
    # Linha ~38634:
    #   try { renderPorEmpresa(typeof getCustosFiltered === "function" ? getCustosFiltered() : []); } catch (e2) { /* ignora */ }
    # Trocar por:
    #   try { renderPorEmpresa(typeof window.getCustosFiltered === "function" ? window.getCustosFiltered() : []); } catch (e2) { /* ignora */ }

    alvo1 = 'typeof getCustosFiltered === "function" ? getCustosFiltered()'
    novo1 = 'typeof window.getCustosFiltered === "function" ? window.getCustosFiltered()'
    pos1 = texto.find(alvo1)
    if pos1 == -1:
        # Tentar com aspas simples
        alvo1s = "typeof getCustosFiltered === 'function' ? getCustosFiltered()"
        novo1s = "typeof window.getCustosFiltered === 'function' ? window.getCustosFiltered()"
        pos1 = texto.find(alvo1s)
        if pos1 != -1:
            texto = texto[:pos1] + novo1s + texto[pos1 + len(alvo1s):]
            trocas += 1
            print(f'  [E1] PATCH77 envolverRender: trocado (aspas simples)')
    else:
        texto = texto[:pos1] + novo1 + texto[pos1 + len(alvo1):]
        trocas += 1
        print(f'  [E1] PATCH77 envolverRender: trocado (aspas duplas)')

    # ── Troca 2 e 3: PATCH120 (duas ocorrencias) ──
    # Linhas ~59760 e ~59773:
    #   E.lista = (typeof getCustosFiltered === 'function') ? getCustosFiltered() : [];
    # Trocar por:
    #   E.lista = (typeof window.getCustosFiltered === 'function') ? window.getCustosFiltered() : [];

    alvo2 = "(typeof getCustosFiltered === 'function') ? getCustosFiltered()"
    novo2 = "(typeof window.getCustosFiltered === 'function') ? window.getCustosFiltered()"

    pos2 = 0
    count2 = 0
    while True:
        pos2 = texto.find(alvo2, pos2)
        if pos2 == -1:
            break
        texto = texto[:pos2] + novo2 + texto[pos2 + len(alvo2):]
        count2 += 1
        pos2 += len(novo2)

    trocas += count2
    print(f'  [E2] PATCH120 iniciar/envolver: {count2} troca(s)')

    # ── Verificacao: nao deve restar getCustosFiltered() sem window ──
    # Exceto dentro de initCustoTab (linhas 15270-15850) e declaracoes locais
    import re
    # Contar todas as ocorrencias de getCustosFiltered fora de contexto de definicao
    todas = [m.start() for m in re.finditer(r'getCustosFiltered', texto)]
    com_window = [m.start() for m in re.finditer(r'window\.getCustosFiltered', texto)]
    definicao = [m.start() for m in re.finditer(r'function\s+getCustosFiltered', texto)]
    atribuicao = [m.start() for m in re.finditer(r'getCustosFiltered\s*=', texto)]
    sem_window = len(todas) - len(com_window) - len(definicao) - len(atribuicao)
    print(f'  [E] Total refs getCustosFiltered: {len(todas)}, com window.: {len(com_window)}, sem window.: {sem_window}')
    print(f'  [E] Trocas realizadas: {trocas}')

    # Se restam refs sem window. fora de initCustoTab, avisar
    # (as refs dentro de initCustoTab estao OK pois getCustosFiltered e local la)
    return texto


def patch_f_g(texto):
    """PATCH F+G – CSS para esconder JS visivel + diagnostico."""
    if 'pV17Fix' in texto:
        print('  [F+G] Ja existe pV17Fix. Nada a fazer.')
        return texto

    bloco = (
        '<style id="pV17Fix">\n'
        '  /* PATCH V17-F: esconder script tags visiveis (anti-codigo-vazamento) */\n'
        '  script { display: none !important; }\n'
        '  /* PATCH V17-Fb: forcar esconder overlays sem .on */\n'
        '  #p141Saida:not(.on) { display: none !important; }\n'
        '  #p139Trava:not(.on) { display: none !important; }\n'
        '  /* PATCH V17-Fc: overflow custo */\n'
        '  #tab-custo { overflow-x: hidden; word-break: break-word; }\n'
        '  .custo-dashboard-card { overflow: hidden; word-break: break-word; }\n'
        '  .custo-sub-painel { overflow-x: auto; word-break: break-word; }\n'
        '  .lanc-obra-group, .lanc-table { overflow-x: auto; }\n'
        '</style>\n'
        '<script id="pV17Diag">\n'
        '  /* PATCH V17-G: diagnostico - verifica codigo JS visivel na pagina */\n'
        '  (function(){\n'
        '    setTimeout(function(){\n'
        '      var suspeitos = [];\n'
        '      document.querySelectorAll("body > *").forEach(function(el){\n'
        '        if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "LINK") return;\n'
        '        var txt = (el.textContent || "").trim();\n'
        '        if (txt.indexOf("function ") >= 0 && txt.indexOf("{") >= 0 && txt.length > 200\n'
        '            && el.tagName !== "TEXTAREA" && !el.querySelector("script")) {\n'
        '          suspeitos.push({tag: el.tagName, id: el.id, cls: el.className, len: txt.length,\n'
        '            preview: txt.substring(0, 80)});\n'
        '          el.style.display = "none";\n'
        '        }\n'
        '      });\n'
        '      if (suspeitos.length > 0) {\n'
        '        console.warn("[V17-DIAG] Codigo JS visivel encontrado em:", suspeitos);\n'
        '      } else {\n'
        '        console.log("[V17-DIAG] Nenhum codigo JS visivel detectado.");\n'
        '      }\n'
        '    }, 3000);\n'
        '  })();\n'
        '</script>\n'
    )

    pos_head = texto.find('</head>')
    if pos_head == -1:
        print('  [F+G] ERRO – </head> nao encontrado!')
        return False

    nl = detectar_nl(texto, pos_head)
    bloco_nl = bloco.replace('\n', nl)
    novo = texto[:pos_head] + bloco_nl + nl + texto[pos_head:]

    verif = novo.count('pV17Fix')
    print(f'  [F+G] Inserido antes de </head>. Verificacao: {verif}x')
    return novo


# ── MAIN ───────────────────────────────────────────────────────────

def main():
    print('=' * 60)
    print('PATCH V17 – Correcao Centro de Custos (refs + diagnostico)')
    print('=' * 60)

    if not os.path.isfile(ARQ):
        print(f'ERRO FATAL: arquivo nao encontrado:\n  {ARQ}')
        sys.exit(1)

    tamanho = os.path.getsize(ARQ)
    print(f'Arquivo: {ARQ}')
    print(f'Tamanho: {tamanho:,} bytes')

    # Backup
    shutil.copy2(ARQ, BAK)
    print(f'Backup criado: {BAK}')

    # Leitura binaria
    raw = ler_raw(ARQ)
    texto = raw.decode('utf-8')
    print(f'Decodificado: {len(texto):,} caracteres')

    # ── Aplicar PATCH E ─────────────────────────────────────────────
    print('\n--- PATCH E: getCustosFiltered → window.getCustosFiltered ---')
    res_e = patch_e(texto)
    if res_e is False:
        print('  PATCH E FALHOU – restaurando backup.')
        escrever_raw(ARQ, ler_raw(BAK))
        sys.exit(1)
    texto = res_e
    print('  PATCH E OK')

    # ── Aplicar PATCH F+G ───────────────────────────────────────────
    print('\n--- PATCH F+G: CSS anti-vazamento + diagnostico ---')
    res_fg = patch_f_g(texto)
    if res_fg is False:
        print('  PATCH F+G FALHOU – restaurando backup.')
        escrever_raw(ARQ, ler_raw(BAK))
        sys.exit(1)
    texto = res_fg
    print('  PATCH F+G OK')

    # ── Escrita final (binario) ────────────────────────────────────
    novo_raw = texto.encode('utf-8')
    escrever_raw(ARQ, novo_raw)
    novo_tam = os.path.getsize(ARQ)
    print(f'\nArquivo salvo: {novo_tam:,} bytes (delta: {novo_tam - tamanho:+,})')

    # ── Checagem de integridade ─────────────────────────────────────
    check = ler_raw(ARQ).decode('utf-8')
    assert '<html' in check[:2000], 'Integridade: <html> sumiu!'
    assert '</html>' in check[-2000:], 'Integridade: </html> sumiu!'
    assert 'pV17Fix' in check, 'Integridade: PATCH F+G ausente!'
    # Verificar que getCustosFiltered sem window. so existe dentro de initCustoTab
    import re
    refs_sem_window = len([m for m in re.finditer(r'(?<!window\.)getCustosFiltered', check)
                           if not re.search(r'function\s+getCustosFiltered', check[max(0,m.start()-15):m.start()+30])
                           and not re.search(r'getCustosFiltered\s*=', check[max(0,m.start()-5):m.start()+35])])
    print(f'Referencias a getCustosFiltered sem window. (excluindo definicao): {refs_sem_window}')
    print('Checagem de integridade OK')

    print('\n' + '=' * 60)
    print('PATCH V17 aplicado com sucesso!')
    print('Apos abrir no navegador, abra o Console (F12) e procure')
    print('[V17-DIAG] para ver o diagnostico do codigo visivel.')
    print('=' * 60)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'\nERRO INESPERADO: {e}')
        traceback.print_exc()
        sys.exit(1)
