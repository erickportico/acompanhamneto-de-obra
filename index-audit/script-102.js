
        if (false) { /* PATCH154_DISABLED */
        /* =====================================================================
         * PATCH 138 - entrega o cracha da entrada para o canal de dados
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.__p138) { return; }
          window.__p138 = true;
        
          var estado = {
            entregue: false,
            dono: '',
            vence: 0,
            ultimoErro: '',
            pausado: false,
            tentativas: 0,
            renovacoes: 0
          };
        
          function porId(x) { return document.getElementById(x); }
        
          function cliente() {
            try { if (typeof _supabase !== 'undefined' && _supabase) { return _supabase; } } catch (e) { }
            if (window._supabase) { return window._supabase; }
            if (window.supabaseClient) { return window.supabaseClient; }
            if (window.supabase && window.supabase.from) { return window.supabase; }
            return null;
          }
        
          /* o proprio servico de contas guarda a entrada aqui neste navegador */
          function crachaGuardado() {
            var i, k, bruto, o;
            try {
              for (i = 0; i < localStorage.length; i++) {
                k = localStorage.key(i);
                if (!k || k.indexOf('sb-') !== 0 || k.indexOf('auth-token') < 0) { continue; }
                bruto = localStorage.getItem(k);
                if (!bruto) { continue; }
                try { o = JSON.parse(bruto); } catch (e) { o = null; }
                if (!o) { continue; }
                var s = o.currentSession || o.session || o;
                if (s && s.access_token && s.refresh_token) {
                  return {
                    access_token: s.access_token,
                    refresh_token: s.refresh_token,
                    vence: Number(s.expires_at || 0),
                    dono: (s.user && (s.user.email || s.user.id)) || ''
                  };
                }
              }
            } catch (e2) { }
            return null;
          }
        
          function segundos() { return Math.floor(Date.now() / 1000); }
        
          /* ================================================================ *
           * 1) entregar o cracha para o canal de dados
           * ================================================================ */
          function entregar() {
            var sb = cliente();
            if (!sb || !sb.auth) {
              estado.ultimoErro = 'o painel nao encontrou a ligacao com o servidor.';
              return Promise.resolve(false);
            }
            var c = crachaGuardado();
            if (!c) {
              estado.entregue = false;
              estado.ultimoErro = 'sem entrada guardada neste navegador.';
              return Promise.resolve(false);
            }
            estado.dono = c.dono;
            estado.vence = c.vence;
            estado.tentativas = estado.tentativas + 1;
        
            var vencido = c.vence && c.vence <= (segundos() + 60);
            var passo;
            if (vencido && typeof sb.auth.refreshSession === 'function') {
              passo = Promise.resolve(sb.auth.refreshSession({ refresh_token: c.refresh_token }));
            } else if (typeof sb.auth.setSession === 'function') {
              passo = Promise.resolve(sb.auth.setSession({
                access_token: c.access_token, refresh_token: c.refresh_token
              }));
            } else {
              estado.ultimoErro = 'esta versao da ligacao nao aceita receber o cracha.';
              return Promise.resolve(false);
            }
        
            return passo.then(function (r) {
              if (r && r.error) {
                estado.entregue = false;
                estado.ultimoErro = r.error.message || 'o servidor nao aceitou a entrada guardada.';
                return false;
              }
              var s = (r && r.data && r.data.session) ? r.data.session : null;
              if (s) {
                estado.vence = Number(s.expires_at || estado.vence);
                estado.dono = (s.user && (s.user.email || s.user.id)) || estado.dono;
              }
              if (vencido) { estado.renovacoes = estado.renovacoes + 1; }
              estado.entregue = true;
              estado.ultimoErro = '';
              soltar();
              return true;
            }).catch(function (e) {
              estado.entregue = false;
              estado.ultimoErro = (e && e.message) ? e.message : 'nao consegui entregar o cracha.';
              return false;
            });
          }
        
          function testar() {
            var sb = cliente();
            if (!sb || typeof sb.from !== 'function') {
              return Promise.resolve({ ok: false, motivo: 'sem ligacao com o servidor.' });
            }
            return Promise.resolve(sb.from('painel_nuvem').select('chave').limit(1)).then(function (r) {
              if (r && r.error) {
                return { ok: false, motivo: r.error.message || 'recusado pelo servidor.' };
              }
              return { ok: true, motivo: 'o servidor aceitou a leitura.' };
            }).catch(function (e) {
              return { ok: false, motivo: (e && e.message) ? e.message : 'erro ao falar com o servidor.' };
            });
          }
        
          /* ================================================================ *
           * 2) pausar os pedidos quando nao ha cracha (para o console respirar)
           * ================================================================ */
          var fromOriginal = null;
        
          function respostaVazia() {
            var recado = { message: 'sem entrada valida no servidor: o painel pausou a sincronizacao.' };
            var api = {};
            ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'in', 'neq', 'gt', 'lt',
             'gte', 'lte', 'like', 'ilike', 'is', 'order', 'limit', 'range', 'single',
             'maybeSingle', 'filter', 'match', 'or'].forEach(function (m) {
              api[m] = function () { return api; };
            });
            api.then = function (res, rej) {
              return Promise.resolve({ data: null, error: recado }).then(res, rej);
            };
            api.catch = function (f) { return api.then(null, f); };
            return api;
          }
        
          function pausar() {
            var sb = cliente();
            if (!sb || estado.pausado || typeof sb.from !== 'function') { return false; }
            fromOriginal = sb.from.bind(sb);
            sb.from = function () { return respostaVazia(); };
            estado.pausado = true;
            return true;
          }
        
          function soltar() {
            var sb = cliente();
            if (!sb || !estado.pausado || !fromOriginal) { return false; }
            sb.from = fromOriginal;
            estado.pausado = false;
            return true;
          }
        
          /* ================================================================ *
           * 3) faixa de aviso, sem susto e sem jargao
           * ================================================================ */
          function faixa(texto, bom, botoes) {
            var cx = porId('p138Faixa');
            if (!cx) {
              cx = document.createElement('div');
              cx.id = 'p138Faixa';
              document.body.appendChild(cx);
            }
            cx.className = bom ? 'ok' : '';
            var h = '<div>' + texto + '</div><div class="p138-btns">';
            (botoes || []).forEach(function (b) {
              h += '<button type="button" class="' + (b.lado ? 'lado' : '') + '" data-a="' + b.a + '">' +
                   b.t + '</button>';
            });
            h += '</div>';
            cx.innerHTML = h;
            cx.style.display = 'block';
            var bs = cx.querySelectorAll('button');
            Array.prototype.forEach.call(bs, function (b) {
              b.addEventListener('click', function () {
                var a = b.getAttribute('data-a');
                if (a === 'entrar') { try { location.reload(); } catch (e) { } return; }
                if (a === 'fechar') { cx.style.display = 'none'; return; }
                if (a === 'tentar') {
                  b.disabled = true;
                  rodada(true).then(function () { b.disabled = false; });
                }
              });
            });
            return cx;
          }
        
          function esconder() {
            var cx = porId('p138Faixa');
            if (cx) { cx.style.display = 'none'; }
          }
        
          /* ================================================================ *
           * 4) rodada: entrega, testa, e decide o que dizer
           * ================================================================ */
          function rodada(mostrarQuandoDaCerto) {
            return entregar().then(function (deu) {
              if (!deu) {
                pausar();
                faixa('O painel esta aberto, mas o servidor <b>nao reconhece voce agora</b>. ' +
                      'Nada foi perdido: os dados deste computador continuam aqui. ' +
                      'Para voltar a sincronizar com as outras pessoas, entre de novo.',
                      false,
                      [{ a: 'entrar', t: 'Entrar de novo' },
                       { a: 'tentar', t: 'Tentar de novo', lado: true },
                       { a: 'fechar', t: 'Depois', lado: true }]);
                return false;
              }
              return testar().then(function (r) {
                if (r.ok) {
                  soltar();
                  if (mostrarQuandoDaCerto) {
                    faixa('Pronto: o servidor reconheceu a sua entrada e a sincronizacao voltou.',
                          true, [{ a: 'fechar', t: 'Fechar', lado: true }]);
                    setTimeout(esconder, 6000);
                  } else {
                    esconder();
                  }
                  return true;
                }
                estado.ultimoErro = r.motivo;
                var baixo = String(r.motivo || '').toLowerCase();
                if (baixo.indexOf('jwt') >= 0 || baixo.indexOf('unauthorized') >= 0 ||
                    baixo.indexOf('expired') >= 0) {
                  pausar();
                  faixa('A sua entrada no servidor venceu. Entre de novo para voltar a sincronizar. ' +
                        'Os dados deste computador estao guardados.',
                        false,
                        [{ a: 'entrar', t: 'Entrar de novo' },
                         { a: 'fechar', t: 'Depois', lado: true }]);
                  return false;
                }
                faixa('O servidor reconheceu voce, mas recusou a leitura dos dados. ' +
                      'Motivo que ele deu: <b>' + String(r.motivo || '') + '</b><br>' +
                      'Em geral isso quer dizer que a sua conta esta como somente consulta ou ' +
                      'ainda nao foi liberada.',
                      false, [{ a: 'tentar', t: 'Tentar de novo' },
                              { a: 'fechar', t: 'Fechar', lado: true }]);
                return false;
              });
            });
          }
        
          window.P138 = {
            aplicar: function () { return rodada(true); },
            testar: testar,
            pausar: pausar,
            soltar: soltar,
            conferir: function () {
              var c = crachaGuardado();
              var d = {
                crachaEntregue: estado.entregue,
                deQuem: estado.dono || '(nao sei)',
                temCrachaGuardado: !!c,
                venceEm: estado.vence ? new Date(estado.vence * 1000).toLocaleString('pt-BR') : '(nao sei)',
                jaVencido: !!(estado.vence && estado.vence <= segundos()),
                sincronizacaoPausada: estado.pausado,
                renovacoes: estado.renovacoes,
                ultimoErro: estado.ultimoErro || '(nenhum)'
              };
              try { console.log('[P138]', d); } catch (e) { }
              return d;
            }
          };
        
          /* ================================================================ *
           * 5) manter ligado: cada 10 minutos e ao voltar para a aba
           * ================================================================ */
          function ligar() {
            rodada(false);
            try {
              var sb = cliente();
              if (sb && sb.auth && typeof sb.auth.onAuthStateChange === 'function') {
                sb.auth.onAuthStateChange(function (evento) {
                  if (String(evento || '').toLowerCase().indexOf('sign') >= 0 ||
                      String(evento || '').toLowerCase().indexOf('token') >= 0) {
                    setTimeout(function () { rodada(false); }, 200);
                  }
                });
              }
            } catch (e) { }
            try {
              setInterval(function () { rodada(false); }, 600000);
            } catch (e2) { }
            try {
              document.addEventListener('visibilitychange', function () {
                if (!document.hidden) { rodada(false); }
              });
            } catch (e3) { }
            try {
              console.log('[PATCH138] cracha do servidor ligado ao canal de dados. Use P138.conferir()');
            } catch (e4) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(ligar, 500); });
          } else {
            setTimeout(ligar, 500);
          }
        }());
        } /* /PATCH154_DISABLED */
    
