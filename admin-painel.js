/**
 * Aba Administração + perfis + exclusão protegida + backup de urgência
 * Incluir no index.html antes de </body>:
 *   <script src="/admin-painel.js"></script>
 */
(function () {
  'use strict';
  if (window.__adminPainel) return;
  window.__adminPainel = true;

  var ABAS = [
    { id: 'itens', rotulo: 'Itens' },
    { id: 'liberacao', rotulo: 'Liberação' },
    { id: 'ctm', rotulo: 'CTM' },
    { id: 'medicoes', rotulo: 'Medições' },
    { id: 'recebimento', rotulo: 'Recebimento' },
    { id: 'graficos', rotulo: 'Gráficos' },
    { id: 'cronograma', rotulo: 'Cronograma' },
    { id: 'pagamento', rotulo: 'Pagamento' },
    { id: 'custo', rotulo: 'Custo' },
    { id: 'obraflow', rotulo: 'ObraFlow' }
  ];

  var PERFIS = {
    admin: { nome: 'Administrador', abas: ABAS.map(function (a) { return a.id; }), editar: true, excluir: true },
    editor: { nome: 'Leitura e edição', abas: ABAS.map(function (a) { return a.id; }), editar: true, excluir: false },
    leitor: { nome: 'Somente leitura', abas: ['itens', 'medicoes', 'graficos', 'cronograma'], editar: false, excluir: false },
    visitante: { nome: 'Somente leitura', abas: ['itens', 'medicoes', 'graficos', 'cronograma'], editar: false, excluir: false }
  };

  function sb() {
    return window._supabase || null;
  }

  function sessao() {
    try {
      if (window.PainelNucleo && PainelNucleo.sessao) return PainelNucleo.sessao();
    } catch (e) {}
    try {
      var raw = sessionStorage.getItem('painel_seg_sessao_v1') || localStorage.getItem('painel_seg_sessao_v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e2) { return null; }
  }

  function perfilAtual() {
    var s = sessao();
    return String((s && s.perfil) || 'visitante').toLowerCase();
  }

  function ehAdmin() { return perfilAtual() === 'admin'; }
  function regra() { return PERFIS[perfilAtual()] || PERFIS.visitante; }

  function estilo() {
    if (document.getElementById('adminPainelCss')) return;
    var s = document.createElement('style');
    s.id = 'adminPainelCss';
    s.textContent =
      '#tab-admin{padding:16px}' +
      '.adm-box{max-width:920px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:12px 0}' +
      '.adm-box h3{margin:0 0 8px;color:#16304f}' +
      '.adm-box p{margin:0 0 12px;color:#64748b;font-size:13px}' +
      '.adm-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.adm-grid input,.adm-grid select{padding:8px;border:1px solid #cbd5e1;border-radius:8px}' +
      '.adm-acoes{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}' +
      '.adm-acoes button{border:0;border-radius:8px;padding:8px 12px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer}' +
      '.adm-acoes button.perigo{background:#dc2626}' +
      '.adm-acoes button.lado{background:#e2e8f0;color:#16304f}' +
      '#admTabela{width:100%;border-collapse:collapse;font-size:13px}' +
      '#admTabela th,#admTabela td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}' +
      'body.adm-so-leitura button.danger,body.adm-so-leitura .btn-del,body.adm-so-leitura [onclick*="excluir"]{display:none !important}';
    document.head.appendChild(s);
  }

  function garantirAba() {
    if (document.getElementById('tab-admin')) return;
    var host = document.querySelector('#tab-itens') && document.querySelector('#tab-itens').parentNode;
    if (!host) host = document.body;
    var tab = document.createElement('div');
    tab.id = 'tab-admin';
    tab.className = 'card';
    tab.style.display = 'none';
    tab.innerHTML =
      '<div class="adm-box">' +
      '<h3>Administração de usuários</h3>' +
      '<p>Cadastro no Supabase Auth + perfil em painel_perfis. Exclusão de itens só com admin ou senha de administrador.</p>' +
      '<div class="adm-grid">' +
      '<input id="admEmail" type="email" placeholder="E-mail">' +
      '<input id="admNome" type="text" placeholder="Nome">' +
      '<input id="admSenha" type="password" placeholder="Senha inicial">' +
      '<select id="admPerfil">' +
      '<option value="leitor">Somente leitura</option>' +
      '<option value="editor">Leitura e edição</option>' +
      '<option value="admin">Administrador</option>' +
      '</select></div>' +
      '<div class="adm-acoes">' +
      '<button type="button" id="admCriar">Cadastrar</button>' +
      '<button type="button" class="lado" id="admAtualizar">Atualizar lista</button>' +
      '<button type="button" class="lado" id="admBackup">Backup de urgência (Git)</button>' +
      '</div>' +
      '<p id="admMsg"></p></div>' +
      '<div class="adm-box"><h3>Usuários</h3><div class="table-responsive"><table id="admTabela"><thead><tr>' +
      '<th>E-mail</th><th>Nome</th><th>Perfil</th><th>Ativo</th><th></th>' +
      '</tr></thead><tbody></tbody></table></div></div>';
    host.appendChild(tab);

    var tabs = document.querySelector('#meu-menu-abas .tabs');
    if (tabs && !document.getElementById('btn-tab-admin')) {
      var b = document.createElement('button');
      b.className = 'tab-btn';
      b.id = 'btn-tab-admin';
      b.type = 'button';
      b.textContent = '⚙️ Administração';
      b.setAttribute('data-aba', 'admin');
      b.onclick = function () {
        if (typeof window.trocarAba === 'function') window.trocarAba('admin');
        else {
          document.querySelectorAll('[id^="tab-"]').forEach(function (el) {
            el.style.display = el.id === 'tab-admin' ? 'block' : 'none';
          });
          listar();
        }
      };
      tabs.appendChild(b);
    }

    if (typeof window.trocarAba === 'function' && !window.trocarAba.__admWrap) {
      var orig = window.trocarAba;
      window.trocarAba = function (aba) {
        if (aba === 'admin') {
          document.querySelectorAll('[id^="tab-"]').forEach(function (el) {
            el.style.display = el.id === 'tab-admin' ? 'block' : 'none';
          });
          document.querySelectorAll('#meu-menu-abas .tab-btn').forEach(function (bt) {
            bt.classList.toggle('active', bt.id === 'btn-tab-admin');
          });
          var menu = document.getElementById('meu-menu-abas');
          if (menu) menu.removeAttribute('open');
          listar();
          return;
        }
        var r = orig.apply(this, arguments);
        var t = document.getElementById('tab-admin');
        if (t) t.style.display = 'none';
        var bb = document.getElementById('btn-tab-admin');
        if (bb) bb.classList.remove('active');
        return r;
      };
      window.trocarAba.__admWrap = true;
    }

    document.getElementById('admCriar').onclick = cadastrar;
    document.getElementById('admAtualizar').onclick = listar;
    document.getElementById('admBackup').onclick = function () { backupUrgencia('manual-admin'); };
  }

  function msg(t, ok) {
    var el = document.getElementById('admMsg');
    if (!el) return;
    el.style.color = ok ? '#15803d' : '#b91c1c';
    el.textContent = t || '';
  }

  async function listar() {
    var tb = document.querySelector('#admTabela tbody');
    if (!tb || !sb()) return;
    var r = await sb().from('painel_perfis').select('*').order('email');
    if (r.error) { msg(r.error.message); return; }
    tb.innerHTML = '';
    (r.data || []).forEach(function (u) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + (u.email || '') + '</td>' +
        '<td>' + (u.nome || '') + '</td>' +
        '<td><select data-id="' + u.id + '" class="admPerfilLinha">' +
        '<option value="leitor"' + (u.perfil === 'leitor' || u.perfil === 'visitante' ? ' selected' : '') + '>Somente leitura</option>' +
        '<option value="editor"' + (u.perfil === 'editor' ? ' selected' : '') + '>Leitura e edição</option>' +
        '<option value="admin"' + (u.perfil === 'admin' ? ' selected' : '') + '>Admin</option>' +
        '</select></td>' +
        '<td>' + (u.ativo === false ? 'não' : 'sim') + '</td>' +
        '<td><button type="button" class="perigo admDel" data-id="' + u.id + '">Desativar</button></td>';
      tb.appendChild(tr);
    });
    tb.querySelectorAll('.admPerfilLinha').forEach(function (sel) {
      sel.onchange = async function () {
        var up = await sb().from('painel_perfis').update({ perfil: sel.value }).eq('id', sel.getAttribute('data-id'));
        msg(up.error ? up.error.message : 'Perfil atualizado', !up.error);
      };
    });
    tb.querySelectorAll('.admDel').forEach(function (bt) {
      bt.onclick = async function () {
        if (!confirm('Desativar este usuário?')) return;
        var up = await sb().from('painel_perfis').update({ ativo: false }).eq('id', bt.getAttribute('data-id'));
        msg(up.error ? up.error.message : 'Usuário desativado', !up.error);
        listar();
      };
    });
  }

  async function cadastrar() {
    if (!ehAdmin()) { msg('Só o administrador cadastra.'); return; }
    var email = (document.getElementById('admEmail').value || '').trim().toLowerCase();
    var nome = (document.getElementById('admNome').value || '').trim();
    var senha = document.getElementById('admSenha').value || '';
    var perfil = document.getElementById('admPerfil').value || 'leitor';
    if (!email || !senha) { msg('Preencha e-mail e senha.'); return; }
    try {
      if (window.PainelAuthSupabase && PainelAuthSupabase.cadastrarComEmail) {
        await PainelAuthSupabase.cadastrarComEmail(email, senha, nome, email, perfil);
      } else {
        var sign = await sb().auth.signUp({ email: email, password: senha });
        if (sign.error) throw sign.error;
      }
      msg('Usuário enviado. Confirme no Auth se o e-mail precisar de confirmação. Ajuste o perfil na lista.', true);
      listar();
    } catch (e) {
      msg(e.message || String(e));
    }
  }

  function aplicarAbas() {
    var r = regra();
    var permitidas = r.abas || [];
    document.querySelectorAll('#meu-menu-abas .tab-btn').forEach(function (el) {
      var id = (el.id || '').replace('btn-tab-', '');
      if (id === 'admin' || el.getAttribute('data-aba') === 'admin') {
        el.style.display = ehAdmin() ? '' : 'none';
        return;
      }
      if (!r.editar && permitidas.indexOf(id) < 0 && id) {
        el.style.display = 'none';
      }
    });
    var btnAdmin = document.getElementById('btn-tab-admin') || document.getElementById('btn-admin');
    if (btnAdmin) btnAdmin.style.display = ehAdmin() ? '' : 'none';
    document.body.classList.toggle('adm-so-leitura', !r.editar);
  }

  function pedirSenhaAdmin() {
    var s = window.prompt('Exclusão protegida. Digite a senha de administrador:');
    return s != null && String(s).length > 0 ? String(s) : '';
  }

  async function confirmarExclusao(nome) {
    if (ehAdmin()) return true;
    var senha = pedirSenhaAdmin();
    if (!senha) return false;
    var email = (sessao() && sessao().usuario) || '';
    try {
      var admins = await sb().from('painel_perfis').select('email').eq('perfil', 'admin').eq('ativo', true);
      var lista = (admins.data || []).map(function (a) { return String(a.email || '').toLowerCase(); });
      var alvo = lista[0] || email;
      var teste = await sb().auth.signInWithPassword({ email: alvo, password: senha });
      if (teste.error) {
        alert('Senha de administrador inválida.');
        return false;
      }
      return true;
    } catch (e) {
      alert('Não conferi a senha admin.');
      return false;
    }
  }

  async function backupUrgencia(motivo) {
    try {
      var corpo = {
        motivo: motivo || 'exclusao',
        quando: new Date().toISOString(),
        usuario: (sessao() && (sessao().usuario || sessao().email)) || '',
        dados: window.db || null
      };
      var r = await fetch('/api/backup-urgencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      });
      var j = await r.json();
      console.log('[admin] backup urgencia', j);
      return j;
    } catch (e) {
      console.warn('[admin] backup urgencia falhou', e);
      return { ok: false };
    }
  }

  function protegerExclusoes() {
    var nomes = ['excluirItem', 'excluirRecebimento', 'excluirObraAtual', 'deleteCronoTask', 'softDeleteFromTab'];
    nomes.forEach(function (nome) {
      var orig = window[nome];
      if (typeof orig !== 'function' || orig.__admWrap) return;
      var wrap = function () {
        var args = arguments;
        var ctx = this;
        return Promise.resolve(confirmarExclusao(nome)).then(function (ok) {
          if (!ok) return;
          return Promise.resolve(backupUrgencia(nome)).then(function () {
            return orig.apply(ctx, args);
          });
        });
      };
      wrap.__admWrap = true;
      window[nome] = wrap;
    });
  }

  function iniciar() {
    estilo();
    garantirAba();
    aplicarAbas();
    protegerExclusoes();
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      garantirAba();
      aplicarAbas();
      if (document.getElementById('btn-tab-admin') || n > 20) clearInterval(t);
    }, 500);
    setInterval(aplicarAbas, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 600);

  window.AdminPainel = { listar: listar, aplicarAbas: aplicarAbas, backupUrgencia: backupUrgencia, ehAdmin: ehAdmin };
})();
