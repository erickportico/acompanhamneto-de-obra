
        /* PATCH 127 - gerador unico de codigos. Cria codigo que nunca repete (nem
           entre pessoas), liga as telas de cadastro nele por fora, confere na hora de
           gravar e traz p127Conferir(). Nao renumera nada que ja existe. */
        (function () {
          'use strict';
          if (window.__p127Ativo) { return; }
          window.__p127Ativo = true;
        
          var BASE = Date.UTC(2020, 0, 1);
          var CHAVE_MAQUINA = 'p127_maquina';
          var maquina = lerMaquina();
          var ultimoSegundo = 0;
          var contador = 0;
          var entregues = 0;
          var conhecidos = {};
          var ultimoRelato = [];
          var ultimaVarredura = 0;
        
          function lerMaquina() {
            var guardado = null;
            try { guardado = window.localStorage.getItem(CHAVE_MAQUINA); } catch (e) {}
            var n = parseInt(guardado, 10);
            if (!(n >= 0 && n <= 999)) {
              n = Math.floor(Math.random() * 1000);
              try { window.localStorage.setItem(CHAVE_MAQUINA, String(n)); } catch (e) {}
            }
            return n;
          }
          function proximo() {
            var s = Math.floor((Date.now() - BASE) / 1000);
            if (s > ultimoSegundo) { ultimoSegundo = s; contador = 0; }
            else { contador = contador + 1; if (contador > 9999) { ultimoSegundo = ultimoSegundo + 1; contador = 0; } }
            entregues = entregues + 1;
            return { s: ultimoSegundo, c: contador };
          }
        
          /* numero inteiro: segundos desde 2020 + marca do computador + contador */
          window.p127Codigo = function () {
            var p = proximo();
            return (p.s * 10000000) + (maquina * 10000) + p.c;
          };
          /* texto, para os cadastros que ja usavam texto */
          window.p127CodigoTexto = function (prefixo) {
            var p = proximo();
            return String(prefixo || 'p127') + '_' + p.s.toString(36) + '_' + maquina + '_' + p.c;
          };
          window.p127Maquina = function () { return maquina; };
        
          function banco() {
            try { if (typeof db !== 'undefined' && db) { return db; } } catch (e) {}
            return window.db || null;
          }
          function ehListaDeCadastro(v) {
            if (!v || Object.prototype.toString.call(v) !== '[object Array]' || !v.length) { return false; }
            var primeiro = v[0];
            return !!primeiro && typeof primeiro === 'object' &&
                   Object.prototype.hasOwnProperty.call(primeiro, 'id');
          }
          function sohNumero(texto) {
            if (!texto.length) { return false; }
            for (var i = 0; i < texto.length; i++) {
              var c = texto.charAt(i);
              if ((c < '0' || c > '9') && c !== '.' && c !== '-') { return false; }
            }
            return true;
          }
        
          /* junta todas as listas de cadastro do banco, cada tipo com seu nome */
          function familias() {
            var b = banco();
            var saida = [];
            if (!b) { return saida; }
            var k;
            if (b.obras && b.obras.length) { saida.push({ chave: 'obras', lista: b.obras }); }
            for (k in b) {
              if (!Object.prototype.hasOwnProperty.call(b, k) || k === 'obras') { continue; }
              if (ehListaDeCadastro(b[k])) { saida.push({ chave: 'geral.' + k, lista: b[k] }); }
            }
            var obras = b.obras || [];
            for (var i = 0; i < obras.length; i++) {
              var o = obras[i];
              if (!o || typeof o !== 'object') { continue; }
              for (k in o) {
                if (!Object.prototype.hasOwnProperty.call(o, k)) { continue; }
                if (ehListaDeCadastro(o[k])) { saida.push({ chave: 'obra.' + k, lista: o[k], obra: o }); }
              }
            }
            return saida;
          }
        
          /* marca como conhecido tudo que existe agora (inclusive o que veio da nuvem) */
          function registrarConhecidos() {
            var fam = familias();
            for (var i = 0; i < fam.length; i++) {
              var mapa = conhecidos[fam[i].chave];
              if (!mapa) { mapa = conhecidos[fam[i].chave] = {}; }
              var lista = fam[i].lista;
              for (var j = 0; j < lista.length; j++) {
                var r = lista[j];
                if (r && typeof r === 'object' && r.id !== undefined && r.id !== null && String(r.id) !== '') {
                  mapa[String(r.id)] = true;
                }
              }
            }
          }
        
          function prefixoDe(chave) {
            var nome = String(chave).replace('obra.', '').replace('geral.', '');
            nome = nome.substring(0, 4).toLowerCase();
            return nome || 'p127';
          }
          /* se o tipo de cadastro usa numero, entrega numero; se usa texto, entrega texto */
          function novoCodigo(chave, exemplo) {
            if (chave === 'obra.itens') { return window.p127Codigo(); }
            if (exemplo !== undefined && exemplo !== null && String(exemplo) !== '') {
              if (typeof exemplo === 'number' || sohNumero(String(exemplo))) { return window.p127Codigo(); }
              return window.p127CodigoTexto(prefixoDe(chave));
            }
            if (chave === 'obras') { return window.p127CodigoTexto('ob'); }
            return window.p127Codigo();
          }
        
          /* modo 'auto'   -> so arruma quem esta sem codigo ou com codigo repetido
             modo 'criacao'-> tambem troca codigo quebrado (com casa decimal) de
                              registro que acabou de nascer neste computador */
          function varredura(modo) {
            var fam = familias();
            var relato = [];
            var total = 0;
            var vistosPorTipo = {};
            ultimaVarredura = Date.now();
            for (var i = 0; i < fam.length; i++) {
              var chave = fam[i].chave;
              var lista = fam[i].lista;
              var obra = fam[i].obra;
              var mapa = conhecidos[chave];
              if (!mapa) { mapa = conhecidos[chave] = {}; }
              var vistos = vistosPorTipo[chave];
              if (!vistos) { vistos = vistosPorTipo[chave] = {}; }
              var exemplo = null;
              for (var e = 0; e < lista.length; e++) {
                var amostra = lista[e];
                if (amostra && amostra.id !== undefined && amostra.id !== null && String(amostra.id) !== '' && mapa[String(amostra.id)]) {
                  exemplo = amostra.id;
                  break;
                }
              }
              for (var j = 0; j < lista.length; j++) {
                var reg = lista[j];
                if (!reg || typeof reg !== 'object') { continue; }
                var atual = reg.id;
                var vazio = (atual === undefined || atual === null || String(atual) === '');
                var texto = vazio ? '' : String(atual);
                var novoAqui = !vazio && !mapa[texto];
                var repetido = !vazio && vistos[texto] === true;
                var quebrado = !vazio && sohNumero(texto) && texto.indexOf('.') >= 0;
                var motivo = '';
                if (vazio) { motivo = 'sem codigo'; }
                else if (repetido) { motivo = 'codigo repetido'; }
                else if (modo === 'criacao' && novoAqui && quebrado) { motivo = 'codigo com casa decimal'; }
                if (motivo && chave === 'obras' && !vazio) {
                  relato.push({ tipo: chave, aviso: motivo + ' - NAO alterado (codigo de obra nunca e trocado)', codigo: texto, nome: reg.nome || '' });
                  vistos[texto] = true;
                  mapa[texto] = true;
                  continue;
                }
                if (motivo) {
                  var novo = novoCodigo(chave, exemplo !== null ? exemplo : null);
                  reg.id = novo;
                  if (exemplo === null) { exemplo = novo; }
                  mapa[String(novo)] = true;
                  vistos[String(novo)] = true;
                  total = total + 1;
                  relato.push({
                    tipo: chave,
                    motivo: motivo,
                    antes: texto,
                    agora: novo,
                    obra: obra ? (obra.nome || obra.id || '') : '',
                    registro: reg.descricao || reg.nome || reg.name || reg.item || ''
                  });
                  continue;
                }
                if (!vazio) { vistos[texto] = true; mapa[texto] = true; }
              }
            }
            if (relato.length) {
              ultimoRelato = relato;
              try { console.warn('[PATCH 127] codigos ajustados/avisados: ' + relato.length, relato); } catch (e2) {}
            }
            return total;
          }
        
          /* --- liga por fora: gravacoes (rede de protecao) --- */
          function embrulharGravacao(nome) {
            var original = window[nome];
            if (typeof original !== 'function' || original.__p127 === true) { return; }
            var novo = function () {
              try {
                if (Date.now() - ultimaVarredura > 60) { varredura('auto'); }
              } catch (e) {}
              return original.apply(this, arguments);
            };
            novo.__p127 = true;
            try { window[nome] = novo; } catch (e3) {}
          }
        
          /* --- liga por fora: telas de cadastro (codigo bom na hora de nascer) --- */
          function embrulharCriacao(nome) {
            var original = window[nome];
            if (typeof original !== 'function' || original.__p127 === true) { return; }
            var novo = function () {
              try { registrarConhecidos(); } catch (e) {}
              var saida = original.apply(this, arguments);
              if (saida && typeof saida.then === 'function') {
                try {
                  saida.then(function (v) { try { varredura('criacao'); } catch (e4) {} return v; });
                } catch (e5) {}
              } else {
                try { varredura('criacao'); } catch (e6) {}
              }
              return saida;
            };
            novo.__p127 = true;
            try { window[nome] = novo; } catch (e7) {}
          }
        
          var GRAVACOES = ['salvarDB', 'salvarLocalComoBackup', 'sincronizarBancoNuvem', 'salvarNaNuvem'];
          var CADASTROS = ['salvarNovoItem', 'processarImportacaoExcel', 'salvarNovoRecebimento',
                           'processarImportacaoRecebimento', 'addCronoTask', 'duplicateCronoTask',
                           'salvarNovoColaborador', 'salvarNovoCusto', 'salvarNovaObra',
                           'adicionarItemListaCorte', 'processarImportacaoListaCorte'];
        
          function ligar() {
            for (var i = 0; i < GRAVACOES.length; i++) { embrulharGravacao(GRAVACOES[i]); }
            for (var j = 0; j < CADASTROS.length; j++) { embrulharCriacao(CADASTROS[j]); }
          }
        
          /* --- conferencia, so leitura --- */
          window.p127Conferir = function () {
            var fam = familias();
            var resumo = [];
            var totalRepetidos = 0;
            var totalSemCodigo = 0;
            for (var i = 0; i < fam.length; i++) {
              var lista = fam[i].lista;
              var vistos = {};
              var repetidos = 0, semCodigo = 0, antigos = 0, novos = 0, texto = 0;
              for (var j = 0; j < lista.length; j++) {
                var reg = lista[j];
                if (!reg || typeof reg !== 'object') { continue; }
                var id = reg.id;
                if (id === undefined || id === null || String(id) === '') { semCodigo = semCodigo + 1; continue; }
                var s = String(id);
                if (vistos[s]) { repetidos = repetidos + 1; } else { vistos[s] = true; }
                if (!sohNumero(s)) { texto = texto + 1; }
                else if (s.indexOf('.') >= 0 || s.length > 14) { antigos = antigos + 1; }
                else { novos = novos + 1; }
              }
              totalRepetidos = totalRepetidos + repetidos;
              totalSemCodigo = totalSemCodigo + semCodigo;
              var linha = {};
              linha['tipo'] = fam[i].chave + (fam[i].obra ? ' (' + (fam[i].obra.nome || '') + ')' : '');
              linha['registros'] = lista.length;
              linha['repetidos'] = repetidos;
              linha['sem codigo'] = semCodigo;
              linha['formato novo'] = novos;
              linha['formato antigo'] = antigos;
              linha['codigo em texto'] = texto;
              resumo.push(linha);
            }
            try {
              console.log('%c[PATCH 127] conferencia de codigos', 'font-weight:bold');
              if (console.table) { console.table(resumo); } else { console.log(resumo); }
              console.log('marca deste computador: ' + maquina +
                          ' | codigos entregues nesta sessao: ' + entregues +
                          ' | repetidos no total: ' + totalRepetidos +
                          ' | sem codigo no total: ' + totalSemCodigo);
              if (totalRepetidos === 0 && totalSemCodigo === 0) {
                console.log('%cnenhum problema de codigo. tudo certo.', 'color:green');
              } else {
                console.log('%crode uma gravacao qualquer (ou clique em salvar) para o patch arrumar o que da.', 'color:orange');
              }
              if (ultimoRelato.length) { console.log('ultimos ajustes feitos nesta sessao:', ultimoRelato); }
            } catch (e) {}
            return { resumo: resumo, maquina: maquina, entregues: entregues,
                     repetidos: totalRepetidos, semCodigo: totalSemCodigo, ajustes: ultimoRelato };
          };
        
          function iniciar() {
            try { registrarConhecidos(); } catch (e) {}
            ligar();
          }
          iniciar();
          setTimeout(iniciar, 1200);
          setTimeout(iniciar, 4000);
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          }
          window.addEventListener('load', iniciar);
          try {
            console.log('%c[PATCH 127] gerador unico de codigos ativo (marca ' + maquina +
                        '). Use p127Conferir() para o relatorio.', 'color:#2563eb;font-weight:bold');
          } catch (e8) {}
        })();
    
