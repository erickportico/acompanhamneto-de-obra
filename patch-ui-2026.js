/**
 * PATCH UI 2026 — layout admin, sessão 5 min, cadastro, menu, ObraFlow, print, custos
 * Coloque na pasta do painel e no index.html antes de </body>:
 *   <script src="/patch-ui-2026.js"></script>
 */
(function () {
  'use strict';
  if (window.__patchUi2026) return;
  window.__patchUi2026 = true;

  var K_SESS = 'painel_seg_sessao_v1';
  var K_ATIV = 'painel_ui2026_atividade';
  var IDLE_MS = 5 * 60 * 1000;

  function css() {
    if (document.getElementById('patchUi2026css')) return;
    var s = document.createElement('style');
    s.id = 'patchUi2026css';
    s.textContent = [
      '#tab-admin{max-width:980px;margin:24px auto;background:transparent;box-shadow:none;border:0;padding:0}',
      '#tab-admin .adm-box{margin-left:auto;margin-right:auto}',
      'body.ui2026-admin #tab-admin{background:transparent !important}',
      '#ps79Cadastro,#p131Tela,.ps79-cadastro,[data-ps79="cadastro"]{',
      '  display:flex !important;align-items:center;justify-content:center;',
      '}',
      '#ps79Cadastro .cx,#p131Tela .cx{margin:auto}',
      '#ui2026Lock{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.72);',
      '  display:none;align-items:center;justify-content:center;padding:16px}',
      '#ui2026Lock.on{display:flex}',
      '#ui2026Lock .cx{background:#fff;border-radius:14px;padding:22px;width:min(380px,92vw);text-align:center}',
      '#ui2026Lock input{width:100%;padding:10px;margin:10px 0;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box}',
      '#ui2026Lock button{border:0;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;cursor:pointer}',
      '@media print{',
      '  body.ui2026-print *{visibility:hidden !important}',
      '  body.ui2026-print #tab-obraflow, body.ui2026-print #tab-obraflow *{visibility:visible !important}',
      '  body.ui2026-print .or-painel, body.ui2026-print #orMenu,',
      '  body.ui2026-print #ps79Barra, body.ui2026-print .kpi-grid,',
      '  body.ui2026-print button, body.ui2026-print .of-toolbar{display:none !important}',
      '  body.ui2026-print table{border-collapse:collapse !important;width:100% !important}',
      '  body.ui2026-print th, body.ui2026-print td{border:1px solid #333 !important;padding:4px !important;color:#000 !important}',
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
    el.innerHTML = '<div class="cx"><h3>Confirme suas credenciais</h3>' +
      '<p>Você ficou mais de 5 minutos sem usar o painel.</p>' +
      '<input id="ui2026Senha" type="password" placeholder="Senha">' +
      '<div id="ui2026Err" style="color:#b91c1c;min-height:18px;font-size:13px"></div>' +
      '<button type="button" id="ui2026Ok">Confirmar</button></div>';
    document.body.appendChild(el);
    document.getElementById('ui2026Ok').onclick = confirmarIdle;
    document.getElementById('ui2026Senha').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') confirmarIdle();
    });
    return el;
  }

  async function confirmarIdle() {
    var senha = (document.getElementById('ui2026Senha') || {}).value || '';
    var s = sessao();
    var email = s && (s.usuario || s.email);
    var err = document.getElementById('ui2026Err');
    if (!email || !senha) { if (err) err.textContent = 'Informe a senha.'; return; }
    try {
      var r = await (window._supabase || {}).auth.signInWithPassword({ email: email, password: senha });
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
      if (Date.now() - lastAtiv() < IDLE_MS) return;
      lockBox().classList.add('on');
    }, 15000);
  }

  function persistirSessao() {
    try {
      var a = sessionStorage.getItem(K_SESS);
      var b = localStorage.getItem(K_SESS);
      if (a && !b) localStorage.setItem(K_SESS, a);
    } catch (e) {}
  }

  function centralizarCadastro() {
    var nos = document.querySelectorAll('#ps79Cadastro, #p131Tela, [data-ps79="1"]');
    nos.forEach(function (n) {
      var t = (n.textContent || '');
      if (t.indexOf('Criar') < 0 && t.indexOf('cadastro') < 0 && n.id !== 'p131Tela') return;
      n.style.position = 'fixed';
      n.style.inset = '0';
      n.style.display = 'flex';
      n.style.alignItems = 'center';
      n.style.justifyContent = 'center';
      n.style.background = 'rgba(15,23,42,.65)';
      n.style.zIndex = '2147482600';
    });
    document.querySelectorAll('#ps79Cadastro select, #p131Tela select, [data-ps79] select').forEach(function (sel) {
      var opts = sel.options;
      for (var i = 0; i < opts.length; i++) {
        var v = String(opts[i].value || opts[i].text || '').toLowerCase();
        var soLeitura = v.indexOf('visitante') >= 0 || v.indexOf('leitor') >= 0 || v.indexOf('somente') >= 0 || v.indexOf('consulta') >= 0;
        if (!soLeitura) opts[i].disabled = true;
        if (soLeitura) { opts[i].selected = true; sel.value = opts[i].value; }
      }
    });
  }

  function ajustarMenu() {
    document.querySelectorAll('#btn-tab-cronograma, [onclick*="trocarAba(\'cronograma\')"]').forEach(function (el) {
      el.style.display = 'none';
    });
    document.querySelectorAll('#orLista .or-item, #orLista button, #meu-menu-abas .tab-btn').forEach(function (el) {
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/Gest[aã]o de Obra e Equipe/i.test(t) && !/ObraFlow|Plano Mestre/i.test(t)) {
        el.style.display = 'none';
      }
      if (/ObraFlow/i.test(t) || /Plano Mestre/i.test(t)) {
        var ico = el.querySelector('.or-txt, span, b') || el;
        if (el.childNodes.length && el.querySelector('.or-txt')) {
          el.querySelector('.or-txt').textContent = 'Gestão de Obras e Equipes';
        } else if (!el.querySelector('button')) {
          el.textContent = el.textContent.replace(/ObraFlow[^\n]*/i, 'Gestão de Obras e Equipes');
        }
      }
    });
    document.querySelectorAll('.card-title, h2, h3, b').forEach(function (el) {
      if (/ObraFlow/.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/ObraFlow\s*[—\-]\s*Plano Mestre(\s*\(EAP\))?/i, 'Gestão de Obras e Equipes');
      }
    });
  }

  function limparOverlaysPresos() {
    document.querySelectorAll('.of-modal, .of-dialog, .of-overlay, [class*="of-"][class*="modal"]').forEach(function (n) {
      var vis = getComputedStyle(n).display;
      if (vis === 'none') return;
    });
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
    document.querySelectorAll('[style*="pointer-events"]').forEach(function (n) {
      if (n.id === 'orMenu' || n.id === 'ui2026Lock') return;
    });
  }

  function consertarCliqueObraflow() {
    document.addEventListener('mousedown', function (ev) {
      var t = ev.target;
      if (!t) return;
      var modal = t.closest && t.closest('.of-modal, .of-dialog, [data-of-modal]');
      if (modal && (t === modal || (t.className && String(t.className).indexOf('fundo') >= 0) || t.getAttribute('data-fecha') === '1')) {
        setTimeout(limparOverlaysPresos, 50);
      }
      if (t.classList && (t.classList.contains('or-fundo') || t.id === 'orFundo')) {
        var m = document.getElementById('orMenu');
        if (m) {
          m.setAttribute('aria-hidden', 'true');
          if (document.activeElement && m.contains(document.activeElement)) {
            try { document.activeElement.blur(); } catch (e) {}
          }
        }
      }
    }, true);
    document.addEventListener('click', function () {
      setTimeout(function () {
        var travado = getComputedStyle(document.body).pointerEvents === 'none';
        if (travado) document.body.style.pointerEvents = 'auto';
      }, 200);
    }, true);
  }

  function printObraflow() {
    var orig = window.print;
    if (orig && orig.__ui2026) return;
    window.print = function () {
      document.body.classList.add('ui2026-print');
      var r = orig.apply(window, arguments);
      setTimeout(function () { document.body.classList.remove('ui2026-print'); }, 800);
      return r;
    };
    window.print.__ui2026 = true;
  }

  function consertarCustos() {
    var bt = Array.prototype.find.call(document.querySelectorAll('button'), function (b) {
      return /Ver todos os meses/i.test(b.textContent || '');
    });
    if (bt && !bt.__ui2026) {
      bt.__ui2026 = true;
      try { bt.click(); } catch (e) {}
    }
    var att = Array.prototype.find.call(document.querySelectorAll('button'), function (b) {
      return /^Atualizar$/i.test((b.textContent || '').trim());
    });
    if (att && document.getElementById('tab-custo') && document.getElementById('tab-custo').style.display !== 'none') {
      try { att.click(); } catch (e2) {}
    }
  }

  function iniciar() {
    css();
    persistirSessao();
    vigiaIdle();
    centralizarCadastro();
    ajustarMenu();
    consertarCliqueObraflow();
    printObraflow();
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      centralizarCadastro();
      ajustarMenu();
      if (n === 3) consertarCustos();
      if (n > 25) clearInterval(t);
    }, 400);
    document.body.classList.add('ui2026-admin');
    console.log('[UI2026] patch ativo');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 400);
})();
