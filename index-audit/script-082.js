
        /* ------------------------------------------------------------------ *
         * PATCH 118 - Painel de Indicadores (aba Dashboard)                    *
         * Somente leitura dos dados que ja existem. Nao altera contas.        *
         * Usa window.__varreduraUnica (sem criar timers novos).               *
         * ------------------------------------------------------------------ */
        (function () {
          'use strict';
          if (window.__p118Ativo) { return; }
          window.__p118Ativo = true;
        
          var ABA = 'p118dash';
          var ID_PANE = 'tab-' + ABA;
          var ID_BTN = 'btn-tab-' + ABA;
          var graficos = {};
          var precisaDesenhar = false;
        
          function porId(id) { return document.getElementById(id); }
          function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
        
          function moeda(v) {
            return 'R$ ' + num(v).toLocaleString('pt-BR',
              { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        
          function m2(v) {
            return num(v).toLocaleString('pt-BR',
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m\u00b2';
          }
        
          function pct(v) {
            return num(v).toLocaleString('pt-BR',
              { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
          }
        
          function escuro() {
            return document.body && document.body.classList.contains('dark-mode');
          }
        
          function corTexto() { return escuro() ? '#cbd5e1' : '#475569'; }
          function corGrade() { return escuro() ? 'rgba(255,255,255,.10)' : 'rgba(15,23,42,.08)'; }
        
          function obraAtual() {
            try {
              if (typeof getObraAtual === 'function') { return getObraAtual(); }
            } catch (e) { /* segue */ }
            try {
              var b = window.db || null;
              if (b && b.obras && b.obras.length) {
                var a = b.obras.filter(function (o) { return o.id === b.obraAtualId; })[0];
                return a || b.obras[0];
              }
            } catch (e2) { /* segue */ }
            return null;
          }
        
          function mesRotulo(chave) {
            var p = String(chave || '').split('-');
            if (p.length < 2) { return String(chave || ''); }
            var nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                         'jul', 'ago', 'set', 'out', 'nov', 'dez'];
            var i = parseInt(p[1], 10) - 1;
            return (nomes[i] || p[1]) + '/' + String(p[0]).slice(-2);
          }
        
          function chaveMes(texto) {
            var s = String(texto || '').trim();
            var m = s.match(/^(\d{4})-(\d{2})/);
            if (m) { return m[1] + '-' + m[2]; }
            m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (m) { return m[3] + '-' + m[2]; }
            return '';
          }
          /* ---------------- leitura dos dados (nunca escreve) ---------------- */
        
          function areaUnit(i) { return num(i.larg) * num(i.alt); }
        
          function resumoItens(obra) {
            var r = {
              pecas: 0, area: 0, fem: 0, fab: 0, inst: 0,
              areaInst: 0, areaFab: 0, areaFem: 0, tipos: {}
            };
            (obra && obra.itens ? obra.itens : []).forEach(function (i) {
              var au = areaUnit(i);
              var q = num(i.qtd);
              r.pecas += q;
              r.area += q * au;
              r.fem += num(i.fem);
              r.fab += num(i.fabricado);
              r.inst += num(i.instalado);
              r.areaFem += num(i.fem) * au;
              r.areaFab += num(i.fabricado) * au;
              r.areaInst += num(i.instalado) * au;
              var nome = String(i.tipo || i.descricao || 'Sem tipo').trim() || 'Sem tipo';
              if (!r.tipos[nome]) { r.tipos[nome] = { area: 0, inst: 0 }; }
              r.tipos[nome].area += q * au;
              r.tipos[nome].inst += num(i.instalado) * au;
            });
            return r;
          }
        
          /* instalacao com data: usa o historico do patch 36 quando existir */
          function instalacaoPorMes(obra) {
            var mapa = {};
            (obra && obra.itens ? obra.itens : []).forEach(function (i) {
              var au = areaUnit(i);
              var lista = [];
              if (i.historicoInstalacao && i.historicoInstalacao.length) {
                lista = i.historicoInstalacao;
              } else if (num(i.instalado) > 0 && i.dataInstalacao) {
                lista = [{ data: i.dataInstalacao, qtd: num(i.instalado) }];
              }
              lista.forEach(function (l) {
                var k = chaveMes(l.data);
                if (!k) { return; }
                if (!mapa[k]) { mapa[k] = { pecas: 0, area: 0 }; }
                mapa[k].pecas += num(l.qtd);
                mapa[k].area += num(l.qtd) * au;
              });
            });
            return mapa;
          }
        
          function medicoes(obra) {
            var maxMed = Math.max(1, num(obra && obra.numMedicaoMax) || 1);
            var res = resumoItens(obra);
            var valorServico = num(obra && obra.valorContrato) *
                               ((num(obra && obra.pctServico) || 20) / 100);
            var porM2 = res.area > 0 ? (valorServico / res.area) : 0;
            var linhas = [];
            var acM2 = 0, acValor = 0;
            for (var m = 1; m <= maxMed; m++) {
              var somaM2 = 0;
              (obra && obra.itens ? obra.itens : []).forEach(function (i) {
                var h = i.historicoMedicoes || {};
                somaM2 += num(h[m]);
              });
              acM2 += somaM2;
              var valor = somaM2 * porM2;
              acValor += valor;
              linhas.push({
                n: m, m2: somaM2, valor: valor,
                acM2: acM2, acValor: acValor, retencao: valor * 0.05
              });
            }
            return {
              linhas: linhas, porM2: porM2, valorServico: valorServico,
              areaTotal: res.area, acM2: acM2, acValor: acValor
            };
          }
        
          function recebimentos(obra) {
            var st = { Recebido: 0, Parcial: 0, Pendente: 0, Rejeitado: 0 };
            var mes = {};
            (obra && obra.recebimentos ? obra.recebimentos : []).forEach(function (r) {
              var s = String(r.status || 'Pendente').trim().toLowerCase();
              var chave = 'Pendente';
              if (s === 'recebido') { chave = 'Recebido'; }
              else if (s === 'parcial' || s === 'parcialmente recebido') { chave = 'Parcial'; }
              else if (s === 'rejeitado') { chave = 'Rejeitado'; }
              st[chave] += 1;
              var k = chaveMes(r.data);
              if (k) {
                if (!mes[k]) { mes[k] = { prev: 0, receb: 0 }; }
                mes[k].prev += num(r.qtdPrevista);
                mes[k].receb += num(r.qtdRecebida);
              }
            });
            return { status: st, mes: mes };
          }
        
          function custos(obra) {
            var porCat = {}, porMes = {}, total = 0, qtd = 0;
            var lista = (obra && obra.centrosCusto) ? obra.centrosCusto : [];
            lista.forEach(function (c) {
              var v = num(c.valor);
              total += v;
              qtd += 1;
              var cat = String(c.categoria || 'Sem categoria').trim() || 'Sem categoria';
              porCat[cat] = (porCat[cat] || 0) + v;
              var k = chaveMes(c.data);
              if (k) { porMes[k] = (porMes[k] || 0) + v; }
            });
            return { porCat: porCat, porMes: porMes, total: total, qtd: qtd };
          }
        
          function pagamentos(obra) {
            var porMes = {}, total = 0;
            (obra && obra.lancamentosProducao ? obra.lancamentosProducao : []).forEach(function (l) {
              var v = num(l.valorProf) + num(l.valorAjud);
              total += v;
              var k = String(l.mesAnoKey || '').match(/^\d{4}-\d{2}$/) ?
                      l.mesAnoKey : chaveMes(l.data);
              if (k) { porMes[k] = (porMes[k] || 0) + v; }
            });
            return { porMes: porMes, total: total };
          }
        
          function cronograma(obra) {
            var c = { concluidas: 0, andamento: 0, atrasadas: 0, aIniciar: 0, total: 0 };
            var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            (obra && obra.cronogramaTasks ? obra.cronogramaTasks : []).forEach(function (t) {
              c.total += 1;
              var ini = t.start ? new Date(String(t.start) + 'T00:00:00') : null;
              var fim = t.end ? new Date(String(t.end) + 'T00:00:00') : null;
              if (t.actualEnd) {
                var real = new Date(String(t.actualEnd) + 'T00:00:00');
                if (fim && real > fim) { c.atrasadas += 1; } else { c.concluidas += 1; }
                return;
              }
              if (fim && fim < hoje) { c.atrasadas += 1; return; }
              if (ini && ini > hoje) { c.aIniciar += 1; return; }
              c.andamento += 1;
            });
            return c;
          }
        
          function mesesOrdenados() {
            var visto = {};
            for (var a = 0; a < arguments.length; a++) {
              var obj = arguments[a] || {};
              for (var k in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, k)) { visto[k] = 1; }
              }
            }
            return Object.keys(visto).sort();
          }
          /* ---------------- monta a aba e o botao do menu ---------------- */
        
          var CARDS = [
            ['p118cAvanco', 'Avan\u00e7o geral da obra',
             'Quanto j\u00e1 foi liberado, fabricado e instalado (em m\u00b2).', 0],
            ['p118cCurva', 'Curva S da instala\u00e7\u00e3o',
             'Instalado no m\u00eas (barras) e acumulado (linha).', 1],
            ['p118cMedicoes', 'Medi\u00e7\u00f5es faturadas',
             'Valor de cada medi\u00e7\u00e3o e o acumulado.', 1],
            ['p118cFin', 'Contrato x faturado x saldo',
             'Onde est\u00e1 o dinheiro do servi\u00e7o.', 0],
            ['p118cReceb', 'Recebimento de materiais',
             'Situa\u00e7\u00e3o das listas lan\u00e7adas.', 0],
            ['p118cRecebMes', 'Material previsto x recebido por m\u00eas',
             'Comparativo das quantidades.', 0],
            ['p118cCrono', 'Cronograma da equipe',
             'Como est\u00e3o as tarefas cadastradas.', 0],
            ['p118cCustos', 'Custos por categoria',
             'Onde as despesas est\u00e3o concentradas.', 0],
            ['p118cCaixa', 'Custos e pagamentos por m\u00eas',
             'Despesas e m\u00e3o de obra ao longo do tempo.', 1],
            ['p118cTipos', 'Instala\u00e7\u00e3o por tipo de esquadria',
             'Os 8 tipos com maior \u00e1rea prevista.', 1]
          ];
        
          function htmlKpis() {
            var kpis = [
              ['p118kArea', 'c1', '\u00c1rea contratada', ''],
              ['p118kInst', 'c2', '\u00c1rea instalada', ''],
              ['p118kFab', 'c3', 'Fabrica\u00e7\u00e3o', ''],
              ['p118kFem', 'c4', 'Libera\u00e7\u00e3o (FEM)', ''],
              ['p118kFat', 'c6', 'Faturado (medi\u00e7\u00f5es)', ''],
              ['p118kSaldo', 'c5', 'Saldo a faturar', '']
            ];
            var h = '';
            kpis.forEach(function (k) {
              h += '<div class="p118-kpi ' + k[1] + '">' +
                   '<p class="p118-kpi-rot">' + k[2] + '</p>' +
                   '<p class="p118-kpi-val" id="' + k[0] + '">--</p>' +
                   '<p class="p118-kpi-pe" id="' + k[0] + 'Pe"></p>' +
                   '<div class="p118-barra" id="' + k[0] + 'Bar" style="display:none;">' +
                   '<i style="width:0%"></i></div>' +
                   '</div>';
            });
            return '<div class="p118-kpis">' + h + '</div>';
          }
        
          function htmlCards() {
            var h = '';
            CARDS.forEach(function (c) {
              h += '<div class="p118-card' + (c[3] ? ' larga' : '') + '">' +
                   '<h4>' + c[1] + '</h4>' +
                   '<p class="dica">' + c[2] + '</p>' +
                   '<div class="p118-tela"><canvas id="' + c[0] + '"></canvas>' +
                   '<div class="p118-vazio" id="' + c[0] + 'Vazio" style="display:none;"></div>' +
                   '</div></div>';
            });
            return '<div class="p118-grade">' + h + '</div>';
          }
        
          function montarPane() {
            var pane = porId(ID_PANE);
            if (pane) { return pane; }
            var refer = porId('tab-itens');
            if (!refer || !refer.parentNode) { return null; }
            pane = document.createElement('div');
            pane.id = ID_PANE;
            pane.className = refer.className || 'card';
            pane.style.display = 'none';
            pane.innerHTML =
              '<div class="p118-wrap">' +
              '<div class="p118-topo">' +
              '<div><h3 class="p118-titulo">Painel de Indicadores</h3>' +
              '<p class="p118-sub" id="p118Sub">Vis\u00e3o r\u00e1pida da obra selecionada.</p></div>' +
              '<span class="p118-espaco"></span>' +
              '<button type="button" class="p118-btn" id="p118Atualizar">\u21bb Atualizar</button>' +
              '</div>' +
              htmlKpis() + htmlCards() +
              '</div>';
            refer.parentNode.insertBefore(pane, refer);
            var bt = porId('p118Atualizar');
            if (bt) {
              bt.addEventListener('click', function () { desenhar(true); });
            }
            return pane;
          }
        
          function montarBotao() {
            if (porId(ID_BTN)) { return; }
            var caixa = document.querySelector('#meu-menu-abas .tabs');
            if (!caixa) { return; }
            var b = document.createElement('button');
            b.className = 'tab-btn';
            b.id = ID_BTN;
            b.type = 'button';
            b.textContent = '\uD83D\uDCC8 Painel de Indicadores';
            b.addEventListener('click', function () { abrirDash(); });
            caixa.insertBefore(b, caixa.firstChild);
          }
          /* ---------------- graficos ---------------- */
        
          function temChart() { return typeof window.Chart === 'function'; }
        
          function vazio(id, texto) {
            var v = porId(id + 'Vazio');
            var c = porId(id);
            if (graficos[id]) {
              try { graficos[id].destroy(); } catch (e) { /* ignora */ }
              graficos[id] = null;
            }
            if (c) { c.style.display = texto ? 'none' : 'block'; }
            if (v) {
              v.style.display = texto ? 'flex' : 'none';
              v.textContent = texto || '';
            }
          }
        
          function pintar(id, cfg) {
            if (!temChart()) { vazio(id, 'Sem conex\u00e3o para carregar os gr\u00e1ficos.'); return; }
            var c = porId(id);
            if (!c) { return; }
            vazio(id, '');
            cfg.options = cfg.options || {};
            cfg.options.responsive = true;
            cfg.options.maintainAspectRatio = false;
            cfg.options.animation = { duration: 350 };
            cfg.options.plugins = cfg.options.plugins || {};
            if (!cfg.options.plugins.legend) {
              cfg.options.plugins.legend = {
                labels: { color: corTexto(), boxWidth: 12, font: { size: 11 } }
              };
            } else if (cfg.options.plugins.legend.labels) {
              cfg.options.plugins.legend.labels.color = corTexto();
            }
            if (cfg.options.scales) {
              Object.keys(cfg.options.scales).forEach(function (k) {
                var s = cfg.options.scales[k] || {};
                s.ticks = s.ticks || {};
                s.ticks.color = corTexto();
                s.ticks.font = s.ticks.font || { size: 10 };
                s.grid = s.grid || {};
                if (s.grid.display !== false) { s.grid.color = corGrade(); }
                cfg.options.scales[k] = s;
              });
            }
            if (graficos[id]) {
              try { graficos[id].destroy(); } catch (e) { /* ignora */ }
            }
            try {
              graficos[id] = new window.Chart(c.getContext('2d'), cfg);
            } catch (e) {
              vazio(id, 'N\u00e3o foi poss\u00edvel desenhar este gr\u00e1fico.');
            }
          }
        
          var C = {
            azul: '#3b82f6', verde: '#10b981', laranja: '#f59e0b',
            roxo: '#8b5cf6', vermelho: '#ef4444', ciano: '#06b6d4',
            cinza: '#94a3b8', rosa: '#ec4899', lima: '#84cc16'
          };
        
          function eixoM2() {
            return {
              y: { beginAtZero: true, ticks: { callback: function (v) { return v; } } },
              x: {}
            };
          }
        
          function dica(sufixo) {
            return {
              callbacks: {
                label: function (ctx) {
                  var v = ctx.parsed && ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
                  var t = num(v).toLocaleString('pt-BR',
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return ' ' + (ctx.dataset.label || '') + ': ' +
                         (sufixo === 'R$' ? 'R$ ' + t : t + (sufixo || ''));
                }
              }
            };
          }
          function desenharAvanco(res) {
            if (res.area <= 0) {
              vazio('p118cAvanco', 'Cadastre os itens da obra para ver o avan\u00e7o.');
              return;
            }
            var falta = function (v) { return Math.max(0, res.area - v); };
            pintar('p118cAvanco', {
              type: 'bar',
              data: {
                labels: ['Libera\u00e7\u00e3o', 'Fabrica\u00e7\u00e3o', 'Instala\u00e7\u00e3o'],
                datasets: [
                  { label: 'Feito (m\u00b2)', data: [res.areaFem, res.areaFab, res.areaInst],
                    backgroundColor: [C.roxo, C.laranja, C.verde], borderRadius: 6, stack: 'a' },
                  { label: 'Falta (m\u00b2)',
                    data: [falta(res.areaFem), falta(res.areaFab), falta(res.areaInst)],
                    backgroundColor: 'rgba(148,163,184,.28)', borderRadius: 6, stack: 'a' }
                ]
              },
              options: {
                indexAxis: 'y',
                plugins: { tooltip: dica(' m\u00b2') },
                scales: { x: { stacked: true, beginAtZero: true }, y: { stacked: true } }
              }
            });
          }
        
          function desenharCurva(mapa) {
            var meses = mesesOrdenados(mapa);
            if (!meses.length) {
              vazio('p118cCurva', 'Lance as datas de instala\u00e7\u00e3o para ver a curva S.');
              return;
            }
            var mes = [], ac = [], soma = 0;
            meses.forEach(function (k) {
              var v = mapa[k].area;
              mes.push(Number(v.toFixed(2)));
              soma += v;
              ac.push(Number(soma.toFixed(2)));
            });
            pintar('p118cCurva', {
              type: 'bar',
              data: {
                labels: meses.map(mesRotulo),
                datasets: [
                  { label: 'No m\u00eas (m\u00b2)', data: mes, backgroundColor: C.azul,
                    borderRadius: 6, order: 2 },
                  { label: 'Acumulado (m\u00b2)', data: ac, type: 'line', borderColor: C.verde,
                    backgroundColor: 'rgba(16,185,129,.18)', borderWidth: 2, fill: true,
                    tension: .35, pointRadius: 3, yAxisID: 'y1', order: 1 }
                ]
              },
              options: {
                plugins: { tooltip: dica(' m\u00b2') },
                scales: {
                  y: { beginAtZero: true },
                  y1: { beginAtZero: true, position: 'right', grid: { display: false } },
                  x: {}
                }
              }
            });
          }
        
          function desenharMedicoes(med) {
            var linhas = med.linhas.filter(function (l) { return l.m2 > 0 || l.valor > 0; });
            if (!linhas.length) {
              vazio('p118cMedicoes', 'Nenhuma medi\u00e7\u00e3o lan\u00e7ada ainda.');
              return;
            }
            pintar('p118cMedicoes', {
              type: 'bar',
              data: {
                labels: linhas.map(function (l) { return 'Med. ' + l.n; }),
                datasets: [
                  { label: 'Valor da medi\u00e7\u00e3o', data: linhas.map(function (l) {
                      return Number(l.valor.toFixed(2)); }),
                    backgroundColor: C.ciano, borderRadius: 6, order: 2 },
                  { label: 'Acumulado', type: 'line', data: linhas.map(function (l) {
                      return Number(l.acValor.toFixed(2)); }),
                    borderColor: C.roxo, borderWidth: 2, tension: .3, pointRadius: 3,
                    fill: false, order: 1 }
                ]
              },
              options: { plugins: { tooltip: dica('R$') }, scales: eixoM2() }
            });
          }
        
          function desenharFin(med) {
            if (med.valorServico <= 0) {
              vazio('p118cFin', 'Informe o valor do contrato para ver o financeiro.');
              return;
            }
            var saldo = Math.max(0, med.valorServico - med.acValor);
            pintar('p118cFin', {
              type: 'doughnut',
              data: {
                labels: ['Faturado', 'Saldo a faturar'],
                datasets: [{ data: [Number(med.acValor.toFixed(2)), Number(saldo.toFixed(2))],
                  backgroundColor: [C.verde, 'rgba(148,163,184,.35)'], borderWidth: 0 }]
              },
              options: {
                cutout: '62%',
                plugins: {
                  legend: { position: 'bottom',
                    labels: { color: corTexto(), boxWidth: 12, font: { size: 11 } } },
                  tooltip: {
                    callbacks: {
                      label: function (ctx) {
                        return ' ' + ctx.label + ': ' + moeda(ctx.parsed);
                      }
                    }
                  }
                }
              }
            });
          }
        
          function desenharReceb(rec) {
            var rot = ['Recebido', 'Parcial', 'Pendente', 'Rejeitado'];
            var dados = rot.map(function (k) { return rec.status[k] || 0; });
            var soma = dados.reduce(function (a, b) { return a + b; }, 0);
            if (!soma) {
              vazio('p118cReceb', 'Nenhum recebimento lan\u00e7ado.');
              return;
            }
            pintar('p118cReceb', {
              type: 'doughnut',
              data: {
                labels: rot,
                datasets: [{ data: dados,
                  backgroundColor: [C.verde, C.laranja, C.cinza, C.vermelho], borderWidth: 0 }]
              },
              options: {
                cutout: '55%',
                plugins: { legend: { position: 'bottom',
                  labels: { color: corTexto(), boxWidth: 12, font: { size: 11 } } } }
              }
            });
          }
        
          function desenharRecebMes(rec) {
            var meses = mesesOrdenados(rec.mes);
            if (!meses.length) {
              vazio('p118cRecebMes', 'Sem datas nos recebimentos.');
              return;
            }
            pintar('p118cRecebMes', {
              type: 'bar',
              data: {
                labels: meses.map(mesRotulo),
                datasets: [
                  { label: 'Previsto', data: meses.map(function (k) { return rec.mes[k].prev; }),
                    backgroundColor: 'rgba(148,163,184,.55)', borderRadius: 5 },
                  { label: 'Recebido', data: meses.map(function (k) { return rec.mes[k].receb; }),
                    backgroundColor: C.azul, borderRadius: 5 }
                ]
              },
              options: { plugins: { tooltip: dica('') }, scales: eixoM2() }
            });
          }
        
          function desenharCrono(cr) {
            if (!cr.total) {
              vazio('p118cCrono', 'Nenhuma tarefa cadastrada na gest\u00e3o de obra.');
              return;
            }
            pintar('p118cCrono', {
              type: 'polarArea',
              data: {
                labels: ['Conclu\u00eddas', 'Em andamento', 'Atrasadas', 'A iniciar'],
                datasets: [{ data: [cr.concluidas, cr.andamento, cr.atrasadas, cr.aIniciar],
                  backgroundColor: ['rgba(16,185,129,.75)', 'rgba(59,130,246,.75)',
                    'rgba(239,68,68,.75)', 'rgba(148,163,184,.6)'], borderWidth: 0 }]
              },
              options: {
                plugins: { legend: { position: 'bottom',
                  labels: { color: corTexto(), boxWidth: 12, font: { size: 11 } } } },
                scales: { r: { ticks: { display: false }, grid: { color: corGrade() } } }
              }
            });
          }
        
          function desenharCustos(cu) {
            var cats = Object.keys(cu.porCat).sort(function (a, b) {
              return cu.porCat[b] - cu.porCat[a];
            }).slice(0, 8);
            if (!cats.length) {
              vazio('p118cCustos', 'Nenhuma despesa lan\u00e7ada no centro de custos.');
              return;
            }
            var cores = [C.azul, C.verde, C.laranja, C.roxo, C.vermelho, C.ciano, C.rosa, C.lima];
            pintar('p118cCustos', {
              type: 'bar',
              data: {
                labels: cats,
                datasets: [{ label: 'Despesas',
                  data: cats.map(function (c) { return Number(cu.porCat[c].toFixed(2)); }),
                  backgroundColor: cats.map(function (c, i) { return cores[i % cores.length]; }),
                  borderRadius: 6 }]
              },
              options: {
                indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: dica('R$') },
                scales: { x: { beginAtZero: true }, y: {} }
              }
            });
          }
        
          function desenharCaixa(cu, pg) {
            var meses = mesesOrdenados(cu.porMes, pg.porMes);
            if (!meses.length) {
              vazio('p118cCaixa', 'Sem despesas ou pagamentos com data.');
              return;
            }
            pintar('p118cCaixa', {
              type: 'line',
              data: {
                labels: meses.map(mesRotulo),
                datasets: [
                  { label: 'Despesas', data: meses.map(function (k) {
                      return Number((cu.porMes[k] || 0).toFixed(2)); }),
                    borderColor: C.vermelho, backgroundColor: 'rgba(239,68,68,.15)',
                    borderWidth: 2, fill: true, tension: .3, pointRadius: 3 },
                  { label: 'M\u00e3o de obra', data: meses.map(function (k) {
                      return Number((pg.porMes[k] || 0).toFixed(2)); }),
                    borderColor: C.laranja, backgroundColor: 'rgba(245,158,11,.15)',
                    borderWidth: 2, fill: true, tension: .3, pointRadius: 3 }
                ]
              },
              options: { plugins: { tooltip: dica('R$') }, scales: eixoM2() }
            });
          }
        
          function desenharTipos(res) {
            var nomes = Object.keys(res.tipos).sort(function (a, b) {
              return res.tipos[b].area - res.tipos[a].area;
            }).slice(0, 8);
            if (!nomes.length) {
              vazio('p118cTipos', 'Cadastre os itens para ver os tipos.');
              return;
            }
            pintar('p118cTipos', {
              type: 'bar',
              data: {
                labels: nomes,
                datasets: [
                  { label: 'Previsto (m\u00b2)', data: nomes.map(function (n) {
                      return Number(res.tipos[n].area.toFixed(2)); }),
                    backgroundColor: 'rgba(148,163,184,.5)', borderRadius: 5 },
                  { label: 'Instalado (m\u00b2)', data: nomes.map(function (n) {
                      return Number(res.tipos[n].inst.toFixed(2)); }),
                    backgroundColor: C.verde, borderRadius: 5 }
                ]
              },
              options: { plugins: { tooltip: dica(' m\u00b2') }, scales: eixoM2() }
            });
          }
          /* ---------------- KPIs ---------------- */
        
          function porKpi(id, valor, pe, pctBarra) {
            var v = porId(id);
            var p = porId(id + 'Pe');
            var b = porId(id + 'Bar');
            if (v) { v.textContent = valor; }
            if (p) { p.textContent = pe || ''; }
            if (b) {
              if (pctBarra === null || pctBarra === undefined) {
                b.style.display = 'none';
              } else {
                b.style.display = 'block';
                var i = b.firstChild;
                if (i && i.style) {
                  i.style.width = Math.max(0, Math.min(100, num(pctBarra))).toFixed(1) + '%';
                }
              }
            }
          }
        
          function atualizarKpis(obra, res, med) {
            var sub = porId('p118Sub');
            if (sub) {
              var nome = obra && obra.nome ? String(obra.nome) : 'Obra';
              sub.textContent = 'Obra: ' + nome + '  \u00b7  ' +
                res.pecas.toLocaleString('pt-BR') + ' pe\u00e7as cadastradas';
            }
            var pFem = res.area > 0 ? (res.areaFem / res.area) * 100 : 0;
            var pFab = res.area > 0 ? (res.areaFab / res.area) * 100 : 0;
            var pInst = res.area > 0 ? (res.areaInst / res.area) * 100 : 0;
            var pFat = med.valorServico > 0 ? (med.acValor / med.valorServico) * 100 : 0;
            var saldo = Math.max(0, med.valorServico - med.acValor);
        
            porKpi('p118kArea', m2(res.area),
              res.pecas.toLocaleString('pt-BR') + ' pe\u00e7as', null);
            porKpi('p118kInst', m2(res.areaInst), pct(pInst) + ' da obra', pInst);
            porKpi('p118kFab', pct(pFab),
              res.fab.toLocaleString('pt-BR') + ' de ' + res.pecas.toLocaleString('pt-BR') +
              ' pe\u00e7as', pFab);
            porKpi('p118kFem', pct(pFem),
              res.fem.toLocaleString('pt-BR') + ' de ' + res.pecas.toLocaleString('pt-BR') +
              ' pe\u00e7as', pFem);
            porKpi('p118kFat', moeda(med.acValor), pct(pFat) + ' do servi\u00e7o', pFat);
            porKpi('p118kSaldo', moeda(saldo),
              'Servi\u00e7o total: ' + moeda(med.valorServico), null);
          }
        
          /* ---------------- desenho geral ---------------- */
        
          function visivel() {
            var pane = porId(ID_PANE);
            return !!(pane && pane.style.display !== 'none' && pane.offsetParent !== null);
          }
        
          function desenhar(forcar) {
            if (!forcar && !visivel()) { precisaDesenhar = true; return; }
            var obra = obraAtual();
            if (!obra) { return; }
            precisaDesenhar = false;
            var res = resumoItens(obra);
            var med = medicoes(obra);
            var rec = recebimentos(obra);
            var cu = custos(obra);
            var pg = pagamentos(obra);
            var cr = cronograma(obra);
            var inst = instalacaoPorMes(obra);
        
            atualizarKpis(obra, res, med);
            try { desenharAvanco(res); } catch (e) { vazio('p118cAvanco', 'Erro ao desenhar.'); }
            try { desenharCurva(inst); } catch (e) { vazio('p118cCurva', 'Erro ao desenhar.'); }
            try { desenharMedicoes(med); } catch (e) { vazio('p118cMedicoes', 'Erro ao desenhar.'); }
            try { desenharFin(med); } catch (e) { vazio('p118cFin', 'Erro ao desenhar.'); }
            try { desenharReceb(rec); } catch (e) { vazio('p118cReceb', 'Erro ao desenhar.'); }
            try { desenharRecebMes(rec); } catch (e) { vazio('p118cRecebMes', 'Erro ao desenhar.'); }
            try { desenharCrono(cr); } catch (e) { vazio('p118cCrono', 'Erro ao desenhar.'); }
            try { desenharCustos(cu); } catch (e) { vazio('p118cCustos', 'Erro ao desenhar.'); }
            try { desenharCaixa(cu, pg); } catch (e) { vazio('p118cCaixa', 'Erro ao desenhar.'); }
            try { desenharTipos(res); } catch (e) { vazio('p118cTipos', 'Erro ao desenhar.'); }
          }
        
          function esconderOutras(alvo) {
            var todas = document.querySelectorAll('[id^="tab-"]');
            Array.prototype.forEach.call(todas, function (el) {
              if (el.id !== alvo) { el.style.display = 'none'; }
            });
            var bts = document.querySelectorAll('#meu-menu-abas .tabs .tab-btn');
            Array.prototype.forEach.call(bts, function (b) { b.classList.remove('active'); });
          }
        
          function abrirDash() {
            var pane = montarPane();
            if (!pane) { return; }
            var menu = porId('meu-menu-abas');
            if (menu) { menu.removeAttribute('open'); }
            esconderOutras(ID_PANE);
            pane.style.display = 'block';
            var b = porId(ID_BTN);
            if (b) { b.classList.add('active'); }
            desenhar(true);
            try { pane.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { /* ignora */ }
          }
        
          window.p118AbrirDashboard = abrirDash;
          window.p118Atualizar = function () { desenhar(true); };
        
          /* fecha o painel quando o usuario troca para outra aba do sistema */
          function embrulharTrocarAba() {
            if (window.__p118Aba) { return; }
            var antiga = window.trocarAba;
            if (typeof antiga !== 'function') { return; }
            window.__p118Aba = true;
            window.trocarAba = function (aba) {
              var pane = porId(ID_PANE);
              if (pane) { pane.style.display = 'none'; }
              var b = porId(ID_BTN);
              if (b) { b.classList.remove('active'); }
              return antiga.apply(this, arguments);
            };
          }
        
          /* redesenha depois que o sistema salva/recalcula, sem criar timers novos */
          function embrulharRender() {
            if (window.__p118Render) { return; }
            var antiga = window.render;
            if (typeof antiga !== 'function') { return; }
            window.__p118Render = true;
            window.render = function () {
              var r = antiga.apply(this, arguments);
              try { if (visivel()) { desenhar(true); } } catch (e) { /* ignora */ }
              return r;
            };
          }
        
          function iniciar() {
            montarBotao();
            montarPane();
            embrulharTrocarAba();
            embrulharRender();
            if (window.__varreduraUnica) {
              window.__varreduraUnica(function () {
                montarBotao();
                if (precisaDesenhar && visivel()) { desenhar(true); }
              });
            }
            window.addEventListener('beforeprint', function () {
              if (visivel()) { desenhar(true); }
            });
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
