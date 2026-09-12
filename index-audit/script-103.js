
        if (false) { /* PATCH154_DISABLED */
        /* =====================================================================
         * PATCH 139 - tela de bloqueio centrada, com resposta sempre na tela
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.__p139) { return; }
          window.__p139 = true;
        
          var MINUTOS = 5;
          var LIMITE = MINUTOS * 60 * 1000;
          var ESPERA = 15000;           /* quanto tempo esperar o servidor */
          var estado = {
            travado: false,
            ultimoToque: Date.now(),
            email: '',
            erros: 0,
            ultimaResposta: ''
          };
        
          function porId(x) { return document.getElementById(x); }
        
          function cliente() {
            try { if (typeof _supabase !== 'undefined' && _supabase) { return _supabase; } } catch (e) { }
            if (window._supabase) { return window._supabase; }
            if (window.supabaseClient) { return window.supabaseClient; }
            if (window.supabase && window.supabase.from) { return window.supabase; }
            return null;
          }
        
          /* de quem e a senha: procura em tudo que o painel costuma guardar */
          function crachaGuardado() {
            var i, k, o, s;
            try {
              for (i = 0; i < localStorage.length; i++) {
                k = localStorage.key(i);
                if (!k || k.indexOf('sb-') !== 0 || k.indexOf('auth-token') < 0) { continue; }
                try { o = JSON.parse(localStorage.getItem(k)); } catch (e) { o = null; }
                if (!o) { continue; }
                s = o.currentSession || o.session || o;
                if (s && s.access_token) { return s; }
              }
            } catch (e2) { }
            return null;
          }
        
          function descobrirEmail() {
            var s = crachaGuardado();
            if (s && s.user && s.user.email) { return s.user.email; }
            var chaves = ['painel_seg_sessao_v1', 'painel_usuario', 'painel_login'];
            var i, bruto, o;
            for (i = 0; i < chaves.length; i++) {
              try {
                bruto = sessionStorage.getItem(chaves[i]) || localStorage.getItem(chaves[i]);
                if (!bruto) { continue; }
                try { o = JSON.parse(bruto); } catch (e) { o = null; }
                if (o && (o.email || (o.usuario && o.usuario.email))) {
                  return o.email || o.usuario.email;
                }
              } catch (e2) { }
            }
            try {
              var velho = porId('p131Quem');
              if (velho && velho.textContent && velho.textContent.indexOf('@') > 0) {
                return velho.textContent.trim();
              }
            } catch (e3) { }
            return '';
          }
        
          function sessaoValida() {
            var s = crachaGuardado();
            if (!s || !s.access_token) { return false; }
            var vence = Number(s.expires_at || 0);
            return !vence || vence > Math.floor(Date.now() / 1000);
          }
        
          /* traduz a resposta do servidor para portugues de gente */
          function explicar(msg, tempoEsgotado) {
            var b = String(msg || '').toLowerCase();
            if (tempoEsgotado) {
              return 'O servidor nao respondeu em 15 segundos. Deve ser a internet. ' +
                     'Confira a conexao e clique em Voltar ao painel de novo.';
            }
            if (b.indexOf('invalid login') >= 0 || b.indexOf('invalid credentials') >= 0 ||
                b.indexOf('invalid email or password') >= 0) {
              return 'A senha nao confere. Confira se o Caps Lock esta ligado e se o ' +
                     'teclado esta no idioma de sempre.';
            }
            if (b.indexOf('too many') >= 0 || b.indexOf('rate limit') >= 0 ||
                b.indexOf('429') >= 0) {
              return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
            }
            if (b.indexOf('not confirmed') >= 0 || b.indexOf('confirm') >= 0) {
              return 'A sua conta ainda nao foi confirmada no servidor. Peca a confirmacao ' +
                     'ou use Sair do painel e entre de novo.';
            }
            if (b.indexOf('failed to fetch') >= 0 || b.indexOf('network') >= 0 ||
                b.indexOf('offline') >= 0) {
              return 'Nao consegui falar com o servidor: parece que a internet caiu.';
            }
            if (b.indexOf('user not found') >= 0) {
              return 'O servidor nao encontrou esse e-mail. Use Sair do painel e entre de novo.';
            }
            return 'O servidor recusou a conferencia. Veja a resposta dele abaixo.';
          }
        
          /* ================================================================ *
           * a caixa nova, no centro da tela
           * ================================================================ */
          function molde() {
            var t = porId('p139Trava');
            if (t) { return t; }
            t = document.createElement('div');
            t.id = 'p139Trava';
            t.setAttribute('role', 'dialog');
            t.setAttribute('aria-modal', 'true');
            t.setAttribute('aria-label', 'Tela bloqueada');
            t.innerHTML =
              '<div class="cx">' +
              '<h2>Tela bloqueada</h2>' +
              '<p class="sb">O painel ficou ' + MINUTOS + ' minutos parado. ' +
              'Digite a sua senha para voltar. Nada foi perdido.</p>' +
              '<label for="p139Senha">Senha de <span id="p139Quem"></span></label>' +
              '<input type="password" id="p139Senha" autocomplete="current-password" ' +
              'aria-describedby="p139Er">' +
              '<button type="button" id="p139Ok">Voltar ao painel</button>' +
              '<button type="button" id="p139Sair" class="lado">Sair do painel</button>' +
              '<button type="button" id="p139SemRede" class="sem" style="display:none">' +
              'Voltar sem conferir (internet fora)</button>' +
              '<div class="er" id="p139Er" aria-live="polite"></div>' +
              '<div class="cru" id="p139Cru"></div>' +
              '<div class="ajuda" id="p139Ajuda"></div>' +
              '</div>';
            document.body.appendChild(t);
        
            porId('p139Ok').addEventListener('click', tentar);
            porId('p139Sair').addEventListener('click', sair);
            porId('p139SemRede').addEventListener('click', function () {
              if (!sessaoValida()) {
                aviso('A sua entrada neste computador tambem venceu. Use Sair do painel.', false);
                return;
              }
              soltar();
              aviso('', true);
            });
            var campo = porId('p139Senha');
            campo.addEventListener('keydown', function (ev) {
              if (ev.key === 'Enter' || ev.keyCode === 13) {
                ev.preventDefault();
                tentar();
              }
            });
            campo.addEventListener('input', function () {
              var er = porId('p139Er');
              if (er && er.textContent === 'Digite a senha.') { er.textContent = ''; }
            });
            return t;
          }
        
          function aviso(texto, bom, cru) {
            var er = porId('p139Er');
            var c = porId('p139Cru');
            if (er) {
              er.textContent = texto || '';
              er.className = bom ? 'er bom' : 'er';
            }
            if (c) { c.textContent = cru ? ('Resposta do servidor: ' + cru) : ''; }
          }
        
          function sair() {
            var sb = cliente();
            try { if (sb && sb.auth && sb.auth.signOut) { sb.auth.signOut(); } } catch (e) { }
            try { sessionStorage.removeItem('painel_seg_sessao_v1'); } catch (e2) { }
            try { localStorage.removeItem('painel_seg_sessao_v1'); } catch (e3) { }
            setTimeout(function () { try { location.reload(); } catch (e4) { } }, 150);
          }
        
          function travar() {
            if (estado.travado) { return; }
            estado.email = estado.email || descobrirEmail();
            if (!estado.email) { return; }   /* sem saber de quem e, nao trava */
            estado.travado = true;
            var t = molde();
            var q = porId('p139Quem');
            if (q) { q.textContent = estado.email; }
            var s = porId('p139Senha');
            if (s) { s.value = ''; s.disabled = false; }
            var b = porId('p139Ok');
            if (b) { b.disabled = false; b.textContent = 'Voltar ao painel'; }
            aviso('', false);
            var aj = porId('p139Ajuda');
            if (aj) { aj.textContent = ''; }
            var sr = porId('p139SemRede');
            if (sr) { sr.style.display = 'none'; }
            t.classList.add('on');
            try { document.body.classList.add('p139-travado'); } catch (eB) {} /* PATCH153b */
            setTimeout(function () { try { s.focus(); } catch (e) { } }, 80);
          }
        
          function soltar() {
            estado.travado = false;
            estado.erros = 0;
            estado.ultimoToque = Date.now();
            var t = porId('p139Trava');
            if (t) { t.classList.remove('on');
            try { document.body.classList.remove('p139-travado'); } catch (eB2) {} /* PATCH153b */ t.style.display = 'none'; }
            var s = porId('p139Senha');
            if (s) { s.value = ''; s.disabled = false; }
            var velho = porId('p131Trava');
            if (velho) { velho.classList.remove('on'); velho.style.display = 'none'; }
            try { if (window.P138 && window.P138.soltar) { window.P138.soltar(); } } catch (e1) {} /* PATCH153: soltar antes de aplicar */
            try { if (window.P138 && window.P138.aplicar) { window.P138.aplicar(); } } catch (e2) {}
            /* PATCH152: apos destravar, verificar se trocar_senha esta pendente.
               Se sim, abrir telaTrocarSenha de forma integrada (nao surpresa). */
            try {
              if (window.P128 && typeof window.P128._trocarPendente === 'function') {
                window.P128._trocarPendente().then(function (dados) {
                  if (dados && dados.trocar_senha === true) {
                    var sb2 = cliente();
                    if (sb2) {
                      sb2.from('painel_perfis').select('*').eq('id', dados.id).limit(1).then(function (r) {
                        var linha = (r && r.data && r.data.length) ? r.data[0] : null;
                        if (linha) {
                          dados.nome = linha.nome || '';
                          dados.email = linha.email || dados.email;
                          dados.perfil = linha.perfil || dados.perfil;
                        }
                        try { if (typeof telaTrocarSenha === 'function') { telaTrocarSenha(dados); } } catch (e2) {}
                      }).catch(function () {
                        try { if (typeof telaTrocarSenha === 'function') { telaTrocarSenha(dados); } } catch (e3) {}
                      });
                    } else {
                      try { if (typeof telaTrocarSenha === 'function') { telaTrocarSenha(dados); } } catch (e4) {}
                    }
                  }
                }).catch(function () { /* silencioso — nao impedir destravar */ });
              }
            } catch (e5) { /* nao impedir destravar por causa disto */ }
          }
        
          /* ================================================================ *
           * conferir a senha: nunca fica calado, nunca fica preso
           * ================================================================ */
          function comLimiteDeTempo(promessa) {
            return new Promise(function (resolve) {
              var acabou = false;
              var relogio = setTimeout(function () {
                if (acabou) { return; }
                acabou = true;
                resolve({ tempoEsgotado: true });
              }, ESPERA);
              Promise.resolve(promessa).then(function (r) {
                if (acabou) { return; }
                acabou = true;
                clearTimeout(relogio);
                resolve({ resposta: r });
              }).catch(function (e) {
                if (acabou) { return; }
                acabou = true;
                clearTimeout(relogio);
                resolve({ falha: e });
              });
            });
          }
        
          function tentar() {
            var campo = porId('p139Senha');
            var botao = porId('p139Ok');
            var senha = campo ? String(campo.value || '') : '';
            if (!senha) {
              aviso('Digite a senha.', false);
              try { campo.focus(); } catch (e) { }
              return Promise.resolve(false);
            }
            estado.email = estado.email || descobrirEmail();
            if (!estado.email) {
              aviso('Nao consegui saber de quem e esta tela. Use Sair do painel e entre de novo.',
                    false);
              return Promise.resolve(false);
            }
            var sb = cliente();
            if (!sb || !sb.auth || typeof sb.auth.signInWithPassword !== 'function') {
              aviso('O painel nao encontrou a ligacao com o servidor para conferir a senha.', false);
              mostrarSaidaSemRede();
              return Promise.resolve(false);
            }
        
            if (botao) { botao.disabled = true; botao.textContent = 'Conferindo...'; }
            aviso('Conferindo a senha no servidor...', true);
        
            return comLimiteDeTempo(
              sb.auth.signInWithPassword({ email: estado.email, password: senha })
            ).then(function (fim) {
              if (botao) { botao.disabled = false; botao.textContent = 'Voltar ao painel'; }
        
              if (fim.tempoEsgotado) {
                estado.ultimaResposta = 'sem resposta em 15 segundos';
                aviso(explicar('', true), false);
                mostrarSaidaSemRede();
                return false;
              }
              if (fim.falha) {
                estado.ultimaResposta = (fim.falha && fim.falha.message) || String(fim.falha);
                aviso(explicar(estado.ultimaResposta, false), false, estado.ultimaResposta);
                mostrarSaidaSemRede();
                return false;
              }
              var r = fim.resposta || {};
              if (r.error) {
                estado.erros = estado.erros + 1;
                estado.ultimaResposta = r.error.message || 'recusado';
                var extra = '';
                if (estado.erros >= 3) {
                  extra = ' Se a senha foi trocada por outra pessoa, use Sair do painel e ' +
                          'entre de novo, ou peca uma nova senha por link na tela de usuarios.';
                }
                aviso(explicar(estado.ultimaResposta, false) + extra, false, estado.ultimaResposta);
                try { porId('p139Senha').select(); } catch (e2) { }
                return false;
              }
              estado.ultimaResposta = 'ok';
              soltar();
              return true;
            });
          }
        
          function mostrarSaidaSemRede() {
            var sr = porId('p139SemRede');
            if (!sr) { return; }
            if (!sessaoValida()) { return; }
            sr.style.display = 'block';
            var aj = porId('p139Ajuda');
            if (aj) {
              aj.textContent = 'A sua entrada neste computador ainda esta valida. ' +
                'Se a internet estiver fora, pode voltar ao painel sem conferir a senha: ' +
                'isso solta apenas a tranca de descanso da tela. As regras do servidor ' +
                'continuam iguais, e quem tem acesso somente de consulta continua sem gravar.';
            }
          }
        
          /* ================================================================ *
           * relogio de inatividade + vigia da caixa antiga
           * ================================================================ */
          function toquei() {
            if (estado.travado) { return; }
            estado.ultimoToque = Date.now();
          }
        
          function relogio() {
            if (!estado.travado) {
              estado.email = estado.email || descobrirEmail();
              if (estado.email && (Date.now() - estado.ultimoToque) >= LIMITE) { travar(); }
            }
            var velho = porId('p131Trava');
            if (velho && (velho.className.indexOf('on') >= 0 || velho.style.display === 'flex')) {
              velho.classList.remove('on');
              velho.style.display = 'none';
              travar();
            }
          }
        
          window.P139 = {
            travar: travar,
            destravar: soltar,
            tentar: tentar,
            conferir: function () {
              var d = {
                travadoAgora: estado.travado,
                senhaDeQuem: estado.email || descobrirEmail() || '(nao descobri)',
                entradaNesteComputadorValida: sessaoValida(),
                ligacaoComServidor: !!(cliente() && cliente().auth &&
                                       cliente().auth.signInWithPassword),
                caixaNovaNaTela: !!porId('p139Trava'),
                caixaAntigaEscondida: !porId('p131Trava') ||
                                      porId('p131Trava').style.display === 'none' ||
                                      porId('p131Trava').className.indexOf('on') < 0,
                tentativasErradas: estado.erros,
                ultimaRespostaDoServidor: estado.ultimaResposta || '(ainda nao tentei)',
                minutosParaTravar: MINUTOS
              };
              try { console.log('[P139]', d); } catch (e) { }
              return d;
            }
          };
        
          function ligar() {
            ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'click', 'scroll']
              .forEach(function (ev) {
                try { document.addEventListener(ev, toquei, true); } catch (e) { }
              });
            try {
              document.addEventListener('visibilitychange', function () {
                if (!document.hidden) { toquei(); }
              });
            } catch (e2) { }
            try { setInterval(relogio, 10000); } catch (e3) { }
            estado.email = descobrirEmail();
            estado.ultimoToque = Date.now();
            try {
              console.log('[PATCH139] tela de bloqueio centrada no ar. Use P139.conferir()');
            } catch (e4) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(ligar, 300); });
          } else {
            setTimeout(ligar, 300);
          }
        }());
        } /* /PATCH154_DISABLED */
    
