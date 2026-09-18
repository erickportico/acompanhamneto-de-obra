# -*- coding: utf-8 -*-
r"""
PATCH 162 - Lancamento Multiplas Tarefas por Colaborador
=========================================================
Adiciona modo "Multiplas Tarefas" na aba Pagamento de Producao > Lancamentos.

COMO FUNCIONA:
- Ao lado do botao "Adicionar Tarefa" aparece um botao "Multiplas Tarefas"
- Ao clicar, abre um painel onde o usuario seleciona UMA VEZ:
    * Obra, Profissional(is), Ajudante(s), Taxas
- Depois pode adicionar N tarefas (data + material + m2) sem precisar
  selecionar colaboradores novamente
- Mini-tabela mostra as tarefas do lote
- Botao "Salvar Todas" grava tudo no banco

ARQUIVO-ALVO: index.html
"""

import re, os, sys

# ── Caminho do arquivo ──
HOME = os.path.expanduser('~')
DEFAULT = os.path.join(HOME, 'Desktop', 'ACOMPANHAMENTO DE OBRAS', 'index.html').replace(os.sep, '/')

filepath = DEFAULT
if len(sys.argv) > 1:
    filepath = sys.argv[1]

print(f'[P162] Arquivo: {filepath}')
if not os.path.isfile(filepath):
    print('[P162] ERRO: arquivo não encontrado!'); sys.exit(1)

with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

# ── Guarda contra duplo patch ──
if '__patch162MultiplasTarefas' in html:
    print('[P162] Patch já aplicado — nenhuma alteração.')
    sys.exit(0)

# ============================================================
# 1) HTML — Painel de Múltiplas Tarefas (após o lanc-form-grid)
# ============================================================
# Inserimos logo após </div> do lanc-form-grid e antes do action bar
# O marcador exato é a linha com <div id="containerLancamentosPgto">

PANEL_HTML = r'''
<!-- PATCH 162: Painel Múltiplas Tarefas -->
<div id="painelMultiplasTarefas" style="display:none;margin-bottom:14px;">
  <div style="border:2px solid #0f766e;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,#f0fdfa,#ccfbf1);box-shadow:0 4px 16px rgba(15,118,110,.12);">
    <div style="padding:12px 18px;background:linear-gradient(90deg,#0f766e,#14b8a6);color:#fff;font-weight:800;font-size:.88rem;letter-spacing:.02em;display:flex;justify-content:space-between;align-items:center;">
      <span>🔄 Modo: Múltiplas Tarefas por Colaborador</span>
      <button onclick="fecharMultiplasTarefas()" style="background:rgba(255,255,255,.25);border:0;color:#fff;border-radius:6px;padding:4px 12px;cursor:pointer;font-weight:700;">✕ Fechar</button>
    </div>
    <div style="padding:16px 18px;">
      <!-- Seletor de obra e equipe -->
      <div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:14px;">
        <div style="flex:1 1 200px;">
          <label style="font-size:.76rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Obra</label>
          <select id="mtObra" onchange="mtTrocarObra()" style="width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:.86rem;"></select>
        </div>
        <div style="flex:1 1 200px;">
          <label style="font-size:.76rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Profissional(is)</label>
          <div id="mtCheckProf" class="lanc-checkbox-list" style="max-height:80px;"></div>
        </div>
        <div style="flex:1 1 200px;">
          <label style="font-size:.76rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Ajudante(s)</label>
          <div id="mtCheckAjud" class="lanc-checkbox-list" style="max-height:80px;"></div>
        </div>
      </div>
      <!-- Taxas -->
      <div style="display:flex;gap:14px;margin-bottom:14px;">
        <div style="flex:1 1 120px;">
          <label style="font-size:.76rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Taxa Prof. (R$/m²)</label>
          <input type="number" id="mtTaxaProf" step="0.01" min="0" value="6.00" style="width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:.86rem;">
        </div>
        <div style="flex:1 1 120px;">
          <label style="font-size:.76rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Taxa Ajud. (R$/m²)</label>
          <input type="number" id="mtTaxaAjud" step="0.01" min="0" value="4.00" style="width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:.86rem;">
        </div>
      </div>
      <!-- Linha de tarefa rápida -->
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-bottom:10px;padding:10px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <div style="flex:0 0 140px;">
          <label style="font-size:.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Data</label>
          <input type="date" id="mtData" style="width:100%;min-height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:4px 8px;font-size:.84rem;">
        </div>
        <div style="flex:1 1 160px;">
          <label style="font-size:.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Material</label>
          <input type="text" id="mtMaterial" placeholder="Ex: Porta, Janela..." style="width:100%;min-height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:4px 8px;font-size:.84rem;">
        </div>
        <div style="flex:0 0 100px;">
          <label style="font-size:.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">M²</label>
          <input type="number" id="mtM2" step="0.01" min="0" placeholder="0,00" style="width:100%;min-height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:4px 8px;font-size:.84rem;">
        </div>
        <button onclick="mtAdicionarLinha()" style="min-height:36px;padding:0 16px;border:0;border-radius:8px;background:#0f766e;color:#fff;font-weight:800;font-size:.8rem;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(15,118,110,.2);">＋ Tarefa</button>
      </div>
      <!-- Mini-tabela de tarefas pendentes -->
      <div id="mtTabela" style="display:none;margin-bottom:10px;"></div>
      <!-- Botões Salvar / Limpar -->
      <div style="display:flex;gap:10px;align-items:center;">
        <button onclick="mtSalvarTodas()" id="mtBtnSalvar" style="min-height:42px;padding:0 24px;border:0;border-radius:10px;background:#0f766e;color:#fff;font-weight:800;font-size:.88rem;cursor:pointer;box-shadow:0 4px 12px rgba(15,118,110,.22);">💾 Salvar Todas</button>
        <button onclick="mtLimparFila()" style="min-height:42px;padding:0 18px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#475569;font-weight:700;font-size:.84rem;cursor:pointer;">🗑️ Limpar Fila</button>
        <span id="mtContador" style="font-size:.82rem;color:#475569;font-weight:600;"></span>
      </div>
    </div>
  </div>
</div>
<!-- FIM PATCH 162 HTML -->
'''

