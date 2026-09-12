
        /* ===== PATCH128 - login conferido no servidor ... */
        (function () {
          'use strict';
          if (window.__P128) { return; }
        
          var K_SESS  = 'painel_seg_sessao_v1';
          var K_USERS = 'painel_seg_usuarios_v1';
          var K_ULT   = 'painel_p128_ultimo_v1';
          var HORAS    = 12;
        
          var estado = { perfil: null, email: null, id: null, online: false, offline: false };
        
          function cliente() {
            try { if (typeof _supabase !== 'undefined' && _supabase) { return _supabase; } } catch (e) {}
            if (window._supabase) { return window._supabase; }
            if (window.supabaseClient) { return window.supabaseClient; }
            return null;
          }
        
          function guardar(chave, valor) {
            try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
          }
          function pegar(chave) {
            try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { return null; }
          }
        
          /* as telas antigas do painel leem a sessao daqui, entao continuamos
             gravando no mesmo lugar - a diferenca e que o tipo de acesso agora
             vem do banco, nao do navegador */
          function gravarSessao(dados) {
            var s = {
              usuario: dados.email,
              nome: dados.nome || dados.email,
              perfil: dados.perfil,
              authId: dados.id || null,
              em: Date.now(),
              exp: Date.now() + HORAS * 3600000,
              p128: true
            };
            try { sessionStorage.setItem(K_SESS, JSON.stringify(s)); } catch (e) {}
            guardar(K_SESS, s);
            estado.perfil = dados.perfil;
            estado.email = dados.email;
            estado.id = dados.id || null;
            return s;
          }
        
          function apagarSessao() {
            try { sessionStorage.removeItem(K_SESS); } catch (e) {}
            try { localStorage.removeItem(K_SESS); } catch (e) {}
            estado.perfil = null;
            estado.email = null;
            estado.id = null;
          }
        
          /* fim do usuario admin com senha padrao: deixamos a lista local
             ocupada por um registro sem senha valida, assim o bloco antigo nao
             cria mais o admin/admin123 */
          function semAdminPadrao() {
            var marca = [{
              usuario: 'contas-no-servidor',
              nome: 'As contas ficam no servidor',
              perfil: 'visitante',
              hash: 'p128-sem-senha-local',
              trocar: false
            }];
            guardar(K_USERS, marca);
          }
        
          /* ---------------- aparencia das telas ---------------- */
          function estilo() {
            if (document.getElementById('p128Estilo')) { return; }
            var st = document.createElement('style');
            st.id = 'p128Estilo';
            st.textContent = [
              '#p128Tela{position:fixed;inset:0;z-index:2147483500;background:linear-gradient(160deg,#0f172a,#1e293b);display:flex;align-items:center;justify-content:center;font-family:Segoe UI,Arial,sans-serif}',
              '#p128Tela .cx{background:#fff;border-radius:14px;padding:26px;width:min(360px,92vw);box-shadow:0 18px 50px rgba(0,0,0,.45)}',
              '#p128Tela h2{margin:0 0 4px;font-size:19px;color:#16304f}',
              '#p128Tela p.sb{margin:0 0 14px;font-size:12px;color:#64748b}',
              '#p128Tela label{display:block;font-size:12px;color:#334155;margin:10px 0 4px;font-weight:600}',
              '#p128Tela input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px}',
              '#p128Tela button{width:100%;margin-top:14px;padding:10px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:15px;font-weight:600;cursor:pointer}',
              '#p128Tela button.lado{background:#e2e8f0;color:#16304f;font-size:13px;margin-top:8px}',
              '#p128Tela .er{margin-top:10px;font-size:12px;color:#b91c1c;min-height:16px}',
              '#p128Tela .ok{margin-top:10px;font-size:12px;color:#15803d;min-height:16px}',
              '#p128Aviso{position:fixed;left:0;right:0;top:0;z-index:2147482500;background:#b45309;color:#fff;padding:7px 12px;font:12px Segoe UI,Arial,sans-serif;text-align:center}'
            ].join(' ');
            (document.head || document.documentElement).appendChild(st);
          }
        
          function aviso(texto) {
            estilo();
            var v = document.getElementById('p128Aviso');
            if (!v) {
              v = document.createElement('div');
              v.id = 'p128Aviso';
              document.body.appendChild(v);
            }
            v.textContent = texto;
          }
        
          function fechar() {
            var t = document.getElementById('p128Tela');
            if (t && t.parentNode) { t.parentNode.removeChild(t); }
          }
        
          function tela(titulo, subtitulo) {
            estilo();
            fechar();
            var ov = document.createElement('div');
            ov.id = 'p128Tela';
            var cx = document.createElement('div');
            cx.className = 'cx';
            var h = document.createElement('h2');
            h.textContent = titulo;
            var p = document.createElement('p');
            p.className = 'sb';
            p.textContent = subtitulo;
            cx.appendChild(h);
            cx.appendChild(p);
            ov.appendChild(cx);
            document.body.appendChild(ov);
            return cx;
          }
        
          function campo(pai, rotulo, tipo) {
            var l = document.createElement('label');
            l.textContent = rotulo;
            var i = document.createElement('input');
            i.type = tipo || 'text';
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
        
          function recado(pai, classe) {
            var d = document.createElement('div');
            d.className = classe;
            pai.appendChild(d);
            return d;
          }
        
          /* ---------------- conversa com o servidor ---------------- */
          async function buscarPerfil(sb, id) {
            var r = await sb.from('painel_perfis').select('*').eq('id', id).limit(1);
            if (r.error) { throw new Error('Nao consegui ler o seu tipo de acesso: ' + r.error.message); }
            var lista = r.data || [];
            if (!lista.length) {
              throw new Error('Sua conta existe, mas ainda nao tem tipo de acesso. Peca ao administrador para liberar.');
            }
            return lista[0];
          }
        
          async function entrar(email, senha) {
            var sb = cliente();
            if (!sb) { throw new Error('O painel nao conseguiu falar com o servidor. Verifique a internet.'); }
            email = String(email || '').trim().toLowerCase();
            var r = await sb.auth.signInWithPassword({ email: email, password: String(senha || '') });
            if (r.error) { throw new Error('E-mail ou senha nao conferem.'); }
            var usuario = r.data && r.data.user ? r.data.user : null;
            if (!usuario) { throw new Error('E-mail ou senha nao conferem.'); }
        
            var perfil = await buscarPerfil(sb, usuario.id);
            if (perfil.ativo === false) {
              try { await sb.auth.signOut(); } catch (e) {}
              throw new Error('Esta conta esta bloqueada. Fale com o administrador.');
            }
        
            estado.online = true;
            estado.offline = false;
            guardar(K_ULT, { email: perfil.email || email, nome: perfil.nome, perfil: perfil.perfil, em: Date.now() });
            try { await sb.from('painel_perfis').update({ ultimo_acesso: new Date().toISOString() }).eq('id', usuario.id); } catch (e) {}
        
            return { user: usuario, dados: perfil };
          }
        
          async function trocarSenha(nova) {
            var sb = cliente();
            if (!sb) { throw new Error('Sem conexao com o servidor agora.'); }
            var r = await sb.auth.updateUser({ password: String(nova || '') });
            if (r.error) { throw new Error(r.error.message || 'Nao consegui trocar a senha.'); }
            var id = r.data && r.data.user ? r.data.user.id : estado.id;
            var perfilOk = false;
            if (id) {
              try {
                var ru = await sb.from('painel_perfis').update({ trocar_senha: false }).eq('id', id);
                if (ru && ru.error) {
                  /* RLS bloqueou — senha ja foi trocada no auth, desmarcar localmente */
                  try { console.warn('[PATCH152] RLS bloqueou update painel_perfis.trocar_senha: ' + (ru.error.message || '')); } catch (e4) {}
                } else {
                  perfilOk = true;
                }
              } catch (e) {
                /* erro de rede ou RLS — senha ja foi trocada no auth */
                try { console.warn('[PATCH152] Falha ao desmarcar trocar_senha no banco: ' + (e.message || '')); } catch (e5) {}
              }
            }
            /* PATCH152: fallback local — desmarcar trocar_senha no estado e localStorage
               para evitar que a tela apareça de novo na proxima vez */
            try {
              if (window.P128 && typeof window.P128._desmarcarTrocarSenha === 'function') {
                window.P128._desmarcarTrocarSenha();
              }
            } catch (e2) {}
            return true;
          }
        
          async function sair() {
            var sb = cliente();
            if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
            apagarSessao();
            try { location.reload(); } catch (e) {}
          }
        
          /* ---------------- telas ---------------- */
          function telaEntrar(recadoInicial) {
            var cx = tela('Painel de Acompanhamento', 'Entre com o e-mail e a senha da sua conta.');
            var ie = campo(cx, 'E-mail', 'email');
            var is = campo(cx, 'Senha', 'password');
            var bt = botao(cx, 'Entrar', '', tentar);
            var er = recado(cx, 'er');
            if (recadoInicial) { er.textContent = recadoInicial; }
            setTimeout(function () { try { ie.focus(); } catch (e) {} }, 60);
            is.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { tentar(); } });
            ie.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { is.focus(); } });
        
            function tentar() {
              var email = String(ie.value || '').trim();
              var senha = String(is.value || '');
              if (!email || !senha) { er.textContent = 'Preencha o e-mail e a senha.'; return; }
              bt.disabled = true;
              bt.textContent = 'Entrando...';
              er.textContent = '';
              entrar(email, senha).then(function (res) {
                depoisDeEntrar(res.dados, res.user.id);
              }).catch(function (erro) {
                er.textContent = (erro && erro.message) ? erro.message : 'Nao consegui entrar.';
                is.value = '';
              }).then(function () {
                bt.disabled = false;
                bt.textContent = 'Entrar';
              });
            }
          }
        
          function telaTrocarSenha(dados) {
            var cx = tela('Crie a sua senha', 'Por seguranca, a senha provisoria precisa ser trocada agora.');
            var i1 = campo(cx, 'Nova senha (pelo menos 8 letras ou numeros)', 'password');
            var i2 = campo(cx, 'Repita a nova senha', 'password');
            var bt = botao(cx, 'Salvar e entrar', '', salvar);
            var er = recado(cx, 'er');
            setTimeout(function () { try { i1.focus(); } catch (e) {} }, 60);
            i2.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { salvar(); } });
        
            function salvar() {
              var a = String(i1.value || '');
              var b = String(i2.value || '');
              if (a.length < 8) { er.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
              if (a !== b) { er.textContent = 'As duas senhas estao diferentes.'; return; }
              bt.disabled = true;
              bt.textContent = 'Salvando...';
              er.textContent = '';
              trocarSenha(a).then(function () {
                dados.trocar_senha = false;
                /* PATCH152: sempre liberar o painel apos trocar a senha com sucesso.
                   Mesmo que o update de painel_perfis tenha falhado (RLS),
                   a senha JA foi trocada no auth — nao travar o usuario. */
                liberarPainel(dados);
              }).catch(function (erro) {
                /* so mostrar erro se a senha NAO foi trocada (auth falhou) */
                er.textContent = (erro && erro.message) ? erro.message : 'Nao consegui trocar a senha.';
                bt.disabled = false;
                bt.textContent = 'Salvar e entrar';
              });
            }
          }
        
          function liberarPainel(dados) {
            gravarSessao({ email: dados.email, nome: dados.nome, perfil: dados.perfil, id: dados.id || estado.id });
            fechar();
            var v = document.getElementById('p128Aviso');
            if (v && v.parentNode) { v.parentNode.removeChild(v); }
            try { if (window.PS79 && typeof window.PS79.barra === 'function') { window.PS79.barra(); } } catch (e) {}
            try { if (typeof atualizarTudo === 'function') { atualizarTudo(); } } catch (e) {}
          }
        
          function depoisDeEntrar(dados, id) {
            estado.id = id || dados.id || null;
            dados.id = estado.id;
            /* PATCH152: limpar flag local — login novo pode ter trocar_senha real */
            try { localStorage.removeItem('p152_trocar_ok'); } catch (e) {}
            if (dados.trocar_senha) { telaTrocarSenha(dados); return; }
            liberarPainel(dados);
          }
        
          /* ---------------- sem internet: somente consulta ---------------- */
          function modoOffline(motivo) {
            var ult = pegar(K_ULT);
            estado.online = false;
            estado.offline = true;
            if (!ult || !ult.email) {
              telaEntrar(motivo || 'Sem conexao com o servidor. Tente novamente quando a internet voltar.');
              return;
            }
            gravarSessao({ email: ult.email, nome: ult.nome, perfil: 'visitante', id: null });
            fechar();
            aviso('Sem conexao com o servidor: o painel esta aberto apenas para consulta, como ' + (ult.nome || ult.email) + '.');
          }
        
          /* ---------------- inicio ---------------- */
          async function iniciar() {
            semAdminPadrao();
            var sb = cliente();
            if (!sb || !sb.auth || typeof sb.auth.getSession !== 'function') {
              modoOffline('O painel nao encontrou a conexao com o servidor.');
              return;
            }
            var s = null;
            try {
              var r = await sb.auth.getSession();
              s = (r && r.data) ? r.data.session : null;
            } catch (e) {
              modoOffline();
              return;
            }
            if (!s || !s.user) {
              apagarSessao();
              telaEntrar('');
              return;
            }
            estado.online = true;
            try {
              var dados = await buscarPerfil(sb, s.user.id);
              if (dados.ativo === false) {
                try { await sb.auth.signOut(); } catch (e) {}
                apagarSessao();
                telaEntrar('Esta conta esta bloqueada. Fale com o administrador.');
                return;
              }
              guardar(K_ULT, { email: dados.email, nome: dados.nome, perfil: dados.perfil, em: Date.now() });
              depoisDeEntrar(dados, s.user.id);
            } catch (e) {
              modoOffline();
            }
          }
        
          /* o painel antigo tambem chama esta porta de entrada */
          window.PainelAuthSupabase = {
            entrarComEmail: function (email, senha) {
              return entrar(email, senha).then(function (res) {
                return {
                  user: res.user,
                  perfil: {
                    usuario: res.dados.email,
                    nome: res.dados.nome,
                    perfil: res.dados.perfil,
                    trocar: !!res.dados.trocar_senha
                  }
                };
              });
            }
          };
        
          window.P128 = {
            entrar: entrar,
            sair: sair,
            trocarSenha: trocarSenha,
            perfil: function () { return estado.perfil; },
            conferir: function () {
              var r = {
                quem: estado.email || '(ninguem)',
                tipoDeAcesso: estado.perfil || '(sem acesso)',
                conexao: estado.online ? 'ativa' : 'sem conexao',
                somenteConsulta: estado.offline || estado.perfil === 'visitante'
              };
              try { console.log('P128', r); } catch (e) {}
              return r;
            }
          };
        
        /* ---- PATCH153: helpers para desmarcar trocar_senha localmente (fallback RLS) ---- */
        window.P128._desmarcarTrocarSenha = function () {
          try {
            var K_SESS = 'painel_seg_sessao_v1';
            var raw = sessionStorage.getItem(K_SESS) || localStorage.getItem(K_SESS);
            if (raw) {
              var s = JSON.parse(raw);
              if (s) { s.trocar_senha = false; s.p153_ts = Date.now(); }
              try { sessionStorage.setItem(K_SESS, JSON.stringify(s)); } catch (e) {}
              try { localStorage.setItem(K_SESS, JSON.stringify(s)); } catch (e2) {}
            }
          } catch (e3) {}
          try { localStorage.setItem('p152_trocar_ok', '1'); } catch (e4) {}
        };
        
        /* PATCH153: verificar se trocar_senha esta pendente.
           Chamado pelo P139 apos destravar a tela de bloqueio. */
        window.P128._trocarPendente = function () {
          try { if (localStorage.getItem('p152_trocar_ok') === '1') { return Promise.resolve(false); } } catch (e) {}
          var sb = cliente();
          if (!sb || !sb.auth || typeof sb.auth.getUser !== 'function') { return Promise.resolve(false); }
          return sb.auth.getUser().then(function (r) {
            var u = r && r.data ? r.data.user : null;
            if (!u) { return false; }
            return sb.from('painel_perfis').select('trocar_senha').eq('id', u.id).limit(1).then(function (r2) {
              var linha = (r2 && r2.data && r2.data.length) ? r2.data[0] : null;
              if (linha && linha.trocar_senha === true) {
                return { id: u.id, email: u.email, nome: '', perfil: linha.perfil || 'visitante',
                         ativo: linha.ativo !== false, trocar_senha: true };
              }
              return false;
            });
          }).catch(function () { return false; });
        };
        /* PATCH153_CORRIGE_P152 */
        
          function comecar() {
            iniciar().catch(function () { modoOffline(); });
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', comecar);
          } else {
            comecar();
          }
        })();
    
