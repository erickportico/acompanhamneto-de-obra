# -*- coding: utf-8 -*-
r"""
PATCH 162b - Correção: Múltiplas Tarefas por Colaborador
=========================================================
Corrige dois bugs causados pela inserção incorreta do script JS
do patch 162 dentro de uma string literal do document.write():

Bug 1: ReferenceError: abrirMultiplasTarefas is not defined
  - O bloco <script id="patch162Js"> foi inserido dentro da string
    do janelaImpressao.document.write(), ou seja, o código nunca
    foi executado na página principal — foi escrito como HTML
    na janela de impressão.

Bug 2: Botão "Diário de Obra" desapareceu
  - A tag </script> do patch162 fechou prematuramente o bloco
    <script id="v26Js">, quebrando todo o JS posterior (incluindo
    o código que cria o botão p84Botao).

CORREÇÃO:
1. Remove o bloco <script id="patch162Js">...</script> que foi
   inserido no lugar errado (dentro do document.write).
2. Restaura a string original '</body></html>' do document.write.
3. Re-insere o script do patch 162 ANTES do </body> REAL (o último).

ARQUIVO-ALVO: index.html
EXECUÇÃO: python patch162b_fix_multiplas_tarefas.py [caminho_do_arquivo]
"""

import re, os, sys

HOME = os.path.expanduser('~')
DEFAULT = os.path.join(HOME, 'Desktop', 'ACOMPANHAMENTO DE OBRAS', 'index.html').replace(os.sep, '/')

filepath = DEFAULT
if len(sys.argv) > 1:
    filepath = sys.argv[1]

print(f'[P162b] Arquivo: {filepath}')
if not os.path.isfile(filepath):
    print('[P162b] ERRO: arquivo não encontrado!'); sys.exit(1)

with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

# ── Guarda contra duplo patch ──
if '__patch162bCorrecao' in html:
    print('[P162b] Patch já aplicado — nenhuma alteração.')
    sys.exit(0)

# ════════════════════════════════════════════════════════════
# PASSO 1: Remover o bloco <script id="patch162Js">...</script>
#          que foi inserido DENTRO da string do document.write
# ════════════════════════════════════════════════════════════

# O padrão no arquivo com bug é:
#   h +
#   '\n\n\n<script id="patch162Js">\n...código...\n</script>\n\n</body></html>'
#
# Precisamos remover desde '<script id="patch162Js">' até (mas não incluindo)
# o '</body></html>' que pertence à string do document.write.

padrao_bug = re.compile(
    r"(<script\s+id=\"patch162Js\"[^>]*>"      # abertura do script
    r".*?"                                       # conteúdo do script (não-guloso)
    r"</script>)\s*"                             # fechamento do script
    r"(</body></html>')",                        # a string que deve permanecer
    re.DOTALL
)

match = padrao_bug.search(html)
if match:
    bloco_errado = match.group(1)
    trecho_manter = match.group(2)
    # Substituir: remove o script, mantém só a string '</body></html>'
    html = html[:match.start()] + trecho_manter + html[match.end():]
    print(f'[P162b] ✅ Bloco JS removido da string document.write ({len(bloco_errado)} chars)')
    print(f'[P162b]   Trecho restaurado: </body></html>\'')
else:
    print('[P162b] AVISO: não encontrou o bloco <script id="patch162Js"> dentro do document.write')
    print('[P162b]   Tentando fallback: remoção por posição relativa...')
    
    # Fallback: procurar o script block e remover se estiver antes de um '</body></html>'
    # que esteja dentro de uma aspa simples (indicando string JS)
    fallback = re.compile(
        r"<script\s+id=\"patch162Js\"[^>]*>.*?</script>\s*",
        re.DOTALL
    )
    fb_match = fallback.search(html)
    if fb_match:
        # Verificar se logo depois tem '</body></html>'
        pos_depois = fb_match.end()
        trecho_apos = html[pos_depois:pos_depois+30]
        if '</body></html>' in trecho_apos:
            html = html[:fb_match.start()] + html[fb_match.end():]
            print(f'[P162b] ✅ Bloco JS removido via fallback')
        else:
            print('[P162b] ERRO: não conseguiu localizar o bloco para remoção. Abortando.')
            sys.exit(1)
    else:
        print('[P162b] ERRO: não encontrou o script do patch 162 em lugar nenhum. Abortando.')
        sys.exit(1)

# ════════════════════════════════════════════════════════════
# PASSO 2: Remover o </script> orfão que restou
#          (o fechamento original do v26Js que ficou sem par)
# ════════════════════════════════════════════════════════════

