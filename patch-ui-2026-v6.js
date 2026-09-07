/**
 * PATCH UI 2026 v6
 * Acordeão nos grupos do menu + item OBRA + some o select do header
 * <script src="/patch-ui-2026-v6.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026v6) return;
  window.__patchUi2026v6 = true;

  var css = document.createElement('style');
  css.id = 'pUi2026v6css';
  css.textContent = [
    '#selectObra,.header-obra,#selectObra_wrap,label[for="selectObra"]{display:none!important}',
    '.or-acordeao{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;',
    'color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;',
    'padding:10px 12px 6px;cursor:pointer;text-align:left}',
    '.or-acordeao .seta{margin-left:auto;font-size:10px;opacity:.8}',
    '.or-acordeao.on{color:#e2e8f0}',
    '#orObrasBox .or-grupo{display:none!important}',
    '#orObrasToggle{width:100%}',
    '#orObrasLista{padding:2px 8px 10px 10px}',
    '#orObrasLista .or-item{width:100%;justify-content:flex-start}'
  ].join('');
  document.head.appendChild(css);

  function esconderSelectHeader() {
    var sel = document.getElementById('selectObra');
    if (!sel) return;
    sel.style.display = 'none';
    var p = sel.parentNode;
    if (p && p !== document.body && (p.textContent || '').indexOf('Obra') >= 0 && p.children.length <= 4) {
      /* não some o header inteiro, só o select */
    }
  }

  function virarAcordeao() {
    var lista = document.getElementById('orLista');
    if (!lista) return;
    var filhos = Array.prototype.slice.call(lista.childNodes);
    var i, grupo = null;
    for (i = 0; i < filhos.length; i++) {
      var n = filhos[i];
      if (!n || n.nodeType !== 1) continue;
      if (n.id === 'orObrasBox') continue;
      var ehTitulo = n.classList.contains('or-grupo') || n.classList.contains('or-tit');
      if (ehTitulo) {
        if (n.getAttribute('data-acc') === '1') { grupo = n; continue; }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'or-acordeao on';
        btn.setAttribute('data-acc', '1');
        var nome = (n.textContent || '').trim() || 'Grupo';
        btn.innerHTML = '<span class="tit">' + nome + '</span><span class="seta">▾</span>';
        var wrap = document.createElement('div');
        wrap.className = 'or-acc-itens';
        n.parentNode.insertBefore(btn, n);
        n.parentNode.insertBefore(wrap, n);
        n.style.display = 'none';
        n.setAttribute('data-acc', '1');
        grupo = btn;
        btn._caixa = wrap;
        btn.onclick = function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var on = this.classList.toggle('on');
          if (this._caixa) this._caixa.style.display = on ? '' : 'none';
          var s = this.querySelector('.seta');
          if (s) s.textContent = on ? '▾' : '▸';
        };
        continue;
      }
      if (grupo && grupo._caixa && n.classList.contains('or-item')) {
        grupo._caixa.appendChild(n);
      }
    }
  }

  function itemObra() {
    var lista = document.getElementById('orLista');
    if (!lista) return;
    var box = document.getElementById('orObrasBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'orObrasBox';
      lista.appendChild(box);
    }
    var tit = box.querySelector('.or-grupo');
    if (tit) tit.remove();
    var tog = document.getElementById('orObrasToggle');
    if (!tog) {
      tog = document.createElement('button');
      tog.type = 'button';
      tog.id = 'orObrasToggle';
      tog.className = 'or-item';
      tog.innerHTML = '<span class="or-ico">🏗️</span><span class="or-txt">Obra ▾</span>';
      box.insertBefore(tog, box.firstChild);
      tog.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var g = document.getElementById('orObrasLista');
        if (!g) return;
        var abre = g.style.display === 'none' || !g.style.display;
        g.style.display = abre ? 'block' : 'none';
        var t = tog.querySelector('.or-txt');
        if (t) t.textContent = abre ? 'Obra ▴' : 'Obra ▾';
      };
    } else {
      var t = tog.querySelector('.or-txt');
      if (t && /Obras/i.test(t.textContent)) t.textContent = t.textContent.replace(/Obras/i, 'Obra');
    }
    var g = document.getElementById('orObrasLista');
    if (!g) {
      g = document.createElement('div');
      g.id = 'orObrasLista';
      g.style.display = 'none';
      box.appendChild(g);
    }
    if (!window.db) return;
    var atual = db.obraAtualId;
    g.innerHTML = (db.obras || []).map(function (o) {
      var on = o.id === atual ? 'background:#1e293b;' : '';
      return '<button type="button" class="or-item" data-obra="' + o.id + '" style="' + on + '">' +
        '<span class="or-txt">' + String(o.nome || o.id) + '</span></button>';
    }).join('');
    g.querySelectorAll('[data-obra]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var id = b.getAttribute('data-obra');
        if (typeof window.trocarObra === 'function') window.trocarObra(id);
        else {
          db.obraAtualId = id;
          if (window.render) window.render();
        }
        itemObra();
      };
    });
  }

  function iniciar() {
    esconderSelectHeader();
    virarAcordeao();
    itemObra();
    setInterval(function () {
      esconderSelectHeader();
      virarAcordeao();
      itemObra();
    }, 1500);
    console.log('[UI2026v6] menu acordeão + Obra');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 500);
})();
