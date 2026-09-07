/**
 * PATCH UI 2026 ÚNICO
 * Junta tooltip P120 + mês vigente + IBGE com cache offline
 * <script src="/patch-ui-2026-unico.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026unico) return;
  window.__patchUi2026unico = true;

  var IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
  var K_UF = 'painel_ibge_uf_v1';
  var K_MUN = 'painel_ibge_mun_v1_';
  var UF = [];
  var MUN = {};

  var css = document.createElement('style');
  css.textContent = [
    '#p120Dica{display:none!important;width:auto!important;max-width:240px!important;',
    'height:auto!important;left:auto!important;right:auto!important;position:fixed!important;',
    'pointer-events:none!important;z-index:20!important}',
    '#p120Dica.ok{display:block!important;background:#0f172a;color:#fff;padding:6px 10px;',
    'border-radius:8px;font-size:12px;white-space:nowrap}',
    '.loc-wrap{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:6px 0}',
    '.loc-wrap label{display:flex;flex-direction:column;font-size:11px;font-weight:700;color:#64748b;gap:4px}',
    '.loc-wrap input,.loc-wrap select{min-width:150px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px}',
    '.loc-sug{position:fixed;z-index:2147483000;background:#fff;border:1px solid #cbd5e1;border-radius:8px;max-height:220px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.15)}',
    '.loc-sug button{display:block;width:100%;text-align:left;border:0;background:#fff;padding:8px 10px;cursor:pointer}'
  ].join('');
  document.head.appendChild(css);

  function matarFaixa() {
    var d = document.getElementById('p120Dica');
    if (!d) return;
    d.style.cssText = 'display:none!important;width:auto;max-width:240px;position:fixed;pointer-events:none';
    d.removeAttribute('class');
    if (d.parentNode && d.offsetWidth > 400) d.parentNode.removeChild(d);
  }

  function mesAtual() {
    var n = new Date();
    return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2);
  }
  function mesDe(data) {
    var d = String(data || '');
    if (/^\d{4}-\d{2}/.test(d)) return d.slice(0, 7);
    var p = d.split('/');
    if (p.length === 3) return p[2] + '-' + ('0' + p[1]).slice(-2);
    return '';
  }
  function brl(n) {
    return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function forcarMesVigente() {
    var el = document.getElementById('custoFilterMes');
    if (!el) return;
    var atual = mesAtual();
    if (el.type === 'month' && el.value !== atual) {
      el.value = atual;
      try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
  }

  function todosCustos() {
    var out = [];
    (window.db && db.obras || []).forEach(function (o) {
      (o.centrosCusto || []).forEach(function (c) {
        out.push({ data: c.data, valor: Number(c.valor) || 0, categoria: c.categoria || 'Despesa', empresa: c.empresa || '', origem: 'custo' });
      });
      (o.lancamentosProducao || []).forEach(function (l) {
        var v = (Number(l.valorProf) || 0) * ((l.profissionais || []).length || 1)
          + (Number(l.valorAjud) || 0) * ((l.ajudantes || []).length || 1);
        if (!v) v = (Number(l.instalacaoM2) || 0) * ((Number(l.taxaProf) || 0) + (Number(l.taxaAjud) || 0));
        out.push({ data: l.data || (l.mesAnoKey ? l.mesAnoKey + '-01' : ''), valor: v, categoria: 'Pagamento produção', empresa: l.empresa || '', origem: 'pgto' });
      });
    });
    return out;
  }

  function doMes(lista) {
    var m = mesAtual();
    return lista.filter(function (c) { return mesDe(c.data) === m; });
  }

  function pintarMes() {
    var lista = doMes(todosCustos());
    var cx = document.getElementById('p120Kpis');
    if (!cx) return;
    var total = 0, porCat = {};
    lista.forEach(function (c) {
      total += c.valor;
      porCat[c.categoria] = (porCat[c.categoria] || 0) + c.valor;
    });
    var top = Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; })[0] || '—';
    var nomeMes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    cx.innerHTML =
      '<div class="p120-kpi k1 largo"><span>Total do mês vigente (' + nomeMes + ')</span><b>' + brl(total) +
      '</b><i>' + lista.length + ' lançamentos neste mês</i></div>' +
      '<div class="p120-kpi k2"><span>Mês atual</span><b>' + brl(total) + '</b><i>' + mesAtual() + '</i></div>' +
      '<div class="p120-kpi k5"><span>Maior categoria no mês</span><b>' + top +
      '</b><i>' + (top !== '—' ? brl(porCat[top]) : '') + '</i></div>' +
      '<div class="p120-kpi k6"><span>Média por lançamento</span><b>' +
      brl(lista.length ? total / lista.length : 0) + '</b><i>' + lista.length + ' itens</i></div>';
  }

  function hookFiltro() {
    if (typeof window.getCustosFiltered === 'function' && !window.getCustosFiltered.__unico) {
      window.getCustosFiltered = function () {
        return doMes(todosCustos()).map(function (c) {
          return { data: c.data, valor: c.valor, categoria: c.categoria, empresa: c.empresa };
        });
      };
      window.getCustosFiltered.__unico = true;
    }
    if (typeof window.renderCustoDashboard === 'function' && !window.renderCustoDashboard.__unico) {
      var orig = window.renderCustoDashboard;
      window.renderCustoDashboard = function () {
        forcarMesVigente();
        var r = orig.apply(this, arguments);
        setTimeout(function () { matarFaixa(); pintarMes(); }, 40);
        return r;
      };
      window.renderCustoDashboard.__unico = true;
    }
  }

  function lerCache(k) {
    try {
      var o = JSON.parse(localStorage.getItem(k) || 'null');
      return o && o.dados ? o.dados : null;
    } catch (e) { return null; }
  }
  function gravarCache(k, dados) {
    try { localStorage.setItem(k, JSON.stringify({ em: Date.now(), dados: dados })); } catch (e) {}
  }
  async function carregarUF() {
    if (UF.length) return UF;
    var c = lerCache(K_UF);
    if (c && c.length) UF = c;
    try {
      var r = await fetch(IBGE + '/estados?orderBy=nome');
      var lista = await r.json();
      if (lista && lista.length) { UF = lista; gravarCache(K_UF, lista); }
    } catch (e) {}
    return UF;
  }
  async function municipios(sigla) {
    if (!sigla) return [];
    if (MUN[sigla]) return MUN[sigla];
    var c = lerCache(K_MUN + sigla);
    if (c && c.length) MUN[sigla] = c;
    try {
      var r = await fetch(IBGE + '/estados/' + sigla + '/municipios');
      var lista = (await r.json()).map(function (m) { return m.nome; });
      if (lista.length) { MUN[sigla] = lista; gravarCache(K_MUN + sigla, lista); }
    } catch (e) { if (!MUN[sigla]) MUN[sigla] = []; }
    return MUN[sigla] || [];
  }

  function montarLocal(alvo) {
    if (!alvo || alvo.getAttribute('data-loc') === '1') return;
    alvo.setAttribute('data-loc', '1');
    var wrap = document.createElement('div');
    wrap.className = 'loc-wrap';
    wrap.innerHTML = '<label>Estado<select class="loc-uf"><option value="">Todos</option></select></label>' +
      '<label>Cidade<input class="loc-cid" type="text" placeholder="Cidade" autocomplete="off"></label>';
    alvo.parentNode.insertBefore(wrap, alvo);
    alvo.style.display = 'none';
    var sel = wrap.querySelector('.loc-uf');
    var cid = wrap.querySelector('.loc-cid');
    carregarUF().then(function (ufs) {
      (ufs || []).forEach(function (u) {
        var o = document.createElement('option');
        o.value = u.sigla;
        o.textContent = u.sigla + ' — ' + u.nome;
        sel.appendChild(o);
      });
    });
    function sync() {
      alvo.value = [sel.value, cid.value].filter(Boolean).join(' / ');
      alvo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sel.onchange = function () { cid.value = ''; municipios(sel.value); sync(); };
    cid.oninput = async function () {
      var lista = await municipios(sel.value);
      var box = document.getElementById('locSugBox');
      if (!box) { box = document.createElement('div'); box.id = 'locSugBox'; box.className = 'loc-sug'; document.body.appendChild(box); }
      var q = cid.value.toLowerCase();
      var hits = lista.filter(function (n) { return n.toLowerCase().indexOf(q) >= 0; }).slice(0, 20);
      var r = cid.getBoundingClientRect();
      box.style.left = r.left + 'px';
      box.style.top = (r.bottom + 4) + 'px';
      box.style.display = hits.length ? 'block' : 'none';
      box.innerHTML = hits.map(function (n) { return '<button type="button">' + n + '</button>'; }).join('');
      box.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () { cid.value = b.textContent; box.style.display = 'none'; sync(); };
      });
      sync();
    };
  }

  function aplicarLocal() {
    ['custoFilterRegiao', 'custoInputRegiao', 'inputLancRegiao'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) montarLocal(el);
    });
  }

  function iniciar() {
    matarFaixa();
    forcarMesVigente();
    hookFiltro();
    pintarMes();
    aplicarLocal();
    setInterval(function () {
      matarFaixa();
      hookFiltro();
      aplicarLocal();
    }, 2000);
    console.log('[UI2026unico] tooltip + mês vigente + IBGE cache');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 400);
})();
