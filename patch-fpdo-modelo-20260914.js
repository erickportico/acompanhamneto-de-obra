/**
 * Modelo FPDO no padrão do PPT (capa, fachadas antes/depois, fotos no toque).
 * Usa o relatório já salvo pelo P92. Não apaga o editor antigo.
 */
(function () {
  'use strict';
  if (window.__patchFpdoModelo20260914) return;
  window.__patchFpdoModelo20260914 = true;

  var FACHADAS = ['Leste', 'Norte', 'Sul', 'Cobertura'];
  var KEY = 'p92_fpdo_modelo_v1';

  function obraNome() {
    try {
      var o = (typeof getObraAtual === 'function') ? getObraAtual() : null;
      return (o && o.nome) || '';
    } catch (e) { return ''; }
  }

  function estado() {
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s) s = {};
    if (!s.capa) {
      s.capa = {
        obra: obraNome(),
        mes: 'Agosto 2026',
        mesAnt: 'Julho',
        cliente: '',
        local: '',
        responsavel: '',
        gestor: 'Erick dos Santos'
      };
    }
    if (!s.fotos) s.fotos = {};
    if (!s.portico) s.portico = '';
    if (!s.clienteTxt) s.clienteTxt = '';
    if (!s.proxPortico) s.proxPortico = '';
    if (!s.proxCliente) s.proxCliente = '';
    return s;
  }

  function gravar(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function css() {
    if (document.getElementById('fpdoModCss')) return;
    var s = document.createElement('style');
    s.id = 'fpdoModCss';
    s.textContent =
      '#fpdoModFundo{position:fixed;inset:0;z-index:2147482500;background:#0b1220;display:flex;flex-direction:column}' +
      '#fpdoModBar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 12px;background:#111827;color:#fff}' +
      '#fpdoModBar button{border:0;border-radius:8px;padding:8px 12px;background:#2563eb;color:#fff;font-weight:700}' +
      '#fpdoModBar .off{background:#334155}' +
      '#fpdoModView{flex:1;overflow:auto;padding:12px}' +
      '.fpdo-slide{width:min(960px,100%);margin:0 auto 16px;background:#000;color:#fff;border-radius:12px;padding:16px;aspect-ratio:16/9;box-sizing:border-box}' +
      '.fpdo-slide h2{margin:0 0 8px;color:#facc15;font-size:clamp(16px,3vw,28px);text-align:center}' +
      '.fpdo-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;height:calc(100% - 40px)}' +
      '.fpdo-slot{border:1px dashed #64748b;border-radius:10px;min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center;background:#111;position:relative;overflow:hidden}' +
      '.fpdo-slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '.fpdo-slot span{position:relative;z-index:1;color:#facc15;font-weight:700;padding:6px}' +
      '.fpdo-capa input,.fpdo-capa textarea{width:100%;margin:4px 0;padding:8px;border-radius:8px;border:0}' +
      '.fpdo-capa textarea{min-height:70px}' +
      '@media(max-width:700px){.fpdo-grid2{grid-template-columns:1fr}.fpdo-slide{aspect-ratio:auto;min-height:280px}}';
    document.head.appendChild(s);
  }

  function abrir() {
    css();
    var s = estado();
    var f = document.getElementById('fpdoModFundo');
    if (!f) {
      f = document.createElement('div');
      f.id = 'fpdoModFundo';
      document.body.appendChild(f);
    }
    f.style.display = 'flex';
    pintar(s);
  }

  function fechar() {
    var f = document.getElementById('fpdoModFundo');
    if (f) f.style.display = 'none';
  }

  function slot(s, chave, rotulo) {
    var img = s.fotos[chave];
    return '<label class="fpdo-slot">' +
      (img ? '<img src="' + img + '" alt="">' : '') +
      '<span>' + rotulo + '<br><small>Toque para foto</small></span>' +
      '<input type="file" accept="image/*" capture="environment" data-chave="' + chave + '" style="position:absolute;inset:0;opacity:0">' +
      '</label>';
  }

  function pintar(s) {
    var f = document.getElementById('fpdoModFundo');
    var html = '<div id="fpdoModBar">' +
      '<strong>FPDO modelo apresentação</strong>' +
      '<button type="button" id="fpdoModSalvar">Salvar</button>' +
      '<button type="button" class="off" id="fpdoModFechar">Fechar</button>' +
      '</div><div id="fpdoModView">';

    html += '<div class="fpdo-slide fpdo-capa"><h2>CAPA</h2>' +
      '<input id="fpdoObra" placeholder="Obra" value="">' +
      '<input id="fpdoMes" placeholder="Mês atual" value="">' +
      '<input id="fpdoMesAnt" placeholder="Mês anterior" value="">' +
      '<input id="fpdoCli" placeholder="Cliente" value="">' +
      '<input id="fpdoLoc" placeholder="Local" value="">' +
      '<input id="fpdoResp" placeholder="Responsável da obra" value="">' +
      '<input id="fpdoGes" placeholder="Gestor Pórtico" value="">' +
      '</div>';

    FACHADAS.forEach(function (fa) {
      var k = fa.toLowerCase();
      html += '<div class="fpdo-slide"><h2>' + fa.toUpperCase() + '</h2><div class="fpdo-grid2">' +
        slot(s, k + '_ant', 'MÊS ' + (s.capa.mesAnt || 'ANTERIOR').toUpperCase()) +
        slot(s, k + '_atu', 'MÊS ' + (s.capa.mes || 'ATUAL').toUpperCase()) +
        '</div></div>';
    });

    html += '<div class="fpdo-slide fpdo-capa"><h2>ATIVIDADES REALIZADAS</h2>' +
      '<textarea id="fpdoPortico" placeholder="PÓRTICO"></textarea>' +
      '<textarea id="fpdoClienteTxt" placeholder="CLIENTE / OBRA"></textarea></div>';
    html += '<div class="fpdo-slide fpdo-capa"><h2>PRÓXIMAS ETAPAS</h2>' +
      '<textarea id="fpdoProxP" placeholder="PÓRTICO + prazos"></textarea>' +
      '<textarea id="fpdoProxC" placeholder="CLIENTE + prazos"></textarea></div>';
    html += '</div>';
    f.innerHTML = html;

    var set = function (id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; };
    set('fpdoObra', s.capa.obra); set('fpdoMes', s.capa.mes); set('fpdoMesAnt', s.capa.mesAnt);
    set('fpdoCli', s.capa.cliente); set('fpdoLoc', s.capa.local);
    set('fpdoResp', s.capa.responsavel); set('fpdoGes', s.capa.gestor);
    set('fpdoPortico', s.portico); set('fpdoClienteTxt', s.clienteTxt);
    set('fpdoProxP', s.proxPortico); set('fpdoProxC', s.proxCliente);

    document.getElementById('fpdoModFechar').onclick = fechar;
    document.getElementById('fpdoModSalvar').onclick = function () { ler(s); gravar(s); alert('FPDO modelo salvo neste aparelho.'); };
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

  function ler(s) {
    function g(id) { var el = document.getElementById(id); return el ? el.value : ''; }
    s.capa.obra = g('fpdoObra'); s.capa.mes = g('fpdoMes'); s.capa.mesAnt = g('fpdoMesAnt');
    s.capa.cliente = g('fpdoCli'); s.capa.local = g('fpdoLoc');
    s.capa.responsavel = g('fpdoResp'); s.capa.gestor = g('fpdoGes');
    s.portico = g('fpdoPortico'); s.clienteTxt = g('fpdoClienteTxt');
    s.proxPortico = g('fpdoProxP'); s.proxCliente = g('fpdoProxC');
  }

  function botao() {
    var pe = document.getElementById('p92Pe');
    if (pe && !document.getElementById('fpdoModBtn')) {
      var b = document.createElement('button');
      b.id = 'fpdoModBtn';
      b.className = 'p92-btn p92-btn-ok';
      b.type = 'button';
      b.textContent = 'Modelo apresentação (fotos)';
      b.onclick = abrir;
      pe.appendChild(b);
    }
  }

  if (typeof window.p92AbrirFpdo === 'function' && !window.p92AbrirFpdo.__modelo) {
    var old = window.p92AbrirFpdo;
    window.p92AbrirFpdo = function () {
      var r = old.apply(this, arguments);
      setTimeout(botao, 400);
      return r;
    };
    window.p92AbrirFpdo.__modelo = true;
  }
  window.abrirFpdoModelo = abrir;
  setTimeout(botao, 1500);
  console.log('[fpdo-modelo] abrirFpdoModelo() ou botão no FPDO');
})();
