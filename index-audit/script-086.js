
        /* PATCH 124 - BACKUP DIARIO AUTOMATICO NA NUVEM
           Uma vez por dia, ao abrir o painel, guarda um retrato completo do banco
           numa linha propria da tabela da nuvem, identificada pela data (AAAAMMDD).
           Da para ver a lista de dias, baixar, voltar tudo para um dia ou voltar
           apenas uma obra. Nao mexe em nada do dia a dia do painel. */
        (function () {
          'use strict';
        
          if (window.__patch124Backup) { return; }
          window.__patch124Backup = true;
        
          var NL = String.fromCharCode(10);
          var TABELA = 'painel_dados';
          var ID_MIN = 20000101;      /* linhas de backup usam a data como codigo */
          var ID_MAX = 99991231;
          var LINHA_SOCORRO = 19000102;   /* copia feita antes de voltar no tempo */
          var DIAS_DIARIOS = 30;      /* guarda um retrato por dia por 30 dias */
          var MESES_MENSAIS = 12;     /* e o retrato do dia 1 de cada mes por 1 ano */
          var CHAVE_LOCAL = 'p124UltimoBackup';
        
          var listaCache = null;
          var ocupado = false;
        
          /* ---------------------------------------------------------------- *
           * utilidades
           * ---------------------------------------------------------------- */
        
          function banco() {
            try { return (typeof _supabase !== 'undefined' && _supabase) ? _supabase : null; }
            catch (e) { return null; }
          }
        
          function bd() {
            try { return (typeof db !== 'undefined' && db) ? db : null; }
            catch (e) { return null; }
          }
        
          function quemSou() {
            try {
              if (window.PainelNucleo && typeof window.PainelNucleo.sessao === 'function') {
                var s = window.PainelNucleo.sessao();
                if (s) { return s.nome || s.usuario || 'usuario'; }
              }
              if (window.usuarioLogado && window.usuarioLogado.nome) { return window.usuarioLogado.nome; }
            } catch (e) {}
            return 'usuario deste computador';
          }
        
          function doisDigitos(n) { return (n < 10 ? '0' : '') + n; }
        
          /* transforma uma data em codigo de linha: 5/9/2026 vira 20260905 */
          function codigoDoDia(data) {
            var d = data || new Date();
            return (d.getFullYear() * 10000) + ((d.getMonth() + 1) * 100) + d.getDate();
          }
        
          function textoDoDia(codigo) {
            var c = parseInt(codigo, 10);
            if (!c) { return '?'; }
            var ano = Math.floor(c / 10000);
            var mes = Math.floor((c % 10000) / 100);
            var dia = c % 100;
            return doisDigitos(dia) + '/' + doisDigitos(mes) + '/' + ano;
          }
        
          function dataDoCodigo(codigo) {
            var c = parseInt(codigo, 10);
            var ano = Math.floor(c / 10000);
            var mes = Math.floor((c % 10000) / 100);
            var dia = c % 100;
            return new Date(ano, mes - 1, dia, 12, 0, 0);
          }
        
          function horaTexto(iso) {
            if (!iso) { return ''; }
            var ms = Date.parse(iso);
            if (isNaN(ms)) { return ''; }
            var d = new Date(ms);
            return doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());
          }
        
          function tamanhoTexto(objeto) {
            var n = 0;
            try { n = JSON.stringify(objeto).length; } catch (e) { return '-'; }
            if (n > 1048576) { return (n / 1048576).toFixed(1) + ' MB'; }
            if (n > 1024) { return Math.round(n / 1024) + ' KB'; }
            return n + ' bytes';
          }
        
          function contarItens(banco2) {
            var total = 0;
            if (!banco2 || !banco2.obras) { return 0; }
            for (var i = 0; i < banco2.obras.length; i++) {
              var o = banco2.obras[i];
              if (o && o.itens && o.itens.length) { total += o.itens.length; }
            }
            return total;
          }
        
          function copiaLimpa(objeto) {
            try { return JSON.parse(JSON.stringify(objeto)); } catch (e) { return null; }
          }
        
          function baixarArquivo(nome, objeto) {
            try {
              var texto = JSON.stringify(objeto, null, 2);
              var url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
              var a = document.createElement('a');
              a.href = url;
              a.download = nome;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
              return true;
            } catch (e) { return false; }
          }
        
          function recado(texto, tipo) {
            try {
              if (typeof window.mostrarToastPainel === 'function') {
                window.mostrarToastPainel(texto, tipo || 'ok');
                return;
              }
            } catch (e) {}
            try { console.log('[patch124] ' + texto); } catch (e2) {}
          }
        
          /* ---------------------------------------------------------------- *
           * conversa com a nuvem
           * ---------------------------------------------------------------- */
        
          /* lista os dias que existem guardados, do mais novo para o mais antigo */
          function listarCopias() {
            var b = banco();
            if (!b) { return Promise.resolve([]); }
            return b.from(TABELA).select('id, updated_at')
              .gte('id', ID_MIN).lte('id', ID_MAX)
              .order('id', { ascending: false })
              .then(function (r) {
                if (!r || r.error || !r.data) { return []; }
                listaCache = r.data;
                return r.data;
              })
              .catch(function () { return []; });
          }
        
          function lerCopia(codigo) {
            var b = banco();
            if (!b) { return Promise.resolve(null); }
            return b.from(TABELA).select('dados').eq('id', codigo).single()
              .then(function (r) {
                if (!r || r.error || !r.data || !r.data.dados) { return null; }
                var pacote = r.data.dados;
                if (pacote.db) { return pacote; }
                return { db: pacote, quem: '', criadoEm: '' };
              })
              .catch(function () { return null; });
          }
        
          function gravarCopia(codigo, pacote) {
            var b = banco();
            if (!b) { return Promise.resolve(false); }
            return b.from(TABELA).upsert({
              id: codigo,
              dados: pacote,
              updated_at: new Date().toISOString()
            }).then(function (r) {
              return !(r && r.error);
            }).catch(function () { return false; });
          }
        
          function apagarCopia(codigo) {
            var b = banco();
            if (!b) { return Promise.resolve(false); }
            return b.from(TABELA).delete().eq('id', codigo)
              .then(function (r) { return !(r && r.error); })
              .catch(function () { return false; });
          }
        
          /* monta o pacote que vai ser guardado no dia */
          function montarPacote(banco2, motivo) {
            return {
              backupDoPainel: true,
              dia: codigoDoDia(new Date()),
              criadoEm: new Date().toISOString(),
              quem: quemSou(),
              motivo: motivo || 'automatico',
              obras: (banco2.obras || []).length,
              itens: contarItens(banco2),
              db: banco2
            };
          }
        
          /* decide quais dias devem continuar guardados */
          function deveGuardar(codigo, hoje) {
            var dias = Math.round((dataDoCodigo(hoje) - dataDoCodigo(codigo)) / 86400000);
            if (dias <= DIAS_DIARIOS) { return true; }
            if ((codigo % 100) === 1 && dias <= (MESES_MENSAIS * 31)) { return true; }
            return false;
          }
        
          function limparAntigas() {
            var hoje = codigoDoDia(new Date());
            return listarCopias().then(function (lista) {
              var apagar = [];
              for (var i = 0; i < lista.length; i++) {
                var c = parseInt(lista[i].id, 10);
                if (!deveGuardar(c, hoje)) { apagar.push(c); }
              }
              if (!apagar.length) { return 0; }
              var fila = Promise.resolve();
              for (var j = 0; j < apagar.length && j < 12; j++) {
                (function (cod) {
                  fila = fila.then(function () { return apagarCopia(cod); });
                })(apagar[j]);
              }
              return fila.then(function () { return apagar.length; });
            });
          }
        
          /* guarda o retrato do dia, se ainda nao existir um */
          function backupDoDia(forcado) {
            if (ocupado) { return Promise.resolve('ocupado'); }
            var b = banco();
            var d = bd();
            if (!b) { return Promise.resolve('sem nuvem'); }
            if (!d || !d.obras || !d.obras.length) { return Promise.resolve('sem dados'); }
        
            var hoje = codigoDoDia(new Date());
            if (!forcado) {
              try {
                if (window.localStorage && localStorage.getItem(CHAVE_LOCAL) === String(hoje)) {
                  return Promise.resolve('ja feito hoje');
                }
              } catch (e) {}
            }
        
            ocupado = true;
            return b.from(TABELA).select('id').eq('id', hoje).single()
              .then(function (r) { return !!(r && !r.error && r.data); })
              .catch(function () { return false; })
              .then(function (existe) {
                if (existe && !forcado) {
                  try { if (window.localStorage) { localStorage.setItem(CHAVE_LOCAL, String(hoje)); } } catch (e) {}
                  return 'ja existia';
                }
                var copia = copiaLimpa(bd());
                if (!copia) { return 'nao deu para copiar'; }
                return gravarCopia(hoje, montarPacote(copia, forcado ? 'manual' : 'automatico'))
                  .then(function (ok) {
                    if (!ok) { return 'falhou'; }
                    try { if (window.localStorage) { localStorage.setItem(CHAVE_LOCAL, String(hoje)); } } catch (e) {}
                    return limparAntigas().then(function () { return 'gravado'; });
                  });
              })
              .then(function (resultado) { ocupado = false; return resultado; })
              .catch(function () { ocupado = false; return 'falhou'; });
          }
        
          /* ---------------------------------------------------------------- *
           * janelas na tela
           * ---------------------------------------------------------------- */
        
          function abrirJanela(titulo, conteudo, botoes) {
            var fundo = document.createElement('div');
            fundo.className = 'p124-fundo';
            var janela = document.createElement('div');
            janela.className = 'p124-janela';
        
            var h = document.createElement('div');
            h.className = 'p124-titulo';
            h.textContent = titulo;
            janela.appendChild(h);
        
            var corpo = document.createElement('div');
            corpo.className = 'p124-texto';
            if (typeof conteudo === 'string') { corpo.textContent = conteudo; }
            else if (conteudo) { corpo.appendChild(conteudo); }
            janela.appendChild(corpo);
        
            var caixa = document.createElement('div');
            caixa.className = 'p124-acoes';
            janela.appendChild(caixa);
        
            function fechar() {
              document.removeEventListener('keydown', aoTeclar);
              if (fundo.parentNode) { fundo.parentNode.removeChild(fundo); }
            }
            function aoTeclar(ev) { if (ev.key === 'Escape') { fechar(); } }
        
            (botoes || []).forEach(function (cfg) {
              var bt = document.createElement('button');
              bt.type = 'button';
              bt.className = cfg.cor || 'p124-cinza';
              bt.textContent = cfg.texto;
              bt.addEventListener('click', function (ev) {
                ev.preventDefault();
                if (cfg.fecha !== false) { fechar(); }
                if (cfg.acao) { cfg.acao(fechar); }
              });
              caixa.appendChild(bt);
            });
        
            fundo.addEventListener('click', function (ev) { if (ev.target === fundo) { fechar(); } });
            document.addEventListener('keydown', aoTeclar);
            fundo.appendChild(janela);
            document.body.appendChild(fundo);
            return { fundo: fundo, janela: janela, corpo: corpo, fechar: fechar };
          }
        
          function linhaBotao(texto, cor, acao) {
            var bt = document.createElement('button');
            bt.type = 'button';
            bt.className = 'p124-linha-bt ' + cor;
            bt.textContent = texto;
            bt.style.marginRight = '6px';
            bt.addEventListener('click', function (ev) { ev.preventDefault(); acao(); });
            return bt;
          }
        
          function abrirBackups() {
            var caixa = document.createElement('div');
            var info = document.createElement('div');
            info.className = 'p124-texto';
            info.textContent = 'Cada linha e um retrato completo do painel, guardado na nuvem naquele dia. Uma copia nova e feita sozinha na primeira vez que o painel abre no dia. Os ultimos 30 dias ficam guardados, mais o dia 1 de cada mes por um ano.';
            caixa.appendChild(info);
        
            var aviso = document.createElement('div');
            aviso.className = 'p124-aviso';
            aviso.textContent = 'Voltar para um dia troca os dados de TODOS os usuarios. Antes de trocar, o painel guarda uma copia de socorro do estado atual e baixa um arquivo no seu computador.';
            caixa.appendChild(aviso);
        
            var area = document.createElement('div');
            area.className = 'p124-texto';
            area.textContent = 'Carregando a lista de dias...';
            caixa.appendChild(area);
        
            var jan = abrirJanela('🛟 Backups na nuvem (por dia)', caixa, [
              {
                texto: '💾 Criar copia de hoje agora', cor: 'p124-verde', fecha: false,
                acao: function () {
                  area.textContent = 'Gravando a copia de hoje...';
                  backupDoDia(true).then(function (r) {
                    recado(r === 'gravado' ? 'Copia de hoje gravada na nuvem.' : ('Copia de hoje: ' + r), r === 'gravado' ? 'ok' : 'erro');
                    desenharLista(area);
                  });
                }
              },
              { texto: 'Fechar', cor: 'p124-cinza' }
            ]);
        
            desenharLista(area);
            return jan;
          }
        
          function desenharLista(area) {
            listarCopias().then(function (lista) {
              area.innerHTML = '';
              if (!lista.length) {
                var vazio = document.createElement('div');
                vazio.className = 'p124-texto';
                vazio.textContent = 'Ainda nao existe nenhuma copia guardada. Use o botao verde para criar a primeira agora.';
                area.appendChild(vazio);
                return;
              }
              var hoje = codigoDoDia(new Date());
              var tabela = document.createElement('table');
              var thead = document.createElement('thead');
              thead.innerHTML = '<tr><th>Dia</th><th>Gravado as</th><th>Idade</th><th>O que fazer</th></tr>';
              tabela.appendChild(thead);
              var tbody = document.createElement('tbody');
        
              lista.forEach(function (reg) {
                var codigo = parseInt(reg.id, 10);
                var tr = document.createElement('tr');
                if (codigo === hoje) { tr.className = 'p124-hoje'; }
        
                var td1 = document.createElement('td');
                td1.textContent = textoDoDia(codigo) + (codigo === hoje ? ' (hoje)' : '');
                tr.appendChild(td1);
        
                var td2 = document.createElement('td');
                td2.textContent = horaTexto(reg.updated_at) || '-';
                tr.appendChild(td2);
        
                var dias = Math.round((dataDoCodigo(hoje) - dataDoCodigo(codigo)) / 86400000);
                var td3 = document.createElement('td');
                td3.textContent = dias <= 0 ? 'de hoje' : (dias === 1 ? 'de ontem' : ('ha ' + dias + ' dias'));
                tr.appendChild(td3);
        
                var td4 = document.createElement('td');
                td4.appendChild(linhaBotao('🔍 Ver', 'p124-cinza', function () { verCopia(codigo); }));
                td4.appendChild(linhaBotao('⬇️ Baixar', 'p124-azul', function () { baixarCopiaDoDia(codigo); }));
                td4.appendChild(linhaBotao('↩️ Voltar para este dia', 'p124-laranja', function () { voltarParaODia(codigo); }));
                tr.appendChild(td4);
        
                tbody.appendChild(tr);
              });
              tabela.appendChild(tbody);
              area.appendChild(tabela);
            });
          }
        
          /* ---------------------------------------------------------------- *
           * ver, baixar e voltar no tempo
           * ---------------------------------------------------------------- */
        
          function verCopia(codigo) {
            var jan = abrirJanela('Copia do dia ' + textoDoDia(codigo), 'Lendo a copia na nuvem...', [{ texto: 'Fechar', cor: 'p124-cinza' }]);
            lerCopia(codigo).then(function (pacote) {
              if (!pacote || !pacote.db) {
                jan.corpo.textContent = 'Nao foi possivel ler esta copia.';
                return;
              }
              var banco2 = pacote.db;
              var caixa = document.createElement('div');
              var topo = document.createElement('div');
              topo.className = 'p124-texto';
              topo.textContent = 'Gravada por ' + (pacote.quem || 'desconhecido') + '. Tem '
                + (banco2.obras || []).length + ' obra(s) e ' + contarItens(banco2)
                + ' item(ns). Tamanho: ' + tamanhoTexto(banco2) + '.';
              caixa.appendChild(topo);
        
              var tabela = document.createElement('table');
              var thead = document.createElement('thead');
              thead.innerHTML = '<tr><th>Obra nesta copia</th><th>Itens</th><th>Hoje tem</th></tr>';
              tabela.appendChild(thead);
              var tbody = document.createElement('tbody');
              var atual = bd() || { obras: [] };
              (banco2.obras || []).forEach(function (o) {
                var tr = document.createElement('tr');
                var t1 = document.createElement('td');
                t1.textContent = o.nome || ('obra ' + o.id);
                var t2 = document.createElement('td');
                t2.textContent = (o.itens || []).length;
                var t3 = document.createElement('td');
                var igual = null;
                (atual.obras || []).forEach(function (a) { if (String(a.id) === String(o.id)) { igual = a; } });
                t3.textContent = igual ? ((igual.itens || []).length + ' itens') : 'obra nao existe mais';
                tr.appendChild(t1); tr.appendChild(t2); tr.appendChild(t3);
                tbody.appendChild(tr);
              });
              tabela.appendChild(tbody);
              caixa.appendChild(tabela);
        
              jan.corpo.innerHTML = '';
              jan.corpo.appendChild(caixa);
            });
          }
        
          function baixarCopiaDoDia(codigo) {
            recado('Baixando a copia do dia ' + textoDoDia(codigo) + '...', 'normal');
            lerCopia(codigo).then(function (pacote) {
              if (!pacote || !pacote.db) { recado('Nao foi possivel ler esta copia.', 'erro'); return; }
              var ok = baixarArquivo('painel_' + codigo + '.json', pacote.db);
              recado(ok ? 'Arquivo salvo na pasta de downloads.' : 'Nao deu para baixar o arquivo.', ok ? 'ok' : 'erro');
            });
          }
        
          /* guarda o estado de agora antes de qualquer troca */
          function guardarSocorro() {
            var agora = copiaLimpa(bd());
            if (!agora) { return Promise.resolve(false); }
            baixarArquivo('painel_antes_de_voltar.json', agora);
            return gravarCopia(LINHA_SOCORRO, montarPacote(agora, 'copia de socorro antes de voltar no tempo'));
          }
        
          function trocarBancoInteiro(novo) {
            var d = bd();
            if (!d || !novo) { return false; }
            var chave;
            for (chave in d) {
              if (d.hasOwnProperty(chave)) { delete d[chave]; }
            }
            for (chave in novo) {
              if (novo.hasOwnProperty(chave)) { d[chave] = novo[chave]; }
            }
            return true;
          }
        
          function redesenhar() {
            try { if (typeof window.render === 'function') { window.render(); return; } } catch (e) {}
            try { if (typeof window.renderTabelaPrincipal === 'function') { window.renderTabelaPrincipal(); } } catch (e2) {}
          }
        
          function salvarEEnviar() {
            try { if (typeof window.salvarDB === 'function') { window.salvarDB(); } } catch (e) {}
            try {
              if (typeof window.sincronizarBancoNuvem === 'function') { window.sincronizarBancoNuvem(); }
            } catch (e2) {}
          }
        
          function voltarParaODia(codigo) {
            var jan = abrirJanela('Voltar para ' + textoDoDia(codigo), 'Lendo a copia na nuvem...', [{ texto: 'Fechar', cor: 'p124-cinza' }]);
            lerCopia(codigo).then(function (pacote) {
              if (!pacote || !pacote.db) {
                jan.corpo.textContent = 'Nao foi possivel ler esta copia.';
                return;
              }
              jan.fechar();
              var banco2 = pacote.db;
              var caixa = document.createElement('div');
        
              var txt = document.createElement('div');
              txt.className = 'p124-texto';
              txt.textContent = 'Esta copia tem ' + (banco2.obras || []).length + ' obra(s) e '
                + contarItens(banco2) + ' item(ns), gravada por ' + (pacote.quem || 'desconhecido') + '.';
              caixa.appendChild(txt);
        
              var alerta = document.createElement('div');
              alerta.className = 'p124-aviso';
              alerta.textContent = 'Trocar tudo apaga o que foi lancado depois deste dia, para todos os usuarios. Se quiser algo menor, escolha uma obra na lista abaixo: so aquela obra volta e o resto fica como esta.';
              caixa.appendChild(alerta);
        
              var tabela = document.createElement('table');
              var thead = document.createElement('thead');
              thead.innerHTML = '<tr><th>Obra</th><th>Itens na copia</th><th></th></tr>';
              tabela.appendChild(thead);
              var tbody = document.createElement('tbody');
              (banco2.obras || []).forEach(function (o) {
                var tr = document.createElement('tr');
                var t1 = document.createElement('td');
                t1.textContent = o.nome || ('obra ' + o.id);
                var t2 = document.createElement('td');
                t2.textContent = (o.itens || []).length;
                var t3 = document.createElement('td');
                t3.appendChild(linhaBotao('↩️ Voltar so esta obra', 'p124-azul', function () {
                  voltarUmaObra(codigo, banco2, o.id);
                }));
                tr.appendChild(t1); tr.appendChild(t2); tr.appendChild(t3);
                tbody.appendChild(tr);
              });
              tabela.appendChild(tbody);
              caixa.appendChild(tabela);
        
              abrirJanela('↩️ Voltar para o dia ' + textoDoDia(codigo), caixa, [
                {
                  texto: '⚠️ Voltar TUDO para este dia', cor: 'p124-laranja',
                  acao: function () { confirmarVoltarTudo(codigo, banco2); }
                },
                { texto: 'Cancelar', cor: 'p124-cinza' }
              ]);
            });
          }
        
          function confirmarVoltarTudo(codigo, banco2) {
            var texto = 'Confirma trocar TODOS os dados do painel pelo retrato do dia '
              + textoDoDia(codigo) + '?' + NL + NL
              + 'Antes de trocar, o painel vai baixar um arquivo com o estado de agora e '
              + 'guardar uma copia de socorro na nuvem.';
            if (!window.confirm(texto)) { return; }
            guardarSocorro().then(function () {
              var copia = copiaLimpa(banco2);
              if (!trocarBancoInteiro(copia)) { recado('Nao deu para trocar os dados.', 'erro'); return; }
              redesenhar();
              salvarEEnviar();
              recado('Painel voltou para o dia ' + textoDoDia(codigo) + '.', 'ok');
            });
          }
        
          function voltarUmaObra(codigo, banco2, obraId) {
            var achada = null;
            (banco2.obras || []).forEach(function (o) { if (String(o.id) === String(obraId)) { achada = o; } });
            if (!achada) { recado('Obra nao encontrada nesta copia.', 'erro'); return; }
            var nome = achada.nome || ('obra ' + obraId);
            if (!window.confirm('Confirma voltar somente a obra ' + nome + ' para como estava no dia '
              + textoDoDia(codigo) + '? As outras obras nao mudam.')) { return; }
            guardarSocorro().then(function () {
              var d = bd();
              if (!d) { return; }
              if (!d.obras) { d.obras = []; }
              var copia = copiaLimpa(achada);
              var trocou = false;
              for (var i = 0; i < d.obras.length; i++) {
                if (String(d.obras[i].id) === String(obraId)) { d.obras[i] = copia; trocou = true; break; }
              }
              if (!trocou) { d.obras.push(copia); }
              redesenhar();
              salvarEEnviar();
              recado('A obra ' + nome + ' voltou para o dia ' + textoDoDia(codigo) + '.', 'ok');
            });
          }
        
          /* ---------------------------------------------------------------- *
           * botao no menu de configuracoes e partida
           * ---------------------------------------------------------------- */
        
          function garantirBotao() {
            if (document.getElementById('p124BtnBackups')) { return; }
            var menu = document.getElementById('settingsMenu');
            var bt = document.createElement('button');
            bt.id = 'p124BtnBackups';
            bt.type = 'button';
            bt.className = 'secondary';
            bt.textContent = '🛟 Backups na nuvem';
            bt.title = 'Retrato do painel guardado por dia, com opcao de voltar';
            bt.addEventListener('click', function (ev) { ev.preventDefault(); abrirBackups(); });
        
            if (menu) {
              menu.appendChild(bt);
              return;
            }
            var alvo = document.querySelector('.project-selector');
            if (alvo) { alvo.appendChild(bt); }
          }
        
          function comecar() {
            garantirBotao();
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', comecar);
          } else {
            comecar();
          }
          setTimeout(comecar, 800);
          setTimeout(comecar, 2500);
          setInterval(garantirBotao, 6000);
        
          /* a copia do dia sai depois que o painel terminou de carregar os dados */
          setTimeout(function () {
            backupDoDia(false).then(function (r) {
              if (r === 'gravado') { recado('Copia de seguranca do dia guardada na nuvem.', 'ok'); }
              try { console.log('[patch124] backup do dia: ' + r); } catch (e) {}
            });
          }, 12000);
        
          /* se o painel ficar aberto virando o dia, ele tenta de novo de hora em hora */
          setInterval(function () { backupDoDia(false); }, 3600000);
        
          /* atalhos para uso manual */
          window.p124AbrirBackups = abrirBackups;
          window.p124BackupAgora = function () { return backupDoDia(true); };
          window.p124Listar = listarCopias;
          window.p124Estado = function () {
            var d = bd();
            return {
              diaDeHoje: codigoDoDia(new Date()),
              obras: d && d.obras ? d.obras.length : 0,
              itens: contarItens(d),
              copiasConhecidas: listaCache ? listaCache.length : 'ainda nao lidas'
            };
          };
        })();
    