# Após remover o bloco do patch162, a estrutura fica:
#   ... h + '\n\n\n</body></html>'
#   );
#   janelaImpressao.document.close();
#   ...
#   </script>    ← este era o fechamento ORIGINAL do v26Js, agora orfão

# Precisamos encontrar este </script> orfão. Ele está logo após o 
# document.close() da função de impressão do Diário de Obra.
# Vamos procurar o padrão: janelaImpressao.document.close(); ... </script>
# que esteja dentro do bloco que imprime o "Diário de Obra"

# Na verdade, o </script> orfão na linha 42931 é o que FECHAVA o <script id="v26Js">
# original. Mas agora o v26Js já foi fechado prematuramente pelo </script> do patch162
# (que já removemos). Então este </script> orfão está fechando um bloco <script>
# que nunca foi aberto — ele simplesmente será ignorado pelo navegador como uma
# tag de fechamento sem par, ou pior, fechará um <script> anterior.
# 
# Na verdade, após a remoção do bloco patch162, o v26Js não tem mais um </script>
# prematuro. Precisamos verificar se o </script> original ainda está presente.
# Se sim, agora ele fecha o v26Js corretamente (pois removemos o </script> do patch162).
# Então NÃO devemos removê-lo!

# Vamos verificar: após a remoção, o </script> naquela área é o fechamento 
# correto do v26Js? Vamos checar.

# Na verdade, acho que me confundi. Deixe-me repensar.
# 
# ANTES do patch162, a estrutura era:
#   <script id="v26Js">
#     ... muito JS ...
#     janelaImpressao.document.write(
#       '<!doctype html>...' +
#       '</head><body>' + h +
#       '\n\n\n</body></html>'
#     );
#     janelaImpressao.document.close();
#     ... mais JS (p84Botao, etc) ...
#   </script>               ← fecha v26Js
#
# DEPOIS do patch162 (com bug):
#   <script id="v26Js">
#     ... muito JS ...
#     janelaImpressao.document.write(
#       '<!doctype html>...' +
#       '</head><body>' + h +
#       '\n\n\n<script id="patch162Js">...  ← inserido aqui
#       ...código do patch...
#       </script>            ← FECHA v26Js prematuramente!
#       </body></html>'     ← agora é HTML, não JS string
#     );
#     ... mais JS (p84Botao, etc) ... ← tudo quebrado, é HTML
#   </script>               ← orfão, fecha nada ou algo errado
#
# DEPOIS da remoção do bloco patch162 (PASSO 1):
#   <script id="v26Js">
#     ... muito JS ...
#     janelaImpressao.document.write(
#       '<!doctype html>...' +
#       '</head><body>' + h +
#       '\n\n\n</body></html>'
#     );
#     janelaImpressao.document.close();
#     ... mais JS (p84Botao, etc) ...
#   </script>               ← agora fecha v26Js CORRETAMENTE
#
# ÓTIMO! Após o PASSO 1, a estrutura volta ao normal!
# O </script> original (que antes era "orfão") agora fecha o v26Js corretamente.
# Não precisamos removê-lo. O PASSO 2 é desnecessário.

print('[P162b] Estrutura do v26Js restaurada automaticamente com a remoção do bloco patch162')

