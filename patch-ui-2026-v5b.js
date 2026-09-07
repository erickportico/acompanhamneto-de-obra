/**
 * PATCH UI 2026 v5b — corrige faixa preta #p120Dica e briga com o P120
 * <script src="/patch-ui-2026-v5b.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026v5b) return;
  window.__patchUi2026v5b = true;

  var css = document.createElement('style');
  css.textContent = [
    '#p120Dica{position:fixed!important;display:none!important;width:auto!important;',
    'max-width:260px!important;left:auto!important;right:auto!important;',
    'height:auto!important;z-index:99999!important;pointer-events:none!important;',
    'background:#0f172a!important;color:#fff!important;border-radius:9px!important;',
    'padding:7px 10px!important;white-space:normal!important}',
    '#p120Dica.p120-dica-on{display:block!important}',
    '#p120Area,#p120Kpis{overflow:visible}',
    '#tab-custo .p120-kpis{position:relative;z-index:1}'
  ].join('');
  document.head.appendChild(css);

  function esconderDica() {
    var d = document.getElementById('p120Dica');
    if (!d) return;
    d.style.display = 'none';
    d.classList.remove('p120-dica-on');
  }

  document.addEventListener('mouseleave', esconderDica, true);
  document.addEventListener('click', esconderDica, true);
  window.addEventListener('scroll', esconderDica, true);

  setInterval(esconderDica, 4000);
  esconderDica();
  console.log('[UI2026v5b] tooltip P120 corrigido');
})();
