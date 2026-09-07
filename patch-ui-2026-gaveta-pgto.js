/**
 * Gavetas + pagamento UF/cidade/custo — versão leve (sem loop pesado).
 */
(function () {
  'use strict';
  if (window.__patchUi2026gavetaPgto3) return;
  window.__patchUi2026gavetaPgto3 = true;

  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  var s = document.getElementById('gavetaPgtoCss') || document.createElement('style');
  s.id = 'gavetaPgtoCss';
  s.textContent = [
    '#selectObra{position:absolute!important;left:-9999px!important;width:1px!important;opacity:0!important}',
    '#p120Dica{display:none!important}',
    '#orMenu .or-painel,#orLista{scrollbar-width:thin;scrollbar-color:#334155 transparent}',
    '#orLista .or-grupo,#orObrasTit{font-size:14px!important;font-weight:700!important;letter-spacing:.3px!important;',
    'text-transform:uppercase;color:#93c5fd!important;cursor:pointer;padding:14px 10px 8px!important;',
    'display:flex;align-items:center;justify-content:space-between;border:0;background:transparent;width:100%}',
    '#orLista .or-grupo .seta,#orObrasTit .seta{font-size:11px;opacity:.7}',
    '#orLista .or-grupo.fechado + .or-bloco,#orObrasBox.fechada #orObrasLista{display:none!important}',
    '#orLista .or-item{border-radius:10px!important;margin:2px 4px!important}',
    '#orLista .or-item.or-ativo{background:rgba(96,165,250,.22)!important}',
    '#tab-pagamento .lanc-form-grid{display:grid!important;grid-template-columns:repeat(4,minmax(140px,1fr))!important;gap:10px 12px!important;align-items:end}',
    '#tab-pagamento .lanc-form-grid #inputLancProfissionais,#tab-pagamento .lanc-form-grid #inputLancAjudantes{min-height:92px;width:100%}',
    '#tab-pagamento .card,#tab-custo.card{border-radius:16px}',
    '#tab-pagamento .btn-add{border-radius:10px;font-weight:700}',
    '.pgto-loc{display:flex;flex-direction:column;gap:4px;min-width:86px}',
    '.pgto-loc label{font-size:11px;font-weight:700;color:#64748b}',
    '#inputLancUf,#inputLancCidade{width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:.85rem;box-sizing:border-box;background:#fff}',
    '#inputLancUf{max-width:92px}',
    '#inputLancUf.uf-erro,#inputLancCidade.uf-erro{border-color:#dc2626!important}',
    '#locSugBox{display:none}#locSugBox.aberto{display:block;position:fixed;z-index:2147483646;background:#fff;color:#0f172a;border:1px solid #94a3b8;border-radius:8px;max-height:220px;overflow:auto}',
    '#locSugBox.aberto button{display:block;width:100%;text-align:left;border:0;background:#fff;padding:8px 10px}',
    '.p120-kpi{border-radius:14px}',
    '#custoFilterEstado,#custoFilterCidade,#custoUfVisivel,#custoCidVisivel,.loc-cel{display:none!important}',
    '#custoUfVisivel,#custoCidVisivel{display:none!important}',
    '#tab-custo #custoUfVisivel, #tab-custo #custoCidVisivel{display:none!important}',
    '#p137Faixa{display:none!important}'
  ].join('');
  if (!s.parentNode) document.head.appendChild(s);

  function normalizarUf(v) {
    var t = String(v || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (t.length >= 2) t = t.slice(0, 2);
    return UFS.indexOf(t) >= 0 ? t : '';
  }

  function chaveObras() {
    try {
      return (window.db && window.db.obras || []).map(function (o) { return o.id + ':' + o.nome; }).join('|');
    } catch (e) { return ''; }
  }

  var ultimaObras = '';
  function montarObras() {
    var lista = document.getElementById('orLista');
    if (!lista) return;
    var box = document.getElementById('orObrasBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'orObrasBox';
      box.innerHTML = '<button type="button" id="orObrasTit"><span>Obras</span><span class="seta">▾</span></button><div id="orObrasLista"></div>';
      lista.insertBefore(box, lista.firstChild);
      document.getElementById('orObrasTit').addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        box.classList.toggle('fechada');
        var s = this.querySelector('.seta');
        if (s) s.textContent = box.classList.contains('fechada') ? '▸' : '▾';
      });
    } else if (lista.firstChild !== box) {
      lista.insertBefore(box, lista.firstChild);
    }
    var chave = chaveObras() + '#' + ((window.db && window.db.obraAtualId) || '');
    if (chave === ultimaObras) return;
    ultimaObras = chave;
    var ul = document.getElementById('orObrasLista');
    if (!ul) return;
    var atual = String((document.getElementById('selectObra') || {}).value || (window.db && window.db.obraAtualId) || '');
    ul.innerHTML = (window.db && window.db.obras || []).map(function (o) {
      var on = String(o.id) === atual ? ' or-ativo' : '';
      return '<button type="button" class="or-item or-obra' + on + '" data-obra="' + String(o.id).replace(/"/g, '') + '"><span class="or-txt">' + String(o.nome || o.id).replace(/</g, '') + '</span></button>';
    }).join('');
    ul.querySelectorAll('.or-obra').forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault();
        var id = b.getAttribute('data-obra');
        var sel = document.getElementById('selectObra');
        if (sel) { sel.value = id; try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} }
        if (typeof window.trocarObra === 'function') { try { window.trocarObra(id); } catch (e2) {} }
        ultimaObras = '';
      };
    });
  }

  function acordeao() {
    var lista = document.getElementById('orLista');
    if (!lista) return;
    Array.prototype.forEach.call(lista.children, function (n) {
      if (!n.classList || !n.classList.contains('or-grupo')) return;
      if (!n.querySelector('.seta')) {
        var s = document.createElement('span');
        s.className = 'seta';
        s.textContent = '▾';
        n.appendChild(s);
      }
      if (!n.nextElementSibling || !n.nextElementSibling.classList.contains('or-bloco')) {
        var box = document.createElement('div');
        box.className = 'or-bloco';
        n.parentNode.insertBefore(box, n.nextSibling);
        var p = box.nextElementSibling;
        while (p && p.classList && p.classList.contains('or-item')) {
          var nx = p.nextElementSibling;
          box.appendChild(p);
          p = nx;
        }
      }
      if (!n.__acc) {
        n.__acc = true;
        n.addEventListener('click', function (ev) {
          ev.preventDefault();
          n.classList.toggle('fechado');
          var s = n.querySelector('.seta');
          if (s) s.textContent = n.classList.contains('fechado') ? '▸' : '▾';
        });
      }
    });
  }

  function camposPagamento() {
    var obra = document.getElementById('inputLancObra');
    if (!obra) return;
    var ufEl = document.getElementById('inputLancUf');
    var noForm = ufEl && obra.parentNode && obra.parentNode.parentNode &&
      obra.parentNode.parentNode.contains(ufEl);
    if (noForm) return;
    if (ufEl && ufEl.parentNode) ufEl.parentNode.remove();
    var cidOld = document.getElementById('inputLancCidade');
    if (cidOld && cidOld.parentNode && cidOld.id === 'inputLancCidade') {
      if (cidOld.closest && !cidOld.closest('.lanc-form-grid')) cidOld.parentNode.remove();
    }
    var uf = document.createElement('div');
    uf.className = 'pgto-loc';
    uf.innerHTML = '<label>UF</label><select id="inputLancUf"><option value="">UF</option>' +
      UFS.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') + '</select>';
    var cid = document.createElement('div');
    cid.className = 'pgto-loc';
    cid.style.minWidth = '170px';
    cid.innerHTML = '<label>Cidade</label><input id="inputLancCidade" placeholder="Ex: João Pessoa" autocomplete="off">';
    obra.parentNode.insertAdjacentElement('afterend', cid);
    obra.parentNode.insertAdjacentElement('afterend', uf);
    organizarFormPgto();
  }
  function organizarFormPgto() {
    var grid = document.querySelector('#tab-pagamento .lanc-form-grid');
    if (!grid) return;
    function box(id) {
      var el = document.getElementById(id);
      if (!el) return null;
      var p = el.parentNode;
      while (p && p !== grid && p.parentNode !== grid) p = p.parentNode;
      return (p && p.parentNode === grid) ? p : el.parentNode;
    }
    ['inputLancObra','inputLancUf','inputLancCidade','inputLancMaterial',
     'inputLancInstalacaoM2','inputLancTaxaProf','inputLancTaxaAjud',
     'inputLancProfissionais','inputLancAjudantes'].forEach(function (id) {
      var b = box(id);
      if (b && b.parentNode === grid) grid.appendChild(b);
    });
  }
  window.camposPagamento = camposPagamento;
  if (typeof window.renderPagamento === 'function' && !window.renderPagamento.__uf) {
    var rp = window.renderPagamento;
    window.renderPagamento = function () {
      var r = rp.apply(this, arguments);
      setTimeout(camposPagamento, 0);
      return r;
    };
    window.renderPagamento.__uf = true;
  }

  function pessoa(id) {
    var out = { id: id, nome: String(id), empresa: '' };
    function ver(c) {
      if (c && String(c.id) === String(id)) { out.nome = c.nome || out.nome; out.empresa = c.empresa || out.empresa; }
    }
    try {
      (window.db && window.db.obras || []).forEach(function (o) {
        (o.colaboradores || []).forEach(ver);
        (o.colaboradoresPgto || []).forEach(ver);
      });
    } catch (e) {}
    return out;
  }

  function hookSalvar() {
    if (typeof window.salvarLancamentoPgto !== 'function' || window.salvarLancamentoPgto.__lite) return;
    var orig = window.salvarLancamentoPgto;
    window.salvarLancamentoPgto = function () {
      var uf = normalizarUf((document.getElementById('inputLancUf') || {}).value);
      var cid = String((document.getElementById('inputLancCidade') || {}).value || '').trim();
      if (!uf) { alert('Escolha a UF (ex.: PB).'); return; }
      if (!cid) { alert('Informe a cidade.'); return; }
      orig.apply(this, arguments);
      setTimeout(function () {
        var loc = cid + ' - ' + uf;
        (window.db && window.db.obras || []).forEach(function (o) {
          var arr = o.lancamentosProducao || [];
          if (!arr.length) return;
          var last = arr[arr.length - 1];
          last.estado = uf; last.cidade = cid; last.regiao = loc;
          if (!o.centrosCusto) o.centrosCusto = [];
          o.centrosCusto = o.centrosCusto.filter(function (c) { return c.lancamentoPgtoId !== last.id; });
          (last.profissionais || []).forEach(function (id) {
            var p = pessoa(id);
            o.centrosCusto.push({ id: 'pgto-' + last.id + '-' + id, lancamentoPgtoId: last.id, data: last.data, valor: Number(last.valorProf) || 0, categoria: 'Pagamento produção', descricao: (last.material || 'Pagamento') + ' — ' + p.nome, colaborador: p.nome, empresa: String(p.empresa || '').toUpperCase(), obraId: o.id, obraNome: o.nome, regiao: loc, estado: uf, cidade: cid });
          });
          (last.ajudantes || []).forEach(function (id) {
            var p = pessoa(id);
            o.centrosCusto.push({ id: 'pgto-' + last.id + '-' + id, lancamentoPgtoId: last.id, data: last.data, valor: Number(last.valorAjud) || 0, categoria: 'Pagamento produção', descricao: (last.material || 'Pagamento') + ' — ' + p.nome, colaborador: p.nome, empresa: String(p.empresa || '').toUpperCase(), obraId: o.id, obraNome: o.nome, regiao: loc, estado: uf, cidade: cid });
          });
        });
        if (typeof window.salvarDB === 'function') window.salvarDB();
      }, 50);
    };
    window.salvarLancamentoPgto.__lite = true;
  }

  function arrumarMenu() {
    document.querySelectorAll('#orLista .or-item, #orLista button').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/gest[aã]o de obra e equipe/i.test(t) && !/obras e equipes/i.test(t)) {
        el.style.setProperty('display', 'none', 'important');
      }
      if (/obraflow|plano mestre/i.test(t)) {
        var src = el.querySelector('.or-txt') || el;
        if (!/Gestão de Obras e Equipes/i.test(src.textContent || '')) {
          src.textContent = 'Gestão de Obras e Equipes';
        }
      }
    });
  }

  function consertarFiltroEstado() {
    var el = document.getElementById('custoFilterRegiao');
    if (!el) return;
    if (el.tagName === 'SELECT' && el.getAttribute('data-uf') === '1') return;
    var atual = normalizarUf(el.value);
    var sel = document.createElement('select');
    sel.id = 'custoFilterRegiao';
    sel.setAttribute('data-uf', '1');
    sel.style.cssText = 'width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;background:#fff';
    sel.innerHTML = '<option value="">Todos</option>' + UFS.map(function (u) {
      return '<option value="' + u + '">' + u + '</option>';
    }).join('');
    if (atual) sel.value = atual;
    sel.onchange = function () {
      if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard();
    };
    el.parentNode.replaceChild(sel, el);
    var lab = sel.parentNode && sel.parentNode.querySelector('label');
    if (lab) lab.textContent = 'ESTADO';
  }

  function coletarCustos() {
    var db = window.db;
    if (!db || !Array.isArray(db.obras)) return [];
    function val(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '') : '';
    }
    var obraId = val('custoFilterObra');
    var mes = val('custoFilterMes');
    if (mes && !/^\d{4}-\d{2}$/.test(mes)) mes = '';
    var empresa = val('custoFilterEmpresa').toUpperCase();
    var uf = normalizarUf(val('custoFilterRegiao'));
    var lista = [];
    db.obras.forEach(function (o) {
      (o.centrosCusto || []).forEach(function (c) {
        var item = Object.assign({ obraId: o.id, obraNome: o.nome }, c);
        item.valor = Number(item.valor) || 0;
        lista.push(item);
      });
    });
    return lista.filter(function (c) {
      if (obraId && String(c.obraId) !== String(obraId) && String(c.obraId || '') !== String(obraId)) return false;
      if (mes && String(c.data || '').substring(0, 7) !== mes) return false;
      if (empresa && String(c.empresa || '').toUpperCase() !== empresa) return false;
      if (uf) {
        var r = String(c.regiao || c.estado || '').toUpperCase();
        if (r.indexOf(uf) < 0) return false;
      }
      return true;
    });
  }
  window.getCustosFiltered = coletarCustos;
  try { getCustosFiltered = coletarCustos; } catch (e) {}

  function pintarCustos() {
    try {
      if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard();
    } catch (e) {}
  }

  function tick() {
    montarObras();
    acordeao();
    camposPagamento();
    hookSalvar();
    arrumarMenu();
    consertarFiltroEstado();
    document.querySelectorAll('#tab-custo label').forEach(function (lab) {
      var t = (lab.textContent || '').replace(/\s+/g, ' ').trim();
      var box = lab.parentNode;
      if (!box) return;
      if (/^cidade$/i.test(t)) box.style.setProperty('display', 'none', 'important');
      if (/^estado$/i.test(t) && !box.querySelector('#custoFilterRegiao')) {
        box.style.setProperty('display', 'none', 'important');
      }
    });
    ['custoFilterEstado', 'custoFilterCidade', 'custoUfVisivel', 'custoCidVisivel'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var box = el.closest ? (el.closest('div') || el) : el;
      box.style.setProperty('display', 'none', 'important');
    });
    window.getCustosFiltered = coletarCustos;
    try { getCustosFiltered = coletarCustos; } catch (e) {}
    pintarGraficosCusto();
  }

  var CORES = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];
  function brl(n) {
    return 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function svgRosca(partes) {
    var total = 0;
    partes.forEach(function (p) { total += p.valor; });
    if (!(total > 0)) {
      return '<div style="padding:20px;color:#64748b">Sem valores para o filtro.</div>';
    }
    var r = 38, circ = 2 * Math.PI * r, acc = 0, rings = '';
    partes.forEach(function (p, i) {
      var dash = (p.valor / total) * circ;
      rings += '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + (p.cor || CORES[i % CORES.length]) +
        '" stroke-width="14" stroke-dasharray="' + dash.toFixed(2) + ' ' + (circ - dash).toFixed(2) +
        '" stroke-dashoffset="' + (-acc).toFixed(2) + '" transform="rotate(-90 50 50)"></circle>';
      acc += dash;
    });
    return '<svg viewBox="0 0 100 100" width="200" height="200">' + rings +
      '<text x="50" y="48" text-anchor="middle" font-size="8" fill="#64748b">Total</text>' +
      '<text x="50" y="58" text-anchor="middle" font-size="7" font-weight="700" fill="#0f172a">' +
      brl(total).replace('R$ ','') + '</text></svg>';
  }
  function barras(partes) {
    var max = 1, tot = 0;
    partes.forEach(function (p) { if (p.valor > max) max = p.valor; tot += p.valor; });
    return partes.map(function (p, i) {
      var w = Math.max(2, (p.valor / max) * 100);
      var pc = tot ? (p.valor / tot) * 100 : 0;
      var tip = p.nome + ' — ' + brl(p.valor) + ' (' + pc.toFixed(1) + '%)';
      return '<div class="custo-bar-linha" data-tip="' + tip.replace(/"/g, '') + '" style="margin:0 0 10px;cursor:default">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">' +
        '<span>' + p.nome + '</span><span>' + brl(p.valor) + ' · ' + pc.toFixed(1) + '%</span></div>' +
        '<div style="height:10px;background:#e8eef5;border-radius:8px;overflow:hidden">' +
        '<div style="height:100%;width:' + w + '%;background:' + (p.cor || CORES[i % CORES.length]) + '"></div></div></div>';
    }).join('') || '<p style="color:#64748b">Sem dados neste filtro.</p>';
  }
  function agrupar(lista, chave) {
    var mapa = {};
    lista.forEach(function (c) {
      var k = String(c[chave] || '').trim() || (chave === 'empresa' ? 'SEM EMPRESA' : 'Sem colaborador');
      if (chave === 'empresa') k = k.toUpperCase();
      if (!mapa[k]) mapa[k] = 0;
      mapa[k] += Number(c.valor) || 0;
    });
    return Object.keys(mapa).map(function (n, i) {
      return { nome: n, valor: mapa[n], cor: CORES[i % CORES.length] };
    }).sort(function (a, b) { return b.valor - a.valor; });
  }
  function blocoRosca(titulo, partes) {
    return '<div style="display:grid;grid-template-columns:240px 1fr;gap:18px;align-items:start;background:var(--card-bg,#fff);border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-top:10px">' +
      '<div style="text-align:center">' + svgRosca(partes) +
      '<div style="font-size:12px;color:#64748b;margin-top:8px">' + titulo + '</div></div>' +
      '<div>' + barras(partes) + '</div></div>';
  }
  function pintarGraficosCusto() {
    var lista = coletarCustos();
    var emp = document.getElementById('containerCustoPorEmpresa');
    if (emp) emp.innerHTML = blocoRosca('Por empresa', agrupar(lista, 'empresa'));
    var col = document.getElementById('containerCustoPorColaborador');
    if (col) col.innerHTML = blocoRosca('Por colaborador', agrupar(lista, 'colaborador'));
    var reg = document.getElementById('containerCustoPorRegiao');
    if (reg) {
      var partesR = agrupar(lista.map(function (c) {
        return Object.assign({}, c, { _r: c.regiao || c.cidade || c.estado || 'Sem região' });
      }), '_r');
      if (!partesR.length) partesR = agrupar(lista, 'regiao');
      partesR.forEach(function (p) { if (p.nome === '_r') p.nome = 'Sem região'; });
      reg.innerHTML = blocoRosca('Por região', partesR.length ? partesR : agrupar(lista.map(function (c) {
        c.regiao = c.regiao || [c.cidade, c.estado].filter(Boolean).join(' - ') || 'Sem região';
        return c;
      }), 'regiao'));
    }
    var obr = document.getElementById('containerCustoResumoObra');
    if (obr) {
      var extra = obr.querySelector('#roscaObra') || document.createElement('div');
      extra.id = 'roscaObra';
      extra.innerHTML = blocoRosca('Por obra', agrupar(lista, 'obraNome'));
      if (!extra.parentNode) obr.appendChild(extra);
    }
  }
  if (!document.getElementById('custoHoverTip')) {
    var tip = document.createElement('div');
    tip.id = 'custoHoverTip';
    tip.style.cssText = 'display:none;position:fixed;z-index:2147483000;background:#0f172a;color:#fff;font-size:12px;padding:6px 10px;border-radius:8px;pointer-events:none';
    document.body.appendChild(tip);
    document.addEventListener('mousemove', function (ev) {
      var lin = ev.target.closest && ev.target.closest('.custo-bar-linha');
      if (!lin) { tip.style.display = 'none'; return; }
      tip.textContent = lin.getAttribute('data-tip') || '';
      tip.style.display = 'block';
      tip.style.left = (ev.clientX + 12) + 'px';
      tip.style.top = (ev.clientY + 12) + 'px';
    });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('.custo-sub-btn') : null;
    if (!b) return;
    setTimeout(function () {
      var cxp = document.getElementById('custoSubPainel-p86bcxp');
      if (cxp && b.id !== 'custoSubBtn-p86bcxp') cxp.style.display = 'none';
      var p120 = document.getElementById('p120Area');
      if (p120) p120.style.display = (b.id === 'custoSubBtn-geral') ? '' : 'none';
      pintarGraficosCusto();
    }, 50);
  }, true);
  setTimeout(tick, 800);
  setTimeout(function () {
    window.getCustosFiltered = coletarCustos;
    pintarCustos();
  }, 1500);
  setInterval(function () {
    if (document.hidden) return;
    tick();
  }, 10000);
  console.log('[UI2026gavetaLite] menu e pagamento sem loop pesado');
})();
