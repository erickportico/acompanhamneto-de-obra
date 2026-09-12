"""
patch_v21.py – Emergencia: corrige PAGINA EM BRANCO
==================================================

CAUSA RAIZ: o bloco PATCH128 <script> tem fechamentos prematuros:

  Linha 7:  { return; }
  Linha 8:  })();            <-- IIFE fecha AQUI (prematuro!)
  Linha 9:  } /* /PATCH154_DISABLED */  <-- wrapper fecha AQUI (prematuro!)
  Linha 11+: var K_SESS = ... <-- codigo orfao fora de qualquer bloco
  Linha 441: })();            <-- orfao, causa SyntaxError (depth = -1)
  Linha 442: } /* /PATCH154_DISABLED */  <-- orfao, depth = -2

Correcao: remover os fechamentos prematuros nas linhas 8-9.
A IIFE permanece aberta e o codigo de login (K_SESS, entrar(), etc.)
fica dentro dela. Os fechamentos corretos ja existem nas linhas 441-442.

Resultado: chaves balanceadas (177/177), depth chega a 0.

Correcoes adicionais:
  FIX2: Remove stubs P146 fora de <script> (texto visivel)
  FIX3: CSS de seguranca
  FIX4: Limpeza DOM runtime
  FIX5: Centro de Custos recalculo

Uso:
  python patch_v21.py
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

def find_matching_brace(text, start):
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return i + 1
        i += 1
    return None

def is_inside_tag(text, pos, tag_name):
    last_open_match = None
    pattern = re.compile(r'<' + tag_name + r'[\s>]', re.IGNORECASE)
    for m in pattern.finditer(text, 0, pos):
        last_open_match = m
    if last_open_match is None:
        return False
    tag_text = text[last_open_match.start():last_open_match.end() + text[last_open_match.end():].find('>')]
    if tag_name.lower() == 'script' and re.search(r'\bsrc\s*=', tag_text, re.IGNORECASE):
        no_src = re.compile(r'<script(?![^>]*\bsrc\s*=)[\s>]', re.IGNORECASE)
        last_no_src = None
        for m3 in no_src.finditer(text, 0, pos):
            last_no_src = m3
        if last_no_src is None:
            return False
        last_open_match = last_no_src
    last_close = text.rfind('</' + tag_name, 0, pos)
    if last_close < 0:
        return True
    return last_open_match.start() > last_close

# --- MAIN ---
def main():
    print('=== patch_v21 (emergencia – corrige pagina em branco) ===')
    raw = read()
    print(f'Tamanho original: {len(raw):,} bytes')

    crlf = b'\r\n' in raw
    sep  = '\r\n' if crlf else '\n'
    text = raw.decode('utf-8', errors='replace')
    print(f'Fim de linha: {"CRLF" if crlf else "LF"}')

    fixes = 0

    # ================================================================
    # FIX 1 – CRITICO: Remover fechamentos prematuros no PATCH128
    # ================================================================
    # O padrao exato que causa o bug (3 linhas no inicio do bloco):
    #   if (window.__P128)
    #   { return; }
    #   })();
    #   } /* /PATCH154_DISABLED */
    #
    # Correcao: remover as linhas "})();" e "} /* /PATCH154_DISABLED */"
    # mantendo apenas o guard "if (window.__P128) { return; }"
    # A IIFE continua aberta e o codigo de login fica dentro dela.
    # Os fechamentos corretos ja existem no final do bloco:
    #   })();
    #   } /* /PATCH154_DISABLED */

    m128 = re.search(r'<!--\s*PATCH128_LOGIN_NO_SERVIDOR\s*-->', text)
    if m128:
        script_search_start = m128.end()
        script_open = text.find('<script>', script_search_start)
        if script_open >= 0:
            content_start = script_open + len('<script>')
            # Search in the first 600 chars of the script for the premature closures
            early_area = text[content_start:content_start + 600]
            # The exact pattern: { return; } followed by newline, })(); followed by newline, } /* /PATCH154_DISABLED */
            premature_pattern = re.compile(
                r'\{\s*return;\s*\}'
                r'\s*\n\s*\}\)\(\);?\s*\n\s*\}\s*/\*\s*/PATCH154_DISABLED\s*\*/',
                re.MULTILINE
            )
            m_prem = premature_pattern.search(early_area)
            if m_prem:
                # Keep just the guard: { return; } + newline
                # Remove: })(); and } /* /PATCH154_DISABLED */
                guard_text = '{ return; }' + sep
                abs_pos = content_start + m_prem.start()
                line_num = text[:abs_pos].count('\n') + 1
                print(f'[FIX1] Encontrado fechamento prematuro no PATCH128 perto da linha ~{line_num}')
                print(f'       Padrao: {repr(m_prem.group()[:80])}...')
                # Replace the full match with just the guard
                replacement = guard_text
                text = text[:content_start] + early_area[:m_prem.start()] + replacement + early_area[m_prem.end():] + text[content_start + 600:]
                print('[FIX1] Removido })(); prematuro e } /* /PATCH154_DISABLED */ prematuro')
                print('[FIX1] IIFE agora permanece aberta – codigo de login fica dentro')
                fixes += 1
            else:
                print('[FIX1] Padrao de fechamento prematuro nao encontrado – pode ja estar corrigido')
        else:
            print('[FIX1] Tag <script> nao encontrada apos comentario PATCH128')
    else:
        print('[FIX1] Comentario PATCH128 nao encontrado')

    # ================================================================
    # FIX 2 – Remover stubs P146 fora de <script>
    # ================================================================
    p146_positions = []
    for m in re.finditer(r'window\.P146\s*=\s*\{', text):
        pos = m.start()
        in_script = is_inside_tag(text, pos, 'script')
        in_style  = is_inside_tag(text, pos, 'style')
        if not in_script and not in_style:
            p146_positions.append(pos)

    if p146_positions:
        print(f'[FIX2] Encontrados {len(p146_positions)} stub(s) P146 fora de <script>')
        replacements = []
        for pos in p146_positions:
            pre = text[max(0, pos-500):pos]
            comment_match = re.search(r'/\*[^*]*\*/\s*$', pre)
            comment_start = pos
            if comment_match:
                comment_start = pos - len(comment_match.group())
            while comment_start > 0 and text[comment_start-1] in ' \t\r\n':
                if text[comment_start-1] == '\n':
                    comment_start -= 1
                    break
                comment_start -= 1

            brace_open = text.find('{', pos)
            if brace_open < 0: continue
            brace_close = find_matching_brace(text, brace_open)
            if brace_close is None: continue

            end = brace_close
            while end < len(text) and text[end] in ' \t\r\n':
                end += 1
            if end < len(text) and text[end] == ';':
                end += 1

            replacements.append((comment_start, end))

        for start, end in sorted(replacements, reverse=True):
            text = text[:start] + text[end:]
            fixes += 1
        print(f'[FIX2] {len(replacements)} stub(s) P146 removido(s)')
    else:
        print('[FIX2] Nenhum stub P146 fora de <script>')

    # ================================================================
    # FIX 3 – CSS de seguranca
    # ================================================================
    safety_css = (
        '<style id="v21SafetyCSS">'
        '#p84Fundo,#p84Impressao,#p83Fundo,#p83Impressao,'
        '#p86Fundo,#p86Caixa,#p92Fundo,#p92Caixa'
        '{display:none!important}'
        '</style>'
    )

    head_match = re.search(r'<head[^>]*>', text, re.IGNORECASE)
    if head_match:
        insert_pos = head_match.end()
        if 'v21SafetyCSS' in text:
            print('[FIX3] CSS de seguranca v21 ja presente')
        elif 'v20SafetyCSS' in text:
            text = text.replace('id="v20SafetyCSS"', 'id="v21SafetyCSS"')
            print('[FIX3] CSS atualizado de v20 para v21')
            fixes += 1
        elif 'v19SafetyCSS' in text:
            text = text.replace('id="v19SafetyCSS"', 'id="v21SafetyCSS"')
            print('[FIX3] CSS atualizado de v19 para v21')
            fixes += 1
        else:
            text = text[:insert_pos] + '\n' + safety_css + text[insert_pos:]
            print('[FIX3] CSS de seguranca v21 injetado')
            fixes += 1

    # ================================================================
    # FIX 4 – Limpeza DOM runtime
    # ================================================================
    # Using raw string (r'...') to avoid Python interpreting JS regex escapes.
    # Fixed: nextNode() with parentheses.
    cleanup_js = (
        '<script id="v21Cleanup">'
        '(function(){'
        'function clean(){'
        'var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);'
        'var n,r=[];'
        r'while(n=w.nextNode()){'
        r'var t=n.textContent;'
        r'if(/(window\.P[0-9]+[ \t\r\n\f]*=|janelaImpressao|imprimirJanela|function[ \t\r\n\f]+exportar|function[ \t\r\n\f]+importar|function[ \t\r\n\f]+imprimir|\(function[ \t]*\([ \t]*\)[ \t]*\{|try[ \t]*\{|catch[ \t]*\()/i.test(t))'
        'r.push(n);'
        '}'
        'r.forEach(function(nd){try{nd.parentNode.removeChild(nd)}catch(e){}});'
        'var els=document.querySelectorAll("#p84Fundo,#p84Impressao,#p83Fundo");'
        'for(var i=0;i<els.length;i++){if(els[i].style.display!=="flex")els[i].style.display="none";}'
        '}'
        'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",clean);}'
        'else{clean();}'
        'setTimeout(clean,500);setTimeout(clean,2000);setTimeout(clean,5000);'
        '})();'
        '</script>'
    )

    body_match = re.search(r'<body[^>]*>', text, re.IGNORECASE)
    if body_match:
        insert_pos = body_match.end()
        # Remover scripts de limpeza anteriores
        for old_id in ['v19Cleanup', 'v20Cleanup']:
            old_pattern = re.compile(
                r'<script id="' + old_id + r'">.*?</script>',
                re.DOTALL | re.IGNORECASE
            )
            if old_pattern.search(text):
                text = old_pattern.sub(lambda m: '', text, count=1)
                print(f'[FIX4] Script de limpeza {old_id} removido')
                fixes += 1

        if 'v21Cleanup' not in text:
            text = text[:insert_pos] + '\n' + cleanup_js + text[insert_pos:]
            print('[FIX4] Script de limpeza DOM v21 injetado apos <body>')
            fixes += 1
        else:
            print('[FIX4] Script de limpeza v21 ja presente')

    # ================================================================
    # FIX 5 – Centro de Custos recalculo
    # ================================================================
    cc_js = (
        '<script id="v21CCFix">'
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
        '}catch(e){console.warn("v21 cc recalc",e);}'
        '}'
        'setTimeout(recalcCC,1000);setTimeout(recalcCC,3000);'
        '})();'
        '</script>'
    )

    body_end_match = re.search(r'</body>', text, re.IGNORECASE)
    if body_end_match:
        insert_pos = body_end_match.start()
        # Remover patches CC anteriores
        for old_id in ['v19CCFix', 'v20CCFix']:
            old_pattern = re.compile(
                r'<script id="' + old_id + r'">.*?</script>',
                re.DOTALL | re.IGNORECASE
            )
            if old_pattern.search(text):
                text = old_pattern.sub(lambda m: '', text, count=1)
                print(f'[FIX5] Patch CC {old_id} removido')
                fixes += 1

        if 'v21CCFix' not in text:
            text = text[:insert_pos] + '\n' + cc_js + '\n' + text[insert_pos:]
            print('[FIX5] Patch Centro de Custos v21 injetado')
            fixes += 1
        else:
            print('[FIX5] Patch Centro de Custos v21 ja presente')

    # ================================================================
    # Validacao: verificar balanceamento de chaves no PATCH128
    # ================================================================
    m128 = re.search(r'<!--\s*PATCH128_LOGIN_NO_SERVIDOR\s*-->', text)
    if m128:
        script_open = text.find('<script>', m128.end())
        if script_open >= 0:
            content_start = script_open + len('<script>')
            content_end = text.find('</script>', content_start)
            block = text[content_start:content_end]
            opens = block.count('{')
            closes = block.count('}')
            if opens == closes:
                print(f'[VALIDACAO] PATCH128: {{ = {opens}, }} = {closes} – BALANCEADO ✓')
            else:
                print(f'[VALIDACAO] PATCH128: {{ = {opens}, }} = {closes} – AINDA DESBALANCEADO! (dif = {closes - opens})')

    # ================================================================
    # Gravar resultado
    # ================================================================
    encoded = text.encode('utf-8')
    write(encoded)
    print(f'\nTamanho apos patch: {len(encoded):,} bytes')
    print(f'Correcoes aplicadas: {fixes}')

    # Git
    sh('git add index.html')
    sh('git commit -m "v21: EMERGENCIA - corrige pagina em branco (PATCH128 premature IIFE close + orphan brace SyntaxError), remove P146 visible stubs, safety CSS v21, DOM cleanup v21, CC recalc v21"')
    sh('git push')
    print('=== Concluido ===')

if __name__ == '__main__':
    main()