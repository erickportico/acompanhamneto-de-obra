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
    '#p86bLogin,#p86bCad{position:fixed!important;inset:0!important;display:flex!important;',
    'align-items:center!important;justify-content:center!important;z-index:2147483400!important}',
    '#p86bLogin .cx,#p86bCad .cx{margin:auto!important}',
    '#selectObra,label[for="selectObra"]{display:none!important}',
    '.or-acordeao,.or-grupo,.or-tit,#orObrasAcc{font-size:13px!important;font-weight:800!important;',
    'letter-spacing:.4px!important;text-transform:uppercase!important;color:#cbd5e1!important;',
    'padding:12px 14px 8px!important;background:transparent;border:0;width:100%;text-align:left;cursor:pointer}',
    '#orObrasToggle{display:none!important}',
    '#orObrasLista{padding:2px 8px 10px}',
    '#locSugBox{display:none}',
    '#locSugBox.aberto{display:block;position:fixed;z-index:2147483646;background:#fff;color:#0f172a;',
    'border:1px solid #94a3b8;border-radius:8px;max-height:220px;overflow:auto;box-shadow:0 8px 20px rgba(0,0,0,.18)}',
    '#locSugBox.aberto button{display:block;width:100%;text-align:left;border:0;background:#fff;color:#0f172a;padding:8px 10px}',
    '#locSugBox.aberto button:hover{background:#e2e8f0}',
    '.pgto-del,.med-del{width:26px;height:26px;border:0;border-radius:7px;background:#fecaca;color:#7f1d1d;cursor:pointer;font-size:16px}',
    '.loc-wrap{display:flex;flex-direction:column;gap:4px;min-width:140px}',
    '.loc-wrap label{font-size:11px;color:#64748b;font-weight:700}',
    '.loc-uf,.loc-cid{padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a}'
  ].join('');
  document.head.appendChild(css);

  /* ── sessão: não pedir login no F5 ── */
  function sessao() {
    try {
      var raw = localStorage.getItem(K_SESS) || sessionStorage.getItem(K_SESS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function esconderLoginSeLogado() {
    var s = sessao();
    var tem = s && (s.email || s.usuario || s.id);
    var box = document.getElementById('p86bLogin');
    if (box && tem) {
      box.style.display = 'none';
      box.classList.remove('on');
    }
  }
  /* copia sessão de sessionStorage para localStorage se "manter" */
  try {
    if (!localStorage.getItem(K_SESS) && sessionStorage.getItem(K_SESS)) {
      localStorage.setItem(K_SESS, sessionStorage.getItem(K_SESS));
    }
  } catch (e) {}

  /* ── menu ── */
  function menu() {
    document.querySelectorAll('#orLista .or-item, #orLista button, #orLista a').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/gest[aã]o de obra e equipe/i.test(t) && !/obras e equipes/i.test(t)) {
        el.style.display = 'none';
      }
      if (/obraflow|plano mestre/i.test(t)) {
        var txt = el.querySelector('.or-txt') || el;
        if (txt && /obraflow|plano mestre/i.test(txt.textContent || '')) {
          txt.textContent = (txt.textContent || '').replace(/ObraFlow[^\n]*/i, 'Gestão de Obras e Equipes').replace(/Plano Mestre[^\n]*/i, 'Gestão de Obras e Equipes');
          if (/obraflow|plano mestre/i.test(txt.textContent)) txt.textContent = 'Gestão de Obras e Equipes';
        }
      }
    });
    var lista = document.getElementById('orLista');
    if (!lista) return;
    if (!document.getElementById('orObrasBox')) {
      var box = document.createElement('div');
      box.id = 'orObrasBox';
      lista.appendChild(box);
      var acc = document.createElement('button');
      acc.type = 'button';
      acc.id = 'orObrasAcc';
      acc.className = 'or-acordeao';
      acc.innerHTML = '<span>Obra</span><span class="seta" style="margin-left:auto">▸</span>';
      box.appendChild(acc);
      var g = document.createElement('div');
      g.id = 'orObrasLista';
      g.style.display = 'none';
      box.appendChild(g);
      acc.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var abre = g.style.display !== 'block';
        g.style.display = abre ? 'block' : 'none';
        acc.querySelector('.seta').textContent = abre ? '▾' : '▸';
      };
    }
    var g = document.getElementById('orObrasLista');
    var db = window.db;
    if (g && db && db.obras) {
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
          else { db.obraAtualId = id; if (window.render) window.render(); }
        };
      });
    }
  }

  /* ── Estado/Cidade no formulário de pagamento e no filtro de custo ── */
  function optionsUf(selVal) {
    var h = '<option value="">Todos</option>';
    UFS.forEach(function (u) {
      var v = u + ' — ' + UF_NOME[u];
      h += '<option value="' + v + '"' + (selVal && selVal.indexOf(u) === 0 ? ' selected' : '') + '>' + v + '</option>';
    });
    return h;
  }

  function injetarLoc(host, prefixo) {
    if (!host || host.querySelector('.' + prefixo + '-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'loc-wrap ' + prefixo + '-wrap';
    wrap.innerHTML =
      '<label>Estado</label><select class="loc-uf" id="' + prefixo + 'Uf">' + optionsUf('') + '</select>' +
      '<label>Cidade</label><input class="loc-cid" id="' + prefixo + 'Cid" placeholder="Cidade" autocomplete="off">';
    host.appendChild(wrap);
    ligarCidade(wrap.querySelector('.loc-cid'), wrap.querySelector('.loc-uf'));
  }

  function camposPagamento() {
    var form = document.querySelector('#tab-pagamento form') ||
      document.querySelector('#tab-pagamento .lanc-form') ||
      document.querySelector('#tab-pagamento');
    if (!form) return;
    var obraSel = form.querySelector('select') || form.querySelector('[id*="obra" i]');
    var alvo = obraSel && obraSel.parentNode ? obraSel.parentNode.parentNode : form;
    /* procura bloco de campos */
    var row = form.querySelector('.grid, .form-row, .lanc-campos') || form;
    if (!row.querySelector('.pgto-loc-wrap')) {
      var wrap = document.createElement('div');
      wrap.className = 'loc-wrap pgto-loc-wrap';
      wrap.innerHTML =
        '<label>Estado</label><select class="loc-uf" id="pgtoUf">' + optionsUf('') + '</select>' +
        '<label>Cidade</label><input class="loc-cid" id="pgtoCid" placeholder="Cidade" autocomplete="off">';
      if (obraSel && obraSel.parentNode) obraSel.parentNode.parentNode.insertBefore(wrap, obraSel.parentNode.nextSibling);
      else row.appendChild(wrap);
      ligarCidade(wrap.querySelector('.loc-cid'), wrap.querySelector('.loc-uf'));
    }
  }

  function camposCusto() {
    var estLabel = null;
    document.querySelectorAll('#tab-custo label, #tab-custo .filtro-lbl').forEach(function (l) {
      if (/estado|regi/i.test(l.textContent || '')) estLabel = l;
    });
    var barra = document.querySelector('#tab-custo .filtros, #p120Filtros') || document.getElementById('tab-custo');
    if (!barra) return;
    if (barra.querySelector('#custoUf')) return;
    var wrap = document.createElement('div');
    wrap.className = 'loc-wrap custo-loc-wrap';
    wrap.innerHTML =
      '<label>Estado</label><select class="loc-uf" id="custoUf">' + optionsUf('') + '</select>' +
      '<label>Cidade</label><input class="loc-cid" id="custoCid" placeholder="Cidade" autocomplete="off">';
    var emp = document.getElementById('custoFilterEmpresa') || document.getElementById('custoFilterObra');
    if (emp && emp.parentNode) emp.parentNode.parentNode.insertBefore(wrap, emp.parentNode);
    else barra.insertBefore(wrap, barra.firstChild);
    ligarCidade(wrap.querySelector('.loc-cid'), wrap.querySelector('.loc-uf'));
    /* esconde input região original vazio */
    var orig = document.getElementById('custoFilterRegiao') || document.getElementById('inputLancRegiao');
    if (orig) { orig.style.position = 'absolute'; orig.style.left = '-9999px'; }
  }

  function fecharSug() {
    var b = document.getElementById('locSugBox');
    if (b) { b.className = ''; b.innerHTML = ''; b.style.display = 'none'; }
  }

  function ligarCidade(inp, sel) {
    if (!inp || inp.__ok) return;
    inp.__ok = true;
    inp.addEventListener('input', function () { sugerir(inp, sel); });
    inp.addEventListener('focus', function () { if (inp.value) sugerir(inp, sel); });
    inp.addEventListener('blur', function () { setTimeout(fecharSug, 160); });
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
      } catch (e2) { fecharSug(); return; }
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
    box.style.cssText = 'left:' + rct.left + 'px;top:' + (rct.bottom + 4) + 'px;width:' + Math.max(180, rct.width) + 'px';
    box.innerHTML = hits.map(function (n) { return '<button type="button">' + n + '</button>'; }).join('');
    box.querySelectorAll('button').forEach(function (bt) {
      bt.onclick = function () { inp.value = bt.textContent; fecharSug(); };
    });
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest && (ev.target.closest('#locSugBox') || ev.target.classList.contains('loc-cid'))) return;
    fecharSug();
  }, true);

  /* ── excluir lançamento ── */
  function botoesDelLanc() {
    document.querySelectorAll('td.lanc-actions').forEach(function (td) {
      var ed = td.querySelector('button[onclick*="editarLancamentoPgto"]');
      if (!ed) return;
      var oc = ed.getAttribute('onclick') || '';
      var m = oc.match(/editarLancamentoPgto\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/);
      if (!m) return;
      var nativo = td.querySelector('button[onclick*="excluirLancamentoPgto"]');
      if (nativo) nativo.style.display = 'none';
      if (td.querySelector('.pgto-del')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pgto-del';
      b.title = 'Excluir este lançamento';
      b.textContent = '×';
      b.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!confirm('Excluir este lançamento?')) return;
        if (typeof window.excluirLancamentoPgto === 'function') {
          window.excluirLancamentoPgto(m[1], m[2]);
          return;
        }
        var db = window.db;
        if (!db || !db.obras) return;
        db.obras.forEach(function (o) {
          o.lancamentosProducao = (o.lancamentosProducao || []).filter(function (l) {
            return String(l.id) !== String(m[1]);
          });
        });
        if (typeof window.salvarDB === 'function') window.salvarDB();
        if (typeof window.renderPagamento === 'function') window.renderPagamento();
      };
      td.appendChild(b);
    });
  }

  /* ── excluir medição (boletim) ── */
  function botaoDelMedicao() {
    var nav = document.querySelector('#tab-medicoes') || document.body;
    if (document.getElementById('medDelBtn')) return;
    var alvo = null;
    nav.querySelectorAll('button,div,span').forEach(function (el) {
      if (/navegar medi/i.test(el.textContent || '') && !alvo) alvo = el.parentNode;
    });
    if (!alvo) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'medDelBtn';
    b.className = 'med-del';
    b.title = 'Excluir medição atual';
    b.textContent = '×';
    b.style.marginLeft = '8px';
    b.onclick = function (ev) {
      ev.preventDefault();
      if (!confirm('Excluir a medição atual?')) return;
      if (typeof window.excluirMedicaoAtual === 'function') {
        window.excluirMedicaoAtual();
        return;
      }
      /* fallback: tenta funções conhecidas */
      if (typeof window.removerMedicao === 'function') window.removerMedicao();
      else alert('Função de exclusão de medição não encontrada neste painel.');
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

  setTimeout(tick, 400);
  setInterval(tick, 1800);
  console.log('[UI2026completo] menu + login + estado/cidade + excluir');
})();
