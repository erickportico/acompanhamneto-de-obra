#!/usr/bin/env python3
"""
patch_custo_exclusao.py
=======================
Corrige o botao de excluir (🗑️) que nao aparece na tabela de Despesas
do Centro de Custos.

Problemas identificados:
  1) A coluna AÇÕES tem width:80px – insuficiente para 3 botoes.
  2) Nao existe regra CSS #tab-custo .lanc-actions com display:flex,
     entao a <td class="lanc-actions"> nao organiza os botoes em linha.
  3) .lanc-obra-group tem overflow:hidden, cortando conteudo que
     ultrapassa a largura da coluna.

Correções:
  A) Adiciona regra #tab-custo .lanc-actions com display:flex,
     gap:6px, flex-wrap:nowrap, overflow:visible.
  B) Amplia a coluna AÇÕES de 80px para 120px.
  C) Troca overflow:hidden por overflow:visible no
     #tab-custo .lanc-obra-group.
  D) Troca overflow:hidden por overflow:visible no
     .lanc-obra-group global.
  E) Garante td.lanc-actions com overflow:visible !important.
  F) Preserva a guarda do Patch 54 que impede exclusao de linhas
     virtuais importadas do Pagamento de Producao.

Uso:
  python patch_custo_exclusao.py
  (aplica sobre index.html no mesmo diretorio, ou passe o caminho)
"""

import re, sys, os

