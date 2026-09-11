#!/usr/bin/env python3
r"""
Patch v2 — Adiciona coluna "Qtd. Saída" e "Saldo" ao Recebimento de Materiais
+ Fix debounceRender ReferenceError

Uso: python patch_saida_saldo_v2.py
  (coloque este script AO LADO do index.html e execute)

Git:
  git add patch_saida_saldo_v2.py
  git commit -m "feat: adiciona Qtd. Saida e Saldo ao Recebimento de Materiais + fix debounceRender"
  git push
"""

import os, sys

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')

def apply():
    with open(FILE, 'r', encoding='utf-8') as f:
        html = f.read()
    orig_len = len(html)
    ok = 0

    # ── 1. Header tabela principal: +Qtd.Saída +Saldo ─────────────────
    s1 = ('<div class="th-content">Qtd. Recebida</div>
'
          '                                    </th>
'
          '                                    <th class="head-base">
'
          '                                        <div class="th-content">Unid.</div>')
    if s1 in html:
        ins = ('                                    <th class="head-base">
'
               '                                        <div class="th-content">Qtd. Sa\u00edda</div>
'
               '                                    </th>
'
               '                                    <th class="head-base">
'
               '                                        <div class="th-content">Saldo</div>
'
               '                                    </th>
')
        # insert between Qtd.Recebida </th> and Unid. <th>
        marker1 = '                                    </th>
                                    <th class="head-base">
                                        <div class="th-content">Unid.</div>'
        # find the one right after Qtd. Recebida
        idx1 = html.find(s1)
        if idx1 >= 0:
            cut = idx1 + len('                                    </th>
')
            html = html[:cut] + ins + html[cut:]
            ok += 1; print('  [OK] 1. Header principal: +Qtd.Saida +Saldo')
        else:
            print('  [ERRO] 1. Header nao encontrado')
    else:
        print('  [ERRO] 1. Header nao encontrado')

    # ── 2. Header tabela consolidada: +Qtd.Saída +Saldo ──────────────
    s2 = ('<div class="th-content">Qtd. Recebida</div>
'
          '                                        </th>
'
          '                                        <th class="head-base">
'
          '                                            <div class="th-content">Unid.</div>')
    if s2 in html:
        ins2 = ('                                        <th class="head-base">
'
                '                                            <div class="th-content">Qtd. Sa\u00edda</div>
'
                '                                        </th>
'
                '                                        <th class="head-base">
'
                '                                            <div class="th-content">Saldo</div>
'
                '                                        </th>
')
        idx2 = html.find(s2)
        cut2 = idx2 + len('                                        </th>
')
        html = html[:cut2] + ins2 + html[cut2:]
        ok += 1; print('  [OK] 2. Header consolidado: +Qtd.Saida +Saldo')
    else:
        print('  [ERRO] 2. Header consolidado nao encontrado')

    # ── 3. Modal: campo recQtdSaida ──────────────────────────────────
    s3 = ('<input type="number" step="0.01" min="0" id="recQtdRecebida" value="0">
'
          '                        </div>
'
          '                        <div class="form-group">
'
          '                            <label>Status</label>')
    if s3 in html:
        r3 = ('<input type="number" step="0.01" min="0" id="recQtdRecebida" value="0">
'
              '                        </div>
'
              '                        <div class="form-group">
'
              '                            <label>Quantidade Sa\u00edda</label>
'
              '                            <input type="number" step="0.01" min="0" id="recQtdSaida" value="0">
'
              '                        </div>
'
              '                        <div class="form-group">
'
              '                            <label>Status</label>')
        html = html.replace(s3, r3, 1)
        ok += 1; print('  [OK] 3. Modal: +recQtdSaida input')
    else:
        print('  [ERRO] 3. Modal form nao encontrado')

    # ── 4. renderRecebimentos: +td qtdSaida +td saldo ────────────────
    #    EXACT line that exists in the file:
    s4 = ("<td><input type=\"number\" step=\"0.01\" min=\"0\" "
          "value=\"${Number(r.qtdRecebida || 0)}\" "
          "onchange=\"editarRecebimento(${r.id},'qtdRecebida',this.value)\"></td>")
    if s4 in html:
        line_start = html.rfind('\n', 0, html.find(s4)) + 1
        indent = html[line_start:html.find(s4)]
        qtd_saida_td = (
            indent + "<td><input type=\"number\" step=\"0.01\" min=\"0\" "
            + "value=\"${Number(r.qtdSaida || 0)}\" "
            + "onchange=\"editarRecebimento(${r.id},'qtdSaida',this.value)\"></td>\n"
        )
        saldo_td = (
            indent + '<td style="font-weight:700;color:${(Number(r.qtdRecebida||0) - Number(r.qtdSaida||0)) < 0 ? '\n'
            + "'var(--danger,#e74c3c)' : 'var(--success,#16a34a)'">\n"
            + indent + "${(Number(r.qtdRecebida||0) - Number(r.qtdSaida||0)).toLocaleString('pt-BR',{maximumFractionDigits:2})}</td>"
        )
        html = html.replace(s4, s4 + '\n' + qtd_saida_td + saldo_td, 1)
        ok += 1; print('  [OK] 4. renderRecebimentos: +qtdSaida +saldo')
    else:
        print('  [ERRO] 4. qtdRecebida td nao encontrado')

    # ── 5. salvarNovoRecebimento: +const qtdSaida ────────────────────
    s5 = "const qtdRecebida = Number(document.getElementById('recQtdRecebida').value) || 0;"
    if s5 in html:
        html = html.replace(s5, s5 + "\n                    const qtdSaida = Number(document.getElementById('recQtdSaida').value) || 0;", 1)
        ok += 1; print('  [OK] 5. salvarNovo: +qtdSaida var')
    else:
        print('  [ERRO] 5. salvarNovo const nao encontrada')

    # ── 6. salvarNovoRecebimento push: +qtdSaida ──────────────────────
    s6 = 'qtdPrevista, qtdRecebida,'
    if s6 in html:
        html = html.replace(s6, 'qtdPrevista, qtdRecebida, qtdSaida,', 1)
        ok += 1; print('  [OK] 6. Push: +qtdSaida')
    else:
        print('  [ERRO] 6. Push nao encontrada')

    # ── 7. abrirModalRecebimento: +recQtdSaida=0 ─────────────────────
    s7 = ("document.getElementById('recQtdRecebida').value = 0;\n"
          "                    document.getElementById('recUnidade').value = 'UN';")
    if s7 in html:
        html = html.replace(s7, s7[:44] + " 0;\n                    document.getElementById('recQtdSaida').value = 0;\n" + s7[44:], 1)
        ok += 1; print('  [OK] 7. abrirModal: +recQtdSaida=0')
    else:
        print('  [ERRO] 7. abrirModal nao encontrada')

    # ── 8. editarRecebimento numeric fields: +qtdSaida ───────────────
    s8 = "['qtdPrevista', 'qtdRecebida'].includes(campo)"
    if s8 in html:
        html = html.replace(s8, "['qtdPrevista', 'qtdRecebida', 'qtdSaida'].includes(campo)", 1)
        ok += 1; print('  [OK] 8. editarRecebimento numeric: +qtdSaida')
    else:
        print('  [ERRO] 8. editarRecebimento numeric nao encontrada')

    # ── 9. editarRecebimento status recalc: +qtdSaida ────────────────
    #    ACTUAL text uses || syntax, not .includes()
    s9 = "((campo === 'qtdPrevista' || campo === 'qtdRecebida') && item.status !== 'Rejeitado') {"
    if s9 in html:
        html = html.replace(s9, "((campo === 'qtdPrevista' || campo === 'qtdRecebida' || campo === 'qtdSaida') && item.status !== 'Rejeitado') {", 1)
        ok += 1; print('  [OK] 9. editarRecebimento recalc: +qtdSaida')
    else:
        print('  [ERRO] 9. editarRecebimento recalc nao encontrada')

    # ── 10a. obterMateriaisConsolidados init: +qtdSaida:0 ─────────────
    #    Multiple occurrences — target the one inside the consolidados function
    #    Find via context: look for it after the function signature
    import re
    # Find the function and its first occurrence of qtdRecebida: 0,
    fn_idx = html.find('function obterMateriaisConsolidados')
    if fn_idx >= 0:
        sub = html[fn_idx:fn_idx+2000]
        p10a = 'qtdRecebida: 0,'
        idx10a = sub.find(p10a)
        if idx10a >= 0:
            abs_idx = fn_idx + idx10a
            html = html[:abs_idx] + 'qtdRecebida: 0,\n                            qtdSaida: 0,' + html[abs_idx + len(p10a):]
            ok += 1; print('  [OK] 10a. Consolidados init: +qtdSaida:0')
        else:
            print('  [ERRO] 10a. Consolidados init nao encontrado')
    else:
        print('  [ERRO] 10a. Function nao encontrada')

    # ── 10b. Consolidados accumulation: +qtdSaida ────────────────────
    s10b = 'm.qtdRecebida += Number(r.qtdRecebida || 0);'
    if s10b in html:
        html = html.replace(s10b, s10b + '\n                        m.qtdSaida += Number(r.qtdSaida || 0);', 1)
        ok += 1; print('  [OK] 10b. Consolidados accum: +qtdSaida')
    else:
        print('  [ERRO] 10b. Consolidados accum nao encontrado')

    # ── 10c. Consolidados return: +saldo ─────────────────────────────
    #    The return object does NOT have ocorrencias as a field.
    #    Look for the fields right after qtdRecebida in the return.
    #    Find: last occurrence of m.qtdRecebida in the return map
    s10c_search = 'qtdRecebida: m.qtdRecebida,'
    fn_idx10c = html.find('function obterMateriaisConsolidados')
    if fn_idx10c >= 0:
        sub10c = html[fn_idx10c:fn_idx10c+3000]
        idx10c = sub10c.find(s10c_search)
        if idx10c >= 0:
            abs10c = fn_idx10c + idx10c
            html = (html[:abs10c] 
                    + 'qtdRecebida: m.qtdRecebida,\n                        qtdSaida: m.qtdSaida,\n                        saldo: Number(m.qtdRecebida||0) - Number(m.qtdSaida||0),'
                    + html[abs10c + len(s10c_search):])
            ok += 1; print('  [OK] 10c. Consolidados return: +qtdSaida +saldo')
        else:
            print('  [ERRO] 10c. Consolidados return nao encontrado')
    else:
        print('  [ERRO] 10c. Function nao encontrada')

    # ── 11. renderMateriaisConsolidados template: +Qtd.Saida +Saldo cols
    s11 = "<td>${Number(m.qtdRecebida || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>"
    fn_idx11 = html.find('function renderMateriaisConsolidados')
    if fn_idx11 >= 0 and s11 in html:
        abs11 = html.find(s11, fn_idx11)
        if abs11 >= 0:
            line_start11 = html.rfind('\n', 0, abs11) + 1
            indent11 = html[line_start11:abs11]
            qtd_saida_con = (
                indent11 + "<td>${Number(m.qtdSaida || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>\n"
            )
            saldo_con = (
                indent11 + '<td style="font-weight:700;color:${Number(m.saldo||0) < 0 ? ' 
                + "'var(--danger,#e74c3c)' : 'var(--success,#16a34a)'}">\n"
                + indent11 + "${Number(m.saldo||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}</td>"
            )
            html = html[:abs11 + len(s11)] + '\n' + qtd_saida_con + saldo_con + html[abs11 + len(s11):]
            ok += 1; print('  [OK] 11. Consolidados template: +qtdSaida +saldo')
        else:
            print('  [ERRO] 11. Consolidados td nao encontrado')
    else:
        print('  [ERRO] 11. Consolidados template nao encontrado')

    # ── 12a. CSV header: +Qtd.Saída +Saldo ───────────────────────────
    s12a = "'Quantidade Recebida', 'Unidade',"
    if s12a in html:
        html = html.replace(s12a, "'Quantidade Recebida', 'Quantidade Sa\u00edda', 'Saldo', 'Unidade',", 1)
        ok += 1; print('  [OK] 12a. CSV header: +Qtd.Saida +Saldo')
    else:
        print('  [ERRO] 12a. CSV header nao encontrada')

    # ── 12b. CSV data: +qtdSaida +saldo ──────────────────────────────
    s12b = 'm.qtdRecebida, m.unidade,'
    if s12b in html:
        html = html.replace(s12b, 'm.qtdRecebida, m.qtdSaida, m.saldo, m.unidade,', 1)
        ok += 1; print('  [OK] 12b. CSV data: +qtdSaida +saldo')
    else:
        print('  [ERRO] 12b. CSV data nao encontrada')

    # ── 13. processarImportacaoRecebimento: +qtdSaida:0 ──────────────
    #    Pattern found: 'qtdRecebida: 0,' (multiple occurrences)
    #    Target the one inside processarImportacaoRecebimento
    fn_idx13 = html.find('processarImportacaoRecebimento')
    if fn_idx13 >= 0:
        sub13 = html[fn_idx13:fn_idx13+2000]
        p13 = 'qtdRecebida: 0,'
        idx13 = sub13.find(p13)
        if idx13 >= 0:
            abs13 = fn_idx13 + idx13
            html = html[:abs13] + 'qtdRecebida: 0,\n                    qtdSaida: 0,' + html[abs13 + len(p13):]
            ok += 1; print('  [OK] 13. Importacao: +qtdSaida:0')
        else:
            print('  [ERRO] 13. Importacao qtdRecebida nao encontrado')
    else:
        print('  [ERRO] 13. Importacao function nao encontrada')

    # ── 14. normalizarRecebimentosAntigos: +qtdSaida default ──────────
    #    Pattern not found in simple search — find the function and add
    fn_idx14 = html.find('function normalizarRecebimentosAntigos')
    if fn_idx14 >= 0:
        sub14 = html[fn_idx14:fn_idx14+2000]
        # Find: qtdRecebida = Number(r.qtdRecebida) || 0;
        p14 = 'qtdRecebida = Number(r.qtdRecebida) || 0;'
        idx14 = sub14.find(p14)
        if idx14 >= 0:
            abs14 = fn_idx14 + idx14
            # Get line indent
            line_start14 = html.rfind('\n', 0, abs14) + 1
            indent14 = html[line_start14:abs14]
            html = html[:abs14 + len(p14)] + '\n' + indent14 + 'r.qtdSaida = Number(r.qtdSaida) || 0;' + html[abs14 + len(p14):]
            ok += 1; print('  [OK] 14. Normalizar: +qtdSaida default')
        else:
            print('  [ERRO] 14. Normalizar qtdRecebida nao encontrado')
    else:
        print('  [ERRO] 14. Normalizar function nao encontrada')

    # ── 15. Fix debounceRender ReferenceError ─────────────────────────
    #    Find the debounceRender function and ensure it is on window
    import re
    # Look for the debounceRender function definition
    m15 = re.search(r'function\s+debounceRender\s*\(\s*\)\s*\{', html)
    if m15:
        # Find the end of this function — look for the matching closing brace
        start = m15.start()
        # Simple approach: find "let debounceTimer" to add window.debounceRender after the function
        # Actually, simpler: just add "window.debounceRender = debounceRender;" right after the function
        # Find the function's closing brace by tracking braces
        depth = 0
        i = m15.end() - 1  # at the opening {
        for j in range(i, len(html)):
            if html[j] == '{': depth += 1
            elif html[j] == '}': 
                depth -= 1
                if depth == 0:
                    end_fn = j + 1
                    # Check if window.debounceRender already exists after
                    after = html[end_fn:end_fn+200].strip()
                    if 'window.debounceRender' not in after:
                        line_end = html.find('\n', end_fn)
                        indent15 = ''
                        ls15 = html.rfind('\n', 0, start)
                        if ls15 >= 0:
                            indent15 = html[ls15+1:start]
                        html = html[:line_end+1] + indent15 + 'window.debounceRender = debounceRender;\n' + html[line_end+1:]
                    ok += 1; print('  [OK] 15. debounceRender: +window assignment')
                    break
        else:
            print('  [ERRO] 15. debounceRender closing brace nao encontrada')
    else:
        print('  [ERRO] 15. debounceRender function nao encontrada')

    # ── SAVE ────────────────────────────────────────────────────────
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(html)
    new_len = len(html)
    print(f'\nArquivo: {FILE}')
    print(f'Tamanho original: {orig_len:,} chars')
    print(f'Tamanho novo:      {new_len:,} chars')
    print(f'Diferenca:         {new_len - orig_len:+,} chars')
    print(f'Alteracoes OK:     {ok}/15')
    return ok >= 12

if __name__ == '__main__':
    ok = apply()
    if ok:
        print('\nPatch v2 aplicado com sucesso!')
    else:
        print('\nPatch v2 parcial — revise manualmente!')
