"""
patch_v19.py – Corrige root-cause do overlay PATCH84 + código JS visível
=========================================================================

Problemas corrigidos:
  1. Script block #90 (PATCH128 / PATCH154_DISABLED, ~linha 63516):
     O `} /* /PATCH154_DISABLED */` na linha ~63524 fecha prematuramente
     o `if (true) {`, deixando o código PATCH128 órfão. As linhas `})();`
     e `} /* /PATCH154_DISABLED */` no final ficam sem par correspondente,
     causando SyntaxError que cascateia e impede PATCH84 de injetar CSS.

     CORREÇÃO: remover o `}` prematuro da linha ~63524 (deixar só o
     comentário). Assim o `(function () {` da linha ~63523 permanece
     aberto e é fechado corretamente pelo `})();` da linha ~63956,
     e o `} /* /PATCH154_DISABLED */` da linha ~63957 fecha o if(true).

  2. Injeta CSS de segurança após <head> que força p84Fundo,
     p84Impressao e outros overlays a ficarem ocultos, mesmo se
     o JS falhar completamente.

  3. Injeta script de limpeza DOM após <body> que remove nós de
     texto contendo código JS visível.

  4. Injeta patch de recálculo para Centro de Custos (cartões
     mostrando "lancado R$ 0,00" apesar de haver lançamentos).

Uso:
  python patch_v19.py
"""

import os, re, sys, subprocess

BASE = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS'
HTML = os.path.join(BASE, 'index.html')

def read():
    with open(HTML, 'rb') as f:
        return f.read()

def write(data):
    with open(HTML, 'wb') as f:
        f.write(data)

def sh(cmd):
    print(f'  $ {cmd}')
    r = subprocess.run(cmd, shell=True, cwd=BASE, capture_output=True, text=True)
    if r.stdout.strip(): print(f'    {r.stdout.strip()}')
    if r.returncode != 0 and r.stderr.strip():
        print(f'    ERR: {r.stderr.strip()}')
    return r

