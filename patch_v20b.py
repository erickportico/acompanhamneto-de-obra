"""
patch_v20b.py – Complementa o v20 que travou no FIX4
=====================================================
O v20 aplicou FIX1a, FIX1b, FIX2 e FIX3 com sucesso,
mas travou no FIX4 (re.sub com bad escape).
Este script aplica FIX4 e FIX5 com a correcao do regex.

Correcao: usar lambda no re.sub para evitar que o Python
interprete as barras invertidas do JS como escapes de regex.

Uso:
  python patch_v20b.py
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

# --- MAIN ---
def main():
    print('=== patch_v20b (complemento v20) ===')
    raw = read()
    print(f'Tamanho original: {len(raw):,} bytes')

    crlf = b'\r\n' in raw
    sep  = '\r\n' if crlf else '\n'
    text = raw.decode('utf-8', errors='replace')
    print(f'Fim de linha: {"CRLF" if crlf else "LF"}')

    fixes = 0

    # ================================================================
    # FIX 4 – Limpeza DOM: remove nos de texto com codigo JS visivel
    # ================================================================
    # Este script contem regex JS com \d e \s, que quebram o
    # re.sub() se passados como string de substituicao direta.
    # Solucao: usar lambda para retornar a string literalmente.
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

    # Verificar se v19Cleanup existe e precisa ser substituido
    v19_pattern = re.compile(
        r'<script id="v19Cleanup">.*?</script>',
        re.DOTALL | re.IGNORECASE
    )
    v19_match = v19_pattern.search(text)

    if v19_match:
        # Usar lambda para evitar bad escape
        text = v19_pattern.sub(lambda m: cleanup_js, text, count=1)
        print('[FIX4] Script de limpeza v19 substituido por v20')
        fixes += 1
    elif 'v20Cleanup' not in text:
        # Inserir apos <body>
        body_match = re.search(r'<body[^>]*>', text, re.IGNORECASE)
        if body_match:
            insert_pos = body_match.end()
            text = text[:insert_pos] + '\n' + cleanup_js + text[insert_pos:]
            print('[FIX4] Script de limpeza DOM v20 injetado apos <body>')
            fixes += 1
        else:
            print('[FIX4] ERRO: tag <body> nao encontrada')
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

    # Verificar se v19CCFix existe
    v19_cc_pattern = re.compile(
        r'<script id="v19CCFix">.*?</script>',
        re.DOTALL | re.IGNORECASE
    )
    v19_cc_match = v19_cc_pattern.search(text)

    if v19_cc_match:
        # Usar lambda aqui tambem por seguranca
        text = v19_cc_pattern.sub(lambda m: cc_js, text, count=1)
        print('[FIX5] Patch Centro de Custos v19 substituido por v20')
        fixes += 1
    elif 'v20CCFix' not in text:
        # Inserir antes de </body>
        body_end_match = re.search(r'</body>', text, re.IGNORECASE)
        if body_end_match:
            insert_pos = body_end_match.start()
            text = text[:insert_pos] + '\n' + cc_js + '\n' + text[insert_pos:]
            print('[FIX5] Patch Centro de Custos v20 injetado antes de </body>')
            fixes += 1
        else:
            print('[FIX5] ERRO: tag </body> nao encontrada')
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
    sh('git commit -m "v20b: completa v20 (FIX4 DOM cleanup + FIX5 CC recalc) - corrige bad escape no re.sub"')
    sh('git push')
    print('=== Concluido ===')

if __name__ == '__main__':
    main()