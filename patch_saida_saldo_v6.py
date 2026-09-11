#!/usr/bin/env python3
"""
PATCH v6 – Adiciona colunas 'Qtd. Saída' e 'Saldo' ao Recebimento de Materiais
           E corrige 3 bugs pre-existentes que quebram o app:
           (1) escaparHTML is not defined  → window.escaparHTML + fallback
           (2) window.debounceRender is not a function → window.debounceRender + oninput fix
           (3) p38ListaColaboradores usa db cru (let-scoped) → fallback seguro

Uso:  python patch_saida_saldo_v6.py

Arquivo alvo (definido em LOCAL_FILE) – ajuste o caminho conforme necessário.
O script faz backup automático antes de aplicar as alterações.
"""

import os, shutil, datetime, re

# ======================================================================
#  CONFIGURAÇÃO – caminho do arquivo local do usuário
# ======================================================================
LOCAL_FILE = r"C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html"

# ======================================================================
#  HELPERS
# ======================================================================
def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

def backup(path):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    bak = path + f".bak_v6_{ts}"
    shutil.copy2(path, bak)
    print(f"[v6] Backup criado: {bak}")
    return bak

def apply(text, old, new, label="patch"):
    count = text.count(old)
    if count == 0:
        print(f"[v6] \u26a0 NAO ENCONTRADO: {label}")
        print(f"     Procurando: {repr(old[:80])}...")
        return text, False
    if count > 1:
        print(f"[v6] \u26a0 MULTIPLOS ({count}): {label} – usando primeira ocorrencia")
    text = text.replace(old, new, 1)
    print(f"[v6] \u2713 Aplicado: {label}")
    return text, True

def apply_all(text, old, new, label="patch"):
    count = text.count(old)
    if count == 0:
        print(f"[v6] \u26a0 NAO ENCONTRADO: {label}")
        return text, 0
    text = text.replace(old, new)
    print(f"[v6] \u2713 Aplicado: {label} ({count}x)")
    return text, count

