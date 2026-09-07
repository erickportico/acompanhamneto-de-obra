/**
 * PATCH anti-flicker — trava #p120Kpis no desenho do P120
 * Coloque ESTE script por último.
 * <script src="/patch-ui-2026-anti-flicker.js"></script>
 */
(function () {
  'use strict';
  if (window.__antiFlickerP120) return;
  window.__antiFlickerP120 = true;

  var travado = '';
  var el = null;

  function nativo(html) {
    return /PROJECAO DESTE MES|Projeção deste mês|MES DE SET|MÊS DE SET|CUSTO POR DIA/i.test(html || '');
  }
  function patch(html) {
    return /EMPRESA COM MAIS|Total do mês vigente|custo \+ produção/i.test(html || '');
  }

  function tick() {
    el = document.getElementById('p120Kpis');
    if (!el) return;
    var html = el.innerHTML;
    if (nativo(html)) travado = html;
    if (travado && patch(html)) el.innerHTML = travado;
  }

  setInterval(tick, 180);
  console.log('[anti-flicker] P120 travado no desenho nativo');
})();
