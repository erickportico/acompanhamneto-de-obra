(function () {
  'use strict';
  if (window.__patchHeaderContrato20260915c) return;
  window.__patchHeaderContrato20260915 = true;
  window.__patchHeaderContrato20260915c = true;

  var css = document.getElementById('hdrContratoCss') || document.createElement('style');
  css.id = 'hdrContratoCss';
  css.textContent =
    'header{display:flex;flex-direction:column;gap:10px}' +
    '.header-title-container{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}' +
    '.header-badges-right{display:flex;flex-direction:column;align-items:flex-end}' +
    '.project-selector{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px;width:100%;box-sizing:border-box}' +
    '.project-selector .hdr-esq,.project-selector .hdr-dir{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
    '.project-selector select,.project-selector button,#statusNuvem{' +
    'height:36px!important;min-height:36px!important;box-sizing:border-box!important;' +
    'padding:0 12px!important;line-height:34px!important;display:inline-flex!important;' +
    'align-items:center!important;justify-content:center!important;text-align:center!important;' +
    'border-radius:8px!important;font-size:13px!important;font-weight:600!important;margin:0!important}' +
    '.project-selector select{padding-right:28px!important}';
  if (!css.parentNode) document.head.appendChild(css);

  function montar() {
    var bar = document.querySelector('.project-selector');
    if (!bar) return;
    var esq = document.getElementById('hdrEsq');
    var dir = document.getElementById('hdrDir');
    if (!esq) {
      esq = document.createElement('div');
      esq.id = 'hdrEsq';
      esq.className = 'hdr-esq';
      bar.insertBefore(esq, bar.firstChild);
    }
    if (!dir) {
      dir = document.createElement('div');
      dir.id = 'hdrDir';
      dir.className = 'hdr-dir';
      bar.appendChild(dir);
    }
    var sel = document.getElementById('selectObra');
    if (sel && sel.parentNode !== esq) esq.appendChild(sel);
    bar.querySelectorAll('button').forEach(function (b) {
      var t = String(b.textContent || '');
      if (/Gerenciar Obra|Nova Obra|🗑|Excluir/.test(t) || b.classList.contains('danger')) {
        if (b.parentNode !== esq) esq.appendChild(b);
      }
    });
    var st = document.getElementById('statusNuvem');
    if (st && st.parentNode !== dir) dir.appendChild(st);
    var th = document.getElementById('btnThemeToggle');
    if (th && th.parentNode !== dir) dir.appendChild(th);
    bar.querySelectorAll('button').forEach(function (b) {
      if (String(b.textContent || '').indexOf('Carregar Nuvem') >= 0 && b.parentNode !== dir) dir.appendChild(b);
    });
    var extra = document.getElementById('hdrAcoesNuvem');
    if (extra) {
      while (extra.firstChild) dir.appendChild(extra.firstChild);
    }
  }

  montar();
  setTimeout(montar, 600);
  console.log('[header] faixa obra esquerda / nuvem direita, mesma altura');
})();
