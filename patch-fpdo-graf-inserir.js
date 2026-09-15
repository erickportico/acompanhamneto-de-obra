(function () {
  'use strict';
  if (window.__patchFpdoGrafInserir) return;
  window.__patchFpdoGrafInserir = true;

  function caixa() {
    var g = document.getElementById('p92Graf');
    if (!g || document.getElementById('fpdoGrafBar')) return;
    var bar = document.createElement('div');
    bar.id = 'fpdoGrafBar';
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px';
    bar.innerHTML =
      '<button type="button" class="p92-btn p92-btn-ok" id="fgPainel">Inserir do painel</button>' +
      '<button type="button" class="p92-btn" id="fgArq">Inserir imagem</button>' +
      '<button type="button" class="p92-btn" id="fgMes">Usar instalacao do mes</button>' +
      '<input type="file" id="fgFile" accept="image/*" style="display:none">';
    g.parentNode.insertBefore(bar, g);
    var dest = document.createElement('div');
    dest.id = 'fpdoGrafDest';
    dest.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px';
    g.parentNode.insertBefore(dest, g.nextSibling);

    function poe(src, titulo) {
      var w = document.createElement('figure');
      w.style.cssText = 'margin:0;background:#fff;border-radius:8px;overflow:hidden;position:relative';
      w.innerHTML = '<img src="' + src + '" style="width:100%;display:block">' +
        '<figcaption style="padding:4px 8px;font-size:12px;color:#334155">' + (titulo || '') + '</figcaption>' +
        '<button type="button" style="position:absolute;top:4px;right:4px">x</button>';
      w.querySelector('button').onclick = function () { w.remove(); };
      dest.appendChild(w);
    }

    document.getElementById('fgPainel').onclick = function () {
      var ids = ['chartLiberacao', 'chartFabricacao', 'chartInstalacao', 'chartResumo'];
      var n = 0;
      ids.forEach(function (id) {
        var c = document.getElementById(id);
        if (!c || !c.toDataURL) return;
        try { poe(c.toDataURL('image/png'), id.replace('chart', '')); n++; } catch (e) {}
      });
      if (!n) alert('Abra Menu > Graficos e Relatorios, espere as barras e clique de novo.');
    };
    document.getElementById('fgArq').onclick = function () {
      document.getElementById('fgFile').click();
    };
    document.getElementById('fgFile').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { poe(r.result, f.name); };
      r.readAsDataURL(f);
      this.value = '';
    };
    document.getElementById('fgMes').onclick = function () {
      var c = document.getElementById('chartInstalacao') || document.getElementById('chartResumo');
      if (c && c.toDataURL) {
        try { poe(c.toDataURL('image/png'), 'Instalacao do mes'); return; } catch (e) {}
      }
      alert('Abra Graficos e Relatorios (instalacao) e tente de novo. Se estiver zerado, nao ha dados do mes.');
    };
  }

  setInterval(caixa, 1000);
  console.log('[fpdo-graf] 3 formas de inserir');
})();
