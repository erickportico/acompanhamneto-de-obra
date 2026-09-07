/**
 * PATCH UI 2026 v4
 * <script src="/patch-ui-2026-v4.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026v4) return;
  window.__patchUi2026v4 = true;

  var K_SESS = 'painel_seg_sessao_v1';

  function css() {
    if (document.getElementById('pUi2026v4css')) return;
    var s = document.createElement('style');
    s.id = 'pUi2026v4css';
    s.textContent = [
      '#btnExcluirMedicao{width:28px;height:28px;padding:0;margin:0 0 0 8px;border:0;border-radius:8px;',
      'background:#fee2e2;color:#991b1b;font-size:16px;line-height:28px;cursor:pointer;vertical-align:middle}',
      '#btnExcluirMedicao:hover{background:#fecaca}',
      '#p86bLogin,#ps79Login,#p128Tela{display:none!important}',
      'body.ui2026-logado #p86bLogin,body.ui2026-logado #ps79Login{display:none!important}',
      '#selectObra.ui2026-moved{min-width:220px;margin-left:8px;height:36px;border-radius:8px}'
    ].join('');
    document.head.appendChild(s);
  }

  function sessao() {
    try {
      var a = sessionStorage.getItem(K_SESS);
      var b = localStorage.getItem(K_SESS);
      if (b && !a) sessionStorage.setItem(K_SESS, b);
      if (a && !b) localStorage.setItem(K_SESS, a);
      var raw = sessionStorage.getItem(K_SESS) || localStorage.getItem(K_SESS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function ehAdmin() {
    var s = sessao();
    return !!(s && String(s.perfil || '').toLowerCase() === 'admin');
  }

  function matarLogin() {
    if (!sessao()) return;
    document.body.classList.add('ui2026-logado');
    ['p86bLogin', 'ps79Login', 'p128Tela', 'p128Cracha'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function botaoXMedicao() {
    var velho = document.getElementById('btnExcluirMedicao');
    var box = document.querySelector('#tab-medicoes');
    if (!box) return;
    var nav = box.querySelector('button');
    if (!nav) return;
    if (velho && velho.textContent.length > 2) velho.remove();
    if (document.getElementById('btnExcluirMedicao')) return;
    var b = document.createElement('button');
    b.id = 'btnExcluirMedicao';
    b.type = 'button';
    b.title = 'Excluir medição selecionada';
    b.textContent = '×';
    b.onclick = function (ev) {
      ev.preventDefault();
      if (!ehAdmin()) {
        alert('Só o administrador exclui medição.');
        return;
      }
      if (!confirm('Excluir a medição que está na tela?')) return;
      try {
        var txt = box.innerText || '';
        var m = txt.match(/N[ºo]\s*(\d+)/i);
        var idx = m ? Number(m[1]) : 1;
        var obra = (window.db && db.obras || []).filter(function (o) { return o.id === db.obraAtualId; })[0] || (db.obras || [])[0];
        if (!obra) return;
        (obra.itens || []).forEach(function (it) {
          if (it.historicoMedicoes) delete it.historicoMedicoes[idx];
        });
        if (obra.numMedicaoMax === idx) obra.numMedicaoMax = Math.max(1, idx - 1);
        if (window.render) window.render();
        if (window.salvarDB) window.salvarDB();
      } catch (e) { alert(e.message); }
    };
    var alvo = box.querySelector('[onclick*="encerrarECriarNovaMedicao"]') || nav;
    alvo.parentNode.insertBefore(b, alvo.nextSibling);
  }

  function brl(n) {
    return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function custosTodos() {
    var out = [];
    try {
      (window.db && db.obras || []).forEach(function (o) {
        (o.centrosCusto || []).forEach(function (c) {
          var x = Object.assign({ _obra: o.nome, _obraId: o.id }, c);
          out.push(x);
        });
      });
    } catch (e) {}
    return out;
  }

  function custosFiltrados() {
    var lista = custosTodos();
    var obra = (document.getElementById('custoFilterObra') || {}).value || '';
    var emp = ((document.getElementById('custoFilterEmpresa') || {}).value || '').toUpperCase();
    var mes = (document.getElementById('custoFilterMes') || {}).value || '';
    return lista.filter(function (c) {
      if (obra && obra !== 'todas' && c.obraId !== obra && c._obraId !== obra) return false;
      if (emp && emp !== 'TODAS AS EMPRESAS' && emp !== '') {
        var e = String(c.empresa || '').toUpperCase();
        if (e !== emp) return false;
      }
      if (mes && mes.indexOf('-') === 4) {
        var d = String(c.data || '');
        var chave = d;
        if (d.indexOf('/') >= 0) {
          var p = d.split('/');
          chave = (p[2] || '') + '-' + (p[1] || '');
        } else chave = d.slice(0, 7);
        if (chave !== mes) return false;
      }
      return true;
    });
  }

  function pintarP120() {
    var lista = custosFiltrados();
    var cx = document.getElementById('p120Kpis');
    if (!cx) return;
    var total = 0, porMes = {}, porEmp = {}, porCat = {};
    lista.forEach(function (c) {
      var v = Number(c.valor) || 0;
      total += v;
      var d = String(c.data || '');
      var mes = d.indexOf('/') >= 0 ? ((d.split('/')[2] || '') + '-' + (d.split('/')[1] || '')) : d.slice(0, 7);
      if (mes) porMes[mes] = (porMes[mes] || 0) + v;
      var emp = c.empresa || 'Sem empresa';
      porEmp[emp] = (porEmp[emp] || 0) + v;
      var cat = c.categoria || 'Outros';
      porCat[cat] = (porCat[cat] || 0) + v;
    });
    var meses = Object.keys(porMes).sort();
    var emps = Object.keys(porEmp).sort(function (a, b) { return porEmp[b] - porEmp[a]; });
    var topE = emps[0] || '—';
    var topC = Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; })[0] || '—';
    var ultimo = meses[meses.length - 1] || '';
    cx.innerHTML =
      '<div class="p120-kpi k1 largo"><span>Total no filtro</span><b>' + brl(total) +
      '</b><i>' + lista.length + ' lançamentos</i></div>' +
      '<div class="p120-kpi k2"><span>Último mês</span><b>' + (ultimo ? brl(porMes[ultimo]) : '—') +
      '</b><i>' + (ultimo || 'sem data') + '</i></div>' +
      '<div class="p120-kpi k3"><span>Média por mês</span><b>' +
      brl(meses.length ? total / meses.length : 0) + '</b><i>' + meses.length + ' meses</i></div>' +
      '<div class="p120-kpi k5"><span>Empresa com mais gasto</span><b>' + topE +
      '</b><i>' + (topE !== '—' ? brl(porEmp[topE]) : '') + '</i></div>' +
      '<div class="p120-kpi k6"><span>Maior categoria</span><b>' + topC +
      '</b><i>' + (topC !== '—' ? brl(porCat[topC]) : '') + '</i></div>';
    var rank = document.getElementById('p120Rank');
    if (rank && rank.getContext) {
      var ctx = rank.getContext('2d');
      var w = rank.width || 400, h = rank.height || 200;
      ctx.clearRect(0, 0, w, h);
      var max = emps.length ? porEmp[emps[0]] : 1;
      emps.slice(0, 8).forEach(function (nome, i) {
        var y = 18 + i * 22;
        var bw = max ? (porEmp[nome] / max) * (w - 140) : 0;
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(120, y - 10, bw, 14);
        ctx.fillStyle = '#334155';
        ctx.font = '12px sans-serif';
        ctx.fillText(String(nome).slice(0, 16), 4, y);
        ctx.fillText(brl(porEmp[nome]), 124 + bw, y);
      });
    }
  }

  function hookCustos() {
    ['custoFilterObra', 'custoFilterEmpresa', 'custoFilterMes', 'custoFilterRegiao',
     'custoFilterPeriodoDe', 'custoFilterPeriodoAte'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.__v4) {
        el.__v4 = true;
        el.addEventListener('change', pintarP120);
        el.addEventListener('input', pintarP120);
      }
    });
    if (typeof window.renderCustoDashboard === 'function' && !window.renderCustoDashboard.__v4) {
      var orig = window.renderCustoDashboard;
      window.renderCustoDashboard = function () {
        var r = orig.apply(this, arguments);
        setTimeout(pintarP120, 50);
        return r;
      };
      window.renderCustoDashboard.__v4 = true;
    }
    pintarP120();
  }

  function moverSelectObra() {
    var sel = document.getElementById('selectObra');
    var menu = document.querySelector('[class*="menu"] button, #orAbrir, .pmenu-ico-btn');
    var chip = document.querySelector('#tab-itens') ? document.querySelector('button') : null;
    var destino = document.querySelector('#meu-menu-abas') || menu;
    if (!sel || !destino || sel.classList.contains('ui2026-moved')) return;
    sel.classList.add('ui2026-moved');
    destino.parentNode.insertBefore(sel, destino.nextSibling);
  }

  function iniciar() {
    css();
    matarLogin();
    botaoXMedicao();
    hookCustos();
    moverSelectObra();
    var obs = new MutationObserver(function () { matarLogin(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setInterval(function () {
      matarLogin();
      botaoXMedicao();
      hookCustos();
    }, 1500);
    console.log('[UI2026v4] patch ativo');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 300);
})();