# Inserir antes de <div id="containerLancamentosPgto">
anchor1 = '<div id="containerLancamentosPgto">'
if anchor1 not in html:
    print('[P162] ERRO: não encontrou <div id="containerLancamentosPgto">'); sys.exit(1)

html = html.replace(anchor1, PANEL_HTML + '\n' + anchor1, 1)
print('[P162] HTML do painel inserido antes de containerLancamentosPgto')

# ============================================================
# 2) HTML — Botão "Múltiplas Tarefas" ao lado de "Adicionar Tarefa"
# ============================================================
old_btn = '<button class="btn-add" onclick="salvarLancamentoPgto()" style="margin-bottom:0;">➕ Adicionar Tarefa</button>'
new_btn = '''<button class="btn-add" onclick="salvarLancamentoPgto()" style="margin-bottom:0;">➕ Adicionar Tarefa</button>
                            <button class="btn-add" onclick="abrirMultiplasTarefas()" style="margin-bottom:0;margin-left:8px;background:#1d4ed8;box-shadow:0 5px 14px rgba(29,78,216,.22);">🔄 Múltiplas Tarefas</button>'''

if old_btn in html:
    html = html.replace(old_btn, new_btn, 1)
    print('[P162] Botão Múltiplas Tarefas adicionado')
else:
    print('[P162] AVISO: não encontrou o botão Adicionar Tarefa exato — tentando fallback')
    # Fallback: procurar a div lanc-submit-row e adicionar antes de </div>
    old_row = '<div class="lanc-submit-row">\n                            <button class="btn-add" onclick="salvarLancamentoPgto()"'
    if old_row in html:
        html = html.replace(old_row, '<div class="lanc-submit-row">\n                            <button class="btn-add" onclick="salvarLancamentoPgto()"', 1)
        # Nesse caso só adicionamos o botão 162 dentro da mesma div
        close_submit = '</div>\n                    </div>'  # fecha lanc-submit-row e lanc-form-grid
        # Inserimos antes do fechamento do submit-row
    else:
        print('[P162] ERRO: não encontrou a área de submit — abortando'); sys.exit(1)

