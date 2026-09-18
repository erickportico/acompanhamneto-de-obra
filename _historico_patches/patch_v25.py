#!/usr/bin/env python3
"""
PATCH 125 - Corrige tooltip #p120Dica que fica preso na tela
----------------------------------------------------------
Problema: a tooltip do grafico de rosca (Centro de Custos) aparece
e NAO desaparece quando o mouse sai do canvas. Fica flutuando,
cobrindo conteudo, ate o usuario recarregar a pagina.

Causas possiveis:
  1) mouseleave NAO dispara se o usuario rola a pagina (scroll)
  2) mouseleave NAO dispara se troca de aba enquanto o tooltip
     esta visivel (tab-custo vira display:none)
  3) mouseleave NAO dispara se algo causa re-render (pintar)
     enquanto o mouse esta sobre o canvas

Correcoes aplicadas:
  A) Auto-hide timer na funcao dica(): 3 segundos sem
     receber um novo dica(texto,ev) => tooltip desaparece
  B) dica('') no inicio de pintar() => tooltip some antes
     de redesenhar os graficos
  C) MutationObserver em #tab-custo => se display vira 'none',
     esconde a tooltip imediatamente
  D) Listener global de scroll => esconde tooltip ao rolar

Uso:
  python patch_v25.py

O script le index.html em modo binario (rb), aplica as trocas
e salva de volta (wb). Faca git add + commit + push depois.
"""

import os, shutil, sys

# -----------------------------------------------------------------
# Caminho do arquivo - ajuste se necessario
# -----------------------------------------------------------------
ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')

# Backup automatico
BKP = ARQUIVO + '.v25-bkp'

def main():
    if not os.path.isfile(ARQUIVO):
        print(f'ERRO: nao encontrei {ARQUIVO}')
        print('Coloque patch_v25.py na mesma pasta do index.html e rode novamente.')
        sys.exit(1)

    # Backup
    shutil.copy2(ARQUIVO, BKP)
    print(f'Backup salvo em {BKP}')

    with open(ARQUIVO, 'rb') as f:
        data = f.read()

    original = data
    trocas = 0

    # =================================================================
    # TROCA 1 - Funcao dica(): adiciona auto-hide timer de 3s
    # =================================================================
    old_dica_hide = b"if (!texto) { d.style.display = 'none'; return; }"
    new_dica_hide = (
        b"if (!texto) { d.style.display = 'none'; clearTimeout(d._p120t); return; }\n"
        b"            clearTimeout(d._p120t);\n"
        b"            d._p120t = setTimeout(function(){ d.style.display='none'; }, 3000);"
    )

    if old_dica_hide in data:
        data = data.replace(old_dica_hide, new_dica_hide, 1)
        trocas += 1
        print('[OK] Troca 1 - auto-hide timer de 3s na funcao dica()')
    else:
        print('[AVISO] Troca 1 - padrao nao encontrado')
        print('  Procurando por trecho alternativo...')
        alt = b"if (!texto) { d.style.display = 'none';"
        if alt in data:
            idx = data.find(alt)
            end = data.find(b'return; }', idx)
            if end != -1:
                old_chunk = data[idx:end + len(b'return; }')]
                new_chunk = (
                    b"if (!texto) { d.style.display = 'none'; clearTimeout(d._p120t); return; }\n"
                    b"            clearTimeout(d._p120t);\n"
                    b"            d._p120t = setTimeout(function(){ d.style.display='none'; }, 3000);"
                )
                data = data[:idx] + new_chunk + data[end + len(b'return; }'):]
                trocas += 1
                print('[OK] Troca 1 (alternativa) - auto-hide timer de 3s')
        else:
            print('[ERRO] Troca 1 - nao consegui aplicar. Abortando.')
            shutil.copy2(BKP, ARQUIVO)
            sys.exit(1)

    # =================================================================
    # TROCA 2 - Funcao pintar(): chama dica('') antes de redesenhar
    # =================================================================
    old_pintar = b"function pintar() {\n            var area = document.getElementById('p120Area');\n            if (!area || !area.offsetParent) { return; }"
    new_pintar = b"function pintar() {\n            dica('');\n            var area = document.getElementById('p120Area');\n            if (!area || !area.offsetParent) { return; }"

    if old_pintar in data:
        data = data.replace(old_pintar, new_pintar, 1)
        trocas += 1
        print('[OK] Troca 2 - dica(\\) no inicio de pintar()')
    else:
        print('[AVISO] Troca 2 - padrao nao encontrado')

    # =================================================================
    # TROCA 3 - Injeta codigo de protecao global ANTES de FIM PATCH120
    # =================================================================
    patch_guard = (
        b"\n"
        b"\n"
        b"          /* --- PATCH125: protecao contra tooltip preso --- */\n"
        b"          (function(){\n"
        b"            'use strict';\n"
        b"\n"
        b"            /* Esconde tooltip quando #tab-custo fica display:none */\n"
        b"            var tabCusto = document.getElementById('tab-custo');\n"
        b"            if (tabCusto && window.MutationObserver) {\n"
        b"              var mo = new MutationObserver(function(){\n"
        b"                if (tabCusto.style.display === 'none') { dica(''); }\n"
        b"              });\n"
        b"              mo.observe(tabCusto, { attributes: true, attributeFilter: ['style'] });\n"
        b"            }\n"
        b"\n"
        b"            /* Esconde tooltip ao rolar a pagina */\n"
        b"            window.addEventListener('scroll', function(){ dica(''); }, true);\n"
        b"\n"
        b"            /* Esconde tooltip em qualquer clique fora do canvas */\n"
        b"            document.addEventListener('mousedown', function(ev){\n"
        b"              var t = ev.target;\n"
        b"              var isCanvas = t && (t.id === 'p120Rosca' || t.id === 'p120Rank' || t.id === 'p120Evol');\n"
        b"              if (!isCanvas) { dica(''); }\n"
        b"            }, true);\n"
        b"          })();\n"
    )

    marker = b'<!-- FIM PATCH120 -->'
    if marker in data:
        idx = data.find(marker)
        data = data[:idx] + patch_guard + data[idx:]
        trocas += 1
        print('[OK] Troca 3 - protecao global injetada antes de FIM PATCH120')
    else:
        print('[AVISO] Troca 3 - marcador FIM PATCH120 nao encontrado')

    # =================================================================
    # Salvar
    # =================================================================
    if data == original:
        print()
        print('Nenhuma troca foi aplicada - arquivo inalterado.')
        print('Verifique se o index.html e a versao correta (com PATCH120).')
        os.remove(BKP)
        sys.exit(1)

    with open(ARQUIVO, 'wb') as f:
        f.write(data)

    print()
    print(f'{trocas} troca(s) aplicada(s) com sucesso em index.html')
    print()
    print('=== PROXIMOS PASSOS ===')
    print()
    print('1. Rode ANTES o patch_v23.py (se ainda nao rodou):')
    print('     python patch_v23.py')
    print()
    print('2. Depois rode ESTE patch:')
    print('     python patch_v25.py')
    print()
    print('3. Confira no navegador: abra Centro de Custos,')
    print('   passe o mouse na rosca, tire o mouse, role a pagina,')
    print('   troque de aba - a tooltip DEVE desaparecer em 3s max.')
    print()
    print('4. Se tudo OK, commit + push:')
    print('     git add index.html')
    print('     git commit -m "PATCH125: corrige tooltip preso no Centro de Custos"')
    print('     git push')

if __name__ == '__main__':
    main()
