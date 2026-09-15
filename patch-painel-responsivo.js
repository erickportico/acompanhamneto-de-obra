(function () {
  'use strict';
  if (window.__patchPainelResponsivo2) return;
  window.__patchPainelResponsivo = true;
  window.__patchPainelResponsivo2 = true;

  var old = document.getElementById('painelRespCss');
  if (old) old.remove();
  var s = document.createElement('style');
  s.id = 'painelRespCss';
  s.textContent = [
    '@media (max-width:900px){',
    'html,body{overflow-x:hidden!important}',
    'header,.container,.card{max-width:100%!important;box-sizing:border-box}',
    '.header-title-container,.project-selector{flex-wrap:wrap!important}',
    '.project-selector select,.project-selector button,#statusNuvem{min-height:40px!important}',
    'table{display:block;overflow-x:auto}',
    '.lanc-form-grid,.lanc-task-fields{grid-template-columns:1fr!important}',
    '#p92Fundo{position:fixed!important;inset:0!important;z-index:2147482000!important;',
    'display:flex!important;flex-direction:column!important;max-width:100%!important;',
    'padding:8px!important;box-sizing:border-box}',
    '#p92Fundo > *{max-width:100%}',
    '#p92Fundo .p92-topo{flex:0 0 auto}',
    '#p92Fundo .p92-corpo,#p92Fundo [class*="corpo"],#p92Fundo .p92-sec{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}',
    '#p92Pe{position:sticky;bottom:0;z-index:5;display:flex!important;flex-wrap:wrap!important;',
    'gap:6px!important;padding:8px!important;background:#0f172a!important}',
    '#p92Pe .p92-btn{flex:1 1 46%;min-height:40px;font-size:12px!important;padding:8px 6px!important}',
    '#p92Fundo .p92-btn-mini{min-height:36px}',
    '#p94Lupa{inset:0!important;overflow:auto}',
    '#p94Lupa .p94-folha{width:100%!important;height:auto!important;transform:none!important}',
    '}',
    '@media print{header,#p92Pe,#orLista,#p129Selo{display:none!important}}'
  ].join('');
  document.head.appendChild(s);
  console.log('[resp] fpdo e abas no celular');
})();