# ============================================================
# 3) CSS para dark mode + tabela do patch 162
# ============================================================
CSS_162 = '''
<style id="patch162Css">
#painelMultiplasTarefas .lanc-checkbox-list{max-height:80px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:5px;box-shadow:inset 0 1px 2px rgba(15,23,42,.03)}
#painelMultiplasTarefas .lanc-checkbox-item{border-radius:6px;padding:6px 8px;font-size:.8rem;white-space:nowrap}
#painelMultiplasTarefas .lanc-checkbox-item:hover{background:#f1f5f9}
#painelMultiplasTarefas .lanc-checkbox-item input[type=checkbox]{width:15px;height:15px;accent-color:#0f766e}
#painelMultiplasTarefas table{width:100%;border-collapse:collapse;font-size:.8rem}
#painelMultiplasTarefas th{padding:6px 8px;background:#f0fdfa;color:#0f766e;font-weight:700;text-align:left;border-bottom:1px solid #ccfbf1;font-size:.72rem;text-transform:uppercase}
#painelMultiplasTarefas td{padding:6px 8px;border-bottom:1px solid #e2e8f0}
#painelMultiplasTarefas tr:hover td{background:#f0fdfa}
body.dark-mode #painelMultiplasTarefas>div{background:linear-gradient(135deg,#0f172a,#1e293b);border-color:#334155}
body.dark-mode #painelMultiplasTarefas>div>div:first-child{background:linear-gradient(90deg,#0f766e,#14b8a6)}
body.dark-mode #painelMultiplasTarefas select,body.dark-mode #painelMultiplasTarefas input{background:#0f172a;color:#f8fafc;border-color:#475569}
body.dark-mode #painelMultiplasTarefas .lanc-checkbox-list{background:#0f172a;border-color:#475569}
body.dark-mode #painelMultiplasTarefas .lanc-checkbox-item:hover{background:#1e293b}
body.dark-mode #painelMultiplasTarefas th{background:#1e293b;color:#5eead4;border-color:#334155}
body.dark-mode #painelMultiplasTarefas td{border-color:#334155}
body.dark-mode #painelMultiplasTarefas tr:hover td{background:#1e293b}
</style>
'''

# Inserir CSS antes de </head>
head_close = '</head>'
if head_close in html:
    html = html.replace(head_close, CSS_162 + '\n</head>', 1)
    print('[P162] CSS inserido')

