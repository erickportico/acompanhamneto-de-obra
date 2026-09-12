
        /* PATCH 126 - tabela sem pisca: redesenha so a linha alterada, junta pedidos
           de redesenho, guarda o foco e a rolagem, e traz cronometro (p126Tempos) e
           conferencia de codigos repetidos (p126Codigos). Nao altera calculo nenhum. */
        (function () {
          'use strict';
          if (window.__p126Ativo) { return; }
          window.__p126Ativo = true;
        
          var ESPERA_RENDER = 300;       /* pedidos de redesenho que chegam juntos viram um */
          var ESPERA_GRAVA = 800;        /* rajada de gravacoes locais vira uma */
          var ESPERA_DEPENDENTES = 900;  /* outras abas se atualizam depois da pausa */
          var M2 = ' m' + String.fromCharCode(178);
        
          var tempos = {
            linha: { n: 0, total: 0, ultimo: 0 },
            tabela: { n: 0, total: 0, ultimo: 0 },
            tela: { n: 0, total: 0, ultimo: 0 },
            gravacao: { n: 0, total: 0, ultimo: 0 },
            juntados: 0
          };
        
          function agora() {
            try { return performance.now(); } catch (e) { return Date.now(); }
          }
          function medir(alvo, inicio) {
            var ms = agora() - inicio;
            alvo.n++; alvo.total += ms; alvo.ultimo = ms;
            return ms;
          }
          function banco() {
            try { if (typeof db !== 'undefined' && db) { return db; } } catch (e) {}
            return window.db || null;
          }
          function obraAgora() {
            try {
              if (typeof window.getObraAtual === 'function') { return window.getObraAtual(); }
            } catch (e) {}
            return null;
          }
          function config() {
            var b = banco();
            if (b && b.config) { return b.config; }
            return { dimensoes: true, fem: true, fab: true, inst: true };
          }
          function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
        
          /* ------------------------------------------------------------------ *
           * achar a linha do item na tabela e o campo de cada caixinha
           * ------------------------------------------------------------------ */
          var ABRE = 'editarItem(';
          var APOSTROFO = String.fromCharCode(39);
          var ASPAS = String.fromCharCode(34);
          var ASPAS = String.fromCharCode(34);
        
          function idDoTexto(texto) {
            var p = (texto || '').indexOf(ABRE);
            if (p < 0) { return null; }
            var resto = texto.slice(p + ABRE.length);
            var v = resto.indexOf(',');
            if (v < 0) { return null; }
            var bruto = resto.slice(0, v).trim();
            if (bruto.charAt(0) === APOSTROFO || bruto.charAt(0) === ASPAS) { bruto = bruto.slice(1, -1); }
            return bruto;
          }
          function campoDoTexto(texto) {
            var p = (texto || '').indexOf(ABRE);
            if (p < 0) { return ''; }
            var resto = texto.slice(p + ABRE.length);
            var v = resto.indexOf(',');
            if (v < 0) { return ''; }
            var dois = resto.slice(v + 1);
            var a = dois.indexOf(APOSTROFO);
            if (a < 0) { return ''; }
            var b = dois.indexOf(APOSTROFO, a + 1);
            if (b < 0) { return ''; }
            return dois.slice(a + 1, b);
          }
          function campoDoCampo(el) {
            if (!el || !el.getAttribute) { return ''; }
            return campoDoTexto(el.getAttribute('onchange') || '');
          }
          function idDaLinha(tr) {
            if (!tr || !tr.querySelectorAll) { return null; }
            if (tr.__p126id !== undefined) { return tr.__p126id; }
            var achado = null;
            var campos = tr.querySelectorAll('[onchange]');
            for (var i = 0; i < campos.length; i++) {
              achado = idDoTexto(campos[i].getAttribute('onchange') || '');
              if (achado) { break; }
            }
            tr.__p126id = achado;
            return achado;
          }
          function acharLinha(id) {
            var corpo = document.getElementById('tbodyItens');
            if (!corpo) { return null; }
            var linhas = corpo.querySelectorAll('tr');
            var alvo = String(id);
            for (var i = 0; i < linhas.length; i++) {
              if (String(idDaLinha(linhas[i])) === alvo) { return linhas[i]; }
            }
            return null;
          }
        
          /* nomes das caixinhas calculadas, na mesma ordem em que a tabela as monta */
          function nomesCalculados() {
            var c = config();
            var nomes = ['area'];
            if (c.fem) { nomes.push('femSaldo'); nomes.push('femPct'); }
            if (c.fab) { nomes.push('fabSaldo'); nomes.push('fabPct'); }
            if (c.inst) { nomes.push('instArea'); nomes.push('instSaldo'); nomes.push('instPct'); }
            return nomes;
          }
          function escrever(caixa, valor, negrito) {
            if (!caixa) { return; }
            if (negrito) {
              var forte = caixa.querySelector('b');
              if (!forte) { caixa.textContent = ''; forte = document.createElement('b'); caixa.appendChild(forte); }
              if (forte.textContent !== valor) { forte.textContent = valor; }
              return;
            }
            if (caixa.textContent !== valor) { caixa.textContent = valor; }
          }
        
          /* campos numericos que podem ser reescritos sem atrapalhar quem digita */
          var NUMERICOS = { qtd: 1, larg: 1, alt: 1, fem: 1, fabricado: 1, instalado: 1 };
        
          function sincronizarCampos(tr, item) {
            var campos = tr.querySelectorAll('input[onchange]');
            for (var i = 0; i < campos.length; i++) {
              var el = campos[i];
              if (el === document.activeElement) { continue; }
              var campo = campoDoCampo(el);
              if (!campo || !NUMERICOS[campo]) { continue; }
              var valor;
              if (campo === 'qtd') { valor = num(item.qtd || item.quantidade || 1); }
              else if (campo === 'larg') { valor = num(item.larg || item.largura); }
              else if (campo === 'alt') { valor = num(item.alt || item.altura); }
              else { valor = num(item[campo]); }
              if (String(el.value) !== String(valor)) { el.value = valor; }
            }
          }
        
          /* ------------------------------------------------------------------ *
           * redesenhar SO uma linha (mesmas contas da tabela original)
           * ------------------------------------------------------------------ */
          function atualizarLinha(id) {
            var inicio = agora();
            var obra = obraAgora();
            if (!obra || !obra.itens) { return false; }
            var item = null;
            for (var i = 0; i < obra.itens.length; i++) {
              if (obra.itens[i] && String(obra.itens[i].id) === String(id)) { item = obra.itens[i]; break; }
            }
            if (!item) { return false; }
            var tr = acharLinha(id);
            if (!tr) { return false; }
        
            var caixas = tr.querySelectorAll('td > div.td-content');
            var nomes = nomesCalculados();
            if (caixas.length !== nomes.length) { return false; }
        
            var larg = num(item.larg || item.largura);
            var alt = num(item.alt || item.altura);
            var qtd = num(item.qtd || item.quantidade || 1);
            var areaUnit = larg * alt;
            var areaTotal = qtd * areaUnit;
            var fem = num(item.fem);
            var fab = num(item.fabricado);
            var inst = num(item.instalado);
            var areaInst = inst * areaUnit;
        
            var valores = {
              area: [areaTotal.toFixed(2), true],
              femSaldo: [String(qtd - fem), false],
              femPct: [(qtd > 0 ? (fem / qtd) * 100 : 0).toFixed(0) + '%', true],
              fabSaldo: [String(qtd - fab), false],
              fabPct: [(qtd > 0 ? (fab / qtd) * 100 : 0).toFixed(0) + '%', true],
              instArea: [areaInst.toFixed(2), false],
              instSaldo: [(areaTotal - areaInst).toFixed(2), false],
              instPct: [(areaTotal > 0 ? (areaInst / areaTotal) * 100 : 0).toFixed(0) + '%', true]
            };
            for (var k = 0; k < nomes.length; k++) {
              var v = valores[nomes[k]];
              if (!v) { return false; }
              escrever(caixas[k], v[0], v[1]);
            }
        
            sincronizarCampos(tr, item);
        
            var completo = !!(item.instalado && inst >= qtd);
            if (tr.classList) {
              if (completo) { tr.classList.add('row-completed'); } else { tr.classList.remove('row-completed'); }
            }
            atualizarIndicadores();
            medir(tempos.linha, inicio);
            return true;
          }
        
          /* ------------------------------------------------------------------ *
           * indicadores do topo (mesmas contas da tela inteira)
           * ------------------------------------------------------------------ */
          function porTexto(id, valor) {
            var el = document.getElementById(id);
            if (el && el.innerText !== valor) { el.innerText = valor; }
          }
          function atualizarIndicadores() {
            var obra = obraAgora();
            if (!obra) { return; }
            var itens = obra.itens || [];
            var qtdTotal = 0, areaPrevista = 0, femT = 0, fabT = 0, instT = 0, areaInstalada = 0;
            for (var i = 0; i < itens.length; i++) {
              var it = itens[i];
              if (!it) { continue; }
              var areaUnit = num(it.larg) * num(it.alt);
              qtdTotal += num(it.qtd);
              areaPrevista += num(it.qtd) * areaUnit;
              femT += num(it.fem);
              fabT += num(it.fabricado);
              instT += num(it.instalado);
              areaInstalada += num(it.instalado) * areaUnit;
            }
            porTexto('kpiQtdTotal', qtdTotal.toLocaleString('pt-BR'));
            porTexto('kpiAreaTotal', areaPrevista.toFixed(2) + M2);
            porTexto('kpiProgressoFem', (qtdTotal > 0 ? (femT / qtdTotal) * 100 : 0).toFixed(1) + '%');
            porTexto('kpiProgressoFab', (qtdTotal > 0 ? (fabT / qtdTotal) * 100 : 0).toFixed(1) + '%');
            porTexto('kpiProgressoInst', (areaPrevista > 0 ? (areaInstalada / areaPrevista) * 100 : 0).toFixed(1) + '%');
          }
        
          /* ------------------------------------------------------------------ *
           * guardar e devolver o foco, o cursor e a rolagem
           * ------------------------------------------------------------------ */
          function caixaRolagem() {
            var corpo = document.getElementById('tbodyItens');
            if (!corpo) { return null; }
            var pai = corpo.parentNode;
            while (pai && pai !== document.body) {
              var classe = pai.className ? String(pai.className) : '';
              if (classe.indexOf('table-responsive') >= 0) { return pai; }
              pai = pai.parentNode;
            }
            return null;
          }
          function linhaDoCampo(el) {
            var pai = el ? el.parentNode : null;
            while (pai && pai.tagName !== 'TR') { pai = pai.parentNode; }
            return pai;
          }
          function guardar() {
            var estado = { topo: 0, esq: 0, pagina: 0, id: null, campo: '', elId: '', ini: null, fim: null };
            var caixa = caixaRolagem();
            if (caixa) { estado.topo = caixa.scrollTop; estado.esq = caixa.scrollLeft; }
            var raiz = document.scrollingElement || document.documentElement;
            estado.pagina = raiz ? raiz.scrollTop : 0;
            var el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
              estado.elId = el.id || '';
              estado.campo = campoDoCampo(el);
              var tr = linhaDoCampo(el);
              estado.id = tr ? idDaLinha(tr) : null;
              try {
                if (el.type !== 'number' && el.type !== 'date' && el.selectionStart !== null) {
                  estado.ini = el.selectionStart; estado.fim = el.selectionEnd;
                }
              } catch (e) {}
            }
            return estado;
          }
          function devolver(estado) {
            if (!estado) { return; }
            var caixa = caixaRolagem();
            if (caixa) {
              if (estado.topo) { caixa.scrollTop = estado.topo; }
              if (estado.esq) { caixa.scrollLeft = estado.esq; }
            }
            var raiz = document.scrollingElement || document.documentElement;
            if (raiz && estado.pagina) { raiz.scrollTop = estado.pagina; }
        
            var alvo = null;
            if (estado.elId) { alvo = document.getElementById(estado.elId); }
            if (!alvo && estado.id !== null && estado.campo) {
              var tr = acharLinha(estado.id);
              if (tr) {
                var campos = tr.querySelectorAll('input[onchange]');
                for (var i = 0; i < campos.length; i++) {
                  if (campoDoCampo(campos[i]) === estado.campo) { alvo = campos[i]; break; }
                }
              }
            }
            if (!alvo || alvo === document.activeElement) { return; }
            try { alvo.focus({ preventScroll: true }); }
            catch (e) { try { alvo.focus(); } catch (e2) {} }
            try {
              if (estado.ini !== null && alvo.setSelectionRange) { alvo.setSelectionRange(estado.ini, estado.fim); }
            } catch (e3) {}
          }
        
          /* ------------------------------------------------------------------ *
           * juntar pedidos de redesenho da tela inteira
           * ------------------------------------------------------------------ */
          var renderOriginal = window.render;
          var relogioRender = null;
          var ultimoRender = 0;
          var dentroRender = false;
        
          function executarRender() {
            if (typeof renderOriginal !== 'function') { return; }
            ultimoRender = Date.now();
            var estado = guardar();
            var inicio = agora();
            dentroRender = true;
            try { renderOriginal.apply(window, []); }
            catch (erro) { console.error('[126] render:', erro); }
            dentroRender = false;
            medir(tempos.tela, inicio);
            devolver(estado);
          }
          function agendarRender() {
            if (relogioRender) { return; }
            relogioRender = setTimeout(function () { relogioRender = null; executarRender(); }, ESPERA_RENDER);
          }
          if (typeof renderOriginal === 'function') {
            window.render = function () {
              if (Date.now() - ultimoRender < ESPERA_RENDER) {
                tempos.juntados++;
                agendarRender();
                return;
              }
              if (relogioRender) { clearTimeout(relogioRender); relogioRender = null; }
              executarRender();
            };
          }
        
          /* medir a montagem da tabela principal e proteger o foco quando ela e
             chamada sozinha, fora da tela inteira */
          var tabelaOriginal = window.renderTabelaPrincipal;
          if (typeof tabelaOriginal === 'function') {
            window.renderTabelaPrincipal = function () {
              var estado = dentroRender ? null : guardar();
              var inicio = agora();
              var resposta;
              try { resposta = tabelaOriginal.apply(this, arguments); }
              finally {
                medir(tempos.tabela, inicio);
                if (estado) { devolver(estado); }
              }
              return resposta;
            };
          }
        
          /* ------------------------------------------------------------------ *
           * editar item: atualiza a linha na hora e as outras abas depois
           * ------------------------------------------------------------------ */
          var relogioDependentes = null;
          var OUTRAS = ['tbodyLiberacao', 'tbodyFabricacao', 'tbodyInstalacao',
                        'tbodyBoletim', 'tbodyRecebimentos', 'tbodyMedicao'];
        
          function outrasAbasVisiveis() {
            for (var i = 0; i < OUTRAS.length; i++) {
              var el = document.getElementById(OUTRAS[i]);
              if (el && el.offsetParent !== null) { return true; }
            }
            return false;
          }
          function agendarDependentes() {
            if (relogioDependentes) { clearTimeout(relogioDependentes); }
            relogioDependentes = setTimeout(function () {
              relogioDependentes = null;
              if (outrasAbasVisiveis()) { agendarRender(); }
            }, ESPERA_DEPENDENTES);
          }
          var editarOriginal = window.editarItem;
          if (typeof editarOriginal === 'function') {
            window.editarItem = function (id, campo, valor) {
              var resposta = editarOriginal.apply(this, arguments);
              try {
                if (atualizarLinha(id)) { agendarDependentes(); }
                else { agendarRender(); }
              } catch (erro) {
                console.warn('[126] nao consegui atualizar so a linha, refazendo a tela:', erro);
                agendarRender();
              }
              return resposta;
            };
          }
        
          /* ------------------------------------------------------------------ *
           * gravacao local: na hora na primeira vez, uma so vez em rajada
           * ------------------------------------------------------------------ */
          var gravarOriginal = window.salvarLocalComoBackup;
          var pendente = false;
          var relogioGrava = null;
          var ultimaGravacao = 0;
        
          function gravarAgora() {
            if (relogioGrava) { clearTimeout(relogioGrava); relogioGrava = null; }
            if (!pendente || typeof gravarOriginal !== 'function') { return; }
            pendente = false;
            ultimaGravacao = Date.now();
            var inicio = agora();
            try { gravarOriginal.apply(window, []); }
            catch (erro) { console.warn('[126] gravacao local:', erro); }
            medir(tempos.gravacao, inicio);
          }
          if (typeof gravarOriginal === 'function') {
            window.salvarLocalComoBackup = function () {
              pendente = true;
              if (Date.now() - ultimaGravacao >= ESPERA_GRAVA) { gravarAgora(); return; }
              if (relogioGrava) { return; }
              relogioGrava = setTimeout(function () { relogioGrava = null; gravarAgora(); }, ESPERA_GRAVA);
            };
            window.p126Gravar = gravarAgora;
            try {
              window.addEventListener('beforeunload', gravarAgora);
              window.addEventListener('pagehide', gravarAgora);
              document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'hidden') { gravarAgora(); }
              });
            } catch (e) {}
          }
        
          /* ------------------------------------------------------------------ *
           * cronometro: p126Tempos()
           * ------------------------------------------------------------------ */
          var NL = String.fromCharCode(10);
          window.p126Tempos = function () {
            function linha(nome, alvo) {
              var media = alvo.n ? (alvo.total / alvo.n) : 0;
              return '  ' + nome + ': ' + alvo.n + ' vez(es) | ultima ' +
                     alvo.ultimo.toFixed(1) + ' ms | media ' + media.toFixed(1) + ' ms';
            }
            var texto = ['PATCH 126 - tempos desde que a pagina abriu',
              linha('linha alterada', tempos.linha),
              linha('tabela principal', tempos.tabela),
              linha('tela inteira', tempos.tela),
              linha('gravacao no navegador', tempos.gravacao),
              '  redesenhos evitados: ' + tempos.juntados].join(NL);
            console.log(texto);
            return {
              linhaAlterada: tempos.linha,
              tabelaPrincipal: tempos.tabela,
              telaInteira: tempos.tela,
              gravacaoNavegador: tempos.gravacao,
              redesenhosEvitados: tempos.juntados
            };
          };
        
          /* ------------------------------------------------------------------ *
           * conferencia SO LEITURA: codigos repetidos
           * ------------------------------------------------------------------ */
          window.p126Codigos = function () {
            var b = banco();
            var saida = {
              obras: 0, itens: 0, semCodigo: 0,
              obrasComCodigoRepetido: [],
              repetidosNaMesmaObra: [],
              repetidosEntreObras: []
            };
            if (!b || !b.obras) {
              console.log('PATCH 126 - nao encontrei as obras para conferir.');
              return saida;
            }
            var vistosObra = {};
            var donoDoCodigo = {};
            for (var i = 0; i < b.obras.length; i++) {
              var o = b.obras[i];
              if (!o) { continue; }
              saida.obras++;
              var codObra = String(o.id);
              if (vistosObra[codObra]) { saida.obrasComCodigoRepetido.push({ codigo: codObra, nome: o.nome || '' }); }
              vistosObra[codObra] = true;
        
              var dentro = {};
              var itens = o.itens || [];
              for (var j = 0; j < itens.length; j++) {
                var it = itens[j];
                if (!it) { continue; }
                saida.itens++;
                if (it.id === undefined || it.id === null || String(it.id) === '') { saida.semCodigo++; continue; }
                var cod = String(it.id);
                if (dentro[cod]) {
                  saida.repetidosNaMesmaObra.push({ obra: o.nome || codObra, codigo: cod, ref: it.ref || '' });
                }
                dentro[cod] = true;
                var dono = donoDoCodigo[cod];
                if (dono && dono.id !== codObra) {
                  saida.repetidosEntreObras.push({ codigo: cod, obraA: dono.nome, obraB: o.nome || codObra });
                } else if (!dono) {
                  donoDoCodigo[cod] = { id: codObra, nome: o.nome || codObra };
                }
              }
            }
            var relato = ['PATCH 126 - conferencia de codigos (so leitura, nada foi alterado)',
              '  obras conferidas: ' + saida.obras,
              '  itens conferidos: ' + saida.itens,
              '  itens sem codigo: ' + saida.semCodigo,
              '  obras com codigo repetido: ' + saida.obrasComCodigoRepetido.length,
              '  itens com codigo repetido na mesma obra: ' + saida.repetidosNaMesmaObra.length,
              '  itens com codigo repetido entre obras: ' + saida.repetidosEntreObras.length].join(NL);
            console.log(relato);
            if (saida.repetidosNaMesmaObra.length || saida.repetidosEntreObras.length ||
                saida.obrasComCodigoRepetido.length || saida.semCodigo) {
              console.log('Achei repeticao. Guarde este resultado: o patch 127 (gerador unico de codigos) precisa vir antes.');
              console.log(saida);
            } else {
              console.log('Nenhuma repeticao encontrada. O patch 127 pode seguir na ordem normal.');
            }
            return saida;
          };
        
          /* deixo a atualizacao de uma linha disponivel para testes */
          window.p126AtualizarLinha = atualizarLinha;
          window.p126Indicadores = atualizarIndicadores;
        
          console.log('[PATCH 126] tabela sem pisca ativa. No Console: p126Tempos() para os tempos, p126Codigos() para conferir codigos repetidos.');
        })();
    
