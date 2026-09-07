/**
 * PATCH UI 2026 v2
 * script src="/patch-ui-2026.js"
 */
(function () {
  'use strict';
  if (window.__patchUi2026v2) return;
  window.__patchUi2026v2 = true;

  var K_SESS = 'painel_seg_sessao_v1';
  var K_ATIV = 'painel_ui2026_atividade';
  var IDLE_MS = 5 * 60 * 1000;

  function css() {
    if (document.getElementById('patchUi2026css')) return;
    var s = document.createElement('style');
    s.id = 'patchUi2026css';
    s.textContent = [
      '#tab-admin{max-width:980px;margin:24px auto;background:transparent!important;box-shadow:none;border:0;padding:0}',
      '#p86bCad,#p86bLogin{position:fixed!important;inset:0!important;left:0!important;top:0!important;',
      'right:0!important;width:100%!important;height:100%!important;margin:0!important;',
      'display:flex!important;align-items:center!important;justify-content:center!important;',
      'transform:none!important;z-index:2147483400!important}',
      '#p86bCad .cx,#p86bLogin .cx{margin:auto!important}',
      '#orLista .or-item[data-aba="cronograma"],#btn-tab-cronograma{display:none!important}',
      '#ofModal{align-items:center;justify-content:center}',
      '#ofModal.of-on{display:flex!important}',
      '#ui2026Lock{position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,.72);display:none;align-items:center;justify-content:center}',
      '#ui2026Lock.on{display:flex}',
      '#ui2026Lock .cx{background:#fff;border-radius:14px;padding:22px;width:min(380px,92vw);text-align:center}',
      '#ui2026Lock input{width:100%;padding:10px;margin:10px 0;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box}',
      '#ui2026Lock button{border:0;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700}',
      '@media print{',
      'body.ui2026-print *{visibility:hidden!important}',
      'body.ui2026-print #tab-obraflow,body.ui2026-print #tab-obraflow *{visibility:visible!important}',
      'body.ui2026-print button,body.ui2026-print #orMenu,body.ui2026-print #ps79Barra{display:none!important}',
      'body.ui2026-print table{border-collapse:collapse!important}',
      'body.ui2026-print th,body.ui2026-print td{border:1px solid #222!important;padding:4px!important;color:#000!important}',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function marcarAtividade() {
    try { localStorage.setItem(K_ATIV, String(Date.now())); } catch (e) {}
  }
  function lastAtiv() {
    try { return parseInt(localStorage.getItem(K_ATIV) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function sessao() {
    try {
      var raw = sessionStorage.getItem(K_SESS) || localStorage.getItem(K_SESS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function lockBox() {
    var el = document.getElementById('ui2026Lock');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'ui2026Lock';
    el.innerHTML = '<div class="cx"><h3>Confirme a senha</h3><p>Mais de 5 minutos sem atividade.</p>' +
      '<input id="ui2026Senha" type="password" placeholder="Senha">' +
      '<div id="ui2026Err" style="color:#b91c1c;min-height:18px;font-size:13px"></div>' +
      '<button type="button" id="ui2026Ok">Confirmar</button></div>';
    document.body.appendChild(el);
    document.getElementById('ui2026Ok').onclick = confirmarIdle;
    return el;
  }

  async function confirmarIdle() {
    var senha = (document.getElementById('ui2026Senha') || {}).value || '';
    var s = sessao();
    var email = s && (s.usuario || s.email);
    var err = document.getElementById('ui2026Err');
    if (!email || !senha) { if (err) err.textContent = 'Informe a senha.'; return; }
    try {
      var r = await window._supabase.auth.signInWithPassword({ email: email, password: senha });
      if (r && r.error) throw r.error;
      marcarAtividade();
      document.getElementById('ui2026Lock').classList.remove('on');
    } catch (e) {
      if (err) err.textContent = (e && e.message) || 'Senha inválida.';
    }
  }

  function vigiaIdle() {
    ['click', 'keydown', 'mousemove', 'scroll'].forEach(function (ev) {
      document.addEventListener(ev, marcarAtividade, { passive: true });
    });
    if (!lastAtiv()) marcarAtividade();
    setInterval(function () {
      if (!sessao()) return;
      if (document.getElementById('p86bLogin') || document.getElementById('p86bCad')) return;
      if (Date.now() - lastAtiv() < IDLE_MS) return;
      lockBox().classList.add('on');
    }, 15000);
  }

  function centralizarCadastro() {
    var cad = document.getElementById('p86bCad');
    if (!cad) return;
    var sel = cad.querySelector('select');
    if (!sel) return;
    sel.disabled = false;
    for (var i = 0; i < sel.options.length; i++) {
      var v = String(sel.options[i].value || '').toLowerCase();
      var ok = v === 'visitante' || v === 'leitor';
      sel.options[i].disabled = !ok;
      if (ok) sel.selectedIndex = i;
    }
  }

  function ajustarMenu() {
    document.querySelectorAll('#btn-tab-cronograma, [data-aba="cronograma"]').forEach(function (el) {
      el.style.setProperty('display', 'none', 'important');
    });
    document.querySelectorAll('#orLista .or-item').forEach(function (el) {
      var txt = el.querySelector('.or-txt');
      var t = ((txt || el).textContent || '').replace(/\s+/g, ' ').trim();
      if (el.getAttribute('data-aba') === 'cronograma' ||
          (/Gest[aã]o de Obra e Equipe/i.test(t) && el.getAttribute('data-aba') !== 'obraflow')) {
        el.style.setProperty('display', 'none', 'important');
      }
      if (txt && /ObraFlow|Plano Mestre/i.test(t)) txt.textContent = 'Gestão de Obras e Equipes';
    });
    document.querySelectorAll('.card-title').forEach(function (el) {
      if (/ObraFlow/.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/ObraFlow\s*[—\-]\s*Plano Mestre(\s*\(EAP\))?/i, 'Gestão de Obras e Equipes');
      }
    });
  }

  function fecharOf() {
    var m = document.getElementById('ofModal');
    if (m) m.classList.remove('of-on');
    document.body.style.pointerEvents = '';
    if (window.OF && OF.fecharModal) {
      try { OF.fecharModal(); } catch (e) {}
    }
  }

  function consertarCliqueObraflow() {
    document.addEventListener('mousedown', function (ev) {
      var m = document.getElementById('ofModal');
      if (!m || !m.classList.contains('of-on')) return;
      if (ev.target === m) fecharOf();
    }, true);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') fecharOf();
    });
    if (window.OF && OF.fecharModal && !OF.fecharModal.__ui) {
      var orig = OF.fecharModal;
      OF.fecharModal = function () {
        var r = orig.apply(this, arguments);
        var m = document.getElementById('ofModal');
        if (m) m.classList.remove('of-on');
        document.body.style.pointerEvents = '';
        return r;
      };
      OF.fecharModal.__ui = true;
    }
  }

  function printObraflow() {
    var orig = window.print;
    if (!orig || orig.__ui2026) return;
    window.print = function () {
      document.body.classList.add('ui2026-print');
      var r = orig.apply(window, arguments);
      setTimeout(function () { document.body.classList.remove('ui2026-print'); }, 800);
      return r;
    };
    window.print.__ui2026 = true;
  }

  function consertarCustos() {
    var mes = document.getElementById('custoFilterMes');
    if (mes && mes.value) {
      mes.value = '';
      try { mes.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    var de = document.getElementById('custoFilterPeriodoDe');
    var ate = document.getElementById('custoFilterPeriodoAte');
    if (de) de.value = '';
    if (ate) ate.value = '';
    try { if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard(); } catch (e2) {}
    var btn = document.querySelector('#p137Faixa [data-a="tudo"]');
    if (btn) { try { btn.click(); } catch (e3) {} }
    var att = document.querySelector('#p137Faixa [data-a="atualizar"]');
    if (att) { try { att.click(); } catch (e4) {} }
  }

  function iniciar() {
    css();
    vigiaIdle();
    centralizarCadastro();
    ajustarMenu();
    consertarCliqueObraflow();
    printObraflow();
    var n = 0;
    setInterval(function () {
      n += 1;
      centralizarCadastro();
      ajustarMenu();
      consertarCliqueObraflow();
      if (n === 4 || n === 12) consertarCustos();
    }, 700);
    console.log('[UI2026v2] patch ativo');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 400);
})();
