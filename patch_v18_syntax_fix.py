# -*- coding: utf-8 -*-
"""
PATCH V18 — Correcao dos dois SyntaxErrors que bloqueiam o JS
=============================================================

ERRO 1 (PATCH87 CSS array): 3 strings sem virgula + 1 duplicata
ERRO 2 (PATCH128 IIFE): fechamento } /* /PATCH154_DISABLED */ prematuro

Uso (Windows):
  python patch_v18_syntax_fix.py
"""

import os, re, shutil

BASE = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS'
ARQ  = 'index.html'
CAMINHO = os.path.join(BASE, ARQ)
BACKUP = CAMINHO + '.v18bak'

def main():
    if not os.path.isfile(CAMINHO):
        print(f'[V18] ERRO: arquivo nao encontrado: {CAMINHO}')
        return

    shutil.copy2(CAMINHO, BACKUP)
    print(f'[V18] Backup: {BACKUP}')

    with open(CAMINHO, 'rb') as f:
        raw = f.read()
    texto = raw.decode('utf-8')
    orig = len(texto)
    print(f'[V18] Lido: {orig} chars')

    patches = 0
    NL = chr(10)

    # ============================================================
    # PATCH H — Corrigir array CSS do PATCH87
    # Abordagem dinamica: encontrar o bloco exato, processar cada
    # linha, remover a duplicata v2 e adicionar virgulas.
    # ============================================================
    p87 = texto.find('p87Estilo')
    if p87 > 0:
        area = texto[p87:p87 + 5000]
        # Encontrar inicio: linha '#p87Fundo{...'
        s = area.find("'#p87Fundo{position:fixed")
        if s >= 0:
            # Encontrar fim: depois da linha ease-out}'
            ease = area.find('ease-out}', s)
            e = area.find(NL, ease) + 1 if ease >= 0 else -1
            if e > s:
                bloco = area[s:e]
                # Processar linhas
                linhas = bloco.split(NL)
                novas = []
                skip = False
                for ln in linhas:
                    # Pular comentario + string duplicada (v2)
                    if 'PATCH_cadastroAdmin_v2' in ln:
                        skip = True
                        continue
                    if skip and "'#p87Caixa{position:fixed" in ln:
                        skip = False
                        continue
                    skip = False
                    # Adicionar virgula onde falta
                    st = ln.rstrip()
                    if st.endswith("}'") and not st.endswith("}',") and not st.endswith("}';"):
                        ln = st + ',' + (NL if ln.endswith(NL) else '')
                    novas.append(ln)
                novo_bloco = NL.join(novas)
                if bloco != novo_bloco:
                    abs_s = p87 + s
                    abs_e = p87 + e
                    texto = texto[:abs_s] + novo_bloco + texto[abs_e:]
                    patches += 1
                    print('[V18-H] Bloco PATCH87 corrigido (virgulas + duplicata)')
                else:
                    print('[V18-H] SKIP: sem mudancas necessarias')
            else:
                print('[V18-H] SKIP: fim do bloco nao encontrado')
        else:
            print('[V18-H] SKIP: #p87Fundo nao encontrado')
    else:
        print('[V18-H] SKIP: p87Estilo nao encontrado')

    # ============================================================
    # PATCH I — Corrigir IIFE do PATCH128
    # ============================================================
    # I1: remover } /* /PATCH154_DISABLED */ prematuro, abrir IIFE
    pad_i1 = re.compile(
        r'\}\s*/\*\s*/PATCH154_DISABLED\s*\*/\s*\n(\s*)var K_SESS'
    )
    m1 = pad_i1.search(texto)
    if m1:
        ind = m1.group(1) or '  '
        fix1 = "(function () {'use strict';" + NL + ind + 'var K_SESS'
        texto = texto[:m1.start()] + fix1 + texto[m1.end():]
        patches += 1
        print('[V18-I1] IIFE aberto, fechamento prematuro removido')
    else:
        print('[V18-I1] SKIP')

    # I2: reorganizar fechamentos
    pad_i2 = re.compile(
        r'(\n(\s*)\}\)\(\);)\s*\n\s*\}\s*/\*\s*/PATCH154_DISABLED\s*\*/\s*\n(\s*</script>)'
    )
    m2 = pad_i2.search(texto)
    if m2:
        ind2 = m2.group(2) or '  '
        fix2 = (NL + ind2 + '})();' +
                NL + '} /* /PATCH154_DISABLED */' +
                NL + m2.group(3))
        texto = texto[:m2.start()] + fix2 + texto[m2.end():]
        patches += 1
        print('[V18-I2] Fechamentos reorganizados')
    else:
        print('[V18-I2] SKIP')

    # ============================================================
    # Sanity
    # ============================================================
    if "',," in texto:
        texto = texto.replace("',,", "',")
        print('[V18] Virgula dupla corrigida')

    novo = len(texto)
    print(f'\n[V18] {orig} -> {novo} chars (delta: {novo - orig})')
    print(f'[V18] Patches: {patches}')

    if patches == 0:
        print('[V18] NENHUM patch aplicado.')
        return

    with open(CAMINHO, 'wb') as f:
        f.write(texto.encode('utf-8'))
    print(f'[V18] Gravado com sucesso!')
    print()
    print('=' * 60)
    print('PROXIMOS PASSOS:')
    print('1. Feche TODAS as abas do index.html no navegador')
    print('2. Ctrl+Shift+Delete para limpar cache')
    print('3. Abra o arquivo novamente')
    print('4. Verifique no Console se SyntaxError sumiu')
    print('5. Verifique se codigo JS visivel sumiu')
    print('6. Verifique se "lancado R$ 0,00" mudou')
    print('=' * 60)

if __name__ == '__main__':
    main()
