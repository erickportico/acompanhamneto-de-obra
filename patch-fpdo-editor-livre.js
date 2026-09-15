/**
 * FPDO: mover/apagar texto e foto, contra-capa, PDF 16:9, puxar graficos, esconder trena.
 */
(function () {
  'use strict';
  if (window.__patchFpdoEditorLivre2) return;
  window.__patchFpdoEditorLivre = true;
  window.__patchFpdoEditorLivre2 = true;

  function css() {
    if (document.getElementById('fpdoLivreCss')) return;
    var s = document.createElement('style');
    s.id = 'fpdoLivreCss';
    s.textContent =
      '#p94Lupa .p94-i,#p94Lupa .p94-t{cursor:move}' +
      '#p94Lupa .fpdo-sel{outline:2px solid #ea580c!important}' +
      '#fpdoLivreBar{display:flex;gap:6px;flex-wrap:wrap;padding:6px 10px}' +
      '.fpdo-trena{position:absolute;width:180px;height:auto;z-index:6;cursor:move}';
    document.head.appendChild(s);
  }

  function folhas() {
    return [].slice.call(document.querySelectorAll('#p94Lupa .p94-folha'));
  }

  function esconderTrena() {}

  function barra() {
    var fundo = document.getElementById('p94Fundo') || document.getElementById('p94Lupa');
    if (!fundo || document.getElementById('fpdoLivreBar')) return;
    var b = document.createElement('div');
    b.id = 'fpdoLivreBar';
    b.innerHTML =
      '<button type="button" id="fpdoBtnContra">Contra-capa</button>' +
      '<button type="button" id="fpdoBtnGraf">Puxar graficos do painel</button>' +
      '<button type="button" id="fpdoBtnPdf">PDF no tamanho do slide</button>' +
      '<button type="button" id="fpdoBtnApaga">Apagar item selecionado</button>' +
      '<button type="button" id="fpdoBtnTrena">Colocar trena no slide</button>' +
      '<input id="fpdoTrenaFile" type="file" accept="image/*" style="display:none">';
    var host = fundo.querySelector('.p94-barra') || fundo.firstChild;
    if (host && host.parentNode) host.parentNode.insertBefore(b, host.nextSibling);
    else fundo.insertBefore(b, fundo.firstChild);
    document.getElementById('fpdoBtnContra').onclick = contraCapa;
    document.getElementById('fpdoBtnGraf').onclick = puxarGraf;
    document.getElementById('fpdoBtnPdf').onclick = pdfSlide;
    document.getElementById('fpdoBtnApaga').onclick = apagarSel;
    document.getElementById('fpdoBtnTrena').onclick = function () {
      document.getElementById('fpdoTrenaFile').click();
    };
    document.getElementById('fpdoTrenaFile').onchange = function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var r = new FileReader();
      r.onload = function () {
        var ls = folhas();
        var alvo = document.querySelector('#p94Lupa .p94-folha.fpdo-sel') || ls[ls.length - 1] || ls[0];
        if (!alvo) { alert('Abra Ver slides.'); return; }
        var img = document.createElement('img');
        img.className = 'fpdo-trena fpdo-sel-alvo';
        img.src = r.result;
        img.style.position = 'absolute';
        img.style.left = '70%';
        img.style.top = '82%';
        alvo.appendChild(img);
        marcar(img);
      };
      r.readAsDataURL(file);
    };
  }

  function contraCapa() {
    var ls = folhas();
    if (!ls.length) { alert('Abra Ver slides.'); return; }
    var molde = ls[0];
    var n = molde.cloneNode(true);
    n.classList.add('fpdo-contra');
    var tit = n.querySelector('.p94-t');
    if (tit) tit.textContent = 'DADOS DA OBRA';
    molde.parentNode.insertBefore(n, molde.nextSibling);
  }

  function puxarGraf() {
    var ids = ['chartLiberacao', 'chartFabricacao', 'chartInstalacao', 'chartResumo'];
    var ls = folhas();
    var alvo = ls[ls.length - 2] || ls[ls.length - 1];
    if (!alvo) { alert('Abra Ver slides.'); return; }
    var ok = 0;
    ids.forEach(function (id) {
      var c = document.getElementById(id);
      if (!c || !c.toDataURL) return;
      var img = document.createElement('img');
      img.src = c.toDataURL('image/png');
      img.style.cssText = 'position:absolute;left:8%;top:' + (10 + ok * 22) + '%;width:84%;height:20%;object-fit:contain;background:#fff';
      img.className = 'fpdo-sel-alvo';
      alvo.appendChild(img);
      ok++;
    });
    if (!ok) alert('Abra a aba Graficos e Relatorios nesta obra e tente de novo.');
  }

  function pdfSlide() {
    var vis = document.querySelector('#p94Lupa .p94-folha');
    if (!vis) { alert('Abra Ver slides.'); return; }
    var w = window.open('', '_blank');
    w.document.write('<title>FPDO slide</title><style>@page{size:338.67mm 190.5mm;margin:0}html,body{margin:0;background:#fff}img,div{max-width:100%}</style>');
    w.document.write(vis.outerHTML);
    w.document.close();
    w.focus();
    w.print();
  }

  var sel = null;
  function marcar(el) {
    document.querySelectorAll('.fpdo-sel').forEach(function (n) { n.classList.remove('fpdo-sel'); });
    sel = el;
    if (sel) sel.classList.add('fpdo-sel');
  }

  function apagarSel() {
    if (!sel) { alert('Clique no texto ou na foto.'); return; }
    if (!confirm('Apagar este item?')) return;
    sel.remove();
    sel = null;
  }

  var drag = null;
  document.addEventListener('pointerdown', function (ev) {
    var lupa = document.getElementById('p94Lupa');
    if (!lupa || !lupa.contains(ev.target)) return;
    var el = ev.target.closest && ev.target.closest('.p94-i, .p94-t, img');
    if (!el || el.tagName === 'BUTTON') return;
    if (el.tagName === 'IMG' && !el.classList.contains('p94-t')) {
      el = el.closest('.p94-i') || el;
    }
    marcar(el);
    var r = el.getBoundingClientRect();
    var folha = el.closest('.p94-folha');
    if (!folha) return;
    var fr = folha.getBoundingClientRect();
    el.style.position = 'absolute';
    drag = { el: el, x: ev.clientX, y: ev.clientY, l: r.left - fr.left, t: r.top - fr.top, fr: fr };
    ev.preventDefault();
  }, true);

  document.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var dx = ev.clientX - drag.x;
    var dy = ev.clientY - drag.y;
    drag.el.style.left = (drag.l + dx) + 'px';
    drag.el.style.top = (drag.t + dy) + 'px';
    drag.el.style.right = 'auto';
    drag.el.style.bottom = 'auto';
  }, true);

  document.addEventListener('pointerup', function () { drag = null; }, true);

  setInterval(function () {
    css();
    if (document.getElementById('p94Lupa')) { barra(); esconderTrena(); }
  }, 1200);

  console.log('[fpdo-livre] mover, apagar, contra, pdf, graficos');
})();
