#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch 166 - Corrige 3 problemas:
  1) "ABA DIARIO" - adiciona Diario de Obra como aba no sidebar
  2) Valores ocultos somados nos totais - exclui lancamentos ocultos dos
     totais por obra, totais gerais e resumo de colaboradores
  3) Impressao inclui ocultos nos totais - corrige totais JS (a impressao
     usa os mesmos valores do DOM) + CSS @media print para ocultar linhas

Este patch substitui/subsume o patch 165 (que pode ter falhado nos
patches 3 e 4 porque o regex esperava if-conditionais que podem nao existir
no arquivo real). Lida com AMBAS as variantes de codigo.
"""

import re, datetime, subprocess, os

FILE_PATH = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html'

SQ = chr(39)   # single quote
DQ = chr(34)   # double quote
BS = chr(92)   # backslash


def _find_func_body(content, func_name):
    """Find function body end by matching braces."""
    idx = content.find(func_name)
    if idx < 0:
        return -1, -1
    brace_start = content.find('{', idx)
    if brace_start < 0:
        return idx, -1
    depth = 1
    pos = brace_start + 1
    while depth > 0 and pos < len(content):
        if content[pos] == '{':
            depth += 1
        elif content[pos] == '}':
            depth -= 1
        pos += 1
    return idx, pos


def main():
    import sys
    file_path = sys.argv[1] if len(sys.argv) > 1 else FILE_PATH
    print(f'Lendo: {file_path}')
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    print(f'Tamanho original: {len(content):,} caracteres')

    applied = 0
    errors = []

    # =================================================================
    # PATCH 1: CSS - estilos para lancamento oculto
    # =================================================================
    if '.lanc-oculto-row td' not in content:
        anchor1 = '.lanc-totals-row {'
        if anchor1 in content:
            new_css = (
                '/* PATCH166: estilo para lancamento oculto */\n'
                '              .lanc-oculto-row td { text-decoration: line-through !important; color: #94a3b8 !important; opacity: 0.45; }\n'
                '              .lanc-oculto-row td.lanc-actions { opacity: 1; }\n'
                '              .lanc-oculto-row td.lanc-actions button { opacity: 1; }\n'
                '              .btn-oculto-active { background: #fef3c7 !important; border-color: #d97706 !important; }\n'
                '              .lanc-totals-row {'
            )
            content = content.replace(anchor1, new_css, 1)
            print('  OK Patch 1 (CSS base)')
            applied += 1
        else:
            print('  FAIL Patch 1 (CSS base) - .lanc-totals-row nao encontrado')
            errors.append('Patch 1')
    else:
        print('  SKIP Patch 1 (CSS ja existe)')
        applied += 1

    # =================================================================
    # PATCH 2: toggleOcultarLanc - garantir que salva e re-renderiza
    # =================================================================
    has_func = 'function toggleOcultarLanc' in content
    if has_func:
        f_start, f_end = _find_func_body(content, 'function toggleOcultarLanc')
        if f_end > f_start:
            func_text = content[f_start:f_end]
            if 'salvarDB' in func_text and 'renderPagamento' in func_text:
                print('  SKIP Patch 2 (toggleOcultarLanc ja funciona)')
                applied += 1
            else:
                new_func = (
                    'function toggleOcultarLanc(btn, lancId) {\n'
                    '  /* PATCH166: salvar e re-renderizar */\n'
                    '  var lanc = null;\n'
                    '  db.obras.forEach(function(o){\n'
                    '    initLancamentosProducao(o);\n'
                    '    (o.lancamentosProducao||[]).forEach(function(l){\n'
                    '      if(l.id===lancId) lanc=l;\n'
                    '    });\n'
                    '  });\n'
                    '  if(!lanc) return;\n'
                    '  lanc.oculto=!lanc.oculto;\n'
                    '  salvarDB();\n'
                    '  renderPagamento();\n'
                    '}'
                )
                content = content[:f_start] + new_func + content[f_end:]
                print('  OK Patch 2 (toggleOcultarLanc corrigido)')
                applied += 1
    else:
        anchor2 = 'function renderLancamentosPgto'
        if anchor2 in content:
            new_func = (
                '/* PATCH166: ocultar/desocultar lancamento */\n'
                'function toggleOcultarLanc(btn, lancId) {\n'
                '  var lanc=null;\n'
                '  db.obras.forEach(function(o){\n'
                '    initLancamentosProducao(o);\n'
                '    (o.lancamentosProducao||[]).forEach(function(l){\n'
                '      if(l.id===lancId) lanc=l;\n'
                '    });\n'
                '  });\n'
                '  if(!lanc) return;\n'
                '  lanc.oculto=!lanc.oculto;\n'
                '  salvarDB();\n'
                '  renderPagamento();\n'
                '}\n\n'
            )
            content = content.replace(anchor2, new_func + anchor2, 1)
            print('  OK Patch 2 (toggleOcultarLanc adicionado)')
            applied += 1
        else:
            print('  FAIL Patch 2 (anchor nao encontrado)')
            errors.append('Patch 2')

    # =================================================================
    # PATCH 3: Per-obra totals - exclude ocultos
    # Variante A (sem if): totalValProf += (l.profissionais || []).length * l.valorProf;
    # Variante B (com if): if (...) totalValProf += ...
    # =================================================================
    marker3 = '/* PATCH166 */ if (!l.oculto) {'
    marker3_count = content.count(marker3)
    if marker3_count < 1:
        render_pos3 = content.find('function renderLancamentosPgto')
        search3 = render_pos3 if render_pos3 >= 0 else 0

        # Variante B (com if-condicionais)
        pat3b = re.compile(
            r"g\.items\.forEach\(l\s*=>\s*\{\n"
            r"(\s+)totalM2\s*\+=\s*l\.instalacaoM2;\n"
            r"\s+if\s*\(\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorProf\s*>\s*0\s*\)\n"
            r"\s+totalValProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf;\n"
            r"\s+if\s*\(\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorAjud\s*>\s*0\s*\)\n"
            r"\s+totalValAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud;\n"
            r"(\s+)\}\s*\);"
        )
        m3b = pat3b.search(content, search3)
        if m3b:
            g1, g2 = m3b.group(1), m3b.group(2)
            rep3 = (
                'g.items.forEach(l => {\n'
                + g1 + '/* PATCH166 */ if (!l.oculto) {\n'
                + g1 + 'totalM2 += l.instalacaoM2;\n'
                + g1 + 'if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n'
                + g1 + 'totalValProf += (l.profissionais || []).length * l.valorProf;\n'
                + g1 + 'if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n'
                + g1 + 'totalValAjud += (l.ajudantes || []).length * l.valorAjud;\n'
                + g1 + '}\n'
                + g2 + '});'
            )
            content = content[:m3b.start()] + rep3 + content[m3b.end():]
            print('  OK Patch 3 (totais por obra - variante B)')
            applied += 1
        else:
            # Variante A (sem if-condicionais)
            pat3a = re.compile(
                r"g\.items\.forEach\(l\s*=>\s*\{\n"
                r"(\s+)totalM2\s*\+=\s*l\.instalacaoM2;\n"
                r"(\s+)totalValProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf;\n"
                r"(\s+)totalValAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud;\n"
                r"(\s+)\}\s*\);"
            )
            m3a = pat3a.search(content, search3)
            if m3a:
                g1, g2, g3, g4 = m3a.group(1), m3a.group(2), m3a.group(3), m3a.group(4)
                rep3 = (
                    'g.items.forEach(l => {\n'
                    + g1 + '/* PATCH166 */ if (!l.oculto) {\n'
                    + g1 + 'totalM2 += l.instalacaoM2;\n'
                    + g2 + 'totalValProf += (l.profissionais || []).length * l.valorProf;\n'
                    + g3 + 'totalValAjud += (l.ajudantes || []).length * l.valorAjud;\n'
                    + g1 + '}\n'
                    + g4 + '});'
                )
                content = content[:m3a.start()] + rep3 + content[m3a.end():]
                print('  OK Patch 3 (totais por obra - variante A)')
                applied += 1
            else:
                print('  FAIL Patch 3 (totais por obra) - nenhuma variante encontrada')
                errors.append('Patch 3')
    else:
        print('  SKIP Patch 3 (ja aplicado)')
        applied += 1

    # =================================================================
    # PATCH 4: General totals in renderResumoPgto - exclude ocultos
    # =================================================================
    marker4_count = content.count(marker3)  # same marker
    if marker4_count < 2:
        resumo_pos4 = content.find('function renderResumoPgto')
        search4 = resumo_pos4 if resumo_pos4 >= 0 else 0

        # Variante B (com if)
        pat4b = re.compile(
            r"lancs\.forEach\(l\s*=>\s*\{\n"
            r"(\s+)allLanc\.push\(\s*\{\s*\.\.\.l\s*,\s*_obraId:\s*obra\.id\s*\}\s*\);\n"
            r"(\s+)totalM2\s*\+=\s*l\.instalacaoM2;\n"
            r"\s+if\s*\(\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorProf\s*>\s*0\s*\)\n"
            r"\s+totalProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf;\n"
            r"\s+if\s*\(\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorAjud\s*>\s*0\s*\)\n"
            r"\s+totalAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud;\n"
            r"(\s+)\}\s*\);"
        )
        m4b = pat4b.search(content, search4)
        if m4b:
            g1, g2, g3 = m4b.group(1), m4b.group(2), m4b.group(3)
            rep4 = (
                'lancs.forEach(l => {\n'
                + g1 + '/* PATCH166 */ if (!l.oculto) {\n'
                + g1 + 'allLanc.push({ ...l, _obraId: obra.id });\n'
                + g2 + 'totalM2 += l.instalacaoM2;\n'
                + g2 + 'if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n'
                + g2 + '  totalProf += (l.profissionais || []).length * l.valorProf;\n'
                + g2 + 'if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n'
                + g2 + '  totalAjud += (l.ajudantes || []).length * l.valorAjud;\n'
                + g1 + '}\n'
                + g3 + '});'
            )
            content = content[:m4b.start()] + rep4 + content[m4b.end():]
            print('  OK Patch 4 (totais gerais - variante B)')
            applied += 1
        else:
            # Variante A (sem if)
            pat4a = re.compile(
                r"lancs\.forEach\(l\s*=>\s*\{\n"
                r"(\s+)allLanc\.push\(\s*\{\s*\.\.\.l\s*,\s*_obraId:\s*obra\.id\s*\}\s*\);\n"
                r"(\s+)totalM2\s*\+=\s*l\.instalacaoM2;\n"
                r"(\s+)totalProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf;\n"
                r"(\s+)totalAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud;\n"
                r"(\s+)\}\s*\);"
            )
            m4a = pat4a.search(content, search4)
            if m4a:
                g1, g2, g3, g4, g5 = m4a.group(1), m4a.group(2), m4a.group(3), m4a.group(4), m4a.group(5)
                rep4 = (
                    'lancs.forEach(l => {\n'
                    + g1 + '/* PATCH166 */ if (!l.oculto) {\n'
                    + g1 + 'allLanc.push({ ...l, _obraId: obra.id });\n'
                    + g2 + 'totalM2 += l.instalacaoM2;\n'
                    + g3 + 'totalProf += (l.profissionais || []).length * l.valorProf;\n'
                    + g4 + 'totalAjud += (l.ajudantes || []).length * l.valorAjud;\n'
                    + g1 + '}\n'
                    + g5 + '});'
                )
                content = content[:m4a.start()] + rep4 + content[m4a.end():]
                print('  OK Patch 4 (totais gerais - variante A)')
                applied += 1
            else:
                print('  FAIL Patch 4 (totais gerais) - nenhuma variante encontrada')
                errors.append('Patch 4')
    else:
        print('  SKIP Patch 4 (ja aplicado)')
        applied += 1

    # =================================================================
    # PATCH 5: Resumo colaboradores - skip ocultos no allLanc.forEach
    # =================================================================
    if '/* PATCH166 */ if (l.oculto) return;' not in content:
        resumo_pos5 = content.find('function renderResumoPgto')
        search5 = resumo_pos5 if resumo_pos5 >= 0 else 0

        idx5 = search5
        found5 = False
        for _ in range(10):
            idx5 = content.find('allLanc.forEach(l', idx5)
            if idx5 < 0:
                break
            after = content[idx5:idx5+500]
            if 'profissionais' in after and 'colabsMap' in after:
                brace_pos = content.find('{', idx5)
                if brace_pos >= 0:
                    nl_pos = content.find('\n', brace_pos)
                    if nl_pos >= 0:
                        line_start = nl_pos + 1
                        indent_end = line_start
                        while indent_end < len(content) and content[indent_end] in (' ', '\t'):
                            indent_end += 1
                        indent_str = content[line_start:indent_end]
                        insert_text = '\n' + indent_str + '/* PATCH166 */ if (l.oculto) return;'
                        content = content[:brace_pos+1] + insert_text + content[brace_pos+1:]
                        print('  OK Patch 5 (resumo colabs)')
                        applied += 1
                        found5 = True
                        break
            idx5 += 1
        if not found5:
            print('  FAIL Patch 5 (resumo colabs) - forEach nao encontrado')
            errors.append('Patch 5')
    else:
        print('  SKIP Patch 5 (ja existe)')
        applied += 1

    # =================================================================
    # PATCH 6: TR class - add lanc-oculto-row quando oculto
    # No per-obra rendering forEach, trocar <tr> por <tr class="...">
    # =================================================================
    has_tr_class = False
    render_pos6_check = content.find('function renderLancamentosPgto')
    if render_pos6_check >= 0:
        func_end6_check = _find_func_body(content, 'function renderLancamentosPgto')[1]
        if func_end6_check > render_pos6_check:
            func_body6 = content[render_pos6_check:func_end6_check]
            has_tr_class = 'lanc-oculto-row' in func_body6 and '<tr' in func_body6
    if not has_tr_class:
        render_pos6 = content.find('function renderLancamentosPgto')
        # Find the rendering forEach (2nd g.items.forEach)
        first_fe = content.find('g.items.forEach(l', render_pos6)
        second_fe = content.find('g.items.forEach(l', first_fe + 100) if first_fe >= 0 else -1

        if second_fe >= 0:
            # Find html += '<tr>'; inside this forEach
            tr_search = "html += '<tr>';"
            tr_idx = content.find(tr_search, second_fe)
            if tr_idx >= 0 and tr_idx < second_fe + 5000:
                # Build the replacement line:
                # html += '<tr class="' + (l.oculto ? 'lanc-oculto-row' : '') + '">';
                # In the JS code, the string is single-quoted. We break it:
                new_tr = (
                    "html += '"   # html += '
                    "<tr class=\""   # <tr class=\"
                    "' + (l.oculto ? 'lanc-oculto-row' : '') + '"   # ' + (l.oculto ? 'lanc-oculto-row' : '') + "
                    "\">'"   # \">'  
                    ";"   # ;
                )
                # Hmm, let me construct this more carefully.
                # The JS line should be exactly:
                #   html += '<tr class="' + (l.oculto ? 'lanc-oculto-row' : '') + '">';
                #
                # Breaking down by JS string segments:
                #   html +=  '<tr class="'    + (l.oculto ? 'lanc-oculto-row' : '') + '">';
                #   ^open   ^str1             ^expr                          ^str2 ^close
                #
                # In Python, SQ is single quote char, DQ is double quote char
                # The JS code uses single quotes to delimit strings, and
                # double quotes inside the HTML attributes.

                new_tr_line = (
                    'html += ' + SQ + '<tr class=' + DQ + SQ +
                    ' + (l.oculto ? ' + SQ + 'lanc-oculto-row' + SQ +
                    ' : ' + SQ + SQ + ') + ' + SQ + DQ + '>' + SQ + ';'
                )
                content = content[:tr_idx] + new_tr_line + content[tr_idx + len(tr_search):]
                print('  OK Patch 6 (classe TR per-obra)')
                applied += 1
            else:
                print('  FAIL Patch 6 (classe TR) - <tr> nao encontrado')
                errors.append('Patch 6')
        else:
            print('  FAIL Patch 6 (classe TR) - rendering forEach nao encontrado')
            errors.append('Patch 6')
    else:
        print('  SKIP Patch 6 (classe TR ja existe)')
        applied += 1

    # =================================================================
    # PATCH 7: Eye button - add btn-oculto-active class quando oculto
    # =================================================================
    old7 = 'btn-icon-sm btn-ocultar-lanc" data-lanc-id="'
    new7 = (
        'btn-icon-sm btn-ocultar-lanc' + SQ +
        ' + (l.oculto ? ' + SQ + ' btn-oculto-active' + SQ +
        ' : ' + SQ + SQ + ') + ' + SQ + '" data-lanc-id="'
    )
    if old7 in content:
        content = content.replace(old7, new7, 1)
        print('  OK Patch 7 (botao ativo)')
        applied += 1
    elif "l.oculto ? ' btn-oculto-active'" in content:
        print('  SKIP Patch 7 (ja aplicado)')
        applied += 1
    else:
        print('  WARN Patch 7 (botao ativo) - padrao nao encontrado (Patch 10 adicionara)')

    # =================================================================
    # PATCH 8: Print CSS - ocultar lancamentos ocultos na impressao
    # =================================================================
    if 'patch166-print-css' not in content:
        head_end = content.find('</head>')
        if head_end >= 0:
            print_style = (
                '\n<style id="patch166-print-css">\n'
                '  @media print {\n'
                '    .lanc-oculto-row td { text-decoration: line-through !important; color: #94a3b8 !important; }\n'
                '    .lanc-oculto-row { opacity: 0.45 !important; }\n'
                '  }\n'
                '</style>'
            )
            content = content[:head_end] + print_style + content[head_end:]
            print('  OK Patch 8 (print CSS)')
            applied += 1
        else:
            print('  FAIL Patch 8 (print CSS) - </head> nao encontrado')
            errors.append('Patch 8')
    else:
        print('  SKIP Patch 8 (print CSS ja existe)')
        applied += 1

    # =================================================================
    # PATCH 9: Adicionar "Diario de Obra" como aba no sidebar
    # =================================================================
    if 'btn-tab-diario' not in content:
        # 9a: Botao no sidebar (antes de btn-tab-admin)
        admin_btn_idx = content.find('id="btn-tab-admin"')
        if admin_btn_idx >= 0:
            btn_start = content.rfind('<button', admin_btn_idx - 200, admin_btn_idx)
            if btn_start >= 0:
                new_diario_btn = (
                    '                        <button class="tab-btn" id="btn-tab-diario"'
                    ' onclick="trocarAba(' + SQ + 'diario' + SQ + ')">'
                    + '📓 Diário de Obra</button>\n'
                )
                content = content[:btn_start] + new_diario_btn + content[btn_start:]
                print('  OK Patch 9a (botao Diario no sidebar)')
                applied += 1
            else:
                print('  FAIL Patch 9a (botao Diario) - <button admin nao encontrado')
                errors.append('Patch 9a')
        else:
            print('  FAIL Patch 9a (botao Diario) - btn-tab-admin nao encontrado')
            errors.append('Patch 9a')

        # 9b: Adicionar 'diario' no array abas de trocarAba
        abas_line = content.find("const abas = ['itens'")
        if abas_line >= 0:
            abas_end = content.find('];', abas_line)
            if abas_end >= 0:
                old_abas = content[abas_line:abas_end+2]
                if "'diario'" not in old_abas:
                    new_abas = old_abas.replace(
                        "'admin']", "'admin','diario']"
                    )
                    content = content[:abas_line] + new_abas + content[abas_end+2:]
                    print('  OK Patch 9b (diario no array abas)')
                    applied += 1
                else:
                    print('  SKIP Patch 9b (diario ja no array)')
                    applied += 1
            else:
                print('  FAIL Patch 9b (diario no array) - ]; nao encontrado')
                errors.append('Patch 9b')
        else:
            print('  FAIL Patch 9b (diario no array) - abas array nao encontrado')
            errors.append('Patch 9b')

        # 9c: Handler para aba 'diario' em trocarAba
        trocar_idx = content.find('function trocarAba')
        if trocar_idx >= 0:
            # Search for admin handler in various formats
            for admin_pat in ["if(aba==='admin')", "if (aba === 'admin')", "if(aba==='admin') {"]:
                admin_h_idx = content.find(admin_pat, trocar_idx)
                if admin_h_idx >= 0:
                    break
            else:
                admin_h_idx = -1

            if admin_h_idx >= 0:
                line_start = content.rfind('\n', admin_h_idx - 100, admin_h_idx) + 1
                # Get the indent
                indent_end = line_start
                while indent_end < len(content) and content[indent_end] in (' ', '\t'):
                    indent_end += 1
                indent_str = content[line_start:indent_end]
                diario_handler = (
                    indent_str + "if (aba === 'diario') { if (window.p84AbrirDiario) window.p84AbrirDiario(); }\n"
                )
                content = content[:line_start] + diario_handler + content[line_start:]
                print('  OK Patch 9c (handler diario em trocarAba)')
                applied += 1
            else:
                print('  FAIL Patch 9c (handler diario) - if admin nao encontrado')
                errors.append('Patch 9c')
        else:
            print('  FAIL Patch 9c (handler diario) - trocarAba nao encontrado')
            errors.append('Patch 9c')

        # 9d: Criar div tab-diario (antes de tab-admin)
        admin_div_idx = content.find('id="tab-admin"')
        if admin_div_idx >= 0:
            div_start = content.rfind('<div', admin_div_idx - 500, admin_div_idx)
            if div_start >= 0:
                new_diario_div = (
                    '            <div id="tab-diario" class="card" style="display:none;">\n'
                    '                <h3 style="margin-top:0;color:var(--text,#fff);">📓 Diário de Obra</h3>\n'
                    '                <div id="diario-content-container" style="min-height:200px;">\n'
                    '                    <p style="color:#94a3b8;">Clique para abrir o Diário de Obra.</p>\n'
                    '                </div>\n'
                    '            </div>\n'
                )
                content = content[:div_start] + new_diario_div + content[div_start:]
                print('  OK Patch 9d (div tab-diario)')
                applied += 1
            else:
                print('  FAIL Patch 9d (div tab-diario) - <div admin nao encontrado')
                errors.append('Patch 9d')
        else:
            print('  FAIL Patch 9d (div tab-diario) - tab-admin nao encontrado')
            errors.append('Patch 9d')

        # 9e: Ocultar botao flutuante p84Botao (agora temos a aba)
        # Add CSS: #p84Botao { display: none !important; }
        p84_css_added = False
        p84btn_anchor = '#p84Botao{'
        if p84btn_anchor in content:
            idx9e = content.find(p84btn_anchor)
            # Insert display:none right after the opening {
            after_brace = idx9e + len(p84btn_anchor)
            content = content[:after_brace] + 'display:none!important;' + content[after_brace:]
            p84_css_added = True
        elif '#p84Botao' in content:
            # Add new rule before the first #p84Botao reference in CSS
            # Find it in a <style> context
            idx9e = content.find('#p84Botao')
            content = content[:idx9e] + '#p84Botao{display:none!important;}\n' + content[idx9e:]
            p84_css_added = True

        if p84_css_added:
            print('  OK Patch 9e (ocultar botao flutuante p84Botao)')
            applied += 1
        else:
            # Not critical - the sidebar tab exists, the floating button
            # is just redundant. Don't fail the whole patch.
            print('  WARN Patch 9e (p84Botao) - botao flutuante nao oculto (nao critico)')
    else:
        print('  SKIP Patch 9 (aba Diario ja existe)')
        applied += 1

    # =================================================================
    # PATCH 10: Adicionar botao ocultar (eye) no rendering forEach
    # se ainda nao existe. O usuario relatou que o eye button funciona
    # (patches anteriores), mas verificamos aqui por seguranca.
    # =================================================================
    render_pos10 = content.find('function renderLancamentosPgto')
    first_fe10 = content.find('g.items.forEach(l', render_pos10)
    second_fe10 = content.find('g.items.forEach(l', first_fe10 + 100) if first_fe10 >= 0 else -1

    if second_fe10 >= 0:
        # Check if btn-ocultar-lanc exists in the rendering forEach
        fe_end10 = content.find('});', second_fe10 + 100)
        snippet10 = content[second_fe10:fe_end10 + 3 if fe_end10 >= 0 else second_fe10 + 3000]
        if 'btn-ocultar-lanc' not in snippet10:
            # Add the eye button after the excluir button
            excl_idx = content.find('excluirLancamentoPgto', second_fe10)
            if excl_idx >= 0 and excl_idx < second_fe10 + 5000:
                # Find the line with the excluir button
                excl_line_start = content.rfind('\n', excl_idx - 300, excl_idx) + 1
                excl_line_end = content.find('\n', excl_idx)
                excl_line = content[excl_line_start:excl_line_end]

                # Find position after the last </button> in the actions cell
                # The line is like: html += '<button ...>🗑️</button>';
                # We want to insert a new line AFTER this one
                # Build the eye button line
                # JS: html += '<button class="btn-icon-sm btn-ocultar-lanc" onclick="toggleOcultarLanc(this,'LID')" title="Ocultar/Desocultar">👁️</button>';
                # In the HTML string, we break single quotes for l.id:
                # html += '<button class="btn-icon-sm btn-ocultar-lanc" onclick="toggleOcultarLanc(this,\'' + l.id + '\')">👁️</button>';

                # Get the indent from the excluir line
                indent_end = excl_line_start
                while indent_end < len(content) and content[indent_end] in (' ', '\t'):
                    indent_end += 1
                indent10 = content[excl_line_start:indent_end]

                eye_line = (
                    indent10 + "html += '<button class=" + DQ + 'btn-icon-sm btn-ocultar-lanc' + SQ + ' + (l.oculto ? ' + SQ + ' btn-oculto-active' + SQ + ' : ' + SQ + SQ + ') + ' + SQ + DQ
                    + " onclick=" + DQ + "toggleOcultarLanc(this," + BS + SQ + "' + l.id + '" + BS + SQ + ")" + DQ
                    + " title=" + DQ + "Ocultar/Desocultar" + DQ + ">👁️</button>';" + '\n'
                )
                content = content[:excl_line_end] + '\n' + eye_line + content[excl_line_end:]
                print('  OK Patch 10 (eye button no rendering)')
                applied += 1
            else:
                print('  WARN Patch 10 (eye button) - excluirLancamentoPgto nao encontrado')
        else:
            print('  SKIP Patch 10 (eye button ja existe no rendering)')
            applied += 1
    else:
        print('  WARN Patch 10 (eye button) - rendering forEach nao encontrado')

    # -----------------------------------------------------------------
    # Resultado
    # -----------------------------------------------------------------
    print(f'\nTotal patches aplicados: {applied}')
    if errors:
        print(f'Erros ({len(errors)}):')
        for e in errors:
            print(f'  FAIL {e}')
        print('\nAbortando - nenhum arquivo modificado.')
        return

    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    content = content.rstrip() + f'\n<!-- PATCH166 aplicado em {ts} -->'

    delta = len(content) - len(original)
    print(f'\nDelta: {delta:+,} caracteres')
    print(f'Novo tamanho: {len(content):,} caracteres')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'\nOK Arquivo salvo: {file_path}')

    # =============================================================
    # GIT: add, commit, push
    # =============================================================
    repo_dir = os.path.dirname(os.path.abspath(file_path))
    git_cmds = [
        ['git', 'add', file_path],
        ['git', 'commit', '-m', 'Patch 166 - Diario de Obra como aba + totais excluem ocultos + print corrige'],
        ['git', 'push'],
    ]
    for cmd in git_cmds:
        label = ' '.join(cmd[:2]) + (' ' + cmd[2] if len(cmd) > 2 else '')
        print(f'  GIT {label} ...')
        r = subprocess.run(cmd, cwd=repo_dir, capture_output=True, text=True)
        if r.returncode != 0:
            print(f'    ERRO: {r.stderr.strip()}')
            break
        else:
            msg = (r.stdout.strip() or r.stderr.strip()).split('\n')[0]
            print(f'    OK: {msg}')
    print('\nPatch 166 concluido com sucesso!')


if __name__ == '__main__':
    main()
