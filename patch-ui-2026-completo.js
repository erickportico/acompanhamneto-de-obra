/**
 * PATCH UI 2026 COMPLETO — um arquivo só
 * Menu, login persistente, Estado/Cidade, excluir lançamento e medição.
 * NÃO força mês. NÃO reescreve cards do P120.
 *
 * No index.html, ANTES de </body>, só isto:
 *   <script src="/admin-painel.js"></script>
 *   <script src="/patch-ui-2026-completo.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026completo) return;
  window.__patchUi2026completo = true;

  var K_SESS = 'painel_seg_sessao_v1';
  var UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  var UF_NOME = {AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapá',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',PA:'Pará',PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',PR:'Paraná',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RO:'Rondônia',RR:'Roraima',RS:'Rio Grande do Sul',SC:'Santa Catarina',SE:'Sergipe',SP:'São Paulo',TO:'Tocantins'};

  var css = document.createElement('style');
  css.id = 'pUi2026compCss';
  css.textContent = [
    '#p86bLogin,#p86bCad{position:fixed!important;inset:0!important;',
    'align-items:center!important;justify-content:center!important;z-index:2147483400!important}',
    '#selectObra,label[for="selectObra"]{display:none!important}',
    '.or-acordeao,.or-grupo,.or-tit,#orObrasAcc{font-size:13px!important;font-weight:800!important;',
    'letter-spacing:.4px!important;text-transform:uppercase!important;color:#cbd5e1!important;',
    'padding:12px 14px 8px!important;background:transparent;border:0;width:100%;text-align:left;cursor:pointer}',
    '#orObrasToggle{display:none!important}',
    '#orObrasLista{padding:2px 8px 10px}',
    '#locSugBox{display:none}',
    '#locSugBox.aberto{display:block;position:fixed;z-index:2147483646;background:#fff;color:#0f172a;',
    'border:1px solid #94a3b8;border-radius:8px;max-height:220px;overflow:auto}',
    '#locSugBox.aberto button{display:block;width:100%;text-align:left;border:0;background:#fff;color:#0f172a;padding:8px 10px}',
    '#locSugBox.aberto button:hover{background:#e2e8f0}',
    '.pgto-del,.med-del{width:26px;height:26px;border:0;border-radius:7px;background:#fecaca;color:#7f1d1d;cursor:pointer;font-size:16px}',
    '.loc-wrap{display:flex;flex-direction:column;gap:4px;min-width:150px}',
    '.loc-wrap label{font-size:11px;color:#64748b;font-weight:700}',
    '.loc-uf,.loc-cid{padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a}'
  ].join('');
  document.head.appendChild(css);

  function sessao() {
    try {
      var raw = localStorage.getItem(K_SESS) || sessionStorage.getItem(K_SESS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  try {
    if (!localStorage.getItem(K_SESS) && sessionStorage.getItem(K_SESS)) {
      localStorage.setItem(K_SESS, sessionStorage.getItem(K_SESS));
    }
  } catch (e0) {}

  function esconderLoginSeLogado() {
    var s = sessao();
    var tem = s && (s.email || s.usuario || s.id);
    var box = document.getElementById('p86bLogin');
    if (!box) return;
    if (tem) {
      box.style.setProperty('display', 'none', 'important');
      box.classList.remove('on', 'show');
    }
  }

  function menu() {
    document.querySelectorAll('#orLista .or-item, #orLista button').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^gest[aã]o de obra e equipe$/i.test(t) || el.getAttribute('data-aba') === 'cronograma') {
        el.style.setProperty('display', 'none', 'important');
      }
      var src = el.querySelector('.or-txt') || el;
      var st = (src.textContent || '').trim();
      if (/ObraFlow|Plano Mestre/i.test(st)) src.textContent = 'Gestão de Obras e Equipes';
    });

    var lista = document.getElementById('orLista');
    if (!lista) return;
    var box = document.getElementById('orObrasBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'orObrasBox';
      lista.appendChild(box);
    }
    var acc = document.getElementById('orObrasAcc');
    if (!acc) {
      acc = document.createElement('button');
      acc.type = 'button';
      acc.id = 'orObrasAcc';
      acc.className = 'or-acordeao';
      acc.innerHTML = '<span>Obra</span><span class="seta" style="margin-left:auto">▸</span>';
      box.insertBefore(acc, box.firstChild);
      acc.onclick = function (ev) {
        ev.preventDefault();
        var g = document.getElementById('orObrasLista');
        if (!g) return;
        var abre = g.style.display !== 'block';
        g.style.display = abre ? 'block' : 'none';
        var s = acc.querySelector('.seta');
        if (s) s.textContent = abre ? '▾' : '▸';
      };
    }
    var g = document.getElementById('orObrasLista');
    if (!g) {
      g = document.createElement('div');
      g.id = 'orObrasLista';
      g.style.display = 'none';
      box.appendChild(g);
    }
    var db = window.db;
    if (!db || !Array.isArray(db.obras)) return;
    var atual = db.obraAtualId;
    g.innerHTML = db.obras.map(function (o) {
      var on = o.id === atual ? 'background:#1e293b;' : '';
      return '<button type="button" class="or-item" data-obra="' + o.id + '" style="' + on + '"><span class="or-txt">' +
        String(o.nome || o.id) + '</span></button>';
    }).join('');
    g.querySelectorAll('[data-obra]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault();
        var id = b.getAttribute('data-obra');
        if (typeof window.trocarObra === 'function') window.trocarObra(id);
        else { window.db.obraAtualId = id; if (window.render) window.render(); }
      };
    });
  }

  function fecharSug() {
    var b = document.getElementById('locSugBox');
    if (!b) return;
    b.className = '';
    b.innerHTML = '';
    b.style.display = 'none';
  }

  function ligarCidade(inp, sel) {
    if (!inp || inp.__ok) return;
    inp.__ok = true;
    inp.addEventListener('input', function () { sugerir(inp, sel); });
    inp.addEventListener('blur', function () { setTimeout(fecharSug, 180); });
  }

  async function sugerir(inp, sel) {
    var uf = String((sel && sel.value) || '').match(/[A-Z]{2}/);
    uf = uf ? uf[0] : '';
    if (!uf) { fecharSug(); return; }
    var lista = [];
    try {
      var raw = localStorage.getItem('painel_ibge_mun_v1_' + uf);
      if (raw) lista = JSON.parse(raw).dados || [];
    } catch (e) {}
    if (!lista.length) {
      try {
        var r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/' + uf + '/municipios');
        lista = (await r.json()).map(function (x) { return x.nome; });
        localStorage.setItem('painel_ibge_mun_v1_' + uf, JSON.stringify({ em: Date.now(), dados: lista }));
      } catch (e2) { return; }
    }
    var q = String(inp.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var hits = lista.filter(function (n) {
      return String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(q) >= 0;
    }).slice(0, 20);
    var box = document.getElementById('locSugBox');
    if (!box) { box = document.createElement('div'); box.id = 'locSugBox'; document.body.appendChild(box); }
    if (!hits.length) { fecharSug(); return; }
    var rct = inp.getBoundingClientRect();
    box.className = 'aberto';
    box.style.left = rct.left + 'px';
    box.style.top = (rct.bottom + 4) + 'px';
    box.style.width = Math.max(180, rct.width) + 'px';
    box.innerHTML = hits.map(function (n) { return '<button type="button">' + n + '</button>'; }).join('');
    box.querySelectorAll('button').forEach(function (bt) {
      bt.onclick = function () { inp.value = bt.textContent; fecharSug(); };
    });
  }

  function camposPagamento() {
    var tab = document.getElementById('tab-pagamento');
    if (!tab || tab.querySelector('#pgtoUf')) return;
    var labels = tab.querySelectorAll('label');
    var ancora = null;
    labels.forEach(function (l) {
      if (/^obra$/i.test((l.textContent || '').trim())) ancora = l.parentNode;
    });
    var wrap = document.createElement('div');
    wrap.className = 'loc-wrap pgto-loc-wrap';
    wrap.innerHTML =
      '<label>Estado</label><select class="loc-uf" id="pgtoUf">' + optionsUf('') + '</select>' +
      '<label>Cidade</label><input class="loc-cid" id="pgtoCid" placeholder="Cidade" autocomplete="off">';
    if (ancora && ancora.parentNode) ancora.parentNode.insertBefore(wrap, ancora.nextSibling);
    else tab.appendChild(wrap);
    ligarCidade(wrap.querySelector('.loc-cid'), wrap.querySelector('.loc-uf'));
  }

  function camposCusto() {
    if (document.getElementById('custoUf')) return;
    var tab = document.getElementById('tab-custo');
    if (!tab) return;
    var wrap = document.createElement('div');
    wrap.className = 'loc-wrap custo-loc-wrap';
    wrap.innerHTML =
      '<label>Estado</label><select class="loc-uf" id="custoUf">' + optionsUf('') + '</select>' +
      '<label>Cidade</label><input class="loc-cid" id="custoCid" placeholder="Cidade" autocomplete="off">';
    var mes = document.getElementById('custoFilterMes');
    if (mes && mes.parentNode && mes.parentNode.parentNode) {
      mes.parentNode.parentNode.insertBefore(wrap, mes.parentNode);
    } else {
      tab.insertBefore(wrap, tab.firstChild);
    }
    ligarCidade(wrap.querySelector('.loc-cid'), wrap.querySelector('.loc-uf'));
  }

  function botoesDelLanc() {
    document.querySelectorAll('td.lanc-actions').forEach(function (td) {
      var ed = td.querySelector('button[onclick*="editarLancamentoPgto"]');
      if (!ed) return;
      var oc = ed.getAttribute('onclick') || '';
      var m = oc.match(/editarLancamentoPgto\(\s*'([^']+)'\s*,\s*'([^']+)'/);
      if (!m) return;
      var nativo = td.querySelector('button[onclick*="excluirLancamentoPgto"]');
      if (nativo) nativo.style.display = 'none';
      if (td.querySelector('.pgto-del')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pgto-del';
      b.textContent = '×';
      b.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!confirm('Excluir este lançamento?')) return;
        if (typeof window.excluirLancamentoPgto === 'function') {
          window.excluirLancamentoPgto(m[1], m[2]);
        } else if (window.db && window.db.obras) {
          window.db.obras.forEach(function (o) {
            o.lancamentosProducao = (o.lancamentosProducao || []).filter(function (l) {
              return String(l.id) !== String(m[1]);
            });
          });
          if (typeof window.salvarDB === 'function') window.salvarDB();
          if (typeof window.renderPagamento === 'function') window.renderPagamento();
        }
      };
      td.appendChild(b);
    });
  }

  function botaoDelMedicao() {
    if (document.getElementById('medDelBtn')) return;
    var alvo = null;
    document.querySelectorAll('#tab-medicoes *, #tab-financeiro *').forEach(function (el) {
      if (alvo) return;
      if (/navegar medi/i.test(el.textContent || '') && el.children.length <= 4) alvo = el.parentNode || el;
    });
    if (!alvo) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'medDelBtn';
    b.className = 'med-del';
    b.textContent = '×';
    b.title = 'Excluir medição';
    b.onclick = function (ev) {
      ev.preventDefault();
      if (!confirm('Excluir a medição atual?')) return;
      if (typeof window.excluirMedicaoAtual === 'function') window.excluirMedicaoAtual();
      else if (typeof window.removerMedicao === 'function') window.removerMedicao();
      else alert('Não achei a função nativa de excluir medição. Me avise que eu amarro no nome certo.');
    };
    alvo.appendChild(b);
  }

  function tick() {
    esconderLoginSeLogado();
    menu();
    camposPagamento();
    camposCusto();
    botoesDelLanc();
    botaoDelMedicao();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick);
  else setTimeout(tick, 300);
  setInterval(tick, 2000);
  console.log('[UI2026completo] menu + login + estado/cidade + excluir');
})();
