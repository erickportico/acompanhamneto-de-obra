#!/usr/bin/env python3
"""
Patch: Melhora o layout da aba LANÇAMENTOS (Pagamento de Produção)

Problemas resolvidos:
  - Campos demais na mesma linha, visual denso e confuso
  - Selects de Profissional/Ajudante pouco usáveis (<select multiple>)
  - Dropdown 'Obra' desproporcionalmente largo
  - Campo 'Material Instalado' pequeno demais
  - Botão 'Adicionar Tarefa' parece desconectado do formulário
  - Falta de agrupamento visual lógico

Mudanças:
  1. Reorganiza o CSS de .lanc-form-grid para layout em seções
  2. Substitui o HTML do formulário por seções agrupadas
  3. Transforma selects multiple em checkbox lists com scroll
  4. Move o botão 'Adicionar Tarefa' dentro do card
  5. Action bar + navegação de mês compactadas numa linha
  6. JS para popular/ler checkbox lists

Uso:  python patch_layout_lancamentos.py  caminho/para/index.html
"""

import re, sys, os

def patch(caminho):
    with open(caminho, 'r', encoding='utf-8') as f:
        txt = f.read()

    mudancas = []

    # ═══════════════════════════════════════════════════════
    # 1) SUBSTITUIR CSS do .lanc-form-grid
    # ═══════════════════════════════════════════════════════
    # Match: desde "/* --- Lançamentos form --- */" até "/* --- Action bar --- */"
    css_antigo = re.compile(
        r'/\*\s*---\s*Lançamentos form\s*---\s*\*/'
        r'[\s\S]*?'
        r'/\*\s*---\s*Action bar\s*---\s*\*/'
    )

    css_novo = """/* --- Lançamentos form --- */
#tab-pagamento .lanc-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    padding: 0;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    margin-bottom: 12px;
    overflow: hidden;
}
#tab-pagamento .lanc-form-grid .lanc-section {
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
}
#tab-pagamento .lanc-form-grid .lanc-section:last-child {
    border-bottom: none;
}
#tab-pagamento .lanc-form-grid .lanc-section-title {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
}
#tab-pagamento .lanc-form-grid .lanc-fields-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}
#tab-pagamento .lanc-form-grid .lanc-field {
    flex: 1 1 140px;
    min-width: 0;
}
#tab-pagamento .lanc-form-grid .lanc-field.lanc-field-wide {
    flex: 2 1 200px;
}
#tab-pagamento .lanc-form-grid .lanc-field label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #475569;
    display: block;
    margin-bottom: 4px;
}
#tab-pagamento .lanc-form-grid .lanc-field input,
#tab-pagamento .lanc-form-grid .lanc-field select {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.85rem;
    box-sizing: border-box;
}
/* Checkbox list (replaces <select multiple>) */
#tab-pagamento .lanc-checkbox-list {
    max-height: 96px;
    overflow-y: auto;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #fff;
    padding: 4px 0;
}
#tab-pagamento .lanc-checkbox-list::-webkit-scrollbar { width: 6px; }
#tab-pagamento .lanc-checkbox-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
#tab-pagamento .lanc-checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    font-size: 0.82rem;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}
#tab-pagamento .lanc-checkbox-item:hover { background: #f1f5f9; }
#tab-pagamento .lanc-checkbox-item input[type="checkbox"] {
    width: 15px; height: 15px; accent-color: #1e3a5f; cursor: pointer;
}
#tab-pagamento .lanc-checkbox-empty {
    padding: 12px 10px;
    font-size: 0.78rem;
    color: #94a3b8;
    text-align: center;
}
/* Botão dentro do card */
#tab-pagamento .lanc-form-grid .lanc-submit-row {
    padding: 12px 16px;
    background: #f1f5f9;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

/* --- Action bar --- */"""

    if css_antigo.search(txt):
        txt = css_antigo.sub(css_novo, txt)
        mudancas.append('CSS do formulário substituído (layout em seções)')
    else:
        mudancas.append('AVISO: bloco CSS .lanc-form-grid NÃO encontrado')

    # ═══════════════════════════════════════════════════════
    # 2) ADICIONAR estilos dark-mode para os novos elementos
    # ═══════════════════════════════════════════════════════
    dark_marker = 'body.dark-mode .lanc-obra-group'
    dark_novo = """/* Dark mode: lanc-form-grid sections */
body.dark-mode .lanc-form-grid { background: var(--card-bg,#1e293b); border-color: var(--border,#334155); }
body.dark-mode .lanc-form-grid .lanc-section { border-color: var(--border,#334155); }
body.dark-mode .lanc-form-grid .lanc-section-title { color: var(--text-light,#94a3b8); }
body.dark-mode .lanc-form-grid .lanc-field label { color: var(--text-light,#94a3b8); }
body.dark-mode .lanc-form-grid .lanc-field input,
body.dark-mode .lanc-form-grid .lanc-field select { background: var(--card-bg,#1e293b); border-color: var(--border,#334155); color: var(--text,#f8fafc); }
body.dark-mode .lanc-checkbox-list { background: var(--card-bg,#1e293b); border-color: var(--border,#334155); }
body.dark-mode .lanc-checkbox-item:hover { background: rgba(255,255,255,0.06); }
body.dark-mode .lanc-checkbox-item { color: var(--text,#f8fafc); }
body.dark-mode .lanc-checkbox-empty { color: var(--text-light,#64748b); }
body.dark-mode .lanc-submit-row { background: var(--card-bg,#162032); border-top-color: var(--border,#334155); }

"""

    if dark_marker in txt:
        txt = txt.replace(dark_marker, dark_novo + dark_marker, 1)
        mudancas.append('Estilos dark-mode adicionados')
    else:
        mudancas.append('AVISO: marker dark-mode .lanc-obra-group NÃO encontrado')

    # ═══════════════════════════════════════════════════════
    # 3) SUBSTITUIR o HTML do formulário + botão
    # ═══════════════════════════════════════════════════════
    # Match: desde "<!-- Formulário de registro -->" até o botão "Adicionar Tarefa"
    html_antigo = re.compile(
        r'<!--\s*Formulário de registro\s*-->\s*'
        r'<div class="lanc-form-grid">[\s\S]*?'
        r'</div>\s*'
        r'<button class="btn-add" onclick="salvarLancamentoPgto\(\)"[^>]*>[\s\S]*?</button>'
    )

    html_novo = """<!-- Formulário de registro (layout em seções) -->
                    <div class="lanc-form-grid">
                        <!-- Seção 1: Dados da Tarefa -->
                        <div class="lanc-section">
                            <div class="lanc-section-title">📝 Dados da Tarefa</div>
                            <div class="lanc-fields-row">
                                <div class="lanc-field lanc-field-wide">
                                    <label>Obra</label>
                                    <select id="inputLancObra"></select>
                                </div>
                                <div class="lanc-field lanc-field-wide">
                                    <label>Material Instalado</label>
                                    <input type="text" id="inputLancMaterial" placeholder="Ex: Porta, Janela...">
                                </div>
                                <div class="lanc-field">
                                    <label>Instalação M²</label>
                                    <input type="number" id="inputLancInstalacaoM2" step="0.01" min="0" placeholder="0,00">
                                </div>
                            </div>
                        </div>

                        <!-- Seção 2: Taxas -->
                        <div class="lanc-section">
                            <div class="lanc-section-title">💲 Taxas (R$/m²)</div>
                            <div class="lanc-fields-row">
                                <div class="lanc-field">
                                    <label>Profissional</label>
                                    <input type="number" id="inputLancTaxaProf" step="0.01" min="0" value="6.00">
                                </div>
                                <div class="lanc-field">
                                    <label>Ajudante</label>
                                    <input type="number" id="inputLancTaxaAjud" step="0.01" min="0" value="4.00">
                                </div>
                            </div>
                        </div>

                        <!-- Seção 3: Equipe -->
                        <div class="lanc-section">
                            <div class="lanc-section-title">👥 Equipe</div>
                            <div class="lanc-fields-row">
                                <div class="lanc-field lanc-field-wide">
                                    <label>Profissional(is)</label>
                                    <div class="lanc-checkbox-list" id="checklistLancProfissionais">
                                        <div class="lanc-checkbox-empty">Selecione uma obra primeiro</div>
                                    </div>
                                </div>
                                <div class="lanc-field lanc-field-wide">
                                    <label>Ajudante(s)</label>
                                    <div class="lanc-checkbox-list" id="checklistLancAjudantes">
                                        <div class="lanc-checkbox-empty">Selecione uma obra primeiro</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Botão de adicionar -->
                        <div class="lanc-submit-row">
                            <button class="btn-add" onclick="salvarLancamentoPgto()" style="margin-bottom:0;">➕ Adicionar Tarefa</button>
                        </div>
                    </div>"""

    if html_antigo.search(txt):
        txt = html_antigo.sub(html_novo, txt)
        mudancas.append('HTML do formulário substituído (seções + checkboxes)')
    else:
        mudancas.append('AVISO: bloco HTML do formulário NÃO encontrado')

    # ═══════════════════════════════════════════════════════
    # 4) COMPACTAR action bar + navegação de mês
    # ═══════════════════════════════════════════════════════
    actionbar_antiga = re.compile(
        r'<!--\s*Action bar\s*-->\s*'
        r'<div class="pgto-action-bar">[\s\S]*?'
        r'</div>\s*'
        r'<!--\s*Month navigation\s*-->\s*'
        r'<div class="pgto-month-nav">[\s\S]*?'
        r'</div>'
    )

    actionbar_nova = """<!-- Action bar + Month nav (compacto) -->
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <div class="pgto-month-nav" style="margin-bottom:0;">
                            <button onclick="mudarMesPgto(-1)">◀</button>
                            <span id="pgtoMesAnoLabel">Jan/2026</span>
                            <button onclick="mudarMesPgto(1)">▶</button>
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn-action btn-export" onclick="exportarBackupPgto()" style="padding:5px 12px;font-size:0.78rem;">📤 Backup</button>
                            <button class="btn-action btn-import-backup" onclick="document.getElementById('inputBackupPgto').click()" style="padding:5px 12px;font-size:0.78rem;">📥 Restaurar</button>
                            <button class="btn-action btn-limpar-mes" onclick="limparMesPgto()" style="padding:5px 12px;font-size:0.78rem;">🗑️ Limpar</button>
                            <button onclick="imprimirPaginaPgtoResumo()" style="padding:5px 12px;font-size:0.78rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;">🖨️ Imprimir</button>
                        </div>
                        <input type="file" id="inputBackupPgto" accept=".json" onchange="importarBackupPgto(event)" style="display:none;">
                    </div>"""

    if actionbar_antiga.search(txt):
        txt = actionbar_antiga.sub(actionbar_nova, txt)
        mudancas.append('Action bar + navegação de mês compactadas')
    else:
        mudancas.append('AVISO: bloco action bar + month nav NÃO encontrado')

    # ═══════════════════════════════════════════════════════
    # 5) INJETAR JS — funções de checkbox list + monkey-patch
    # ═══════════════════════════════════════════════════════
    # Procura a função que popula os selects de profissionais ao trocar obra
    # Encontra a função de população e insere as funções helper antes

    # Primeiro, localiza onde inputLancProfissionais é populado
    # Vamos procurar pelo padrão de popular o select
    pop_select_pattern = re.compile(
        r'(var|let|const)?\s*(selProf|profSel|inputLancProfissionais)\.innerHTML\s*='
    )

    js_helper = """
/* === Funções auxiliares para checkbox lists (substitui <select multiple>) === */
function renderChecklist(containerId, items, selectedIds) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!items || items.length === 0) {
        el.innerHTML = '<div class="lanc-checkbox-empty">Nenhum colaborador nesta obra</div>';
        return;
    }
    var html = '';
    items.forEach(function(item) {
        var checked = (selectedIds && selectedIds.indexOf(item.id) !== -1) ? 'checked' : '';
        html += '<label class="lanc-checkbox-item">'
            + '<input type="checkbox" value="' + item.id + '" ' + checked + '> '
            + item.nome
            + '</label>';
    });
    el.innerHTML = html;
}

function getCheckedIds(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return [];
    var checks = el.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checks).map(function(c) { return c.value; });
}

"""

    # Insere as funções helper antes de 'function trocarSubTabPgtoNovo'
    js_inject_marker = 'function trocarSubTabPgtoNovo'
    if js_inject_marker in txt:
        txt = txt.replace(js_inject_marker, js_helper + js_inject_marker, 1)
        mudancas.append('Funções JS de checkbox list injetadas')
    else:
        mudancas.append('AVISO: marker JS trocarSubTabPgtoNovo NÃO encontrado')

    # ═══════════════════════════════════════════════════════
    # 6) PATCH a função que popula selects → renderizar checkboxes também
    # ═══════════════════════════════════════════════════════
    # Encontra onde os selects são populados e adiciona renderização
    # dos checkbox lists logo após

    # Padrão: inputLancProfissionais.innerHTML = '<option ...'
    # Vamos achar o bloco que popula os selects
    # Primeiro, ver quantas vezes inputLancProfissionais.innerHTML aparece
    prof_inner_count = txt.count('inputLancProfissionais.innerHTML')
    ajud_inner_count = txt.count('inputLancAjudantes.innerHTML')

    # Encontra o bloco de população do select de profissionais
    # Padrão típico: var el = document.getElementById('inputLancProfissionais');
    #                el.innerHTML = '<option value="">...</option>' + ...
    #                items.forEach(function(item) { el.innerHTML += ... })

    # Abordagem: injetar chamadas renderChecklist após cada innerHTML de select
    # Procura por 'inputLancProfissionais.innerHTML = ...' e insere renderChecklist depois

    # Padrão: quando popula o select de profissionais, popula o checklist também
    # Vamos buscar por 'inputLancProfissionais.innerHTML +=' e inserir após

    # Estratégia mais robusta: a cada vez que innerHTML é setado no select,
    # inserir uma chamada a renderChecklist logo após o fechamento do bloco

    # Busca o padrão onde o select é populado com opções
    # Pattern: inputLancProfissionais.innerHTML = '...options...';

    # Vou usar uma abordagem mais simples:
    # Encontrar a função onde inputLancObra onchange popula os selects
    # e adicionar as chamadas renderChecklist no final

    # Abordagem PRÁTICA: adiciono um MutationObserver ou um hook
    # que sincroniza os checkbox lists quando os selects mudam

    # Melhor ainda: interceptar a função que popula o select de obra
    # e após popular os selects, popular os checkbox lists

    # Vou procurar o ponto exato onde inputLancProfissionais recebe as opções
    # e adicionar renderChecklist logo após

    # Encontrar a população dos selects por innerHTML
    # Padrão comum: inputLancProfissionais.innerHTML = html;
    # Vou substituir por: inputLancProfissionais.innerHTML = html; renderChecklist('checklistLancProfissionais', profItems, []);

    # Preciso saber qual variável tem os items... vou analisar o código
    pass  # será tratado no passo 7

    # ═══════════════════════════════════════════════════════
    # 7) PATCH a função salvarLancamentoPgto para ler checkboxes
    # ═══════════════════════════════════════════════════════

    # Padrão 1: Array.from(select.selectedOptions).map(o => o.value)
    sel_prof_1 = re.compile(
        r"Array\.from\(\s*document\.getElementById\(\s*['\"]inputLancProfissionais['\"]\s*\)\s*\.selectedOptions\s*\)\.map\(\s*(?:function\s*\(\s*o\s*\)\s*\{\s*return\s+o\.value;?\s*\}|\s*o\s*=>\s*o\.value\s*)\)",
    )
    sel_ajud_1 = re.compile(
        r"Array\.from\(\s*document\.getElementById\(\s*['\"]inputLancAjudantes['\"]\s*\)\s*\.selectedOptions\s*\)\.map\(\s*(?:function\s*\(\s*o\s*\)\s*\{\s*return\s+o\.value;?\s*\}|\s*o\s*=>\s*o\.value\s*)\)",
    )

    n_prof = sel_prof_1.subn(r"getCheckedIds('checklistLancProfissionais')", txt)[1] if sel_prof_1.search(txt) else 0
    txt_result = sel_prof_1.sub(r"getCheckedIds('checklistLancProfissionais')", txt)
    if n_prof > 0:
        txt = txt_result
        mudancas.append(f'Leitura de profissionais substituída por getCheckedIds() ({n_prof}x)')

    n_ajud = sel_ajud_1.subn(r"getCheckedIds('checklistLancAjudantes')", txt_result)[1] if sel_ajud_1.search(txt_result) else 0
    txt_result2 = sel_ajud_1.sub(r"getCheckedIds('checklistLancAjudantes')", txt_result)
    if n_ajud > 0:
        txt = txt_result2
        mudancas.append(f'Leitura de ajudantes substituída por getCheckedIds() ({n_ajud}x)')

    # Padrão 2: busca alternativa — .selectedOptions sem Array.from
    sel_prof_2 = re.compile(
        r"document\.getElementById\(\s*['\"]inputLancProfissionais['\"]\s*\)\.selectedOptions",
    )
    sel_ajud_2 = re.compile(
        r"document\.getElementById\(\s*['\"]inputLancAjudantes['\"]\s*\)\.selectedOptions",
    )
    if n_prof == 0 and sel_prof_2.search(txt):
        # Mais amplo — substituir a referência ao select
        pass  # Por ora, manter os selects hidden como backup

    # ═══════════════════════════════════════════════════════
    # 8) ADICIONAR sincronização automática checkbox ↔ select
    # ═══════════════════════════════════════════════════════
    # Abordagem definitiva: MutationObserver nos selects antigos
    # (que ainda existem no DOM embora escondidos) ou hook na função que os popula

    sync_js = """
/* Sincroniza checkbox lists quando os selects são populados */
(function() {
    var origOnchange = document.getElementById('inputLancObra');
    if (origOnchange) {
        var oldHandler = origOnchange.onchange;
        origOnchange.onchange = function(e) {
            if (oldHandler) oldHandler.call(this, e);
            setTimeout(function() {
                syncChecklistsFromSelects();
            }, 50);
        };
    }
})();

function syncChecklistsFromSelects() {
    var selProf = document.getElementById('inputLancProfissionais');
    var selAjud = document.getElementById('inputLancAjudantes');
    var clProf = document.getElementById('checklistLancProfissionais');
    var clAjud = document.getElementById('checklistLancAjudantes');

    if (selProf && clProf) {
        var items = [];
        Array.from(selProf.options).forEach(function(opt) {
            if (opt.value) items.push({ id: opt.value, nome: opt.textContent });
        });
        var selected = Array.from(selProf.selectedOptions).map(function(o) { return o.value; });
        renderChecklist('checklistLancProfissionais', items, selected);
    }

    if (selAjud && clAjud) {
        var items2 = [];
        Array.from(selAjud.options).forEach(function(opt) {
            if (opt.value) items2.push({ id: opt.value, nome: opt.textContent });
        });
        var selected2 = Array.from(selAjud.selectedOptions).map(function(o) { return o.value; });
        renderChecklist('checklistLancAjudantes', items2, selected2);
    }
}

/* Sincroniza checkboxes → selects antes de salvar */
(function() {
    var origSalvar = window.salvarLancamentoPgto;
    if (origSalvar) {
        window.salvarLancamentoPgto = function() {
            syncSelectsFromChecklists();
            origSalvar.call(this);
        };
    }
})();

function syncSelectsFromChecklists() {
    var selProf = document.getElementById('inputLancProfissionais');
    var clProf = document.getElementById('checklistLancProfissionais');
    if (selProf && clProf) {
        var checkedIds = getCheckedIds('checklistLancProfissionais');
        Array.from(selProf.options).forEach(function(opt) {
            opt.selected = (checkedIds.indexOf(opt.value) !== -1);
        });
    }
    var selAjud = document.getElementById('inputLancAjudantes');
    var clAjud = document.getElementById('checklistLancAjudantes');
    if (selAjud && clAjud) {
        var checkedIds2 = getCheckedIds('checklistLancAjudantes');
        Array.from(selAjud.options).forEach(function(opt) {
            opt.selected = (checkedIds2.indexOf(opt.value) !== -1);
        });
    }
}

"""

    # Insere após as funções helper, antes de trocarSubTabPgtoNovo
    # (js_helper já foi inserido antes de trocarSubTabPgtoNovo)
    # Agora inserimos sync JS após as funções helper
    # Procura pelo fim do bloco helper (a linha vazia antes de trocarSubTabPgtoNovo)

    # Insere após 'function getCheckedIds...' que já está no texto
    sync_marker = 'function trocarSubTabPgtoNovo'
    if sync_marker in txt:
        txt = txt.replace(sync_marker, sync_js + sync_marker, 1)
        mudancas.append('JS de sincronização checkbox ↔ select injetado')
    else:
        mudancas.append('AVISO: marker para sync JS NÃO encontrado')

    # ═══════════════════════════════════════════════════════
    # 9) ESCONDER os selects antigos (mantidos para compatibilidade)
    # ═══════════════════════════════════════════════════════
    # Os selects <select multiple> antigos ainda estão no HTML mas foram
    # substituídos no passo 3. Porém, o código JS pode populá-los.
    # Vamos verificar se ainda existem selects antigos no HTML

    # Na verdade, no passo 3 substituímos o HTML inteiro do formulário,
    # removendo os selects antigos. O JS ainda tenta populá-los via getElementById,
    # então precisamos adicionar selects hidden para manter compatibilidade.

    # Vamos adicionar selects hidden dentro do formulário
    hidden_selects = """<!-- Selects ocultos para compatibilidade JS -->
                        <select id="inputLancProfissionais" multiple style="display:none;"></select>
                        <select id="inputLancAjudantes" multiple style="display:none;"></select>"""

    # Inserir antes do </div> que fecha lanc-form-grid
    lanc_form_close = '<div class="lanc-submit-row">'
    if lanc_form_close in txt:
        txt = txt.replace(lanc_form_close, hidden_selects + '\n                        ' + lanc_form_close, 1)
        mudancas.append('Selects ocultos adicionados para compatibilidade JS')

    # ═══════════════════════════════════════════════════════
    # 10) VERIFICAÇÃO FINAL
    # ═══════════════════════════════════════════════════════
    has_checklist = 'checklistLancProfissionais' in txt
    has_checklist_ajud = 'checklistLancAjudantes' in txt
    has_lanc_section = 'lanc-section' in txt
    has_sync = 'syncChecklistsFromSelects' in txt

    checks = []
    if has_checklist: checks.append('✓ checklistLancProfissionais presente')
    else: checks.append('✗ checklistLancProfissionais AUSENTE')
    if has_checklist_ajud: checks.append('✓ checklistLancAjudantes presente')
    else: checks.append('✗ checklistLancAjudantes AUSENTE')
    if has_lanc_section: checks.append('✓ lanc-section (layout em seções) presente')
    else: checks.append('✗ lanc-section AUSENTE')
    if has_sync: checks.append('✓ sincronização checkbox↔select presente')
    else: checks.append('✗ sincronização AUSENTE')

    # ═══════════════════════════════════════════════════════
    # 11) SALVA
    # ═══════════════════════════════════════════════════════
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(txt)

    print('=' * 55)
    print('Patch Layout Lançamentos — concluído')
    print('=' * 55)
    for m in mudancas:
        print(f'  * {m}')
    print()
    print('Verificação:')
    for c in checks:
        print(f'  {c}')
    print()
    print(f'Arquivo salvo: {caminho}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python patch_layout_lancamentos.py  caminho/para/index.html')
        sys.exit(1)
    alvo = sys.argv[1]
    if not os.path.isfile(alvo):
        print(f'Arquivo não encontrado: {alvo}')
        sys.exit(1)
    patch(alvo)
