/**
 * Enquadramento FPDO: nao regrava o banco inteiro (estoura cota).
 * Guarda so zoom/posicao e aplica capa em tela cheia.
 */
(function () {
  'use strict';
  if (window.__patchFpdoEnqSalvar) return;
  window.__patchFpdoEnqSalvar = true;

  var K = 'p96_enq_leve_v1';

  function ler() {
    try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; }
  }
  function gravar(o) {
    try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {
      try { sessionStorage.setItem(K, JSON.stringify(o)); } catch (e2) {}
    }
  }

  if (!document.getElementById('fpdoEnqCss')) {
    var st = document.createElement('style');
    st.id = 'fpdoEnqCss';
    st.textContent =
      '#p94Lupa .p94-folha .p94-i img,#p94Impr .p94-folha .p94-i img{' +
      'object-fit:cover!important;width:100%!important;height:100%!important}' +
      '.p94-folha.fpdo-capa-cheia,.p94-folha.fpdo-capa-cheia .p94-i{' +
      'position:absolute!important;inset:0!important;width:100%!important;height:100%!important}' +
      '.p94-folha.fpdo-capa-cheia img{object-fit:cover!important}';
    document.head.appendChild(st);
  }

  var raw = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    try {
      return raw.call(this, k, v);
    } catch (e) {
      if (String(e) && String(e).indexOf('Quota') >= 0) {
        console.warn('[fpdo-enq] cota cheia em', k, '— enquadramento vai no chave leve');
        window.__fpdoQuota = true;
        return;
      }
      throw e;
    }
  };

  function aplicarCapaCheia() {
    var folhas = document.querySelectorAll('#p94Lupa .p94-folha, #p94Impr .p94-folha');
    if (!folhas.length) return;
    var primeira = folhas[0];
    primeira.classList.add('fpdo-capa-cheia');
    var img = primeira.querySelector('img');
    if (img) {
      img.style.objectFit = 'cover';
      img.style.width = '100%';
      img.style.height = '100%';
    }
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest('button');
    if (!t) return;
    var txt = String(t.textContent || '');
    var a = t.getAttribute('data-p96a') || t.getAttribute('data-p117a') || '';
    if (a !== 'salvar' && txt.indexOf('Salvar enquadramento') < 0 && txt !== 'Salvar') return;
    var zoom = document.getElementById('p96Zoom') || document.querySelector('#p117Cx input[type=range]');
    var chk = document.getElementById('p96Cheio');
    var o = ler();
    o.ultimo = {
      zoom: zoom ? zoom.value : null,
      cheio: chk ? !!chk.checked : true,
      quando: Date.now()
    };
    gravar(o);
    setTimeout(aplicarCapaCheia, 200);
    setTimeout(aplicarCapaCheia, 800);
    console.log('[fpdo-enq] ajuste guardado na chave leve');
  }, true);

  setInterval(aplicarCapaCheia, 2500);
  console.log('[fpdo-enq] salvar enquadramento sem estourar obrasDB');
})();
