/**
 * Enquadramento FPDO: nao regrava o banco inteiro (estoura cota).
 * Guarda so zoom/posicao e aplica capa em tela cheia.
 */
(function () {
  'use strict';
  if (window.__patchFpdoEnqSalvar2) return;
  window.__patchFpdoEnqSalvar = true;
  window.__patchFpdoEnqSalvar2 = true;

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
      '#p94Lupa .p94-folha.fpdo-capa-cheia,' +
      '#p94Impr .p94-folha.fpdo-capa-cheia{' +
      'position:relative!important}' +
      '#p94Lupa .p94-folha.fpdo-capa-cheia .p94-i,' +
      '#p94Impr .p94-folha.fpdo-capa-cheia .p94-i{' +
      'position:absolute!important;left:0!important;top:0!important;' +
      'width:100%!important;height:100%!important;max-width:none!important;' +
      'max-height:none!important;border:0!important;background:transparent!important;z-index:1}' +
      '#p94Lupa .p94-folha.fpdo-capa-cheia .p94-i img,' +
      '#p94Impr .p94-folha.fpdo-capa-cheia .p94-i img{' +
      'object-fit:cover!important;width:100%!important;height:100%!important}' +
      '#p94Lupa .p94-folha.fpdo-capa-cheia .p94-t{z-index:2}';
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

  function encher(folha) {
    if (!folha) return;
    folha.classList.add('fpdo-capa-cheia');
    var caixas = folha.querySelectorAll('.p94-i');
    for (var i = 0; i < caixas.length; i++) {
      caixas[i].style.left = '0';
      caixas[i].style.top = '0';
      caixas[i].style.width = '100%';
      caixas[i].style.height = '100%';
    }
    var imgs = folha.querySelectorAll('img');
    for (var j = 0; j < imgs.length; j++) {
      imgs[j].style.objectFit = 'cover';
      imgs[j].style.width = '100%';
      imgs[j].style.height = '100%';
    }
  }

  function aplicarCapaCheia() {
    var folhas = document.querySelectorAll('#p94Lupa .p94-folha, #p94Impr .p94-folha');
    if (!folhas.length) return;
    encher(folhas[0]);
    if (folhas[1]) encher(folhas[1]);
    if (folhas.length > 2) encher(folhas[folhas.length - 1]);
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
