from pathlib import Path
from datetime import datetime
import shutil

ARQUIVO = Path('index.html')
if not ARQUIVO.exists():
    raise SystemExit('ERRO: index.html nao encontrado na pasta atual.')

s = ARQUIVO.read_text(encoding='utf-8', errors='ignore')

if 'PATCH 160: REGIAO CANONICA + COLABORADOR UNICO' in s:
    print('PATCH 160 ja aplicado. Nenhuma alteracao feita.')
    raise SystemExit(0)

backup = ARQUIVO.with_name(f'index_PRE_PATCH160_{datetime.now():%Y%m%d_%H%M%S}.html')
shutil.copy2(ARQUIVO, backup)

patch = r'''
<!-- PATCH 160: REGIAO CANONICA + COLABORADOR UNICO -->
<script id="patch160RegiaoColaborador">
(function(){
  'use strict';
  if (window.__patch160RegiaoColaborador) return;
  window.__patch160RegiaoColaborador = true;

  function semAcento(v){
    try { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
    catch(e){ return String(v == null ? '' : v); }
  }

  /* Uma unica representacao para a regiao/cidade:
     "João Pessoa - PB", "Joao Pessoa-Pb" e "João  Pessoa - pb"
     passam a ser tratados como a mesma regiao. */
  function normalizarRegiao(v){
    var s = String(v == null ? '' : v).replace(/\s+/g,' ').trim();
    if (!s) return '';
    s = s.replace(/\s*[-–—]\s*/g, ' - ');
    var partes = s.split(' - ');
    if (partes.length >= 2) {
      var uf = partes.pop().trim();
      var local = partes.join(' - ').trim();
      if (/^[A-Za-z]{2}$/.test(uf)) {
        uf = uf.toUpperCase();
        local = local.toLowerCase().replace(/(^|[\s'])([a-zà-ÿ])/g, function(_, pre, ch){ return pre + ch.toUpperCase(); });
        return local + ' - ' + uf;
      }
    }
    return s;
  }

  function chaveNome(v){
    return semAcento(v).toLowerCase().replace(/\s+/g,' ').trim();
  }

  function banco(){
    return (window.db && Array.isArray(window.db.obras)) ? window.db : null;
  }

  /* Corrige imediatamente os dados antigos, sem apagar historico. */
  function normalizarBanco(){
    var d = banco();
    if (!d) return false;
    var alterou = false;

    (d.obras || []).forEach(function(o){
      if (!o) return;
      var r = normalizarRegiao(o.regiao);
      if (r !== String(o.regiao || '').trim()) { o.regiao = r; alterou = true; }

      (o.centrosCusto || []).forEach(function(c){
        if (!c) return;
        var cr = normalizarRegiao(c.regiao);
        if (cr && cr !== String(c.regiao || '').trim()) { c.regiao = cr; alterou = true; }
      });
    });
    return alterou;
  }

  /* Nao apaga cadastros antigos de colaboradores: eles podem ser referenciados
     por lancamentos historicos. A deduplicacao sera somente de exibicao/listas. */
  function eliminarDuplicadosColaboradores(){
    return false;
  }

  function listaColaboradoresUnicos(){
    var d = banco();
    if (!d) return [];
    var vistos = {};
    var out = [];
    for (var oi = d.obras.length - 1; oi >= 0; oi--) {
      var o = d.obras[oi];
      if (!o || !Array.isArray(o.colaboradores)) continue;
      for (var ci = o.colaboradores.length - 1; ci >= 0; ci--) {
        var c = o.colaboradores[ci];
        if (!c) continue;
        var k = chaveNome(c.nome);
        if (!k || vistos[k]) continue;
        vistos[k] = true;
        out.push(c);
      }
    }
    return out;
  }

  function salvarSeguro(){
    try { if (typeof window.salvarDB === 'function') window.salvarDB(true); } catch(e) {}
  }

  function aplicarTudo(salvar){
    var mudou = normalizarBanco();
    if (eliminarDuplicadosColaboradores()) mudou = true;
    if (mudou && salvar) salvarSeguro();
    return mudou;
  }

  /* Normaliza no carregamento e apos sincronizacao/renderizacao. */
  function iniciar(){
    var mudou = aplicarTudo(true);
    if (mudou) {
      try { if (typeof window.renderListaColaboradores === 'function') window.renderListaColaboradores(); } catch(e) {}
      try { if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard(); } catch(e) {}
    }
  }

  /* Ao salvar uma obra, nunca deixa "Pb", "pb" ou variantes sem espaco. */
  if (typeof window.salvarConfigObra === 'function') {
    var salvarObraOriginal = window.salvarConfigObra;
    var salvarObraNovo = function(){
      var el = document.getElementById('inputRegiaoObra');
      if (el) el.value = normalizarRegiao(el.value);
      return salvarObraOriginal.apply(this, arguments);
    };
    salvarObraNovo.__patch160 = true;
    window.salvarConfigObra = salvarObraNovo;
  }

  /* Ao abrir a configuracao, mostra a forma canonica mesmo que o dado antigo
     esteja gravado como "Pb". */
  if (typeof window.abrirModalObra === 'function') {
    var abrirObraOriginal = window.abrirModalObra;
    window.abrirModalObra = function(){
      var r = abrirObraOriginal.apply(this, arguments);
      var el = document.getElementById('inputRegiaoObra');
      if (el) el.value = normalizarRegiao(el.value);
      return r;
    };
  }

  /* Listas globais: um mesmo nome normalizado aparece uma unica vez,
     mas os registros originais continuam intactos para o historico. */
  if (typeof window.getColaboradoresAll === 'function') {
    var getColabOriginal = window.getColaboradoresAll;
    window.getColaboradoresAll = function(){
      var base = getColabOriginal.apply(this, arguments) || [];
      var vistos = {};
      return base.filter(function(c){
        var k = chaveNome(c && c.nome);
        if (!k || vistos[k]) return false;
        vistos[k] = true;
        return true;
      });
    };
    try { getColaboradoresAll = window.getColaboradoresAll; } catch(e) {}
  }

  if (typeof window.renderListaColaboradores === 'function') {
    window.renderListaColaboradores = function(){
      var container = document.getElementById('containerColaboradores');
      if (!container) return;
      var d = banco();
      if (!d) return;
      var vistos = {};
      var linhas = [];
      for (var oi = d.obras.length - 1; oi >= 0; oi--) {
        var obra = d.obras[oi];
        if (!obra || !Array.isArray(obra.colaboradores)) continue;
        for (var ci = obra.colaboradores.length - 1; ci >= 0; ci--) {
          var c = obra.colaboradores[ci];
          if (!c) continue;
          var k = chaveNome(c.nome);
          if (k && vistos[k]) continue;
          if (k) vistos[k] = true;
          linhas.push({c:c, obra:obra});
        }
      }
      if (!linhas.length) {
        container.innerHTML = '<div style="color:var(--text-light,#94a3b8);font-size:13px;padding:8px;">Nenhum colaborador registrado em nenhuma obra.</div>';
        return;
      }
      linhas.reverse();
      var html = '<table class="lanc-table"><thead><tr>';
      html += '<th>Nome</th><th>Função</th><th>EMPRESA</th><th>Obra</th><th style="width:120px;">Ações</th>';
      html += '</tr></thead><tbody>';
      linhas.forEach(function(item){
        var c=item.c, obra=item.obra;
        html += '<tr><td>' + escaparHTML(c.nome || '-') + '</td>';
        html += '<td>' + escaparHTML(c.funcao || '-') + '</td>';
        html += '<td>' + escaparHTML(c.empresa || '-') + '</td>';
        html += '<td>' + escaparHTML(obra.nome || '-') + '</td><td class="lanc-actions">';
        html += '<button class="btn-icon-sm" onclick="editarColaborador(\'' + c.id + '\',\'' + obra.id + '\')" title="Editar">📝</button>';
        html += '<button class="btn-icon-sm" onclick="excluirColaborador(\'' + c.id + '\',\'' + obra.id + '\')" title="Excluir">🗑️</button>';
        html += '</td></tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    };
  }

  /* Centro de Custos: ao selecionar a obra, a regiao da obra vira o valor
     padrao do lancamento. O usuario ainda pode editar o campo se precisar de
     um local especifico da despesa. */
  function ligarObraCusto(){
    var sel = document.getElementById('custoFilterObra');
    var campo = document.getElementById('custoInputRegiao');
    if (!sel || !campo || sel.__patch160) return;
    sel.__patch160 = true;
    sel.addEventListener('change', function(){
      var d = banco();
      if (!d) return;
      var o = d.obras.find(function(x){ return x && x.id === sel.value; });
      if (o && o.regiao) campo.value = normalizarRegiao(o.regiao);
    });
  }

  /* Antes de qualquer novo custo, canoniza a regiao digitada. */
  if (typeof window.salvarCusto === 'function') {
    var salvarCustoOriginal = window.salvarCusto;
    window.salvarCusto = function(){
      var el = document.getElementById('custoInputRegiao');
      if (el) el.value = normalizarRegiao(el.value);
      return salvarCustoOriginal.apply(this, arguments);
    };
  }

  /* Mantem custos existentes canonicos quando forem editados. */
  if (typeof window.salvarEdicaoCusto === 'function') {
    var editarCustoOriginal = window.salvarEdicaoCusto;
    window.salvarEdicaoCusto = function(){
      var el = document.getElementById('custoEditRegiao');
      if (el) el.value = normalizarRegiao(el.value);
      return editarCustoOriginal.apply(this, arguments);
    };
  }

  /* Reforco: toda vez que o dashboard for renderizado, regioes ja existentes
     sao comparadas pela forma canonica, evitando duas linhas para a mesma UF. */
  if (typeof window.renderCustoDashboard === 'function') {
    var renderCustoOriginal = window.renderCustoDashboard;
    window.renderCustoDashboard = function(){
      aplicarTudo(false);
      return renderCustoOriginal.apply(this, arguments);
    };
  }

  window.normalizarRegiaoPainel = normalizarRegiao;
  window.diagnosticoRegioesColaboradores = function(){
    aplicarTudo(false);
    var d = banco();
    var regioes = {}, colabs = {};
    (d && d.obras || []).forEach(function(o){
      var r = normalizarRegiao(o.regiao);
      if (r) regioes[r] = (regioes[r] || 0) + 1;
      (o.colaboradores || []).forEach(function(c){
        var k = chaveNome(c.nome);
        if (k) colabs[k] = (colabs[k] || 0) + 1;
      });
    });
    return { regioes: regioes, colaboradores: colabs };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ iniciar(); ligarObraCusto(); });
  } else {
    iniciar(); ligarObraCusto();
  }
  setTimeout(function(){ aplicarTudo(true); ligarObraCusto(); }, 1200);
})();
'''

marker = '</body>'
pos = s.lower().rfind(marker)
if pos < 0:
    raise SystemExit('ERRO: </body> nao encontrado; backup preservado e nenhuma alteracao aplicada.')

novo = s[:pos] + '\n' + patch + s[pos:]
ARQUIVO.write_text(novo, encoding='utf-8')
print('BACKUP criado:', backup.name)
print('PATCH 160 aplicado em:', ARQUIVO.name)
print('Regioes existentes serao canonizadas para Cidade - UF (UF em maiusculas).')
print('Colaboradores duplicados por nome normalizado serao consolidados, preservando os lancamentos historicos.')
