
        /* PATCH 125 - GRAVACAO POR OBRA (juntando com a nuvem antes de gravar)
           Antes de enviar, o painel le o que esta na nuvem e monta o pacote final:
           as obras que VOCE mexeu vao com a sua versao, as outras vao com a versao
           que esta na nuvem naquele instante. Assim duas pessoas em obras
           diferentes nunca mais se atropelam. Se as duas mexeram na MESMA obra, ai
           sim ele para e pergunta, dizendo o nome da obra. */
        (function () {
          'use strict';
        
          if (window.__patch125PorObra) { return; }
          window.__patch125PorObra = true;
        
          var NL = String.fromCharCode(10);
          var TABELA = 'painel_dados';
          var LINHA = 1;
          var ESPERA = 700;           /* junta salvamentos seguidos, em ms */
          var MAX_LIXEIRA = 800;
          var CHAVE_OBRA = 'p125MinhaObra';
          var GLOBAIS = ['config', 'agendaObras', 'versaoBanco'];
        
          var base = {};              /* retrato por obra de quando eu carreguei */
          var baseGlobais = {};       /* retrato dos ajustes que nao sao de obra */
          var baseFeita = false;
          var apagadasPorMim = {};
          var fila = Promise.resolve();
          var pedido = null;
          var enviando = false;
          var marcaMinha = 0;         /* hora do ultimo envio que saiu daqui */
          var marcaVista = 0;         /* ultima hora de gravacao que eu ja conheco */
          var conflitoAberto = false;
        
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
        
          function copiaLimpa(objeto) {
            try { return JSON.parse(JSON.stringify(objeto)); } catch (e) { return null; }
          }
        
          function texto(objeto) {
            try { return JSON.stringify(objeto); } catch (e) { return ''; }
          }
        
          function nomeObra(obra) {
            if (!obra) { return 'obra'; }
            return obra.nome || ('obra ' + obra.id);
          }
        
          function status(msg, tipo) {
            try {
              if (typeof window.atualizarStatusNuvem === 'function') {
                window.atualizarStatusNuvem(msg, tipo || 'ok');
              }
            } catch (e) {}
          }
        
          function recado(msg, tipo) {
            try {
              if (typeof window.mostrarToastPainel === 'function') {
                window.mostrarToastPainel(msg, tipo || 'ok');
                return;
              }
            } catch (e) {}
            try { console.log('[patch125] ' + msg); } catch (e2) {}
          }
        
          function baixarArquivo(nome, objeto) {
            try {
              var url = URL.createObjectURL(new Blob([JSON.stringify(objeto, null, 2)],
                { type: 'application/json' }));
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
        
          function horaTexto(ms) {
            if (!ms) { return ''; }
            var d = new Date(ms);
            function dd(n) { return (n < 10 ? '0' : '') + n; }
            return dd(d.getHours()) + ':' + dd(d.getMinutes());
          }
        
          function porObra(banco2) {
            var mapa = {};
            if (!banco2 || !banco2.obras) { return mapa; }
            for (var i = 0; i < banco2.obras.length; i++) {
              var o = banco2.obras[i];
              if (o && o.id !== undefined) { mapa[String(o.id)] = o; }
            }
            return mapa;
          }
        
          /* ---------------------------------------------------------------- *
           * retrato do que eu conheco (para saber no que EU mexi)
           * ---------------------------------------------------------------- */
        
          function fazerBase() {
            var d = bd();
            base = {};
            baseGlobais = {};
            apagadasPorMim = {};
            if (!d) { baseFeita = false; return; }
            var mapa = porObra(d);
            var id;
            for (id in mapa) {
              if (mapa.hasOwnProperty(id)) { base[id] = texto(mapa[id]); }
            }
            for (var i = 0; i < GLOBAIS.length; i++) {
              baseGlobais[GLOBAIS[i]] = texto(d[GLOBAIS[i]]);
            }
            baseFeita = true;
          }
        
          /* obras que mudaram aqui desde a ultima vez que sincronizei */
          function minhasMudancas() {
            var d = bd();
            var lista = { mexidas: {}, novas: {}, apagadas: {}, globais: [] };
            if (!d) { return lista; }
            var mapa = porObra(d);
            var id;
            for (id in mapa) {
              if (!mapa.hasOwnProperty(id)) { continue; }
              var agora = texto(mapa[id]);
              if (!base.hasOwnProperty(id)) { lista.novas[id] = true; }
              else if (base[id] !== agora) { lista.mexidas[id] = true; }
            }
            for (id in base) {
              if (base.hasOwnProperty(id) && !mapa[id]) { lista.apagadas[id] = true; }
            }
            for (id in apagadasPorMim) {
              if (apagadasPorMim.hasOwnProperty(id)) { lista.apagadas[id] = true; }
            }
            for (var i = 0; i < GLOBAIS.length; i++) {
              var nome = GLOBAIS[i];
              if (texto(d[nome]) !== baseGlobais[nome]) { lista.globais.push(nome); }
            }
            return lista;
          }
        
          /* ---------------------------------------------------------------- *
           * conversa com a nuvem
           * ---------------------------------------------------------------- */
        
          function lerDaNuvem() {
            var b = banco();
            if (!b) { return Promise.resolve({ ok: false, motivo: 'sem nuvem' }); }
            return b.from(TABELA).select('dados, updated_at').eq('id', LINHA).single()
              .then(function (r) {
                if (!r || r.error) { return { ok: false, motivo: 'nao respondeu' }; }
                if (!r.data) { return { ok: true, banco: null, marca: 0 }; }
                var pacote = r.data.dados;
                var banco2 = null;
                if (pacote) { banco2 = pacote.db ? pacote.db : pacote; }
                var ms = r.data.updated_at ? Date.parse(r.data.updated_at) : 0;
                return { ok: true, banco: banco2, marca: isNaN(ms) ? 0 : ms };
              })
              .catch(function () { return { ok: false, motivo: 'nao respondeu' }; });
          }
        
          function gravarNaNuvem(banco2) {
            var b = banco();
            if (!b) { return Promise.resolve({ ok: false }); }
            return b.from(TABELA).upsert({
              id: LINHA,
              dados: banco2,
              updated_at: new Date().toISOString()
            }).then(function (r) {
              return { ok: !(r && r.error) };
            }).catch(function () { return { ok: false }; });
          }
        
          /* ---------------------------------------------------------------- *
           * a juncao: cada obra vai com a versao de quem mexeu nela
           * ---------------------------------------------------------------- */
        
          function juntarLixeira(minha, daNuvem) {
            var junta = [];
            var vistos = {};
            var todos = (minha || []).concat(daNuvem || []);
            for (var i = 0; i < todos.length; i++) {
              var r = todos[i];
              if (!r) { continue; }
              var chave = r.registro || (String(r.quandoMs) + '_' + String(r.obraId));
              if (vistos[chave]) { continue; }
              vistos[chave] = true;
              junta.push(r);
            }
            junta.sort(function (a, b) { return (a.quandoMs || 0) - (b.quandoMs || 0); });
            if (junta.length > MAX_LIXEIRA) { junta = junta.slice(junta.length - MAX_LIXEIRA); }
            return junta;
          }
        
          /* devolve o pacote pronto para gravar e a lista de choques de verdade */
          function juntar(bancoNuvem, escolhas) {
            var d = bd();
            var mudancas = minhasMudancas();
            var meu = porObra(d);
            var nuvem = porObra(bancoNuvem);
            var final = copiaLimpa(d) || { obras: [] };
            var obras = [];
            var choques = [];
            var enviadas = [];
            var id;
        
            /* 1) obras que existem aqui */
            for (id in meu) {
              if (!meu.hasOwnProperty(id)) { continue; }
              var euMexi = !!(mudancas.mexidas[id] || mudancas.novas[id]);
              var naNuvem = nuvem[id];
        
              if (!euMexi) {
                /* nao mexi: fica valendo o que esta na nuvem */
                if (naNuvem) { obras.push(copiaLimpa(naNuvem)); }
                /* se sumiu da nuvem, foi outra pessoa que apagou: respeito */
                continue;
              }
        
              if (!naNuvem) {
                /* obra nova aqui, ou apagada por outro enquanto eu editava:
                   em duvida, a minha versao entra (nada se perde) */
                obras.push(copiaLimpa(meu[id]));
                enviadas.push(nomeObra(meu[id]));
                continue;
              }
        
              var eraAssim = base.hasOwnProperty(id) ? base[id] : null;
              var mudouLaTambem = eraAssim !== null && texto(naNuvem) !== eraAssim;
        
              if (!mudouLaTambem) {
                obras.push(copiaLimpa(meu[id]));
                enviadas.push(nomeObra(meu[id]));
                continue;
              }
        
              /* choque de verdade: os dois mexeram na MESMA obra */
              var decidido = escolhas ? escolhas[id] : null;
              if (decidido === 'minha') {
                obras.push(copiaLimpa(meu[id]));
                enviadas.push(nomeObra(meu[id]));
              } else if (decidido === 'nuvem') {
                obras.push(copiaLimpa(naNuvem));
              } else {
                choques.push({
                  id: id,
                  nome: nomeObra(meu[id]),
                  minhaObra: meu[id],
                  obraDaNuvem: naNuvem,
                  itensMeus: (meu[id].itens || []).length,
                  itensNuvem: (naNuvem.itens || []).length
                });
                obras.push(copiaLimpa(naNuvem));  /* provisorio, so se o envio seguir */
              }
            }
        
            /* 2) obras que so existem na nuvem */
            for (id in nuvem) {
              if (!nuvem.hasOwnProperty(id)) { continue; }
              if (meu[id]) { continue; }
              if (mudancas.apagadas[id]) { continue; }   /* fui eu que apaguei */
              obras.push(copiaLimpa(nuvem[id]));          /* obra criada por outro */
            }
        
            final.obras = obras;
        
            /* 3) ajustes que nao pertencem a obra nenhuma */
            for (var i = 0; i < GLOBAIS.length; i++) {
              var nome = GLOBAIS[i];
              var euMudei = mudancas.globais.indexOf(nome) >= 0;
              if (!euMudei && bancoNuvem && bancoNuvem[nome] !== undefined) {
                final[nome] = copiaLimpa(bancoNuvem[nome]);
              }
            }
        
            /* 4) a obra que cada um esta olhando fica no proprio navegador */
            if (bancoNuvem && bancoNuvem.obraAtualId !== undefined) {
              final.obraAtualId = bancoNuvem.obraAtualId;
            }
        
            /* 5) lixeira do patch 123: soma as duas, sem apagar registro de ninguem */
            if ((d && d.lixeiraItens) || (bancoNuvem && bancoNuvem.lixeiraItens)) {
              final.lixeiraItens = juntarLixeira(d ? d.lixeiraItens : [],
                bancoNuvem ? bancoNuvem.lixeiraItens : []);
            }
        
            final.ultimaEdicao = { quem: quemSou(), quando: new Date().toISOString() };
        
            return { pacote: final, choques: choques, enviadas: enviadas, mudancas: mudancas };
          }
        
          /* ---------------------------------------------------------------- *
           * aplicar na tela o que veio da nuvem (sem mexer no que EU editei)
           * ---------------------------------------------------------------- */
        
          function aplicarDaNuvem(pacote, mudancas) {
            var d = bd();
            if (!d || !pacote) { return 0; }
            var meu = porObra(d);
            var vindo = porObra(pacote);
            var trocas = 0;
            var id;
        
            for (id in vindo) {
              if (!vindo.hasOwnProperty(id)) { continue; }
              if (mudancas.mexidas[id] || mudancas.novas[id]) { continue; }  /* minha, nao toco */
              if (!meu[id]) {
                d.obras.push(copiaLimpa(vindo[id]));
                trocas++;
                continue;
              }
              if (texto(meu[id]) !== texto(vindo[id])) {
                for (var i = 0; i < d.obras.length; i++) {
                  if (String(d.obras[i].id) === String(id)) {
                    d.obras[i] = copiaLimpa(vindo[id]);
                    trocas++;
                    break;
                  }
                }
              }
            }
        
            /* obra que outra pessoa apagou sai daqui tambem */
            var sobra = [];
            for (var j = 0; j < d.obras.length; j++) {
              var oid = String(d.obras[j].id);
              var minha = mudancas.mexidas[oid] || mudancas.novas[oid];
              if (!vindo[oid] && !minha) { trocas++; continue; }
              sobra.push(d.obras[j]);
            }
            if (sobra.length !== d.obras.length) { d.obras = sobra; }
        
            if (pacote.lixeiraItens) { d.lixeiraItens = copiaLimpa(pacote.lixeiraItens); }
            for (var k = 0; k < GLOBAIS.length; k++) {
              var nome = GLOBAIS[k];
              if (mudancas.globais.indexOf(nome) >= 0) { continue; }
              if (pacote[nome] !== undefined) { d[nome] = copiaLimpa(pacote[nome]); }
            }
            return trocas;
          }
        
          function guardarBaseDoPacote(pacote) {
            base = {};
            baseGlobais = {};
            var mapa = porObra(pacote);
            var id;
            for (id in mapa) {
              if (mapa.hasOwnProperty(id)) { base[id] = texto(mapa[id]); }
            }
            for (var i = 0; i < GLOBAIS.length; i++) {
              baseGlobais[GLOBAIS[i]] = texto(pacote[GLOBAIS[i]]);
            }
            baseFeita = true;
          }
        
          function redesenhar() {
            try { if (typeof window.popularSelectObras === 'function') { window.popularSelectObras(); } } catch (e) {}
            try { if (typeof window.render === 'function') { window.render(); return; } } catch (e2) {}
            try { if (typeof window.renderTabelaPrincipal === 'function') { window.renderTabelaPrincipal(); } } catch (e3) {}
          }
        
          function guardarLocal() {
            try { if (typeof window.salvarLocalComoBackup === 'function') { window.salvarLocalComoBackup(); } } catch (e) {}
          }
        
          /* ---------------------------------------------------------------- *
           * o envio
           * ---------------------------------------------------------------- */
        
          var escolhas = {};        /* decisoes tomadas na janela de choque */
          var tentativas = 0;
        
          function pedirEnvio() {
            if (pedido) { clearTimeout(pedido); }
            pedido = setTimeout(function () {
              pedido = null;
              fila = fila.then(passoDeEnvio).catch(function () { return null; });
            }, ESPERA);
            return fila;
          }
        
          function passoDeEnvio() {
            if (conflitoAberto) {
              status('⚠️ Aguardando sua decisao', 'erro');
              return Promise.resolve(null);
            }
            var d = bd();
            if (!d) { return Promise.resolve(null); }
            if (!baseFeita) { fazerBase(); }
        
            enviando = true;
            status('☁️ Salvando...', 'normal');
        
            return lerDaNuvem().then(function (r) {
              if (!r.ok) {
                enviando = false;
                status('⚠️ Nuvem nao respondeu - nada foi enviado', 'erro');
                if (tentativas < 2) {
                  tentativas++;
                  setTimeout(pedirEnvio, 20000);
                }
                return null;
              }
              tentativas = 0;
              var j = juntar(r.banco, escolhas);
        
              if (j.choques.length) {
                enviando = false;
                status('⚠️ Mesma obra alterada por outra pessoa', 'erro');
                abrirChoque(j.choques);
                return null;
              }
        
              return gravarNaNuvem(j.pacote).then(function (res) {
                enviando = false;
                if (!res.ok) {
                  status('⚠️ Erro de salvamento - seus dados seguem aqui', 'erro');
                  if (tentativas < 2) { tentativas++; setTimeout(pedirEnvio, 20000); }
                  return null;
                }
                escolhas = {};
                apagadasPorMim = {};
                marcaMinha = Date.now();
                marcaVista = marcaMinha;
                var trocas = aplicarDaNuvem(j.pacote, j.mudancas);
                guardarBaseDoPacote(j.pacote);
                guardarLocal();
                if (trocas) { redesenhar(); }
                if (j.enviadas.length === 1) {
                  status('⚡ Salvo: ' + j.enviadas[0], 'ok');
                } else if (j.enviadas.length > 1) {
                  status('⚡ Salvo: ' + j.enviadas.length + ' obras', 'ok');
                } else {
                  status('⚡ Nuvem em dia', 'ok');
                }
                return true;
              });
            }).catch(function () {
              enviando = false;
              status('⚠️ Supabase indisponivel', 'erro');
              return null;
            });
          }
        
          /* ---------------------------------------------------------------- *
           * janela de choque: as duas pessoas mexeram na MESMA obra
           * ---------------------------------------------------------------- */
        
          function janela(titulo, corpo, botoes) {
            var fundo = document.createElement('div');
            fundo.className = 'p125-fundo';
            var caixa = document.createElement('div');
            caixa.className = 'p125-janela';
        
            var h = document.createElement('div');
            h.className = 'p125-titulo';
            h.textContent = titulo;
            caixa.appendChild(h);
        
            var meio = document.createElement('div');
            meio.className = 'p125-texto';
            if (typeof corpo === 'string') { meio.textContent = corpo; }
            else if (corpo) { meio.appendChild(corpo); }
            caixa.appendChild(meio);
        
            var pe = document.createElement('div');
            pe.className = 'p125-acoes';
            caixa.appendChild(pe);
        
            function fechar() {
              document.removeEventListener('keydown', aoTeclar);
              if (fundo.parentNode) { fundo.parentNode.removeChild(fundo); }
            }
            function aoTeclar(ev) { if (ev.key === 'Escape') { fechar(); } }
        
            (botoes || []).forEach(function (cfg) {
              var bt = document.createElement('button');
              bt.type = 'button';
              bt.className = cfg.cor || 'p125-cinza';
              bt.textContent = cfg.texto;
              bt.addEventListener('click', function (ev) {
                ev.preventDefault();
                if (cfg.fecha !== false) { fechar(); }
                if (cfg.acao) { cfg.acao(fechar); }
              });
              pe.appendChild(bt);
            });
        
            document.addEventListener('keydown', aoTeclar);
            fundo.appendChild(caixa);
            document.body.appendChild(fundo);
            return { fundo: fundo, corpo: meio, fechar: fechar };
          }
        
          function botao(texto2, cor, acao) {
            var bt = document.createElement('button');
            bt.type = 'button';
            bt.className = 'p125-bt ' + cor;
            bt.textContent = texto2;
            bt.style.marginRight = '6px';
            bt.addEventListener('click', function (ev) { ev.preventDefault(); acao(bt); });
            return bt;
          }
        
          function abrirChoque(choques) {
            if (conflitoAberto) { return; }
            conflitoAberto = true;
        
            var decisao = {};
            var caixa = document.createElement('div');
        
            var txt = document.createElement('div');
            txt.className = 'p125-texto';
            txt.textContent = 'Outra pessoa mexeu na mesma obra que voce, depois que esta tela carregou. '
              + 'As outras obras ja estao a salvo: elas serao gravadas com a versao mais nova de cada uma. '
              + 'Escolha o que fazer com a(s) obra(s) abaixo.';
            caixa.appendChild(txt);
        
            var alerta = document.createElement('div');
            alerta.className = 'p125-aviso-caixa';
            alerta.textContent = 'Antes de gravar, o painel baixa no seu computador um arquivo com as duas versoes, para nada se perder.';
            caixa.appendChild(alerta);
        
            var tabela = document.createElement('table');
            var thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>Obra</th><th>Sua tela</th><th>Na nuvem</th><th>Qual vale</th></tr>';
            tabela.appendChild(thead);
            var tbody = document.createElement('tbody');
        
            choques.forEach(function (c) {
              var tr = document.createElement('tr');
              var t1 = document.createElement('td');
              t1.textContent = c.nome;
              var t2 = document.createElement('td');
              t2.textContent = c.itensMeus + ' itens';
              var t3 = document.createElement('td');
              t3.textContent = c.itensNuvem + ' itens';
              var t4 = document.createElement('td');
        
              var btMinha = botao('A minha', 'p125-azul', function (b) {
                decisao[c.id] = 'minha';
                b.classList.add('p125-escolhido');
                if (btNuvem) { btNuvem.classList.remove('p125-escolhido'); }
              });
              var btNuvem = botao('A da nuvem', 'p125-cinza', function (b) {
                decisao[c.id] = 'nuvem';
                b.classList.add('p125-escolhido');
                btMinha.classList.remove('p125-escolhido');
              });
              t4.appendChild(btMinha);
              t4.appendChild(btNuvem);
              t4.appendChild(botao('Ver a diferenca', 'p125-cinza', function () { verDiferenca(c); }));
        
              tr.appendChild(t1); tr.appendChild(t2); tr.appendChild(t3); tr.appendChild(t4);
              tbody.appendChild(tr);
            });
            tabela.appendChild(tbody);
            caixa.appendChild(tabela);
        
            janela('⚠️ A mesma obra foi alterada em dois lugares', caixa, [
              {
                texto: '✅ Gravar do jeito que eu escolhi', cor: 'p125-verde',
                acao: function () {
                  choques.forEach(function (c) {
                    escolhas[c.id] = decisao[c.id] || 'nuvem';
                    guardarAsDuas(c);
                  });
                  conflitoAberto = false;
                  pedirEnvio();
                }
              },
              {
                texto: '💾 Ficar com a minha em todas', cor: 'p125-azul',
                acao: function () {
                  choques.forEach(function (c) { escolhas[c.id] = 'minha'; guardarAsDuas(c); });
                  conflitoAberto = false;
                  pedirEnvio();
                }
              },
              {
                texto: '☁️ Trazer a da nuvem em todas', cor: 'p125-laranja',
                acao: function () {
                  choques.forEach(function (c) { escolhas[c.id] = 'nuvem'; guardarAsDuas(c); });
                  conflitoAberto = false;
                  pedirEnvio();
                }
              },
              {
                texto: 'Decidir depois', cor: 'p125-cinza',
                acao: function () {
                  conflitoAberto = false;
                  mostrarAviso('Sua alteracao ainda nao foi enviada: a obra mudou em dois lugares.',
                    'Resolver agora', function () { pedirEnvio(); });
                }
              }
            ]);
          }
        
          /* guarda as duas versoes da obra num arquivo, antes de qualquer decisao */
          function guardarAsDuas(c) {
            baixarArquivo('obra_em_conflito_' + c.id + '.json', {
              obra: c.nome,
              quando: new Date().toISOString(),
              minhaVersao: c.minhaObra,
              versaoDaNuvem: c.obraDaNuvem
            });
          }
        
          function contarItens(obra) { return (obra && obra.itens ? obra.itens.length : 0); }
        
          function verDiferenca(c) {
            var meus = {};
            var deles = {};
            (c.minhaObra.itens || []).forEach(function (i) { if (i) { meus[String(i.id)] = i; } });
            (c.obraDaNuvem.itens || []).forEach(function (i) { if (i) { deles[String(i.id)] = i; } });
            var soMeus = 0, soDeles = 0, diferentes = 0;
            var id;
            for (id in meus) {
              if (!meus.hasOwnProperty(id)) { continue; }
              if (!deles[id]) { soMeus++; }
              else if (texto(meus[id]) !== texto(deles[id])) { diferentes++; }
            }
            for (id in deles) {
              if (deles.hasOwnProperty(id) && !meus[id]) { soDeles++; }
            }
            var linhas = 'Obra: ' + c.nome + NL
              + 'Itens so na sua tela: ' + soMeus + NL
              + 'Itens so na nuvem: ' + soDeles + NL
              + 'Itens que existem nos dois mas com dados diferentes: ' + diferentes + NL
              + 'Total na sua tela: ' + contarItens(c.minhaObra) + '   |   na nuvem: ' + contarItens(c.obraDaNuvem);
            janela('Diferenca em ' + c.nome, linhas, [{ texto: 'Fechar', cor: 'p125-cinza' }]);
          }
        
          /* ---------------------------------------------------------------- *
           * tarja de aviso e vigia da nuvem
           * ---------------------------------------------------------------- */
        
          function tarja() {
            var el = document.getElementById('p125Aviso');
            if (el) { return el; }
            el = document.createElement('div');
            el.id = 'p125Aviso';
            var t = document.createElement('span');
            t.id = 'p125AvisoTexto';
            el.appendChild(t);
            document.body.appendChild(el);
            return el;
          }
        
          function mostrarAviso(msg, textoBotao, acao) {
            var el = tarja();
            el.innerHTML = '';
            var t = document.createElement('span');
            t.textContent = msg;
            el.appendChild(t);
            if (textoBotao) {
              var bt = document.createElement('button');
              bt.type = 'button';
              bt.textContent = textoBotao;
              bt.addEventListener('click', function () { esconderAviso(); if (acao) { acao(); } });
              el.appendChild(bt);
            }
            var fechar = document.createElement('button');
            fechar.type = 'button';
            fechar.className = 'p125-fraco';
            fechar.textContent = 'Fechar';
            fechar.addEventListener('click', esconderAviso);
            el.appendChild(fechar);
            el.classList.add('p125-on');
          }
        
          function esconderAviso() {
            var el = document.getElementById('p125Aviso');
            if (el) { el.classList.remove('p125-on'); }
          }
        
          function vigiar() {
            if (enviando || conflitoAberto) { return; }
            var d = bd();
            if (!d || !baseFeita) { return; }
            lerDaNuvem().then(function (r) {
              if (!r.ok || !r.banco) { return; }
              if (!marcaVista) { marcaVista = r.marca; return; }
              if (r.marca <= (marcaVista + 3000)) { return; }
              if ((Date.now() - marcaMinha) < 12000) { marcaVista = r.marca; return; }
        
              var mudancas = minhasMudancas();
              var vindo = porObra(r.banco);
              var meu = porObra(d);
              var atualizadas = [];
              var batendo = [];
              var id;
        
              for (id in vindo) {
                if (!vindo.hasOwnProperty(id)) { continue; }
                var euMexi = !!(mudancas.mexidas[id] || mudancas.novas[id]);
                var igualAoMeu = meu[id] && texto(meu[id]) === texto(vindo[id]);
                if (igualAoMeu) { continue; }
                if (euMexi) {
                  var eraAssim = base.hasOwnProperty(id) ? base[id] : null;
                  if (eraAssim !== null && texto(vindo[id]) !== eraAssim) {
                    batendo.push(nomeObra(vindo[id]));
                  }
                } else {
                  atualizadas.push(nomeObra(vindo[id]));
                }
              }
        
              marcaVista = r.marca;
        
              if (atualizadas.length) {
                var trocas = aplicarDaNuvem(r.banco, mudancas);
                for (id in vindo) {
                  if (!vindo.hasOwnProperty(id)) { continue; }
                  if (mudancas.mexidas[id] || mudancas.novas[id]) { continue; }
                  base[id] = texto(vindo[id]);
                }
                guardarLocal();
                if (trocas) { redesenhar(); }
              }
        
              var quem = (r.banco.ultimaEdicao && r.banco.ultimaEdicao.quem) ? r.banco.ultimaEdicao.quem : 'outra pessoa';
              if (batendo.length) {
                mostrarAviso(quem + ' alterou ' + batendo.join(', ') + ', que voce tambem esta editando.',
                  'Resolver agora', function () { pedirEnvio(); });
              } else if (atualizadas.length) {
                mostrarAviso(quem + ' lancou alteracoes em ' + atualizadas.join(', ')
                  + ' - sua tela ja foi atualizada (' + horaTexto(r.marca) + ').', null, null);
                setTimeout(esconderAviso, 12000);
              }
            });
          }
        
          /* ---------------------------------------------------------------- *
           * a obra escolhida fica neste navegador, nao viaja para a nuvem
           * ---------------------------------------------------------------- */
        
          function guardarMinhaObra() {
            var d = bd();
            if (!d || d.obraAtualId === undefined) { return; }
            try {
              if (window.localStorage) { localStorage.setItem(CHAVE_OBRA, String(d.obraAtualId)); }
            } catch (e) {}
          }
        
          function voltarParaMinhaObra() {
            var d = bd();
            if (!d || !d.obras || !d.obras.length) { return; }
            var guardada = null;
            try { if (window.localStorage) { guardada = localStorage.getItem(CHAVE_OBRA); } } catch (e) {}
            if (!guardada) { return; }
            var existe = false;
            for (var i = 0; i < d.obras.length; i++) {
              if (String(d.obras[i].id) === String(guardada)) { existe = true; break; }
            }
            if (!existe) { return; }
            if (String(d.obraAtualId) === String(guardada)) { return; }
            d.obraAtualId = guardada;
            redesenhar();
          }
        
          /* ---------------------------------------------------------------- *
           * ligar tudo
           * ---------------------------------------------------------------- */
        
          function instalarEnvio() {
            var atual = window.sincronizarBancoNuvem;
            if (atual && atual.__p125) { return; }
            var meu = function () { return pedirEnvio(); };
            meu.__p125 = true;
            /* avisa o patch 123 que a conferencia agora e feita aqui, por obra,
               para nao ficarem duas travas em cima do mesmo envio */
            meu.__p123 = true;
            window.sincronizarBancoNuvem = meu;
            try { sincronizarBancoNuvem = meu; } catch (e) {}
          }
        
          function ligarCarregamento() {
            if (typeof window.carregarBancoDaNuvem !== 'function') { return; }
            if (window.carregarBancoDaNuvem.__p125) { return; }
            var original = window.carregarBancoDaNuvem;
            var novo = function () {
              var r = null;
              try { r = original.apply(this, arguments); } catch (e) { r = null; }
              var depois = function () {
                fazerBase();
                voltarParaMinhaObra();
                lerDaNuvem().then(function (res) { if (res.ok) { marcaVista = res.marca; } });
              };
              if (r && typeof r.then === 'function') { r.then(depois, depois); }
              else { setTimeout(depois, 900); }
              return r;
            };
            novo.__p125 = true;
            window.carregarBancoDaNuvem = novo;
            try { carregarBancoDaNuvem = novo; } catch (e2) {}
          }
        
          function comecar() {
            instalarEnvio();
            ligarCarregamento();
            if (!baseFeita) { fazerBase(); }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', comecar);
          } else {
            comecar();
          }
          setTimeout(comecar, 600);
          setTimeout(comecar, 2500);
          setTimeout(function () {
            /* nunca refazer o retrato depois de comecar: senao o painel esquece o
               que voce ja alterou e mandaria a versao da nuvem por cima */
            if (!baseFeita) { fazerBase(); }
            lerDaNuvem().then(function (r) { if (r.ok) { marcaVista = r.marca; } });
          }, 5000);
          setInterval(instalarEnvio, 5000);
          setInterval(guardarMinhaObra, 4000);
          setInterval(vigiar, 20000);
        
          /* atalhos para uso manual */
          window.p125Enviar = function () { return pedirEnvio(); };
          window.p125Vigiar = vigiar;
          window.p125Estado = function () {
            var m = minhasMudancas();
            function contar(o) { var n = 0, k; for (k in o) { if (o.hasOwnProperty(k)) { n++; } } return n; }
            return {
              obrasQueEuMexi: contar(m.mexidas),
              obrasNovasAqui: contar(m.novas),
              obrasApagadasAqui: contar(m.apagadas),
              ajustesGerais: m.globais,
              ultimaGravacaoConhecida: marcaVista ? horaTexto(marcaVista) : 'ainda nao lida',
              esperandoDecisao: conflitoAberto
            };
          };
        })();
    
