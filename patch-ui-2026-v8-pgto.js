/**
 * PATCH UI 2026 v8 — cidade IBGE + some campo vazio + excluir lançamento
 * <script src="/patch-ui-2026-v8-pgto.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026v8) return;
  window.__patchUi2026v8 = true;

  var css = document.createElement('style');
  css.textContent = [
    '#inputLancRegiao{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important}',
    '.loc-sug:empty{display:none!important}',
    '.pgto-del{border:0;background:#fee2e2;color:#991b1b;width:28px;height:28px;border-radius:8px;',
    'cursor:pointer;font-size:16px;line-height:28px;margin-left:4px}',
    '.pgto-del:hover{background:#fecaca}'
  ].join('');
  document.head.appendChild(css);

  function ufDoSelect(sel) {
    var v = String((sel && sel.value) || '');
    var m = v.match(/\b([A-Z]{2})\b/);
    return m ? m[1] : v.slice(0, 2).toUpperCase();
  }

  async function listaCidades(sigla) {
    if (window.__ibgeMun && window.__ibgeMun[sigla]) return window.__ibgeMun[sigla];
    try {
      var raw = localStorage.getItem('painel_ibge_mun_v1_' + sigla);
      if (raw) {
        var o = JSON.parse(raw);
        var dados = o.dados || o;
        if (dados && dados.length) return dados;
      }
    } catch (e) {}
    try {
      var r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/' + sigla + '/municipios');
      var lista = (await r.json()).map(function (x) { return x.nome; });
      try { localStorage.setItem('painel_ibge_mun_v1_' + sigla, JSON.stringify({ em: Date.now(), dados: lista })); } catch (e2) {}
      return lista;
    } catch (e) { return []; }
  }

  function ligarCidade() {
    document.querySelectorAll('.loc-cid').forEach(function (cid) {
      if (cid.__v8) return;
      cid.__v8 = true;
      cid.addEventListener('input', async function () {
        var wrap = cid.closest('.loc-wrap');
        var sel = wrap && wrap.querySelector('.loc-uf');
        var uf = ufDoSelect(sel);
        var lista = await listaCidades(uf);
        var box = document.getElementById('locSugBox');
        if (!box) {
          box = document.createElement('div');
          box.id = 'locSugBox';
          box.className = 'loc-sug';
          document.body.appendChild(box);
        }
        var q = String(cid.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var hits = lista.filter(function (n) {
          var t = String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return t.indexOf(q) >= 0;
        }).slice(0, 25);
        if (!hits.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
        var r = cid.getBoundingClientRect();
        box.style.display = 'block';
        box.style.position = 'fixed';
        box.style.left = r.left + 'px';
        box.style.top = (r.bottom + 4) + 'px';
        box.style.width = Math.max(180, r.width) + 'px';
        box.innerHTML = hits.map(function (n) {
          return '<button type="button">' + n + '</button>';
        }).join('');
        box.querySelectorAll('button').forEach(function (b) {
          b.onclick = function () {
            cid.value = b.textContent;
            box.style.display = 'none';
            cid.dispatchEvent(new Event('change', { bubbles: true }));
          };
        });
      });
    });
  }

  function botoesExcluir() {
    document.querySelectorAll('#tab-pagamento table tbody tr, [id*="pagamento"] table tbody tr').forEach(function (tr) {
      if (tr.querySelector('.pgto-del')) return;
      if ((tr.textContent || '').indexOf('Total') >= 0) return;
      var acoes = tr.querySelector('td:last-child');
      if (!acoes) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pgto-del';
      b.title = 'Excluir lançamento';
      b.textContent = '×';
      b.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!confirm('Excluir este lançamento?')) return;
        var material = (tr.children[1] && tr.children[1].textContent || '').trim();
        var data = (tr.children[0] && tr.children[0].textContent || '').trim();
        var ok = false;
        (window.db && db.obras || []).forEach(function (o) {
          if (!o.lancamentosProducao) return;
          var antes = o.lancamentosProducao.length;
          o.lancamentosProducao = o.lancamentosProducao.filter(function (l) {
            return !(String(l.data || '').indexOf(data) >= 0 && String(l.material || '') === material);
          });
          if (o.lancamentosProducao.length !== antes) ok = true;
        });
        if (ok && window.salvarDB) window.salvarDB();
        if (window.renderPagamento) window.renderPagamento();
        else if (window.render) window.render();
        tr.parentNode.removeChild(tr);
      };
      acoes.appendChild(b);
    });
  }

  function iniciar() {
    ligarCidade();
    botoesExcluir();
    setInterval(function () {
      ligarCidade();
      botoesExcluir();
    }, 1200);
    console.log('[UI2026v8] cidade + excluir pagamento');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 400);
})();
