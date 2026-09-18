#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch 165 - Recurso Oculto (soft-delete visual) nos lancamentos do Pagamento
=============================================================================
Exclui lancamentos ocultos dos totais (por obra e geral) e do resumo colabs.
O botao olho e a funcao toggleOcultarLanc ja existem (patch anterior).
Este patch completa a funcionalidade.
"""

import re, datetime

FILE_PATH = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html'


def main():
    print(f'Lendo: {FILE_PATH}')
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    print(f'Tamanho original: {len(content):,} caracteres')

    applied = 0
    errors = []

    # =================================================================
    # PATCH 1: CSS - base styles (only if not already present)
    # =================================================================
    if '.lanc-oculto-row td' not in content:
        p1_old = '.lanc-totals-row {'
        p1_new = (
            '/* PATCH165: estilo para lancamento oculto */\n'
            '              .lanc-oculto-row td { text-decoration: line-through !important; color: #94a3b8 !important; opacity: 0.45; }\n'
            '              .lanc-oculto-row td.lanc-actions { opacity: 1; }\n'
            '              .lanc-oculto-row td.lanc-actions button { opacity: 1; }\n'
            '              .btn-oculto-active { background: #fef3c7 !important; border-color: #d97706 !important; }\n'
            '              .lanc-totals-row {'
        )
        if p1_old in content:
            content = content.replace(p1_old, p1_new, 1)
            print('  OK Patch 1 (CSS base)')
            applied += 1
        else:
            print('  FAIL Patch 1 (CSS base) - .lanc-totals-row nao encontrado')
            errors.append('Patch 1')
    else:
        print('  SKIP Patch 1 (CSS ja existe)')
        applied += 1

    # =================================================================
    # PATCH 2: Ensure toggleOcultarLanc saves + re-renders
    # =================================================================
    has_func = 'function toggleOcultarLanc' in content
    if has_func:
        idx = content.find('function toggleOcultarLanc')
        # Find function body end (matching brace)
        brace_start = content.find('{', idx)
        depth = 1
        pos = brace_start + 1
        while depth > 0 and pos < len(content):
            if content[pos] == '{': depth += 1
            elif content[pos] == '}': depth -= 1
            pos += 1
        func_text = content[idx:pos]
        if 'salvarDB' in func_text and 'renderPagamento' in func_text:
            print('  SKIP Patch 2 (toggleOcultarLanc ja funciona)')
            applied += 1
        else:
            # Replace with correct implementation
            new_func = (
                'function toggleOcultarLanc(btn, lancId) {\n'
                '  /* PATCH165: salvar e re-renderizar */\n'
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
            content = content[:idx] + new_func + content[pos:]
            print('  OK Patch 2 (toggleOcultarLanc corrigido)')
            applied += 1
    else:
        # Add the function before renderLancamentosPgto
        anchor2 = 'function renderLancamentosPgto'
        if anchor2 in content:
            new_func = (
                '/* PATCH165: ocultar/desocultar lancamento */\n'
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
    # Real code has if-conditionals:
    #   g.items.forEach(l => {
    #     totalM2 += l.instalacaoM2;
    #     if ((l.profissionais || []).length > 0 && l.valorProf > 0)
    #     totalValProf += (l.profissionais || []).length * l.valorProf;
    #     if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)
    #     totalValAjud += (l.ajudantes || []).length * l.valorAjud;
    #   });
    # =================================================================
    pat3 = re.compile(
        r'g\.items\.forEach\(l\s*=>\s*\{\n'
        r'(\s+)totalM2\s*\+=\s*l\.instalacaoM2;\n'
        r'\s+if\s*\(\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorProf\s*>\s*0\s*\)\n'
        r'\s+totalValProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf;\n'
        r'\s+if\s*\(\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorAjud\s*>\s*0\s*\)\n'
        r'\s+totalValAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud;\n'
        r'(\s+)\}\s*\);'
    )
    render_pos3 = content.find('function renderLancamentosPgto')
    m3 = pat3.search(content, render_pos3 if render_pos3 >= 0 else 0)
    if m3:
        g1 = m3.group(1)   # indent before totalM2
        g2 = m3.group(2)   # indent before });
        replacement3 = (
            'g.items.forEach(l => {\n' +
            g1 + '/* PATCH165 */ if (!l.oculto) {\n' +
            g1 + 'totalM2 += l.instalacaoM2;\n' +
            g1 + 'if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n' +
            g1 + 'totalValProf += (l.profissionais || []).length * l.valorProf;\n' +
            g1 + 'if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n' +
            g1 + 'totalValAjud += (l.ajudantes || []).length * l.valorAjud;\n' +
            g1 + '}\n' +
            g2 + '});'
        )
        content = content[:m3.start()] + replacement3 + content[m3.end():]
        print('  OK Patch 3 (totais por obra)')
        applied += 1
    else:
        print('  FAIL Patch 3 (totais por obra) - padrao nao encontrado')
        errors.append('Patch 3')

    # =================================================================
    # PATCH 4: General totals in renderResumoPgto - exclude ocultos
    # Real code:
    #   lancs.forEach(l => {
    #     allLanc.push({ ...l, _obraId: obra.id });
    #     totalM2 += l.instalacaoM2;
    #     if ((l.profissionais || []).length > 0 && l.valorProf > 0)
    #       totalProf += (l.profissionais || []).length * l.valorProf;
    #     if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)
    #       totalAjud += (l.ajudantes || []).length * l.valorAjud;
    #   });
    # =================================================================
    pat4 = re.compile(
        r'lancs\.forEach\(l\s*=>\s*\{\n'
        r'(\s+)allLanc\.push\(\s*\{\s*\.\.\.l\s*,\s*_obraId:\s*obra\.id\s*\}\s*\);\n'
        r'\s+totalM2\s*\+=\s*l\.instalacaoM2;\n'
        r'\s+if\s*\(\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorProf\s*>\s*0\s*\)\n'
        r'\s+totalProf\s*\+=\s*\(l\.profissionais\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorProf;\n'
        r'\s+if\s*\(\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*>\s*0\s*&&\s*l\.valorAjud\s*>\s*0\s*\)\n'
        r'\s+totalAjud\s*\+=\s*\(l\.ajudantes\s*\|\|\s*\[\]\)\.length\s*\*\s*l\.valorAjud;\n'
        r'(\s+)\}\s*\);'
    )
    resumo_pos4 = content.find('function renderResumoPgto')
    m4 = pat4.search(content, resumo_pos4 if resumo_pos4 >= 0 else 0)
    if m4:
        g1 = m4.group(1)   # indent before allLanc.push
        g2 = m4.group(2)   # indent before });
        replacement4 = (
            'lancs.forEach(l => {\n' +
            g1 + '/* PATCH165 */ if (!l.oculto) {\n' +
            g1 + 'allLanc.push({ ...l, _obraId: obra.id });\n' +
            g1 + 'totalM2 += l.instalacaoM2;\n' +
            g1 + 'if ((l.profissionais || []).length > 0 && l.valorProf > 0)\n' +
            g1 + '  totalProf += (l.profissionais || []).length * l.valorProf;\n' +
            g1 + 'if ((l.ajudantes || []).length > 0 && l.valorAjud > 0)\n' +
            g1 + '  totalAjud += (l.ajudantes || []).length * l.valorAjud;\n' +
            g1 + '}\n' +
            g2 + '});'
        )
        content = content[:m4.start()] + replacement4 + content[m4.end():]
        print('  OK Patch 4 (totais gerais)')
        applied += 1
    else:
        print('  FAIL Patch 4 (totais gerais) - padrao nao encontrado')
        errors.append('Patch 4')

    # =================================================================
    # PATCH 5: Resumo colaboradores - skip ocultos
    # Target the allLanc.forEach inside renderResumoPgto (colabs section)
    # Add 'if (l.oculto) return;' right after the opening {
    # =================================================================
    if '/* PATCH165 */ if (l.oculto) return;' not in content:
        # Find the allLanc.forEach in the colabs section of renderResumoPgto
        # This is the one that iterates profissionais and ajudantes for colabsMap
        resumo_pos5 = content.find('function renderResumoPgto')
        search5 = resumo_pos5 if resumo_pos5 >= 0 else 0

        # Find 'allLanc.forEach(l' occurrences after renderResumoPgto
        # We want the one that builds colabsMap (has 'profissionais' and 'colabsMap')
        # Note: 'ajudantes' may be beyond 200 chars, so we check a wider window
        idx5 = search5
        found5 = False
        for _ in range(10):  # safety limit
            idx5 = content.find('allLanc.forEach(l', idx5)
            if idx5 < 0:
                break
            # Check if this is the colabs forEach by looking at surrounding code
            after = content[idx5:idx5+500]
            if 'profissionais' in after and 'colabsMap' in after:
                # Found it! Insert after the opening {
                brace_pos = content.find('{', idx5)
                if brace_pos >= 0:
                    insert_point = brace_pos + 1
                    # Get the indentation of the next line
                    nl_pos = content.find('\n', brace_pos)
                    if nl_pos >= 0:
                        line_start = nl_pos + 1
                        indent_end = line_start
                        while indent_end < len(content) and content[indent_end] in (' ', '\t'):
                            indent_end += 1
                        indent_str = content[line_start:indent_end]
                        insert_text = '\n' + indent_str + '/* PATCH165 */ if (l.oculto) return;'
                        content = content[:insert_point] + insert_text + content[insert_point:]
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
    # PATCH 6: TR class - add lanc-oculto-row when oculto
    # Real code: html += '<tr data-lanc-row="' + l.id + '">';
    # =================================================================
    old6 = "html += '<tr data-lanc-row=\"' + l.id + '\">';"
    new6 = "html += '<tr class=\"' + (l.oculto ? 'lanc-oculto-row' : '') + '\" data-lanc-row=\"' + l.id + '\">';"
    if old6 in content:
        content = content.replace(old6, new6, 1)
        print('  OK Patch 6 (classe TR)')
        applied += 1
    else:
        # Maybe already patched? Check
        if 'lanc-oculto-row' in content and 'data-lanc-row' in content:
            print('  SKIP Patch 6 (ja aplicado)')
            applied += 1
        else:
            print('  FAIL Patch 6 (classe TR) - padrao nao encontrado')
            errors.append('Patch 6')

    # =================================================================
    # PATCH 7: Eye button - add btn-oculto-active when oculto
    # The raw file text contains (inside a JS single-quoted html string):
    #   btn-icon-sm btn-ocultar-lanc" data-lanc-id="
    # We need to break the JS string and add a conditional class:
    #   btn-icon-sm btn-ocultar-lanc' + (l.oculto ? ' btn-oculto-active' : '') + '" data-lanc-id="
    # In Python, SQ=chr(39) for the single quotes that delimit JS strings.
    # =================================================================
    SQ = chr(39)  # single quote
    old7 = 'btn-icon-sm btn-ocultar-lanc" data-lanc-id="'
    new7 = 'btn-icon-sm btn-ocultar-lanc' + SQ + ' + (l.oculto ? ' + SQ + ' btn-oculto-active' + SQ + ' : ' + SQ + SQ + ') + ' + SQ + '" data-lanc-id="'
    if old7 in content:
        content = content.replace(old7, new7, 1)
        print('  OK Patch 7 (botao ativo)')
        applied += 1
    else:
        if 'btn-oculto-active' in content:
            print('  SKIP Patch 7 (ja aplicado)')
            applied += 1
        else:
            print('  FAIL Patch 7 (botao ativo) - padrao nao encontrado')
            errors.append('Patch 7')

    # =================================================================
    # PATCH 8: Print CSS (separate <style> block before </head>)
    # =================================================================
    if 'patch165-print-css' not in content:
        head_end = content.find('</head>')
        if head_end >= 0:
            print_style = (
                '\n<style id="patch165-print-css">\n'
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
    content = content.rstrip() + f'\n<!-- PATCH165 aplicado em {ts} -->'

    delta = len(content) - len(original)
    print(f'\nDelta: {delta:+,} caracteres')
    print(f'Novo tamanho: {len(content):,} caracteres')

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'\nOK Arquivo salvo: {FILE_PATH}')

    # =============================================================
    # GIT: add, commit, push
    # =============================================================
    import subprocess, os
    repo_dir = os.path.dirname(os.path.abspath(FILE_PATH))
    git_cmds = [
        ['git', 'add', FILE_PATH],
        ['git', 'commit', '-m', 'Patch 165 - Recurso oculto (soft-delete visual) nos lancamentos do Pagamento'],
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
    print('\nPatch 165 concluido com sucesso!')


if __name__ == '__main__':
    main()
