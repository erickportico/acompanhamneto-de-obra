(function () {
  'use strict';
  if (window.__patchFpdoFotosMover) return;
  window.__patchFpdoFotosMover = true;

  function barra() {
    var top = document.querySelector('#p92Fundo .p92-fotos-top');
    if (!top || document.getElementById('fpdoPassaMes')) return;
    var fundos = document.getElementById('p92Fundo');
    if (!fundos) return;
    var b = document.createElement('button');
    b.id = 'fpdoPassaMes';
    b.type = 'button';
    b.className = 'p92-btn p92-btn-ok';
    b.textContent = 'Proximo mes: DEPOIS vira ANTES';
    b.title = 'Copia as fotos de DEPOIS para ANTES e deixa DEPOIS vazio, sem sobrepor';
    b.onclick = function () {
      var x = fundos.querySelector('[data-a="copiarMes"]');
      if (!x) { alert('Use o botao Copiar do mes anterior no rodape.'); return; }
      if (confirm('As fotos de DEPOIS passam para ANTES.\nDEPOIS fica vazio para as fotos novas.\nContinuar?')) x.click();
    };
    var pe = document.getElementById('p92Pe');
    if (pe) pe.appendChild(b);
  }

  function botoesFoto() {
    document.querySelectorAll('#p92Fundo .p92-foto .p92-fx').forEach(function (fx) {
      if (fx.querySelector('[data-fpdo-sobe]')) return;
      var alvo = (fx.querySelector('[data-alvo]') || {}).getAttribute && fx.querySelector('[data-alvo]').getAttribute('data-alvo') || '';
      var s = document.createElement('button');
      s.type = 'button';
      s.className = 'p92-btn p92-btn-mini';
      s.setAttribute('data-fpdo-sobe', '1');
      s.textContent = 'Sobe';
      s.onclick = function (ev) {
        ev.preventDefault();
        var m = fx.querySelector('[data-a="fmover"][data-d="-1"]');
        if (m) m.click();
      };
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'p92-btn p92-btn-mini';
      d.textContent = 'Desce';
      d.onclick = function (ev) {
        ev.preventDefault();
        var m = fx.querySelector('[data-a="fmover"][data-d="1"]');
        if (m) m.click();
      };
      fx.appendChild(s);
      fx.appendChild(d);
    });
  }

  setInterval(function () {
    if (document.getElementById('p92Fundo')) { barra(); botoesFoto(); }
  }, 1200);
  console.log('[fpdo-fotos] sobe/desce + depois vira antes');
})();
