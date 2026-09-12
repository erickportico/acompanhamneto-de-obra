
        /* =====================================================================
         * PATCH 147 - porteiro de leituras: nao baixar o mesmo banco toda hora
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.P147) { return; }
        
          var LINHA_GRANDE = 'painel_dados';
          var VALE_MARCA = 5000;        /* uma pergunta de hora por vez */
          var VALE_PESADA = 600000;     /* copia de boletins/diarios vale 10 min */
          var VALE_ESCONDIDA = 300000;  /* aba em segundo plano usa a copia */
          var GRANDE = 1048576;         /* 1 MB: leitura considerada pesada */
          var CHAVE = 'p147_consumo';
        
          var copias = {};              /* resultado guardado por pedido */
          var marcas = {};              /* hora do ultimo salvamento por linha */
          var baixado = 0, poupado = 0, idas = 0, evitadas = 0;
        
          function hoje() { return new Date().toISOString().slice(0, 10); }
          function anotarConsumo() {
            try {
              var m = {};
              try { m = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) { m = {}; }
              m[hoje()] = { baixado: baixado, poupado: poupado, idas: idas, evitadas: evitadas };
              var dias = Object.keys(m).sort();
              while (dias.length > 14) { delete m[dias.shift()]; }
              localStorage.setItem(CHAVE, JSON.stringify(m));
            } catch (e) { }
          }
          function tamanho(v) {
            try { return JSON.stringify(v).length; } catch (e) { return 0; }
          }
          function mb(n) { return (n / 1048576).toFixed(2) + ' MB'; }
          function anotarOcorrencia(tipo, msg, extra) {
            try { if (window.P146 && window.P146.registrar) { window.P146.registrar(tipo, msg, extra); } } catch (e) { }
          }
        
          /* ---------------- pergunta so a hora do ultimo salvamento ---------------- */
          function lerMarca(cli, tabela, id) {
            var chave = tabela + '#' + id;
            var g = marcas[chave];
            var agora = Date.now();
            if (g && (agora - g.quando) < VALE_MARCA) { return g.promessa; }
            var p = Promise.resolve(cli.__p147from(tabela).select('updated_at').eq('id', id).limit(1))
              .then(function (r) {
                if (r && r.error) { return null; }
                var linhas = (r && r.data) || [];
                return linhas.length ? (linhas[0].updated_at || null) : null;
              })
              .catch(function () { return null; });
            marcas[chave] = { quando: agora, promessa: p };
            return p;
          }
          function esquecerMarca(tabela) {
            Object.keys(marcas).forEach(function (k) {
              if (k.indexOf(tabela + '#') === 0) { delete marcas[k]; }
            });
          }
          function esquecerCopias(tabela) {
            Object.keys(copias).forEach(function (k) {
              if (k.indexOf(tabela + '|') === 0) { delete copias[k]; }
            });
          }
        
          /* ---------------- e uma leitura pesada? ---------------- */
          function pesada(colunas) {
            var c = String(colunas || '').toLowerCase();
            return c.indexOf('dados') >= 0 || c.indexOf('valor') >= 0 || c === '*';
          }
        
          /* ---------------- pedido nosso, com copia guardada ---------------- */
          function pedido(cli, tabela, colunas) {
            var filtros = [];
            var modo = 'lista';
            var alvo = null;
        
            function chave() {
              return tabela + '|' + colunas + '|' + JSON.stringify(filtros) + '|' + modo;
            }
        
            function real() {
              var q = cli.__p147from(tabela).select(colunas);
              filtros.forEach(function (f) {
                if (f[0] === 'eq') { q = q.eq(f[1], f[2]); }
                else if (f[0] === 'in') { q = q.in(f[1], f[2]); }
                else if (f[0] === 'limit') { q = q.limit(Number(f[1])); }
                else if (f[0] === 'order') { q = q.order(f[1]); }
              });
              if (modo === 'single') { q = q.single(); }
              else if (modo === 'talvez') { q = q.maybeSingle(); }
              return Promise.resolve(q);
            }
        
            function entregarCopia(g) {
              evitadas++;
              poupado += g.peso;
              anotarConsumo();
              var v;
              try { v = JSON.parse(g.texto); } catch (e) { v = null; }
              return Promise.resolve(v || { data: null, error: null });
            }
        
            function guardar(r) {
              idas++;
              var peso = tamanho(r && r.data);
              baixado += peso;
              anotarConsumo();
              if (peso > GRANDE) {
                anotarOcorrencia('leitura pesada na nuvem',
                  'Baixou ' + mb(peso) + ' de uma vez da tabela ' + tabela,
                  { de: 'colunas: ' + colunas, grupo: 'rede' });
              }
              if (r && !r.error) {
                var texto = null;
                try { texto = JSON.stringify({ data: r.data, error: null }); } catch (e) { texto = null; }
                if (texto) {
                  copias[chave()] = { texto: texto, peso: peso, quando: Date.now(), marca: null };
                  return texto;
                }
              }
              return null;
            }
        
            function executar() {
              var g = copias[chave()];
              var escondida = false;
              try { escondida = !!document.hidden; } catch (e) { }
        
              /* aba em segundo plano: usa a copia e nao consulta nada */
              if (g && escondida && (Date.now() - g.quando) < VALE_ESCONDIDA) {
                return entregarCopia(g);
              }
        
              /* a linha unica com o banco inteiro: confere a hora antes de baixar */
              if (tabela === LINHA_GRANDE && alvo !== null) {
                return lerMarca(cli, tabela, alvo).then(function (marca) {
                  var atual = copias[chave()];
                  if (atual && marca && atual.marca === marca) { return entregarCopia(atual); }
                  return real().then(function (r) {
                    var texto = guardar(r);
                    if (texto && copias[chave()]) { copias[chave()].marca = marca; }
                    return r;
                  });
                });
              }
        
              /* outras leituras pesadas: a copia vale por alguns minutos */
              if (pesada(colunas) && g && (Date.now() - g.quando) < VALE_PESADA) {
                return entregarCopia(g);
              }
              return real().then(function (r) { guardar(r); return r; });
            }
        
            var eu = {
              eq: function (col, val) {
                filtros.push(['eq', col, val]);
                if (String(col) === 'id') { alvo = val; }
                return eu;
              },
              in: function (col, vals) {
                filtros.push(['in', col, vals]);
                return eu;
              },
              limit: function (n) { filtros.push(['limit', n]); return eu; },
              order: function (c) { filtros.push(['order', c]); return eu; },
              single: function () { modo = 'single'; return eu; },
              maybeSingle: function () { modo = 'talvez'; return eu; },
              then: function (f, g2) { return executar().then(f, g2); },
              catch: function (f) { return executar().catch(f); },
              finally: function (f) { return executar().then(f, f); }
            };
            return eu;
          }
        
          /* ---------------- instalar o porteiro no cliente da nuvem ---------------- */
          function envolverTabela(cli, tabela) {
            var basica = cli.__p147from(tabela);
        
            function nossoSelect(colunas) {
              if (typeof colunas === 'undefined') { colunas = '*'; }
              if (!pesada(colunas)) { return basica.select(colunas); }
              return pedido(cli, tabela, colunas);
            }
            function apagarCopias() {
              esquecerCopias(tabela);
              esquecerMarca(tabela);
            }
            var GRAVA = { insert: 1, update: 1, delete: 1, upsert: 1 };
        
            if (typeof Proxy === 'function') {
              return new Proxy(basica, {
                get: function (alvo2, nome) {
                  if (nome === 'select') { return nossoSelect; }
                  var v = alvo2[nome];
                  if (typeof v === 'function') {
                    return function () {
                      if (GRAVA[nome]) { apagarCopias(); }
                      return v.apply(alvo2, arguments);
                    };
                  }
                  return v;
                }
              });
            }
        
            /* navegador antigo: copia os recursos na mao */
            var eu = { select: nossoSelect };
            Object.keys(GRAVA).forEach(function (nome) {
              if (typeof basica[nome] === 'function') {
                eu[nome] = function () {
                  apagarCopias();
                  return basica[nome].apply(basica, arguments);
                };
              }
            });
            ['eq', 'in', 'limit', 'order', 'single', 'maybeSingle', 'rpc', 'on'].forEach(function (nome) {
              if (!eu[nome] && typeof basica[nome] === 'function') {
                eu[nome] = function () { return basica[nome].apply(basica, arguments); };
              }
            });
            return eu;
          }
        
          function instalar() {
            var cli = window._supabase;
            if (!cli || typeof cli.from !== 'function' || cli.__p147) { return false; }
            cli.__p147 = true;
            cli.__p147from = cli.from.bind(cli);
            cli.from = function (tabela) {
              try { return envolverTabela(cli, tabela); }
              catch (e) { return cli.__p147from(tabela); }
            };
            return true;
          }
        
          instalar();
          /* o cliente pode ser criado depois da entrada no sistema */
          setInterval(instalar, 4000);
        
          /* depois de salvar, a copia guardada nao vale mais */
          document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { esquecerMarca(LINHA_GRANDE); }
          });
        
          window.P147 = {
            relatorio: function () {
              var r = {
                baixadoHoje: mb(baixado),
                economizadoHoje: mb(poupado),
                leiturasFeitas: idas,
                leiturasEvitadas: evitadas,
                copiasGuardadas: Object.keys(copias).length
              };
              try {
                if (window.console && console.log) {
                  console.log('Consumo de dados hoje: baixou ' + r.baixadoHoje +
                    ' | deixou de baixar ' + r.economizadoHoje +
                    ' | leituras: ' + idas + ' feitas, ' + evitadas + ' evitadas');
                }
              } catch (e) { }
              return r;
            },
            historico: function () {
              try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch (e) { return {}; }
            },
            limparCopias: function () {
              copias = {}; marcas = {};
              return true;
            },
            instalado: function () {
              return !!(window._supabase && window._supabase.__p147);
            }
          };
        })();
    
