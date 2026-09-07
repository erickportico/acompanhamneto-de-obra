/**
 * Pagamento → Centro de Custos
 * UF só com sigla. Cidade + Estado no lançamento.
 * Um custo por pessoa (prof/ajudante), com obra, empresa, cidade-UF.
 */
(function () {
  'use strict';
  if (window.__patchUi2026pgtoCusto) return;
  window.__patchUi2026pgtoCusto = true;

  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  var css = document.createElement('style');
  css.textContent = [
    '.pgto-loc{display:flex;flex-direction:column;gap:4px;min-width:90px}',
    '.pgto-loc label{font-size:11px;font-weight:700;color:#64748b}',
    '#inputLancUf,#inputLancCidade{width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:.85rem;box-sizing:border-box}',
    '#inputLancUf{max-width:88px}',
    '#locSugBox{display:none}',
    '#locSugBox.aberto{display:block;position:fixed;z-index:2147483646;background:#fff;color:#0f172a;border:1px solid #94a3b8;border-radius:8px;max-height:220px;overflow:auto}',
    '#locSugBox.aberto button{display:block;width:100%;text-align:left;border:0;background:#fff;color:#0f172a;padding:8px 10px}',
    '#locSugBox.aberto button:hover{background:#e2e8f0}',
    '#custoFilterEstado option{font-weight:700}'
  ].join('');
  document.head.appendChild(css);

  function optsUf() {
    return '<option value="">UF</option>' + UFS.map(function (u) {
      return '<option value="' + u + '">' + u + '</option>';
    }).join('');
  }

  function camposForm() {
    if (document.getElementById('inputLancUf')) return;
    var obra = document.getElementById('inputLancObra');
    if (!obra || !obra.parentNode) return;
    var uf = document.createElement('div');
    uf.className = 'pgto-loc';
    uf.innerHTML = '<label>UF</label><select id="inputLancUf">' + optsUf() + '</select>';
    var cid = document.createElement('div');
    cid.className = 'pgto-loc';
    cid.style.minWidth = '160px';
    cid.innerHTML = '<label>Cidade</label><input id="inputLancCidade" placeholder="Ex: João Pessoa" autocomplete="off">';
    obra.parentNode.insertAdjacentElement('afterend', cid);
    obra.parentNode.insertAdjacentElement('afterend', uf);
    ligarCidade(document.getElementById('inputLancCidade'), document.getElementById('inputLancUf'));
  }

  function fecharSug() {
    var b = document.getElementById('locSugBox');
    if (!b) return;
    b.className = '';
    b.innerHTML = '';
    b.style.display = 'none';
  }

  function ligarCidade(inp, sel) {
    if (!inp || inp.__ibge) return;
    inp.__ibge = true;
    inp.addEventListener('input', function () { sugerir(inp, sel); });
    inp.addEventListener('blur', function () { setTimeout(fecharSug, 180); });
  }

  async function sugerir(inp, sel) {
    var uf = String((sel && sel.value) || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) { fecharSug(); return; }
    var lista = [];
    try {
      var raw = localStorage.getItem('painel_ibge_mun_v1_' + uf);
      if (raw) lista = JSON.parse(raw).dados || [];
    } catch (e) {}
    if (!lista.length) {
      try {
        var r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/' + uf + '/municipios');
        lista = (await r.json()).map(function (x) { return x.nome; });
        localStorage.setItem('painel_ibge_mun_v1_' + uf, JSON.stringify({ em: Date.now(), dados: lista }));
      } catch (e2) { return; }
    }
    var q = String(inp.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var hits = lista.filter(function (n) {
      return String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(q) >= 0;
    }).slice(0, 20);
    var box = document.getElementById('locSugBox');
    if (!box) { box = document.createElement('div'); box.id = 'locSugBox'; document.body.appendChild(box); }
    if (!hits.length) { fecharSug(); return; }
    var rct = inp.getBoundingClientRect();
    box.className = 'aberto';
    box.style.left = rct.left + 'px';
    box.style.top = (rct.bottom + 4) + 'px';
    box.style.width = Math.max(180, rct.width) + 'px';
    box.innerHTML = hits.map(function (n) { return '<button type="button">' + n + '</button>'; }).join('');
    box.querySelectorAll('button').forEach(function (bt) {
      bt.onclick = function () { inp.value = bt.textContent; fecharSug(); };
    });
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest && ev.target.closest('#locSugBox')) return;
    fecharSug();
  }, true);

  function ufSoSigla() {
    var sel = document.getElementById('custoFilterEstado');
    if (!sel || sel.getAttribute('data-sigla') === '1') return;
    var atual = sel.value;
    var sig = (atual.match(/[A-Z]{2}/) || [atual])[0];
    sel.innerHTML = '<option value="">UF</option>' + UFS.map(function (u) {
      return '<option value="' + u + '">' + u + '</option>';
    }).join('');
    if (sig && UFS.indexOf(sig) >= 0) sel.value = sig;
    sel.setAttribute('data-sigla', '1');
  }

  function acharPessoa(id) {
    var db = window.db;
    if (!db) return { id: id, nome: id, empresa: '' };
    var achou = null;
    (db.obras || []).forEach(function (o) {
      (o.colaboradores || []).concat(o.colaboradoresPgto || []).forEach(function (c) {
        if (c && String(c.id) === String(id)) achou = c;
      });
    });
    if (typeof window.getColaboradoresAll === 'function') {
      try {
        var lista = window.getColaboradoresAll() || [];
        lista.forEach(function (c) { if (c && String(c.id) === String(id)) achou = c; });
      } catch (e) {}
    }
    return achou || { id: id, nome: id, empresa: '' };
  }

  function localDoForm() {
    var uf = String((document.getElementById('inputLancUf') || {}).value || '').toUpperCase();
    var cid = String((document.getElementById('inputLancCidade') || {}).value || '').trim();
    if (uf && UFS.indexOf(uf) < 0) {
      var m = uf.match(/[A-Z]{2}/);
      uf = m ? m[0] : '';
    }
    return {
      uf: uf,
      cidade: cid,
      rotulo: cid && uf ? (cid + ' - ' + uf) : (cid || uf || '')
    };
  }

  function empurrarCustos(obra, lanc, loc) {
    if (!obra.centrosCusto) obra.centrosCusto = [];
    obra.centrosCusto = obra.centrosCusto.filter(function (c) {
      return c.lancamentoPgtoId !== lanc.id;
    });
    var pessoas = [];
    (lanc.profissionais || []).forEach(function (id) {
      var p = acharPessoa(id);
      pessoas.push({
        id: id,
        nome: p.nome || id,
        empresa: p.empresa || '',
        papel: 'Profissional',
        valor: Number(lanc.valorProf) || 0
      });
    });
    (lanc.ajudantes || []).forEach(function (id) {
      var p = acharPessoa(id);
      pessoas.push({
        id: id,
        nome: p.nome || id,
        empresa: p.empresa || '',
        papel: 'Ajudante',
        valor: Number(lanc.valorAjud) || 0
      });
    });
    if (!pessoas.length) {
      pessoas.push({
        id: 'obra',
        nome: obra.nome || 'Obra',
        empresa: '',
        papel: 'Pagamento',
        valor: (Number(lanc.valorProf) || 0) + (Number(lanc.valorAjud) || 0)
      });
    }
    pessoas.forEach(function (p) {
      if (!(p.valor > 0)) return;
      obra.centrosCusto.push({
        id: 'pgto-' + lanc.id + '-' + p.id,
        lancamentoPgtoId: lanc.id,
        data: lanc.data,
        valor: Math.round(p.valor * 100) / 100,
        categoria: 'Pagamento produção',
        descricao: (lanc.material || 'Pagamento') + ' — ' + p.papel + ' — ' + p.nome,
        colaborador: p.nome,
        empresa: String(p.empresa || '').toUpperCase(),
        obraId: obra.id,
        obraNome: obra.nome,
        regiao: loc.rotulo,
        estado: loc.uf,
        cidade: loc.cidade
      });
    });
  }

  function hookSalvar() {
    if (typeof window.salvarLancamentoPgto !== 'function' || window.salvarLancamentoPgto.__custo) return;
    var orig = window.salvarLancamentoPgto;
    window.salvarLancamentoPgto = function () {
      var loc = localDoForm();
      orig.apply(this, arguments);
      try {
        var db = window.db;
        if (!db) return;
        db.obras.forEach(function (o) {
          var arr = o.lancamentosProducao || [];
          if (!arr.length) return;
          var last = arr[arr.length - 1];
          if (!last) return;
          last.estado = loc.uf;
          last.cidade = loc.cidade;
          last.regiao = loc.rotulo;
          empurrarCustos(o, last, loc);
        });
        if (typeof window.salvarDB === 'function') window.salvarDB();
        if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard();
      } catch (e) {
        console.warn('[pgto-custo]', e);
      }
    };
    window.salvarLancamentoPgto.__custo = true;
  }

  function hookExcluir() {
    if (typeof window.excluirLancamentoPgto !== 'function' || window.excluirLancamentoPgto.__custo) return;
    var orig = window.excluirLancamentoPgto;
    window.excluirLancamentoPgto = function (lancId, obraId) {
      try {
        var db = window.db;
        if (db) {
          db.obras.forEach(function (o) {
            if (obraId && String(o.id) !== String(obraId)) return;
            o.centrosCusto = (o.centrosCusto || []).filter(function (c) {
              return c.lancamentoPgtoId !== lancId;
            });
          });
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    window.excluirLancamentoPgto.__custo = true;
  }

  function backfill() {
    var db = window.db;
    if (!db || db.__pgtoCustoFill) return;
    var mudou = false;
    (db.obras || []).forEach(function (o) {
      (o.lancamentosProducao || []).forEach(function (l) {
        var ja = (o.centrosCusto || []).some(function (c) { return c.lancamentoPgtoId === l.id; });
        if (ja) return;
        empurrarCustos(o, l, {
          uf: l.estado || '',
          cidade: l.cidade || '',
          rotulo: l.regiao || [l.cidade, l.estado].filter(Boolean).join(' - ')
        });
        mudou = true;
      });
    });
    if (mudou) {
      db.__pgtoCustoFill = true;
      if (typeof window.salvarDB === 'function') window.salvarDB();
    }
  }

  function tick() {
    camposForm();
    ufSoSigla();
    hookSalvar();
    hookExcluir();
    backfill();
  }
  setTimeout(tick, 400);
  setTimeout(tick, 1500);
  setInterval(tick, 3000);
  console.log('[UI2026pgtoCusto] UF sigla + custo por pessoa no centro de custos');
})();
