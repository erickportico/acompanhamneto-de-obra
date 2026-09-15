(function () {
  'use strict';
  if (window.__patchPainelResponsivo) return;
  window.__patchPainelResponsivo = true;

  var s = document.createElement('style');
  s.id = 'painelRespCss';
  s.textContent = [
    '@media (max-width:900px){',
    'html,body{overflow-x:hidden!important;max-width:100%}',
    '.container,header,.card,#tab-itens,#tab-pagamento,#tab-graficos{max-width:100%!important;box-sizing:border-box}',
    'header{padding:10px!important}',
    '.header-title-container{flex-direction:column!important;align-items:stretch!important;gap:8px!important}',
    '.header-title-info h1{font-size:18px!important;line-height:1.2!important}',
    '.header-badges-right,.contract-badge{width:100%!important;align-items:stretch!important}',
    '.project-selector,.hdr-esq,.hdr-dir{flex-wrap:wrap!important;width:100%!important}',
    '.project-selector select,.project-selector button,#statusNuvem{flex:1 1 46%;min-width:140px!important;height:40px!important}',
    '#orLista,#orMenu{max-width:100vw!important}',
    '.tabs,nav{flex-wrap:wrap}',
    'table{display:block;overflow-x:auto;max-width:100%}',
    '.card > div[style*="grid"],.lanc-form-grid,.lanc-task-fields{grid-template-columns:1fr!important}',
    '#p92Fundo,#p92Pe{max-width:100%!important}',
    '#p92Pe{display:flex;flex-wrap:wrap;gap:6px}',
    '#p129Selo{left:8px!important;right:8px!important;bottom:8px!important}',
    '}',
    '@media (max-width:600px){',
    '.header-title-info p{display:none}',
    '.contract-badge .label{font-size:10px}',
    '.contract-badge .val{font-size:16px}',
    '}',
    '@media print{',
    'header,.project-selector,#orLista,#p129Selo{display:none!important}',
    '}'
  ].join('');
  document.head.appendChild(s);
  console.log('[resp] layout celular');
})();
