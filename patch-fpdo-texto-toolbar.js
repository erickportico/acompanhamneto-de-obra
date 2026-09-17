(function () {
  'use strict';
  if (window.__patchFpdoTextoToolbar2) return;
  window.__patchFpdoTextoToolbar2 = true;

  var alvo = null;

  var css = document.createElement('style');
  css.textContent =
    '#fpdoTxtBar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483601;' +
    'display:none!important;gap:6px;align-items:center;background:#0f172a;color:#fff;padding:8px 10px;border-radius:10px;' +
    'box-shadow:0 8px 24px #000;font:13px Segoe UI,Arial}' +
    'body.fpdo-txt-on #fpdoTxtBar{display:flex!important;flex-wrap:wrap}' +
    '#fpdoTxtBar button,#fpdoTxtBar select,#fpdoTxtBar input{height:32px;border-radius:6px;border:0;padding:0 8px}';
  document.head.appendChild(css);

  function bar() {
    var b = document.getElementById('fpdoTxtBar');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'fpdoTxtBar';
    b.innerHTML =
      '<span>Texto</span>' +
      '<select id="fpdoTxtTam">' +
      '<option value="12">12</option><option value="14">14</option><option value="16" selected>16</option>' +
      '<option value="20">20</option><option value="24">24</option><option value="32">32</option></select>' +
      '<input id="fpdoTxtCor" type="color" value="#111111">' +
      '<button type="button" id="fpdoTxtN">N</button>' +
      '<button type="button" id="fpdoTxtB"><b>B</b></button>' +
      '<button type="button" id="fpdoTxtApagar">Apagar item</button>' +
      '<button type="button" id="fpdoTxtFecha">Fechar</button>';
    document.body.appendChild(b);
    document.getElementById('fpdoTxtTam').onchange = function () {
      if (!alvo) return;
      alvo.style.fontSize = this.value + 'px';
    };
    document.getElementById('fpdoTxtCor').oninput = function () {
      if (!alvo) return;
      alvo.style.color = this.value;
      alvo.style.webkitTextFillColor = this.value;
    };
    document.getElementById('fpdoTxtN').onclick = function () { if (alvo) alvo.style.fontWeight = '400'; };
    document.getElementById('fpdoTxtB').onclick = function () { if (alvo) alvo.style.fontWeight = '700'; };
    document.getElementById('fpdoTxtApagar').onclick = function () {
      if (!alvo) return;
      alvo.remove();
      alvo = null;
      fechar();
    };
    document.getElementById('fpdoTxtFecha').onclick = fechar;
    return b;
  }

  function fechar() {
    document.body.classList.remove('fpdo-txt-on');
    alvo = null;
  }
  function abrir() { bar(); document.body.classList.add('fpdo-txt-on'); }

  document.addEventListener('pointerdown', function (ev) {
    if (ev.target.closest && ev.target.closest('#fpdoTxtBar')) return;
    var lupa = document.getElementById('p94Lupa');
    if (!lupa || lupa.offsetParent === null) { fechar(); return; }
    if (!lupa.contains(ev.target)) { fechar(); return; }
    var el = ev.target.closest('img, .p94-t, [contenteditable], p, h1, h2, h3, span');
    if (!el) return;
    alvo = el;
    if (el.tagName !== 'IMG') el.setAttribute('contenteditable', 'true');
    abrir();
  }, true);

  setInterval(function () {
    var lupa = document.getElementById('p94Lupa');
    if (!lupa || lupa.offsetParent === null) fechar();
  }, 600);

  console.log('[fpdo-txt] barra so no Ver slides');
})();
