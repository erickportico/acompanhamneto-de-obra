/**
 * Gavetas + pagamento UF/cidade/custo — versão leve (sem loop pesado).
 */
(function () {
  'use strict';
  if (window.__patchUi2026gavetaPgtoLite) return;
  window.__patchUi2026gavetaPgtoLite = true;

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
    '#tab-pagamento .lanc-form-grid{align-items:end}',
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
    '#p137Faixa{border-radius:12px}',
    '#custoUfVisivel,#custoCidVisivel,.loc-cel{display:none!important}'
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
    if (document.getElementById('inputLancUf')) return;
    var grid = document.querySelector('.lanc-form-grid');
    if (!grid) return;
    var obra = document.getElementById('inputLancObra');
    var uf = document.createElement('div');
    uf.className = 'pgto-loc';
    uf.innerHTML = '<label>UF</label><select id="inputLancUf"><option value="">UF</option>' + UFS.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') + '</select>';
    var cid = document.createElement('div');
    cid.className = 'pgto-loc';
    cid.style.minWidth = '170px';
    cid.innerHTML = '<label>Cidade</label><input id="inputLancCidade" placeholder="Ex: João Pessoa" autocomplete="off">';
    if (obra && obra.parentNode) {
      obra.parentNode.insertAdjacentElement('afterend', cid);
      obra.parentNode.insertAdjacentElement('afterend', uf);
    } else {
      grid.appendChild(uf); grid.appendChild(cid);
    }
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

  function coletarCustos() {
    var db = window.db;
    if (!db || !Array.isArray(db.obras)) return [];
    function val(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '') : '';
    }
    var obraId = val('custoFilterObra');
    var mes = val('custoFilterMes');
    var empresa = val('custoFilterEmpresa').toUpperCase();
    var uf = val('custoFilterEstado') || val('custoFilterRegiao');
    var lista = [];
    db.obras.forEach(function (o) {
      (o.centrosCusto || []).forEach(function (c) {
        lista.push(Object.assign({ obraId: o.id, obraNome: o.nome }, c));
      });
    });
    return lista.filter(function (c) {
      if (obraId && String(c.obraId) !== String(obraId)) return false;
      if (mes && String(c.data || '').substring(0, 7) !== mes) return false;
      if (empresa && String(c.empresa || '').toUpperCase() !== empresa) return false;
      if (uf) {
        var r = String(c.regiao || c.estado || '').toUpperCase();
        if (r.indexOf(String(uf).toUpperCase().slice(0, 2)) < 0 && r.indexOf(String(uf).toUpperCase()) < 0) return false;
      }
      return true;
    });
  }
  window.getCustosFiltered = coletarCustos;
  try { getCustosFiltered = coletarCustos; } catch (e) {}

  function tick() {
    montarObras();
    acordeao();
    camposPagamento();
    hookSalvar();
    arrumarMenu();
    window.getCustosFiltered = coletarCustos;
  }
  setTimeout(tick, 800);
  setInterval(tick, 4000);
  console.log('[UI2026gavetaLite] menu e pagamento sem loop pesado');
})();
