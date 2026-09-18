#!/usr/bin/env python3
"""
PATCH 163b - Ocultar/Mostrar + Valores em branco quando sem Profissional/Ajudante
Versao b: usa regex flexivel, mais robusto contra patches anteriores.

Funcionalidades:
  1. Quando um lancamento NAO tem Profissional ou Ajudante, VAL.PROF/VAL.AJUD mostra "---" (em-dash) e NAO soma nos totais
  2. Botao ocultar/mostrar (👁) por linha - linhas ocultas ficam riscadas e excluidas dos totais visiveis do tfoot
  3. Corrige bug raiz: || 1 vira || 0 para que divisao por zero nao gere valores fantasma

USO: python patch163b_ocultar_blank_values.py [caminho_do_index.html]
Se nao passar caminho, usa o padrao.

IMPORTANTE: Se o patch163 anterior quebrou a pagina, voce pode rodar este patch diretamente
- ele detecta e limpa a injecao quebrada do patch163 automaticamente.
Mas se preferir, restaure o backup primeiro para maior seguranca.
"""
import sys, os, re

DEFAULT_PATH = r"C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html"

def read_file(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8", errors="replace") as f:
        f.write(content)

EM_DASH = "\u2014"  # —

def regex_sub(c, label, pattern, replacement, count=1, flags=0):
    n = re.subn(pattern, replacement, c, count=count, flags=flags)
    if n[1] > 0:
        print(f"  + {label} ({n[1]} substituicao)")
        return n[0], True
    else:
        print(f"  x {label} - PADRAO NAO ENCONTRADO")
        print(f"    Busca: {pattern[:120]}...")
        return c, False

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    if not os.path.isfile(path):
        print(f"ERRO: arquivo nao encontrado: {path}")
        sys.exit(1)
    
    c = read_file(path)
    orig_len = len(c)
    print(f"Arquivo lido: {orig_len:,} caracteres")
    
    # ===== PRE-CHECK: Idempotency =====
    if 'patch163bOcultarJS' in c:
        print("\nAVISO: patch163b ja parece aplicado (encontrado patch163bOcultarJS).")
        print("Nenhuma alteracao sera feita.")
        sys.exit(0)
    
    # ===== CLEANUP: Remove broken patch163 injection (if present) =====
    broken_patterns = [
        (r'\n*<!--\s*PATCH\s+163(?!\s*b)[^-]*?-->\n*', '', "cleanup: broken patch163 start comment"),
        (r'\n*<style\s+id="patch163Ocultar">.*?</style>\n*', '', "cleanup: broken patch163 CSS"),
        (r'\n*<script\s+id="patch163OcultarJS">.*?</script>\n*', '', "cleanup: broken patch163 JS"),
        (r'\n*<!--\s*FIM\s+PATCH\s+163(?!\s*b)[^-]*?-->\n*', '', "cleanup: broken patch163 end comment"),
    ]
    cleanup_count = 0
    for pat, rep, label in broken_patterns:
        n = re.subn(pat, rep, c, flags=re.DOTALL)
        if n[1] > 0:
            c = n[0]
            cleanup_count += n[1]
            print(f"  ~ {label} ({n[1]} remocao)")
    
    if cleanup_count > 0:
        print(f"  Limpeza do patch163 quebrado: {cleanup_count} itens removidos")
    
    ok = 0
    fail = 0
    
    # ===== ITEM 1: autoImportarItensPgto — zerar valorProf/valorAjud =====
    c, r = regex_sub(c, "1a. autoImport valorProf=0",
        r"(valorProf:\s*)parseFloat\(\s*\(m2\s*\*\s*6\)\s*\.toFixed\s*\(\s*2\s*\)\s*\)",
        r"\g<1>0")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "1b. autoImport valorAjud=0",
        r"(valorAjud:\s*)parseFloat\(\s*\(m2\s*\*\s*4\)\s*\.toFixed\s*\(\s*2\s*\)\s*\)",
        r"\g<1>0")
    ok += r; fail += not r
    
    # ===== ITEM 2: salvarLancamentoPgto — numProf/numAjud || 0 =====
    c, r = regex_sub(c, "2a. salvar numProf || 0",
        r"(const\s+numProf\s*=\s*profIds\.length\s*\|\|\s*)1(\s*;)",
        r"\g<1>0\g<2>")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "2b. salvar numAjud || 0",
        r"(const\s+numAjud\s*=\s*ajudIds\.length\s*\|\|\s*)1(\s*;)",
        r"\g<1>0\g<2>")
    ok += r; fail += not r
    
    # ===== ITEM 3: salvar — valorProf com guarda =====
    c, r = regex_sub(c, "3a. salvar valorProf ternary",
        r"(valorProf:\s*)m2\s*\*\s*taxaProf\s*/\s*numProf(,)",
        r"\g<1>numProf > 0 ? m2 * taxaProf / numProf : 0,")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "3b. salvar valorAjud ternary",
        r"(valorAjud:\s*)m2\s*\*\s*taxaAjud\s*/\s*numAjud(,)",
        r"\g<1>numAjud > 0 ? m2 * taxaAjud / numAjud : 0,")
    ok += r; fail += not r
    
    # ===== ITEM 4: editarLancamentoPgto — numProf/numAjud || 0 =====
    c, r = regex_sub(c, "4a. editar numProf || 0",
        r"(const\s+numProf\s*=\s*lanc\.profissionais\.length\s*\|\|\s*)1(\s*;)",
        r"\g<1>0\g<2>")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "4b. editar numAjud || 0",
        r"(const\s+numAjud\s*=\s*lanc\.ajudantes\.length\s*\|\|\s*)1(\s*;)",
        r"\g<1>0\g<2>")
    ok += r; fail += not r
    
    # ===== ITEM 5: editar — valorProf/valorAjud com guarda =====
    c, r = regex_sub(c, "5a. editar valorProf ternary",
        r"(lanc\.valorProf\s*=\s*)lanc\.instalacaoM2\s*\*\s*lanc\.taxaProf\s*/\s*numProf(\s*;)",
        r"\g<1>numProf > 0 ? lanc.instalacaoM2 * lanc.taxaProf / numProf : 0;")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "5b. editar valorAjud ternary",
        r"(lanc\.valorAjud\s*=\s*)lanc\.instalacaoM2\s*\*\s*lanc\.taxaAjud\s*/\s*numAjud(\s*;)",
        r"\g<1>numAjud > 0 ? lanc.instalacaoM2 * lanc.taxaAjud / numAjud : 0;")
    ok += r; fail += not r
    
    # ===== ITEM 6: renderLancamentosPgto — totais com guarda =====
    c, r = regex_sub(c, "6a. renderLanc totais valorProf",
        r"totalValProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf\s*;",
        "if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n                  totalValProf += (l.profissionais || []).length * l.valorProf;")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "6b. renderLanc totais valorAjud",
        r"totalValAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud\s*;",
        "if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n                  totalValAjud += (l.ajudantes || []).length * l.valorAjud;")
    ok += r; fail += not r
    
    # ===== ITEM 7: renderLancamentosPgto — exibir em-dash quando vazio =====
    pat7a = r"html\s*\+=\s*'<td>R\$\s*'\s*\+\s*l\.valorProf\.toLocaleString\('pt-BR',\s*\{minimumFractionDigits:2\}\)\s*\+\s*'</td>';"
    rep7a = ("html += '<td' + ((l.profissionais || []).length > 0 && l.valorProf > 0 ? '' : "
             "' style=\"color:#94a3b8;font-style:italic\"') + '>' + "
             "((l.profissionais || []).length > 0 && l.valorProf > 0 ? 'R$ ' + l.valorProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '" + EM_DASH + "') + '</td>';")
    c, r = regex_sub(c, "7a. renderLanc display valorProf", pat7a, rep7a)
    ok += r; fail += not r
    
    pat7b = r"html\s*\+=\s*'<td>R\$\s*'\s*\+\s*l\.valorAjud\.toLocaleString\('pt-BR',\s*\{minimumFractionDigits:2\}\)\s*\+\s*'</td>';"
    rep7b = ("html += '<td' + ((l.ajudantes || []).length > 0 && l.valorAjud > 0 ? '' : "
             "' style=\"color:#94a3b8;font-style:italic\"') + '>' + "
             "((l.ajudantes || []).length > 0 && l.valorAjud > 0 ? 'R$ ' + l.valorAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '" + EM_DASH + "') + '</td>';")
    c, r = regex_sub(c, "7b. renderLanc display valorAjud", pat7b, rep7b)
    ok += r; fail += not r
    
    # ===== ITEM 8: data-lanc-row no <tr> =====
    pat8 = r"html\s*\+=\s*'<tr>'\s*;\s*html\s*\+=\s*'<td>'\s*\+\s*\(l\.data"
    m8 = re.search(pat8, c)
    if m8:
        tr_pos = c.find("'<tr>'", m8.start(), m8.end() + 10)
        if tr_pos < 0:
            tr_pos = c.find("<tr>", m8.start(), m8.end() + 10)
        if tr_pos >= 0:
            tr_line_start = c.rfind("html += '", m8.start(), tr_pos + 10)
            tr_line_end = c.find(";\n", tr_pos, tr_pos + 30)
            if tr_line_start >= 0 and tr_line_end >= 0:
                old_tr = c[tr_line_start:tr_line_end+1]
                new_tr = "html += '<tr data-lanc-row=\"' + l.id + '\">';"
                c = c[:tr_line_start] + new_tr + c[tr_line_end+1:]
                print(f"  + 8. data-lanc-row")
                ok += 1
            else:
                print(f"  x 8. data-lanc-row - nao encontrou limites da linha <tr>")
                fail += 1
        else:
            print(f"  x 8. data-lanc-row - '<tr>' nao encontrado no contexto")
            fail += 1
    else:
        print(f"  x 8. data-lanc-row - PADRAO NAO ENCONTRADO")
        fail += 1
    
    # ===== ITEM 9: Botao olho (👁) nas acoes =====
    search9 = "editarLancamentoPgto("
    idx9 = 0
    found9 = False
    while True:
        pos = c.find(search9, idx9)
        if pos < 0:
            break
        before = c[max(0, pos-80):pos]
        if 'onclick' in before and 'btn-icon-sm' in before:
            btn_start = before.rfind('<button')
            if btn_start >= 0:
                actual_btn_start = max(0, pos-80) + btn_start
                eye_html = "<button class=\"btn-icon-sm btn-ocultar-lanc\" data-lanc-id=\"' + l.id + '\" onclick=\"toggleOcultarLanc(this,\\'' + l.id + '\\')\" title=\"Ocultar/Mostrar\">\U0001F441</button>"
                c = c[:actual_btn_start] + eye_html + c[actual_btn_start:]
                print(f"  + 9. Botao olho")
                ok += 1
                found9 = True
                break
        idx9 = pos + 1
    
    if not found9:
        print(f"  x 9. Botao olho - PADRAO NAO ENCONTRADO")
        fail += 1
    
    # ===== ITEM 10: renderResumoPgto — totais com guarda =====
    c, r = regex_sub(c, "10a. resumo totalProf",
        r"totalProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf\s*;",
        "if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n                    totalProf += (l.profissionais || []).length * l.valorProf;")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "10b. resumo totalAjud",
        r"totalAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud\s*;",
        "if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n                    totalAjud += (l.ajudantes || []).length * l.valorAjud;")
    ok += r; fail += not r
    
    # ===== ITEM 11: centrosCusto — guarda =====
    c, r = regex_sub(c, "11a. centrosCusto acumular prof",
        r"(acumular\(pid,\s*)l\.valorProf(,\s*\"prof\",\s*l\.data\))",
        r"\g<1>l.valorProf > 0 ? l.valorProf : 0\g<2>")
    ok += r; fail += not r
    
    c, r = regex_sub(c, "11b. centrosCusto acumular ajud",
        r"(acumular\(aid,\s*)l\.valorAjud(,\s*\"ajud\",\s*l\.data\))",
        r"\g<1>l.valorAjud > 0 ? l.valorAjud : 0\g<2>")
    ok += r; fail += not r
    
    # ===== ITEM 12: dashboard — checar array antes de somar =====
    c, r = regex_sub(c, "12. dashboard vp/va",
        r"var\s+vp\s*=\s*num\(l\.valorProf\),\s*va\s*=\s*num\(l\.valorAjud\)",
        "var vp = (lista(l.profissionais).length > 0) ? num(l.valorProf) : 0,\n    va = (lista(l.ajudantes).length > 0) ? num(l.valorAjud) : 0")
    ok += r; fail += not r
    
    # ===== ITEM 13: pagamentos() — checar arrays =====
    c, r = regex_sub(c, "13. pagamentos v",
        r"var\s+v\s*=\s*num\(l\.valorProf\)\s*\+\s*num\(l\.valorAjud\)",
        "var vp = (Array.isArray(l.profissionais) && l.profissionais.length > 0) ? num(l.valorProf) : 0;\n              var va = (Array.isArray(l.ajudantes) && l.ajudantes.length > 0) ? num(l.valorAjud) : 0;\n              var v = vp + va")
    ok += r; fail += not r
    
    # ===== ITEM 14: Injetar CSS + JS antes de </body> =====
    INJECT_CSS = (
        '<style id="patch163bOcultar">\n'
        '.lanc-table tr.lanc-row-oculto{opacity:.35;text-decoration:line-through;color:#94a3b8}\n'
        '.lanc-table tr.lanc-row-oculto td{color:#94a3b8}\n'
        '.btn-ocultar-lanc{position:relative;cursor:pointer}\n'
        ".btn-ocultar-lanc.oculto::after{content:'';position:absolute;top:50%;left:2px;width:calc(100% - 4px);height:2px;background:#ef4444;transform:rotate(-45deg);pointer-events:none;border-radius:1px}\n"
        'body.dark-mode .lanc-table tr.lanc-row-oculto td{color:#475569}\n'
        '</style>'
    )
    
    js_lines = [
        '<script id="patch163bOcultarJS">',
        '(function(){',
        "'use strict';",
        'if(window.__patch163bOcultar)return;',
        'window.__patch163bOcultar=true;',
        "var SK='pgto_lanc_ocultos';",
        "function load(){try{var r=sessionStorage.getItem(SK);return r?JSON.parse(r):{}}catch(e){return{}}}",
        "function save(o){try{sessionStorage.setItem(SK,JSON.stringify(o))}catch(e){}}",
        'window.toggleOcultarLanc=function(btn,lid){',
        "  var tr=btn.closest?btn.closest('tr'):document.querySelector('tr[data-lanc-row=\"'+lid+'\"]');",
        '  if(!tr)return;',
        '  var oc=load();',
        "  var esta=tr.classList.contains('lanc-row-oculto');",
        "  if(esta){tr.classList.remove('lanc-row-oculto');btn.classList.remove('oculto');btn.title='Ocultar';delete oc[lid]}",
        "  else{tr.classList.add('lanc-row-oculto');btn.classList.add('oculto');btn.title='Mostrar';oc[lid]=true}",
        '  save(oc);recalcVis();',
        '};',
        'function recalcVis(){',
        "  document.querySelectorAll('.lanc-obra-group').forEach(function(g){",
        "    var tb=g.querySelector('tbody'),tf=g.querySelector('tfoot');",
        '    if(!tb||!tf)return;',
        '    var tM2=0,tVP=0,tVA=0;',
        "    tb.querySelectorAll('tr').forEach(function(tr){",
        "      if(tr.classList.contains('lanc-row-oculto'))return;",
        '      var cs=tr.children;if(cs.length<9)return;',
        "      var m2=parseFloat(cs[2].textContent.replace(/[\\s.]/g,'').replace(',','.'))||0;tM2+=m2;",
        '      var vp=cs[7].textContent.trim();',
        "      if(vp&&vp!=='"+EM_DASH+"'){vp=parseFloat(vp.replace('R$','').replace(/[\\s.]/g,'').replace(',','.'))||0;tVP+=vp}",
        '      var va=cs[8].textContent.trim();',
        "      if(va&&va!=='"+EM_DASH+"'){va=parseFloat(va.replace('R$','').replace(/[\\s.]/g,'').replace(',','.'))||0;tVA+=va}",
        '    });',
        "    var fr=tf.querySelector('tr');if(!fr)return;var fc=fr.children;",
        "    if(fc.length>8){fc[2].innerHTML='<strong>'+tM2.toLocaleString('pt-BR')+'</strong>';fc[7].innerHTML='<strong>R$ '+tVP.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</strong>';fc[8].innerHTML='<strong>R$ '+tVA.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</strong>'}",
        '  });',
        '}',
        'function setupP163b(){',
        '  var orig=window.renderLancamentosPgto;',
        "  if(typeof orig!=='function'||orig.__p163boc)return;",
        '  var nw=function(){',
        '    var r=orig.apply(this,arguments);',
        '    try{',
        '      var oc=load();',
        '      Object.keys(oc).forEach(function(lid){',
        "        var tr=document.querySelector('tr[data-lanc-row=\"'+lid+'\"]');",
        "        if(tr&&!tr.classList.contains('lanc-row-oculto')){",
        "          tr.classList.add('lanc-row-oculto');",
        "          var b=tr.querySelector('.btn-ocultar-lanc');",
        "          if(b){b.classList.add('oculto');b.title='Mostrar'}",
        '        }',
        '      });',
        '      recalcVis();',
        '    }catch(e){console.error("patch163b",e)}',
        '    return r;',
        '  };',
        "  nw.__p163boc=true;",
        "  if(orig.__historico20260913)nw.__historico20260913=true;",
        "  if(orig.__p63)nw.__p63=true;",
        "  if(orig.__p71)nw.__p71=true;",
        "  if(orig.__p70)nw.__p70=true;",
        '  window.renderLancamentosPgto=nw;',
        '}',
        "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setupP163b)}else{setupP163b()}",
        '})();',
        '</script>',
    ]
    
    INJECT_JS = '\n'.join(js_lines)
    INJECT = '\n<!-- PATCH 163b: ocultar/mostrar + blank values -->\n' + INJECT_CSS + '\n' + INJECT_JS + '\n<!-- FIM PATCH 163b -->'
    
    last_body = c.rfind('</body>')
    if last_body >= 0:
        c = c[:last_body] + INJECT + '\n' + c[last_body:]
        print(f"  + 14. CSS+JS inject (posicao {last_body})")
        ok += 1
    else:
        print("  x 14. </body> nao encontrado")
        fail += 1
    
    # ===== Gravar resultado =====
    write_file(path, c)
    new_len = len(c)
    print(f"\nArquivo gravado: {new_len:,} caracteres (delta: {new_len - orig_len:+,})")
    print(f"Resultado: {ok} OK, {fail} FALHAS")
    
    if fail > 0:
        print("\nALGUMAS SUBSTITUICOES FALHARAM!")
        print("Verifique se o arquivo index.html esta na versao correta.")
        print("Se necessario, restaure o backup e tente novamente.")
        sys.exit(1)
    else:
        print("\nTODAS AS SUBSTITUICOES APLICADAS COM SUCESSO!")

if __name__ == "__main__":
    main()
