/**
 * PATCH UI 2026 COMPLETO v2
 * <script src="/admin-painel.js"></script>
 * <script src="/patch-ui-2026-completo.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026completo2) return;
  window.__patchUi2026completo2 = true;

  var K_SESS = 'painel_seg_sessao_v1';
  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  var UF_NOME = {AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapa',BA:'Bahia',CE:'Ceara',DF:'Distrito Federal',ES:'Espirito Santo',GO:'Goias',MA:'Maranhao',MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',PA:'Para',PB:'Paraiba',PE:'Pernambuco',PI:'Piaui',PR:'Parana',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RO:'Rondonia',RR:'Roraima',RS:'Rio Grande do Sul',SC:'Santa Catarina',SE:'Sergipe',SP:'Sao Paulo',TO:'Tocantins'};

  var css = document.createElement('style');
  css.textContent = [
    '#locSugBox{display:none}',
    '#locSugBox.aberto{display:block;position:fixed;z-index:2147483646;background:#fff;color:#0f172a;border:1px solid #94a3b8;border-radius:8px;max-height:220px;overflow:auto}',
    '#locSugBox.aberto button{display:block;width:100%;text-align:left;border:0;background:#fff;color:#0f172a;padding:8px 10px}',
    '#locSugBox.aberto button:hover{background:#e2e8f0}',
    '.pgto-x{width:26px;height:26px;border:0;border-radius:7px;background:#fecaca;color:#7f1d1d;cursor:pointer;font-size:15px;margin-left:4px}',
    '.loc-cel{display:flex;flex-direction:column;gap:4px;min-width:150px}',
    '.loc-cel label{font-size:11px;color:#64748b;font-weight:700}',
    '.loc-uf,.loc-cid{padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box}'
  ].join('');
  document.head.appendChild(css);

  function lerSess() {
    try {
      var a = localStorage.getItem(K_SESS) || sessionStorage.getItem(K_SESS);
      return a ? JSON.parse(a) : null;
    } catch (e) { return null; }
  }
  function gravarSess(s) {
    if (!s) return;
    s.exp = Date.now() + 30 * 86400000;
    var raw = JSON.stringify(s);
    try { localStorage.setItem(K_SESS, raw); } catch (e) {}
    try { sessionStorage.setItem(K_SESS, raw); } catch (e2) {}
  }
  function temSessao() {
    var s = lerSess();
    if (s && s.exp && Date.now() > s.exp) return false;
    return !!(s && (s.usuario || s.email || s.nome || s.authId));
  }
  function fecharLogin() {
    ['p86bLogin', 'ps79Login'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }
  var s0 = lerSess();
  if (s0) gravarSess(s0);
  function vigiaLogin() { if (temSessao()) fecharLogin(); }
  vigiaLogin();
  [800, 2600, 4000].forEach(function (ms) { setTimeout(vigiaLogin, ms); });
  try {
    if (window._supabase && _supabase.auth) {
      _supabase.auth.getSession().then(function (r) {
        var u = r && r.data && r.data.session && r.data.session.user;
        if (!u) return;
        var s = lerSess() || {};
        s.email = u.email;
        s.usuario = s.usuario || u.email;
        s.authId = s.authId || u.id;
        gravarSess(s);
        fecharLogin();
      }).catch(function () {});
    }
  } catch (e) {}
  function startObs() {
    new MutationObserver(function () {
      if (temSessao() && document.getElementById('p86bLogin')) fecharLogin();
    }).observe(document.body, { childList: true });
  }
  if (document.body) startObs();
  else document.addEventListener('DOMContentLoaded', startObs);

  function optsUf() {
    var h = '<option value="">Todos</option>';
    UFS.forEach(function (u) { h += '<option value="' + u + ' — ' + UF_NOME[u] + '">' + u + ' — ' + UF_NOME[u] + '</option>'; });
    return h;
  }
  function fecharSug() {
    var b = document.getElementById('locSugBox');
    if (!b) return;
    b.className = ''; b.innerHTML = ''; b.style.display = 'none';
  }
  function ligarCid(inp, sel) {
    if (!inp || inp.__loc) return;
    inp.__loc = true;
    inp.addEventListener('input', function () { sugerir(inp, sel); });
    inp.addEventListener('blur', function () { setTimeout(fecharSug, 180); });
  }
  async function sugerir(inp, sel) {
    var uf = String((sel && sel.value) || '').match(/[A-Z]{2}/);
    uf = uf ? uf[0] : '';
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
    if (ev.target.closest && (ev.target.closest('#locSugBox') || (ev.target.classList && ev.target.classList.contains('loc-cid')))) return;
    fecharSug();
  }, true);

  function camposPagamento() {
    if (document.getElementById('inputLancUf')) return;
    var obra = document.getElementById('inputLancObra');
    if (!obra || !obra.parentNode) return;
    var celUf = document.createElement('div');
    celUf.className = 'loc-cel';
    celUf.innerHTML = '<label>Estado</label><select class="loc-uf" id="inputLancUf">' + optsUf() + '</select>';
    var celCid = document.createElement('div');
    celCid.className = 'loc-cel';
    celCid.innerHTML = '<label>Cidade</label><input class="loc-cid" id="inputLancCidade" placeholder="Cidade" autocomplete="off">';
    obra.parentNode.insertAdjacentElement('afterend', celCid);
    obra.parentNode.insertAdjacentElement('afterend', celUf);
    ligarCid(document.getElementById('inputLancCidade'), document.getElementById('inputLancUf'));
  }

  function camposCusto() {
    var orig = document.getElementById('custoFilterRegiao');
    if (!orig || document.getElementById('custoUfVisivel')) return;
    var cel = document.createElement('div');
    cel.className = 'loc-cel';
    cel.innerHTML = '<label>Estado</label><select class="loc-uf" id="custoUfVisivel">' + optsUf() + '</select>' +
      '<label>Cidade</label><input class="loc-cid" id="custoCidVisivel" placeholder="Cidade" autocomplete="off">';
    orig.parentNode.appendChild(cel);
    orig.style.display = 'none';
    var sel = document.getElementById('custoUfVisivel');
    var cid = document.getElementById('custoCidVisivel');
    function sync() {
      var uf = (sel.value.match(/[A-Z]{2}/) || [''])[0];
      orig.value = [uf, cid.value].filter(Boolean).join(' ');
      if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard();
    }
    sel.onchange = sync;
    cid.addEventListener('change', sync);
    ligarCid(cid, sel);
  }

  function hookSalvar() {
    if (typeof window.salvarLancamentoPgto !== 'function' || window.salvarLancamentoPgto.__loc) return;
    var orig = window.salvarLancamentoPgto;
    window.salvarLancamentoPgto = function () {
      orig.apply(this, arguments);
      try {
        var uf = (document.getElementById('inputLancUf') || {}).value || '';
        var cid = (document.getElementById('inputLancCidade') || {}).value || '';
        if (!window.db || !uf && !cid) return;
        window.db.obras.forEach(function (o) {
          var arr = o.lancamentosProducao || [];
          if (!arr.length) return;
          var last = arr[arr.length - 1];
          if (last && !last.estado) {
            last.estado = uf;
            last.cidade = cid;
            last.regiao = [uf, cid].filter(Boolean).join(' — ');
          }
        });
        if (typeof window.salvarDB === 'function') window.salvarDB();
      } catch (e) {}
    };
    window.salvarLancamentoPgto.__loc = true;
  }

  function botoesX() {
    document.querySelectorAll('#tab-pagamento td.lanc-actions').forEach(function (td) {
      if (td.querySelector('.pgto-x')) return;
      var ed = td.querySelector('button[onclick*="editarLancamentoPgto"]');
      if (!ed) return;
      var oc = ed.getAttribute('onclick') || '';
      var m = oc.match(/editarLancamentoPgto\(\s*'([^']+)'\s*,\s*'([^']+)'/);
      if (!m) return;
      var nativo = td.querySelector('button[onclick*="excluirLancamentoPgto"]');
      if (nativo) nativo.style.display = 'none';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pgto-x';
      b.title = 'Excluir este lancamento';
      b.textContent = '\u00d7';
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!confirm('Excluir este lancamento?')) return;
        if (typeof window.excluirLancamentoPgto === 'function') {
          window.excluirLancamentoPgto(m[1], m[2]);
          return;
        }
        if (!window.db) return;
        window.db.obras.forEach(function (o) {
          o.lancamentosProducao = (o.lancamentosProducao || []).filter(function (l) {
            return String(l.id) !== String(m[1]);
          });
        });
        if (typeof window.salvarDB === 'function') window.salvarDB();
        if (typeof window.renderPagamento === 'function') window.renderPagamento();
      });
      td.appendChild(b);
    });
  }

  function hookCustos() {
    var fn = window.getCustosFiltered || (typeof getCustosFiltered === 'function' ? getCustosFiltered : null);
    if (!fn || fn.__mix) return;
    var orig = fn;
    var wrap = function () {
      var base = orig.apply(this, arguments) || [];
      var db = window.db;
      if (!db || !db.obras) return base;
      var mesEl = document.getElementById('custoFilterMes');
      var mes = mesEl ? mesEl.value : '';
      var extra = [];
      db.obras.forEach(function (o) {
        (o.lancamentosProducao || []).forEach(function (l) {
          var d = l.data || '';
          if (mes && d.substring(0, 7) !== mes) return;
          extra.push({
            id: 'pgto-' + l.id,
            data: d,
            valor: (Number(l.valorProf) || 0) + (Number(l.valorAjud) || 0),
            categoria: 'Pagamento producao',
            descricao: l.material || 'Pagamento',
            obraId: o.id,
            obraNome: o.nome,
            regiao: l.regiao || l.estado || l.cidade || '',
            empresa: '',
            colaborador: ''
          });
        });
      });
      return base.concat(extra);
    };
    wrap.__mix = true;
    window.getCustosFiltered = wrap;
    try { getCustosFiltered = wrap; } catch (e) {}
  }

  function tick() {
    vigiaLogin();
    camposPagamento();
    camposCusto();
    hookSalvar();
    hookCustos();
    botoesX();
  }
  setTimeout(tick, 400);
  setTimeout(tick, 2000);
  setInterval(function () {
    if (document.hidden) return;
    tick();
  }, 8000);
  console.log('[UI2026completo2] login + estado/cidade + excluir + custos');
})();
