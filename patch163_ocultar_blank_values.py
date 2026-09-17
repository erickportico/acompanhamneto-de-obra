#!/usr/bin/env python3
"""PATCH 163 - Ocultar/Mostrar + Valores em branco quando sem Profissional/Ajudante"""
import sys, os, re

DEFAULT_PATH = r"C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html"

def read_file(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8", errors="replace") as f:
        f.write(content)

def do_patch(c, label, old, new):
    if old in c:
        c = c.replace(old, new, 1)
        print(f"  + {label}")
        return c, True
    else:
        print(f"  x {label}")
        return c, False

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    if not os.path.isfile(path):
        print(f"ERRO: {path}")
        sys.exit(1)
    c = read_file(path)
    print(f"Arquivo lido: {len(c):,} caracteres")
    ok = 0
    fail = 0

    # 1. autoImport: zerar valorProf/valorAjud
    O = "                    valorProf: parseFloat((m2 * 6).toFixed(2)),\n                    valorAjud: parseFloat((m2 * 4).toFixed(2)),"
    N = "                    valorProf: 0,\n                    valorAjud: 0,"
    c, r = do_patch(c, "1. autoImport", O, N)
    ok += r; fail += not r

    # 2. salvar: numProf || 0
    O = "              const numProf = profIds.length || 1;\n              const numAjud = ajudIds.length || 1;"
    N = "              const numProf = profIds.length || 0;\n              const numAjud = ajudIds.length || 0;"
    c, r = do_patch(c, "2. salvar numProf", O, N)
    ok += r; fail += not r

    # 3. salvar: valorProf com guarda
    O = "                valorProf: m2 * taxaProf / numProf,\n                valorAjud: m2 * taxaAjud / numAjud,"
    N = "                valorProf: numProf > 0 ? m2 * taxaProf / numProf : 0,\n                valorAjud: numAjud > 0 ? m2 * taxaAjud / numAjud : 0,"
    c, r = do_patch(c, "3. salvar valorProf", O, N)
    ok += r; fail += not r

    # 4. editar: numProf || 0
    O = "              const numProf = lanc.profissionais.length || 1;\n              const numAjud = lanc.ajudantes.length || 1;"
    N = "              const numProf = lanc.profissionais.length || 0;\n              const numAjud = lanc.ajudantes.length || 0;"
    c, r = do_patch(c, "4. editar numProf", O, N)
    ok += r; fail += not r

    # 5. editar: valorProf com guarda
    O = "              lanc.valorProf = lanc.instalacaoM2 * lanc.taxaProf / numProf;\n              lanc.valorAjud = lanc.instalacaoM2 * lanc.taxaAjud / numAjud;"
    N = "              lanc.valorProf = numProf > 0 ? lanc.instalacaoM2 * lanc.taxaProf / numProf : 0;\n              lanc.valorAjud = numAjud > 0 ? lanc.instalacaoM2 * lanc.taxaAjud / numAjud : 0;"
    c, r = do_patch(c, "5. editar valorProf", O, N)
    ok += r; fail += not r

    # 6. renderLancamentos: totais com guarda
    O = "                g.items.forEach(l => {\n                  totalM2 += l.instalacaoM2;\n                  totalValProf += (l.profissionais || []).length * l.valorProf;\n                  totalValAjud += (l.ajudantes || []).length * l.valorAjud;\n                });"
    N = "                g.items.forEach(l => {\n                  totalM2 += l.instalacaoM2;\n                  if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n                    totalValProf += (l.profissionais || []).length * l.valorProf;\n                  if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n                    totalValAjud += (l.ajudantes || []).length * l.valorAjud;\n                });"
    c, r = do_patch(c, "6. renderLancamentos totais", O, N)
    ok += r; fail += not r

    # 7. renderLancamentos: exibir "—" quando vazio
    O = "                  html += '<td>R$ ' + l.valorProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</td>';\n                  html += '<td>R$ ' + l.valorAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</td>';"
    tp = "                  var temProf = (l.profissionais || []).length > 0 && l.valorProf > 0;\n"
    ta = "                  var temAjud = (l.ajudantes || []).length > 0 && l.valorAjud > 0;\n"
    dp = "                  html += '<td' + (temProf ? '' : ' style=\"color:#94a3b8;font-style:italic\"') + '>' + (temProf ? 'R$ ' + l.valorProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '\\u2014') + '</td>';\n"
    da = "                  html += '<td' + (temAjud ? '' : ' style=\"color:#94a3b8;font-style:italic\"') + '>' + (temAjud ? 'R$ ' + l.valorAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '\\u2014') + '</td>';"
    N = tp + ta + dp + da
    c, r = do_patch(c, "7. renderLancamentos display", O, N)
    ok += r; fail += not r

    # 8. data-lanc-row no <tr>
    O = "html += '<tr>';\n                  html += '<td>' + (l.data"
    N = "html += '<tr data-lanc-row=\"' + l.id + '\">';\n                  html += '<td>' + (l.data"
    c, r = do_patch(c, "8. data-lanc-row", O, N)
    ok += r; fail += not r

    # 9. Botao olho - find the lancamentos actions cell using editarLancamentoPgto as anchor
    # We look for the block that contains editarLancamentoPgto AND excluirLancamentoPgto
    # and add the eye button before the editar button
    edit_marker = "html += '<button class=\"btn-icon-sm\" onclick=\"editarLancamentoPgto("
    # Find the one in the lancamentos table (not colaboradores)
    # We can identify it by looking for the pattern after "lanc-actions" near editarLancamentoPgto
    search = "'<td class=\"lanc-actions\">';\n                  html += '<button class=\"btn-icon-sm\" onclick=\"editarLancamentoPgto("
    idx = c.find(search)
    if idx >= 0:
        # Check if this is the right one (should have excluirLancamentoPgto nearby)
        near = c[idx:idx+500]
        if "excluirLancamentoPgto" in near:
            # Insert the eye button right after the opening of the td
            insert_point = c.find("html += '<button class=\"btn-icon-sm\" onclick=\"editarLancamentoPgto(", idx)
            eye = "html += '<button class=\"btn-icon-sm btn-ocultar-lanc\" data-lanc-id=\"' + l.id + '\" onclick=\"toggleOcultarLanc(this,\\'' + l.id + '\\')\" title=\"Ocultar/Mostrar\">\U0001F441</button>';\n                  "
            c = c[:insert_point] + eye + c[insert_point:]
            print("  + 9. Botao olho")
            ok += 1
        else:
            print("  x 9. excluirLancamentoPgto not near")
            fail += 1
    else:
        # Try alternate: maybe the actions cell is on a different line
        # Look for editarLancamentoPgto in the rendering section
        alt = "html += '<td class=\"lanc-actions\"><button class=\"btn-icon-sm\" onclick=\"editarLancamentoPgto("
        idx2 = c.find(alt)
        if idx2 >= 0:
            # Inline version - insert eye button before editar
            insert_point = c.find("<button class=\"btn-icon-sm\" onclick=\"editarLancamentoPgto(", idx2)
            eye = "<button class=\"btn-icon-sm btn-ocultar-lanc\" data-lanc-id=\"' + l.id + '\" onclick=\"toggleOcultarLanc(this,\\'' + l.id + '\\')\" title=\"Ocultar/Mostrar\">\U0001F441</button>"
            c = c[:insert_point] + eye + c[insert_point:]
            print("  + 9. Botao olho (inline)")
            ok += 1
        else:
            print("  x 9. lanc-actions not found")
            fail += 1

    # 10. renderResumoPgto: totais com guarda
    O = "                totalM2 += l.instalacaoM2;\n                  totalProf += (l.profissionais || []).length * l.valorProf;\n                  totalAjud += (l.ajudantes || []).length * l.valorAjud;"
    N = "                totalM2 += l.instalacaoM2;\n                  if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n                    totalProf += (l.profissionais || []).length * l.valorProf;\n                  if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n                    totalAjud += (l.ajudantes || []).length * l.valorAjud;"
    c, r = do_patch(c, "10. renderResumoPgto", O, N)
    ok += r; fail += not r

    # 11. centrosCusto: guarda
    O = '(l.profissionais || []).forEach(function(pid){\n                            acumular(pid, l.valorProf, "prof", l.data);\n                          });\n                          (l.ajudantes || []).forEach(function(aid){\n                            acumular(aid, l.valorAjud, "ajud", l.data);\n                          });'
    N = '(l.profissionais || []).forEach(function(pid){\n                            if (l.valorProf > 0) acumular(pid, l.valorProf, "prof", l.data);\n                          });\n                          (l.ajudantes || []).forEach(function(aid){\n                            if (l.valorAjud > 0) acumular(aid, l.valorAjud, "ajud", l.data);\n                          });'
    c, r = do_patch(c, "11. centrosCusto", O, N)
    ok += r; fail += not r

    # 12. dashboard: checar array antes de somar
    O = "                var vp = num(l.valorProf), va = num(l.valorAjud);\n                lin.lanc++;\n                lin.m2 += num(l.instalacaoM2);\n                lista(l.profissionais).forEach(function (pid) {\n                  if (!pid) { return; }\n                  var r = reg(pid);\n                  r.prof += vp;\n                  r.dias++;\n                  lin.custo += vp;\n                });\n                lista(l.ajudantes).forEach(function (aid) {\n                  if (!aid) { return; }\n                  var r = reg(aid);\n                  r.ajud += va;\n                  r.dias++;\n                  lin.custo += va;\n                });"
    N = "                var vp = (lista(l.profissionais).length > 0) ? num(l.valorProf) : 0,\n                    va = (lista(l.ajudantes).length > 0) ? num(l.valorAjud) : 0;\n                lin.lanc++;\n                lin.m2 += num(l.instalacaoM2);\n                lista(l.profissionais).forEach(function (pid) {\n                  if (!pid) { return; }\n                  var r = reg(pid);\n                  r.prof += vp;\n                  r.dias++;\n                  lin.custo += vp;\n                });\n                lista(l.ajudantes).forEach(function (aid) {\n                  if (!aid) { return; }\n                  var r = reg(aid);\n                  r.ajud += va;\n                  r.dias++;\n                  lin.custo += va;\n                });"
    c, r = do_patch(c, "12. dashboard", O, N)
    ok += r; fail += not r

    # 13. pagamentos(): checar arrays
    O = '          function pagamentos(obra) {\n            var porMes = {}, total = 0;\n            (obra && obra.lancamentosProducao ? obra.lancamentosProducao : []).forEach(function (l) {\n              var v = num(l.valorProf) + num(l.valorAjud);\n              total += v;'
    N = '          function pagamentos(obra) {\n            var porMes = {}, total = 0;\n            (obra && obra.lancamentosProducao ? obra.lancamentosProducao : []).forEach(function (l) {\n              var vp = (Array.isArray(l.profissionais) && l.profissionais.length > 0) ? num(l.valorProf) : 0;\n              var va = (Array.isArray(l.ajudantes) && l.ajudantes.length > 0) ? num(l.valorAjud) : 0;\n              var v = vp + va;\n              total += v;'
    c, r = do_patch(c, "13. pagamentos()", O, N)
    ok += r; fail += not r

    # 14. Inject CSS + JS before last </body>
    INJECT_CSS = """<style id="patch163Ocultar">
.lanc-table tr.lanc-row-oculto{opacity:.35;text-decoration:line-through;color:#94a3b8}
.lanc-table tr.lanc-row-oculto td{color:#94a3b8}
.btn-ocultar-lanc{position:relative;cursor:pointer}
.btn-ocultar-lanc.oculto::after{content:'';position:absolute;top:50%;left:2px;width:calc(100% - 4px);height:2px;background:#ef4444;transform:rotate(-45deg);pointer-events:none;border-radius:1px}
body.dark-mode .lanc-table tr.lanc-row-oculto td{color:#475569}
</style>"""

    INJECT_JS = """<script id="patch163OcultarJS">
(function(){
'use strict';
if(window.__patch163Ocultar)return;
window.__patch163Ocultar=true;
var SK='pgto_lanc_ocultos';
function load(){try{var r=sessionStorage.getItem(SK);return r?JSON.parse(r):{}}catch(e){return{}}}
function save(o){try{sessionStorage.setItem(SK,JSON.stringify(o))}catch(e){}}
window.toggleOcultarLanc=function(btn,lid){
  var tr=btn.closest?btn.closest('tr'):document.querySelector('tr[data-lanc-row="'+lid+'"]');
  if(!tr)return;
  var oc=load();
  var esta=tr.classList.contains('lanc-row-oculto');
  if(esta){tr.classList.remove('lanc-row-oculto');btn.classList.remove('oculto');btn.title='Ocultar';delete oc[lid]}
  else{tr.classList.add('lanc-row-oculto');btn.classList.add('oculto');btn.title='Mostrar';oc[lid]=true}
  save(oc);recalcVis();
};
function recalcVis(){
  document.querySelectorAll('.lanc-obra-group').forEach(function(g){
    var tb=g.querySelector('tbody'),tf=g.querySelector('tfoot');
    if(!tb||!tf)return;
    var tM2=0,tVP=0,tVA=0;
    tb.querySelectorAll('tr').forEach(function(tr){
      if(tr.classList.contains('lanc-row-oculto'))return;
      var cs=tr.children;if(cs.length<9)return;
      var m2=parseFloat(cs[2].textContent.replace(/\\s/g,'').replace(/\\./g,'').replace(',','.'))||0;tM2+=m2;
      var vp=cs[7].textContent.trim();
      if(vp&&vp!=='\\u2014'){vp=parseFloat(vp.replace('R$','').replace(/\\s/g,'').replace(/\\./g,'').replace(',','.'))||0;tVP+=vp}
      var va=cs[8].textContent.trim();
      if(va&&va!=='\\u2014'){va=parseFloat(va.replace('R$','').replace(/\\s/g,'').replace(/\\./g,'').replace(',','.'))||0;tVA+=va}
    });
    var fr=tf.querySelector('tr');if(!fr)return;var fc=fr.children;
    if(fc.length>8){fc[2].innerHTML='<strong>'+tM2.toLocaleString('pt-BR')+'</strong>';fc[7].innerHTML='<strong>R$ '+tVP.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</strong>';fc[8].innerHTML='<strong>R$ '+tVA.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</strong>'}
  });
}
var orig=window.renderLancamentosPgto;
if(typeof orig==='function'&&!orig.__p163oc){
  var nw=function(){var r=orig.apply(this,arguments);
    try{var oc=load();Object.keys(oc).forEach(function(lid){
      var tr=document.querySelector('tr[data-lanc-row="'+lid+'"]');
      if(tr&&!tr.classList.contains('lanc-row-oculto')){tr.classList.add('lanc-row-oculto');
        var b=tr.querySelector('.btn-ocultar-lanc');if(b){b.classList.add('oculto');b.title='Mostrar'}}
    });recalcVis()}catch(e){}return r};
  nw.__p163oc=true;
  if(orig.__historico20260913)nw.__historico20260913=true;
  if(orig.__p63)nw.__p63=true;
  if(orig.__p71)nw.__p71=true;
  if(orig.__p70)nw.__p70=true;
  window.renderLancamentosPgto=nw;
}
})();
</script>"""

    INJECT = "\n<!-- PATCH 163: ocultar/mostrar + blank values -->\n" + INJECT_CSS + "\n" + INJECT_JS + "\n<!-- FIM PATCH 163 -->"

    last_body = c.rfind("</body>")
    if last_body >= 0:
        c = c[:last_body] + INJECT + "\n" + c[last_body:]
        print("  + 14. CSS+JS inject")
        ok += 1
    else:
        print("  x 14. </body> not found")
        fail += 1

    write_file(path, c)
    print(f"\nArquivo gravado: {len(c):,} caracteres")
    print(f"Resultado: {ok} OK, {fail} FALHAS")
    if fail > 0:
        print("\nALGUMAS SUBSTITUICOES FALHARAM!")
        sys.exit(1)
    else:
        print("\nTODAS AS SUBSTITUICOES APLICADAS COM SUCESSO!")

if __name__ == "__main__":
    main()
