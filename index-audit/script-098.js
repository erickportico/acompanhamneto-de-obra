
        /* =====================================================================
         * PATCH 135 - curva de avanco previsto x realizado e custo previsto
         *             (somente leitura: nunca grava na obra)
         * ===================================================================== */
        (function () {
          if (window.__p135) { return; }
          window.__p135 = true;
        
          var DIA = 86400000;
        
          function porId(x) { return document.getElementById(x); }
        
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
        
          function esc(s) {
            return texto(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                           .replace(/"/g, '&quot;');
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
        
          function hoje() {
            var d = new Date();
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
          }
        
          function dias(a, b) {
            if (!a || !b) { return null; }
            return Math.round((b.getTime() - a.getTime()) / DIA);
          }
        
          function chaveMes(d) {
            if (!d) { return ''; }
            var m = d.getMonth() + 1;
            return d.getFullYear() + '-' + (m < 10 ? '0' + m : String(m));
          }
        
          var NOMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                       'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        
          function nomeMes(chave) {
            var p = texto(chave).split('-');
            if (p.length < 2) { return texto(chave); }
            var i = Number(p[1]) - 1;
            return (NOMES[i] || p[1]) + '/' + String(p[0]).substring(2);
          }
        
          function fimDoMes(chave) {
            var p = texto(chave).split('-');
            return new Date(Number(p[0]), Number(p[1]), 0);
          }
        
          function inicioDoMes(chave) {
            var p = texto(chave).split('-');
            return new Date(Number(p[0]), Number(p[1]) - 1, 1);
          }
        
          function proximoMes(chave) {
            var p = texto(chave).split('-');
            var d = new Date(Number(p[0]), Number(p[1]), 1);
            return chaveMes(d);
          }
        
          function brl(v) {
            try {
              return 'R$ ' + num(v).toLocaleString('pt-BR',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } catch (e) { return 'R$ ' + num(v).toFixed(2); }
          }
        
          function primeiro(obj, campos) {
            var i;
            for (i = 0; i < campos.length; i++) {
              var v = obj[campos[i]];
              if (v !== undefined && v !== null && v !== '') { return v; }
            }
            return null;
          }
        
          /* ================================================================ *
           * leitura da obra, do plano e das pecas
           * ================================================================ */
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
        
          function lancamentos(obra) {
            if (!obra) { return []; }
            var of = obra.obraflow || obra.obraFlow || null;
            var lista = obra.centrosCusto || obra.custos ||
                        (of && of.centrosCusto ? of.centrosCusto : null) || [];
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
            if (v === null) { return null; }
            var n = num(v);
            if (n > 100) { n = 100; }
            if (n < 0) { n = 0; }
            return n;
          }
        
          function folhas(lista) {
            var pais = {};
            lista.forEach(function (t) {
              var id = primeiro(t, ['pai', 'paiId', 'idPai', 'parent', 'parentId']);
              if (id !== null) { pais[texto(id)] = 1; }
              var f = primeiro(t, ['fase', 'grupo', 'faseNome']);
              if (f) { pais[limpar(f)] = 1; }
            });
            return lista.filter(function (t) {
              if (ehFase(t)) { return false; }
              var meuId = texto(primeiro(t, ['id', 'codigo', 'chave']) || '');
              if (meuId && pais[meuId]) { return false; }
              if (pais[limpar(nome(t))]) { return false; }
              return true;
            });
          }
        
          function duracao(t) {
            var d = dias(inicio(t), fim(t));
            if (d === null) { return 0; }
            return d < 1 ? 1 : d;
          }
        
          function pesos(lista) {
            var somaCusto = 0, somaDur = 0, i;
            for (i = 0; i < lista.length; i++) {
              somaCusto = somaCusto + custoPrev(lista[i]);
              somaDur = somaDur + duracao(lista[i]);
            }
            if (somaCusto > 0) {
              return { criterio: 'custo previsto', peso: function (t) { return custoPrev(t); }, total: somaCusto };
            }
            if (somaDur > 0) {
              return { criterio: 'duracao em dias', peso: function (t) { return duracao(t); }, total: somaDur };
            }
            return { criterio: 'media simples', peso: function () { return 1; }, total: lista.length };
          }
        
          function areaUnit(i) { return num(i.larg) * num(i.alt); }
        
          function pecas(obra) {
            var lista = (obra && obra.itens) ? obra.itens : [];
            var total = 0, mapa = {}, semData = 0;
            lista.forEach(function (i) {
              var au = areaUnit(i);
              total = total + num(i.qtd) * au;
              var hist = (i.historicoInstalacao && i.historicoInstalacao.length)
                ? i.historicoInstalacao
                : (num(i.instalado) > 0 && (i.dataInstalacao || i.dataInstalado)
                    ? [{ data: i.dataInstalacao || i.dataInstalado, qtd: num(i.instalado) }]
                    : []);
              if (!hist.length && num(i.instalado) > 0) { semData = semData + num(i.instalado) * au; }
              hist.forEach(function (l) {
                var k = chaveMes(data(l.data));
                if (!k) { semData = semData + num(l.qtd) * au; return; }
                mapa[k] = (mapa[k] || 0) + num(l.qtd) * au;
              });
            });
            return { area: total, porMes: mapa, semData: semData };
          }
        
          /* ================================================================ *
           * a curva de avanco: previsto x realizado x instalacao
           * ================================================================ */
          function listaDeMeses(de, ate) {
            var fora = [];
            if (!de || !ate) { return fora; }
            var k = chaveMes(de), fimK = chaveMes(ate), guarda = 0;
            while (guarda < 240) {
              fora.push(k);
              if (k === fimK) { break; }
              k = proximoMes(k);
              guarda = guarda + 1;
            }
            return fora;
          }
        
          function fracaoPrevista(t, quando) {
            var a = inicio(t), b = fim(t);
            if (!b) { return null; }
            if (quando.getTime() >= b.getTime()) { return 1; }
            if (!a) { return 0; }
            if (quando.getTime() < a.getTime()) { return 0; }
            var total = duracao(t);
            if (total <= 0) { return 1; }
            var andado = dias(a, quando);
            var f = andado / total;
            if (f < 0) { f = 0; }
            if (f > 1) { f = 1; }
            return f;
          }
        
          function curva() {
            var obra = obraAtual();
            var lista = tarefas(obra);
            var r = {
              obra: obra ? texto(obra.nome || obra.titulo || '') : '',
              temPlano: lista.length > 0,
              criterio: '',
              meses: [],
              mesAtual: '',
              previstoHoje: 0,
              realizadoHoje: 0,
              instaladoHoje: 0,
              diferenca: 0,
              semDataDeFim: 0,
              semDataDeInstalacao: 0,
              areaContratada: 0
            };
            var pc = pecas(obra);
            r.areaContratada = pc.area;
            r.semDataDeInstalacao = pc.semData;
            if (!r.temPlano) { return r; }
        
            var pontas = folhas(lista).filter(function (t) { return !ehMarco(t); });
            var p = pesos(pontas);
            r.criterio = p.criterio;
        
            var h = hoje();
            r.mesAtual = chaveMes(h);
            var menor = null, maior = null, i;
            for (i = 0; i < pontas.length; i++) {
              var a = inicio(pontas[i]), b = fim(pontas[i]) || fimReal(pontas[i]);
              if (!b) { r.semDataDeFim = r.semDataDeFim + 1; }
              if (a && (!menor || a.getTime() < menor.getTime())) { menor = a; }
              if (b && (!maior || b.getTime() > maior.getTime())) { maior = b; }
              var fr = fimReal(pontas[i]);
              if (fr && (!maior || fr.getTime() > maior.getTime())) { maior = fr; }
            }
            if (!menor) { menor = h; }
            if (!maior || maior.getTime() < h.getTime()) { maior = h; }
        
            var meses = listaDeMeses(menor, maior);
            var acumInst = 0;
            meses.forEach(function (k) {
              var limite = fimDoMes(k);
              var passado = limite.getTime() <= h.getTime();
              var somaPrev = 0, somaReal = 0, j;
              for (j = 0; j < pontas.length; j++) {
                var t = pontas[j];
                var peso = p.peso(t);
                var fp = fracaoPrevista(t, limite);
                if (fp === null) { fp = 0; }
                somaPrev = somaPrev + fp * peso;
        
                var v = pct(t);
                if (v === null) { v = 0; }
                var fr = fimReal(t);
                if (fr && fr.getTime() <= limite.getTime()) {
                  somaReal = somaReal + (v >= 100 ? 100 : v) * peso / 100;
                } else if (!fr && k === r.mesAtual) {
                  somaReal = somaReal + v * peso / 100;
                }
              }
              acumInst = acumInst + num(pc.porMes[k]);
              var linha = {
                mes: k,
                rotulo: nomeMes(k),
                previsto: p.total > 0 ? Math.round((somaPrev / p.total) * 1000) / 10 : 0,
                realizado: null,
                instalado: null,
                passado: passado,
                atual: k === r.mesAtual
              };
              if (limite.getTime() <= fimDoMes(r.mesAtual).getTime()) {
                linha.realizado = p.total > 0 ? Math.round((somaReal / p.total) * 1000) / 10 : 0;
                if (pc.area > 0) { linha.instalado = Math.round((acumInst / pc.area) * 1000) / 10; }
              }
              r.meses.push(linha);
            });
        
            var atual = r.meses.filter(function (m) { return m.atual; })[0] ||
                        r.meses[r.meses.length - 1] || null;
            if (atual) {
              r.previstoHoje = atual.previsto;
              r.realizadoHoje = atual.realizado === null ? 0 : atual.realizado;
              r.instaladoHoje = atual.instalado === null ? 0 : atual.instalado;
              r.diferenca = Math.round((r.realizadoHoje - r.previstoHoje) * 10) / 10;
            }
            return r;
          }
        
          /* ================================================================ *
           * o dinheiro: previsto do plano x lancado no Centro de Custos
           * ================================================================ */
          function espalharCusto(t, mapa, avisos) {
            var valor = custoPrev(t);
            if (valor <= 0) { return; }
            var a = inicio(t), b = fim(t);
            if (!a && !b) { avisos.semData = avisos.semData + valor; return; }
            if (!a) { a = b; }
            if (!b) { b = a; }
            if (b.getTime() < a.getTime()) { var g = a; a = b; b = g; }
            var totalDias = (dias(a, b) || 0) + 1;
            var meses = listaDeMeses(a, b), i;
            if (!meses.length) { return; }
            for (i = 0; i < meses.length; i++) {
              var k = meses[i];
              var de = inicioDoMes(k), ate = fimDoMes(k);
              if (de.getTime() < a.getTime()) { de = a; }
              if (ate.getTime() > b.getTime()) { ate = b; }
              var d = (dias(de, ate) || 0) + 1;
              if (d < 0) { d = 0; }
              mapa[k] = (mapa[k] || 0) + valor * (d / totalDias);
            }
          }
        
          function mesDoLancamento(c) {
            var v = primeiro(c, ['data', 'dataDespesa', 'dataPagamento', 'dataLancamento',
                                 'dataCompra', 'dataNota', 'dt', 'vencimento', 'quando']);
            return chaveMes(data(v));
          }
        
          function custos() {
            var obra = obraAtual();
            var plano = tarefas(obra);
            var lista = lancamentos(obra);
            var r = {
              obra: obra ? texto(obra.nome || obra.titulo || '') : '',
              temPlano: plano.length > 0,
              temLancamento: lista.length > 0,
              meses: [],
              mesAtual: chaveMes(hoje()),
              previstoTotal: 0,
              lancadoTotal: 0,
              semDataNoPlano: 0,
              semDataNoLancamento: 0,
              atual: null
            };
        
            var avisos = { semData: 0 };
            var prev = {};
            folhas(plano).filter(function (t) { return !ehMarco(t); }).forEach(function (t) {
              espalharCusto(t, prev, avisos);
            });
            r.semDataNoPlano = Math.round(avisos.semData * 100) / 100;
        
            var real = {};
            lista.forEach(function (c) {
              var k = mesDoLancamento(c);
              var v = num(primeiro(c, ['valor', 'total', 'preco', 'quantia']));
              if (!k) { r.semDataNoLancamento = r.semDataNoLancamento + v; return; }
              real[k] = (real[k] || 0) + v;
            });
        
            var chaves = {};
            Object.keys(prev).forEach(function (k) { chaves[k] = 1; });
            Object.keys(real).forEach(function (k) { chaves[k] = 1; });
            var ord = Object.keys(chaves).sort();
            if (!ord.length) { return r; }
        
            var todos = listaDeMeses(inicioDoMes(ord[0]), fimDoMes(ord[ord.length - 1]));
            var acP = 0, acL = 0;
            todos.forEach(function (k) {
              var pv = Math.round(num(prev[k]) * 100) / 100;
              var lc = Math.round(num(real[k]) * 100) / 100;
              acP = acP + pv;
              acL = acL + lc;
              r.meses.push({
                mes: k, rotulo: nomeMes(k), previsto: pv, lancado: lc,
                diferenca: Math.round((lc - pv) * 100) / 100,
                acumuladoPrevisto: Math.round(acP * 100) / 100,
                acumuladoLancado: Math.round(acL * 100) / 100,
                atual: k === r.mesAtual
              });
            });
            r.previstoTotal = Math.round(acP * 100) / 100;
            r.lancadoTotal = Math.round(acL * 100) / 100;
            r.atual = r.meses.filter(function (m) { return m.atual; })[0] || null;
            return r;
          }
        
          /* mes que o Centro de Custos esta mostrando, quando der para saber */
          function mesEmFoco() {
            var alvos = ['custoMes', 'filtroMesCusto', 'mesCusto', 'custoFiltroMes'];
            var i;
            for (i = 0; i < alvos.length; i++) {
              var e = porId(alvos[i]);
              if (e && e.value) {
                var k = texto(e.value).match(/(\d{4})-(\d{2})/);
                if (k) { return k[1] + '-' + k[2]; }
              }
            }
            return chaveMes(hoje());
          }
        
          /* ================================================================ *
           * desenho: grafico quando a biblioteca existe, tabela quando nao
           * ================================================================ */
          var graficos = {};
        
          function temChart() { return typeof window.Chart === 'function'; }
        
          function corTexto() {
            try {
              return document.body && document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#334155';
            } catch (e) { return '#334155'; }
          }
        
          function cartao(id, titulo, dica, casa, antes) {
            var c = porId(id);
            if (c) { return c; }
            if (!casa) { return null; }
            c = document.createElement('div');
            c.id = id;
            c.className = 'p135-card';
            c.innerHTML = '<h4>' + esc(titulo) + '</h4>' +
                          '<p class="p135dica">' + esc(dica) + '</p>' +
                          '<div class="p135-corpo"></div>' +
                          '<p class="p135-frase" style="display:none"></p>';
            if (antes && antes.parentNode === casa) { casa.insertBefore(c, antes); }
            else if (antes === true && casa.firstChild) { casa.insertBefore(c, casa.firstChild); }
            else { casa.appendChild(c); }
            return c;
          }
        
          function corpo(id) {
            var c = porId(id);
            return c ? c.querySelector('.p135-corpo') : null;
          }
        
          function recado(id, msg) {
            var b = corpo(id);
            if (!b) { return; }
            if (graficos[id]) {
              try { graficos[id].destroy(); } catch (e) { }
              graficos[id] = null;
            }
            var novo = '<div class="p135-vazio">' + esc(msg) + '</div>';
            if (b.innerHTML !== novo) { b.innerHTML = novo; }
            frase(id, '', '');
          }
        
          function frase(id, msg, classe) {
            var c = porId(id);
            if (!c) { return; }
            var p = c.querySelector('.p135-frase');
            if (!p) { return; }
            if (!msg) { p.style.display = 'none'; p.textContent = ''; return; }
            p.style.display = '';
            p.className = 'p135-frase' + (classe ? ' ' + classe : '');
            if (p.textContent !== msg) { p.textContent = msg; }
          }
        
          function desenharLinhas(id, rotulos, series, sufixo) {
            var b = corpo(id);
            if (!b) { return; }
            if (temChart()) {
              var tela = b.querySelector('canvas');
              if (!tela) {
                b.innerHTML = '<div class="p135-tela"><canvas id="' + id + 'Cv"></canvas></div>';
                tela = b.querySelector('canvas');
              }
              if (graficos[id]) { try { graficos[id].destroy(); } catch (e) { } }
              try {
                graficos[id] = new window.Chart(tela.getContext('2d'), {
                  type: 'line',
                  data: {
                    labels: rotulos,
                    datasets: series.map(function (s) {
                      return {
                        label: s.nome, data: s.dados, borderColor: s.cor,
                        backgroundColor: s.cor, borderDash: s.tracejado ? [6, 4] : [],
                        borderWidth: 2, tension: .25, spanGaps: false,
                        pointRadius: 2, fill: false
                      };
                    })
                  },
                  options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: corTexto(), boxWidth: 12, font: { size: 11 } } } },
                    scales: {
                      x: { ticks: { color: corTexto(), font: { size: 10 } } },
                      y: { ticks: { color: corTexto(), font: { size: 10 } }, beginAtZero: true }
                    }
                  }
                });
              } catch (e) { desenharTabela(id, rotulos, series, sufixo); }
              return;
            }
            desenharTabela(id, rotulos, series, sufixo);
          }
        
          function desenharTabela(id, rotulos, series, sufixo) {
            var b = corpo(id);
            if (!b) { return; }
            var maior = 0;
            series.forEach(function (s) {
              s.dados.forEach(function (v) { if (num(v) > maior) { maior = num(v); } });
            });
            if (maior <= 0) { maior = 1; }
            var h = '<table class="p135-tab"><thead><tr><th>Mes</th>';
            series.forEach(function (s) { h = h + '<th>' + esc(s.nome) + '</th>'; });
            h = h + '</tr></thead><tbody>';
            rotulos.forEach(function (rot, i) {
              h = h + '<tr' + (series[0] && series[0].atual === i ? ' class="hoje"' : '') +
                      '><td>' + esc(rot) + '</td>';
              series.forEach(function (s, j) {
                var v = s.dados[i];
                var mostra = (v === null || v === undefined) ? '-' :
                  (sufixo === '%' ? (String(v) + '%') : brl(v));
                var larg = (v === null || v === undefined) ? 0 : Math.round((num(v) / maior) * 100);
                h = h + '<td>' + mostra + '<span class="p135-barra' + (j === 1 ? ' b2' : '') +
                        '" style="width:' + larg + '%"></span></td>';
              });
              h = h + '</tr>';
            });
            h = h + '</tbody></table>';
            if (b.innerHTML !== h) { b.innerHTML = h; }
          }
        
          /* ================================================================ *
           * quadro 1: a curva no Painel de Indicadores
           * ================================================================ */
          function casaDaCurva() {
            var g = document.querySelector('#tab-p118dash .p118-grade');
            if (g) { return { casa: g.parentNode || g, antes: g }; }
            var pane = porId('tab-p118dash') || porId('p118Dash');
            if (pane) { return { casa: pane, antes: null }; }
            var itens = porId('tab-itens');
            if (itens) { return { casa: itens, antes: true }; }
            return null;
          }
        
          function pintarCurva() {
            var onde = casaDaCurva();
            if (!onde) { return false; }
            var c = cartao('p135Curva', 'Curva de avanco: previsto x realizado',
              'Mes a mes, o que o cronograma mandava ter pronto e o que andou de verdade.',
              onde.casa, onde.antes);
            if (!c) { return false; }
        
            var r = curva();
            if (!r.temPlano) {
              recado('p135Curva', 'Esta obra ainda nao tem plano no ObraFlow. Cadastre as tarefas com data de inicio e fim para ver a curva.');
              return true;
            }
            if (!r.meses.length) {
              recado('p135Curva', 'O plano existe, mas as tarefas estao sem data. Preencha inicio e fim para a curva aparecer.');
              return true;
            }
        
            var rotulos = r.meses.map(function (m) { return m.rotulo; });
            var idxAtual = -1;
            r.meses.forEach(function (m, i) { if (m.atual) { idxAtual = i; } });
            var series = [
              { nome: 'Previsto', cor: '#0ea5e9', dados: r.meses.map(function (m) { return m.previsto; }), atual: idxAtual },
              { nome: 'Realizado', cor: '#f59e0b', dados: r.meses.map(function (m) { return m.realizado; }) },
              { nome: 'Instalacao', cor: '#10b981', tracejado: true, dados: r.meses.map(function (m) { return m.instalado; }) }
            ];
            desenharLinhas('p135Curva', rotulos, series, '%');
        
            var d = r.diferenca;
            var msg;
            var classe = '';
            if (d < -0.05) { msg = 'A obra esta ' + Math.abs(d) + ' pontos atras do plano'; classe = 'atras'; }
            else if (d > 0.05) { msg = 'A obra esta ' + d + ' pontos na frente do plano'; classe = 'frente'; }
            else { msg = 'A obra esta no ritmo do plano'; }
            msg = msg + ' (previsto ' + r.previstoHoje + '%, realizado ' + r.realizadoHoje +
                  '%, instalacao ' + r.instaladoHoje + '%). Peso por ' + r.criterio + '.';
            if (r.semDataDeFim > 0) {
              msg = msg + ' ' + r.semDataDeFim + ' tarefa(s) sem data de fim ficaram fora da conta do previsto.';
            }
            if (r.semDataDeInstalacao > 0) {
              msg = msg + ' Ha area instalada sem data de instalacao lancada.';
            }
            frase('p135Curva', msg, classe);
            return true;
          }
        
          /* ================================================================ *
           * quadro 2: previsto x lancado no Centro de Custos
           * ================================================================ */
          function casaDoCusto() {
            var area = porId('p120Area');
            if (area) { return { casa: area, antes: null }; }
            var pane = porId('tab-custo');
            if (pane) { return { casa: pane, antes: null }; }
            return null;
          }
        
          function pintarCusto() {
            var onde = casaDoCusto();
            if (!onde) { return false; }
            var c = cartao('p135Custo', 'Previsto do plano x lancado',
              'O custo que o cronograma previa para cada mes ao lado do que foi lancado no Centro de Custos.',
              onde.casa, onde.antes);
            if (!c) { return false; }
        
            var r = custos();
            if (!r.temPlano) {
              recado('p135Custo', 'Sem plano no ObraFlow nao existe custo previsto para comparar. Cadastre as tarefas com custo previsto e datas.');
              return true;
            }
            if (!r.meses.length) {
              recado('p135Custo', 'O plano nao tem custo previsto com data, e nao ha lancamento com data para comparar.');
              return true;
            }
        
            var foco = mesEmFoco();
            var idx = -1;
            r.meses.forEach(function (m, i) { if (m.mes === foco) { idx = i; } });
            var rotulos = r.meses.map(function (m) { return m.rotulo; });
            var series = [
              { nome: 'Previsto', cor: '#0ea5e9', dados: r.meses.map(function (m) { return m.previsto; }), atual: idx },
              { nome: 'Lancado', cor: '#f59e0b', dados: r.meses.map(function (m) { return m.lancado; }) }
            ];
            desenharLinhas('p135Custo', rotulos, series, 'R$');
        
            var m = idx >= 0 ? r.meses[idx] : (r.atual || r.meses[r.meses.length - 1]);
            var msg = 'Mes de ' + m.rotulo + ': previsto ' + brl(m.previsto) + ', lancado ' + brl(m.lancado) + '. ';
            var classe = '';
            if (m.diferenca > 0.005) { msg = msg + 'Gastou ' + brl(m.diferenca) + ' acima do previsto.'; classe = 'atras'; }
            else if (m.diferenca < -0.005) { msg = msg + 'Ficou ' + brl(Math.abs(m.diferenca)) + ' abaixo do previsto.'; classe = 'frente'; }
            else { msg = msg + 'Bateu com o previsto.'; }
            msg = msg + ' No plano inteiro: previsto ' + brl(r.previstoTotal) + ', lancado ' + brl(r.lancadoTotal) + '.';
            if (r.semDataNoPlano > 0) {
              msg = msg + ' ' + brl(r.semDataNoPlano) + ' de custo previsto esta em tarefa sem data e ficou fora dos meses.';
            }
            if (r.semDataNoLancamento > 0) {
              msg = msg + ' ' + brl(r.semDataNoLancamento) + ' de lancamento esta sem data.';
            }
            frase('p135Custo', msg, classe);
            return true;
          }
        
          /* ================================================================ *
           * vigia leve e atalhos de conferencia
           * ================================================================ */
          function visivel(e) {
            if (!e) { return false; }
            try {
              if (e.offsetParent) { return true; }
              var s = e.style || {};
              return s.display !== 'none';
            } catch (er) { return true; }
          }
        
          var ultimo = '';
        
          function assinatura() {
            var a = curva(), b = custos();
            return [a.obra, a.meses.length, a.previstoHoje, a.realizadoHoje, a.instaladoHoje,
                    b.meses.length, b.previstoTotal, b.lancadoTotal, mesEmFoco()].join('|');
          }
        
          function passo() {
            try {
              var s = assinatura();
              var faltaCurva = !porId('p135Curva');
              var faltaCusto = !porId('p135Custo');
              if (s === ultimo && !faltaCurva && !faltaCusto) { return; }
              ultimo = s;
              pintarCurva();
              if (visivel(porId('tab-custo')) || porId('p120Area') || faltaCusto) { pintarCusto(); }
            } catch (e) {
              try { console.warn('[P135]', e); } catch (e2) { }
            }
          }
        
          function verCurva() {
            var r = curva();
            if (!r.temPlano) { console.log('[P135] esta obra nao tem plano.'); return r; }
            console.log('[P135] curva da obra ' + r.obra + ' (peso por ' + r.criterio + ')');
            r.meses.forEach(function (m) {
              console.log('  ' + m.rotulo + ' | previsto ' + m.previsto + '% | realizado ' +
                          (m.realizado === null ? '-' : m.realizado + '%') + ' | instalacao ' +
                          (m.instalado === null ? '-' : m.instalado + '%') + (m.atual ? '  <- mes atual' : ''));
            });
            console.log('  hoje: previsto ' + r.previstoHoje + '% | realizado ' + r.realizadoHoje +
                        '% | diferenca ' + r.diferenca + ' pontos');
            if (r.semDataDeFim > 0) { console.log('  ATENCAO ' + r.semDataDeFim + ' tarefa(s) sem data de fim.'); }
            return r;
          }
        
          function verCustos() {
            var r = custos();
            if (!r.temPlano) { console.log('[P135] esta obra nao tem plano.'); return r; }
            console.log('[P135] dinheiro da obra ' + r.obra);
            r.meses.forEach(function (m) {
              console.log('  ' + m.rotulo + ' | previsto ' + brl(m.previsto) + ' | lancado ' +
                          brl(m.lancado) + ' | diferenca ' + brl(m.diferenca) + (m.atual ? '  <- mes atual' : ''));
            });
            console.log('  total: previsto ' + brl(r.previstoTotal) + ' | lancado ' + brl(r.lancadoTotal));
            if (r.semDataNoPlano > 0) { console.log('  ATENCAO custo previsto sem data: ' + brl(r.semDataNoPlano)); }
            if (r.semDataNoLancamento > 0) { console.log('  ATENCAO lancamento sem data: ' + brl(r.semDataNoLancamento)); }
            return r;
          }
        
          window.P135 = {
            curva: verCurva,
            custos: verCustos,
            dadosCurva: curva,
            dadosCustos: custos,
            atualizar: function () { ultimo = ''; passo(); return true; }
          };
        
          function comecar() {
            passo();
            window.setInterval(passo, 1500);
            try {
              console.log('[PATCH135] curva de avanco e custo previsto no ar. Use P135.curva(), P135.custos()');
            } catch (e) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { window.setTimeout(comecar, 600); });
          } else {
            window.setTimeout(comecar, 600);
          }
        }());
    