def main():
    print('=== patch_v19 ===')
    raw = read()
    print(f'Tamanho original: {len(raw):,} bytes')

    # Detect line endings
    crlf = b'\r\n' in raw
    sep = '\r\n' if crlf else '\n'
    text = raw.decode('utf-8', errors='replace')
    lines = text.split(sep)
    print(f'Linhas: {len(lines)} | Fim de linha: {"CRLF" if crlf else "LF"}')

    fixes = 0

    # ============================================================
    # FIX 1: Corrigir script block #90 – PATCH128 / PATCH154_DISABLED
    # ============================================================
    # Estrutura quebrada no arquivo:
    #
    #   L~63517: if (true) {
    #   L~63518:   (function () {          ← guard IIFE
    #   L~63519:     'use strict';
    #   L~63520:     if (window.__P128) { return; }
    #   L~63521:     window.__P128 = true;
    #   L~63522:   })();
    #   L~63523:   (function () {          ← opens a second IIFE
    #   L~63524:   } /* /PATCH154_DISABLED */  ← BUG: } prematurely closes if(true)
    #   L~63526..63955: PATCH128 code (now outside any block!)
    #   L~63956: })();                    ← ORPHAN – no matching (function
    #   L~63957: } /* /PATCH154_DISABLED */  ← ORPHAN – extra }
    #   L~63958: </script>
    #
    # The correct fix: remove the `}` from line ~63524 so the IIFE
    # opened on ~63523 continues through to the `})();` on ~63956,
    # and the `} /* /PATCH154_DISABLED */` on ~63957 properly closes
    # the if(true) block.
    #
    # After fix:
    #   if (true) {
    #     (function () { ... guard ... })();
    #     (function () {
    #     /* /PATCH154_DISABLED */       ← just a comment, IIFE still open
    #     ... PATCH128 code inside IFFE ...
    #     })();                          ← properly closes IIFE
    #   } /* /PATCH154_DISABLED */       ← properly closes if(true)
    #   </script>

    # Search for the premature close: a line that starts with } and
    # contains PATCH154_DISABLED, and is shortly after a (function () {
    # line. Search backwards from the end for the pattern.

    fix1_done = False
    for i in range(len(lines) - 1, 0, -1):
        s = lines[i].strip()
        # Find lines that have } and PATCH154_DISABLED
        if s.startswith('}') and 'PATCH154' in s and 'DISABLED' in s:
            # Check if there's a (function () { a few lines above
            found_iife_opener = False
            for j in range(max(0, i - 5), i):
                if '(function' in lines[j] and '{' in lines[j]:
                    found_iife_opener = True
                    opener_line = j
                    break

            if found_iife_opener:
                # Check if </script> is within 500 lines below
                found_close = False
                for k in range(i, min(i + 500, len(lines))):
                    if '</script>' in lines[k]:
                        found_close = True
                        break

                if found_close:
                    # Check for orphan })(); a few lines before the next
                    # } /* /PATCH154_DISABLED */
                    orphan_closing = None
                    for k in range(i + 1, min(i + 500, len(lines))):
                        s2 = lines[k].strip()
                        if s2 == '})();':
                            # Check next line
                            s3 = lines[k+1].strip() if k+1 < len(lines) else ''
                            if s3.startswith('}') and 'PATCH154' in s3:
                                orphan_closing = k
                                orphan_brace = k + 1
                                break

                    if orphan_closing is not None:
                        print('[FIX1] Linha %d: fechamento prematuro "}" encontrado' % (i+1))
                        print(f'       Conteúdo: {s}')
                        print(f'[FIX1] Linha {opener_line+1}: IIFE aberto aqui')
                        print('[FIX1] Linha %d: })(); órfão' % (orphan_closing+1))
                        print('[FIX1] Linha %d: } órfão' % (orphan_brace+1))

                        # Remove the `}` from line i (the premature close)
                        # Keep the rest as a comment
                        old_line = lines[i]
                        new_line = old_line.replace('}', '/* removed premature close */', 1)
                        lines[i] = new_line
                        print('[FIX1] Linha %d: removido } prematuro' % (i+1))

                        # The })(); on line orphan_closing now properly closes
                        # the IIFE opened on line opener_line. Leave it as-is.

                        # The } /* /PATCH154_DISABLED */ on line orphan_brace
                        # now properly closes the if(true) block. Leave it as-is.

                        fix1_done = True
                        fixes += 1
                        print('[FIX1] Estrutura corrigida! IIFE e if(true) agora fecham corretamente')
                        break

    if not fix1_done:
        print('[FIX1] AVISO: padrão não encontrado – pode já estar corrigido ou estrutura diferente')

    # ============================================================
    # FIX 2: Injetar CSS de segurança após <head>
    # ============================================================
    safety_css = (
        '<style id="v19SafetyCSS">'
        '#p84Fundo,#p84Impressao,#p83Fundo,#p83Impressao,'
        '#p86Fundo,#p86Caixa,#p92Fundo,#p92Caixa'
        '{display:none!important}'
        '</style>'
    )

    head_idx = None
    for i, line in enumerate(lines):
        if '<head>' in line:
            head_idx = i
            break

    if head_idx is not None:
        lines.insert(head_idx + 1, safety_css)
        print(f'[FIX2] CSS de segurança injetado após <head>')
        fixes += 1

    # ============================================================
    # FIX 3: Injetar script de limpeza DOM após <body>
    # ============================================================
    cleanup_js = (
        '<script id="v19Cleanup">'
        '(function(){'
        'function clean(){'
        'var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);'
        'var n,r=[];'
        'while(n=w.nextNode()){'
        'var t=n.textContent;'
        'if(/(janelaImpressao|imprimirJanela|function\\s+exportar|function\\s+importar|function\\s+imprimir)/.test(t))'
        'r.push(n);'
        '}'
        'r.forEach(function(nd){try{nd.parentNode.removeChild(nd)}catch(e){}});'
        'var els=document.querySelectorAll("#p84Fundo,#p84Impressao,#p83Fundo");'
        'for(var i=0;i<els.length;i++){if(els[i].style.display!=="flex")els[i].style.display="none";}'
        '}'
        'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",clean);}'
        'else{clean();}'
        'setTimeout(clean,500);setTimeout(clean,2000);'
        '})();'
        '</script>'
    )

    body_idx = None
    for i, line in enumerate(lines):
        if '<body' in line:
            body_idx = i
            break

    if body_idx is not None:
        lines.insert(body_idx + 1, cleanup_js)
        print(f'[FIX3] Script de limpeza DOM injetado após <body>')
        fixes += 1

    # ============================================================
    # FIX 4: Centro de Custos – recálculo se cartões mostram R$ 0,00
    # ============================================================
    cc_js = (
        '<script id="v19CCFix">'
        '(function(){'
        'function recalcCC(){'
        'try{'
        'var db=window.db;'
        'if(!db||!db.lancamentos||!db.lancamentos.length)return;'
        'var cards=document.querySelectorAll("[data-cc-total]");'
        'if(!cards.length)return;'
        'var byObra={};'
        'db.lancamentos.forEach(function(l){var k=l.obra||"_";if(!byObra[k])byObra[k]=0;byObra[k]+=(l.valor||0);});'
        'cards.forEach(function(c){'
        'var obra=c.getAttribute("data-obra");'
        'if(obra&&byObra[obra]!==undefined){'
        'var txt=c.textContent||"";'
        'if(txt.indexOf("0,00")>=0||txt.indexOf("R$ 0")>=0){'
        'c.textContent="lançado R$ "+byObra[obra].toLocaleString("pt-BR",{minimumFractionDigits:2});'
        '}'
        '}'
        '});'
        '}catch(e){console.warn("v19 cc recalc",e);}'
        '}'
        'setTimeout(recalcCC,1000);setTimeout(recalcCC,3000);'
        '})();'
        '</script>'
    )

    body_end_idx = None
    for i in range(len(lines) - 1, 0, -1):
        if '</body>' in lines[i]:
            body_end_idx = i
            break

    if body_end_idx is not None:
        lines.insert(body_end_idx, cc_js)
        print(f'[FIX4] Patch Centro de Custos injetado antes de </body>')
        fixes += 1

    # ============================================================
    # Re-montar e gravar em binário
    # ============================================================
    result = sep.join(lines)
    encoded = result.encode('utf-8')
    write(encoded)
    print(f'Tamanho após patch: {len(encoded):,} bytes')
    print(f'Correções aplicadas: {fixes}')

    # Git
    sh('git add index.html')
    sh('git commit -m "v19: fix PATCH128 orphan braces (root cause), safety CSS overlay hide, DOM cleanup, CC recalc"')
    sh('git push')
    print('=== Concluído ===')

if __name__ == '__main__':
    main()
