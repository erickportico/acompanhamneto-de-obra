(function () {
  'use strict';
  if (window.__patchFpdoSlidePersistir2) return;
  window.__patchFpdoSlidePersistir2 = true;

  var K = 'fpdo_slide_edit_v2';
  function pack() { try { return JSON.parse(localStorage.getItem(K) || '{"txt":[],"src":[]}'); } catch (e) { return { txt: [], src: [] }; } }
  function gravar(p) { try { localStorage.setItem(K, JSON.stringify(p)); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent =
    '#p94Lupa .p94-t,#p94Lupa [contenteditable],#p94Lupa .p94-folha p,#p94Lupa .p94-folha span{' +
    'color:#111!important;font-weight:400!important;-webkit-text-fill-color:#111!important}' +
    '#p94Lupa .p94-folha [data-apagado]{display:none!important}';
  document.head.appendChild(css);

  function aplicar() {
    var folha = document.querySelector('#p94Lupa .p94-folha');
    if (!folha) return;
    var p = pack();
    folha.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if ((p.src || []).indexOf(src) >= 0) {
        img.setAttribute('data-apagado', '1');
        img.style.display = 'none';
      }
    });
    folha.querySelectorAll('.p94-t, [contenteditable], p, h1, h2, h3, span, div').forEach(function (el) {
      if (el.querySelector('img')) return;
      var t = String(el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && (p.txt || []).indexOf(t) >= 0) {
        el.setAttribute('data-apagado', '1');
        el.style.display = 'none';
      }
    });
  }

  function marcarApagado(el) {
    if (!el) return;
    var p = pack();
    if (el.tagName === 'IMG') {
      var src = el.getAttribute('src') || '';
      if (src && p.src.indexOf(src) < 0) p.src.push(src);
    } else {
      var t = String(el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && p.txt.indexOf(t) < 0) p.txt.push(t);
    }
    el.setAttribute('data-apagado', '1');
    el.style.display = 'none';
    gravar(p);
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button');
    if (!b) return;
    var lab = String(b.textContent || '').trim();
    if (lab !== 'Apagar' && lab.indexOf('Apagar qualquer') < 0) return;
    var folha = document.querySelector('#p94Lupa .p94-folha');
    if (!folha) return;
    var sel = folha.querySelector('.fpdo-sel, [data-sel], .p94-i.ativo') ||
      document.querySelector('#p94Lupa img:hover');
    if (!sel) {
      var ae = document.activeElement;
      if (ae && folha.contains(ae)) sel = ae;
    }
    if (sel) marcarApagado(sel);
  }, true);

  var once = false;
  function botao() {
    if (once || !document.getElementById('p94Lupa')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Salvar edicao do slide';
    b.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483600;background:#ea580c;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:700';
    b.onclick = function () { aplicar(); alert('Exclusoes deste aparelho guardadas.'); };
    document.body.appendChild(b);
    once = true;
  }

  setInterval(function () {
    if (!document.getElementById('p94Lupa')) return;
    botao();
    aplicar();
    document.querySelectorAll('#p94Lupa [contenteditable], #p94Lupa .p94-t').forEach(function (el) {
      el.style.color = '#111';
      el.style.fontWeight = '400';
    });
  }, 900);

  console.log('[slide-persist] texto preto e exclusao lembrada');
})();
