
        /* =====================================================================
         * PATCH 135B - raio x do plano e dos lancamentos (somente leitura)
         * ===================================================================== */
        (function () {
          if (window.__p135b) { return; }
          window.__p135b = true;
        
          var linhas = [];
        
          function di(s) {
            linhas.push(String(s));
            try { console.log(s); } catch (e) { }
          }
        
          function num(v) {
            var n = parseFloat(String(v === undefined || v === null ? 0 : v).replace(',', '.'));
            return isNaN(n) ? 0 : n;
          }
        
          function texto(v) { return String(v === undefined || v === null ? '' : v); }
        
          function limpar(s) {
            var t = texto(s).toLowerCase().trim();
            try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { }
            return t;
          }
        
          function data(v) {
            var s = texto(v).trim();
            if (!s) { return null; }
            var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) { return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
            m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (m) { return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); }
            if (/^\d{10,13}$/.test(s)) {
              var t = new Date(s.length > 10 ? Number(s) : Number(s) * 1000);
              return isNaN(t.getTime()) ? null : t;
            }
            var d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
          }
        
          function comoData(d) {
            if (!d) { return '(vazio)'; }
            function dd(n) { return n < 10 ? '0' + n : String(n); }
            return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear();
          }
        
          function primeiro(obj, campos) {
            var i;
            for (i = 0; i < campos.length; i++) {
              var v = obj[campos[i]];
              if (v !== undefined && v !== null && v !== '') { return v; }
            }
            return null;
          }
        
          function obraAtual() {
            try { if (typeof window.getObraAtual === 'function') { return window.getObraAtual(); } }
            catch (e) { }
            try {
              var b = window.db || null;
              if (b && b.obras && b.obras.length) {
                var a = b.obras.filter(function (o) { return o.id === b.obraAtualId; })[0];
                return a || b.obras[0];
              }
            } catch (e2) { }
            return null;
          }
        
          function tarefas(obra) {
            if (!obra) { return []; }
            var of = obra.obraflow || obra.obraFlow || null;
            var lista = (of && of.tarefas) ? of.tarefas : (obra.obraflowTarefas || []);
            return (lista && lista.length) ? lista : [];
          }
        
          function nome(t) { return texto(primeiro(t, ['nome', 'titulo', 'descricao', 'tarefa']) || 'Sem nome'); }
          function tipo(t) { return limpar(primeiro(t, ['tipo', 'categoria']) || 'tarefa'); }
          function ehFase(t) { return tipo(t).indexOf('fase') >= 0 || tipo(t).indexOf('grupo') >= 0; }
          function ehMarco(t) { return tipo(t).indexOf('marco') >= 0 || tipo(t).indexOf('milestone') >= 0; }
          function inicio(t) { return data(primeiro(t, ['inicio', 'dataInicio', 'start', 'inicioPrevisto'])); }
          function fim(t) { return data(primeiro(t, ['fim', 'dataFim', 'end', 'fimPrevisto', 'termino'])); }
          function fimReal(t) { return data(primeiro(t, ['fimReal', 'dataFimReal', 'terminoReal'])); }
          function custoPrev(t) { return num(primeiro(t, ['custoPrevisto', 'custoPlanejado', 'orcado', 'custo'])); }
        
          function pct(t) {
            var v = primeiro(t, ['percentual', 'percent', 'progresso', 'avanco', 'pct', 'concluido']);
            return v === null ? null : num(v);
          }
        
          /* ================================================================ *
           * 1) o plano, tarefa por tarefa
           * ================================================================ */
          function verPlano() {
            var obra = obraAtual();
            var lista = tarefas(obra);
            di('=== PLANO DA OBRA: ' + (obra ? texto(obra.nome || obra.titulo) : '(nenhuma)') + ' ===');
            if (!lista.length) { di('  esta obra nao tem tarefas no plano.'); return null; }
        
            var c = { total: lista.length, fases: 0, marcos: 0, semInicio: 0, semFim: 0,
                      semPct: 0, semCusto: 0, comFimReal: 0, campos: {} };
            var menorInicio = null, menorFim = null, maiorFim = null, i;
        
            di('  tarefa | tipo | inicio | fim | fim real | % | custo previsto');
            for (i = 0; i < lista.length; i++) {
              var t = lista[i] || {};
              Object.keys(t).forEach(function (k) { c.campos[k] = (c.campos[k] || 0) + 1; });
              var a = inicio(t), b = fim(t), fr = fimReal(t), p = pct(t), cu = custoPrev(t);
              if (ehFase(t)) { c.fases = c.fases + 1; }
              if (ehMarco(t)) { c.marcos = c.marcos + 1; }
              if (!ehFase(t) && !ehMarco(t)) {
                if (!a) { c.semInicio = c.semInicio + 1; }
                if (!b) { c.semFim = c.semFim + 1; }
                if (p === null) { c.semPct = c.semPct + 1; }
                if (cu <= 0) { c.semCusto = c.semCusto + 1; }
                if (fr) { c.comFimReal = c.comFimReal + 1; }
                if (a && (!menorInicio || a.getTime() < menorInicio.getTime())) { menorInicio = a; }
                if (b && (!menorFim || b.getTime() < menorFim.getTime())) { menorFim = b; }
                if (b && (!maiorFim || b.getTime() > maiorFim.getTime())) { maiorFim = b; }
              }
              if (i < 40) {
                di('  ' + nome(t) + ' | ' + tipo(t) + ' | ' + comoData(a) + ' | ' + comoData(b) +
                   ' | ' + comoData(fr) + ' | ' + (p === null ? '(vazio)' : p + '%') +
                   ' | ' + (cu > 0 ? cu : '(vazio)'));
              }
            }
            if (lista.length > 40) { di('  ... (mostrei as 40 primeiras de ' + lista.length + ')'); }
        
            di('  --- contagem ---');
            di('  tarefas no total: ' + c.total + ' | fases: ' + c.fases + ' | marcos: ' + c.marcos);
            di('  tarefas de ponta sem data de inicio: ' + c.semInicio);
            di('  tarefas de ponta sem data de fim: ' + c.semFim);
            di('  tarefas de ponta sem percentual: ' + c.semPct);
            di('  tarefas de ponta sem custo previsto: ' + c.semCusto);
            di('  tarefas com data real de termino: ' + c.comFimReal);
            di('  primeiro inicio do plano: ' + comoData(menorInicio));
            di('  primeiro fim do plano: ' + comoData(menorFim) + ' | ultimo fim: ' + comoData(maiorFim));
            di('  nomes de campo que existem nas tarefas: ' + Object.keys(c.campos).join(', '));
        
            di('  --- leitura do resultado ---');
            if (c.semCusto === c.total - c.fases - c.marcos) {
              di('  * nenhuma tarefa tem custo previsto: por isso o quadro do dinheiro mostra');
              di('    previsto R$ 0,00 e a curva pesa por duracao em dias.');
            }
            if (c.semInicio > 0) {
              di('  * ' + c.semInicio + ' tarefa(s) sem data de inicio. Sem inicio a curva nao sabe');
              di('    onde a tarefa comecou, e o comeco do grafico e empurrado para o mes atual.');
            }
            if (c.semPct > 0 || c.comFimReal === 0) {
              di('  * o plano nao tem data real de termino lancada: por isso o realizado fica em 0%');
              di('    nos meses passados. O percentual de hoje entra apenas no mes atual.');
            }
            return c;
          }
        
          /* ================================================================ *
           * 2) onde estao os lancamentos de custo
           * ================================================================ */
          var CAMPOS_DATA = ['data', 'dataDespesa', 'dataPagamento', 'dataLancamento',
                             'dataCompra', 'dataNota', 'dt', 'vencimento', 'quando'];
          var CAMPOS_VALOR = ['valor', 'total', 'preco', 'quantia'];
        
          function pareceLancamento(x) {
            if (!x || typeof x !== 'object') { return false; }
            var temValor = false, temData = false, i;
            for (i = 0; i < CAMPOS_VALOR.length; i++) {
              if (x[CAMPOS_VALOR[i]] !== undefined) { temValor = true; }
            }
            for (i = 0; i < CAMPOS_DATA.length; i++) {
              if (x[CAMPOS_DATA[i]] !== undefined) { temData = true; }
            }
            return temValor && temData;
          }
        
          function somar(lista) {
            var s = 0, semData = 0, i;
            for (i = 0; i < lista.length; i++) {
              s = s + num(primeiro(lista[i], CAMPOS_VALOR));
              if (!data(primeiro(lista[i], CAMPOS_DATA))) { semData = semData + 1; }
            }
            return { soma: Math.round(s * 100) / 100, semData: semData };
          }
        
          function procurar(raiz, caminho, achados, nivel) {
            if (!raiz || nivel > 3 || achados.length > 20) { return; }
            var chaves;
            try { chaves = Object.keys(raiz); } catch (e) { return; }
            chaves.forEach(function (k) {
              var v = raiz[k];
              if (!v || typeof v !== 'object') { return; }
              var novo = caminho + '.' + k;
              if (Object.prototype.toString.call(v) === '[object Array]') {
                if (v.length && pareceLancamento(v[0])) {
                  var s = somar(v);
                  achados.push({ caminho: novo, quantos: v.length, soma: s.soma, semData: s.semData });
                }
                return;
              }
              procurar(v, novo, achados, nivel + 1);
            });
          }
        
          function verCustos() {
            var obra = obraAtual();
            di('=== LANCAMENTOS DE CUSTO ===');
            if (!obra) { di('  nenhuma obra aberta.'); return null; }
        
            var onde = obra.centrosCusto || null;
            if (onde && onde.length) {
              var s = somar(onde);
              di('  obra.centrosCusto: ' + onde.length + ' lancamento(s), soma ' + s.soma +
                 ', sem data ' + s.semData);
              di('  * e daqui que o patch 135 le. Esta certo.');
            } else {
              di('  obra.centrosCusto: vazio ou inexistente.');
              di('  * e por isso que o quadro do dinheiro mostra lancado R$ 0,00.');
            }
        
            var achados = [];
            procurar(obra, 'obra', achados, 1);
            try { if (window.db) { procurar(window.db, 'db', achados, 1); } } catch (e) { }
            if (achados.length) {
              di('  --- listas que parecem lancamento de custo ---');
              achados.forEach(function (a) {
                di('  ' + a.caminho + ': ' + a.quantos + ' item(ns), soma ' + a.soma +
                   ', sem data ' + a.semData);
              });
              di('  * se a lista certa nao for obra.centrosCusto, me mande o caminho acima');
              di('    e eu ajusto o patch 135 para ler dali tambem.');
            } else {
              di('  nao encontrei nenhuma lista parecida com lancamento de custo.');
            }
        
            try {
              if (typeof window.getCustosFiltered === 'function') {
                var f = window.getCustosFiltered() || [];
                var sf = somar(f);
                di('  getCustosFiltered() (o filtro da tela): ' + f.length +
                   ' lancamento(s), soma ' + sf.soma);
              } else {
                di('  a funcao getCustosFiltered nao existe neste arquivo.');
              }
            } catch (e2) { di('  getCustosFiltered deu erro: ' + e2); }
        
            return achados;
          }
        
          function tudo() {
            linhas = [];
            di('RAIO X DO PLANO E DOS CUSTOS - ' + new Date().toLocaleString('pt-BR'));
            verPlano();
            verCustos();
            di('=== fim do raio x. Use P135B.copiar() para levar este texto. ===');
            return linhas.length;
          }
        
          function copiar() {
            if (!linhas.length) { tudo(); }
            var texto2 = linhas.join('\n');
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto2);
                console.log('[P135B] relatorio copiado. Cole onde precisar.');
                return true;
              }
            } catch (e) { }
            console.log(texto2);
            console.log('[P135B] copie o texto acima com o mouse.');
            return false;
          }
        
          window.P135B = { plano: function () { linhas = []; return verPlano(); },
                           custos: function () { linhas = []; return verCustos(); },
                           tudo: tudo, copiar: copiar, texto: function () { return linhas.join('\n'); } };
        
          try {
            console.log('[PATCH135B] raio x pronto. Rode P135B.tudo() e depois P135B.copiar()');
          } catch (e) { }
        }());
    
