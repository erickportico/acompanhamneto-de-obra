/**
 * FPDO no roteiro do PPT Portico.
 */
(function () {
  'use strict';
  if (window.__patchFpdoRoteiroPpt) return;
  window.__patchFpdoRoteiroPpt = true;
  window.__patchFpdoModelo20260914 = true;
  window.__patchFpdoModelo20260914b = true;

  var KEY = 'p92_fpdo_roteiro_ppt_v1';
  var FACHADAS = ['Leste', 'Norte', 'Sul', 'Cobertura'];

  function obraNome() {
    try {
      var o = typeof getObraAtual === 'function' ? getObraAtual() : null;
      return (o && o.nome) || '';
    } catch (e) { return ''; }
  }

  function estado() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s) s = {};
    s.capa = s.capa || {};
    s.capa.obra = s.capa.obra || obraNome();
    s.capa.mes = s.capa.mes || 'Agosto 2026';
    s.capa.mesAnt = s.capa.mesAnt || 'Julho';
    s.capa.cliente = s.capa.cliente || '';
    s.capa.local = s.capa.local || '';
    s.capa.responsavel = s.capa.responsavel || '';
    s.capa.gestor = s.capa.gestor || 'Erick dos Santos';
    s.fotos = s.fotos || {};
    s.portico = s.portico || '';
    s.clienteTxt = s.clienteTxt || '';
    s.proxPortico = s.proxPortico || '';
    s.proxCliente = s.proxCliente || '';
    return s;
  }

  function gravar(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function css() {
    if (document.getElementById('fpdoRoteiroCss')) return;
    var el = document.createElement('style');
    el.id = 'fpdoRoteiroCss';
    el.textContent =
      '#fpdoRot{position:fixed;inset:0;z-index:2147482600;background:#1e293b;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif}' +
      '#fpdoRotBar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:8px 10px;background:#0f172a;color:#fff}' +
      '#fpdoRotBar button{border:0;border-radius:8px;padding:8px 12px;background:#ea580c;color:#fff;font-weight:700}' +
      '#fpdoRotBar .off{background:#334155}' +
      '#fpdoRotView{flex:1;overflow:auto;padding:10px}' +
      '.fr-slide{width:min(1100px,100%);margin:0 auto 14px;background:#fff;color:#111;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.25);overflow:hidden}' +
      '.fr-head{display:flex;justify-content:space-between;align-items:center;border:2px solid #111;margin:10px 12px 8px;padding:6px 10px;font-weight:800;letter-spacing:.08em}' +
      '.fr-marca{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#fb923c,#ea580c);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900}' +
      '.fr-title{text-align:center;font-size:22px;font-weight:800;margin:4px 0 8px}' +
      '.fr-meses{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 14px 8px}' +
      '.fr-meses h4{margin:0 0 6px;text-align:center}' +
      '.fr-slot{position:relative;background:#e5e7eb;border:1px solid #cbd5e1;min-height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
      '.fr-slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '.fr-slot span{position:relative;z-index:1;background:rgba(255,255,255,.82);padding:6px 10px;font-weight:700;font-size:13px}' +
      '.fr-slot input[type=file]{position:absolute;inset:0;opacity:0;z-index:2}' +
      '.fr-capa{display:grid;grid-template-columns:1fr 1.2fr;min-height:360px}' +
      '.fr-capa-logo{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:#ececec}' +
      '.fr-capa-logo h1{margin:0;font-size:clamp(22px,4vw,42px);line-height:0.95;text-align:center}' +
      '.fr-contra{display:grid;grid-template-columns:1.1fr 1fr;min-height:360px}' +
      '.fr-contra-txt{padding:28px 22px}' +
      '.fr-contra-txt input,.fr-txt textarea{width:100%;margin:5px 0;padding:8px;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box}' +
      '.fr-txt{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px 16px 18px}' +
      '.fr-txt h3{margin:0 0 6px;color:#b91c1c}' +
      '.fr-txt textarea{min-height:140px}' +
      '.fr-foot{display:flex;justify-content:flex-end;padding:0 14px 10px;font-weight:800;font-size:12px}' +
      '@media(max-width:720px){.fr-capa,.fr-contra,.fr-meses,.fr-txt{grid-template-columns:1fr}}';
    document.head.appendChild(el);
  }

  function slot(s, chave, rotulo, alto) {
    var img = s.fotos[chave];
    return '<label class="fr-slot" style="' + (alto ? ('min-height:' + alto + 'px') : '') + '">' +
      (img ? '<img src="' + img + '" alt="">' : '') +
      '<span>' + rotulo + '</span>' +
      '<input type="file" accept="image/*" capture="environment" data-chave="' + chave + '">' +
      '</label>';
  }

  function abrir() {
    css();
    var s = estado();
    var f = document.getElementById('fpdoRot');
    if (!f) {
      f = document.createElement('div');
      f.id = 'fpdoRot';
      document.body.appendChild(f);
    }
    f.style.display = 'flex';
    var html = '<div id="fpdoRotBar"><strong>FPDO modelo PPT</strong>' +
      '<button type="button" id="fpdoRotSalvar">Salvar</button>' +
      '<button type="button" class="off" id="fpdoRotFechar">Fechar</button></div><div id="fpdoRotView">';

    html += '<div class="fr-slide"><div class="fr-capa"><div class="fr-capa-logo"><h1>FIQUE<br>POR<br>DENTRO<br>DA OBRA</h1><div style="margin-top:16px;font-weight:800;color:#ea580c">PORTICO</div></div>' +
      slot(s, 'capa', 'Toque: foto da capa', 360) + '</div></div>';

    html += '<div class="fr-slide"><div class="fr-contra">' + slot(s, 'contra', 'Toque: fachada da contra-capa', 360) +
      '<div class="fr-contra-txt"><input id="fpdoObra" placeholder="Obra"><input id="fpdoMes" placeholder="Mes atual"><input id="fpdoMesAnt" placeholder="Mes anterior"><input id="fpdoCli" placeholder="Cliente"><input id="fpdoLoc" placeholder="Local"><input id="fpdoResp" placeholder="Responsavel"><input id="fpdoGes" placeholder="Gestor Portico"></div></div></div>';

    FACHADAS.forEach(function (fa) {
      var k = fa.toLowerCase();
      html += '<div class="fr-slide"><div class="fr-head"><b>ANDAMENTO DA OBRA</b><span class="fr-marca">P</span></div>' +
        '<div class="fr-title">ELEVACAO ' + fa.toUpperCase() + '</div><div class="fr-meses"><div><h4>MES ' + (s.capa.mesAnt || 'ANTERIOR').toUpperCase() + '</h4>' +
        slot(s, k + '_ant', 'Toque para foto') + '</div><div><h4>MES ATUAL</h4>' +
        slot(s, k + '_atu', 'Toque para foto') + '</div></div><div class="fr-foot">' + (s.capa.obra || 'OBRA') + '</div></div>';
    });

    html += '<div class="fr-slide"><div class="fr-head"><b>ANDAMENTO DA OBRA</b><span class="fr-marca">P</span></div><div class="fr-title">DESENHO — o que foi montado</div>' +
      slot(s, 'desenho', 'Toque: planta/elevacao grifada', 300) + '<div class="fr-foot">' + (s.capa.obra || 'OBRA') + '</div></div>';

    html += '<div class="fr-slide"><div class="fr-head"><b>ANDAMENTO DA OBRA</b><span class="fr-marca">P</span></div>' +
      '<div class="fr-title">GRAFICOS E INDICADORES</div>' +
      '<div style="padding:0 14px 8px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" id="fpdoPuxarGraf" style="border:0;border-radius:8px;padding:8px 12px;background:#ea580c;color:#fff;font-weight:700">Puxar da aba Graficos</button>' +
      '</div>' +
      '<div id="fpdoGrafPainel" style="padding:0 14px 10px"></div>' +
      slot(s, 'grafico', 'Ou toque: foto / imagem dos graficos', 180) +
      '<div class="fr-foot">' + (s.capa.obra || 'OBRA') + '</div></div>';

    html += '<div class="fr-slide"><div class="fr-head"><b>ANDAMENTO DA OBRA</b><span class="fr-marca">P</span></div><div class="fr-txt"><div><h3>Atividades — PORTICO</h3><textarea id="fpdoPortico"></textarea></div><div><h3>Atividades — CONTRATANTE</h3><textarea id="fpdoClienteTxt"></textarea></div></div></div>';
    html += '<div class="fr-slide"><div class="fr-head"><b>ANDAMENTO DA OBRA</b><span class="fr-marca">P</span></div><div class="fr-txt"><div><h3>Proximas — PORTICO</h3><textarea id="fpdoProxP"></textarea></div><div><h3>Proximas — CONTRATANTE</h3><textarea id="fpdoProxC"></textarea></div></div></div>';
    html += '<div class="fr-slide"><div style="padding:10px 16px;font-weight:800">porticoesquadrias</div>' +
      slot(s, 'final', 'Toque: foto final / fabrica', 280) +
      '<div style="text-align:right;padding:12px 16px;font-weight:800">PORTICO</div></div></div>';

    f.innerHTML = html;
    function set(id, v) { var n = document.getElementById(id); if (n) n.value = v || ''; }
    set('fpdoObra', s.capa.obra); set('fpdoMes', s.capa.mes); set('fpdoMesAnt', s.capa.mesAnt);
    set('fpdoCli', s.capa.cliente); set('fpdoLoc', s.capa.local);
    set('fpdoResp', s.capa.responsavel); set('fpdoGes', s.capa.gestor);
    set('fpdoPortico', s.portico); set('fpdoClienteTxt', s.clienteTxt);
    set('fpdoProxP', s.proxPortico); set('fpdoProxC', s.proxCliente);
    function puxarIndicadores() {
      var box = document.getElementById('fpdoGrafPainel');
      if (!box) return;
      var ids = ['chartLiberacao', 'chartFabricacao', 'chartInstalacao', 'chartResumo'];
      var html = '';
      ids.forEach(function (id) {
        var c = document.getElementById(id);
        if (c && c.toDataURL) {
          try { html += '<img src="' + c.toDataURL('image/png') + '" style="width:100%;background:#fff;margin:0 0 8px;border:1px solid #fed7aa">'; } catch (e) {}
        }
      });
      if (html) {
        box.innerHTML = '<p style="font-size:12px;color:#334155">Copiado da aba Graficos e Relatorios</p>' + html;
        s.indicadores = true;
        gravar(s);
        return;
      }
      var o = null;
      try { o = typeof getObraAtual === 'function' ? getObraAtual() : null; } catch (e) {}
      if (!o || !o.itens || !o.itens.length) {
        box.innerHTML = '<p style="color:#b91c1c">Abra Menu - Graficos e Relatorios nesta obra (deixe os graficos aparecerem) e clique de novo em Puxar.</p>';
        return;
      }
      function pct(i, campo) {
        var q = Number(i.qtd) || 0;
        if (!q) return 0;
        if (campo === 'inst') {
          var at = q * (Number(i.larg) || 0) * (Number(i.alt) || 0);
          var ai = (Number(i.instalado) || 0) * (Number(i.larg) || 0) * (Number(i.alt) || 0);
          return at > 0 ? Math.round(ai / at * 100) : 0;
        }
        return Math.round(((Number(i[campo]) || 0) / q) * 100);
      }
      var blocos = [
        { t: 'LIBERACAO ESQUADRIAS', c: '#f59e0b', k: 'fem' },
        { t: 'FABRICACAO ESQUADRIAS', c: '#3b82f6', k: 'fabricado' },
        { t: 'INSTALACAO ESQUADRIAS', c: '#10b981', k: 'inst' }
      ];
      box.innerHTML = blocos.map(function (b) {
        var barras = o.itens.slice(0, 24).map(function (it) {
          var p = Math.max(0, Math.min(100, pct(it, b.k)));
          return '<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:11px">' +
            '<span style="width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (it.ref || '') + '</span>' +
            '<div style="flex:1;background:#fee2e2;height:10px;border-radius:4px;overflow:hidden"><div style="width:' + p + '%;height:100%;background:' + b.c + '"></div></div>' +
            '<span style="width:36px;text-align:right">' + p + '%</span></div>';
        }).join('');
        return '<div style="margin:0 0 10px;border:1px solid #fed7aa;padding:8px"><b style="color:#c2410c">' + b.t + '</b>' + barras + '</div>';
      }).join('');
      s.indicadores = true;
      gravar(s);
    }
    var btG = document.getElementById('fpdoPuxarGraf');
    if (btG) btG.onclick = puxarIndicadores;
    if (s.indicadores) puxarIndicadores();
    document.getElementById('fpdoRotFechar').onclick = function () { f.style.display = 'none'; };
    document.getElementById('fpdoRotSalvar').onclick = function () {
      s.capa.obra = (document.getElementById('fpdoObra') || {}).value || '';
      s.capa.mes = (document.getElementById('fpdoMes') || {}).value || '';
      s.capa.mesAnt = (document.getElementById('fpdoMesAnt') || {}).value || '';
      s.capa.cliente = (document.getElementById('fpdoCli') || {}).value || '';
      s.capa.local = (document.getElementById('fpdoLoc') || {}).value || '';
      s.capa.responsavel = (document.getElementById('fpdoResp') || {}).value || '';
      s.capa.gestor = (document.getElementById('fpdoGes') || {}).value || '';
      s.portico = (document.getElementById('fpdoPortico') || {}).value || '';
      s.clienteTxt = (document.getElementById('fpdoClienteTxt') || {}).value || '';
      s.proxPortico = (document.getElementById('fpdoProxP') || {}).value || '';
      s.proxCliente = (document.getElementById('fpdoProxC') || {}).value || '';
      gravar(s);
      alert('Modelo PPT salvo neste aparelho.');
    };
    f.querySelectorAll('input[type=file]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var file = inp.files && inp.files[0];
        if (!file) return;
        var r = new FileReader();
        r.onload = function () {
          s.fotos[inp.getAttribute('data-chave')] = r.result;
          gravar(s);
          var lab = inp.parentNode;
          var img = lab.querySelector('img');
          if (!img) { img = document.createElement('img'); lab.insertBefore(img, lab.firstChild); }
          img.src = r.result;
        };
        r.readAsDataURL(file);
      });
    });
  }

  function botao() {
    var pe = document.getElementById('p92Pe');
    if (pe && !document.getElementById('fpdoRotBtn')) {
      var b = document.createElement('button');
      b.id = 'fpdoRotBtn';
      b.className = 'p92-btn p92-btn-ok';
      b.type = 'button';
      b.textContent = 'Modelo PPT (capa a final)';
      b.onclick = abrir;
      pe.appendChild(b);
    }
  }

  if (typeof window.p92AbrirFpdo === 'function' && !window.p92AbrirFpdo.__roteiro) {
    var old = window.p92AbrirFpdo;
    window.p92AbrirFpdo = function () {
      var r = old.apply(this, arguments);
      setTimeout(botao, 400);
      return r;
    };
    window.p92AbrirFpdo.__roteiro = true;
  }
  window.abrirFpdoModelo = abrir;
  setTimeout(botao, 1200);
  console.log('[fpdo-roteiro] abrirFpdoModelo()');
})();
