/**
 * 1) Menu: cada título vira gaveta, fonte 14px, sem ícone no título.
 * 2) Pagamento: UF + Cidade. Custo no centro por pessoa/empresa/obra/local.
 */
(function () {
  'use strict';
  if (window.__patchUi2026gavetaPgto) return;
  window.__patchUi2026gavetaPgto = true;

  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  if (!document.getElementById('gavetaPgtoCss')) {
    var css = document.createElement('style');
    css.id = 'gavetaPgtoCss';
    css.textContent = [
      '#selectObra{position:absolute!important;left:-9999px!important;width:1px!important;opacity:0!important}',
      '#orLista .or-grupo{font-size:14px!important;font-weight:700!important;letter-spacing:.4px!important;',
      'text-transform:uppercase;color:#93c5fd!important;cursor:pointer;padding:12px 8px 6px!important;',
      'display:flex;align-items:center;justify-content:space-between}',
      '#orLista .or-grupo .seta{font-size:11px;opacity:.75}',
      '#orLista .or-grupo.fechado + .or-bloco{display:none!important}',
      '#orObrasBox{margin:2px 0 8px}',
      '#orObrasTit{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;',
      'background:transparent;color:#93c5fd;font:700 14px/1.2 inherit;letter-spacing:.4px;',
      'text-transform:uppercase;padding:12px 8px 6px;cursor:pointer}',
      '#orObrasLista{padding:0 2px 6px}',
      '#orObrasBox.fechada #orObrasLista{display:none}',
      '.pgto-loc{display:flex;flex-direction:column;gap:4px;min-width:86px}',
      '.pgto-loc label{font-size:11px;font-weight:700;color:#64748b}',
      '#inputLancUf,#inputLancCidade{width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:.85rem;box-sizing:border-box;background:#fff}',
      '#inputLancUf{max-width:92px}',
      '#inputLancUf.uf-erro,#inputLancCidade.uf-erro{border-color:#dc2626!important}',
      '#locSugBox{display:none}#locSugBox.aberto{display:block;position:fixed;z-index:2147483646;background:#fff;color:#0f172a;border:1px solid #94a3b8;border-radius:8px;max-height:220px;overflow:auto}',
      '#locSugBox.aberto button{display:block;width:100%;text-align:left;border:0;background:#fff;padding:8px 10px}'
    ].join('');
    document.head.appendChild(css);
  }

  function obrasDoBanco() {
    var db = window.db;
    if (!db || !Array.isArray(db.obras)) return [];
    return db.obras.map(function (o) { return { id: o.id, nome: o.nome || o.id }; });
  }
  function obraAtualId() {
    var sel = document.getElementById('selectObra');
    if (sel && sel.value) return sel.value;
    return (window.db && window.db.obraAtualId) || '';
  }

  function montarObras() {
    var lista = document.getElementById('orLista');
    if (!lista) return;
    var box = document.getElementById('orObrasBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'orObrasBox';
      box.innerHTML = '<button type="button" id="orObrasTit"><span>Obras</span><span class="seta">▾</span></button><div id="orObrasLista"></div>';
    }
    if (lista.firstChild !== box) lista.insertBefore(box, lista.firstChild);
    var tit = document.getElementById('orObrasTit');
    if (tit && !tit.__liga) {
      tit.__liga = true;
      tit.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        box.classList.toggle('fechada');
        var s = tit.querySelector('.seta');
        if (s) s.textContent = box.classList.contains('fechada') ? '▸' : '▾';
      });
    }
    var ul = document.getElementById('orObrasLista');
    if (!ul) return;
    var atual = String(obraAtualId());
    var html = obrasDoBanco().map(function (o) {
      var on = String(o.id) === atual ? ' or-ativo' : '';
      return '<button type="button" class="or-item or-obra' + on + '" data-obra="' + String(o.id).replace(/"/g, '') + '">' +
        '<span class="or-txt">' + String(o.nome).replace(/</g, '') + '</span></button>';
    }).join('') || '<div class="or-grupo">Nenhuma obra</div>';
    if (ul.getAttribute('data-h') !== html) {
      ul.innerHTML = html;
      ul.setAttribute('data-h', html);
      ul.querySelectorAll('.or-obra').forEach(function (b) {
        b.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          var id = b.getAttribute('data-obra');
          var sel = document.getElementById('selectObra');
          if (sel) { sel.value = id; try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} }
          if (typeof window.trocarObra === 'function') { try { window.trocarObra(id); } catch (e2) {} }
        });
      });
    }
  }

  function acordeaoTitulos() {
    var lista = document.getElementById('orLista');
    if (!lista) return;
    var filhos = Array.prototype.slice.call(lista.children);
    filhos.forEach(function (n, i) {
      if (!n.classList || !n.classList.contains('or-grupo') || n.id === 'orObrasTit') return;
      if (!n.querySelector('.seta')) {
        var s = document.createElement('span');
        s.className = 'seta';
        s.textContent = '▾';
        n.appendChild(s);
      }
      if (!n.__acc) {
        n.__acc = true;
        n.addEventListener('click', function (ev) {
          ev.preventDefault();
          n.classList.toggle('fechado');
          var s = n.querySelector('.seta');
          if (s) s.textContent = n.classList.contains('fechado') ? '▸' : '▾';
          var nxt = n.nextElementSibling;
          var box = n.nextElementSibling && n.nextElementSibling.classList.contains('or-bloco')
            ? n.nextElementSibling : null;
          if (!box) {
            box = document.createElement('div');
            box.className = 'or-bloco';
            n.parentNode.insertBefore(box, n.nextSibling);
            var p = box.nextElementSibling;
            while (p && p.classList && p.classList.contains('or-item')) {
              var nx = p.nextElementSibling;
              box.appendChild(p);
              p = nx;
            }
          }
        });
      }
      if (!n.nextElementSibling || !n.nextElementSibling.classList.contains('or-bloco')) {
        var box = document.createElement('div');
        box.className = 'or-bloco';
        n.parentNode.insertBefore(box, n.nextSibling);
        var p = box.nextElementSibling;
        while (p && p.classList && (p.classList.contains('or-item') || p.classList.contains('or-esconde'))) {
          var nx = p.nextElementSibling;
          box.appendChild(p);
          p = nx;
        }
      }
    });
  }

  function normalizarUf(v) {
    var s = String(v || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (s.length >= 2) s = s.slice(0, 2);
    return UFS.indexOf(s) >= 0 ? s : '';
  }
  window.normalizarUf = normalizarUf;

  function camposPagamento() {
    var grid = document.querySelector('#tab-pagamento .lanc-form-grid, .lanc-form-grid');
    if (!grid || document.getElementById('inputLancUf')) return;
    var obra = document.getElementById('inputLancObra');
    var uf = document.createElement('div');
    uf.className = 'pgto-loc';
    uf.innerHTML = '<label>UF</label><select id="inputLancUf"><option value="">UF</option>' +
      UFS.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') + '</select>';
    var cid = document.createElement('div');
    cid.className = 'pgto-loc';
    cid.style.minWidth = '170px';
    cid.innerHTML = '<label>Cidade</label><input id="inputLancCidade" placeholder="Ex: João Pessoa" autocomplete="off">';
    if (obra && obra.parentNode) {
      obra.parentNode.insertAdjacentElement('afterend', cid);
      obra.parentNode.insertAdjacentElement('afterend', uf);
    } else {
      grid.appendChild(uf);
      grid.appendChild(cid);
    }
    var inp = document.getElementById('inputLancCidade');
    var sel = document.getElementById('inputLancUf');
    if (inp && !inp.__ibge) {
      inp.__ibge = true;
      inp.addEventListener('input', function () { sugerir(inp, sel); });
    }
  }

  function fecharSug() {
    var b = document.getElementById('locSugBox');
    if (b) { b.className = ''; b.innerHTML = ''; }
  }
  async function sugerir(inp, sel) {
    var uf = normalizarUf(sel && sel.value);
    if (!uf) { fecharSug(); return; }
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
    var box = document.getElementById('locSugBox') || document.body.appendChild(document.createElement('div'));
    box.id = 'locSugBox';
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

  function pessoaPorId(id) {
    var out = { id: id, nome: String(id), empresa: '' };
    function ver(c) {
      if (c && String(c.id) === String(id)) {
        out.nome = c.nome || out.nome;
        out.empresa = c.empresa || out.empresa;
      }
    }
    try {
      (window.db && window.db.obras || []).forEach(function (o) {
        (o.colaboradores || []).forEach(ver);
        (o.colaboradoresPgto || []).forEach(ver);
      });
      if (typeof window.getColaboradoresAll === 'function') (window.getColaboradoresAll() || []).forEach(ver);
    } catch (e) {}
    return out;
  }

  function gerarCustos(obra, lanc, loc) {
    if (!obra.centrosCusto) obra.centrosCusto = [];
    obra.centrosCusto = obra.centrosCusto.filter(function (c) { return c.lancamentoPgtoId !== lanc.id; });
    var itens = [];
    (lanc.profissionais || []).forEach(function (id) {
      itens.push({ p: pessoaPorId(id), papel: 'Profissional', valor: Number(lanc.valorProf) || 0 });
    });
    (lanc.ajudantes || []).forEach(function (id) {
      itens.push({ p: pessoaPorId(id), papel: 'Ajudante', valor: Number(lanc.valorAjud) || 0 });
    });
    itens.forEach(function (it) {
      if (!(it.valor > 0)) return;
      obra.centrosCusto.push({
        id: 'pgto-' + lanc.id + '-' + it.p.id,
        lancamentoPgtoId: lanc.id,
        data: lanc.data,
        valor: Math.round(it.valor * 100) / 100,
        categoria: 'Pagamento produção',
        descricao: (lanc.material || 'Pagamento') + ' — ' + it.papel + ' — ' + it.p.nome,
        colaborador: it.p.nome,
        empresa: String(it.p.empresa || '').toUpperCase(),
        obraId: obra.id,
        obraNome: obra.nome,
        regiao: loc.rotulo,
        estado: loc.uf,
        cidade: loc.cidade
      });
    });
  }

  function hookSalvar() {
    if (typeof window.salvarLancamentoPgto !== 'function' || window.salvarLancamentoPgto.__gp) return;
    var orig = window.salvarLancamentoPgto;
    window.salvarLancamentoPgto = function () {
      var uf = normalizarUf((document.getElementById('inputLancUf') || {}).value);
      var cid = String((document.getElementById('inputLancCidade') || {}).value || '').trim();
      var ufEl = document.getElementById('inputLancUf');
      var cidEl = document.getElementById('inputLancCidade');
      if (ufEl) ufEl.classList.toggle('uf-erro', !uf);
      if (cidEl) cidEl.classList.toggle('uf-erro', !cid);
      if (!uf) { alert('Escolha a UF (ex.: PB).'); return; }
      if (!cid) { alert('Informe a cidade.'); return; }
      orig.apply(this, arguments);
      setTimeout(function () {
        var loc = { uf: uf, cidade: cid, rotulo: cid + ' - ' + uf };
        (window.db && window.db.obras || []).forEach(function (o) {
          var arr = o.lancamentosProducao || [];
          if (!arr.length) return;
          var last = arr[arr.length - 1];
          last.estado = uf; last.cidade = cid; last.regiao = loc.rotulo;
          gerarCustos(o, last, loc);
        });
        if (typeof window.salvarDB === 'function') window.salvarDB();
        if (typeof window.renderCustoDashboard === 'function') {
          try { window.renderCustoDashboard(); } catch (e) {}
        }
      }, 40);
    };
    window.salvarLancamentoPgto.__gp = true;
  }

  function tick() {
    montarObras();
    acordeaoTitulos();
    camposPagamento();
    hookSalvar();
  }
  setTimeout(tick, 500);
  setInterval(tick, 1000);
  console.log('[UI2026gavetaPgto] gavetas 14px + pagamento UF/cidade/custo');
})();