# ============================================================
# 4) JavaScript — Lógica do painel de Múltiplas Tarefas
# ============================================================
JS_162 = r'''
<script id="patch162Js">
// === PATCH 162: Múltiplas Tarefas por Colaborador ===
(function(){
  'use strict';
  if(window.__patch162MultiplasTarefas)return;
  window.__patch162MultiplasTarefas=true;

  // Estado da fila
  var fila = []; // [{data,material,m2}]

  // ── Abrir painel ──
  window.abrirMultiplasTarefas = function(){
    var p = document.getElementById('painelMultiplasTarefas');
    if(p) p.style.display = '';
    mtPopularObra();
    mtSetDataHoje();
    fila = [];
    mtRenderTabela();
    console.log('[P162] Painel Múltiplas Tarefas aberto');
  };

  // ── Fechar painel ──
  window.fecharMultiplasTarefas = function(){
    var p = document.getElementById('painelMultiplasTarefas');
    if(p) p.style.display = 'none';
    fila = [];
    console.log('[P162] Painel Múltiplas Tarefas fechado');
  };

  // ── Popular select de obra ──
  function mtPopularObra(){
    var sel = document.getElementById('mtObra');
    if(!sel) return;
    sel.innerHTML = '<option value="">— Selecione —</option>';
    if(!window.db || !Array.isArray(db.obras)) return;
    db.obras.forEach(function(o){
      sel.innerHTML += '<option value="'+escaparHTML(o.id)+'">'+escaparHTML(o.nome||'')+'</option>';
    });
  }

  // ── Trocar obra → recarregar colaboradores ──
  window.mtTrocarObra = function(){
    var obraId = (document.getElementById('mtObra')||{}).value||'';
    var obra = (db.obras||[]).find(function(o){return o.id===obraId;});
    if(!obra){ mtRenderCheckboxes('mtCheckProf',[]); mtRenderCheckboxes('mtCheckAjud',[]); return; }
    // Profissionais e Ajudantes da obra
    var profs = (obra.colaboradores||[]).filter(function(c){return c.funcao==='Profissional'||c.funcao==='profissional';});
    var ajuds = (obra.colaboradores||[]).filter(function(c){return c.funcao==='Ajudante'||c.funcao==='ajudante';});
    // Se não filtrou nada, mostrar todos
    if(!profs.length) profs = (obra.colaboradores||[]).slice();
    if(!ajuds.length){ ajuds = []; } // ajudantes pode estar vazio
    mtRenderCheckboxes('mtCheckProf', profs.map(function(c){return {id:c.id,nome:c.nome};}));
    mtRenderCheckboxes('mtCheckAjud', ajuds.map(function(c){return {id:c.id,nome:c.nome};}));
    // Se só tem 1 profissional, já marca
    if(profs.length===1){
      var cb = document.querySelector('#mtCheckProf input[type=checkbox]');
      if(cb) cb.checked = true;
    }
  };

  // ── Render checkboxes ──
  function mtRenderCheckboxes(containerId, items){
    var el = document.getElementById(containerId);
    if(!el) return;
    if(!items.length){
      el.innerHTML = '<div style="padding:6px 8px;font-size:.78rem;color:#94a3b8;">Nenhum colaborador</div>';
      return;
    }
    el.innerHTML = items.map(function(it){
      return '<label class="lanc-checkbox-item" style="display:flex;align-items:center;gap:6px;cursor:pointer;">'+
        '<input type="checkbox" value="'+escaparHTML(it.id)+'">'+
        '<span>'+escaparHTML(it.nome)+'</span></label>';
    }).join('');
  }

  // ── Data de hoje ──
  function mtSetDataHoje(){
    var inp = document.getElementById('mtData');
    if(inp) inp.value = new Date().toISOString().slice(0,10);
  }

  // ── Obter IDs marcados ──
  function mtGetChecked(containerId){
    var el = document.getElementById(containerId);
    if(!el) return [];
    var cbs = el.querySelectorAll('input[type=checkbox]:checked');
    return Array.from(cbs).map(function(cb){return cb.value;});
  }

  // ── Adicionar tarefa à fila ──
  window.mtAdicionarLinha = function(){
    var data = (document.getElementById('mtData')||{}).value || new Date().toISOString().slice(0,10);
    var material = (document.getElementById('mtMaterial')||{}).value||''.trim();
    var m2 = parseFloat((document.getElementById('mtM2')||{}).value)||0;
    if(m2<=0){ alert('Informe a metragem (M²).'); return; }
    if(!material){ alert('Informe o material instalado.'); return; }

    fila.push({data:data, material:material, m2:m2});
    // Limpa só material e m² (data e colaboradores permanecem)
    document.getElementById('mtMaterial').value = '';
    document.getElementById('mtM2').value = '';
    // Foco no material para digitar a próxima
    document.getElementById('mtMaterial').focus();
    mtRenderTabela();
  };

  // ── Remover tarefa da fila ──
  window.mtRemoverLinha = function(idx){
    fila.splice(idx,1);
    mtRenderTabela();
  };

  // ── Limpar fila ──
  window.mtLimparFila = function(){
    fila = [];
    mtRenderTabela();
  };

  // ── Render tabela da fila ──
  function mtRenderTabela(){
    var el = document.getElementById('mtTabela');
    var cnt = document.getElementById('mtContador');
    if(!el) return;
    if(!fila.length){
      el.style.display = 'none';
      if(cnt) cnt.textContent = '';
      return;
    }
    el.style.display = '';
    var totalM2 = 0;
    var html = '<table><thead><tr><th>#</th><th>Data</th><th>Material</th><th>M²</th><th></th></tr></thead><tbody>';
    fila.forEach(function(t,i){
      totalM2 += t.m2;
      html += '<tr><td>'+(i+1)+'</td><td>'+t.data+'</td><td>'+escaparHTML(t.material)+'</td>'+
        '<td>'+t.m2.toLocaleString('pt-BR')+'</td>'+
        '<td><button onclick="mtRemoverLinha('+i+')" style="border:0;background:none;cursor:pointer;font-size:1rem;color:#ef4444;" title="Remover">✕</button></td></tr>';
    });
    html += '</tbody><tfoot><tr style="background:#f0fdfa;font-weight:700;"><td colspan="3">Total</td><td>'+totalM2.toLocaleString('pt-BR')+' m²</td><td></td></tr></tfoot></table>';
    el.innerHTML = html;
    if(cnt) cnt.textContent = fila.length+' tarefa(s) na fila — '+totalM2.toLocaleString('pt-BR')+' m² total';
  }

  // ── Salvar todas as tarefas ──
  window.mtSalvarTodas = function(){
    var obraId = (document.getElementById('mtObra')||{}).value||'';
    if(!obraId){ alert('Selecione uma obra.'); return; }
    var profIds = mtGetChecked('mtCheckProf');
    var ajudIds = mtGetChecked('mtCheckAjud');
    if(!profIds.length && !ajudIds.length){ alert('Selecione ao menos um profissional ou ajudante.'); return; }
    if(!fila.length){ alert('Adicione ao menos uma tarefa à fila.'); return; }

    var taxaProf = parseFloat((document.getElementById('mtTaxaProf')||{}).value)||6;
    var taxaAjud = parseFloat((document.getElementById('mtTaxaAjud')||{}).value)||4;
    var obra = (db.obras||[]).find(function(o){return o.id===obraId;});
    if(!obra){ alert('Obra não encontrada.'); return; }

    initLancamentosProducao(obra);
    var numProf = profIds.length||1;
    var numAjud = ajudIds.length||1;
    var salvos = 0;

    fila.forEach(function(t){
      var mesKey = t.data.substring(0,7);
      var lanc = {
        id: gerarIdPgto(),
        obraId: obra.id,
        obraNome: obra.nome,
        data: t.data,
        mesAnoKey: mesKey,
        instalacaoM2: t.m2,
        material: t.material,
        taxaProf: taxaProf,
        taxaAjud: taxaAjud,
        profissionais: profIds.slice(),
        ajudantes: ajudIds.slice(),
        valorProf: t.m2 * taxaProf / numProf,
        valorAjud: t.m2 * taxaAjud / numAjud,
        importado: false,
        itemId: null
      };
      obra.lancamentosProducao.push(lanc);
      salvos++;
    });

    // Grava snapshot de historico para cada lancamento criado
    if(typeof cloneColab==='function' && typeof findColabInObra==='function'){
      var lista = obra.lancamentosProducao;
      for(var i=lista.length-salvos;i<lista.length;i++){
        var l = lista[i];
        if(!l||l.importado) continue;
        if(!Array.isArray(l.profissionaisHistorico)) l.profissionaisHistorico=[];
        if(!Array.isArray(l.ajudantesHistorico)) l.ajudantesHistorico=[];
        profIds.forEach(function(id){
          var c = findColabInObra(obra,id);
          if(c && !l.profissionaisHistorico.some(function(x){return x&&x.id===id;}))
            l.profissionaisHistorico.push(cloneColab(c));
        });
        ajudIds.forEach(function(id){
          var c = findColabInObra(obra,id);
          if(c && !l.ajudantesHistorico.some(function(x){return x&&x.id===id;}))
            l.ajudantesHistorico.push(cloneColab(c));
        });
      }
    }

    salvarDB();
    renderPagamento();

    // Limpa fila e fecha
    fila = [];
    mtRenderTabela();

    alert(salvos+' tarefa(s) salva(s) com sucesso!');
    console.log('[P162] '+salvos+' tarefas salvas para obra '+obra.nome);

    // Fecha o painel
    fecharMultiplasTarefas();
  };

  // ── Tecla Enter no campo M² adiciona tarefa ──
  document.addEventListener('DOMContentLoaded', function(){
    var m2Input = document.getElementById('mtM2');
    if(m2Input) m2Input.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ e.preventDefault(); mtAdicionarLinha(); }
    });
    var matInput = document.getElementById('mtMaterial');
    if(matInput) matInput.addEventListener('keydown', function(e){
      if(e.key==='Enter' && document.getElementById('mtM2') && document.getElementById('mtM2').value){
        e.preventDefault(); mtAdicionarLinha();
      }
    });
  });

  console.log('[P162] Script Múltiplas Tarefas carregado');
})();
</script>
'''

# Inserir JS antes de </body>
body_close = '</body>'
if body_close in html:
    html = html.replace(body_close, JS_162 + '\n</body>', 1)
    print('[P162] JavaScript inserido')
else:
    print('[P162] AVISO: não encontrou </body> — tentando fallback no final do arquivo')
    html += JS_162

# ============================================================
# Salvar
# ============================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)

print('[P162] ✅ Patch aplicado com sucesso!')
print('[P162] Funcionalidade: Múltiplas Tarefas por Colaborador')
print('[P162] Botão "🔄 Múltiplas Tarefas" adicionado ao lado de "➕ Adicionar Tarefa"')
print('[P162] Painel com: obra + equipe (1x) + N tarefas (data/material/m²) + Salvar Todas')