# ════════════════════════════════════════════════════════════
# PASSO 3: Inserir o script do patch 162 ANTES do </body> REAL
#          (o ÚLTIMO </body> do arquivo, não o que está dentro
#          de uma string JS)
# ════════════════════════════════════════════════════════════

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
    var profs = (obra.colaboradores||[]).filter(function(c){return c.funcao==='Profissional'||c.funcao==='profissional';});
    var ajuds = (obra.colaboradores||[]).filter(function(c){return c.funcao==='Ajudante'||c.funcao==='ajudante';});
    if(!profs.length) profs = (obra.colaboradores||[]).slice();
    if(!ajuds.length){ ajuds = []; }
    mtRenderCheckboxes('mtCheckProf', profs.map(function(c){return {id:c.id,nome:c.nome};}));
    mtRenderCheckboxes('mtCheckAjud', ajuds.map(function(c){return {id:c.id,nome:c.nome};}));
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
    var material = ((document.getElementById('mtMaterial')||{}).value||'').trim();
    var m2 = parseFloat((document.getElementById('mtM2')||{}).value)||0;
    if(m2<=0){ alert('Informe a metragem (M²).'); return; }
    if(!material){ alert('Informe o material instalado.'); return; }

    fila.push({data:data, material:material, m2:m2});
    document.getElementById('mtMaterial').value = '';
    document.getElementById('mtM2').value = '';
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
    var thtml = '<table><thead><tr><th>#</th><th>Data</th><th>Material</th><th>M²</th><th></th></tr></thead><tbody>';
    fila.forEach(function(t,i){
      totalM2 += t.m2;
      thtml += '<tr><td>'+(i+1)+'</td><td>'+t.data+'</td><td>'+escaparHTML(t.material)+'</td>'+
        '<td>'+t.m2.toLocaleString('pt-BR')+'</td>'+
        '<td><button onclick="mtRemoverLinha('+i+')" style="border:0;background:none;cursor:pointer;font-size:1rem;color:#ef4444;" title="Remover">✕</button></td></tr>';
    });
    thtml += '</tbody><tfoot><tr style="background:#f0fdfa;font-weight:700;"><td colspan="3">Total</td><td>'+totalM2.toLocaleString('pt-BR')+' m²</td><td></td></tr></tfoot></table>';
    el.innerHTML = thtml;
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

    if(typeof initLancamentosProducao==='function') initLancamentosProducao(obra);
    var numProf = profIds.length||1;
    var numAjud = ajudIds.length||1;
    var salvos = 0;

    fila.forEach(function(t){
      var mesKey = t.data.substring(0,7);
      var lanc = {
        id: typeof gerarIdPgto==='function' ? gerarIdPgto() : 'lanc_'+Date.now()+'_'+Math.random().toString(36).substr(2,6),
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
      if(!Array.isArray(obra.lancamentosProducao)) obra.lancamentosProducao=[];
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

    if(typeof salvarDB==='function') salvarDB();
    if(typeof renderPagamento==='function') renderPagamento();

    // Limpa fila e fecha
    fila = [];
    mtRenderTabela();

    alert(salvos+' tarefa(s) salva(s) com sucesso!');
    console.log('[P162] '+salvos+' tarefas salvas para obra '+obra.nome);

    fecharMultiplasTarefas();
  };

  // ── Tecla Enter nos campos ──
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

  console.log('[P162] Script Múltiplas Tarefas carregado (patch162b)');
})();
</script>
'''

# Estratégia para encontrar o REAL </body>:
# Procurar o ÚLTIMO </body> no arquivo, que é o verdadeiro.
# Não usar str.replace com count=1 pois isso encontra o primeiro (dentro de string JS).

# Encontrar a última ocorrência de </body>
last_body_pos = html.rfind('</body>')
if last_body_pos == -1:
    print('[P162b] ERRO: não encontrou </body> no arquivo!'); sys.exit(1)

# Verificar se este </body> está dentro de uma string JS (entre aspas)
# Verificamos se há aspas simples antes e depois
contexto_antes = html[last_body_pos-50:last_body_pos]
contexto_depois = html[last_body_pos+7:last_body_pos+57]

# Se o contexto depois tem </html>' ou </html>');  então estamos dentro de uma string
if "</html>'" in contexto_depois or "</html>" + "'" in contexto_depois:
    print('[P162b] AVISO: o último </body> parece estar dentro de uma string JS')
    print('[P162b]   Procurando o penúltimo...</print>')
    # Procurar o penúltimo
    prev_body_pos = html.rfind('</body>', 0, last_body_pos)
    if prev_body_pos == -1:
        print('[P162b] ERRO: não encontrou um </body> que não esteja em string!'); sys.exit(1)
    last_body_pos = prev_body_pos

# Inserir o JS antes do </body> real
html = html[:last_body_pos] + JS_162 + '\n' + html[last_body_pos:]
print(f'[P162b] ✅ JavaScript inserido antes do </body> real')

# ════════════════════════════════════════════════════════════
# PASSO 4: Adicionar marca de correção aplicada
# ════════════════════════════════════════════════════════════
html += ''

# Adicionar comentário HTML invisível como guarda
guard = '<!-- __patch162bCorrecao:1 -->'
if guard not in html:
    # Inserir antes do último </html>
    last_html_pos = html.rfind('</html>')
    if last_html_pos != -1:
        html = html[:last_html_pos] + '\n' + guard + '\n' + html[last_html_pos:]

# ════════════════════════════════════════════════════════════
# Salvar
# ════════════════════════════════════════════════════════════
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)

print('[P162b] ✅ Correção aplicada com sucesso!')
print('[P162b] Bugs corrigidos:')
print('[P162b]   1. abrirMultiplasTarefas() agora é definida no escopo global')
print('[P162b]   2. Script JS movido para antes do </body> real (não dentro de string)')
print('[P162b]   3. Bloco v26Js restaurado — botão Diário de Obra volta a funcionar')
