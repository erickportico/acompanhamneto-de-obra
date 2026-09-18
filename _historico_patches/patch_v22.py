import os, re, sys

# =====================================================================
# patch_v22.py — Três correções para index.html
#   1) PATCH128 SyntaxError: remove fechamento prematuro do IIFE
#      })(); } /* /PATCH154_DISABLED */ que aparece cedo demais
#   2) Tema: --bg #f4f6fa → #ffffff (fundo branco limpo)
#   3) Inputs pagamento: bg #f8fafc (slate-50, dentro do pFixUiPgto)
# =====================================================================

FILE = os.path.join(
    r'C:\Users\OBRAS 8\Desktop',
    'ACOMPANHAMENTO DE OBRAS',
    'index.html'
)

# ---- leitura binária (obrigatório) --------------------------------
with open(FILE, 'rb') as f:
    raw = f.read()

txt = raw.decode('utf-8')
orig_len = len(txt)

# =====================================================================
# 1) PATCH128 — remover })();\n} /* /PATCH154_DISABLED */ prematuro
# =====================================================================
# Estrutura original (BUG):
#   script
#   if (true) {                              abre PATCH154 wrapper
#   (function () {                           abre IIFE
#     use strict
#     if (window.__P128)
#     { return; }
#   })();                                    BUG: fecha IIFE cedo
#   }  /PATCH154_DISABLED                    BUG: fecha if(true) cedo
#     var K_SESS = ...                        codigo fica GLOBAL
#     ... todo o PATCH128 ...
#   })();                                    orfao
#   }  /PATCH154_DISABLED                    orfao
#   /script
#
# CORREÇÃO: remover as linhas 8-9 do bloco (o fechamento prematuro).
# O IIFE continua com todo o código e fecha corretamente no final.
# =====================================================================

premature_close = '})();\n} /* /PATCH154_DISABLED */\n\n  var K_SESS'
continue_code   = '\n  var K_SESS'

pos1 = txt.find(premature_close)
if pos1 < 0:
    print('[PATCH128] AVISO: trecho prematuro nao encontrado (ja corrigido?)')
else:
    txt = txt[:pos1] + continue_code + txt[pos1 + len(premature_close):]
    print('[PATCH128] SyntaxError corrigido — fechamento prematuro removido (pos %d)' % pos1)

# =====================================================================
# 2) Tema — fundo da página branco
# =====================================================================
# Current : --bg: #f4f6fa  (cinza slate → margens visíveis)
# Desired : --bg: #ffffff  (branco limpo, sem margens coloridas)
# =====================================================================

old_bg = '--bg: #f4f6fa'
new_bg = '--bg: #ffffff'

pos2 = txt.find(old_bg)
if pos2 < 0:
    print('[TEMA] AVISO: --bg: #f4f6fa nao encontrado (ja alterado?)')
else:
    # Trocar apenas na primeira ocorrência (seção :root do tema claro)
    txt = txt[:pos2] + new_bg + txt[pos2 + len(old_bg):]
    print('[TEMA] --bg alterado de #f4f6fa → #ffffff (pos %d)' % pos2)

# =====================================================================
# 3) Inputs no lanc-form-grid — fundo slate-50 (#f8fafc)
# =====================================================================
# Na screenshot atual, os inputs aparecem com bg #e2e8f0 (slate-200).
# O grid tem bg #f8fafc (slate-50). Para harmonizar, forçamos
# input/select dentro do grid para #f8fafc via pFixUiPgto.
# =====================================================================

pfix_id = 'id="pFixUiPgto"'
pfix_pos = txt.find(pfix_id)
if pfix_pos < 0:
    print('[INPUT-BG] AVISO: <style id="pFixUiPgto"> nao encontrado')
else:
    close_pos = txt.find('</style>', pfix_pos)
    if close_pos < 0:
        print('[INPUT-BG] ERRO: </style> nao encontrado apos pFixUiPgto')
    else:
        new_rule = (
            '#tab-pagamento .lanc-form-grid input,'
            '#tab-pagamento .lanc-form-grid select'
            '{background:#f8fafc!important;}'
        )
        txt = txt[:close_pos] + new_rule + txt[close_pos:]
        print('[INPUT-BG] Regra input/select bg:#f8fafc adicionada no pFixUiPgto')

# =====================================================================
# Validação
# =====================================================================
final_len = len(txt)
if final_len < orig_len * 0.95:
    print('[ERRO] Resultado menor que 95%% do original (%d vs %d) — abortando' % (final_len, orig_len))
    sys.exit(1)

print('[OK] Tamanho: %d → %d (diff: %+d)' % (orig_len, final_len, final_len - orig_len))

# ---- gravação binária (obrigatório) --------------------------------
with open(FILE, 'wb') as f:
    f.write(txt.encode('utf-8'))

print('[patch_v22] Salvo em %s' % FILE)
print()
print('=== COMANDOS GIT ===')
print('git add index.html')
print('git commit -m "v22: fix PATCH128 SyntaxError + tema branco + input bg slate-50"')
print('git push')
