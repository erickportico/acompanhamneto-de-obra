/**
 * PATCH UI 2026 v5
 * Região no pagamento, P120 lê centrosCusto + lancamentosProducao, obras na gaveta do menu
 * <script src="/patch-ui-2026-v5.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026v5) return;
  window.__patchUi2026v5 = true;

  var REGS = ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro', 'Geral'];

  function mesDe(data) {
    var d = String(data || '');
    if (/^\d{4}-\d{2}/.test(d)) return d.slice(0, 7);
    var p = d.split('/');
    if (p.length === 3) return p[2] + '-' + p[1];
    return '';
  }
  function mesFiltro() {
    var el = document.getElementById('custoFilterMes');
    if (!el) return '';
    var v = String(el.value || '');
    if (/^\d{4}-\d{2}/.test(v)) return v.slice(0, 7);
    var map = { janeiro: '01', fevereiro: '02', marco: '03', março: '03', abril: '04', maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12' };
    var low = v.toLowerCase();
    for (var k in map) {
      if (low.indexOf(k) >= 0) {
        var y = (low.match(/20\d{2}/) || [])[0] || String(new Date().getFullYear());
        return y + '-' + map[k];
      }
    }
    return v;
  }
  function brl(n) {
    return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function todosCustos() {
    var out = [];
    (window.db && db.obras || []).forEach(function (o) {
      (o.centrosCusto || []).forEach(function (c) {
        out.push({
          id: c.id, obraId: c.obraId || o.id, obra: o.nome, data: c.data,
          valor: Number(c.valor) || 0, categoria: c.categoria || 'Despesa',
          empresa: c.empresa || '', regiao: c.regiao || '', origem: 'custo'
        });
      });
      (o.lancamentosProducao || []).forEach(function (l) {
        var v = (Number(l.valorProf) || 0) * ((l.profissionais || []).length || 1)
              + (Number(l.valorAjud) || 0) * ((l.ajudantes || []).length || 1);
        if (!v) v = (Number(l.instalacaoM2) || 0) * ((Number(l.taxaProf) || 0) + (Number(l.taxaAjud) || 0));
        out.push({
          id: l.id, obraId: l.obraId || o.id, obra: o.nome,
          data: l.data || (l.mesAnoKey ? l.mesAnoKey + '-01' : ''),
          valor: v, categoria: 'Pagamento produção', empresa: l.empresa || '',
          regiao: l.regiao || '', origem: 'pgto'
        });
      });
    });
    return out;
  }

  function filtrar(lista) {
    var obra = (document.getElementById('custoFilterObra') || {}).value || '';
    var emp = String((document.getElementById('custoFilterEmpresa') || {}).value || '').toUpperCase();
    var reg = String((document.getElementById('custoFilterRegiao') || {}).value || '').toLowerCase();
    var mes = mesFiltro();
    var de = (document.getElementById('custoFilterPeriodoDe') || {}).value || '';
    var ate = (document.getElementById('custoFilterPeriodoAte') || {}).value || '';
    return lista.filter(function (c) {
      if (obra && String(c.obraId) !== String(obra) && obra.indexOf('Todas') < 0) return false;
      if (emp && emp.indexOf('TODAS') < 0 && String(c.empresa || '').toUpperCase() !== emp) return false;
      if (reg && String(c.regiao || '').toLowerCase().indexOf(reg) < 0) return false;
      if (mes) {
        var m = mesDe(c.data);
        if (m && m !== mes) return false;
      }
      if (de && String(c.data || '') < de) return false;
      if (ate && String(c.data || '') > ate) return false;
      return true;
    });
  }

  function pintarP120() {
    var lista = filtrar(todosCustos());
    var cx = document.getElementById('p120Kpis');
    if (!cx) return;
    var total = 0, porMes = {}, porEmp = {}, porCat = {}, porReg = {};
    lista.forEach(function (c) {
      total += c.valor;
      var m = mesDe(c.data) || '(sem data)';
      porMes[m] = (porMes[m] || 0) + c.valor;
      porEmp[c.empresa || 'Sem empresa'] = (porEmp[c.empresa || 'Sem empresa'] || 0) + c.valor;
      porCat[c.categoria || 'Outros'] = (porCat[c.categoria || 'Outros'] || 0) + c.valor;
      porReg[c.regiao || 'Sem região'] = (porReg[c.regiao || 'Sem região'] || 0) + c.valor;
    });
    var meses = Object.keys(porMes).filter(function (k) { return k !== '(sem data)'; }).sort();
    var topE = Object.keys(porEmp).sort(function (a, b) { return porEmp[b] - porEmp[a]; })[0] || '—';
    var topC = Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; })[0] || '—';
    var ultimo = meses[meses.length - 1] || '';
    cx.innerHTML =
      '<div class="p120-kpi k1 largo"><span>Total no filtro</span><b>' + brl(total) +
      '</b><i>' + lista.length + ' lançamentos (custo + produção)</i></div>' +
      '<div class="p120-kpi k2"><span>Último mês</span><b>' + (ultimo ? brl(porMes[ultimo]) : '—') +
      '</b><i>' + (ultimo || 'sem data') + '</i></div>' +
      '<div class="p120-kpi k3"><span>Média por mês</span><b>' +
      brl(meses.length ? total / meses.length : 0) + '</b><i>' + meses.length + ' meses</i></div>' +
      '<div class="p120-kpi k4"><span>Empresa mais gasto</span><b>' + topE +
      '</b><i>' + (topE !== '—' ? brl(porEmp[topE]) : '') + '</i></div>' +
      '<div class="p120-kpi k5"><span>Maior categoria</span><b>' + topC +
      '</b><i>' + (topC !== '—' ? brl(porCat[topC]) : '') + '</i></div>' +
      '<div class="p120-kpi k6"><span>Média por lançamento</span><b>' +
      brl(lista.length ? total / lista.length : 0) + '</b><i>' + lista.length + ' itens</i></div>';
    window.__p120ListaV5 = lista;
  }

  function hookGetCustos() {
    if (window.getCustosFiltered && window.getCustosFiltered.__v5) return;
    var orig = window.getCustosFiltered;
    window.getCustosFiltered = function () {
      var lista = filtrar(todosCustos()).map(function (c) {
        return {
          id: c.id, obraId: c.obraId, data: c.data, valor: c.valor,
          categoria: c.categoria, empresa: c.empresa, regiao: c.regiao, descricao: c.categoria
        };
      });
      return lista;
    };
    window.getCustosFiltered.__v5 = true;
    if (typeof orig === 'function') { /* keep orig unused; we replace on purpose */ }
  }

  function campoRegiaoPagamento() {
    if (document.getElementById('inputLancRegiao')) return;
    var obra = document.getElementById('inputLancObra');
    if (!obra || !obra.parentNode) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<label style="font-size:12px;font-weight:600;color:#334155">Região</label>' +
      '<select id="inputLancRegiao" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px">' +
      REGS.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join('') +
      '</select>';
    obra.parentNode.parentNode.insertBefore(wrap, obra.parentNode.nextSibling);
    if (window.salvarLancamentoPgto && !window.salvarLancamentoPgto.__v5) {
      var sv = window.salvarLancamentoPgto;
      window.salvarLancamentoPgto = function () {
        var r = sv.apply(this, arguments);
        try {
          var obraId = (document.getElementById('inputLancObra') || {}).value;
          var reg = (document.getElementById('inputLancRegiao') || {}).value || 'Geral';
          var obra = (db.obras || []).filter(function (o) { return o.id === obraId; })[0];
          if (obra && obra.lancamentosProducao && obra.lancamentosProducao.length) {
            obra.lancamentosProducao[obra.lancamentosProducao.length - 1].regiao = reg;
            if (window.salvarDB) window.salvarDB();
          }
        } catch (e) {}
        setTimeout(pintarP120, 80);
        return r;
      };
      window.salvarLancamentoPgto.__v5 = true;
    }
  }

  function gavetaObras() {
    var lista = document.getElementById('orLista');
    if (!lista || document.getElementById('orObrasBox')) return;
    var box = document.createElement('div');
    box.id = 'orObrasBox';
    box.innerHTML = '<div class="or-grupo" style="margin-top:8px;padding:8px 10px 4px;font-size:11px;letter-spacing:.6px;color:#94a3b8;font-weight:700">OBRAS</div>' +
      '<button type="button" class="or-item" id="orObrasToggle"><span class="or-ico">🏗️</span><span class="or-txt">Obras ▾</span></button>' +
      '<div id="orObrasLista" style="display:none;padding:4px 8px 10px 16px"></div>';
    lista.appendChild(box);
    document.getElementById('orObrasToggle').onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var g = document.getElementById('orObrasLista');
      g.style.display = g.style.display === 'none' ? 'block' : 'none';
      this.querySelector('.or-txt').textContent = g.style.display === 'none' ? 'Obras ▾' : 'Obras ▴';
    };
    preencherObras();
  }
  function preencherObras() {
    var g = document.getElementById('orObrasLista');
    if (!g || !window.db) return;
    var atual = db.obraAtualId;
    g.innerHTML = (db.obras || []).map(function (o) {
      var on = o.id === atual ? 'background:#1e293b;' : '';
      return '<button type="button" class="or-item" data-obra="' + o.id + '" style="width:100%;' + on + '"><span class="or-txt">' +
        String(o.nome || o.id) + '</span></button>';
    }).join('');
    g.querySelectorAll('[data-obra]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var id = b.getAttribute('data-obra');
        if (typeof window.trocarObra === 'function') window.trocarObra(id);
        else if (typeof window.selecionarObra === 'function') window.selecionarObra(id);
        else {
          db.obraAtualId = id;
          var sel = document.getElementById('selectObra');
          if (sel) { sel.value = id; sel.dispatchEvent(new Event('change')); }
          if (window.render) window.render();
        }
        preencherObras();
      };
    });
  }

  function iniciar() {
    hookGetCustos();
    campoRegiaoPagamento();
    gavetaObras();
    pintarP120();
    ['change', 'input'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (e.target && String(e.target.id || '').indexOf('custoFilter') === 0) pintarP120();
      });
    });
    if (typeof window.renderCustoDashboard === 'function' && !window.renderCustoDashboard.__v5) {
      var rc = window.renderCustoDashboard;
      window.renderCustoDashboard = function () {
        var r = rc.apply(this, arguments);
        setTimeout(function () { hookGetCustos(); pintarP120(); }, 30);
        return r;
      };
      window.renderCustoDashboard.__v5 = true;
    }
    setInterval(function () {
      campoRegiaoPagamento();
      if (!document.getElementById('orObrasBox')) gavetaObras();
      else preencherObras();
      pintarP120();
    }, 2000);
    console.log('[UI2026v5] patch ativo — custos unificados + obras no menu');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 400);
})();
