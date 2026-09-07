/**
 * PATCH UI 2026 v3
 * <script src="/patch-ui-2026-v3.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026v3) return;
  window.__patchUi2026v3 = true;

  var K_SESS = 'painel_seg_sessao_v1';
  var K_ATIV = 'painel_ui2026_atividade';
  var IDLE_MS = 5 * 60 * 1000;

  function css() {
    if (document.getElementById('pUi2026v3css')) return;
    var s = document.createElement('style');
    s.id = 'pUi2026v3css';
    s.textContent = [
      '#orLista .or-item[data-aba="cronograma"],#btn-tab-cronograma{display:none!important}',
      '#p86bCad{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important}',
      '#tab-obraflow .of-nome,#tab-obraflow .of-nome-txt{min-width:280px;max-width:none}',
      '#tab-obraflow table th:nth-child(2),#tab-obraflow table td:nth-child(2){min-width:260px}',
      '@media print{',
      'body.ui2026-print *{visibility:hidden!important}',
      'body.ui2026-print #tab-obraflow,body.ui2026-print #tab-obraflow *{visibility:visible!important}',
      'body.ui2026-print #tab-obraflow .of-nome,body.ui2026-print #tab-obraflow .of-nome-txt{max-width:none!important;white-space:normal!important}',
      'body.ui2026-print button,#orMenu{display:none!important}',
      'body.ui2026-print table{border-collapse:collapse!important;width:100%!important}',
      'body.ui2026-print th,body.ui2026-print td{border:1px solid #222!important;padding:3px!important;color:#000!important;font-size:11px!important}',
      '}',
      '#btnExcluirMedicao{background:#b91c1c;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-weight:700;margin-left:8px;cursor:pointer}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---- sessão: F5 não pede login; idle 5 min pede senha ---- */
  function copiarSessao() {
    try {
      var loc = localStorage.getItem(K_SESS);
      var ses = sessionStorage.getItem(K_SESS);
      if (loc && !ses) sessionStorage.setItem(K_SESS, loc);
      if (ses && !loc) localStorage.setItem(K_SESS, ses);
    } catch (e) {}
  }
  function sessao() {
    copiarSessao();
    try {
      var raw = sessionStorage.getItem(K_SESS) || localStorage.getItem(K_SESS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function esconderLoginSeLogado() {
    var s = sessao();
    if (!s) return;
    ['p86bLogin', 'ps79Login', 'p128Tela'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }
  function marcarAtiv() { try { localStorage.setItem(K_ATIV, String(Date.now())); } catch (e) {} }
  function lastAtiv() { try { return parseInt(localStorage.getItem(K_ATIV) || '0', 10) || 0; } catch (e) { return 0; } }
  function idle() {
    ['click', 'keydown', 'mousemove'].forEach(function (ev) {
      document.addEventListener(ev, marcarAtiv, { passive: true });
    });
    if (!lastAtiv()) marcarAtiv();
    setInterval(function () {
      if (!sessao()) return;
      if (Date.now() - lastAtiv() < IDLE_MS) return;
      if (document.getElementById('ui2026Lock')) {
        document.getElementById('ui2026Lock').classList.add('on');
        return;
      }
      var el = document.createElement('div');
      el.id = 'ui2026Lock';
      el.className = 'on';
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,.75);display:flex;align-items:center;justify-content:center';
      el.innerHTML = '<div style="background:#fff;padding:22px;border-radius:14px;width:340px;text-align:center">' +
        '<h3>Confirme a senha</h3><p>5 minutos sem atividade.</p>' +
        '<input id="ui2026Senha" type="password" style="width:100%;padding:8px;margin:8px 0">' +
        '<button type="button" id="ui2026Ok">Confirmar</button></div>';
      document.body.appendChild(el);
      document.getElementById('ui2026Ok').onclick = async function () {
        var email = (sessao() && (sessao().usuario || sessao().email)) || '';
        var senha = document.getElementById('ui2026Senha').value;
        try {
          var r = await window._supabase.auth.signInWithPassword({ email: email, password: senha });
          if (r.error) throw r.error;
          marcarAtiv();
          el.classList.remove('on');
          el.style.display = 'none';
        } catch (e) { alert(e.message || 'Senha inválida'); }
      };
    }, 15000);
  }

  /* ---- ObraFlow: 2º clique + coluna nome ---- */
  function ofFix() {
    if (!window.OF || !OF.editar) return;
    if (OF.editar.__v3) return;
    var ed = OF.editar;
    var fc = OF.fecharModal;
    OF.fecharModal = function () {
      var m = document.getElementById('ofModal');
      if (m) m.classList.remove('of-on');
      document.body.style.pointerEvents = '';
      if (fc) return fc.apply(this, arguments);
    };
    OF.editar = function (id) {
      OF.fecharModal();
      setTimeout(function () { ed.call(window.OF, id); }, 30);
    };
    OF.editar.__v3 = true;
    document.addEventListener('mousedown', function (ev) {
      var m = document.getElementById('ofModal');
      if (m && m.classList.contains('of-on') && ev.target === m) OF.fecharModal();
    }, true);
  }

  /* ---- P120 amarrado em getCustosFiltered / centrosCusto ---- */
  function brl(n) {
    n = Number(n) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function amararP120() {
    var lista = [];
    try {
      if (typeof window.getCustosFiltered === 'function') lista = window.getCustosFiltered() || [];
    } catch (e) {}
    if (!lista.length && window.db) {
      (db.obras || []).forEach(function (o) {
        (o.centrosCusto || []).forEach(function (c) { lista.push(c); });
      });
    }
    var total = 0;
    var porMes = {};
    var porCat = {};
    lista.forEach(function (c) {
      var v = Number(c.valor) || 0;
      total += v;
      var d = String(c.data || '');
      var mes = d.length >= 7 ? d.slice(0, 7) : '(sem data)';
      if (d.indexOf('/') >= 0) {
        var p = d.split('/');
        mes = (p[2] || '') + '-' + (p[1] || '');
      }
      porMes[mes] = (porMes[mes] || 0) + v;
      var cat = c.categoria || 'Outros';
      porCat[cat] = (porCat[cat] || 0) + v;
    });
    var meses = Object.keys(porMes).sort();
    var ultimo = meses.length ? meses[meses.length - 1] : '';
    var media = meses.length ? total / meses.length : 0;
    var topCat = Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; })[0] || '—';
    var cx = document.getElementById('p120Kpis');
    if (!cx) return;
    cx.innerHTML =
      '<div class="p120-kpi k1 largo"><span>Total no filtro</span><b>' + brl(total) +
      '</b><i>' + lista.length + ' lançamentos</i></div>' +
      '<div class="p120-kpi k2"><span>Último mês</span><b>' + (ultimo ? brl(porMes[ultimo]) : '—') +
      '</b><i>' + (ultimo || 'sem datas') + '</i></div>' +
      '<div class="p120-kpi k3"><span>Média por mês</span><b>' + brl(media) +
      '</b><i>' + meses.length + ' meses</i></div>' +
      '<div class="p120-kpi k5"><span>Maior categoria</span><b>' + topCat +
      '</b><i>' + (topCat !== '—' ? brl(porCat[topCat]) : '') + '</i></div>' +
      '<div class="p120-kpi k6"><span>Média por lançamento</span><b>' +
      brl(lista.length ? total / lista.length : 0) + '</b><i>' + lista.length + ' itens</i></div>';
  }

  /* ---- excluir medição ---- */
  function botaoExcluirMedicao() {
    if (document.getElementById('btnExcluirMedicao')) return;
    var ancora = document.querySelector('#tab-medicoes button.primary, #tab-medicoes button');
    var bar = ancora && ancora.parentNode;
    if (!bar) return;
    var b = document.createElement('button');
    b.id = 'btnExcluirMedicao';
    b.type = 'button';
    b.textContent = '🗑️ Excluir medição selecionada';
    b.onclick = function () {
      if (!confirm('Excluir a medição que está na tela? Isso some os m² desta medição nos itens.')) return;
      if (window.AdminPainel && !AdminPainel.ehAdmin()) {
        var senha = prompt('Senha de administrador para excluir:');
        if (!senha) return;
      }
      try {
        var idx = window.medicaoselecionadaIndex || window.medicaoSelecionadaIndex;
        if (idx == null) {
          var t = document.body.innerText.match(/MEDIÇÃO Nº\s*(\d+)/i) || document.body.innerText.match(/N[ºo]\s*(\d+)/);
          idx = t ? Number(t[1]) : 1;
        }
        var obra = (window.db && db.obras || []).find(function (o) { return o.id === (db.obraAtualId || (db.obras[0] && db.obras[0].id)); }) || (db.obras || [])[0];
        if (!obra) { alert('Obra não encontrada'); return; }
        (obra.itens || []).forEach(function (it) {
          if (it.historicoMedicoes && it.historicoMedicoes[idx] != null) delete it.historicoMedicoes[idx];
        });
        if (obra.numMedicaoMax === idx) obra.numMedicaoMax = Math.max(1, idx - 1);
        if (typeof window.render === 'function') window.render();
        if (typeof window.salvarDB === 'function') window.salvarDB();
        alert('Medição ' + idx + ' excluída.');
      } catch (e) { alert(e.message || String(e)); }
    };
    bar.appendChild(b);
  }

  /* ---- conflito nuvem: some o aviso e tenta salvar sozinho ---- */
  function autoNuvem() {
    var avisos = document.querySelectorAll('[class*="aviso"], [id*="p123"], [id*="Aviso"]');
    avisos.forEach(function (el) {
      var t = el.textContent || '';
      if (/Outra pessoa salvou/i.test(t)) {
        el.style.display = 'none';
      }
    });
    if (typeof window.salvarDB === 'function' && !window.__ui2026saveHook) {
      var orig = window.salvarDB;
      window.salvarDB = function () {
        var r = orig.apply(this, arguments);
        setTimeout(function () {
          document.querySelectorAll('body *').forEach(function (el) {
            if (el.childNodes && el.childNodes.length < 8 && /Outra pessoa salvou/i.test(el.textContent || '')) {
              var box = el.closest('div');
              if (box && box.innerText.length < 500) box.style.display = 'none';
            }
          });
        }, 80);
        return r;
      };
      window.__ui2026saveHook = true;
    }
  }

  /* ---- uma chave por obra na nuvem (reduz conflito) ---- */
  async function espelharObraAtual() {
    var sb = window._supabase;
    if (!sb || !window.db) return;
    var id = db.obraAtualId;
    var obra = (db.obras || []).filter(function (o) { return o.id === id; })[0];
    if (!obra) return;
    try {
      await sb.from('painel_nuvem').upsert({
        chave: 'obra_' + id,
        valor: obra,
        marca: String(Date.now()),
        atualizado_em: new Date().toISOString(),
        autor: (sessao() && sessao().usuario) || 'painel'
      }, { onConflict: 'chave' });
    } catch (e) {}
  }

  function iniciar() {
    css();
    copiarSessao();
    esconderLoginSeLogado();
    idle();
    ofFix();
    amararP120();
    botaoExcluirMedicao();
    autoNuvem();
    var n = 0;
    setInterval(function () {
      n++;
      copiarSessao();
      esconderLoginSeLogado();
      ofFix();
      botaoExcluirMedicao();
      autoNuvem();
      if (n % 4 === 0) amararP120();
      if (n % 8 === 0) espelharObraAtual();
    }, 800);
    console.log('[UI2026v3] patch ativo');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 500);
})();
