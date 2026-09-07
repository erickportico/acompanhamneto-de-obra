/**
 * Estado visível no slot de Região + some a faixa preta #p120Dica.
 * Não mexe em login nem em excluir.
 * <script src="/patch-ui-2026-tooltip-estado.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026tipEst) return;
  window.__patchUi2026tipEst = true;

  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  var NOMES = {AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapá',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',PA:'Pará',PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',PR:'Paraná',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RO:'Rondônia',RR:'Roraima',RS:'Rio Grande do Sul',SC:'Santa Catarina',SE:'Sergipe',SP:'São Paulo',TO:'Tocantins'};

  var css = document.createElement('style');
  css.textContent = [
    '#p120Dica{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}',
    '#custoFilterRegiao{display:none!important}',
    '#custoUfVisivel,#custoCidVisivel,.loc-cel{display:none!important}',
    '#custoFilterEstado{display:block!important;width:100%!important;padding:7px 10px!important;',
    'border:1px solid #cbd5e1!important;border-radius:6px!important;font-size:0.85rem!important;',
    'box-sizing:border-box!important;background:#fff!important;color:#0f172a!important;min-height:36px!important}'
  ].join('');
  document.head.appendChild(css);

  function matarDica() {
    var d = document.getElementById('p120Dica');
    if (!d) return;
    d.style.setProperty('display', 'none', 'important');
    d.innerHTML = '';
  }

  function montarEstado() {
    var orig = document.getElementById('custoFilterRegiao');
    if (!orig) return;
    var pai = orig.parentNode;
    if (!pai) return;
    var lab = pai.querySelector('label');
    if (lab) lab.textContent = 'Estado';
    pai.querySelectorAll('.loc-cel, #custoUfVisivel, #custoCidVisivel').forEach(function (n) {
      n.style.setProperty('display', 'none', 'important');
    });
    var sel = document.getElementById('custoFilterEstado');
    if (!sel) {
      sel = document.createElement('select');
      sel.id = 'custoFilterEstado';
      sel.innerHTML = '<option value="">Todos</option>' + UFS.map(function (u) {
        return '<option value="' + u + '">' + u + ' — ' + NOMES[u] + '</option>';
      }).join('');
      pai.appendChild(sel);
      sel.addEventListener('change', function () {
        orig.value = sel.value || '';
        try {
          orig.dispatchEvent(new Event('input', { bubbles: true }));
          orig.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {}
        if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard();
      });
    }
    orig.style.setProperty('display', 'none', 'important');
  }

  setInterval(matarDica, 400);
  document.addEventListener('mousemove', matarDica, true);
  setTimeout(montarEstado, 300);
  setTimeout(montarEstado, 1200);
  setInterval(montarEstado, 4000);
  console.log('[UI2026tipEst] estado visivel + tooltip preto removido');
})();
