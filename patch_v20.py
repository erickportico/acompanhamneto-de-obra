"""
patch_v20.py – Corrige codigo JS visivel na tela (P146 stub fora de <script>)
=============================================================================

Problemas corrigidos:
  1. CODIGO VISIVEL: window.P146 = { registrar: function () {}, ... } aparece
     como texto visivel na tela porque esta FORA de uma tag <script> no HTML.
     O stub foi inserido por um patch anterior (v11) entre os comentarios
     <!-- FIM PATCH145 --> e <!-- INI PATCH147 --> sem envolver em <script>.
     O browser renderiza o JS cru como texto.

     CORRECAO: scanner generico que encontra QUALQUER codigo JS fora de
     <script>/<style> e o remove (se for stub redundante) ou envolve
     em <script>...</script>. Tambem remove duplicatas.

  2. PATCH128 orphan braces (mesma correcao do v19, caso nao tenha sido aplicada).

  3. CSS de seguranca - força overlays a ficarem ocultos mesmo se JS falhar.

  4. Limpeza DOM - remove nos de texto com codigo JS visivel (band-aid).

  5. Centro de Custos - recalculo se cartoes mostram R$ 0,00.

Uso:
  python patch_v20.py
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

# --- Helpers ---
def find_matching_brace(text, start):
    """A partir da posicao `start` (que aponta para '{'), conta chaves
    balanceadas e retorna a posicao logo apos o '}' que fecha."""
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return None

def is_inside_tag(text, pos, tag_name):
    """Retorna True se `pos` esta dentro de <tag_name>...</tag_name>.
    Funciona com <script>, <script type="text/javascript"> e <script src=...>.
    Para <script src=...> (externo), o conteudo NAO esta dentro de script."""
    # Encontrar o ultimo <tag_name ...> antes de pos
    # Distinguir entre <script ...> (abertura com corpo) e <script ... /> ou <script src=...>
    pattern = re.compile(r'<' + tag_name + r'[\s>]', re.IGNORECASE)
    last_open_match = None
    for m in pattern.finditer(text, 0, pos):
        last_open_match = m

    if last_open_match is None:
        return False

    # Verificar se a tag e auto-fechante ou externa (src=)
    # Pegar o conteudo da tag de abertura ate >
    tag_text = text[last_open_match.start():last_open_match.end() + text[last_open_match.end():].find('>')]

    # Para <script src=...>: o conteudo entre <script src> e </script> NAO e JS inline
    if tag_name.lower() == 'script' and re.search(r'\bsrc\s*=', tag_text, re.IGNORECASE):
        # Script externo - nao consideramos o conteudo como "dentro de script"
        # So se pos estiver DEPOIS de um <script> sem src e ANTES de </script>
        # Buscar a ultima tag <script> sem src
        no_src_pattern = re.compile(r'<script(?![^>]*\bsrc\s*=)[\s>]', re.IGNORECASE)
        last_no_src = None
        for m2 in no_src_pattern.finditer(text, 0, pos):
            last_no_src = m2
        if last_no_src is None:
            return False
        last_open_match = last_no_src

    last_close = text.rfind('</' + tag_name, 0, pos)
    if last_close < 0:
        return True
    return last_open_match.start() > last_close

# --- MAIN ---
def main():
    print('=== patch_v20 ===')
    raw = read()
    print(f'Tamanho original: {len(raw):,} bytes')

    crlf = b'\r\n' in raw
    sep  = '\r\n' if crlf else '\n'
    text = raw.decode('utf-8', errors='replace')
    lines = text.split(sep)
    print(f'Linhas: {len(lines)} | Fim de linha: {"CRLF" if crlf else "LF"}')

    fixes = 0

    # ================================================================
    # FIX 1a – Buscar e remover stubs P146 fora de <script>
    # ================================================================
    p146_positions = []
    for m in re.finditer(r'window\.P146\s*=\s*\{', text):
        pos = m.start()
        in_script = is_inside_tag(text, pos, 'script')
        in_style  = is_inside_tag(text, pos, 'style')
        if not in_script and not in_style:
            p146_positions.append(pos)

    if p146_positions:
        print(f'[FIX1a] Encontrados {len(p146_positions)} stub(s) P146 fora de <script>')
        replacements = []
        for pos in p146_positions:
            # Verificar se ha comentario /* ... */ antes do window.P146
            pre = text[max(0, pos-500):pos]
            comment_match = re.search(r'/\*[^*]*\*/\s*$', pre)
            comment_start = pos
            if comment_match:
                comment_start = pos - len(comment_match.group())

            # Incluir linhas em branco anteriores
            while comment_start > 0 and text[comment_start-1] in ' \t\r\n':
                if text[comment_start-1] == '\n':
                    comment_start -= 1
                    break
                comment_start -= 1

            # Encontrar o { de abertura e o } correspondente
            brace_open = text.find('{', pos)
            if brace_open < 0:
                continue
            brace_close = find_matching_brace(text, brace_open)
            if brace_close is None:
                continue

            # Avançar pastel whitespace e ;
            end = brace_close
            while end < len(text) and text[end] in ' \t\r\n':
                end += 1
            if end < len(text) and text[end] == ';':
                end += 1

            block = text[comment_start:end]
            line_num = text[:comment_start].count('\n') + 1
            print(f'  Stub P146 na linha {line_num}: {repr(block[:150])}…')
            replacements.append((comment_start, end, block))

        # Remover do final para o começo (nao deslocar offsets)
        for start, end, block in sorted(replacements, reverse=True):
            text = text[:start] + text[end:]
            fixes += 1
        print(f'[FIX1a] {len(replacements)} stub(s) P146 removido(s)')
    else:
        print('[FIX1a] Nenhum stub P146 fora de <script> encontrado')

    # ================================================================
    # FIX 1b – Scanner generico: qualquer codigo JS fora de <script>/<style>
    # ================================================================
    # Padroes que indicam codigo JS visivel:
    js_line_patterns = [
        re.compile(r'window\.P\d+\s*=\s*\{'),       # window.Pxxx = {
        re.compile(r'\(function\s*\(\s*\)\s*\{'),   # (function () {
        re.compile(r'window\.\w+\s*=\s*function'),     # window.xxx = function
        re.compile(r'console\.\w+\('),                      # console.xxx(
        re.compile(r'\bvar\s+\w+\s*='),                    # var xxx =
        re.compile(r'\blet\s+\w+\s*='),                    # let xxx =
        re.compile(r'\bconst\s+\w+\s*='),                  # const xxx =
        re.compile(r'try\s*\{'),                            # try {
        re.compile(r'catch\s*\(\s*\w+\s*\)\s*\{'), # catch (e) {
        re.compile(r'function\s+\w+\s*\('),               # function name(
    ]

    # Padroes que NAO sao JS orfao (falsos positivos)
    false_positive_patterns = [
        re.compile(r'on(click|blur|change|focus|input|keydown|keyup|mouseover|mouseout|load|error|submit)=', re.IGNORECASE),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'<script', re.IGNORECASE),
        re.compile(r'<!--'),
        re.compile(r'-->'),
        re.compile(r'data-\w+=', re.IGNORECASE),
        re.compile(r'\bclass\s*='),
        re.compile(r'\bid\s*='),
        re.compile(r'\bstyle\s*='),
    ]

    lines = text.split(sep)
    in_script = False
    in_style = False
    orphan_block_start = None
    orphan_lines = []
    lines_to_remove = set()

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Rastrear abertura/fechamento de tags (SEM trailing |)
        if re.search(r'<script[\s>]', stripped, re.IGNORECASE):
            in_script = True
        if re.search(r'</script\s*>', stripped, re.IGNORECASE):
            in_script = False
        if re.search(r'<style[\s>]', stripped, re.IGNORECASE):
            in_style = True
        if re.search(r'</style\s*>', stripped, re.IGNORECASE):
            in_style = False

        if in_script or in_style:
            # Entrou em script/style – finalizar qualquer bloco orfao pendente
            if orphan_lines:
                orphan_text = sep.join(l for _, l in orphan_lines)
                has_js = any(p.search(orphan_text) for p in js_line_patterns)
                if has_js:
                    for ol_idx, _ in orphan_lines:
                        lines_to_remove.add(orphan_block_start + ol_idx)
                    ln_s = orphan_block_start + 1
                    ln_e = orphan_block_start + len(orphan_lines)
                    print(f'[FIX1b] Bloco JS orfao removido: linhas {ln_s}-{ln_e}')
                    fixes += 1
                orphan_lines = []
                orphan_block_start = None
            continue

        # Fora de script/style
        if not stripped:
            # Linha em branco – manter, nao interrompe bloco orfao
            continue

        # Verificar se a linha parece codigo JS
        is_js_line = any(p.search(stripped) for p in js_line_patterns)
        is_js_comment = bool(re.match(r'/\*.*\*/', stripped))
        is_js_close = bool(re.match(r'\}\s*;?\s*$', stripped))
        is_js_close2 = bool(re.match(r'\}\);\s*$', stripped))  # });

        # Filtrar falsos positivos
        is_false_positive = any(fp.search(stripped) for fp in false_positive_patterns)

        if (is_js_line or is_js_comment or is_js_close or is_js_close2) and not is_false_positive:
            if orphan_block_start is None:
                orphan_block_start = i
            orphan_lines.append((i - orphan_block_start, line))
        else:
            # Linha normal de HTML – finalizar bloco orfao
            if orphan_lines:
                orphan_text = sep.join(l for _, l in orphan_lines)
                has_js = any(p.search(orphan_text) for p in js_line_patterns)
                if has_js:
                    for ol_idx, _ in orphan_lines:
                        lines_to_remove.add(orphan_block_start + ol_idx)
                    ln_s = orphan_block_start + 1
                    ln_e = orphan_block_start + len(orphan_lines)
                    print(f'[FIX1b] Bloco JS orfao removido: linhas {ln_s}-{ln_e}')
                    fixes += 1
                orphan_lines = []
                orphan_block_start = None

    # Finalizar bloco orfao restante
    if orphan_lines:
        orphan_text = sep.join(l for _, l in orphan_lines)
        has_js = any(p.search(orphan_text) for p in js_line_patterns)
        if has_js:
            for ol_idx, _ in orphan_lines:
                lines_to_remove.add(orphan_block_start + ol_idx)
            ln_s = orphan_block_start + 1
            ln_e = orphan_block_start + len(orphan_lines)
            print(f'[FIX1b] Bloco JS orfao removido: linhas {ln_s}-{ln_e}')
            fixes += 1

    if lines_to_remove:
        new_lines = [l for i, l in enumerate(lines) if i not in lines_to_remove]
        lines = new_lines
        print(f'[FIX1b] Total: {len(lines_to_remove)} linha(s) orfa(s) removida(s)')
    else:
        print('[FIX1b] Nenhum bloco JS orfao encontrado')

    text = sep.join(lines)

    # ================================================================
    # FIX 2 – PATCH128 orphan braces (mesma logica do v19)
    # ================================================================
    lines = text.split(sep)
    fix2_done = False

    for i in range(len(lines) - 1, 0, -1):
        s = lines[i].strip()
        if s.startswith('}') and 'PATCH154' in s and 'DISABLED' in s:
            found_iife_opener = False
            for j in range(max(0, i - 5), i):
                if '(function' in lines[j] and '{' in lines[j]:
                    found_iife_opener = True
                    break
            if found_iife_opener:
                found_close = False
                for k in range(i, min(i + 500, len(lines))):
                    if '</script>' in lines[k]:
                        found_close = True
                        break
                if found_close:
                    orphan_closing = None
                    for k in range(i + 1, min(i + 500, len(lines))):
                        s2 = lines[k].strip()
                        if s2 == '})();':
                            s3 = lines[k+1].strip() if k+1 < len(lines) else ''
                            if s3.startswith('}') and 'PATCH154' in s3:
                                orphan_closing = k
                                orphan_brace = k + 1
                                break
                    if orphan_closing is not None:
                        print(f'[FIX2] Linha {i+1}: fechamento prematuro "}}" encontrado')
                        old_line = lines[i]
                        new_line = old_line.replace('}', '/* removed premature close */', 1)
                        lines[i] = new_line
                        print(f'[FIX2] Linha {i+1}: removido }} prematuro')
                        fix2_done = True
                        fixes += 1
                        break

    if not fix2_done:
        print('[FIX2] Padrao PATCH128 orphan braces nao encontrado – ja corrigido ou ausente')

    text = sep.join(lines)

    # ================================================================
    # FIX 3 – CSS de seguranca apos <head>
    # ================================================================
    safety_css = (
        '<style id="v20SafetyCSS">'
        '#p84Fundo,#p84Impressao,#p83Fundo,#p83Impressao,'
        '#p86Fundo,#p86Caixa,#p92Fundo,#p92Caixa'
        '{display:none!important}'
        '</style>'
    )

    head_match = re.search(r'<head[^>]*>', text, re.IGNORECASE)
    if head_match:
        insert_pos = head_match.end()
        if 'v20SafetyCSS' not in text and 'v19SafetyCSS' not in text:
            text = text[:insert_pos] + '\n' + safety_css + text[insert_pos:]
            print('[FIX3] CSS de seguranca injetado apos <head>')
            fixes += 1
        elif 'v19SafetyCSS' in text:
            text = text.replace('id="v19SafetyCSS"', 'id="v20SafetyCSS"')
            print('[FIX3] CSS de seguranca atualizado de v19 para v20')
            fixes += 1
        else:
            print('[FIX3] CSS de seguranca v20 ja presente')

    # ================================================================
    # FIX 4 – Limpeza DOM: remove nos de texto com codigo JS visivel
    # ================================================================
    cleanup_js = (
        '<script id="v20Cleanup">'
        '(function(){'
        'function clean(){'
        'var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);'
        'var n,r=[];'
        'while(n=w.nextNode){'
        'var t=n.textContent;'
        'if(/(window\\.P\\d+\\s*=|janelaImpressao|imprimirJanela|function\\s+exportar|function\\s+importar|function\\s+imprimir|\\(function\\s*\\(\\s*\\)\\s*\\{|try\\s*\\{|catch\\s*\\()/i.test(t))'
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
        if 'v19Cleanup' in text:
            v19_pattern = re.compile(
                r'<script id="v19Cleanup">.*?</script>',
                re.DOTALL | re.IGNORECASE
            )
            text = v19_pattern.sub(cleanup_js, text, count=1)
            print('[FIX4] Script de limpeza v19 substituido por v20')
            fixes += 1
        elif 'v20Cleanup' not in text:
            text = text[:insert_pos] + '\n' + cleanup_js + text[insert_pos:]
            print('[FIX4] Script de limpeza DOM v20 injetado apos <body>')
            fixes += 1
        else:
            print('[FIX4] Script de limpeza v20 ja presente')

    # ================================================================
    # FIX 5 – Centro de Custos: recalculo se cartoes mostram R$ 0,00
    # ================================================================
    cc_js = (
        '<script id="v20CCFix">'
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
        '}catch(e){console.warn("v20 cc recalc",e);}'
        '}'
        'setTimeout(recalcCC,1000);setTimeout(recalcCC,3000);'
        '})();'
        '</script>'
    )

    body_end_match = re.search(r'</body>', text, re.IGNORECASE)
    if body_end_match:
        insert_pos = body_end_match.start()
        if 'v19CCFix' in text:
            v19_cc_pattern = re.compile(
                r'<script id="v19CCFix">.*?</script>',
                re.DOTALL | re.IGNORECASE
            )
            text = v19_cc_pattern.sub(cc_js, text, count=1)
            print('[FIX5] Patch Centro de Custos v19 substituido por v20')
            fixes += 1
        elif 'v20CCFix' not in text:
            text = text[:insert_pos] + '\n' + cc_js + '\n' + text[insert_pos:]
            print('[FIX5] Patch Centro de Custos v20 injetado antes de </body>')
            fixes += 1
        else:
            print('[FIX5] Patch Centro de Custos v20 ja presente')

    # ================================================================
    # Gravar resultado
    # ================================================================
    encoded = text.encode('utf-8')
    write(encoded)
    print(f'Tamanho apos patch: {len(encoded):,} bytes')
    print(f'Correcoes aplicadas: {fixes}')

    # Git
    sh('git add index.html')
    sh('git commit -m "v20: remove P146 stub outside script tag (visible JS text), generic orphan JS scanner, PATCH128 brace fix, safety CSS, DOM cleanup, CC recalc"')
    sh('git push')
    print('=== Concluido ===')

if __name__ == '__main__':
    main()