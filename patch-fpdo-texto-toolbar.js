(function () {
  'use strict';
  if (window.__patchFpdoTextoToolbar3) return;
  window.__patchFpdoTextoToolbar3 = true;

  var alvo = null;

  var css = document.createElement('style');
  css.textContent =
    '#fpdoTxtBar{position:fixed;left:50%;top:72px;bottom:auto;transform:translateX(-50%);z-index:2147483601;' +
    'display:none!important;gap:6px;align-items:center;background:#0f172a;color:#fff;padding:8px 10px;border-radius:10px;' +
    'box-shadow:0 8px 24px #000;font:13px Segoe UI,Arial}' +
    'body.fpdo-txt-on #p94Lupa #fpdoTxtBar{display:flex!important}' +
    'body.fpdo-txt-on:has(#p94Lupa:hover) #fpdoTxtBar,body.fpdo-slide-on #fpdoTxtBar{display:flex!important;flex-wrap:wrap}' +
    '#fpdoTxtBar button,#fpdoTxtBar select,#fpdoTxtBar input{height:32px;border-radius:6px;border:0;padding:0 8px}';
  document.head.appendChild(css);

  function slideAberto() {
    var l = document.getElementById('p94Lupa');
    if (!l) return false;
    var st = window.getComputedStyle(l);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    var r = l.getBoundingClientRect();
    return r.width > 80 && r.height > 80;
  }

  function fechar() {
    document.body.classList.remove('fpdo-txt-on', 'fpdo-slide-on');
    var b = document.getElementById('fpdoTxtBar');
    if (b) b.style.display = 'none';
    alvo = null;
  }

  function bar() {
    var b = document.getElementById('fpdoTxtBar');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'fpdoTxtBar';
    b.innerHTML =
      '<span>Texto</span>' +
      '<select id="fpdoTxtTam"><option>12</option><option>14</option><option selected>16</option><option>20</option><option>24</option><option>32</option></select>' +
      '<input id="fpdoTxtCor" type="color" value="#111111">' +
      '<button type="button" id="fpdoTxtN">N</button>' +
      '<button type="button" id="fpdoTxtB"><b>B</b></button>' +
      '<button type="button" id="fpdoTxtCopia">Copiar</button>' +
      '<button type="button" id="fpdoTxtCola">Colar</button>' +
      '<button type="button" id="fpdoTxtApagar">Apagar item</button>' +
      '<button type="button" id="fpdoTxtFecha">Fechar</button>';
    document.body.appendChild(b);
    document.getElementById('fpdoTxtTam').onchange = function () { if (alvo) alvo.style.fontSize = this.value + 'px'; };
    document.getElementById('fpdoTxtCor').oninput = function () { if (alvo) { alvo.style.color = this.value; alvo.style.webkitTextFillColor = this.value; } };
    document.getElementById('fpdoTxtN').onclick = function () { if (alvo) alvo.style.fontWeight = '400'; };
    document.getElementById('fpdoTxtB').onclick = function () { if (alvo) alvo.style.fontWeight = '700'; };
    document.getElementById('fpdoTxtCopia').onclick = function () {
      var t = alvo ? (alvo.tagName === 'IMG' ? alvo.src : alvo.innerText) : '';
      if (t && navigator.clipboard) navigator.clipboard.writeText(t);
    };
    document.getElementById('fpdoTxtCola').onclick = function () { colar(); };
    document.getElementById('fpdoTxtApagar').onclick = function () { if (alvo) alvo.remove(); alvo = null; };
    document.getElementById('fpdoTxtFecha').onclick = fechar;
    return b;
  }

  function colar(ev) {
    var folha = document.querySelector('#p94Lupa .p94-folha');
    if (!folha || !slideAberto()) return;
    var dt = ev && ev.clipboardData;
    function texto(t) {
      var d = document.createElement('div');
      d.className = 'p94-t';
      d.setAttribute('contenteditable', 'true');
      d.textContent = t;
      d.style.cssText = 'position:absolute;left:10%;top:20%;color:#111;font-size:16px;font-weight:400;z-index:5';
      folha.appendChild(d);
      alvo = d;
    }
    function img(src) {
      var i = document.createElement('img');
      i.src = src;
      i.style.cssText = 'position:absolute;left:8%;top:18%;width:40%;z-index:5';
      folha.appendChild(i);
      alvo = i;
    }
    if (dt) {
      if (dt.files && dt.files[0] && dt.files[0].type.indexOf('image') === 0) {
        var r = new FileReader();
        r.onload = function () { img(r.result); };
        r.readAsDataURL(dt.files[0]);
        ev.preventDefault();
        return;
      }
      var txt = dt.getData('text/plain');
      if (txt) { texto(txt); ev.preventDefault(); }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { if (t) texto(t); }).catch(function () {});
    }
  }

  document.addEventListener('paste', function (ev) {
    if (slideAberto()) colar(ev);
  }, true);

  document.addEventListener('pointerdown', function (ev) {
    if (ev.target.closest && ev.target.closest('#fpdoTxtBar')) return;
    if (!slideAberto()) { fechar(); return; }
    var lupa = document.getElementById('p94Lupa');
    if (!lupa.contains(ev.target)) { fechar(); return; }
    var el = ev.target.closest('img, .p94-t, [contenteditable], p, h1, h2, h3, span');
    if (!el) return;
    alvo = el;
    bar();
    document.body.classList.add('fpdo-slide-on');
    bar().style.display = 'flex';
  }, true);

  setInterval(function () {
    if (!slideAberto()) fechar();
  }, 400);

  fechar();
  console.log('[fpdo-txt] copiar colar so no slide');
})();
