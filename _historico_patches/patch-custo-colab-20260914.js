/**
 * Custos a partir do pagamento + cadastro colaborador (Outros).
 * Não apaga lançamentos nem reescreve o index.
 */
(function () {
  'use strict';
  if (window.__patchCustoColab20260914) return;
  window.__patchCustoColab20260914 = true;

  var FUNCOES = ['Profissional', 'Ajudante', 'Mestre de obras', 'Encarregado', 'Técnico', 'Motorista', 'Almoxarife', 'Administrativo', 'Acompanhamento de obra', 'Outros'];
  var EMPRESAS = ['PORTICO', 'TRAXX', 'POLINORDESTE', 'POLIMENTAIS', 'Outros'];

  function obras() {
    return (window.db && Array.isArray(window.db.obras)) ? window.db.obras : [];
  }

  function mapaColab() {
    var porId = {};
    var porNome = {};
    obras().forEach(function (o) {
      function ver(c) {
        if (!c) return;
        var id = String(c.id || '');
        var nome = String(c.nome || '').trim();
        var emp = String(c.empresa || '').trim();
        var fun = String(c.funcao || '').trim();
        if (id) porId[id] = { nome: nome, empresa: emp, funcao: fun, obraId: o.id, obraNome: o.nome };
        if (nome) porNome[nome.toLowerCase()] = { nome: nome, empresa: emp, funcao: fun, obraId: o.id, obraNome: o.nome, id: id };
      }
      (o.colaboradores || []).forEach(ver);
      (o.colaboradoresPgto || []).forEach(ver);
    });
    return { porId: porId, porNome: porNome };
  }

  function acharColab(id, nome, hist) {
    var m = mapaColab();
    if (id && m.porId[String(id)]) return m.porId[String(id)];
    var n = String(nome || '').trim().toLowerCase();
    if (n && m.porNome[n]) return m.porNome[n];
    if (hist && hist.nome) {
      var hn = String(hist.nome).trim().toLowerCase();
      if (m.porNome[hn]) return m.porNome[hn];
      return { nome: hist.nome, empresa: hist.empresa || '', funcao: hist.funcao || '' };
    }
    return { nome: nome || '', empresa: '', funcao: '' };
  }

  function enriquecer(c, o) {
    if (!c) return c;
    var col = acharColab(c.colaboradorId, c.colaborador);
    if (!c.colaborador && col.nome) c.colaborador = col.nome;
    if (!c.empresa && col.empresa) c.empresa = col.empresa;
    if (!c.obraId && o) c.obraId = o.id;
    if (!c.obraNome && o) c.obraNome = o.nome;
    if (!c.regiao && o && o.regiao) c.regiao = o.regiao;
    if (!c.categoria) c.categoria = c.p54auto ? 'Produção' : 'Geral';
    if (!c.empresa) c.empresa = 'SEM EMPRESA';
    return c;
  }

  function custosDoPagamento() {
    var out = [];
    obras().forEach(function (o) {
      (o.lancamentosProducao || []).forEach(function (l) {
        if (!l) return;
        function linha(id, valor, tipo, histArr) {
          var v = Number(valor) || 0;
          if (!(v > 0)) return;
          var hist = (histArr || []).filter(function (h) { return h && String(h.id) === String(id); })[0];
          var col = acharColab(id, hist && hist.nome, hist);
          out.push({
            id: 'p54_prod_' + o.id + '_' + (l.id || l.data) + '_' + String(id) + '_' + tipo,
            obraId: o.id,
            obraNome: o.nome,
            data: l.data || ((l.mesAnoKey || '') + '-01'),
            categoria: 'Produção',
            descricao: (l.material || 'Pagamento de Produção') + ' — ' + (col.nome || 'colaborador'),
            valor: Math.round(v * 100) / 100,
            regiao: (o.regiao && String(o.regiao).trim()) || 'Geral',
            colaborador: col.nome || '',
            colaboradorId: id,
            empresa: col.empresa || 'SEM EMPRESA',
            funcao: col.funcao || tipo,
            p54auto: true
          });
        }
        (l.profissionais || []).forEach(function (pid) {
          linha(pid, l.valorProf, 'Profissional', l.profissionaisHistorico);
        });
        (l.ajudantes || []).forEach(function (aid) {
          linha(aid, l.valorAjud, 'Ajudante', l.ajudantesHistorico);
        });
        if (!(l.profissionais || []).length && Number(l.valorProf) > 0) {
          linha('sem_id_prof', l.valorProf, 'Profissional', l.profissionaisHistorico);
        }
      });
    });
    return out;
  }

  function aplicarFiltros(lista) {
    function val(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '') : '';
    }
    var obraId = val('custoFilterObra');
    var regiao = val('custoFilterRegiao').trim().toLowerCase();
    var mes = val('custoFilterMes');
    var cat = val('custoFilterCategoria');
    var colab = val('custoFilterColaborador');
    var empresa = val('custoFilterEmpresa').toUpperCase();
    var de = val('custoFilterPeriodoDe') || val('custoFilterDataDe');
    var ate = val('custoFilterPeriodoAte') || val('custoFilterDataAte');
    return lista.filter(function (c) {
      if (obraId && String(c.obraId) !== String(obraId)) return false;
      if (regiao && String(c.regiao || '').toLowerCase().indexOf(regiao) < 0) return false;
      if (mes && String(c.data || '').substring(0, 7) !== mes) return false;
      if (cat && String(c.categoria || '') !== cat) return false;
      if (colab && String(c.colaborador || '') !== colab) return false;
      if (empresa && String(c.empresa || '').toUpperCase() !== empresa) return false;
      if (de && String(c.data || '') < de) return false;
      if (ate && String(c.data || '') > ate) return false;
      return true;
    });
  }

  if (typeof window.getCustosFiltered === 'function' && !window.getCustosFiltered.__colab20260914) {
    var orig = window.getCustosFiltered;
    window.getCustosFiltered = function () {
      var base = [];
      try { base = orig.apply(this, arguments) || []; } catch (e) { base = []; }
      var manuais = [];
      base.forEach(function (c) {
        if (c && (c.p54auto || String(c.id || '').indexOf('p54_prod_') === 0)) return;
        var o = obras().filter(function (x) { return x.id === c.obraId; })[0];
        enriquecer(c, o);
        manuais.push(c);
      });
      custosDoPagamento().forEach(function (c) { manuais.push(c); });
      return aplicarFiltros(manuais);
    };
    window.getCustosFiltered.__colab20260914 = true;
    try { getCustosFiltered = window.getCustosFiltered; } catch (e) {}
  }

  function preencherSelect(sel, lista, atual) {
    if (!sel) return;
    var v = atual || sel.value || '';
    sel.innerHTML = '';
    lista.forEach(function (n) {
      var o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      sel.appendChild(o);
    });
    if (v && lista.indexOf(v) < 0) {
      var extra = document.createElement('option');
      extra.value = v;
      extra.textContent = v;
      sel.insertBefore(extra, sel.lastChild);
      sel.value = v;
    } else if (v) sel.value = v;
  }

  function campoOutros(selId, extraId, placeholder) {
    var sel = document.getElementById(selId);
    if (!sel || document.getElementById(extraId)) return;
    var inp = document.createElement('input');
    inp.id = extraId;
    inp.type = 'text';
    inp.placeholder = placeholder;
    inp.style.cssText = 'display:none;width:100%;margin-top:6px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box';
    sel.parentNode.appendChild(inp);
    function sync() {
      inp.style.display = sel.value === 'Outros' ? 'block' : 'none';
    }
    sel.addEventListener('change', sync);
    sync();
  }

  function valorComOutros(selId, extraId) {
    var sel = document.getElementById(selId);
    var extra = document.getElementById(extraId);
    if (!sel) return '';
    if (sel.value === 'Outros' && extra && extra.value.trim()) return extra.value.trim();
    return sel.value;
  }

  function arrumarCadastro() {
    var f = document.getElementById('colabInputFuncao');
    var e = document.getElementById('colabInputEmpresa');
    preencherSelect(f, FUNCOES, f && f.value);
    preencherSelect(e, EMPRESAS, e && e.value);
    campoOutros('colabInputFuncao', 'colabInputFuncaoOutros', 'Qual função?');
    campoOutros('colabInputEmpresa', 'colabInputEmpresaOutros', 'Qual empresa?');
  }

  if (typeof window.salvarColaborador === 'function' && !window.salvarColaborador.__outros20260914) {
    var sc = window.salvarColaborador;
    window.salvarColaborador = function () {
      var f = document.getElementById('colabInputFuncao');
      var e = document.getElementById('colabInputEmpresa');
      var fv = valorComOutros('colabInputFuncao', 'colabInputFuncaoOutros');
      var ev = valorComOutros('colabInputEmpresa', 'colabInputEmpresaOutros');
      if (f && fv) {
        if (![].some.call(f.options, function (o) { return o.value === fv; })) {
          var of = document.createElement('option'); of.value = fv; of.textContent = fv; f.appendChild(of);
        }
        f.value = fv;
      }
      if (e && ev) {
        if (![].some.call(e.options, function (o) { return o.value === ev; })) {
          var oe = document.createElement('option'); oe.value = ev; oe.textContent = ev; e.appendChild(oe);
        }
        e.value = ev;
      }
      return sc.apply(this, arguments);
    };
    window.salvarColaborador.__outros20260914 = true;
  }

  if (typeof window.editarColaborador === 'function' && !window.editarColaborador.__outros20260914) {
    var ec = window.editarColaborador;
    window.editarColaborador = function () {
      var r = ec.apply(this, arguments);
      setTimeout(function () {
        arrumarCadastro();
        var f = document.getElementById('colabInputFuncao');
        var e = document.getElementById('colabInputEmpresa');
        if (f && FUNCOES.indexOf(f.value) < 0 && f.value) {
          f.value = 'Outros';
          var fo = document.getElementById('colabInputFuncaoOutros');
          if (fo) { fo.value = arguments && arguments[0] ? f.value : fo.value; }
        }
        if (e && EMPRESAS.indexOf(e.value) < 0 && e.value && e.value !== 'PORTICO') {
          /* deixa valor atual se já existir como option */
        }
      }, 0);
      return r;
    };
    window.editarColaborador.__outros20260914 = true;
  }

  setTimeout(arrumarCadastro, 600);
  document.addEventListener('click', function (ev) {
    if (ev.target && /colaborador/i.test(ev.target.textContent || '')) setTimeout(arrumarCadastro, 80);
  });

  console.log('[custo-colab 20260914] custos do pagamento com empresa/obra/categoria + Outros no cadastro');
})();
