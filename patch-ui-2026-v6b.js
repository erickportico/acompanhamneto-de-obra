/**
 * PATCH UI 2026 v6b — Obra no mesmo estilo dos outros títulos; fonte maior
 * <script src="/patch-ui-2026-v6b.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026v6b) return;
  window.__patchUi2026v6b = true;

  var s = document.createElement('style');
  s.textContent = [
    '.or-acordeao,.or-grupo,.or-tit{',
    'font-size:13px!important;letter-spacing:.4px!important;',
    'font-weight:800!important;color:#cbd5e1!important;',
    'text-transform:uppercase!important;padding:12px 14px 8px!important}',
    '#orObrasToggle.or-item{display:none!important}',
    '#orObrasAcc{width:100%;display:flex;align-items:center;border:0;background:transparent;',
    'font-size:13px!important;font-weight:800!important;letter-spacing:.4px;',
    'text-transform:uppercase;color:#cbd5e1;padding:12px 14px 8px;cursor:pointer;text-align:left}',
    '#orObrasAcc .seta{margin-left:auto;font-size:11px}'
  ].join('');
  document.head.appendChild(s);

  function alinharObra() {
    var box = document.getElementById('orObrasBox');
    if (!box) return;
    var acc = document.getElementById('orObrasAcc');
    if (!acc) {
      acc = document.createElement('button');
      acc.type = 'button';
      acc.id = 'orObrasAcc';
      acc.className = 'or-acordeao';
      acc.innerHTML = '<span>Obra</span><span class="seta">▸</span>';
      box.insertBefore(acc, box.firstChild);
      acc.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var g = document.getElementById('orObrasLista');
        if (!g) return;
        var abre = g.style.display === 'none' || g.style.display === '';
        if (g.getAttribute('data-fechado') !== '0' && g.style.display !== 'block') abre = true;
        if (g.style.display === 'block') abre = false;
        g.style.display = abre ? 'block' : 'none';
        acc.querySelector('.seta').textContent = abre ? '▾' : '▸';
      };
    }
    var tog = document.getElementById('orObrasToggle');
    if (tog) tog.style.display = 'none';
  }

  setInterval(alinharObra, 800);
  setTimeout(alinharObra, 200);
  console.log('[UI2026v6b] Obra alinhada aos titulos');
})();