# ======================================================================
#  MAIN
# ======================================================================
def main():
    if not os.path.isfile(LOCAL_FILE):
        print(f"[v6] Arquivo nao encontrado: {LOCAL_FILE}")
        print( "[v6] Ajuste a variavel LOCAL_FILE no topo deste script.")
        return

    html = read_file(LOCAL_FILE)
    original_len = len(html)
    print(f"[v6] Arquivo lido: {original_len:,} caracteres")
    backup(LOCAL_FILE)

    ok = 0
    fail = 0

    # -----------------------------------------------------------------
    #  FIX 1: escaparHTML is not defined
    #
    #  Root cause: escaparHTML is a function declaration in script
    #  block #10. p38PopularSelect is in block #11. If block #10
    #  throws a runtime error BEFORE escaparHTML is defined, the
    #  function never becomes available → breaks all p38 selects,
    #  which breaks p38SincronizarSelects, which breaks
    #  renderCustoDashboard, which cascades to break the ENTIRE
    #  render() → all obras appear empty.
    #
    #  Solution:
    #  (a) window.escaparHTML = escaparHTML right after definition
    #  (b) fallback global at start of block #11
    #  (c) defensive calls in p38 template literals
    # -----------------------------------------------------------------

    # 1a – window.escaparHTML logo apos a definicao da funcao
    #      NOTE: the uploaded file has 2 blank lines between the
    #      closing brace and function titleCase (extra \n            \n)
    old_1a = (
        "replace(/'/g, '&#039;');\n"
        "                }\n"
        "            \n"
        "            \n"
        "                function titleCase"
    )
    new_1a = (
        "replace(/'/g, '&#039;');\n"
        "                }\n"
        "                window.escaparHTML = window.escaparHTML || escaparHTML;\n"
        "            \n"
        "            \n"
        "                function titleCase"
    )
    html, done = apply(html, old_1a, new_1a, "FIX1a – window.escaparHTML apos definicao")
    ok += done; fail += not done

    # 1b – Fallback no inicio do script block #11
    #      Inserir antes da primeira funcao p38*
    old_1b = "function p38ListaColaboradores("
    new_1b = (
        "/* [v6-FIX] fallback escaparHTML se block anterior falhou */\n"
        "                if (typeof window.escaparHTML !== 'function' && typeof escaparHTML !== 'function') {\n"
        "                    window.escaparHTML = function(v){ return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;'); };\n"
        "                } else if (typeof escaparHTML === 'function' && !window.escaparHTML) {\n"
        "                    window.escaparHTML = escaparHTML;\n"
        "                }\n"
        "                function p38ListaColaboradores("
    )
    html, done = apply(html, old_1b, new_1b, "FIX1b – fallback escaparHTML antes de p38")
    ok += done; fail += not done

    # 1c – Trocar escaparHTML( por (window.escaparHTML||escaparHTML)( nos selects p38
    #      Somente nos padroes especificos de p38PopularSelect
    old_1c_1 = 'escaparHTML(o.id)}">${escaparHTML(o.nome)}</option>`;'
    new_1c_1 = '(window.escaparHTML||escaparHTML)(o.id)}">${(window.escaparHTML||escaparHTML)(o.nome)}</option>`;'
    html, cnt = apply_all(html, old_1c_1, new_1c_1, "FIX1c-1 – escaparHTML fallback em p38 obra options")
    if cnt > 0: ok += 1
    else: fail += 1

    old_1c_2 = 'escaparHTML(c.id)}">${escaparHTML(c.nome)}</option>`;'
    new_1c_2 = '(window.escaparHTML||escaparHTML)(c.id)}">${(window.escaparHTML||escaparHTML)(c.nome)}</option>`;'
    html, cnt = apply_all(html, old_1c_2, new_1c_2, "FIX1c-2 – escaparHTML fallback em p38 colaborador options")
    if cnt > 0: ok += 1
    else: fail += 1

    # -----------------------------------------------------------------
    #  FIX 2: window.debounceRender is not a function
    # -----------------------------------------------------------------

    # 2a – window.debounceRender apos a definicao
    old_2a = (
        "renderTimer = setTimeout(() => render(), 250);\n"
        "                }\n"
        "            \n"
        "                function getObraAtual"
    )
    new_2a = (
        "renderTimer = setTimeout(() => render(), 250);\n"
        "                }\n"
        "                window.debounceRender = window.debounceRender || debounceRender;\n"
        "            \n"
        "                function getObraAtual"
    )
    html, done = apply(html, old_2a, new_2a, "FIX2a – window.debounceRender apos definicao")
    ok += done; fail += not done

    # 2b – Trocar oninput="debounceRender()" por oninput="window.debounceRender()"
    old_2b = 'oninput="debounceRender()"'
    new_2b = 'oninput="window.debounceRender()"'
    html, cnt = apply_all(html, old_2b, new_2b, "FIX2b – oninput handlers")
    if cnt > 0: ok += 1
    else: fail += 1

    # -----------------------------------------------------------------
    #  FIX 3: p38ListaColaboradores usa db cru (let-scoped, not on window)
    #      The function accesses db.obras directly. If db is let-scoped
    #      inside block #10 and block #10 fails, db is undefined.
    #      Fix: add safe typeof check + fallback.
    # -----------------------------------------------------------------

    # The actual pattern in the file is:
    #   (db.obras || []).forEach(function(o){
    #   ...if(obraId && o.id !== obraId) return;
    # We need to make the db access safe
    old_3 = "(db.obras || []).forEach(function(o){\n"
    "                      if(obraId && o.id !== obraId) return;"
    new_3 = (
        "((typeof db !== 'undefined' && db && db.obras) ? db.obras : (window.dbObras || [])).forEach(function(o){\n"
        "                      if(obraId && o.id !== obraId) return;"
    )
    # This pattern appears multiple times in the file, so scope to p38ListaColaboradores
    p38_pos = html.find("function p38ListaColaboradores")
    if p38_pos >= 0:
        # Search within 500 chars after function start
        sub = html[p38_pos:p38_pos+600]
        if old_3 in sub:
            html = html[:p38_pos] + sub.replace(old_3, new_3, 1) + html[p38_pos+600:]
            print(f"[v6] \u2713 Aplicado: FIX3 – fallback db em p38ListaColaboradores")
            ok += 1
        else:
            print(f"[v6] \u26a0 NAO ENCONTRADO: FIX3 (padrao dentro de p38ListaColaboradores)")
            fail += 1
    else:
        print(f"[v6] \u26a0 NAO ENCONTRADO: FIX3 (p38ListaColaboradores nao encontrada)")
        fail += 1

    # -----------------------------------------------------------------
    #  FEATURE: Colunas "Qtd. Saída" e "Saldo" no Recebimento de Materiais
    # -----------------------------------------------------------------

    # 4a – THEAD: inserir <th> apos "Qtd. Recebida"
    old_4a = (
        '<div class="th-content">Qtd. Recebida</div>\n'
        '                                    </th>\n'
        '                                    <th class="head-base">\n'
        '                                        <div class="th-content">Unid.</div>'
    )
    new_4a = (
        '<div class="th-content">Qtd. Recebida</div>\n'
        '                                    </th>\n'
        '                                    <th class="head-base">\n'
        '                                        <div class="th-content">Qtd. Sa\u00edda</div>\n'
        '                                    </th>\n'
        '                                    <th class="head-base">\n'
        '                                        <div class="th-content">Saldo</div>\n'
        '                                    </th>\n'
        '                                    <th class="head-base">\n'
        '                                        <div class="th-content">Unid.</div>'
    )
    html, done = apply(html, old_4a, new_4a, "FEATURE4a – THEAD: colunas Qtd. Saida + Saldo")
    ok += done; fail += not done

    # 4b – TBODY (renderRecebimentos): inserir <td> apos qtdRecebida
    old_4b = (
        '<td><input type="number" step="0.01" min="0" value="${Number(r.qtdRecebida || 0)}" '
        'onchange="editarRecebimento(${r.id},\'qtdRecebida\',this.value)"></td>\n'
        '                                <td><select'
    )
    new_4b = (
        '<td><input type="number" step="0.01" min="0" value="${Number(r.qtdRecebida || 0)}" '
        'onchange="editarRecebimento(${r.id},\'qtdRecebida\',this.value)"></td>\n'
        '                                <td><input type="number" step="0.01" min="0" value="${Number(r.qtdSaida || 0)}" '
        'onchange="editarRecebimento(${r.id},\'qtdSaida\',this.value)"></td>\n'
        '                                <td style="text-align:right;font-weight:600;">${(Number(r.qtdRecebida||0) - Number(r.qtdSaida||0)).toFixed(2).replace(/\\.00$/,\'\'')}</td>\n'
        '                                <td><select'
    )
    html, done = apply(html, old_4b, new_4b, "FEATURE4b – renderRecebimentos: cells Saida + Saldo")
    ok += done; fail += not done

    # 4c – editarRecebimento: qtdSaida nos campos numericos
    old_4c = "item[campo] = ['qtdPrevista', 'qtdRecebida'].includes(campo) ? (Number(valor) || 0) : valor;"
    new_4c = "item[campo] = ['qtdPrevista', 'qtdRecebida', 'qtdSaida'].includes(campo) ? (Number(valor) || 0) : valor;"
    html, done = apply(html, old_4c, new_4c, "FEATURE4c – editarRecebimento: qtdSaida numerico")
    ok += done; fail += not done

    # 4d – editarRecebimento: logica de status com qtdSaida
    old_4d = (
        "if ((campo === 'qtdPrevista' || campo === 'qtdRecebida') && item.status !== 'Rejeitado') {\n"
        "                        if (item.qtdRecebida <= 0) item.status = 'Pendente';\n"
        "                        else if (item.qtdPrevista > 0 && item.qtdRecebida < item.qtdPrevista) item.status = 'Parcial';\n"
        "                        else item.status = 'Recebido';"
    )
    new_4d = (
        "if ((campo === 'qtdPrevista' || campo === 'qtdRecebida' || campo === 'qtdSaida') && item.status !== 'Rejeitado') {\n"
        "                        if (item.qtdRecebida <= 0) item.status = 'Pendente';\n"
        "                        else if (item.qtdPrevista > 0 && item.qtdRecebida < item.qtdPrevista) item.status = 'Parcial';\n"
        "                        else if (Number(item.qtdSaida||0) > 0 && Number(item.qtdRecebida||0) > Number(item.qtdSaida||0)) item.status = 'Parcial';\n"
        "                        else item.status = 'Recebido';"
    )
    html, done = apply(html, old_4d, new_4d, "FEATURE4d – editarRecebimento: status com qtdSaida")
    ok += done; fail += not done

    # 4e – salvarNovoRecebimento: incluir qtdSaida
    old_4e = "qtdPrevista, qtdRecebida,\n                        unidade:"
    new_4e = (
        "qtdPrevista, qtdRecebida,\n"
        "                        qtdSaida: Number(document.getElementById('recQtdSaida')?.value) || 0,\n"
        "                        unidade:"
    )
    html, done = apply(html, old_4e, new_4e, "FEATURE4e – salvarNovoRecebimento: qtdSaida")
    ok += done; fail += not done

    # 4f – Modal: campos Qtd. Saida + Saldo apos Qtd. Recebida
    old_4f = (
        '<input type="number" step="0.01" min="0" id="recQtdRecebida" value="0">\n'
        '                        </div>\n'
        '                        <div class="form-group">\n'
        '                            <label>Status</label>'
    )
    new_4f = (
        '<input type="number" step="0.01" min="0" id="recQtdRecebida" value="0" '
        'oninput="document.getElementById(\'recSaldo\').value=(Number(this.value)||0)-(Number(document.getElementById(\'recQtdSaida\')?.value)||0)">\n'
        '                        </div>\n'
        '                        <div class="form-group">\n'
        '                            <label>Quantidade Sa\u00edda</label>\n'
        '                            <input type="number" step="0.01" min="0" id="recQtdSaida" value="0" '
        'oninput="document.getElementById(\'recSaldo\').value=(Number(document.getElementById(\'recQtdRecebida\')?.value)||0)-(Number(this.value)||0)">\n'
        '                        </div>\n'
        '                        <div class="form-group">\n'
        '                            <label>Saldo (auto)</label>\n'
        '                            <input type="text" id="recSaldo" value="0" readonly style="background:var(--input-bg);cursor:default;">\n'
        '                        </div>\n'
        '                        <div class="form-group">\n'
        '                            <label>Status</label>'
    )
    html, done = apply(html, old_4f, new_4f, "FEATURE4f – Modal: campos Saida + Saldo")
    ok += done; fail += not done

    # 4g – normalizarRecebimentosAntigos: qtdSaida default
    # The function normalizarRecebimentosAntigos sets defaults for missing fields.
    # We add qtdSaida defaults after the existing qtdRecebida normalization.
    # Anchor: the last field before the closing of the forEach
    old_4g = "if (r.ref === undefined) r.ref = r.codigoCor || '';"
    new_4g = (
        "if (r.ref === undefined) r.ref = r.codigoCor || '';\n"
        "                        if (r.qtdSaida === undefined) r.qtdSaida = 0;\n"
        "                        r.qtdSaida = Number(r.qtdSaida) || 0;"
    )
    html, done = apply(html, old_4g, new_4g, "FEATURE4g – normalizar qtdSaida")
    ok += done; fail += not done

    # -----------------------------------------------------------------
    #  SAVE
    # -----------------------------------------------------------------
    write_file(LOCAL_FILE, html)
    new_len = len(html)
    print(f"\n[v6] Arquivo salvo: {new_len:,} caracteres (delta: {new_len - original_len:+,})")
    print(f"[v6] Resultado: {ok} patches aplicados, {fail} falhas")

    if fail == 0:
        print("[v6] \u2705 Todos os patches aplicados com sucesso!")
    else:
        print("[v6] \u26a0\ufe0f Alguns patches falharam – verifique acima.")

    base = os.path.basename(LOCAL_FILE)
    folder = os.path.dirname(LOCAL_FILE)
    print("\n" + "=" * 60)
    print(" COMANDOS GIT PARA COMMIT E PUSH:")
    print("=" * 60)
    print(f'cd "{folder}"')
    print(f'git add "{base}"')
    print(f'git commit -m "v6: colunas Qtd Saida + Saldo no Recebimento; fix escaparHTML/debounceRender/p38db"')
    print("git push")
    print("=" * 60)

if __name__ == "__main__":
    main()
