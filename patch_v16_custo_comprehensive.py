#!/usr/bin/env python3
"""
patch_v16_custo_comprehensive.py
===============================
Corrige 4 problemas do Centro de Custos:

  PATCH A – getCustosFiltered vira global (window.getCustosFiltered)
            Insere 'window.getCustosFiltered = getCustosFiltered;'
            antes de 'window.renderCustoDashboard = function(){'
            (primeira e unica ocorrencia exata dessa string).
            Causa-raiz do R$ 0,00: getCustosFiltered e local dentro de
            initCustoTab e nunca chega a window.

  PATCH B – ajustarMesCusto NAO força mesVigente()
            Troca 'campo.value = mesVigente();' por 'campo.value = "";'
            SOMENTE dentro da funcao ajustarMesCusto (contexto unico:
            data-p129 na linha anterior).
            Sem isso, so custos de Set/2026 aparecem; se nao ha
            lancamentos em Set, volta vazio.

  PATCH C – CSS de seguranca contra overlays presos
            Insere <style id="pV16OverlaySafe"> antes de </head>:
            #p141Saida:not(.on) e #p139Trava:not(.on) com display:none!important

  PATCH D – overflow e word-break nos paineis custo
            No mesmo <style>:
            #tab-custo, .custo-dashboard-card, .lanc-obra-group, .lanc-table

Uso:
    python patch_v16_custo_comprehensive.py

Backup automatico: index.html.bak.v16
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
BAK = ARQ + '.bak.v16'

# ── Helpers ────────────────────────────────────────────────────────
def ler_raw(caminho):
    with open(caminho, 'rb') as f:
        return f.read()

def escrever_raw(caminho, dados):
    with open(caminho, 'wb') as f:
        f.write(dados)

# ── PATCHES ────────────────────────────────────────────────────────

def patch_a(texto):
    """PATCH A – Expoe getCustosFiltered para window."""
    marcador = 'window.renderCustoDashboard = function(){'

    # Se ja existe, nao precisa inserir de novo
    alvo = 'window.getCustosFiltered = getCustosFiltered'
    if alvo in texto:
        print('  [A] Ja existe window.getCustosFiltered = getCustosFiltered. Nada a fazer.')
        return texto

    pos = texto.find(marcador)
    if pos == -1:
        print(f'  [A] ERRO – marcador "{marcador}" nao encontrado!')
        return False

    # Pegar a indentacao da linha do marcador
    inicio_linha = texto.rfind('\n', 0, pos)
    if inicio_linha == -1:
        inicio_linha = 0
    else:
        inicio_linha += 1  # depois do \n
    trecho = texto[inicio_linha:pos]
    indent = ''
    for ch in trecho:
        if ch in (' ', '\t'):
            indent += ch
        else:
            break

    # Detectar tipo de newline usado nessa regiao
    busca_nl = texto[inicio_linha:pos + 200]
    if '\r\n' in busca_nl:
        nl = '\r\n'
    else:
        nl = '\n'

    insercao = 'window.getCustosFiltered = getCustosFiltered;' + nl + indent

    novo = texto[:pos] + insercao + texto[pos:]

    # Verificar
    verif = novo.count(alvo)
    print(f'  [A] Inserido na posicao {pos}. Verificacao: {alvo} aparece {verif}x')
    return novo


def patch_b(texto):
    """PATCH B – ajustarMesCusto nao força mesVigente."""
    # Encontrar a ocorrencia de 'campo.value = mesVigente();' que esta
    # DENTRO de ajustarMesCusto (contexto: 'data-p129' na linha anterior).
    # NAO mexer na do botaoTodosOsMeses (toggle correto).

    contexto_antes = "campo.getAttribute('data-p129') === '1' && !forcar) { return false; }"
    alvo = 'campo.value = mesVigente();'

    # Procurar contexto_antes seguido de alvo (com possivel CRLF e espacos entre)
    pos_ctx = texto.find(contexto_antes)
    if pos_ctx == -1:
        print(f'  [B] ERRO – contexto "{contexto_antes}" nao encontrado!')
        return False

    # Procurar o alvo dentro dos proximos 200 chars apos o contexto
    regiao = texto[pos_ctx:pos_ctx + 200]
    pos_alvo = regiao.find(alvo)
    if pos_alvo == -1:
        print(f'  [B] ERRO – alvo "{alvo}" nao encontrado apos contexto!')
        return False

    pos_abs = pos_ctx + pos_alvo
    novo = texto[:pos_abs] + 'campo.value = "";' + texto[pos_abs + len(alvo):]

    # Verificar: ainda deve existir 1 ocorrencia de mesVigente() (do toggle)
    restante = novo.count('campo.value = mesVigente()')
    print(f'  [B] Substituido. Ocorrencias restantes de campo.value=mesVigente(): {restante} (esperada: 1)')
    return novo


def patch_c_d(texto):
    """PATCH C + D – CSS de seguranca + overflow/word-break."""
    # Se ja existe, pular
    if 'pV16OverlaySafe' in texto:
        print('  [C+D] Ja existe pV16OverlaySafe. Nada a fazer.')
        return texto

    bloco_css = (
        '<style id="pV16OverlaySafe">\n'
        '  /* PATCH V16-C – seguranca contra overlays presos */\n'
        '  #p141Saida:not(.on) { display: none !important; }\n'
        '  #p139Trava:not(.on) { display: none !important; }\n'
        '  /* PATCH V16-D – overflow e quebra de linha no Centro de Custos */\n'
        '  #tab-custo { overflow-x: hidden; word-break: break-word; }\n'
        '  .custo-dashboard-card { overflow: hidden; word-break: break-word; }\n'
        '  .lanc-obra-group, .lanc-table { overflow-x: auto; }\n'
        '  .custo-sub-painel { overflow-x: auto; word-break: break-word; }\n'
        '</style>\n'
    )

    # Detectar newline da regiao do </head>
    pos_head = texto.find('</head>')
    if pos_head == -1:
        print('  [C+D] ERRO – </head> nao encontrado!')
        return False

    regiao = texto[max(0, pos_head - 200):pos_head + 50]
    if '\r\n' in regiao:
        nl = '\r\n'
    else:
        nl = '\n'

    # Inserir antes de </head> com newline
    novo = texto[:pos_head] + bloco_css.replace('\n', nl) + nl + texto[pos_head:]

    verif = novo.count('pV16OverlaySafe')
    print(f'  [C+D] Inserido antes de </head>. Verificacao: {verif}x')
    return novo


# ── MAIN ───────────────────────────────────────────────────────────

def main():
    print('=' * 60)
    print('PATCH V16 – Correcoes Centro de Custos (comprehensive)')
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

    # ── Aplicar PATCH A ─────────────────────────────────────────────
    print('\n--- PATCH A: getCustosFiltered global ---')
    res_a = patch_a(texto)
    if res_a is False:
        print('  PATCH A FALHOU – restaurando backup.')
        escrever_raw(ARQ, ler_raw(BAK))
        sys.exit(1)
    texto = res_a
    print('  PATCH A OK')

    # ── Aplicar PATCH B ─────────────────────────────────────────────
    print('\n--- PATCH B: ajustarMesCusto sem forcar mes ---')
    res_b = patch_b(texto)
    if res_b is False:
        print('  PATCH B FALHOU – restaurando backup.')
        escrever_raw(ARQ, ler_raw(BAK))
        sys.exit(1)
    texto = res_b
    print('  PATCH B OK')

    # ── Aplicar PATCH C + D ────────────────────────────────────────
    print('\n--- PATCH C+D: CSS seguranca + overflow ---')
    res_cd = patch_c_d(texto)
    if res_cd is False:
        print('  PATCH C+D FALHOU – restaurando backup.')
        escrever_raw(ARQ, ler_raw(BAK))
        sys.exit(1)
    texto = res_cd
    print('  PATCH C+D OK')

    # ── Escrita final (binario) ────────────────────────────────────
    novo_raw = texto.encode('utf-8')
    escrever_raw(ARQ, novo_raw)
    novo_tam = os.path.getsize(ARQ)
    print(f'\nArquivo salvo: {novo_tam:,} bytes (delta: {novo_tam - tamanho:+,})')

    # ── Checagem de integridade ─────────────────────────────────────
    check = ler_raw(ARQ).decode('utf-8')
    assert '<html' in check[:2000], 'Integridade: <html> sumiu!'
    assert '</html>' in check[-2000:], 'Integridade: </html> sumiu!'
    assert 'window.getCustosFiltered = getCustosFiltered' in check, 'Integridade: PATCH A ausente!'
    assert check.count('campo.value = mesVigente()') <= 1, 'Integridade: PATCH B pode ter falhado!'
    assert 'pV16OverlaySafe' in check, 'Integridade: PATCH C+D ausente!'
    print('Checagem de integridade OK')

    print('\n' + '=' * 60)
    print('PATCH V16 aplicado com sucesso!')
    print('=' * 60)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'\nERRO INESPERADO: {e}')
        traceback.print_exc()
        sys.exit(1)
