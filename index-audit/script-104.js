
        if (false) { /* PATCH154_DISABLED */
        /* =====================================================================
         * PATCH 140 - simulador da tela de bloqueio
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.__p140) { return; }
          window.__p140 = true;
        
          var CENARIOS = {
            'senha-certa': {
              conta: 'o servidor aceita a senha',
              senha: 'senha-de-mentira',
              espera: 'a caixa sai da tela',
              resposta: function () { return Promise.resolve({ data: { session: {} }, error: null }); }
            },
            'senha-errada': {
              conta: 'o servidor diz que a senha nao confere',
              senha: 'senha-errada',
              espera: 'aviso na tela falando da senha e do Caps Lock',
              resposta: function () {
                return Promise.resolve({ error: { message: 'Invalid login credentials' } });
              }
            },
            'muitas': {
              conta: 'muitas tentativas seguidas',
              senha: 'qualquer',
              espera: 'pedido para esperar um minuto',
              resposta: function () {
                return Promise.resolve({ error: { message: 'Too Many Requests' } });
              }
            },
            'sem-rede': {
              conta: 'a internet caiu no meio da conferencia',
              senha: 'qualquer',
              espera: 'explicacao da internet e botao para voltar sem conferir',
              resposta: function () { return Promise.reject(new Error('Failed to fetch')); }
            },
            'calado': {
              conta: 'o servidor nao responde nada (leva 16 segundos)',
              senha: 'qualquer',
              espera: 'depois de 15 segundos, aviso de que o servidor nao respondeu',
              resposta: function () { return new Promise(function () { }); }
            },
            'sem-senha': {
              conta: 'clicou em Voltar ao painel com o campo vazio',
              senha: '',
              espera: 'pedido para digitar a senha',
              resposta: function () { return Promise.resolve({ error: { message: 'nao deveria chegar aqui' } }); }
            }
          };
        
          var ORDEM = ['senha-errada', 'muitas', 'sem-rede', 'sem-senha', 'senha-certa', 'calado'];
        
          function porId(x) { return document.getElementById(x); }
        
          function cliente() {
            try { if (typeof _supabase !== 'undefined' && _supabase) { return _supabase; } } catch (e) { }
            if (window._supabase) { return window._supabase; }
            if (window.supabaseClient) { return window.supabaseClient; }
            if (window.supabase && window.supabase.from) { return window.supabase; }
            return null;
          }
        
          var guardado = null;   /* a conferencia de verdade, guardada de lado */
        
          function fingir(qual) {
            var sb = cliente();
            if (!sb || !sb.auth) { return false; }
            if (!guardado) { guardado = sb.auth.signInWithPassword; }
            sb.auth.signInWithPassword = function () { return CENARIOS[qual].resposta(); };
            return true;
          }
        
          function devolver() {
            var sb = cliente();
            if (sb && sb.auth && guardado) {
              sb.auth.signInWithPassword = guardado;
              guardado = null;
              return true;
            }
            return false;
          }
        
          function prontoParaSimular() {
            if (!window.P139 || !window.P139.travar) {
              try {
                console.log('%c[P140] A tela de bloqueio nova (patch 139) nao esta aqui. ' +
                            'Aplique o patch 139 e recarregue com Ctrl+F5.',
                            'color:#b91c1c;font-weight:700');
              } catch (e) { }
              return false;
            }
            if (!cliente()) {
              try {
                console.log('%c[P140] Nao encontrei a ligacao com o servidor nesta pagina.',
                            'color:#b91c1c;font-weight:700');
              } catch (e2) { }
              return false;
            }
            return true;
          }
        
          function naTela() {
            var er = porId('p139Er');
            return er ? String(er.textContent || '').trim() : '';
          }
        
          function travadoAgora() {
            var t = porId('p139Trava');
            return !!(t && t.className.indexOf('on') >= 0);
          }
        
          function conferindoResultado(qual) {
            var texto = naTela();
            var baixo = texto.toLowerCase();
            var atalho = porId('p139SemRede');
            var mostraAtalho = !!(atalho && atalho.style.display === 'block');
            if (qual === 'senha-certa') {
              return { passou: !travadoAgora(), viu: 'a caixa saiu da tela' };
            }
            if (qual === 'senha-errada') {
              return { passou: travadoAgora() && baixo.indexOf('nao confere') >= 0, viu: texto };
            }
            if (qual === 'muitas') {
              return { passou: travadoAgora() && baixo.indexOf('espere um minuto') >= 0, viu: texto };
            }
            if (qual === 'sem-rede') {
              return { passou: travadoAgora() && baixo.indexOf('internet') >= 0, viu: texto +
                       (mostraAtalho ? '  [+ botao para voltar sem conferir]' : '') };
            }
            if (qual === 'calado') {
              return { passou: travadoAgora() && baixo.indexOf('nao respondeu') >= 0, viu: texto };
            }
            if (qual === 'sem-senha') {
              return { passou: travadoAgora() && baixo.indexOf('digite a senha') >= 0, viu: texto };
            }
            return { passou: false, viu: texto };
          }
        
          function rodarUm(qual, deixarNaTela) {
            var c = CENARIOS[qual];
            if (!c) {
              try { console.log('[P140] nao conheco a situacao "' + qual + '". Use P140.lista()'); }
              catch (e) { }
              return Promise.resolve(null);
            }
            if (!prontoParaSimular()) { return Promise.resolve(null); }
        
            try {
              console.log('%c[P140] situacao: ' + qual + ' - ' + c.conta,
                          'color:#1d4ed8;font-weight:700');
              console.log('        esperado: ' + c.espera);
              if (qual === 'calado') {
                console.log('        (esta leva 16 segundos de proposito, aguarde)');
              }
            } catch (e2) { }
        
            fingir(qual);
            try { window.P139.destravar(); } catch (e3) { }
            window.P139.travar();
        
            var campo = porId('p139Senha');
            if (campo) { campo.value = c.senha; }
        
            return Promise.resolve(window.P139.tentar()).then(function () {
              var r = conferindoResultado(qual);
              try {
                console.log((r.passou ? '%c        resultado: como esperado' :
                                        '%c        resultado: DIFERENTE do esperado'),
                            r.passou ? 'color:#15803d;font-weight:700' : 'color:#b91c1c;font-weight:700');
                console.log('        na tela: ' + (r.viu || '(nada escrito)'));
              } catch (e4) { }
              if (!deixarNaTela) {
                devolver();
                try { window.P139.destravar(); } catch (e5) { }
              } else {
                try {
                  console.log('%c        a caixa ficou na tela para voce olhar. ' +
                              'Chame P140.parar() quando terminar.', 'color:#b45309');
                } catch (e6) { }
              }
              return { situacao: qual, comoEsperado: r.passou, naTela: r.viu };
            });
          }
        
          function rodarTodos() {
            if (!prontoParaSimular()) { return Promise.resolve([]); }
            var resultados = [];
            try {
              console.log('%c[P140] simulando a tela de bloqueio (' + ORDEM.length + ' situacoes). ' +
                          'A senha nao vai para o servidor: as respostas sao de faz-de-conta.',
                          'color:#0f172a;font-weight:700');
            } catch (e) { }
        
            return ORDEM.reduce(function (fila, qual) {
              return fila.then(function () {
                return rodarUm(qual, false).then(function (r) {
                  if (r) { resultados.push(r); }
                });
              });
            }, Promise.resolve()).then(function () {
              devolver();
              try { window.P139.destravar(); } catch (e2) { }
              var certas = resultados.filter(function (r) { return r.comoEsperado; }).length;
              try {
                if (console.table) { console.table(resultados); }
                console.log('%c[P140] fim: ' + certas + ' de ' + resultados.length +
                            ' situacoes se comportaram como esperado. ' +
                            'A conferencia de verdade ja voltou ao normal.',
                            certas === resultados.length ?
                              'color:#15803d;font-weight:700' : 'color:#b45309;font-weight:700');
              } catch (e3) { }
              return resultados;
            });
          }
        
          window.P140 = {
            simular: rodarTodos,
            cenario: function (qual) { return rodarUm(qual, true); },
            lista: function () {
              var nomes = Object.keys(CENARIOS);
              try {
                nomes.forEach(function (n) { console.log('  ' + n + '  ->  ' + CENARIOS[n].conta); });
              } catch (e) { }
              return nomes;
            },
            parar: function () {
              var voltou = devolver();
              try { window.P139.destravar(); } catch (e) { }
              try {
                console.log('[P140] faz-de-conta desligado. Conferencia de verdade ' +
                            (voltou ? 'restaurada.' : 'nunca foi trocada.'));
              } catch (e2) { }
              return true;
            },
            fingindoAgora: function () { return !!guardado; }
          };
        
          try {
            console.log('[PATCH140] simulador pronto. Use P140.simular() ou P140.lista()');
          } catch (e) { }
        }());
        } /* /PATCH154_DISABLED */
    
