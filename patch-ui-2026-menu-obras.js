/**
 * Gaveta OBRAS no menu lateral — não apaga patches anteriores.
 */
(function () {
  'use strict';
  if (window.__patchUi2026menuObras) return;
  window.__patchUi2026menuObras = true;

  if (!document.getElementById('menuObrasCss')) {
    var css = document.createElement('style');
    css.id = 'menuObrasCss';
    css.textContent = [
      '#selectObra{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important}',
      '#orObrasBox{margin:4px 0 8px}',
      '#orObrasTit{display:flex;align-items:center;justify-content:space-between;width:100%;',
      'background:transparent;border:0;color:#93c5fd;font:700 11px/1 inherit;letter-spacing:1.2px;',
      'text-transform:uppercase;padding:10px 8px 6px;cursor:pointer}',
      '#orObrasTit .seta{font-size:10px;opacity:.8}',
      '#orObrasLista{display:none;padding:0 4px 6px}',
      '#orObrasBox.aberta #orObrasLista{display:block}',
      '#orObrasLista .or-item.or-obra{padding:8px 12px!important}',
      '#orObrasLista .or-item.or-obra.or-ativo{background:rgba(96,165,250,.18)}'
    ].join('');
    document.head.appendChild(css);
  }

  function obrasDoBanco() {
    var db = window.db;
    if (!db || !Array.isArray(db.obras)) return [];
    return db.obras.map(function (o) {
      return { id: o.id, nome: o.nome || o.id };
    });
  }

  function obraAtualId() {
    var sel = document.getElementById('selectObra');
    if (sel && sel.value) return sel.value;
    try { if (window.db && window.db.obraAtualId) return window.db.obraAtualId; } catch (e) {}
    return '';
  }

  function montar() {
    var lista = document.getElementById('orLista');
    if (!lista) return;
    var box = document.getElementById('orObrasBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'orObrasBox';
      box.className = 'aberta';
      box.innerHTML = '<button type="button" id="orObrasTit"><span>🏗️ Obras</span><span class="seta">▾</span></button><div id="orObrasLista"></div>';
    }
    if (lista.firstChild !== box) lista.insertBefore(box, lista.firstChild);
    var tit = document.getElementById('orObrasTit');
    if (tit && !tit.__liga) {
      tit.__liga = true;
      tit.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        box.classList.toggle('aberta');
        var s = tit.querySelector('.seta');
        if (s) s.textContent = box.classList.contains('aberta') ? '▾' : '▸';
      });
    }
    var ul = document.getElementById('orObrasLista');
    if (!ul) return;
    var atual = String(obraAtualId());
    var html = obrasDoBanco().map(function (o) {
      var on = String(o.id) === atual ? ' or-ativo' : '';
      return '<button type="button" class="or-item or-obra' + on + '" data-obra="' + String(o.id).replace(/"/g, '') + '">' +
        '<span class="or-ico">🏢</span><span class="or-txt">' + String(o.nome).replace(/</g, '') + '</span></button>';
    }).join('');
    if (!html) html = '<div class="or-grupo">Nenhuma obra</div>';
    if (ul.getAttribute('data-h') !== html) {
      ul.innerHTML = html;
      ul.setAttribute('data-h', html);
      ul.querySelectorAll('.or-obra').forEach(function (b) {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var id = b.getAttribute('data-obra');
          var sel = document.getElementById('selectObra');
          if (sel) {
            sel.value = id;
            try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
          }
          if (typeof window.trocarObra === 'function') {
            try { window.trocarObra(id); } catch (e2) {}
          }
          ul.querySelectorAll('.or-obra').forEach(function (x) { x.classList.toggle('or-ativo', x === b); });
        });
      });
    }
  }

  setTimeout(montar, 400);
  setInterval(montar, 1200);
  console.log('[UI2026menuObras] gaveta Obras no menu');
})();
