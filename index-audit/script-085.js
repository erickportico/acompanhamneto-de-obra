
        /* PATCH 123 - Pacote de seguranca do dado:
           1) antes de enviar para a nuvem, confere se outra pessoa salvou depois de
              voce; se salvou, pergunta o que fazer em vez de sobrescrever;
           2) tudo que e excluido vai para uma lixeira, com quem excluiu e quando,
              e pode ser restaurado.
           Nenhuma conta do painel foi alterada. */
        (function () {
          'use strict';
        
          if (window.__patch123Seguranca) { return; }
          window.__patch123Seguranca = true;
        
          var NL = String.fromCharCode(10);
          var TABELA = 'painel_dados';
          var LINHA = 1;
          var DIAS_LIXEIRA = 30;      /* depois disso a lixeira se limpa sozinha */
          var MAX_LIXEIRA = 800;      /* teto de itens guardados */
          var TOLERANCIA = 4000;      /* folga de relogio, em milissegundos */
        
          var marcaConhecida = 0;     /* versao da nuvem que este navegador conhece */
          var horaDoMeuEnvio = 0;
          var conflitoAberto = false;
          var fila = Promise.resolve();
          var espelho = {};           /* retrato dos itens por obra, para achar o que sumiu */
          var pronto = false;
        
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
            } catch (e) {}
            return 'usuario deste computador';
          }
        
          function agoraTexto(ms) {
            var d = ms ? new Date(ms) : new Date();
            try { return d.toLocaleString('pt-BR'); } catch (e) { return String(d); }
          }
        
          function baixarCopia(nome, objeto) {
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
        
          function guardarNoNavegador(chave, objeto) {
            try { localStorage.setItem(chave, JSON.stringify(objeto)); return true; }
            catch (e) { return false; }
          }
        
          /* ---------------------------------------------------------------- *
           * janelas (sem depender de nada externo)
           * ---------------------------------------------------------------- */
        
          function abrirJanela(titulo, linhas, botoes, extra) {
            var fundo = document.createElement('div');
            fundo.className = 'p123-fundo';
        
            var janela = document.createElement('div');
            janela.className = 'p123-janela';
            janela.setAttribute('role', 'dialog');
        
            var h = document.createElement('div');
            h.className = 'p123-titulo';
            h.textContent = titulo;
            janela.appendChild(h);
        
            for (var i = 0; i < linhas.length; i++) {
              var p = document.createElement('div');
              p.className = 'p123-texto';
              p.textContent = linhas[i];
              janela.appendChild(p);
            }
        
            if (extra) { janela.appendChild(extra); }
        
            var caixa = document.createElement('div');
            caixa.className = 'p123-acoes';
        
            function fechar() {
              if (fundo.parentNode) { fundo.parentNode.removeChild(fundo); }
              document.removeEventListener('keydown', aoTeclar, true);
            }
        
            function aoTeclar(ev) {
              var k = ev.key || ev.keyCode;
              if (k === 'Escape' || k === 'Esc' || k === 27) { ev.preventDefault(); fechar(); }
            }
        
            for (var j = 0; j < botoes.length; j++) {
              (function (cfg) {
                var bt = document.createElement('button');
                bt.type = 'button';
                bt.className = cfg.cor || 'p123-cinza';
                bt.textContent = cfg.texto;
                if (cfg.dica) { bt.title = cfg.dica; }
                bt.addEventListener('click', function (ev) {
                  ev.preventDefault();
                  if (cfg.manterAberta) { if (cfg.acao) { cfg.acao(fechar); } return; }
                  fechar();
                  if (cfg.acao) { cfg.acao(fechar); }
                });
                caixa.appendChild(bt);
              })(botoes[j]);
            }
        
            janela.appendChild(caixa);
            fundo.appendChild(janela);
            document.body.appendChild(fundo);
            document.addEventListener('keydown', aoTeclar, true);
            return { fundo: fundo, janela: janela, fechar: fechar };
          }
        
          function mostrarAviso(texto, textoBotao, acao) {
            var a = document.getElementById('p123Aviso');
            if (!a) {
              a = document.createElement('div');
              a.id = 'p123Aviso';
              document.body.appendChild(a);
            }
            a.innerHTML = '';
            var t = document.createElement('span');
            t.textContent = texto;
            a.appendChild(t);
        
            var bt = document.createElement('button');
            bt.type = 'button';
            bt.textContent = textoBotao;
            bt.addEventListener('click', function () { esconderAviso(); if (acao) { acao(); } });
            a.appendChild(bt);
        
            var fechar = document.createElement('button');
            fechar.type = 'button';
            fechar.className = 'p123-fraco';
            fechar.textContent = 'Depois';
            fechar.addEventListener('click', esconderAviso);
            a.appendChild(fechar);
        
            a.className = 'p123-on';
          }
        
          function esconderAviso() {
            var a = document.getElementById('p123Aviso');
            if (a) { a.className = ''; }
          }
        
          /* ---------------------------------------------------------------- *
           * 1) conflito: nao sobrescrever o trabalho de outra pessoa
           * ---------------------------------------------------------------- */
        
          function lerMarcaRemota() {
            var b = banco();
            if (!b) { return Promise.resolve(0); }
            return b.from(TABELA).select('updated_at').eq('id', LINHA).single()
              .then(function (r) {
                if (r && !r.error && r.data && r.data.updated_at) {
                  var ms = Date.parse(r.data.updated_at);
                  return isNaN(ms) ? 0 : ms;
                }
                return 0;
              })
              .catch(function () { return 0; });
          }
        
          function lerBancoRemoto() {
            var b = banco();
            if (!b) { return Promise.resolve(null); }
            return b.from(TABELA).select('dados').eq('id', LINHA).single()
              .then(function (r) {
                if (r && !r.error && r.data && r.data.dados) {
                  return r.data.dados.db ? r.data.dados.db : r.data.dados;
                }
                return null;
              })
              .catch(function () { return null; });
          }
        
          function marcarQuemEditou() {
            var d = bd();
            if (!d) { return; }
            d.ultimaEdicao = { quem: quemSou(), quando: new Date().toISOString() };
          }
        
          function enviarDeVerdade() {
            horaDoMeuEnvio = Date.now();
            marcarQuemEditou();
            var r = null;
            try { r = originalSincronizar.apply(window, []); } catch (e) {}
            /* depois do envio, esta passa a ser a versao conhecida */
            setTimeout(function () {
              lerMarcaRemota().then(function (ms) { if (ms) { marcaConhecida = ms; } });
            }, 2500);
            return r;
          }
        
          function janelaConflito(marcaRemota) {
            if (conflitoAberto) { return; }
            conflitoAberto = true;
        
            lerBancoRemoto().then(function (remoto) {
              var quem = 'outra pessoa';
              if (remoto && remoto.ultimaEdicao && remoto.ultimaEdicao.quem) {
                quem = remoto.ultimaEdicao.quem;
              }
              var obrasRemotas = (remoto && remoto.obras) ? remoto.obras.length : 0;
              var d = bd();
              var obrasMinhas = (d && d.obras) ? d.obras.length : 0;
        
              abrirJanela(
                'Atencao: alguem salvou antes de voce',
                [
                  quem + ' salvou uma versao mais nova em ' + agoraTexto(marcaRemota) + '.',
                  'Para nao apagar o trabalho dessa pessoa, o painel NAO enviou as suas'
                    + ' alteracoes ainda. Elas continuam salvas aqui no seu computador.',
                  'Na nuvem estao ' + obrasRemotas + ' obra(s); na sua tela estao '
                    + obrasMinhas + ' obra(s).',
                  'Escolha como seguir (em qualquer caso e feita uma copia de seguranca'
                    + ' antes):'
                ],
                [
                  {
                    texto: 'Trazer a versao da nuvem',
                    cor: 'p123-azul',
                    dica: 'Baixa o que esta na nuvem. Suas alteracoes vao para um arquivo de copia.',
                    acao: function () {
                      var meu = bd();
                      baixarCopia('minhas_alteracoes_' + Date.now() + '.json', meu);
                      guardarNoNavegador('painel_p123_minha_versao', meu);
                      marcaConhecida = marcaRemota;
                      conflitoAberto = false;
                      esconderAviso();
                      try {
                        if (typeof carregarBancoDaNuvem === 'function') { carregarBancoDaNuvem(); }
                      } catch (e) {}
                      alert('Versao da nuvem carregada.' + NL
                        + 'Suas alteracoes ficaram no arquivo minhas_alteracoes.json'
                        + ' (pasta de downloads) e tambem guardadas neste navegador.');
                    }
                  },
                  {
                    texto: 'Enviar a minha por cima',
                    cor: 'p123-vermelho',
                    dica: 'Sobrescreve a nuvem. A versao da outra pessoa e salva num arquivo antes.',
                    acao: function () {
                      if (remoto) {
                        baixarCopia('versao_da_nuvem_' + Date.now() + '.json', remoto);
                        guardarNoNavegador('painel_p123_versao_nuvem', remoto);
                      }
                      marcaConhecida = marcaRemota;
                      conflitoAberto = false;
                      esconderAviso();
                      enviarDeVerdade();
                      alert('Sua versao foi enviada.' + NL
                        + 'A versao anterior da nuvem ficou salva no arquivo'
                        + ' versao_da_nuvem.json (pasta de downloads).');
                    }
                  },
                  {
                    texto: 'Decidir depois',
                    cor: 'p123-cinza',
                    dica: 'Nao envia e nao apaga nada. Voce continua trabalhando na sua tela.',
                    acao: function () {
                      conflitoAberto = false;
                      mostrarAviso('Suas alteracoes ainda nao foram para a nuvem.',
                        'Resolver agora', function () { janelaConflito(marcaRemota); });
                    }
                  }
                ]
              );
            });
          }
        
          var originalSincronizar = null;
        
          function ligarConflito() {
            if (typeof window.sincronizarBancoNuvem !== 'function') { return; }
            if (window.sincronizarBancoNuvem.__p123) { return; }
            originalSincronizar = window.sincronizarBancoNuvem;
        
            var novo = function () {
              fila = fila.then(function () {
                if (conflitoAberto) { return null; }   /* espera a decisao do usuario */
                return lerMarcaRemota().then(function (remota) {
                  if (!remota) { return enviarDeVerdade(); }      /* sem nuvem: segue o fluxo normal */
                  if (!marcaConhecida) { marcaConhecida = remota; return enviarDeVerdade(); }
                  var euAcabeiDeSalvar = (Date.now() - horaDoMeuEnvio) < 12000;
                  if (remota > (marcaConhecida + TOLERANCIA) && !euAcabeiDeSalvar) {
                    try { atualizarStatusNuvem('⚠️ Versao mais nova na nuvem', 'erro'); } catch (e) {}
                    janelaConflito(remota);
                    return null;
                  }
                  if (remota > marcaConhecida) { marcaConhecida = remota; }
                  return enviarDeVerdade();
                });
              }).catch(function () { return null; });
              return fila;
            };
            novo.__p123 = true;
            window.sincronizarBancoNuvem = novo;
          }
        
          /* de tempo em tempo, olha se alguem salvou algo novo */
          function vigiarNuvem() {
            if (conflitoAberto) { return; }
            lerMarcaRemota().then(function (remota) {
              if (!remota) { return; }
              if (!marcaConhecida) { marcaConhecida = remota; return; }
              var euAcabeiDeSalvar = (Date.now() - horaDoMeuEnvio) < 12000;
              if (remota > (marcaConhecida + TOLERANCIA) && !euAcabeiDeSalvar) {
                mostrarAviso('Outra pessoa salvou alteracoes em ' + agoraTexto(remota) + '.',
                  'Atualizar minha tela', function () {
                    marcaConhecida = remota;
                    try {
                      if (typeof carregarBancoDaNuvem === 'function') { carregarBancoDaNuvem(); }
                    } catch (e) {}
                  });
              }
            });
          }
        
          /* ---------------------------------------------------------------- *
           * 2) lixeira de itens excluidos
           * ---------------------------------------------------------------- */
        
          function listaLixeira() {
            var d = bd();
            if (!d) { return []; }
            if (!d.lixeiraItens || !d.lixeiraItens.length && !Array.isArray(d.lixeiraItens)) {
              d.lixeiraItens = [];
            }
            if (!Array.isArray(d.lixeiraItens)) { d.lixeiraItens = []; }
            return d.lixeiraItens;
          }
        
          function podarLixeira() {
            var lista = listaLixeira();
            var limite = Date.now() - (DIAS_LIXEIRA * 24 * 60 * 60 * 1000);
            var restou = lista.filter(function (r) {
              return !r || !r.quandoMs || r.quandoMs >= limite;
            });
            if (restou.length > MAX_LIXEIRA) {
              restou = restou.slice(restou.length - MAX_LIXEIRA);
            }
            var mudou = restou.length !== lista.length;
            if (mudou) {
              var d = bd();
              if (d) { d.lixeiraItens = restou; }
            }
            return mudou;
          }
        
          function retratoDasObras() {
            var d = bd();
            var novo = {};
            if (!d || !d.obras) { return novo; }
            for (var i = 0; i < d.obras.length; i++) {
              var o = d.obras[i];
              if (!o) { continue; }
              var mapa = {};
              var itens = o.itens || [];
              for (var j = 0; j < itens.length; j++) {
                if (itens[j] && itens[j].id !== undefined) {
                  mapa[String(itens[j].id)] = itens[j];
                }
              }
              novo[String(o.id)] = { nome: o.nome || '', itens: mapa };
            }
            return novo;
          }
        
          function refazerEspelho() {
            espelho = retratoDasObras();
            pronto = true;
          }
        
          /* compara o retrato anterior com o de agora e guarda o que sumiu */
          function recolherExcluidos() {
            if (!pronto) { refazerEspelho(); return 0; }
            var agora = retratoDasObras();
            var lista = listaLixeira();
            var quem = quemSou();
            var quando = new Date();
            var lote = 'L' + quando.getTime();
            var achados = 0;
        
            for (var obraId in espelho) {
              if (!espelho.hasOwnProperty(obraId)) { continue; }
              if (!agora[obraId]) { continue; }   /* obra apagada: nao trata como item */
              var antes = espelho[obraId].itens;
              var depois = agora[obraId].itens;
              for (var itemId in antes) {
                if (!antes.hasOwnProperty(itemId)) { continue; }
                if (depois[itemId]) { continue; }
                var copia = null;
                try { copia = JSON.parse(JSON.stringify(antes[itemId])); } catch (e) { copia = antes[itemId]; }
                lista.push({
                  registro: lote + '_' + itemId,
                  lote: lote,
                  obraId: obraId,
                  obraNome: espelho[obraId].nome,
                  quem: quem,
                  quandoMs: quando.getTime(),
                  item: copia
                });
                achados++;
              }
            }
        
            espelho = agora;
            if (achados) { podarLixeira(); }
            return achados;
          }
        
          function ligarLixeira() {
            if (typeof window.salvarDB !== 'function') { return; }
            if (window.salvarDB.__p123) { return; }
            var original = window.salvarDB;
            var novo = function () {
              try { recolherExcluidos(); } catch (e) {}
              var r = original.apply(this, arguments);
              try { espelho = retratoDasObras(); } catch (e2) {}
              try { atualizarBotaoLixeira(); } catch (e3) {}
              return r;
            };
            novo.__p123 = true;
            window.salvarDB = novo;
          }
        
          function achaObra(obraId) {
            var d = bd();
            if (!d || !d.obras) { return null; }
            for (var i = 0; i < d.obras.length; i++) {
              if (String(d.obras[i].id) === String(obraId)) { return d.obras[i]; }
            }
            return null;
          }
        
          function novoCodigo() {
            return Date.now() + Math.random();
          }
        
          function restaurar(registros) {
            var lista = listaLixeira();
            var voltaram = 0, semObra = 0;
            var manter = [];
        
            for (var i = 0; i < lista.length; i++) {
              var r = lista[i];
              if (!r || registros.indexOf(r.registro) < 0) { manter.push(r); continue; }
              var obra = achaObra(r.obraId);
              if (!obra) { semObra++; manter.push(r); continue; }
              obra.itens = obra.itens || [];
              var copia = r.item;
              var jaTem = obra.itens.some(function (it) {
                return it && String(it.id) === String(copia.id);
              });
              if (jaTem) { copia.id = novoCodigo(); }
              obra.itens.push(copia);
              voltaram++;
            }
        
            var d = bd();
            if (d) { d.lixeiraItens = manter; }
        
            if (voltaram) {
              espelho = retratoDasObras();   /* evita que o retorno vire nova exclusao */
              try { if (typeof salvarDB === 'function') { salvarDB(); } } catch (e) {}
            }
            return { voltaram: voltaram, semObra: semObra };
          }
        
          function apagarDeVez(registros) {
            var lista = listaLixeira();
            var manter = lista.filter(function (r) {
              return !r || registros.indexOf(r.registro) < 0;
            });
            var saiu = lista.length - manter.length;
            var d = bd();
            if (d) { d.lixeiraItens = manter; }
            if (saiu) {
              espelho = retratoDasObras();
              try { if (typeof salvarDB === 'function') { salvarDB(); } } catch (e) {}
            }
            return saiu;
          }
        
          /* ---------------------------------------------------------------- *
           * janela da lixeira
           * ---------------------------------------------------------------- */
        
          function textoDoItem(it) {
            if (!it) { return { ref: '-', tipo: '-', loc: '-', qtd: '-' }; }
            return {
              ref: it.ref || 'sem referencia',
              tipo: it.tipo || '',
              loc: it.loc || '',
              qtd: (it.qtd !== undefined ? it.qtd : (it.quantidade !== undefined ? it.quantidade : ''))
            };
          }
        
          function abrirLixeira() {
            podarLixeira();
            var lista = listaLixeira();
        
            var area = document.createElement('div');
        
            var cabeca = document.createElement('div');
            cabeca.className = 'p123-cabeca';
            var busca = document.createElement('input');
            busca.type = 'text';
            busca.placeholder = 'Filtrar por referencia, obra, local ou quem excluiu...';
            var btTodos = document.createElement('button');
            btTodos.type = 'button';
            btTodos.className = 'p123-cinza';
            btTodos.textContent = 'Marcar todos';
            cabeca.appendChild(busca);
            cabeca.appendChild(btTodos);
            area.appendChild(cabeca);
        
            var caixaTabela = document.createElement('div');
            area.appendChild(caixaTabela);
        
            function visiveis() {
              var termo = (busca.value || '').toLowerCase().trim();
              var r = lista.slice().reverse();   /* mais recente primeiro */
              if (!termo) { return r; }
              return r.filter(function (x) {
                var t = textoDoItem(x.item);
                var alvo = [t.ref, t.tipo, t.loc, x.obraNome, x.quem].join(' ').toLowerCase();
                return alvo.indexOf(termo) >= 0;
              });
            }
        
            function pintar() {
              var itens = visiveis();
              if (!itens.length) {
                caixaTabela.innerHTML = '';
                var vazio = document.createElement('div');
                vazio.className = 'p123-texto';
                vazio.style.marginTop = '12px';
                vazio.textContent = lista.length
                  ? 'Nada encontrado com esse filtro.'
                  : 'A lixeira esta vazia. Tudo que for excluido aparece aqui.';
                caixaTabela.appendChild(vazio);
                return;
              }
        
              var linhas = ['<table><thead><tr>'
                + '<th style="width:34px;"></th><th>Excluido em</th><th>Por quem</th>'
                + '<th>Obra</th><th>Referencia</th><th>Tipologia</th><th>Local</th><th>Qtd</th>'
                + '</tr></thead><tbody>'];
              for (var i = 0; i < itens.length; i++) {
                var x = itens[i];
                var t = textoDoItem(x.item);
                linhas.push('<tr><td><input type="checkbox" class="p123-cx" data-reg="'
                  + String(x.registro).replace(/"/g, '') + '"></td>'
                  + '<td>' + agoraTexto(x.quandoMs) + '</td>'
                  + '<td>' + (x.quem || '-') + '</td>'
                  + '<td>' + (x.obraNome || '-') + '</td>'
                  + '<td><b>' + t.ref + '</b></td>'
                  + '<td>' + t.tipo + '</td>'
                  + '<td>' + t.loc + '</td>'
                  + '<td>' + t.qtd + '</td></tr>');
              }
              linhas.push('</tbody></table>');
              caixaTabela.innerHTML = linhas.join('');
            }
        
            busca.addEventListener('input', pintar);
            btTodos.addEventListener('click', function () {
              var cx = caixaTabela.querySelectorAll('input.p123-cx');
              var ligar = false;
              for (var i = 0; i < cx.length; i++) { if (!cx[i].checked) { ligar = true; break; } }
              for (var j = 0; j < cx.length; j++) { cx[j].checked = ligar; }
            });
            pintar();
        
            function marcados() {
              var cx = caixaTabela.querySelectorAll('input.p123-cx:checked');
              var regs = [];
              for (var i = 0; i < cx.length; i++) { regs.push(cx[i].getAttribute('data-reg')); }
              return regs;
            }
        
            abrirJanela(
              'Lixeira de itens excluidos',
              [
                'Tudo que e excluido do painel fica guardado aqui por ' + DIAS_LIXEIRA
                  + ' dias, com a data e quem excluiu. Depois desse prazo a lista se limpa sozinha.',
                'Marque o que quer trazer de volta e clique em Restaurar.'
              ],
              [
                {
                  texto: 'Restaurar selecionados',
                  cor: 'p123-verde',
                  manterAberta: true,
                  acao: function (fechar) {
                    var regs = marcados();
                    if (!regs.length) { alert('Marque pelo menos um item para restaurar.'); return; }
                    if (!confirm('Trazer de volta ' + regs.length + ' item(ns) para a obra de origem?')) { return; }
                    var r = restaurar(regs);
                    fechar();
                    var msg = r.voltaram + ' item(ns) restaurado(s).';
                    if (r.semObra) {
                      msg += NL + r.semObra + ' item(ns) nao voltaram porque a obra de origem'
                        + ' nao existe mais (continuam guardados na lixeira).';
                    }
                    alert(msg);
                  }
                },
                {
                  texto: 'Apagar de vez',
                  cor: 'p123-vermelho',
                  dica: 'Tira da lixeira sem voltar para a obra. Isso nao tem desfazer.',
                  manterAberta: true,
                  acao: function (fechar) {
                    var regs = marcados();
                    if (!regs.length) { alert('Marque o que deseja apagar de vez.'); return; }
                    if (!confirm('Apagar de vez ' + regs.length + ' item(ns) da lixeira?'
                      + NL + 'Depois disso nao ha como recuperar.')) { return; }
                    var saiu = apagarDeVez(regs);
                    fechar();
                    alert(saiu + ' item(ns) apagado(s) de vez.');
                  }
                },
                { texto: 'Fechar', cor: 'p123-cinza' }
              ],
              area
            );
          }
        
          function atualizarBotaoLixeira() {
            var bt = document.getElementById('p123BtnLixeira');
            if (!bt) { return; }
            var n = listaLixeira().length;
            bt.textContent = n ? ('🗑️ Lixeira (' + n + ')') : '🗑️ Lixeira';
            bt.title = n
              ? (n + ' item(ns) excluido(s) guardado(s). Clique para restaurar.')
              : 'Nada excluido no momento. Aqui ficam os itens apagados.';
          }
        
          function garantirBotao() {
            if (document.getElementById('p123BtnLixeira')) { atualizarBotaoLixeira(); return; }
            var aba = document.getElementById('tab-itens');
            if (!aba) { return; }
            var cabecalho = aba.querySelector('.card-header');
            if (!cabecalho) { return; }
            var caixa = cabecalho.children.length > 1
              ? cabecalho.children[cabecalho.children.length - 1]
              : cabecalho;
        
            var bt = document.createElement('button');
            bt.id = 'p123BtnLixeira';
            bt.type = 'button';
            bt.className = 'btn-primary';
            bt.addEventListener('click', function (ev) { ev.preventDefault(); abrirLixeira(); });
            caixa.appendChild(bt);
            atualizarBotaoLixeira();
          }
        
          /* ---------------------------------------------------------------- *
           * 3) ligar tudo
           * ---------------------------------------------------------------- */
        
          function ligarCarregamento() {
            if (typeof window.carregarBancoDaNuvem !== 'function') { return; }
            if (window.carregarBancoDaNuvem.__p123) { return; }
            var original = window.carregarBancoDaNuvem;
            var novo = function () {
              var r = null;
              try { r = original.apply(this, arguments); } catch (e) { r = null; }
              var depois = function () {
                try { refazerEspelho(); } catch (e2) {}
                try { podarLixeira(); } catch (e3) {}
                try { atualizarBotaoLixeira(); } catch (e4) {}
                lerMarcaRemota().then(function (ms) { if (ms) { marcaConhecida = ms; } });
                esconderAviso();
              };
              if (r && typeof r.then === 'function') { r.then(depois, depois); }
              else { setTimeout(depois, 900); }
              return r;
            };
            novo.__p123 = true;
            window.carregarBancoDaNuvem = novo;
          }
        
          function comecar() {
            ligarConflito();
            ligarLixeira();
            ligarCarregamento();
            if (!pronto) { refazerEspelho(); }
            garantirBotao();
            if (!marcaConhecida) {
              lerMarcaRemota().then(function (ms) { if (ms) { marcaConhecida = ms; } });
            }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', comecar);
          } else {
            comecar();
          }
          setTimeout(comecar, 600);
          setTimeout(comecar, 2000);
          setTimeout(comecar, 4000);
          setInterval(garantirBotao, 5000);
          setInterval(vigiarNuvem, 30000);
        
          /* atalhos para uso manual, se precisar */
          window.p123AbrirLixeira = abrirLixeira;
          window.p123VerificarNuvem = vigiarNuvem;
          window.p123Estado = function () {
            return {
              versaoConhecida: marcaConhecida ? agoraTexto(marcaConhecida) : 'ainda nao lida',
              itensNaLixeira: listaLixeira().length
            };
          };
        })();
    
