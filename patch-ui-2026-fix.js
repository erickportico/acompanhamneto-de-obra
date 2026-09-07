/**
 * PATCH UI 2026 FIX — excluir pagamento, cidade, labels, NÃO trava mês, NÃO pinta P120
 * Deixe só este + v6/v6b/admin. Sem unico/v4/v5.
 * <script src="/patch-ui-2026-fix.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026fix) return;
  window.__patchUi2026fix = true;

  var css = document.createElement('style');
  css.textContent = [
    '#locSugBox,.loc-sug{display:none!important}',
    '#locSugBox.aberto{display:block!important;background:#fff;color:#0f172a;border:1px solid #94a3b8;',
    'border-radius:8px;max-height:220px;overflow:auto;position:fixed;z-index:2147483646;box-shadow:0 8px 20px rgba(0,0,0,.18)}',
    '#locSugBox.aberto button{display:block;width:100%;text-align:left;border:0;background:#fff;color:#0f172a;padding:8px 10px}',
    '#locSugBox.aberto button:hover{background:#e2e8f0}',
    '#inputLancRegiao,#custoFilterRegiao{position:absolute!important;left:-9999px!important;height:1px!important;opacity:0!important}',
    '.pgto-del{width:26px;height:26px;border:0;border-radius:7px;background:#fecaca;color:#7f1d1d;cursor:pointer;font-size:16px}'
  ].join('');
  document.head.appendChild(css);

  function fecharCidade() {
    var b = document.getElementById('locSugBox');
    if (b) { b.className = 'loc-sug'; b.innerHTML = ''; b.style.display = 'none'; }
  }

  function banco() {
    return window.db || window.DB || null;
  }

  function excluirLanc(lancId, obraId) {
    if (typeof window.excluirLancamentoPgto === 'function') {
      window.excluirLancamentoPgto(lancId, obraId);
      return true;
    }
    var db = banco();
    if (!db || !db.obras) return false;
    var obra = db.obras.filter(function (o) { return String(o.id) === String(obraId); })[0];
    if (!obra) {
      db.obras.forEach(function (o) {
        if ((o.lancamentosProducao || []).some(function (l) { return String(l.id) === String(lancId); })) obra = o;
      });
    }
    if (!obra) return false;
    obra.lancamentosProducao = (obra.lancamentosProducao || []).filter(function (l) {
      return String(l.id) !== String(lancId);
    });
    if (typeof window.salvarDB === 'function') window.salvarDB();
    if (typeof window.renderPagamento === 'function') window.renderPagamento();
    return true;
  }

  function botoesDel() {
    document.querySelectorAll('td.lanc-actions').forEach(function (td) {
      var ed = td.querySelector('button[onclick*="editarLancamentoPgto"]');
      if (!ed) return;
      var oc = ed.getAttribute('onclick') || '';
      var m = oc.match(/editarLancamentoPgto\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/);
      if (!m) return;
      var nativo = td.querySelector('button[onclick*="excluirLancamentoPgto"]');
      if (nativo) nativo.style.display = 'none';
      var ja = td.querySelector('.pgto-del');
      if (ja) {
        ja.onclick = ligar(m[1], m[2]);
        return;
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pgto-del';
      b.title = 'Excluir este lançamento';
      b.textContent = '×';
      b.onclick = ligar(m[1], m[2]);
      td.appendChild(b);
    });
  }
  function ligar(id, obra) {
    return function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!confirm('Excluir este lançamento?')) return;
      excluirLanc(id, obra);
    };
  }

  function labels() {
    document.querySelectorAll('.loc-wrap label').forEach(function (lb) {
      var t = (lb.childNodes[0] && lb.childNodes[0].textContent) || lb.textContent;
      if (/região|regiao/i.test(t)) {
        if (lb.childNodes[0] && lb.childNodes[0].nodeType === 3) lb.childNodes[0].textContent = 'Estado ';
      }
    });
    document.querySelectorAll('label, .filtro-lbl, span').forEach(function (el) {
      if (el.children.length) return;
      if (/^\s*região\s*$/i.test(el.textContent || '')) el.textContent = 'Estado';
    });
  }

  function cidade() {
    document.querySelectorAll('.loc-cid').forEach(function (inp) {
      if (inp.__fix) return;
      inp.__fix = true;
      inp.addEventListener('input', async function () {
        var wrap = inp.closest('.loc-wrap');
        var sel = wrap && wrap.querySelector('.loc-uf');
        var uf = String((sel && sel.value) || '').match(/[A-Z]{2}/);
        uf = uf ? uf[0] : '';
        if (!uf) { fecharCidade(); return; }
        var lista = [];
        try {
          var raw = localStorage.getItem('painel_ibge_mun_v1_' + uf);
          if (raw) lista = (JSON.parse(raw).dados) || [];
        } catch (e) {}
        if (!lista.length) {
          try {
            var r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/' + uf + '/municipios');
            lista = (await r.json()).map(function (x) { return x.nome; });
            localStorage.setItem('painel_ibge_mun_v1_' + uf, JSON.stringify({ em: Date.now(), dados: lista }));
          } catch (e2) {}
        }
        var q = inp.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var hits = lista.filter(function (n) {
          return String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(q) >= 0;
        }).slice(0, 20);
        var box = document.getElementById('locSugBox');
        if (!box) { box = document.createElement('div'); box.id = 'locSugBox'; document.body.appendChild(box); }
        if (!hits.length) { fecharCidade(); return; }
        var rct = inp.getBoundingClientRect();
        box.className = 'loc-sug aberto';
        box.style.left = rct.left + 'px';
        box.style.top = (rct.bottom + 4) + 'px';
        box.style.width = Math.max(180, rct.width) + 'px';
        box.innerHTML = hits.map(function (n) { return '<button type="button">' + n + '</button>'; }).join('');
        box.querySelectorAll('button').forEach(function (bt) {
          bt.onclick = function () { inp.value = bt.textContent; fecharCidade(); };
        });
      });
      inp.addEventListener('blur', function () { setTimeout(fecharCidade, 180); });
    });
  }

  document.addEventListener('click', function (ev) {
    if (!ev.target.closest || ev.target.closest('#locSugBox') || ev.target.classList.contains('loc-cid')) return;
    fecharCidade();
  }, true);

  function tick() {
    botoesDel();
    labels();
    cidade();
    fecharCidade();
  }

  setTimeout(function () { botoesDel(); labels(); cidade(); }, 400);
  setInterval(function () { botoesDel(); labels(); cidade(); }, 1500);
  console.log('[UI2026fix] excluir + cidade + sem trava de mês');
})();
