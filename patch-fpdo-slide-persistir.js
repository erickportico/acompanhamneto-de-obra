(function () {
  'use strict';
  if (window.__patchFpdoSlidePersistir) return;
  window.__patchFpdoSlidePersistir = true;

  var K = 'fpdo_slide_edit_v1';

  function chave() {
    var t = document.querySelector('#p94Lupa, [class*="p94"]');
    var obra = (document.getElementById('obraTitle') || {}).textContent || '';
    return obra + '|' + (document.querySelector('#p92Fundo h2, #p92Fundo .p92-topo') || {}).textContent;
  }

  function pack() {
    try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; }
  }
  function savePack(p) {
    try { localStorage.setItem(K, JSON.stringify(p)); } catch (e) { console.warn('slide persist cota', e); }
  }

  function snapshot() {
    var folha = document.querySelector('#p94Lupa .p94-folha');
    if (!folha) return;
    var itens = [];
    folha.querySelectorAll('img, .p94-t, [contenteditable]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      var fr = folha.getBoundingClientRect();
      itens.push({
        tag: el.tagName,
        src: el.getAttribute('src') || '',
        txt: el.tagName === 'IMG' ? '' : (el.textContent || '').slice(0, 200),
        hide: el.style.display === 'none' || el.hasAttribute('data-apagado'),
        l: ((r.left - fr.left) / fr.width * 100).toFixed(2),
        t: ((r.top - fr.top) / fr.height * 100).toFixed(2),
        w: (r.width / fr.width * 100).toFixed(2),
        h: (r.height / fr.height * 100).toFixed(2)
      });
    });
    var p = pack();
    p[chave()] = { itens: itens, apagados: window.__fpdoApagados || [] };
    savePack(p);
    console.log('[slide-persist] gravado', itens.length);
  }

  function apply() {
    var folha = document.querySelector('#p94Lupa .p94-folha');
    if (!folha) return;
    var rec = pack()[chave()];
    if (!rec) return;
    var ap = rec.apagados || [];
    window.__fpdoApagados = ap;
    folha.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (ap.indexOf(src) >= 0) {
        img.setAttribute('data-apagado', '1');
        img.style.display = 'none';
      }
    });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button');
    if (!b) return;
    var t = String(b.textContent || '');
    if (/^Apagar$/i.test(t.trim()) || /Apagar qualquer/i.test(t)) {
      var sel = document.querySelector('#p94Lupa .fpdo-sel, #p94Lupa img:hover, #p94Lupa [contenteditable]:focus');
      if (sel && sel.tagName === 'IMG') {
        var src = sel.getAttribute('src') || '';
        window.__fpdoApagados = window.__fpdoApagados || [];
        if (src && window.__fpdoApagados.indexOf(src) < 0) window.__fpdoApagados.push(src);
        sel.style.display = 'none';
        sel.setAttribute('data-apagado', '1');
      } else if (sel) {
        sel.remove();
      }
      snapshot();
    }
  }, true);

  var btnOk = false;
  function barra() {
    if (btnOk || !document.getElementById('p94Lupa')) return;
    var bar = document.querySelector('#p94Lupa') && document.querySelector('#p94Lupa').previousElementSibling;
    var host = document.querySelector('#p94Lupa');
    if (!host) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'p92-btn p92-btn-ok';
    b.textContent = 'Salvar edicao do slide';
    b.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483600';
    b.onclick = function () { snapshot(); alert('Edicao deste slide guardada neste aparelho.'); };
    document.body.appendChild(b);
    btnOk = true;
  }

  setInterval(function () {
    if (document.getElementById('p94Lupa')) { barra(); apply(); }
  }, 1200);

  window.addEventListener('beforeunload', snapshot);
  console.log('[slide-persist] salvar edicao + excluir');
})();
