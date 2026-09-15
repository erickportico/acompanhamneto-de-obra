(function () {
  'use strict';
  if (window.__patchFpdoGrafInserir2) return;
  window.__patchFpdoGrafInserir = true;
  window.__patchFpdoGrafInserir2 = true;

  var K = 'fpdo_graf_extra_v1';
  function ler() {
    try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch (e) { return []; }
  }
  function gravar(a) {
    try { localStorage.setItem(K, JSON.stringify(a)); } catch (e) {
      alert('Cota cheia. Use uma imagem menor.');
    }
  }

  var hide = document.createElement('style');
  hide.textContent = '#fpdoBtnGrafPe,#fpdoGrafPreview{display:none!important}';
  document.head.appendChild(hide);

  function dest() { return document.getElementById('fpdoGrafDest'); }

  function desenhar() {
    var d = dest();
    if (!d) return;
    d.innerHTML = '';
    ler().forEach(function (item, i) {
      var w = document.createElement('figure');
      w.style.cssText = 'margin:0;background:#fff;border-radius:8px;overflow:hidden;position:relative';
      w.innerHTML = '<img src="' + item.src + '" style="width:100%;display:block">' +
        '<figcaption style="padding:4px 8px;font-size:12px">' + (item.titulo || '') + '</figcaption>' +
        '<button type="button" data-i="' + i + '" style="position:absolute;top:4px;right:4px">x</button>';
      w.querySelector('button').onclick = function () {
        var a = ler(); a.splice(i, 1); gravar(a); desenhar();
      };
      d.appendChild(w);
    });
  }

  function add(src, titulo) {
    var a = ler();
    a.push({ src: src, titulo: titulo || '' });
    gravar(a);
    desenhar();
  }

  function caixa() {
    var g = document.getElementById('p92Graf');
    if (!g) return;
    if (!document.getElementById('fpdoGrafBar')) {
      var bar = document.createElement('div');
      bar.id = 'fpdoGrafBar';
      bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px';
      bar.innerHTML =
        '<button type="button" class="p92-btn p92-btn-ok" id="fgPainel">Inserir do painel</button>' +
        '<button type="button" class="p92-btn" id="fgArq">Inserir imagem</button>' +
        '<button type="button" class="p92-btn" id="fgMes">Usar instalacao do mes</button>' +
        '<input type="file" id="fgFile" accept="image/*" style="display:none">';
      g.parentNode.insertBefore(bar, g);
      var box = document.createElement('div');
      box.id = 'fpdoGrafDest';
      box.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px';
      g.parentNode.insertBefore(box, g.nextSibling);
      document.getElementById('fgPainel').onclick = function () {
        var ids = ['chartLiberacao', 'chartFabricacao', 'chartInstalacao', 'chartResumo'];
        var n = 0;
        ids.forEach(function (id) {
          var c = document.getElementById(id);
          if (!c || !c.toDataURL) return;
          try { add(c.toDataURL('image/png'), id.replace('chart', '')); n++; } catch (e) {}
        });
        if (!n) alert('Abra Menu > Graficos e Relatorios e clique de novo.');
      };
      document.getElementById('fgArq').onclick = function () { document.getElementById('fgFile').click(); };
      document.getElementById('fgFile').onchange = function () {
        var f = this.files && this.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () { add(r.result, f.name); };
        r.readAsDataURL(f);
        this.value = '';
      };
      document.getElementById('fgMes').onclick = function () {
        var c = document.getElementById('chartInstalacao') || document.getElementById('chartResumo');
        if (c && c.toDataURL) { try { add(c.toDataURL('image/png'), 'Instalacao do mes'); return; } catch (e) {} }
        alert('Abra Graficos e Relatorios (instalacao) primeiro.');
      };
    }
    desenhar();
  }

  function noSlide() {
    var folha = document.querySelector('#p94Lupa .p94-folha');
    var imp = document.getElementById('p92Impressao');
    var lista = ler();
    if (!lista.length) return;
    function poe(pai) {
      if (!pai || pai.querySelector('[data-fpdo-graf-extra]')) return;
      lista.forEach(function (item) {
        var img = document.createElement('img');
        img.src = item.src;
        img.setAttribute('data-fpdo-graf-extra', '1');
        img.style.cssText = 'width:46%;margin:2%;background:#fff';
        pai.appendChild(img);
      });
    }
    if (folha) poe(folha);
    if (imp) poe(imp);
  }

  setInterval(function () {
    if (document.getElementById('p92Fundo')) caixa();
    if (document.getElementById('p94Lupa') || document.getElementById('p92Impressao')) noSlide();
  }, 1000);
  console.log('[fpdo-graf] persistencia + slides');
})();
