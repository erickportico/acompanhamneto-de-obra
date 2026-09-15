(function () {
  'use strict';
  if (window.__patchPainelResponsivo3) return;
  window.__patchPainelResponsivo3 = true;

  var old = document.getElementById('painelRespCss');
  if (old) old.remove();
  var s = document.createElement('style');
  s.id = 'painelRespCss';
  s.textContent = [
    '@media (max-width:900px){',
    '#p92Fundo{position:fixed!important;inset:0!important;z-index:2147482000!important;',
    'display:flex!important;flex-direction:column!important;padding:6px!important}',
    '#p92Pe{order:99;flex:0 0 auto!important;max-height:22vh;overflow:auto;',
    'display:flex!important;flex-wrap:wrap;gap:6px;padding:6px;background:#0b1220}',
    '#p92Fundo .p92-miolo,#p92Fundo .p92-corpo{flex:1;overflow:auto}',
    '}',
    '@media (min-width:901px){#fpdoMaisWrap{display:none!important}}'
  ].join('');
  document.head.appendChild(s);

  function compactar() {
    if (window.innerWidth > 900) return;
    var pe = document.getElementById('p92Pe');
    if (!pe) return;
    var wrap = document.getElementById('fpdoMaisWrap');
    if (!wrap) {
      wrap = document.createElement('details');
      wrap.id = 'fpdoMaisWrap';
      wrap.style.cssText = 'flex:1 1 100%;background:#1e293b;border-radius:8px;padding:4px 8px;color:#fff';
      wrap.innerHTML = '<summary style="padding:8px;font-weight:700">Mais acoes</summary><div id="fpdoMaisBox" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0"></div>';
      pe.appendChild(wrap);
    }
    var box = document.getElementById('fpdoMaisBox');
    if (!box) return;
    [].slice.call(pe.querySelectorAll('.p92-btn,button')).forEach(function (b) {
      if (b.closest('#fpdoMaisWrap')) return;
      var t = String(b.textContent || '');
      if (/^Salvar$|^Ver slides$|^Fechar$/i.test(t.trim())) {
        b.style.flex = '1 1 30%';
        b.style.minHeight = '44px';
        return;
      }
      box.appendChild(b);
    });
  }

  setInterval(compactar, 800);
  console.log('[resp] fpdo compacto no celular');
})();
