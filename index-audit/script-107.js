
        /* =====================================================================
         * PATCH 143 - importacao da lista CTM que cria, atualiza e explica
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.P143) { return; }
        
          var relatorio = null;
        
          /* ---------- ajudas simples ---------- */
          function obraAtual() {
            try { return (typeof getObraAtual === 'function') ? getObraAtual() : null; } catch (e) { return null; }
          }
          function chave(v) { return String(v === null || v === undefined ? '' : v).trim().toUpperCase(); }
          function texto(v) { return String(v === null || v === undefined ? '' : v).trim(); }
          function inteiro(v) {
            var s = String(v === null || v === undefined ? '' : v).replace(/[^0-9-]/g, '');
            var n = parseInt(s, 10);
            return isFinite(n) ? n : 0;
          }
        
          /* nomes aceitos para cada coluna */
          var COLUNAS = {
            ref: ['Ref', 'ref', 'REF', 'Referencia', 'Referência', 'REFERENCIA'],
            type: ['Tipo', 'tipo', 'Tipologia', 'TIPO'],
            L: ['L(mm)', 'L', 'l', 'Largura', 'LARGURA'],
            H: ['H(mm)', 'H', 'h', 'Altura', 'ALTURA'],
            qty: ['Qtd', 'qtd', 'qty', 'Quantidade', 'Qtde', 'QTD'],
            lados: ['Lados', 'lados', 'Estrutura', 'LADOS'],
            modelo: ['Modelo', 'modelo', 'Perfil', 'ctmProfile', 'MODELO']
          };
        
          /* devolve o valor da coluna, ou undefined se a coluna nao existe na linha */
          function coluna(linha, quais) {
            var i, nome;
            for (i = 0; i < quais.length; i++) {
              nome = quais[i];
              if (Object.prototype.hasOwnProperty.call(linha, nome)) {
                if (texto(linha[nome]) !== '') { return linha[nome]; }
              }
            }
            return undefined;
          }
        
          /* escolhe a aba: a primeira que tiver coluna de referencia */
          function escolherAba(workbook) {
            var nomes = workbook.SheetNames || [];
            var i, linhas;
            for (i = 0; i < nomes.length; i++) {
              try {
                linhas = XLSX.utils.sheet_to_json(workbook.Sheets[nomes[i]]);
              } catch (e) { linhas = []; }
              if (linhas.length && coluna(linhas[0], COLUNAS.ref) !== undefined) {
                return { nome: nomes[i], linhas: linhas };
              }
            }
            return { nome: nomes.length ? nomes[0] : '', linhas: [] };
          }
        
          /* ---------- monta o retrato do que ja existe ---------- */
          function retrato(obra) {
            var daLista = {};   /* referencia -> peca da lista de itens da obra */
            var extras = {};    /* referencia -> peca que veio de importacao */
            (obra.itens || []).forEach(function (it) {
              var k = chave(it.ref);
              if (!k) { return; }
              if (!daLista[k]) {
                daLista[k] = {
                  ref: it.ref,
                  L: Math.round((it.larg || 0) * 1000),
                  H: Math.round((it.alt || 0) * 1000),
                  qty: it.qtd || 0
                };
              } else {
                daLista[k].qty += (it.qtd || 0);
              }
            });
            (obra.ctmExtraSpecs || []).forEach(function (es) {
              var k = chave(es.ref);
              if (k && !daLista[k]) { extras[k] = es; }
            });
            return { daLista: daLista, extras: extras };
          }
        
          /* ---------- le a planilha e decide o que fazer com cada linha ---------- */
          function analisar(linhas, obra) {
            var foto = retrato(obra);
            var r = {
              linhas: linhas.length,
              novas: [],
              atualizadas: [],
              iguais: [],
              daListaDeItens: [],
              repetidas: [],
              semRef: 0,
              vistas: {}
            };
        
            linhas.forEach(function (linha, i) {
              var bruto = coluna(linha, COLUNAS.ref);
              var ref = texto(bruto);
              var k = chave(bruto);
              if (!k) { r.semRef++; return; }
              if (r.vistas[k]) { r.repetidas.push(ref); return; }
              r.vistas[k] = true;
        
              var vL = coluna(linha, COLUNAS.L);
              var vH = coluna(linha, COLUNAS.H);
              var vQ = coluna(linha, COLUNAS.qty);
              var vT = coluna(linha, COLUNAS.type);
              var vLados = coluna(linha, COLUNAS.lados);
              var vModelo = coluna(linha, COLUNAS.modelo);
        
              /* peca que vem da lista de itens da obra: nao mexemos */
              if (foto.daLista[k]) {
                var atual = foto.daLista[k];
                var difs = [];
                if (vL !== undefined && inteiro(vL) !== atual.L) { difs.push('L ' + atual.L + ' -> ' + inteiro(vL)); }
                if (vH !== undefined && inteiro(vH) !== atual.H) { difs.push('H ' + atual.H + ' -> ' + inteiro(vH)); }
                if (vQ !== undefined && inteiro(vQ) !== atual.qty) { difs.push('Qtd ' + atual.qty + ' -> ' + inteiro(vQ)); }
                r.daListaDeItens.push({ ref: ref, diferencas: difs });
                return;
              }
        
              /* peca que veio de importacao: pode ser atualizada */
              if (foto.extras[k]) {
                var alvo = foto.extras[k];
                var mudancas = [];
                var novo = {};
                if (vT !== undefined && texto(vT) !== texto(alvo.type)) { novo.type = texto(vT); mudancas.push('Tipo'); }
                if (vL !== undefined && inteiro(vL) !== (alvo.L || 0)) { novo.L = inteiro(vL); mudancas.push('L ' + (alvo.L || 0) + ' -> ' + inteiro(vL)); }
                if (vH !== undefined && inteiro(vH) !== (alvo.H || 0)) { novo.H = inteiro(vH); mudancas.push('H ' + (alvo.H || 0) + ' -> ' + inteiro(vH)); }
                if (vQ !== undefined && inteiro(vQ) !== (alvo.qty || 0)) { novo.qty = inteiro(vQ); mudancas.push('Qtd ' + (alvo.qty || 0) + ' -> ' + inteiro(vQ)); }
                if (vLados !== undefined) {
                  var temFundo = texto(vLados) === '3' ? false : true;
                  var antes = (alvo.hasBottom === undefined) ? true : !!alvo.hasBottom;
                  if (temFundo !== antes) { novo.hasBottom = temFundo; mudancas.push('Lados'); }
                }
                if (vModelo !== undefined && texto(vModelo) !== texto(alvo.ctmProfile || 'largo')) {
                  novo.ctmProfile = texto(vModelo); mudancas.push('Modelo');
                }
                if (mudancas.length) { r.atualizadas.push({ ref: ref, alvo: alvo, novo: novo, mudancas: mudancas }); }
                else { r.iguais.push(ref); }
                return;
              }
        
              /* referencia nova */
              r.novas.push({
                ref: ref,
                type: texto(vT),
                L: inteiro(vL),
                H: inteiro(vH),
                qty: inteiro(vQ),
                hasBottom: texto(vLados) === '3' ? false : true,
                ctmProfile: vModelo === undefined ? 'largo' : texto(vModelo)
              });
            });
        
            return r;
          }
        
          /* ---------- texto do resumo ---------- */
          function amostra(lista, quantos) {
            var fim = lista.slice(0, quantos).join(', ');
            if (lista.length > quantos) { fim += ' e mais ' + (lista.length - quantos); }
            return fim;
          }
        
          function resumo(r, aba) {
            var t = 'Planilha lida: aba "' + aba + '", ' + r.linhas + ' linha(s).\n\n';
            t += 'Vou CRIAR: ' + r.novas.length + '\n';
            t += 'Vou ATUALIZAR: ' + r.atualizadas.length + '\n';
            if (r.atualizadas.length) {
              t += '   ' + amostra(r.atualizadas.map(function (a) { return a.ref + ' (' + a.mudancas.join('; ') + ')'; }), 5) + '\n';
            }
            t += '\nFicam de fora:\n';
            t += '  - iguais ao que ja existe: ' + r.iguais.length + '\n';
            if (r.daListaDeItens.length) {
              var comDif = r.daListaDeItens.filter(function (d) { return d.diferencas.length; });
              t += '  - vem da lista de itens da obra (planilha nao altera): ' + r.daListaDeItens.length + '\n';
              if (comDif.length) {
                t += '      dessas, ' + comDif.length + ' estao diferentes na planilha; corrija na lista de itens:\n';
                t += '      ' + amostra(comDif.map(function (d) { return d.ref + ' (' + d.diferencas.join('; ') + ')'; }), 5) + '\n';
              }
            }
            if (r.repetidas.length) { t += '  - repetidas dentro da planilha: ' + r.repetidas.length + ' (' + amostra(r.repetidas, 5) + ')\n'; }
            if (r.semRef) { t += '  - linhas sem referencia: ' + r.semRef + '\n'; }
            return t;
          }
        
          /* ---------- grava ---------- */
          function aplicar(r, obra) {
            if (!obra.ctmExtraSpecs) { obra.ctmExtraSpecs = []; }
            r.novas.forEach(function (n) {
              obra.ctmExtraSpecs.push({
                ref: n.ref, type: n.type, L: n.L, H: n.H, qty: n.qty,
                hasBottom: n.hasBottom, ctmProfile: n.ctmProfile || 'largo'
              });
            });
            r.atualizadas.forEach(function (a) {
              var campo;
              for (campo in a.novo) {
                if (Object.prototype.hasOwnProperty.call(a.novo, campo)) { a.alvo[campo] = a.novo[campo]; }
              }
            });
            try { if (typeof salvarDB === 'function') { salvarDB(); } } catch (e) { }
            try { if (typeof renderCTMDashboard === 'function') { renderCTMDashboard(); } } catch (e2) { }
          }
        
          /* ---------- a nova importacao ---------- */
          function importar(event) {
            var entrada = event && event.target;
            var file = entrada && entrada.files ? entrada.files[0] : null;
            if (!file) { return; }
            var obra = obraAtual();
            if (!obra) { alert('Escolha uma obra antes de importar a lista CTM.'); return; }
            if (typeof XLSX === 'undefined') {
              alert('A biblioteca de planilhas nao carregou. Verifique a internet e recarregue a pagina.');
              return;
            }
        
            var reader = new FileReader();
            reader.onerror = function () { alert('Nao consegui ler o arquivo. Tente salvar a planilha de novo e repetir.'); };
            reader.onload = function (e) {
              try {
                var workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                var aba = escolherAba(workbook);
                if (!aba.linhas.length) {
                  alert('Nao achei nenhuma aba com a coluna de referencia.\n\n' +
                        'A planilha precisa de uma coluna chamada Ref (ou Referencia) na primeira linha. ' +
                        'O jeito mais simples e usar o Exp.Excel do painel como modelo.');
                  return;
                }
                var r = analisar(aba.linhas, obra);
                r.aba = aba.nome;
                relatorio = r;
        
                if (!r.novas.length && !r.atualizadas.length) {
                  alert('Nada a mudar.\n\n' + resumo(r, aba.nome) +
                        '\nObservacao: a planilha exportada pelo painel tem justamente as pecas que ja existem, ' +
                        'por isso ela sozinha nunca muda nada.');
                  return;
                }
                if (!confirm(resumo(r, aba.nome) + '\nConfirma a importacao?')) {
                  alert('Importacao cancelada. Nada foi alterado.');
                  return;
                }
                aplicar(r, obra);
                alert('Pronto.\n\nCriadas: ' + r.novas.length + '\nAtualizadas: ' + r.atualizadas.length +
                      '\n\nDetalhe completo no console: P143.ultimo()');
              } catch (err) {
                alert('Erro ao importar: ' + (err && err.message ? err.message : err));
              }
            };
            reader.readAsArrayBuffer(file);
            try { entrada.value = ''; } catch (e3) { }
          }
        
          window.importExcelSpecsCTM = importar;
        
          window.P143 = {
            ultimo: function () {
              if (!relatorio) { console.log('[PATCH143] nenhuma importacao feita nesta sessao.'); return null; }
              try { console.log('[PATCH143] resumo:\n' + resumo(relatorio, relatorio.aba || '')); } catch (e) { }
              return relatorio;
            },
            analisar: analisar
          };
        
          try { console.log('[PATCH143] importacao da lista CTM agora cria, atualiza e explica. Use P143.ultimo().'); } catch (e4) { }
        }());
    
