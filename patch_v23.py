import os, shutil

# patch_v23.py - Elimina flash da tela de login PATCH128 e limpa lixo de patches antigos
#
# ALTERACOES:
#   1. WRAP PATCH128 IIFE ativo em if(false){/*PATCH154_DISABLED*/}  (ROOT CAUSE do flash)
#   2. NEUTRALIZA v21Cleanup (remover nos textuais destrutivos)
#   3. ADICIONA #p128Tela,#p128Estilo ao v21SafetyCSS display:none!important (safety net)
#   4. REMOVE p154Remocao style vazio + script de log (inutil)
#   5. ATUALIZA comentario PATCH154 P128 DESABILITADO para refletir a realidade
#
# USO:  python patch_v23.py
# Arquivo: C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html
# Leitura/escrita BINARIA (rb/wb) obrigatoria - CRLF preservado.

ARQUIVO = os.path.join(
    os.environ.get('USERPROFILE', r'C:\Users\OBRAS 8'),
    'Desktop',
    'ACOMPANHAMENTO DE OBRAS',
    'index.html'
)

def main():
    # ---------- backup ----------
    bak = ARQUIVO + '.bak.v23'
    if not os.path.exists(bak):
        shutil.copy2(ARQUIVO, bak)
        print(f'[v23] Backup criado: {bak}')
    else:
        print(f'[v23] Backup ja existe: {bak}')

    # ---------- leitura binaria ----------
    with open(ARQUIVO, 'rb') as f:
        raw = f.read()

    original_len = len(raw)
    print(f'[v23] Arquivo lido: {original_len:,} bytes')

    patches_aplicados = []

    # ===== 1. WRAP PATCH128 IIFE ATIVO em if(false){} =====
    p128_comment = b'<!-- PATCH128_LOGIN_NO_SERVIDOR -->'
    p128_pos = raw.find(p128_comment)
    if p128_pos < 0:
        print('[v23] ERRO: Comentario PATCH128_LOGIN_NO_SERVIDOR nao encontrado!')
        return

    iife_marker = b'(function () {'
    iife_start = raw.find(iife_marker, p128_pos)
    if iife_start < 0:
        print('[v23] ERRO: IIFE do PATCH128 nao encontrada!')
        return

    # Verificar que NAO esta dentro de if(false)
    pre_check = raw[max(0, iife_start - 500):iife_start]
    if b'if(false)' in pre_check or b'if (false)' in pre_check:
        print('[v23] AVISO: PATCH128 IIFE ja dentro de if(false) - pulando')
    else:
        iife_close = raw.find(b'})();', iife_start)
        if iife_close < 0:
            print('[v23] ERRO: Fechamento })(); nao encontrado!')
            return
        iife_end = iife_close + len(b'})();')

        indent = b'\r\n        '
        prefix = b'if(false){/*PATCH154_DISABLED*/' + indent
        suffix = b'\r\n        } /* /PATCH154_DISABLED */'

        raw = raw[:iife_start] + prefix + raw[iife_start:iife_end] + suffix + raw[iife_end:]
        patches_aplicados.append(
            f'1. PATCH128 IIFE desabilitada com if(false) (pos {iife_start})'
        )
        print(f'[v23] PATCH128 IIFE desabilitada (pos {iife_start})')

    # ===== 2. NEUTRALIZAR v21Cleanup =====
    v21c_marker = b'<script id="v21Cleanup">'
    v21c_start = raw.find(v21c_marker)
    if v21c_start < 0:
        print('[v23] AVISO: v21Cleanup nao encontrado')
    else:
        v21c_end = raw.find(b'</script>', v21c_start) + len(b'</script>')
        replacement = b'<script id="v21Cleanup">/* v23: removido - removia nos de texto de scripts */</script>'
        raw = raw[:v21c_start] + replacement + raw[v21c_end:]
        patches_aplicados.append('2. v21Cleanup neutralizado')
        print('[v23] v21Cleanup neutralizado')

    # ===== 3. ADICIONAR #p128Tela,#p128Estilo ao v21SafetyCSS =====
    old_safety = b'#p92Caixa{display:none!important}'
    new_safety = b'#p92Caixa,#p128Tela,#p128Estilo{display:none!important}'
    if old_safety in raw:
        raw = raw.replace(old_safety, new_safety, 1)
        patches_aplicados.append('3. #p128Tela,#p128Estilo no v21SafetyCSS')
        print('[v23] v21SafetyCSS atualizado com #p128Tela,#p128Estilo')
    else:
        print('[v23] AVISO: Seletor p92Caixa nao encontrado no v21SafetyCSS')

    # ===== 4. REMOVER p154Remocao style vazio + script =====
    p154r_style = b'<style id="p154Remocao">'
    p154r_pos = raw.find(p154r_style)
    if p154r_pos < 0:
        print('[v23] AVISO: p154Remocao nao encontrado')
    else:
        p154r_style_end = raw.find(b'</style>', p154r_pos) + len(b'</style>')
        p154r_script_start = raw.find(b'<script>', p154r_style_end)
        p154r_script_end = raw.find(b'</script>', p154r_script_start) + len(b'</script>')

        block_start = p154r_pos
        while block_start > 0 and raw[block_start-1:block_start] in (b'\r', b'\n', b' ', b'\t'):
            block_start -= 1
        block_end = p154r_script_end

        raw = raw[:block_start] + raw[block_end:]
        patches_aplicados.append('4. p154Remocao removido (style+script)')
        print('[v23] p154Remocao removido')

    # ===== 5. ATUALIZAR comentario P128 DESABILITADO =====
    old_cmt = b'PATCH154: P128 DESABILITADO'
    new_cmt = b'PATCH154+V23: P128 DESABILITADO (agora efetivamente)'
    if old_cmt in raw:
        raw = raw.replace(old_cmt, new_cmt, 1)
        patches_aplicados.append('5. Comentario P128 atualizado')
        print('[v23] Comentario P128 DESABILITADO atualizado')

    # ---------- escrita binaria ----------
    with open(ARQUIVO, 'wb') as f:
        f.write(raw)

    novo_len = len(raw)
    print(f'\n[v23] Arquivo salvo: {novo_len:,} bytes (delta: {novo_len - original_len:+,})')
    print(f'[v23] Patches aplicados: {len(patches_aplicados)}')
    for desc in patches_aplicados:
        print(f'  - {desc}')

if __name__ == '__main__':
    main()
