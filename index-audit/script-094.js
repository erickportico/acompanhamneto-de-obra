
        if (false) { /* PATCH154_DISABLED */
        /* =====================================================================
         * PATCH 131 - cadastro centralizado, liberacao pelo administrador,
         *             modo somente consulta e bloqueio de tela
         * ===================================================================== */
        (function () {
          if (window.__p131) { return; }
          window.__p131 = true;
        
          var MINUTOS = 5;
          var LIMITE = MINUTOS * 60 * 1000;
        
          var estado = {
            email: '',
            perfil: '',
            ativo: null,
            admin: false,
            leitura: false,
            ultimoToque: Date.now(),
            travado: false,
            botoesDesligados: 0,
            listaCarregada: 0
          };
        
          function porId(x) { return document.getElementById(x); }
        
          function cliente() {
            try { if (typeof _supabase !== 'undefined' && _supabase) { return _supabase; } } catch (e) {}
            if (window._supabase) { return window._supabase; }
            if (window.supabaseClient) { return window.supabaseClient; }
            if (window.supabase && window.supabase.from) { return window.supabase; }
            return null;
          }
        
          function sessao() {
            var chaves = ['painel_seg_sessao_v1'], i, bruto = null;
            for (i = 0; i < chaves.length; i++) {
              try { bruto = sessionStorage.getItem(chaves[i]); } catch (e) { bruto = null; }
              if (!bruto) {
                try { bruto = localStorage.getItem(chaves[i]); } catch (e2) { bruto = null; }
              }
              if (bruto) {
                try { return JSON.parse(bruto); } catch (e3) { return null; }
              }
            }
            return null;
          }
        
          function texto(el) { return String(el && el.textContent ? el.textContent : '').toLowerCase(); }
        
          /* ================================================================ *
           * 1) as duas portas que faltavam: listar e cadastrar
           * ================================================================ */
          function listarPerfis() {
            var sb = cliente();
            if (!sb) {
              return Promise.reject(new Error('O painel nao esta conseguindo falar com o servidor agora.'));
            }
            return sb.from('painel_perfis').select('*').then(function (r) {
              if (r.error) { throw new Error(r.error.message || 'Nao consegui ler a lista de usuarios.'); }
              var lista = r.data || [];
              lista.sort(function (a, b) {
                return String(a.email || '').localeCompare(String(b.email || ''));
              });
              estado.listaCarregada = lista.length;
              return lista.map(function (u) {
                return {
                  id: u.id,
                  /* a tabela nao tem coluna usuario: o e-mail e o nome de acesso */
                  usuario: u.email || '',
                  email: u.email || '',
                  nome: u.nome || u.email || '',
                  perfil: u.perfil || 'visitante',
                  ativo: u.ativo === true,
                  trocar_senha: u.trocar_senha === true,
                  criado_em: u.criado_em || '',
                  atualizado_em: u.ultimo_acesso || ''
                };
              });
            });
          }
        
          function cadastrarComEmail(email, senha, nome, usuario, perfil) {
            var sb = cliente();
            if (!sb) {
              return Promise.reject(new Error('Sem conexao com o servidor. Tente de novo com internet.'));
            }
            email = String(email || '').trim().toLowerCase();
            if (email.indexOf('@') < 1) {
              return Promise.reject(new Error('Informe um e-mail valido.'));
            }
            if (String(senha || '').length < 6) {
              return Promise.reject(new Error('A senha precisa de pelo menos 6 caracteres.'));
            }
            /* se alguem ja esta logado, cadastrar aqui derrubaria a sessao dele:
               nesse caso mandamos o caminho certo, sem quebrar nada */
            if (estado.email) {
              return Promise.reject(new Error(
                'Voce esta logado como ' + estado.email + '. Para nao derrubar a sua sessao, ' +
                'peca para a pessoa se cadastrar na tela de entrada do painel. ' +
                'Depois libere o acesso dela em Usuarios e liberacoes.'
              ));
            }
            return sb.auth.signUp({
              email: email,
              password: String(senha || ''),
              options: { data: { nome: String(nome || ''), usuario: String(usuario || '') } }
            }).then(function (r) {
              if (r.error) { throw new Error(r.error.message || 'Nao consegui criar o usuario.'); }
              /* qualquer tipo de acesso pedido na tela e ignorado de proposito:
                 conta nova nasce como somente consulta */
              var pedido = String(perfil || '');
              var recado = 'Conta criada. O acesso comeca como somente consulta ' +
                           'ate o administrador liberar.';
              if (pedido && pedido !== 'visitante') {
                recado = recado + ' O tipo "' + pedido + '" precisa ser dado pelo administrador.';
              }
              try {
                if (r.data && r.data.session) { sb.auth.signOut(); }
              } catch (e) {}
              return { criado: true, email: email, perfil: 'visitante', recado: recado };
            });
          }
        
          function salvarPerfil(id, perfil, ativo) {
            var sb = cliente();
            if (!sb) { return Promise.reject(new Error('Sem conexao com o servidor agora.')); }
            if (!estado.admin) {
              return Promise.reject(new Error('Somente o administrador muda tipo de acesso ou libera conta.'));
            }
            var mudanca = { perfil: perfil, ativo: !!ativo };
            return sb.from('painel_perfis').update(mudanca).eq('id', id).then(function (r) {
              if (r.error) {
                throw new Error(r.error.message ||
                  'O servidor recusou a mudanca. Confirme que voce e administrador.');
              }
              return true;
            });
          }
        
          function instalarPontes() {
            var alvo = window.PainelAuthSupabase;
            if (!alvo) { alvo = {}; window.PainelAuthSupabase = alvo; }
            if (typeof alvo.listarPerfis !== 'function' || alvo.listarPerfis.__p131) {
              alvo.listarPerfis = listarPerfis;
              alvo.listarPerfis.__p131 = true;
            }
            if (typeof alvo.cadastrarComEmail !== 'function' || alvo.cadastrarComEmail.__p131) {
              alvo.cadastrarComEmail = cadastrarComEmail;
              alvo.cadastrarComEmail.__p131 = true;
            }
            if (typeof alvo.salvarPerfil !== 'function' || alvo.salvarPerfil.__p131) {
              alvo.salvarPerfil = salvarPerfil;
              alvo.salvarPerfil.__p131 = true;
            }
          }
        
          /* ================================================================ *
           * 2) quem sou eu, segundo o servidor
           * ================================================================ */
          function meuPerfil() {
            var sb = cliente();
            var s = sessao();
            if (s) {
              estado.email = s.usuario || s.email || estado.email;
              estado.perfil = s.perfil || estado.perfil;
            }
            if (!sb || !sb.auth || !sb.auth.getUser) { return Promise.resolve(null); }
            return sb.auth.getUser().then(function (r) {
              var u = r && r.data ? r.data.user : null;
              if (!u) { return null; }
              estado.email = u.email || estado.email;
              return sb.from('painel_perfis').select('*').eq('id', u.id).limit(1).then(function (r2) {
                var linha = (r2 && r2.data && r2.data.length) ? r2.data[0] : null;
                if (linha) {
                  estado.perfil = linha.perfil || 'visitante';
                  estado.ativo = linha.ativo === true;
                  estado.admin = estado.perfil === 'admin' && estado.ativo;
                }
                aplicarLeitura();
                return linha;
              });
            }).catch(function () { return null; });
          }
        
          /* ================================================================ *
           * 3) modo somente consulta na tela
           * ================================================================ */
          var PALAVRAS = ['salvar', 'gravar', 'excluir', 'apagar', 'remover', 'cadastrar',
                          'novo', 'nova', 'adicionar', 'importar', 'lancar', 'duplicar'];
        
          function pareceGravacao(b) {
            var t = texto(b);
            if (!t) { return false; }
            var i;
            for (i = 0; i < PALAVRAS.length; i++) {
              if (t.indexOf(PALAVRAS[i]) >= 0) { return true; }
            }
            return false;
          }
        
          function faixa() {
            var f = porId('p131Faixa');
            if (f) { return f; }
            f = document.createElement('div');
            f.id = 'p131Faixa';
            if (document.body) { document.body.appendChild(f); }
            return f;
          }
        
          function aplicarLeitura() {
            var precisa = (estado.perfil === 'visitante') || (estado.ativo === false);
            estado.leitura = !!precisa;
            estado._p131BotoesOk = false; /* PATCH153b: resetar guard */
            var f = faixa();
            if (!document.body) { return; }
            if (!precisa) {
              document.body.classList.remove('p131-leitura');
              f.classList.remove('on');
              return;
            }
            document.body.classList.add('p131-leitura');
            if (estado.ativo === false) {
              f.textContent = 'Sua conta ainda nao foi liberada pelo administrador. ' +
                'Por enquanto voce so consulta, sem salvar nada.';
            } else {
              f.textContent = 'Voce esta como somente consulta. Para lancar ou editar, ' +
                'peca ao administrador para mudar o seu tipo de acesso.';
            }
            f.classList.add('on');
            desligarBotoes();
          }
        
          function desligarBotoes() { /* PATCH153b: guard flag */
            if (!estado.leitura) { estado._p131BotoesOk = false; return 0; }
            if (estado._p131BotoesOk) { return 0; }
            var lista = document.querySelectorAll('button'), i, n = 0;
            for (i = 0; i < lista.length; i++) {
              var b = lista[i];
              if (!b || b.getAttribute('data-p131-off')) { continue; }
              if (String(b.id || '').indexOf('p131') === 0) { continue; }
              if (!pareceGravacao(b)) { continue; }
              b.setAttribute('data-p131-off', '1');
              b.setAttribute('title', 'Somente consulta: peca liberacao ao administrador.');
              n = n + 1;
            }
            estado.botoesDesligados = estado.botoesDesligados + n;
            if (n === 0 && lista.length > 0) { estado._p131BotoesOk = true; } /* PATCH153b */
            return n;
          }
        
          function barrarClique(ev) {
            if (!estado.leitura) { return; }
            var alvo = ev.target;
            while (alvo && alvo !== document.body && alvo.tagName !== 'BUTTON') { alvo = alvo.parentNode; }
            if (!alvo || alvo.tagName !== 'BUTTON') { return; }
            if (String(alvo.id || '').indexOf('p131') === 0) { return; }
            if (alvo.getAttribute('data-p131-off') !== '1') { return; }
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.stopImmediatePropagation) { ev.stopImmediatePropagation(); }
            try {
              alert('Seu acesso e somente consulta. Peca ao administrador para liberar ' +
                    'na tela Usuarios e liberacoes.');
            } catch (e) {}
          }
        
          /* ================================================================ *
           * 4) tela "Usuarios e liberacoes"
           * ================================================================ */
          function limpar(t) {
            return String(t === null || t === undefined ? '' : t)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }
        
          function nomeTipo(p) {
            if (p === 'admin') { return 'Administrador'; }
            if (p === 'editor') { return 'Pode lancar e editar'; }
            return 'Somente consulta';
          }
        
          function molde() {
            var t = porId('p131Tela');
            if (t) { return t; }
            t = document.createElement('div');
            t.id = 'p131Tela';
            t.innerHTML = '<div class="cx"><h2>Usuarios e liberacoes</h2>' +
              '<p class="sb" id="p131Sub">Carregando a lista do servidor...</p>' +
              '<div id="p131Corpo"></div>' +
              '<div class="er" id="p131Er"></div><div class="ok" id="p131Ok"></div>' +
              '<div style="display:flex;gap:8px;margin-top:14px">' +
              '<button type="button" id="p131Recarregar" class="lado">Atualizar lista</button>' +
              '<button type="button" id="p131Fechar" class="lado">Fechar</button></div></div>';
            document.body.appendChild(t);
            t.addEventListener('click', function (ev) { if (ev.target === t) { fecharTela(); } });
            porId('p131Fechar').addEventListener('click', fecharTela);
            porId('p131Recarregar').addEventListener('click', function () { pintarLista(); });
            return t;
          }
        
          function fecharTela() {
            var t = porId('p131Tela');
            if (t) { t.classList.remove('on'); }
          }
        
          function abrirTela() {
            molde().classList.add('on');
            pintarLista();
          }
        
          function pintarLista() {
            var corpo = porId('p131Corpo');
            var sub = porId('p131Sub');
            var er = porId('p131Er');
            var ok = porId('p131Ok');
            if (!corpo) { return; }
            if (er) { er.textContent = ''; }
            if (ok) { ok.textContent = ''; }
            corpo.innerHTML = '<p class="sb">Buscando no servidor...</p>';
            listarPerfis().then(function (lista) {
              if (sub) {
                sub.textContent = estado.admin
                  ? 'Voce e administrador: pode mudar o tipo de acesso e liberar ou bloquear contas.'
                  : 'Esta tela e so para consulta. Somente o administrador muda acessos.';
              }
              if (!lista.length) {
                corpo.innerHTML = '<p class="sb">Nenhuma conta cadastrada ainda. ' +
                  'A pessoa se cadastra na tela de entrada do painel.</p>';
                return;
              }
              var h = '<table><tr><th>Pessoa</th><th>Tipo de acesso</th><th>Liberada</th><th></th></tr>';
              var i;
              for (i = 0; i < lista.length; i++) {
                var u = lista[i];
                var eu = (String(u.email).toLowerCase() === String(estado.email).toLowerCase());
                h += '<tr data-id="' + limpar(u.id) + '">';
                h += '<td>' + limpar(u.nome) + '<br><span class="sb">' + limpar(u.email) + '</span>' +
                     (eu ? ' <span class="pe">(voce)</span>' : '') + '</td>';
                if (estado.admin) {
                  h += '<td><select data-c="perfil">' +
                       '<option value="visitante">Somente consulta</option>' +
                       '<option value="editor">Pode lancar e editar</option>' +
                       '<option value="admin">Administrador</option></select></td>';
                  h += '<td><select data-c="ativo">' +
                       '<option value="1">Sim</option><option value="0">Nao</option></select></td>';
                  h += '<td><button type="button" data-a="salvar">Salvar</button></td>';
                } else {
                  h += '<td>' + limpar(nomeTipo(u.perfil)) + '</td>';
                  h += '<td>' + (u.ativo ? 'Sim' : 'Nao') + '</td><td></td>';
                }
                h += '</tr>';
              }
              h += '</table>';
              corpo.innerHTML = h;
              if (estado.admin) {
                for (i = 0; i < lista.length; i++) {
                  var linha = corpo.querySelector('tr[data-id="' + lista[i].id + '"]');
                  if (!linha) { continue; }
                  linha.querySelector('select[data-c="perfil"]').value = lista[i].perfil;
                  linha.querySelector('select[data-c="ativo"]').value = lista[i].ativo ? '1' : '0';
                }
                if (!corpo.getAttribute('data-p131-ouvindo')) {
                  corpo.setAttribute('data-p131-ouvindo', '1');
                  corpo.addEventListener('click', aoClicarLinha, false);
                }
              }
            }).catch(function (e) {
              corpo.innerHTML = '';
              if (er) { er.textContent = e && e.message ? e.message : 'Nao consegui ler a lista.'; }
            });
          }
        
          function aoClicarLinha(ev) {
            var b = ev.target;
            if (!b || b.getAttribute('data-a') !== 'salvar') { return; }
            var linha = b.parentNode;
            while (linha && linha.tagName !== 'TR') { linha = linha.parentNode; }
            if (!linha) { return; }
            var id = linha.getAttribute('data-id');
            var perfil = linha.querySelector('select[data-c="perfil"]').value;
            var ativo = linha.querySelector('select[data-c="ativo"]').value === '1';
            var er = porId('p131Er');
            var ok = porId('p131Ok');
            if (er) { er.textContent = ''; }
            if (ok) { ok.textContent = 'Salvando...'; }
            b.disabled = true;
            salvarPerfil(id, perfil, ativo).then(function () {
              if (ok) {
                ok.textContent = 'Salvo. Peca para a pessoa recarregar o painel (Ctrl+F5) ' +
                                 'para o novo acesso valer na tela dela.';
              }
              b.disabled = false;
              if (String(id) && estado.email) { meuPerfil(); }
            }).catch(function (e) {
              if (ok) { ok.textContent = ''; }
              if (er) { er.textContent = e && e.message ? e.message : 'Nao consegui salvar.'; }
              b.disabled = false;
            });
          }
        
          function botaoNaTelaDeUsuarios() {
            var alvo = porId('p87Corpo');
            if (!alvo || porId('p131Atalho')) { return; }
            var b = document.createElement('button');
            b.id = 'p131Atalho';
            b.type = 'button';
            b.textContent = 'Usuarios e liberacoes';
            b.style.cssText = 'margin:10px 0;border:0;border-radius:8px;padding:8px 12px;' +
              'background:#2563eb;color:#fff;font:600 13px Segoe UI,Arial,sans-serif;cursor:pointer';
            b.addEventListener('click', abrirTela);
            if (alvo.parentNode) { alvo.parentNode.insertBefore(b, alvo); }
          }
        
          /* ================================================================ *
           * 5) bloqueio de tela depois de 5 minutos parado
           * ================================================================ */
          function moldeTrava() {
            var t = porId('p131Trava');
            if (t) { return t; }
            t = document.createElement('div');
            t.id = 'p131Trava';
            t.innerHTML = '<div class="cx"><h2>Tela bloqueada</h2>' +
              '<p class="sb" id="p131TravaSub">O painel ficou ' + MINUTOS +
              ' minutos parado. Digite a sua senha para voltar.</p>' +
              '<label style="display:block;font-size:12px;color:#334155;font-weight:600;margin:8px 0 4px">' +
              'Senha de <span id="p131Quem"></span></label>' +
              '<input type="password" id="p131Senha" autocomplete="current-password">' +
              '<button type="button" id="p131Destravar">Voltar ao painel</button>' +
              '<button type="button" id="p131Sair" class="lado">Sair do painel</button>' +
              '<div class="er" id="p131TravaEr"></div></div>';
            document.body.appendChild(t);
            porId('p131Destravar').addEventListener('click', destravar);
            porId('p131Sair').addEventListener('click', function () {
              var sb = cliente();
              try { if (sb && sb.auth) { sb.auth.signOut(); } } catch (e) {}
              try { sessionStorage.removeItem('painel_seg_sessao_v1'); } catch (e2) {}
              try { localStorage.removeItem('painel_seg_sessao_v1'); } catch (e3) {}
              try { location.reload(); } catch (e4) {}
            });
            porId('p131Senha').addEventListener('keydown', function (ev) {
              if (ev.key === 'Enter') { destravar(); }
            });
            return t;
          }
        
          function travar() {
            if (estado.travado || !estado.email) { return; }
            estado.travado = true;
            var t = moldeTrava();
            var q = porId('p131Quem');
            if (q) { q.textContent = estado.email; }
            var er = porId('p131TravaEr');
            if (er) { er.textContent = ''; }
            var s = porId('p131Senha');
            if (s) { s.value = ''; }
            t.classList.add('on');
            setTimeout(function () { try { s.focus(); } catch (e) {} }, 80);
          }
        
          function destravar() {
            var er = porId('p131TravaEr');
            var campo = porId('p131Senha');
            var senha = campo ? String(campo.value || '') : '';
            if (!senha) {
              if (er) { er.textContent = 'Digite a senha.'; }
              return;
            }
            var sb = cliente();
            if (!sb || !sb.auth || !sb.auth.signInWithPassword) {
              if (er) {
                er.textContent = 'Sem conexao com o servidor para conferir a senha. ' +
                  'Volte a ter internet ou use Sair do painel.';
              }
              return;
            }
            if (er) { er.textContent = 'Conferindo...'; }
            sb.auth.signInWithPassword({ email: estado.email, password: senha }).then(function (r) {
              if (r && r.error) {
                if (er) { er.textContent = 'Senha nao confere.'; }
                return;
              }
              estado.travado = false;
              estado.ultimoToque = Date.now();
              var t = porId('p131Trava');
              if (t) { t.classList.remove('on'); }
              if (campo) { campo.value = ''; }
              if (er) { er.textContent = ''; }
              /* PATCH153: soltar P138 antes de consultar perfil (sb.from pode estar pausado) */
              try { if (window.P138 && window.P138.soltar) { window.P138.soltar(); } } catch (eS) {}
              /* PATCH152: verificar se trocar_senha pendente apos destravar */
              meuPerfil().then(function (perfil) {
                if (perfil && perfil.trocar_senha === true) {
                  try {
                    var dadosTS = {
                      id: perfil.id || estado.id,
                      email: perfil.email || estado.email,
                      nome: perfil.nome || '',
                      perfil: perfil.perfil || 'visitante',
                      trocar_senha: true
                    };
                    if (typeof telaTrocarSenha === 'function') {
                      telaTrocarSenha(dadosTS);
                    }
                  } catch (e2) {}
                }
              });
            }).catch(function () {
              if (er) {
                er.textContent = 'Nao consegui conferir a senha agora. Tente de novo com internet.';
              }
            });
          }
        
          function toquei() {
            if (estado.travado) { return; }
            estado.ultimoToque = Date.now();
          }
        
          function relogio() {
            if (estado.travado || !estado.email) { return; }
            if (Date.now() - estado.ultimoToque >= LIMITE) { travar(); }
          }
        
          function ouvirToques() {
            var eventos = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'focus'];
            var i;
            for (i = 0; i < eventos.length; i++) {
              window.addEventListener(eventos[i], toquei, true);
            }
            document.addEventListener('visibilitychange', function () {
              if (!document.hidden) { relogio(); }
            }, false);
          }
        
          /* ================================================================ *
           * liga tudo
           * ================================================================ */
          function rodada() {
            instalarPontes();
            botaoNaTelaDeUsuarios();
            if (estado.leitura) { desligarBotoes(); }
            relogio();
          }
        
          function comecar() {
            instalarPontes();
            ouvirToques();
            document.addEventListener('click', barrarClique, true);
            try { if (window.P138 && window.P138.soltar) { window.P138.soltar(); } } catch (eP) {} /* PATCH153b */
            meuPerfil();
            rodada();
            setInterval(rodada, 1500);
          }
        
          window.P131 = {
            conferir: function () {
              var falta = Math.max(0, LIMITE - (Date.now() - estado.ultimoToque));
              var r = {
                quem: estado.email || '(ninguem logado)',
                tipoDeAcesso: estado.perfil || '(desconhecido)',
                contaLiberada: estado.ativo,
                souAdministrador: estado.admin,
                somenteConsulta: estado.leitura,
                botoesDesligados: estado.botoesDesligados,
                usuariosNaUltimaLista: estado.listaCarregada,
                telaTravada: estado.travado,
                minutosAteTravar: Math.round(falta / 600) / 100,
                pontesInstaladas: !!(window.PainelAuthSupabase &&
                  typeof window.PainelAuthSupabase.listarPerfis === 'function' &&
                  typeof window.PainelAuthSupabase.cadastrarComEmail === 'function')
              };
              try { console.table([r]); } catch (e) {}
              return r;
            },
            usuarios: abrirTela,
            listar: listarPerfis,
            salvarPerfil: salvarPerfil,
            meuPerfil: meuPerfil,
            travarAgora: function () { estado.ultimoToque = 0; travar(); },
            estado: estado
          };
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(comecar, 500); }, false);
          } else {
            setTimeout(comecar, 500);
          }
          })();
        } /* /PATCH154_DISABLED */
    