def patch(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        txt = f.read()

    original = txt
    changes = 0

    # ------------------------------------------------------------------
    # 1) Adicionar regra CSS #tab-custo .lanc-actions
    #    Inserir logo apos a linha '#tab-custo .btn-icon-sm{...}'
    # ------------------------------------------------------------------
    marker_css = "'#tab-custo .btn-icon-sm{border-radius:8px;transition:transform .12s;}',"
    if marker_css in txt:
        new_rules = (
            "'#tab-custo .lanc-actions{display:flex;gap:6px;flex-wrap:nowrap;overflow:visible;}',"
            "\n      '#tab-custo .lanc-actions .btn-icon-sm{flex-shrink:0;}',"
        )
        if "'#tab-custo .lanc-actions" not in txt:
            txt = txt.replace(marker_css, marker_css + "\n      " + new_rules, 1)
            changes += 1
            print("[OK] Adicionada regra #tab-custo .lanc-actions CSS")
        else:
            print("[SKIP] #tab-custo .lanc-actions ja existe")

    # ------------------------------------------------------------------
    # 2) Ampliar coluna AÇÕES de 80px para 120px (header da tabela custo)
    # ------------------------------------------------------------------
    old_th = 'style="width:80px;"'
    new_th = 'style="width:120px;"'
    if old_th in txt:
        count = txt.count(old_th)
        txt = txt.replace(old_th, new_th)
        changes += 1
        print(f"[OK] Coluna Acoes ampliada de 80px para 120px ({count} substituicoes)")
    else:
        print("[SKIP] th width:80px nao encontrada (talvez ja alterada)")

    # ------------------------------------------------------------------
    # 3) Corrigir overflow:hidden no #tab-custo .lanc-obra-group
    #    O seletor esta numa linha e o overflow na proxima (dentro de
    #    array JS de strings). Ex.:
    #      '#tab-custo .lanc-obra-group{border:...;border-radius:14px;',
    #      'overflow:hidden;margin-bottom:12px;background:...}',
    # ------------------------------------------------------------------
    # Padrao multi-linha: seletor numa string JS e overflow na string seguinte
    pat_multi = re.compile(
        r"('#tab-custo\s*\.lanc-obra-group\{[^']*?',\s*\n\s*)'overflow:\s*hidden",
        re.MULTILINE
    )
    m = pat_multi.search(txt)
    if m:
        txt = txt[:m.start()] + m.group(1) + "'overflow:visible" + txt[m.end():]
        changes += 1
        print("[OK] #tab-custo .lanc-obra-group overflow:hidden -> overflow:visible (multi-linha)")
    else:
        # Padrao single-line
        pat_single = re.compile(
            r"('#tab-custo\s*\.lanc-obra-group\{[^']*?)overflow:\s*hidden"
        )
        m2 = pat_single.search(txt)
        if m2:
            txt = txt[:m2.start()] + m2.group(1).rstrip() + "overflow:visible" + txt[m2.end():]
            changes += 1
            print("[OK] #tab-custo .lanc-obra-group overflow:hidden -> overflow:visible (single-linha)")
        else:
            print("[INFO] #tab-custo .lanc-obra-group sem overflow:hidden (talvez ja corrigido)")

    # ------------------------------------------------------------------
    # 4) Corrigir .lanc-obra-group global (linha ~1954)
    # ------------------------------------------------------------------
    pat_global = re.compile(
        r"(\.lanc-obra-group\s*\{[^}]*?)overflow:\s*hidden"
    )
    m_g = pat_global.search(txt)
    if m_g:
        txt = txt[:m_g.start()] + m_g.group(1).rstrip() + "overflow:visible" + txt[m_g.end():]
        changes += 1
        print("[OK] .lanc-obra-group global overflow:hidden -> overflow:visible")
    else:
        print("[SKIP] .lanc-obra-group global ja sem overflow:hidden")

    # ------------------------------------------------------------------
    # 5) Garantir que td.lanc-actions NAO tenha overflow:hidden
    # ------------------------------------------------------------------
    if "td.lanc-actions" not in txt:
        # Inserir apos a definicao de .lanc-table td
        global_td_rule = ".lanc-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }"
        if global_td_rule in txt:
            extra = "\ntd.lanc-actions { overflow: visible !important; white-space: nowrap; }"
            txt = txt.replace(global_td_rule, global_td_rule + extra, 1)
            changes += 1
            print("[OK] Adicionada regra td.lanc-actions overflow:visible")
        else:
            # Fallback: procurar .lanc-table td com whitespace variavel
            pat_ltd = re.compile(r"(\.lanc-table\s+td\s*\{[^}]*?vertical-align:\s*middle;?\s*\})")
            m3 = pat_ltd.search(txt)
            if m3:
                extra = "\ntd.lanc-actions { overflow: visible !important; white-space: nowrap; }"
                txt = txt[:m3.end()] + extra + txt[m3.end():]
                changes += 1
                print("[OK] Adicionada regra td.lanc-actions overflow:visible (pos .lanc-table td)")
            else:
                print("[WARN] Nao encontrou local para inserir td.lanc-actions")
    else:
        print("[SKIP] td.lanc-actions ja existe")

    # ------------------------------------------------------------------
    # 6) Verificar que os 3 botoes estao no renderCustoTable
    #    (confirmacao – nao altera, apenas verifica)
    # ------------------------------------------------------------------
    if "excluirCusto('" in txt or "excluirCusto(\"" in txt or 'excluirCusto(\'' in txt:
        print("[VERIFY] Botao excluirCusto encontrado no renderCustoTable ✓")
    else:
        print("[WARN] Botao excluirCusto NAO encontrado no renderCustoTable!")

    # ------------------------------------------------------------------
    # 7) Verificar guarda do Patch 54
    # ------------------------------------------------------------------
    if "ehVirtual" in txt and "excluirCusto" in txt and "__p54" in txt:
        print("[VERIFY] Guarda Patch 54 (ehVirtual + excluirCusto) preservada ✓")
    else:
        print("[WARN] Guarda Patch 54 pode estar ausente!")

    # ------------------------------------------------------------------
    # Salvar
    # ------------------------------------------------------------------
    if changes > 0 and txt != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(txt)
        print(f"\n[RESULTADO] {changes} alteracoes aplicadas em {filepath}")
    else:
        print("\n[RESULTADO] Nenhuma alteracao necessaria")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    if not os.path.isfile(target):
        print(f"Arquivo nao encontrado: {target}")
        sys.exit(1)
    patch(target)
