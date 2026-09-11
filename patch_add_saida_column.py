#!/usr/bin/env python3
"""
Patch: Adiciona coluna "Qtd. Saída" e "Saldo" ao Recebimento de Materiais

Changes:
- Main recebimento table: +2 columns (Qtd. Saída, Saldo) after Qtd. Recebida
- Consolidated table: +2 columns (Qtd. Saída, Saldo) after Qtd. Recebida + fix Qtd. Prevista bug
- Modal form: +recQtdSaida input field
- renderRecebimentos: +qtdSaida editable input + computed saldo cell
- salvarNovoRecebimento: +qtdSaida field
- abrirModalRecebimento: +recQtdSaida reset
- editarRecebimento: +qtdSaida in numeric fields
- obterMateriaisConsolidados: +qtdSaida accumulation + saldo calculation
- renderMateriaisConsolidados: fix Qtd. Prevista bug, add Qtd. Saída, Saldo
- exportarMateriaisConsolidados: add Qtd. Prevista, Qtd. Saída, Saldo columns
- processarImportacaoRecebimento: +qtdSaida: 0
- normalizarRecebimentosAntigos: +qtdSaida default 0

Saldo = Qtd. Recebida - Qtd. Saída
"""

import os, sys

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')

def read_file():
    with open(FILE, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(content):
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

def apply():
    html = read_file()
    original_len = len(html)
    changes = 0

    # =========================================================================
    # 1. MAIN RECEBIMENTO TABLE HEADER: Add Qtd. Saída and Saldo after Qtd. Recebida
    # =========================================================================
    old_h1 = '<th class="head-base">\n                                        <div class="th-content">Qtd. Recebida</div>\n                                    </th>\n                                    <th class="head-base">\n                                        <div class="th-content">Unid.</div>\n                                    </th>'
    new_h1 = '<th class="head-base">\n                                        <div class="th-content">Qtd. Recebida</div>\n                                    </th>\n                                    <th class="head-base">\n                                        <div class="th-content">Qtd. Sa\u00edda</div>\n                                    </th>\n                                    <th class="head-base">\n                                        <div class="th-content">Saldo</div>\n                                    </th>\n                                    <th class="head-base">\n                                        <div class="th-content">Unid.</div>\n                                    </th>'

    if old_h1 in html:
        html = html.replace(old_h1, new_h1, 1)
        changes += 1
        print('  [OK] 1. Main recebimento header: added Qtd. Saida + Saldo columns')
    else:
        print('  [ERRO] 1. Main recebimento header: string not found!')

    # =========================================================================
    # 2. CONSOLIDATED TABLE HEADER: Add Qtd. Saída and Saldo after Qtd. Recebida
    # =========================================================================
    old_h2 = '<th class="head-base">\n                                            <div class="th-content">Qtd. Recebida</div>\n                                        </th>\n                                        <th class="head-base">\n                                            <div class="th-content">Unid.</div>\n                                        </th>'
    new_h2 = '<th class="head-base">\n                                            <div class="th-content">Qtd. Recebida</div>\n                                        </th>\n                                        <th class="head-base">\n                                            <div class="th-content">Qtd. Sa\u00edda</div>\n                                        </th>\n                                        <th class="head-base">\n                                            <div class="th-content">Saldo</div>\n                                        </th>\n                                        <th class="head-base">\n                                            <div class="th-content">Unid.</div>\n                                        </th>'

    if old_h2 in html:
        html = html.replace(old_h2, new_h2, 1)
        changes += 1
        print('  [OK] 2. Consolidated header: added Qtd. Saida + Saldo columns')
    else:
        print('  [ERRO] 2. Consolidated header: string not found!')

    # =========================================================================
    # 3. MODAL FORM: Add recQtdSaida input field after recQtdRecebida
    # =========================================================================
    old_m = '<div class="form-group">\n                            <label>Quantidade Recebida</label>\n                            <input type="number" step="0.01" min="0" id="recQtdRecebida" value="0">\n                        </div>\n                        <div class="form-group">\n                            <label>Status</label>'
    new_m = '<div class="form-group">\n                            <label>Quantidade Recebida</label>\n                            <input type="number" step="0.01" min="0" id="recQtdRecebida" value="0">\n                        </div>\n                        <div class="form-group">\n                            <label>Quantidade Sa\u00edda</label>\n                            <input type="number" step="0.01" min="0" id="recQtdSaida" value="0">\n                        </div>\n                        <div class="form-group">\n                            <label>Status</label>'

    if old_m in html:
        html = html.replace(old_m, new_m, 1)
        changes += 1
        print('  [OK] 3. Modal form: added recQtdSaida input field')
    else:
        print('  [ERRO] 3. Modal form: string not found!')

    # =========================================================================
    # 4. renderRecebimentos: Add qtdSaida input + saldo cell in row template
    #    Strategy: Find the qtdRecebida <td> block and the unidade <td> block,
    #    then insert qtdSaida and saldo <td> blocks between them.
    # =========================================================================
    marker_recv = '<input type="number" step="0.01" min="0" value="${Number(r.qtdRecebida || 0)}" onchange="editarRecebimento(${r.id},\'qtdRecebida\',this.value)">'
    idx_recv = html.find(marker_recv)
    if idx_recv >= 0:
        # Find the surrounding <td>...</td>
        td_start_recv = html.rfind('<td>', 0, idx_recv)
        td_end_recv = html.find('</td>', idx_recv) + len('</td>')
        td_recv_block = html[td_start_recv:td_end_recv]

        # Find the unidade <td> block
        marker_unid = '<td><select onchange="editarRecebimento(${r.id},\'unidade\',this.value)">'
        idx_unid = html.find(marker_unid, td_end_recv)
        if idx_unid >= 0:
            td_end_unid = html.find('</select></td>', idx_unid) + len('</select></td>')
            td_unid_block = html[idx_unid:td_end_unid]

            # Insert between the two td blocks
            td_saida_block = "<td><input type=\"number\" step=\"0.01\" min=\"0\" value=\"${Number(r.qtdSaida || 0)}\" onchange=\"editarRecebimento(${r.id},'qtdSaida',this.value)\"></td>"
            td_saldo_block = '<td style="font-weight:700;color:${(Number(r.qtdRecebida||0) - Number(r.qtdSaida||0)) < 0 ? \'var(--danger,#e74c3c)\' : \'var(--success,#16a34a)\'}">${(Number(r.qtdRecebida||0) - Number(r.qtdSaida||0)).toLocaleString(\'pt-BR\',{maximumFractionDigits:2})}</td>'

            old_pair = td_recv_block + '\n' + td_unid_block
            new_pair = td_recv_block + '\n' + td_saida_block + '\n' + td_saldo_block + '\n' + td_unid_block

            html = html.replace(old_pair, new_pair, 1)
            changes += 1
            print('  [OK] 4. renderRecebimentos: added qtdSaida input + saldo cell')
        else:
            print('  [ERRO] 4. renderRecebimentos row: unidade td not found!')
    else:
        print('  [ERRO] 4. renderRecebimentos row: qtdRecebida input not found!')

    # =========================================================================
    # 5. salvarNovoRecebimento: Add qtdSaida variable
    # =========================================================================
    old_sv = "const qtdPrevista = Number(document.getElementById('recQtdPrevista').value) || 0;\n                    const qtdRecebida = Number(document.getElementById('recQtdRecebida').value) || 0;"
    new_sv = "const qtdPrevista = Number(document.getElementById('recQtdPrevista').value) || 0;\n                    const qtdRecebida = Number(document.getElementById('recQtdRecebida').value) || 0;\n                    const qtdSaida = Number(document.getElementById('recQtdSaida').value) || 0;"

    if old_sv in html:
        html = html.replace(old_sv, new_sv, 1)
        changes += 1
        print('  [OK] 5a. salvarNovoRecebimento: added qtdSaida variable')
    else:
        print('  [ERRO] 5a. salvarNovoRecebimento vars: string not found!')

    # 5b. Add qtdSaida to the push object
    old_push = "qtdPrevista, qtdRecebida,\n                        unidade: document.getElementById('recUnidade').value,"
    new_push = "qtdPrevista, qtdRecebida, qtdSaida,\n                        unidade: document.getElementById('recUnidade').value,"

    if old_push in html:
        html = html.replace(old_push, new_push, 1)
        changes += 1
        print('  [OK] 5b. salvarNovoRecebimento: added qtdSaida to push object')
    else:
        print('  [ERRO] 5b. salvarNovoRecebimento push: string not found!')

    # =========================================================================
    # 6. abrirModalRecebimento: Add recQtdSaida reset
    # =========================================================================
    old_ab = "document.getElementById('recQtdPrevista').value = 0;\n                    document.getElementById('recQtdRecebida').value = 0;"
    new_ab = "document.getElementById('recQtdPrevista').value = 0;\n                    document.getElementById('recQtdRecebida').value = 0;\n                    document.getElementById('recQtdSaida').value = 0;"

    if old_ab in html:
        html = html.replace(old_ab, new_ab, 1)
        changes += 1
        print('  [OK] 6. abrirModalRecebimento: added recQtdSaida reset')
    else:
        print('  [ERRO] 6. abrirModalRecebimento: string not found!')

    # =========================================================================
    # 7. editarRecebimento: Add qtdSaida to numeric fields
    # =========================================================================
    old_ed = "item[campo] = ['qtdPrevista', 'qtdRecebida'].includes(campo) ? (Number(valor) || 0) : valor;\n                    if ((campo === 'qtdPrevista' || campo === 'qtdRecebida') && item.status !== 'Rejeitado') {"
    new_ed = "item[campo] = ['qtdPrevista', 'qtdRecebida', 'qtdSaida'].includes(campo) ? (Number(valor) || 0) : valor;\n                    if (['qtdPrevista', 'qtdRecebida', 'qtdSaida'].includes(campo) && item.status !== 'Rejeitado') {"

    if old_ed in html:
        html = html.replace(old_ed, new_ed, 1)
        changes += 1
        print('  [OK] 7. editarRecebimento: added qtdSaida to numeric fields')
    else:
        print('  [ERRO] 7. editarRecebimento: string not found!')

    # =========================================================================
    # 8. obterMateriaisConsolidados: Add qtdSaida to map init + accumulation + saldo
    # =========================================================================
    old_mi = "qtdRecebida: 0,\n                                qtdPrevista: 0,\n                                ocorrencias: 0,"
    new_mi = "qtdRecebida: 0,\n                                qtdPrevista: 0,\n                                qtdSaida: 0,\n                                ocorrencias: 0,"

    if old_mi in html:
        html = html.replace(old_mi, new_mi, 1)
        changes += 1
        print('  [OK] 8a. obterMateriaisConsolidados: added qtdSaida: 0 to map init')
    else:
        print('  [ERRO] 8a. obterMateriaisConsolidados map init: string not found!')

    old_ac = "item.qtdRecebida += Number(r.qtdRecebida || 0);\n                        item.qtdPrevista += Number(r.qtdPrevista || 0);"
    new_ac = "item.qtdRecebida += Number(r.qtdRecebida || 0);\n                        item.qtdPrevista += Number(r.qtdPrevista || 0);\n                        item.qtdSaida += Number(r.qtdSaida || 0);"

    if old_ac in html:
        html = html.replace(old_ac, new_ac, 1)
        changes += 1
        print('  [OK] 8b. obterMateriaisConsolidados: added qtdSaida accumulation')
    else:
        print('  [ERRO] 8b. obterMateriaisConsolidados accumulation: string not found!')

    old_res = "resultado.forEach(item => item.listasCorte = Array.from(item.listasCorte).sort());"
    new_res = "resultado.forEach(item => {\n                        item.listasCorte = Array.from(item.listasCorte).sort();\n                        item.saldo = Number(item.qtdRecebida || 0) - Number(item.qtdSaida || 0);\n                    });"

    if old_res in html:
        html = html.replace(old_res, new_res, 1)
        changes += 1
        print('  [OK] 8c. obterMateriaisConsolidados: added saldo calculation')
    else:
        print('  [ERRO] 8c. obterMateriaisConsolidados resultado: string not found!')

    # =========================================================================
    # 9. renderMateriaisConsolidados: Fix Qtd. Prevista bug + add Qtd. Saída + Saldo
    # =========================================================================
    # Find the tbody.innerHTML assignment for consolidated materials
    marker_con = "tbody.innerHTML = materiais.map(m => `<tr>"
    idx_con = html.find(marker_con)
    if idx_con >= 0:
        idx_end_con = html.find("join('');", idx_con)
        if idx_end_con >= 0:
            old_con = html[idx_con:idx_end_con + len("join('');")]

            new_con = "tbody.innerHTML = materiais.map(m => {\n                        const saldo = Number(m.saldo || 0);\n                        return `<tr>\n"
            new_con += "                            <td>${escaparHTML((m.listasCorte || []).join(', ') || '-')}</td>\n"
            new_con += '                            <td><span class="material-badge">${escaparHTML(m.classe || \'-\')}</span></td>\n'
            new_con += "                            <td class=\"text-left\">${escaparHTML(m.marca || '-')}</td>\n"
            new_con += "                            <td class=\"text-left\">${escaparHTML(m.codigoCor || '-')}</td>\n"
            new_con += "                            <td class=\"text-left\">${escaparHTML(m.descricao || '-')}</td>\n"
            new_con += "                            <td>${Number(m.qtdPrevista || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>\n"
            new_con += "                            <td>${Number(m.qtdRecebida || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>\n"
            new_con += "                            <td>${Number(m.qtdSaida || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>\n"
            new_con += '                            <td style="font-weight:700;color:${saldo < 0 ? \'var(--danger,#e74c3c)\' : \'var(--success,#16a34a)\'}">${saldo.toLocaleString(\'pt-BR\',{maximumFractionDigits:2})}</td>\n'
            new_con += "                            <td>${escaparHTML(m.unidade || 'UN')}</td>\n"
            new_con += "                            <td>${m.ocorrencias}</td>\n"
            new_con += "                            <td>${escaparHTML(m.ultimoRecebimento || '-')}</td>\n"
            new_con += "                        </tr>`;\n"
            new_con += "                    }).join('');"

            html = html.replace(old_con, new_con, 1)
            changes += 1
            print('  [OK] 9. renderMateriaisConsolidados: fixed Qtd.Prevista bug + added Qtd.Saida + Saldo')
        else:
            print('  [ERRO] 9. renderMateriaisConsolidados body: join end not found!')
    else:
        print('  [ERRO] 9. renderMateriaisConsolidados body: start not found!')

    # =========================================================================
    # 10. exportarMateriaisConsolidados: Add Qtd. Prevista, Qtd. Saída, Saldo
    # =========================================================================
    old_csh = "['Lista(s) de Corte', 'Classe', 'Marca', 'C\u00f3digo - Cor', 'Descri\u00e7\u00e3o', 'Quantidade Recebida', 'Unidade', 'Ocorr\u00eancias', '\u00daltimo Recebimento']"
    new_csh = "['Lista(s) de Corte', 'Classe', 'Marca', 'C\u00f3digo - Cor', 'Descri\u00e7\u00e3o', 'Quantidade Prevista', 'Quantidade Recebida', 'Quantidade Sa\u00edda', 'Saldo', 'Unidade', 'Ocorr\u00eancias', '\u00daltimo Recebimento']"

    if old_csh in html:
        html = html.replace(old_csh, new_csh, 1)
        changes += 1
        print('  [OK] 10a. exportarMateriaisConsolidados: added columns to CSV header')
    else:
        print('  [ERRO] 10a. exportarMateriaisConsolidados CSV header: string not found!')

    old_csr = "(m.listasCorte || []).join(', '), m.classe, m.marca, m.codigoCor, m.descricao,\n                            m.qtdRecebida, m.unidade, m.ocorrencias, m.ultimoRecebimento"
    new_csr = "(m.listasCorte || []).join(', '), m.classe, m.marca, m.codigoCor, m.descricao,\n                            m.qtdPrevista, m.qtdRecebida, m.qtdSaida, m.saldo, m.unidade, m.ocorrencias, m.ultimoRecebimento"

    if old_csr in html:
        html = html.replace(old_csr, new_csr, 1)
        changes += 1
        print('  [OK] 10b. exportarMateriaisConsolidados: added fields to CSV rows')
    else:
        print('  [ERRO] 10b. exportarMateriaisConsolidados CSV rows: string not found!')

    # =========================================================================
    # 11. processarImportacaoRecebimento: Add qtdSaida: 0
    # =========================================================================
    old_imp = "qtdPrevista: quantidade,\n                            qtdRecebida: 0,\n                            unidade: 'UN',"
    new_imp = "qtdPrevista: quantidade,\n                            qtdRecebida: 0,\n                            qtdSaida: 0,\n                            unidade: 'UN',"

    if old_imp in html:
        html = html.replace(old_imp, new_imp, 1)
        changes += 1
        print('  [OK] 11. processarImportacaoRecebimento: added qtdSaida: 0')
    else:
        print('  [ERRO] 11. processarImportacaoRecebimento: string not found!')

    # =========================================================================
    # 12. normalizarRecebimentosAntigos: Add qtdSaida default
    # =========================================================================
    old_nr = "if (r.ref === undefined) r.ref = r.codigoCor || '';\n                    });"
    new_nr = "if (r.ref === undefined) r.ref = r.codigoCor || '';\n                        if (r.qtdSaida === undefined) r.qtdSaida = 0;\n                    });"

    if old_nr in html:
        html = html.replace(old_nr, new_nr, 1)
        changes += 1
        print('  [OK] 12. normalizarRecebimentosAntigos: added qtdSaida default')
    else:
        print('  [ERRO] 12. normalizarRecebimentosAntigos: string not found!')

    # =========================================================================
    # Write result
    # =========================================================================
    if changes > 0:
        write_file(html)
        new_len = len(html)
        print(f'\n  SUCCESS: {changes} changes applied!')
        print(f'  Size: {original_len:,} -> {new_len:,} chars (+{new_len - original_len:,})')
    else:
        print('\n  FAILED: No changes applied - check errors above.')
        sys.exit(1)

if __name__ == '__main__':
    print('=' * 60)
    print('Patch: Adicionar Qtd. Saida + Saldo ao Recebimento')
    print('=' * 60)
    apply()
    print('=' * 60)
    print('Concluido!')
