
                /* ====== PATCH79_SEGURANCA_OK - login + trava de exclusao ====== */
                (function () {
                  'use strict';
                  if (window.__PS79) { return; }
                  window.__PS79 = true;
                
                  var K_USERS = window.PainelNucleo.K_USERS;   /* PATCH108 */
                  var K_CFG   = 'painel_seg_config_v1';
                  var K_LOG   = 'painel_seg_log_v1';
                  var K_SESS  = window.PainelNucleo.K_SESS;    /* PATCH108 */
                  var MIN_LIB = 5;          /* minutos de liberacao apos digitar a senha */
                  var DIAS_LEMBRAR = 30;
                
                  var RE_DEL = /(exclu|apag|delet|remov|lixeira)/i;
                  var RE_RO  = /(exclu|apag|delet|remov|salvar|gravar|adicionar|lancar|lan\u00e7ar|importar|novo\b|nova\b)/i;
                
                  var autorizadoAte = 0;
                
                  /* ---------------------------------------------------------------- *
                   * 1) SHA-256 puro (sem dependencia externa, funciona em http e file)
                   * ---------------------------------------------------------------- */
                  /* PATCH108: usa o calculo unico de senha do nucleo (window.PainelNucleo). */
                  function sha256(str) { return window.PainelNucleo.sha256(str); }
                
                  /* PATCH108: codigo da senha vem do nucleo unico. */
                  function hashSenha(usuario, senha) { return window.PainelNucleo.hashSenha(usuario, senha); }
                
                  /* ---------------------------------------------------------------- *
                   * 2) armazenamento
                   * ---------------------------------------------------------------- */
                  function ler(k, def) {
                    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
                  }
                  function gravar(k, v) {
                    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
                  }
                
                  function usuarios() {
                    var u = ler(K_USERS, null);
                    if (!u || !u.length) {
                      u = [{ usuario: 'admin', nome: 'Administrador', perfil: 'admin', hash: hashSenha('admin', 'admin123'), trocar: true }];
                      gravar(K_USERS, u);
                    }
                    return u;
                  }
                  function salvarUsuarios(u) { gravar(K_USERS, u); }
                
                  function config() {
                    var c = ler(K_CFG, null) || {};
                    if (c.modo !== 'sempre' && c.modo !== 'fora' && c.modo !== 'bloqueado') { c.modo = 'fora'; }
                    return c;
                  }
                  function salvarConfigSeg(c) { gravar(K_CFG, c); }
                
                  function registrar(acao, detalhe) {
                    try {
                      var lg = ler(K_LOG, []) || [];
                      var s = sessao();
                      lg.unshift({ q: s ? s.usuario : '(sem login)', t: Date.now(), a: acao, d: String(detalhe || '').slice(0, 160) });
                      if (lg.length > 300) { lg = lg.slice(0, 300); }
                      gravar(K_LOG, lg);
                    } catch (e) {}
                  }
                
                  /* PATCH108: leitura da sessao vem do nucleo unico. */
                  function sessao() { return window.PainelNucleo.sessao(); }
                  function abrirSessao(u, lembrar) {
                    var s = { usuario: u.usuario, nome: u.nome || u.usuario, perfil: u.perfil, em: Date.now() };
                    try { sessionStorage.setItem(K_SESS, JSON.stringify(s)); } catch (e) {}
                    if (lembrar) {
                      s.exp = Date.now() + DIAS_LEMBRAR * 86400000;
                      gravar(K_SESS, s);
                    } else {
                      try { localStorage.removeItem(K_SESS); } catch (e) {}
                    }
                  }
                  function fecharSessao() {
                    try { sessionStorage.removeItem(K_SESS); } catch (e) {}
                    try { localStorage.removeItem(K_SESS); } catch (e) {}
                    autorizadoAte = 0;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 3) regras de permissao
                   * ---------------------------------------------------------------- */
                  function noServidor() {
                    var h = String(location.hostname || '').toLowerCase();
                    if (location.protocol === 'file:') { return true; }
                    return (h === '' || h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]');
                  }
                
                  /* PATCH107: aceita Admin, ADMIN, ' admin ' etc. */
                  function perfil() { var s = sessao(); return s ? String(s.perfil || '').trim().toLowerCase() : null; }
                  function ehAdmin() { return perfil() === 'admin'; }
                  function soLeitura() { var p = perfil(); return p === 'visitante' || p === 'leitor'; }
                  function liberado() { return Date.now() < autorizadoAte; }
                
                  function podeExcluirAgora() {
                    var s = sessao();
                    if (!s) { return 'login'; }
                    var c = config();
                    if (c.modo === 'bloqueado' && !noServidor()) { return 'bloqueado'; }
                    if (soLeitura()) { return liberado() ? 'ok' : 'senha'; }
                    if (liberado()) { return 'ok'; }
                    if (c.modo === 'fora' && noServidor() && ehAdmin()) { return 'ok'; } /* PATCH107 */
                    return 'senha';
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 4) estilo e avisos
                   * ---------------------------------------------------------------- */
                  function estilo() {
                    if (document.getElementById('ps79Estilo')) { return; }
                    var st = document.createElement('style');
                    st.id = 'ps79Estilo';
                    st.textContent = [
                      '#ps79Login{position:fixed;inset:0;z-index:2147483000;background:linear-gradient(160deg,#0f172a,#1e293b);display:flex;align-items:center;justify-content:center;font-family:Segoe UI,Arial,sans-serif}',
                      '#ps79Login .cx{background:#fff;border-radius:14px;padding:26px 26px 20px;width:340px;box-shadow:0 18px 50px rgba(0,0,0,.45)}',
                      '#ps79Login h2{margin:0 0 4px;font-size:19px;color:#16304f}',
                      '#ps79Login p.sb{margin:0 0 16px;font-size:12px;color:#64748b}',
                      '#ps79Login label{display:block;font-size:12px;color:#334155;margin:10px 0 4px;font-weight:600}',
                      '#ps79Login input[type=text],#ps79Login input[type=email],#ps79Login input[type=password]{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px}',
                      '#ps79Login .lb{display:flex;align-items:center;gap:6px;margin:12px 0 0;font-size:12px;color:#475569;font-weight:400}',
                      '#ps79Login button{width:100%;margin-top:14px;padding:10px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:15px;font-weight:600;cursor:pointer}',
                      '#ps79Login .er{margin-top:10px;font-size:12px;color:#b91c1c;min-height:16px}',
                      '#ps79Barra{position:fixed;right:14px;bottom:14px;z-index:2147482000;display:flex;align-items:center;gap:8px;background:#16304f;color:#fff;border-radius:999px;padding:6px 8px 6px 14px;font:12px Segoe UI,Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.28)}',
                      '#ps79Barra b{font-weight:600}',
                      '#ps79Barra .tag{background:#2563eb;border-radius:999px;padding:2px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px}',
                      '#ps79Barra .tag.ro{background:#64748b}',
                      '#ps79Barra button{border:0;border-radius:999px;padding:5px 11px;font-size:11px;font-weight:600;cursor:pointer;background:#e2e8f0;color:#16304f}',
                      '#ps79Barra button.on{background:#16a34a;color:#fff}',
                      '#ps79Modal{position:fixed;inset:0;z-index:2147483100;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;font-family:Segoe UI,Arial,sans-serif}',
                      '#ps79Modal .cx{background:#fff;border-radius:12px;padding:22px;width:min(560px,92vw);max-height:86vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.4)}',
                      '#ps79Modal h3{margin:0 0 12px;font-size:17px;color:#16304f}',
                      '#ps79Modal label{display:block;font-size:12px;color:#334155;margin:10px 0 4px;font-weight:600}',
                      '#ps79Modal input,#ps79Modal select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px}',
                      '#ps79Modal .row{display:flex;gap:8px;flex-wrap:wrap}',
                      '#ps79Modal .row>div{flex:1 1 150px}',
                      '#ps79Modal .bt{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}',
                      '#ps79Modal button{border:0;border-radius:8px;padding:9px 15px;font-size:13px;font-weight:600;cursor:pointer;background:#e2e8f0;color:#16304f}',
                      '#ps79Modal button.pri{background:#2563eb;color:#fff}',
                      '#ps79Modal button.del{background:#fee2e2;color:#b91c1c}',
                      '#ps79Modal table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}',
                      '#ps79Modal th,#ps79Modal td{border-bottom:1px solid #e2e8f0;padding:6px 6px;text-align:left}',
                      '#ps79Modal .er{margin-top:10px;font-size:12px;color:#b91c1c;min-height:16px}',
                      '#ps79Modal .dica{font-size:11px;color:#64748b;margin:6px 0 0}',
                      '.ps79Toast{position:fixed;left:50%;top:22px;transform:translateX(-50%);z-index:2147483200;background:#16304f;color:#fff;padding:11px 18px;border-radius:10px;font:13px Segoe UI,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)}',
                      '.ps79Toast.err{background:#b91c1c}',
                      '.ps79Toast.ok{background:#15803d}'
                    ].join('\n');
                    (document.head || document.documentElement).appendChild(st);
                  }
                
                  function toast(msg, tipo) {
                    try {
                      var d = document.createElement('div');
                      d.className = 'ps79Toast' + (tipo ? ' ' + tipo : '');
                      d.setAttribute('data-ps79', '1');
                      d.textContent = msg;
                      document.body.appendChild(d);
                      setTimeout(function () { if (d.parentNode) { d.parentNode.removeChild(d); } }, 3200);
                    } catch (e) {}
                  }
                
                  function fecharModal() {
                    var m = document.getElementById('ps79Modal');
                    if (m && m.parentNode) { m.parentNode.removeChild(m); }
                  }
                
                  function novoModal(titulo) {
                    fecharModal();
                    var ov = document.createElement('div');
                    ov.id = 'ps79Modal';
                    ov.setAttribute('data-ps79', '1');
                    var cx = document.createElement('div');
                    cx.className = 'cx';
                    var h = document.createElement('h3');
                    h.textContent = titulo;
                    cx.appendChild(h);
                    ov.appendChild(cx);
                    document.body.appendChild(ov);
                    ov.addEventListener('click', function (ev) { if (ev.target === ov) { fecharModal(); } });
                    return cx;
                  }
                
                  function campo(pai, rotulo, tipo, valor) {
                    var l = document.createElement('label');
                    l.textContent = rotulo;
                    var i = document.createElement('input');
                    i.type = tipo || 'text';
                    if (valor != null) { i.value = valor; }
                    pai.appendChild(l);
                    pai.appendChild(i);
                    return i;
                  }
                
                  function botao(pai, texto, classe, fn) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    if (classe) { b.className = classe; }
                    b.textContent = texto;
                    b.addEventListener('click', fn);
                    pai.appendChild(b);
                    return b;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 5) tela de login
                   * ---------------------------------------------------------------- */
                  function telaLogin() {
                    estilo();
                    if (document.getElementById('ps79Login')) { return; }
                    var ov = document.createElement('div');
                    ov.id = 'ps79Login';
                    ov.setAttribute('data-ps79', '1');
                    var cx = document.createElement('div');
                    cx.className = 'cx';
                    var h = document.createElement('h2');
                    h.textContent = 'Painel de Acompanhamento';
                    var p = document.createElement('p');
                    p.className = 'sb';
                    p.textContent = 'Entre com seu usuario e senha para continuar.';
                    cx.appendChild(h);
                    cx.appendChild(p);
                    var iu = campo(cx, 'E-mail', 'email', '');
                    var is = campo(cx, 'Senha', 'password', '');
                    var lb = document.createElement('label');
                    lb.className = 'lb';
                    var ck = document.createElement('input');
                    ck.type = 'checkbox';
                    var sp = document.createElement('span');
                    sp.textContent = 'Manter conectado neste computador';
                    lb.appendChild(ck);
                    lb.appendChild(sp);
                    cx.appendChild(lb);
                    var er = document.createElement('div');
                    er.className = 'er';
                    var bt = document.createElement('button');
                    bt.type = 'button';
                    bt.textContent = 'Entrar';
                    cx.appendChild(bt);
                    cx.appendChild(er);
                    ov.appendChild(cx);
                    document.body.appendChild(ov);
                    setTimeout(function () { try { iu.focus(); } catch (e) {} }, 60);
                
                    async function tentar() {
                      var identificador = String(iu.value || '').trim().toLowerCase();
                      var senha = String(is.value || '');
                      if (!identificador || !senha) { er.textContent = 'Preencha o e-mail e a senha.'; return; }
                
                      // Usuários novos entram pelo Supabase usando e-mail.
                      if (window.PainelAuthSupabase && identificador.indexOf('@') >= 1) {
                        bt.disabled = true;
                        bt.textContent = 'Entrando...';
                        er.textContent = '';
                        try {
                          var resultado = await window.PainelAuthSupabase.entrarComEmail(identificador, senha);
                          var perfil = resultado.perfil;
                          var usuarioAuth = resultado.user;
                          var sessaoSupabase = {
                            usuario: perfil.usuario,
                            nome: perfil.nome || perfil.usuario,
                            perfil: perfil.perfil,
                            authId: usuarioAuth.id,
                            at: Date.now()
                          };
                          /* PATCH_podeMexer: gravar no sessionStorage TAMBÉM para que PainelNucleo.sessao() encontre */
                    try { sessionStorage.setItem(K_SESS, JSON.stringify(sessaoSupabase)); } catch (e7) {}
                    if (typeof gravarJson === 'function' && typeof K_SESS !== 'undefined') {
                      gravarJson(K_SESS, sessaoSupabase);
                    }
                          registrar('login-supabase', perfil.usuario);
                          if (ov.parentNode) { ov.parentNode.removeChild(ov); }
                          barra();
                          toast('Bem-vindo, ' + (perfil.nome || perfil.usuario) + '!', 'ok');
                        } catch (erro) {
                          console.error('Erro no login Supabase:', erro);
                          er.textContent = erro && erro.message ? erro.message : 'E-mail ou senha inválidos.';
                          is.value = '';
                        } finally {
                          bt.disabled = false;
                          bt.textContent = 'Entrar';
                        }
                        return;
                      }
                
                      er.textContent = window.PainelAuthSupabase
                        ? 'Use o e-mail cadastrado no Supabase Auth.'
                        : 'O cliente Supabase não foi carregado. Verifique supabase_auth_client.js.';
                      return;
                    }
                    bt.addEventListener('click', tentar);
                    is.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { tentar(); } });
                    iu.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { is.focus(); } });
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 6) barra de status
                   * ---------------------------------------------------------------- */
                  function barra() {
                    estilo();
                    var s = sessao();
                    var b = document.getElementById('ps79Barra');
                    if (!s) { if (b && b.parentNode) { b.parentNode.removeChild(b); } return; }
                    if (b && b.parentNode) { b.parentNode.removeChild(b); }
                    b = document.createElement('div');
                    b.id = 'ps79Barra';
                    b.setAttribute('data-ps79', '1');
                    var ic = document.createElement('span');
                    ic.textContent = liberado() ? '\uD83D\uDD13' : '\uD83D\uDD12';
                    var nm = document.createElement('b');
                    nm.textContent = s.nome || s.usuario;
                    var tg = document.createElement('span');
                    tg.className = 'tag' + (ehAdmin() ? '' : ' ro'); /* PATCH107 */
                    tg.textContent = s.perfil;
                    b.appendChild(ic);
                    b.appendChild(nm);
                    b.appendChild(tg);
                    botao(b, liberado() ? 'Exclusao liberada' : 'Liberar exclusao', liberado() ? 'on' : '', function () {
                      if (liberado()) { autorizadoAte = 0; toast('Exclusoes bloqueadas novamente.'); barra(); return; }
                      modalSenha('Liberar exclusoes por ' + MIN_LIB + ' minutos');
                    });
                    if (ehAdmin()) { /* PATCH107 */
                      botao(b, 'Usuarios', '', function () { modalUsuarios(); });
                    }
                    botao(b, 'Trocar senha', '', function () { modalTrocarSenha(s.usuario, false); });
                    botao(b, 'Sair', '', function () {
                      registrar('logout', s.usuario);
                      fecharSessao();
                      if (b.parentNode) { b.parentNode.removeChild(b); }
                      telaLogin();
                    });
                    document.body.appendChild(b);
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 7) modal de senha do administrador
                   * ---------------------------------------------------------------- */
                  function modalSenha(titulo) {
                    var c = config();
                    if (c.modo === 'bloqueado' && !noServidor()) {
                      novoModal('Exclusao bloqueada');
                      toast('Exclusoes so no computador servidor.', 'err');
                      fecharModal();
                      return;
                    }
                    var cx = novoModal(titulo || 'Autorizacao do administrador');
                    /* PATCH107: ja vem preenchido com quem esta conectado */
                    var s107 = (typeof sessao === 'function') ? sessao() : null;
                    var iu = campo(cx, 'Administrador (usuario ou e-mail da nuvem)', 'text',
                                   (s107 && s107.usuario) ? String(s107.usuario) : 'admin');
                    var is = campo(cx, 'Senha', 'password', '');
                    var er = document.createElement('div');
                    er.className = 'er';
                    cx.appendChild(er);
                    var d = document.createElement('p');
                    d.className = 'dica';
                    d.textContent = 'Se voce entrou pelo cadastro na nuvem, use o mesmo e-mail e a mesma senha da entrada. '
                      + 'Depois de liberar, as exclusoes ficam permitidas por ' + MIN_LIB + ' minutos nesta tela.';
                    cx.appendChild(d);
                    var bt = document.createElement('div');
                    bt.className = 'bt';
                    cx.appendChild(bt);
                    botao(bt, 'Cancelar', '', fecharModal);
                
                    /* PATCH107: confere na lista deste navegador E tambem no cadastro da nuvem */
                    function liberar107(quemFoi) {
                      autorizadoAte = Date.now() + MIN_LIB * 60000;
                      registrar('exclusao-liberada', quemFoi);
                      fecharModal();
                      barra();
                      toast('Exclusoes liberadas por ' + MIN_LIB + ' minutos.', 'ok');
                    }
                
                    function ok() {
                      var nome = String(iu.value || '').trim().toLowerCase();
                      var senha = String(is.value || '');
                      var lista = usuarios(), achou = null, i, u107;
                      for (i = 0; i < lista.length; i++) {
                        u107 = String(lista[i].usuario || '').trim().toLowerCase();
                        if (u107 === nome && String(lista[i].perfil || '').trim().toLowerCase() === 'admin') { achou = lista[i]; break; }
                      }
                      if (achou && (achou.hash === hashSenha(nome, senha) ||
                                    achou.hash === hashSenha(String(achou.usuario || ''), senha))) {
                        liberar107(achou.usuario);
                        return;
                      }
                
                      var nuvem107 = window.PainelAuthSupabase;
                      if (nuvem107 && typeof nuvem107.entrarComEmail === 'function' && nome.indexOf('@') >= 1 && senha) {
                        er.textContent = 'Conferindo no cadastro da nuvem...';
                        try {
                          nuvem107.entrarComEmail(nome, senha).then(function (res) {
                            var p107 = (res && res.perfil) ? String(res.perfil.perfil || '').trim().toLowerCase() : '';
                            if (p107 !== 'admin') {
                              er.textContent = 'Este acesso existe, mas nao e de administrador.';
                              is.value = '';
                              registrar('autorizacao-negada', nome);
                              return;
                            }
                            liberar107(res.perfil.usuario || nome);
                          })['catch'](function (erro) {
                            er.textContent = (erro && erro.message) ? erro.message : 'E-mail ou senha invalidos.';
                            is.value = '';
                            registrar('autorizacao-negada', nome);
                          });
                        } catch (e) {
                          er.textContent = 'Nao consegui falar com o cadastro da nuvem agora.';
                        }
                        return;
                      }
                
                      er.textContent = senha
                        ? 'Usuario ou senha de administrador invalidos.'
                        : 'Digite a senha do administrador.';
                      is.value = '';
                      registrar('autorizacao-negada', nome);
                    }
                
                    /* quem ja entrou como administrador libera sem digitar de novo */
                    if (typeof ehAdmin === 'function' && ehAdmin()) {
                      var av107 = document.createElement('p');
                      av107.className = 'dica';
                      av107.textContent = 'Voce esta conectado como administrador. Pode liberar direto no botao abaixo.';
                      cx.insertBefore(av107, bt);
                      botao(bt, 'Sou administrador, liberar', 'pri', function () {
                        var s2 = (typeof sessao === 'function') ? sessao() : null;
                        liberar107((s2 && s2.usuario) ? s2.usuario : 'admin');
                      });
                    }
                
                    botao(bt, 'Liberar', 'pri', ok);
                    is.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ok(); } });
                    setTimeout(function () { try { is.focus(); } catch (e) {} }, 60);
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 8) trocar senha
                   * ---------------------------------------------------------------- */
                  function modalTrocarSenha(usuario, obrigatorio) {
                    var cx = novoModal(obrigatorio ? 'Defina uma nova senha' : 'Trocar minha senha');
                    if (obrigatorio) {
                      var av = document.createElement('p');
                      av.className = 'dica';
                      av.textContent = 'Este usuario ainda usa a senha inicial. Escolha uma senha nova.';
                      cx.appendChild(av);
                    }
                    var ia = campo(cx, 'Senha atual', 'password', '');
                    var i1 = campo(cx, 'Nova senha', 'password', '');
                    var i2 = campo(cx, 'Repita a nova senha', 'password', '');
                    var er = document.createElement('div');
                    er.className = 'er';
                    cx.appendChild(er);
                    var bt = document.createElement('div');
                    bt.className = 'bt';
                    cx.appendChild(bt);
                    if (!obrigatorio) { botao(bt, 'Cancelar', '', fecharModal); }
                    botao(bt, 'Salvar', 'pri', function () {
                      var lista = usuarios(), u = null, i;
                      for (i = 0; i < lista.length; i++) {
                        if (String(lista[i].usuario).toLowerCase() === String(usuario).toLowerCase()) { u = lista[i]; break; }
                      }
                      if (!u) { er.textContent = 'Usuario nao encontrado.'; return; }
                      if (u.hash !== hashSenha(u.usuario, String(ia.value || ''))) { er.textContent = 'Senha atual incorreta.'; return; }
                      var n1 = String(i1.value || '');
                      if (n1.length < 4) { er.textContent = 'A nova senha precisa de pelo menos 4 caracteres.'; return; }
                      if (n1 !== String(i2.value || '')) { er.textContent = 'As duas senhas novas nao coincidem.'; return; }
                      u.hash = hashSenha(u.usuario, n1);
                      u.trocar = false;
                      salvarUsuarios(lista);
                      registrar('senha-trocada', u.usuario);
                      fecharModal();
                      toast('Senha atualizada.', 'ok');
                    });
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 9) gerenciar usuarios (somente admin)
                   * ---------------------------------------------------------------- */
                  function modalUsuarios() {
                    if (!ehAdmin()) { toast('Somente o administrador pode gerenciar usuarios.', 'err'); return; }
                    var cx = novoModal('Usuarios e permissoes');
                    var lista = usuarios();
                
                    var tb = document.createElement('table');
                    var thead = document.createElement('tr');
                    ['Usuario', 'Nome', 'Perfil', ''].forEach(function (t) {
                      var th = document.createElement('th');
                      th.textContent = t;
                      thead.appendChild(th);
                    });
                    tb.appendChild(thead);
                    lista.forEach(function (u) {
                      var tr = document.createElement('tr');
                      [u.usuario, u.nome || '', u.perfil].forEach(function (v) {
                        var td = document.createElement('td');
                        td.textContent = v;
                        tr.appendChild(td);
                      });
                      var td = document.createElement('td');
                      botao(td, 'Nova senha', '', function () {
                        var s = window.prompt('Nova senha para ' + u.usuario + ' (minimo 4 caracteres):', '');
                        if (s == null) { return; }
                        if (String(s).length < 4) { toast('Senha muito curta.', 'err'); return; }
                        u.hash = hashSenha(u.usuario, String(s));
                        u.trocar = true;
                        salvarUsuarios(lista);
                        registrar('senha-redefinida', u.usuario);
                        toast('Senha redefinida.', 'ok');
                      });
                      botao(td, 'Remover', 'del', function () {
                        var admins = lista.filter(function (x) { return x.perfil === 'admin'; }).length;
                        if (u.perfil === 'admin' && admins <= 1) { toast('Precisa existir pelo menos um administrador.', 'err'); return; }
                        var idx = lista.indexOf(u);
                        if (idx >= 0) { lista.splice(idx, 1); }
                        salvarUsuarios(lista);
                        registrar('usuario-removido', u.usuario);
                        modalUsuarios();
                      });
                      tr.appendChild(td);
                      tb.appendChild(tr);
                    });
                    cx.appendChild(tb);
                
                    var h4 = document.createElement('h3');
                    h4.textContent = 'Novo usuario';
                    h4.style.marginTop = '18px';
                    cx.appendChild(h4);
                    var row = document.createElement('div');
                    row.className = 'row';
                    cx.appendChild(row);
                    var d1 = document.createElement('div'), d2 = document.createElement('div'), d3 = document.createElement('div'), d4 = document.createElement('div');
                    row.appendChild(d1); row.appendChild(d2); row.appendChild(d3); row.appendChild(d4);
                    var nu = campo(d1, 'Usuario', 'text', '');
                    var nn = campo(d2, 'Nome', 'text', '');
                    var lp = document.createElement('label');
                    lp.textContent = 'Perfil';
                    var sel = document.createElement('select');
                    [['admin', 'admin (tudo, inclusive excluir)'], ['editor', 'editor (lanca e edita)'], ['visitante', 'visitante (somente ver)']].forEach(function (o) {
                      var op = document.createElement('option');
                      op.value = o[0];
                      op.textContent = o[1];
                      sel.appendChild(op);
                    });
                    sel.value = 'editor';
                    d3.appendChild(lp);
                    d3.appendChild(sel);
                    var ns = campo(d4, 'Senha', 'password', '');
                    var er = document.createElement('div');
                    er.className = 'er';
                    cx.appendChild(er);
                
                    var hc = document.createElement('h3');
                    hc.textContent = 'Regra de exclusao';
                    hc.style.marginTop = '18px';
                    cx.appendChild(hc);
                    var lc = document.createElement('label');
                    lc.textContent = 'Quando permitir apagar registros';
                    var sc = document.createElement('select');
                    [['fora', 'No servidor o admin apaga direto; de outro computador exige senha'], ['sempre', 'Sempre pedir a senha do administrador'], ['bloqueado', 'Somente no servidor (de fora, nao apaga nem com senha)']].forEach(function (o) {
                      var op = document.createElement('option');
                      op.value = o[0];
                      op.textContent = o[1];
                      sc.appendChild(op);
                    });
                    sc.value = config().modo;
                    cx.appendChild(lc);
                    cx.appendChild(sc);
                    var dd = document.createElement('p');
                    dd.className = 'dica';
                    dd.textContent = 'Este computador ' + (noServidor() ? 'E o servidor do painel.' : 'esta acessando pela rede (nao e o servidor).');
                    cx.appendChild(dd);
                
                    var hl = document.createElement('h3');
                    hl.textContent = 'Ultimos registros';
                    hl.style.marginTop = '18px';
                    cx.appendChild(hl);
                    var lg = ler(K_LOG, []) || [];
                    var tl = document.createElement('table');
                    lg.slice(0, 25).forEach(function (r) {
                      var tr = document.createElement('tr');
                      var d = new Date(r.t);
                      [d.toLocaleString('pt-BR'), r.q, r.a, r.d].forEach(function (v) {
                        var td = document.createElement('td');
                        td.textContent = String(v == null ? '' : v);
                        tr.appendChild(td);
                      });
                      tl.appendChild(tr);
                    });
                    if (!lg.length) {
                      var p0 = document.createElement('p');
                      p0.className = 'dica';
                      p0.textContent = 'Nenhum registro ainda.';
                      cx.appendChild(p0);
                    }
                    cx.appendChild(tl);
                
                    var bt = document.createElement('div');
                    bt.className = 'bt';
                    cx.appendChild(bt);
                    botao(bt, 'Fechar', '', fecharModal);
                    botao(bt, 'Salvar', 'pri', function () {
                      var c = config();
                      c.modo = sc.value;
                      salvarConfigSeg(c);
                      var nome = String(nu.value || '').trim().toLowerCase();
                      if (nome) {
                        var i;
                        for (i = 0; i < lista.length; i++) {
                          if (String(lista[i].usuario).toLowerCase() === nome) { er.textContent = 'Ja existe um usuario com esse nome.'; return; }
                        }
                        if (String(ns.value || '').length < 4) { er.textContent = 'A senha do novo usuario precisa de pelo menos 4 caracteres.'; return; }
                        lista.push({ usuario: nome, nome: String(nn.value || '').trim() || nome, perfil: sel.value, hash: hashSenha(nome, String(ns.value)), trocar: true });
                        salvarUsuarios(lista);
                        registrar('usuario-criado', nome + ' / ' + sel.value);
                      }
                      fecharModal();
                      toast('Configuracoes salvas.', 'ok');
                    });
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 10) trava de exclusao
                   * ---------------------------------------------------------------- */
                  function pedirAutorizacao(detalhe) {
                    var st = podeExcluirAgora();
                    if (st === 'ok') { return true; }
                    if (st === 'login') { telaLogin(); return false; }
                    if (st === 'bloqueado') {
                      toast('Exclusao permitida somente no computador servidor.', 'err');
                      registrar('exclusao-bloqueada', detalhe);
                      return false;
                    }
                    toast('Exclusao protegida. Informe a senha do administrador.', 'err');
                    registrar('exclusao-tentativa', detalhe);
                    modalSenha('Autorizacao para apagar');
                    return false;
                  }
                
                  /* 10a) window.confirm - quase toda exclusao do painel passa por aqui */
                  var confirmOrig = window.confirm;
                  window.confirm = function (msg) {
                    var texto = String(msg == null ? '' : msg);
                    if (RE_DEL.test(texto)) {
                      if (!pedirAutorizacao(texto)) { return false; }
                      var r = confirmOrig.call(window, texto);
                      if (r) { registrar('exclusao-confirmada', texto); }
                      return r;
                    }
                    if (soLeitura()) {
                      toast('Seu perfil e somente leitura.', 'err');
                      return false;
                    }
                    return confirmOrig.call(window, texto);
                  };
                
                  /* 10b) clique em botoes de exclusao que nao usam confirm */
                  function alvoSuspeito(el, re) {
                    var n = 0, e = el;
                    while (e && e.nodeType === 1 && n < 6) {
                      if (e.getAttribute && e.getAttribute('data-ps79')) { return null; }
                      if (e.id === 'ps79Login' || e.id === 'ps79Modal' || e.id === 'ps79Barra') { return null; }
                      var oc = e.getAttribute ? (e.getAttribute('onclick') || '') : '';
                      if (oc && re.test(oc)) { return oc; }
                      var lab = e.getAttribute ? (e.getAttribute('title') || e.getAttribute('aria-label') || '') : '';
                      if (lab && re.test(lab)) { return lab; }
                      var t = (e.textContent || '').trim();
                      if (t && t.length <= 26 && re.test(t)) { return t; }
                      e = e.parentNode;
                      n++;
                    }
                    return null;
                  }
                
                  document.addEventListener('click', function (ev) {
                    try {
                      if (!sessao()) { return; }
                      var alvo = alvoSuspeito(ev.target, RE_DEL);
                      if (alvo) {
                        if (podeExcluirAgora() === 'ok') { return; }
                        ev.preventDefault();
                        ev.stopImmediatePropagation();
                        pedirAutorizacao(alvo);
                        return;
                      }
                      if (soLeitura()) {
                        var ro = alvoSuspeito(ev.target, RE_RO);
                        if (ro) {
                          ev.preventDefault();
                          ev.stopImmediatePropagation();
                          toast('Seu perfil e somente leitura.', 'err');
                        }
                      }
                    } catch (e) {}
                  }, true);
                
                  /* 10c) funcoes globais de exclusao ganham a mesma trava */
                  var NOMES = ['deleteCronoTask','excluirRecebimento','excluirObraAtual','softDeleteFromTab','excluirItem',
                    'excluirColaborador','excluirLancamentoPgto','limparMesPgto','deleteSelectedSpecsCTM','deleteSpecCTM',
                    'deleteHistoryEntryCTM','deleteSelectedHistoryCTM','deleteCustomTypeCTM','excluirCusto','excluirEvento',
                    'excluirLink','resetarTabela'];
                
                  function envolverGlobais() {
                    NOMES.forEach(function (n) {
                      try {
                        var f = window[n];
                        if (typeof f !== 'function' || f.__ps79) { return; }
                        var novo = function () {
                          if (!pedirAutorizacao(n)) { return; }
                          return f.apply(this, arguments);
                        };
                        novo.__ps79 = true;
                        window[n] = novo;
                      } catch (e) {}
                    });
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 11) inicio
                   * ---------------------------------------------------------------- */
                  window.PainelSeg = {
                    login: telaLogin,
                    barra: barra,
                    usuarios: modalUsuarios,
                    sessao: sessao,
                    liberar: function () { modalSenha('Autorizacao para apagar'); },
                    RECUPERAR: function () {
                      try {
                        localStorage.removeItem(K_USERS);
                        localStorage.removeItem(K_SESS);
                        sessionStorage.removeItem(K_SESS);
                      } catch (e) {}
                      alert('Usuarios reiniciados. Recarregue a pagina e entre com admin / admin123.');
                    }
                  };
                
                  function iniciar() {
                    try { estilo(); } catch (e) {}
                    try { envolverGlobais(); } catch (e) {}
                    setTimeout(envolverGlobais, 1500);
                    setTimeout(envolverGlobais, 5000);
                    if (sessao()) { barra(); } else { telaLogin(); }
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                })();
            
