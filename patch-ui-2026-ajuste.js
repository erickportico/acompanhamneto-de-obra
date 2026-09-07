/**
 * Ajuste fino — NÃO mexe em login nem no excluir de lançamento.
 * Menu + Estado no lugar de Região + dados no P120.
 * <script src="/patch-ui-2026-completo.js"></script>
 * <script src="/patch-ui-2026-ajuste.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026ajuste) return;
  window.__patchUi2026ajuste = true;

  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  var NOMES = {AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapá',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',PA:'Pará',PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',PR:'Paraná',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RO:'Rondônia',RR:'Roraima',RS:'Rio Grande do Sul',SC:'Santa Catarina',SE:'Sergipe',SP:'São Paulo',TO:'Tocantins'};

  function menu() {
    document.querySelectorAll('#orLista .or-item, #orLista button, .or-item').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/gest[aã]o de obra e equipe/i.test(t) && !/obras e equipes/i.test(t)) {
        el.style.setProperty('display', 'none', 'important');
      }
      if (/obraflow|plano mestre/i.test(t)) {
        var src = el.querySelector('.or-txt') || el;
        src.textContent = 'Gestão de Obras e Equipes';
      }
    });
    document.querySelectorAll('h1,h2,h3,.card-title').forEach(function (el) {
      if (/ObraFlow\s*[—\-]\s*Plano Mestre/i.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/ObraFlow\s*[—\-]\s*Plano Mestre(\s*\(EAP\))?/i, 'Gestão de Obras e Equipes');
      }
    });
  }

  function estadoNoLugarDaRegiao() {
    var orig = document.getElementById('custoFilterRegiao');
    if (!orig) return;
    var extra = document.getElementById('custoUfVisivel');
    if (extra && extra.closest) {
      var box = extra.closest('.loc-cel, .custo-loc-wrap, .loc-wrap');
      if (box) box.style.display = 'none';
    }
    var cid = document.getElementById('custoCidVisivel');
    if (cid && cid.closest) {
      var box2 = cid.closest('.loc-cel');
      if (box2 && box2 !== orig.parentNode) box2.style.display = 'none';
    }
    var pai = orig.parentNode;
    if (!pai) return;
    var lab = pai.querySelector('label');
    if (lab) lab.textContent = 'Estado';
    if (document.getElementById('custoFilterEstado')) {
      orig.style.display = 'none';
      return;
    }
    var sel = document.createElement('select');
    sel.id = 'custoFilterEstado';
    sel.style.cssText = orig.style.cssText || 'width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;';
    sel.innerHTML = '<option value="">Todos</option>' + UFS.map(function (u) {
      return '<option value="' + u + '">' + u + ' — ' + NOMES[u] + '</option>';
    }).join('');
    orig.style.display = 'none';
    pai.appendChild(sel);
    sel.addEventListener('change', function () {
      orig.value = sel.value || '';
      try { orig.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
      if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard();
      if (typeof window.P120 === 'object') {}
    });
  }

  function coletar() {
    var db = window.db;
    if (!db || !Array.isArray(db.obras)) return [];
    var obraId = val('custoFilterObra');
    var regiao = (val('custoFilterRegiao') || val('custoFilterEstado') || '').trim().toLowerCase();
    var mes = val('custoFilterMes');
    var empresa = val('custoFilterEmpresa').toUpperCase();
    var de = val('custoFilterPeriodoDe') || val('custoFilterDataDe');
    var ate = val('custoFilterPeriodoAte') || val('custoFilterDataAte');
    var lista = [];
    db.obras.forEach(function (o) {
      (o.centrosCusto || []).forEach(function (c) {
        lista.push(Object.assign({ obraId: o.id, obraNome: o.nome }, c));
      });
      (o.lancamentosProducao || []).forEach(function (l) {
        lista.push({
          id: 'pgto-' + l.id,
          data: l.data || '',
          valor: (Number(l.valorProf) || 0) + (Number(l.valorAjud) || 0),
          categoria: 'Pagamento produção',
          descricao: l.material || 'Pagamento',
          obraId: o.id,
          obraNome: o.nome,
          regiao: l.regiao || l.estado || l.cidade || '',
          empresa: '',
          colaborador: ''
        });
      });
    });
    return lista.filter(function (c) {
      if (obraId && String(c.obraId) !== String(obraId) && c.obraId !== obraId) return false;
      if (regiao) {
        var r = String(c.regiao || c.estado || c.cidade || '').toLowerCase();
        if (r.indexOf(regiao) === -1 && r.indexOf(regiao.slice(0, 2)) === -1) return false;
      }
      var d = String(c.data || '');
      if (mes && d.substring(0, 7) !== mes) return false;
      if (de && d && d < de) return false;
      if (ate && d && d > ate) return false;
      if (empresa) {
        if (String(c.empresa || '').toUpperCase() !== empresa) return false;
      }
      return true;
    });
  }
  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '') : '';
  }

  function exporFiltro() {
    window.getCustosFiltered = coletar;
    try { getCustosFiltered = coletar; } catch (e) {}
  }

  function dispararP120() {
    exporFiltro();
    try {
      if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard();
    } catch (e) {}
  }

  setTimeout(function () {
    menu();
    estadoNoLugarDaRegiao();
    exporFiltro();
    dispararP120();
  }, 600);
  setInterval(function () {
    menu();
    estadoNoLugarDaRegiao();
    exporFiltro();
  }, 2500);
  console.log('[UI2026ajuste] menu + estado no lugar da regiao + getCustosFiltered global');
})();
