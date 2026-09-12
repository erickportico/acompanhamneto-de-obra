
        /* =====================================================================
         * PATCH 137 - custos visiveis + plano mestre no painel de indicadores
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.__p137) { return; }
          window.__p137 = true;
        
          function porId(x) { return document.getElementById(x); }
        
          function num(v) {
            if (typeof v === 'number') { return isFinite(v) ? v : 0; }
            var s = String(v === undefined || v === null ? '' : v).replace(/[^0-9,.-]/g, '');
            if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) { s = s.replace(/\./g, ''); }
            s = s.replace(',', '.');
            var n = Number(s);
            return isFinite(n) ? n : 0;
          }
        
          function esc(v) {
            return String(v === undefined || v === null ? '' : v)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }
        
          function moeda(v) {
            return 'R$ ' + num(v).toLocaleString('pt-BR',
              { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        
          function obraAtual() {
            try { if (typeof getObraAtual === 'function') { return getObraAtual(); } } catch (e) { }
            try {
              var b = window.db || null;
              if (b && b.obras && b.obras.length) {
                var a = b.obras.filter(function (o) { return o.id === b.obraAtualId; })[0];
                return a || b.obras[0];
              }
            } catch (e2) { }
            return null;
          }
        
          function data(v) {
            var s = String(v === undefined || v === null ? '' : v).trim();
            if (!s) { return null; }
            var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) { return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
            m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (m) { return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); }
            var d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
          }
        
          /* ================================================================ *
           * 1) centro de custos: dizer o que o filtro esta escondendo
           * ================================================================ */
          var CAMPOS = { obra: 'custoFilterObra', mes: 'custoFilterMes',
                         de: 'custoFilterDataDe', ate: 'custoFilterDataAte',
                         pde: 'custoFilterPeriodoDe', pate: 'custoFilterPeriodoAte' };
        
          function todosLancamentos() {
            var saida = [];
            try {
              var b = window.db || {};
              (b.obras || []).forEach(function (o) {
                (o.centrosCusto || []).forEach(function (c) {
                  saida.push({ obra: o.nome || '', c: c });
                });
              });
            } catch (e) { }
            return saida;
          }
        
          function noFiltro() {
            try {
              if (typeof window.getCustosFiltered === 'function') {
                return window.getCustosFiltered() || [];
              }
            } catch (e) { }
            return null;
          }
        
          function contas() {
            var todos = todosLancamentos();
            var somaTudo = 0, semData = [];
            todos.forEach(function (x) {
              somaTudo = somaTudo + num(x.c.valor);
              if (!data(x.c.data)) { semData.push(x); }
            });
            var vistos = noFiltro();
            var somaVista = 0;
            (vistos || []).forEach(function (c) { somaVista = somaVista + num(c.valor); });
            return {
              quantosTodos: todos.length,
              somaTodos: Math.round(somaTudo * 100) / 100,
              quantosVistos: vistos ? vistos.length : null,
              somaVistos: Math.round(somaVista * 100) / 100,
              semData: semData,
              mes: (porId(CAMPOS.mes) || {}).value || '',
              de: (porId(CAMPOS.de) || {}).value || '',
              ate: (porId(CAMPOS.ate) || {}).value || ''
            };
          }
        
          function limparFiltrosDeData() {
            var mudou = false;
            ['mes', 'de', 'ate', 'pde', 'pate'].forEach(function (k) {
              var el = porId(CAMPOS[k]);
              if (el && el.value) {
                el.value = '';
                mudou = true;
                try {
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (e) { }
              }
            });
            try { if (typeof window.initCustoTab === 'function') { window.initCustoTab(); } } catch (e2) { }
            try { if (typeof window.render === 'function') { window.render(); } } catch (e3) { }
            setTimeout(faixa, 120);
            return mudou;
          }
        
          function listaSemData(c) {
            if (!c.semData.length) { return '<p>Nenhum lancamento sem data. Otimo.</p>'; }
            var h = '<table><thead><tr><th>Obra</th><th>Categoria</th><th>Descricao</th><th>Valor</th></tr></thead><tbody>';
            c.semData.slice(0, 80).forEach(function (x) {
              h += '<tr><td>' + esc(x.obra) + '</td><td>' + esc(x.c.categoria || '') + '</td>' +
                   '<td>' + esc(x.c.descricao || '') + '</td><td>' + moeda(x.c.valor) + '</td></tr>';
            });
            h += '</tbody></table>';
            if (c.semData.length > 80) { h += '<p>mostrando os 80 primeiros.</p>'; }
            return h;
          }
        
          function ondeEncaixar() {
            var area = porId('p120Area');
            if (area && area.parentNode) { return { pai: area.parentNode, antes: area }; }
            var aba = porId('tab-custo');
            if (aba) { return { pai: aba, antes: aba.firstChild }; }
            return null;
          }
        
          function faixa() {
            var aba = porId('tab-custo');
            if (!aba || (aba.style && aba.style.display === 'none')) { return null; }
            var c = contas();
            var cx = porId('p137Faixa');
            if (!cx) {
              var lugar = ondeEncaixar();
              if (!lugar) { return null; }
              cx = document.createElement('div');
              cx.id = 'p137Faixa';
              lugar.pai.insertBefore(cx, lugar.antes);
            }
            var escondidos = (c.quantosVistos === null) ? 0 : (c.quantosTodos - c.quantosVistos);
            var calmo = (escondidos <= 0 && !c.semData.length);
            cx.className = calmo ? 'calmo' : '';
        
            var txt = 'Existem <b>' + c.quantosTodos + '</b> lancamento(s) somando <b>' +
                      moeda(c.somaTodos) + '</b>. ';
            if (c.quantosVistos === null) {
              txt += 'Nao consegui ler o filtro desta tela agora.';
            } else if (escondidos > 0) {
              txt += 'O filtro de agora mostra <b>' + c.quantosVistos + '</b> (' +
                     moeda(c.somaVistos) + '). Ficaram de fora <b>' + escondidos + '</b>';
              if (c.mes) { txt += ', porque o filtro de mes esta em <b>' + esc(c.mes) + '</b>'; }
              txt += '.';
            } else {
              txt += 'O filtro de agora mostra tudo.';
            }
            if (c.semData.length) {
              txt += ' <b>' + c.semData.length + '</b> lancamento(s) estao sem data: ' +
                     'lancamento sem data nunca aparece em filtro por mes.';
            }
        
            cx.innerHTML = '<div>' + txt + '</div>' +
              '<div class="p137-btns">' +
              '<button type="button" data-a="tudo">Ver todos os lancamentos</button>' +
              '<button type="button" class="lado" data-a="semdata">Ver os sem data</button>' +
              '<button type="button" class="lado" data-a="atualizar">Atualizar</button>' +
              '</div><div id="p137Lista"></div>';
        
            cx.querySelector('[data-a="tudo"]').addEventListener('click', function () {
              limparFiltrosDeData();
            });
            cx.querySelector('[data-a="atualizar"]').addEventListener('click', function () { faixa(); });
            cx.querySelector('[data-a="semdata"]').addEventListener('click', function () {
              var l = porId('p137Lista');
              if (!l) { return; }
              if (l.style.display === 'block') { l.style.display = 'none'; return; }
              l.innerHTML = listaSemData(c);
              l.style.display = 'block';
            });
            return c;
          }
        
          /* ================================================================ *
           * 2) o cartao do cronograma passa a ler o Plano Mestre
           * ================================================================ */
          function primeiro(o, campos) {
            var i;
            for (i = 0; i < campos.length; i++) {
              if (o && o[campos[i]] !== undefined && o[campos[i]] !== null && o[campos[i]] !== '') {
                return o[campos[i]];
              }
            }
            return '';
          }
        
          function tarefasDoPlano() {
            var obra = obraAtual();
            if (!obra) { return []; }
            var l = null;
            try {
              if (window.OF && window.OF.state && window.OF.state.tarefas && window.OF.state.tarefas.length) {
                l = window.OF.state.tarefas;
              }
            } catch (e) { }
            if (!l) {
              l = (obra.obraflow && obra.obraflow.tarefas) || obra.planoMestre ||
                  obra.ofTarefas || obra.tarefasPlano || null;
            }
            return (l && l.length) ? l : [];
          }
        
          function ehFase(t) {
            var v = String(primeiro(t, ['tipo', 'categoria']) || 'tarefa').toLowerCase();
            return v.indexOf('fase') >= 0 || v.indexOf('grupo') >= 0;
          }
        
          function ehMarco(t) {
            var v = String(primeiro(t, ['tipo', 'categoria']) || '').toLowerCase();
            return v.indexOf('marco') >= 0 || v.indexOf('milestone') >= 0;
          }
        
          function idDe(t) { return String(primeiro(t, ['id', 'codigo', 'chave']) || ''); }
          function paiDe(t) { return String(primeiro(t, ['pai', 'paiId', 'parent', 'parentId']) || ''); }
        
          function pontas(lista) {
            var temFilho = {};
            lista.forEach(function (t) { var p = paiDe(t); if (p) { temFilho[p] = 1; } });
            return lista.filter(function (t) {
              return !ehFase(t) && !temFilho[idDe(t)];
            });
          }
        
          function resumoPlano() {
            var lista = tarefasDoPlano();
            var r = { total: lista.length, pontas: 0, concluidas: 0, andamento: 0,
                      atrasadas: 0, aIniciar: 0, marcos: 0, semData: 0, semPct: 0,
                      semCusto: 0, avanco: 0 };
            if (!lista.length) { return r; }
            var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            var folhas = pontas(lista);
            var somaPeso = 0, somaFeito = 0;
            folhas.forEach(function (t) {
              if (ehMarco(t)) { r.marcos = r.marcos + 1; return; }
              r.pontas = r.pontas + 1;
              var ini = data(primeiro(t, ['inicio', 'dataInicio', 'start', 'inicioPrevisto']));
              var fim = data(primeiro(t, ['fim', 'dataFim', 'end', 'fimPrevisto', 'termino']));
              var real = data(primeiro(t, ['fimReal', 'dataFimReal', 'terminoReal']));
              var pct = num(primeiro(t, ['percentual', 'pct', 'avanco', 'progresso']));
              var custo = num(primeiro(t, ['custoPrevisto', 'custoPlanejado', 'orcado', 'custo']));
              if (!ini || !fim) { r.semData = r.semData + 1; }
              if (!pct && !real) { r.semPct = r.semPct + 1; }
              if (!custo) { r.semCusto = r.semCusto + 1; }
              var dias = (ini && fim) ? Math.max(1, Math.round((fim - ini) / 86400000) + 1) : 1;
              var peso = custo > 0 ? custo : dias;
              somaPeso = somaPeso + peso;
              var feito = real ? 100 : Math.max(0, Math.min(100, pct));
              somaFeito = somaFeito + peso * feito;
              if (real || pct >= 100) { r.concluidas = r.concluidas + 1; return; }
              if (fim && fim < hoje) { r.atrasadas = r.atrasadas + 1; return; }
              if (ini && ini > hoje) { r.aIniciar = r.aIniciar + 1; return; }
              r.andamento = r.andamento + 1;
            });
            r.avanco = somaPeso > 0 ? Math.round((somaFeito / somaPeso) * 10) / 10 : 0;
            return r;
          }
        
          function abrirPlano() {
            try {
              if (window.OF && typeof window.OF.abrir === 'function') { window.OF.abrir(); return true; }
              if (typeof window.trocarAba === 'function') { window.trocarAba('obraflow'); return true; }
            } catch (e) { }
            return false;
          }
        
          function cartaoDoPlano() {
            var tela = porId('p118cCrono');
            if (!tela) { return null; }
            var card = tela.parentNode;
            while (card && String(card.className || '').indexOf('p118-card') < 0) { card = card.parentNode; }
            if (!card) { return null; }
            var r = resumoPlano();
        
            var tit = card.getElementsByTagName('h4')[0];
            if (tit) { tit.textContent = 'Plano Mestre - situacao das tarefas'; }
            var dica = card.querySelector('.dica');
            if (dica) { dica.textContent = 'Vem do Plano Mestre (EAP), nao do cronograma antigo.'; }
        
            tela.style.display = 'none';
            var alvo = porId('p118cCronoVazio');
            if (!alvo) { return r; }
            alvo.style.display = 'block';
            alvo.style.height = 'auto';
        
            if (!r.total) {
              alvo.innerHTML = '<div>Esta obra ainda nao tem plano. ' +
                '<div class="p137-abre"><button type="button" id="p137AbrePlano">Abrir o Plano Mestre</button></div></div>';
            } else {
              var linhas = [
                ['Tarefas de ponta', r.pontas, ''],
                ['Concluidas', r.concluidas, ''],
                ['Em andamento', r.andamento, ''],
                ['Atrasadas', r.atrasadas, r.atrasadas ? 'al' : ''],
                ['A iniciar', r.aIniciar, ''],
                ['Marcos', r.marcos, ''],
                ['Avanco do plano', r.avanco + '%', '']
              ];
              var h = '<div style="width:100%"><table class="p137-plano">';
              linhas.forEach(function (l) {
                h += '<tr class="' + l[2] + '"><td>' + l[0] + '</td><td class="n">' + l[1] + '</td></tr>';
              });
              h += '</table>';
              var faltas = [];
              if (r.semData) { faltas.push(r.semData + ' sem data'); }
              if (r.semPct) { faltas.push(r.semPct + ' sem percentual'); }
              if (r.semCusto) { faltas.push(r.semCusto + ' sem custo previsto'); }
              if (faltas.length) {
                h += '<div class="p137-nota">Plano incompleto: ' + faltas.join(', ') +
                     '. Enquanto faltar isso, o avanco e o dinheiro do plano ficam mancos.</div>';
              }
              h += '<div class="p137-abre"><button type="button" id="p137AbrePlano">Abrir o Plano Mestre</button></div></div>';
              alvo.innerHTML = h;
            }
            var b = porId('p137AbrePlano');
            if (b) { b.addEventListener('click', abrirPlano); }
            return r;
          }
        
          /* ================================================================ *
           * 3) guardar a aba do cronograma Gantt (sem apagar nada)
           * ================================================================ */
          function esconderGantt(esconder) {
            var b = porId('btn-tab-cronograma');
            if (b) {
              if (esconder) {
                b.setAttribute('data-p137off', '1');
                b.style.setProperty('display', 'none', 'important');
              } else {
                b.removeAttribute('data-p137off');
                b.style.display = '';
              }
            }
            var itens = document.querySelectorAll('#meu-menu-abas [data-aba="cronograma"]');
            Array.prototype.forEach.call(itens, function (n) {
              n.style.display = esconder ? 'none' : '';
            });
            if (esconder) {
              var pane = porId('tab-cronograma');
              if (pane && pane.style && pane.style.display !== 'none') {
                pane.style.display = 'none';
                try { if (typeof window.trocarAba === 'function') { window.trocarAba('itens'); } } catch (e) { }
              }
            }
            return true;
          }
        
          /* ================================================================ *
           * 4) ligar e manter no lugar
           * ================================================================ */
          var pendente = null;
        
          function passar() {
            try { faixa(); } catch (e) { }
            try { cartaoDoPlano(); } catch (e2) { }
            try { esconderGantt(true); } catch (e3) { }
          }
        
          function olhar() {
            if (pendente) { return; }
            pendente = setTimeout(function () { pendente = null; passar(); }, 220);
          }
        
          window.P137 = {
            custos: function () { return contas(); },
            plano: function () { return resumoPlano(); },
            verTudo: limparFiltrosDeData,
            mostrarGantt: function () { return esconderGantt(false); },
            esconderGantt: function () { return esconderGantt(true); },
            atualizar: passar,
            conferir: function () {
              var c = contas();
              var p = resumoPlano();
              var d = {
                lancamentosNoTotal: c.quantosTodos,
                somaNoTotal: c.somaTodos,
                lancamentosNoFiltro: c.quantosVistos,
                somaNoFiltro: c.somaVistos,
                lancamentosSemData: c.semData.length,
                filtroDeMes: c.mes || '(vazio)',
                tarefasNoPlano: p.total,
                tarefasDePonta: p.pontas,
                avancoDoPlano: p.avanco,
                atrasadas: p.atrasadas,
                semData: p.semData,
                semPercentual: p.semPct,
                semCustoPrevisto: p.semCusto,
                ganttEscondido: !!(porId('btn-tab-cronograma') &&
                  porId('btn-tab-cronograma').getAttribute('data-p137off') === '1')
              };
              try { console.log('[P137]', d); } catch (e) { }
              return d;
            }
          };
        
          function ligar() {
            passar();
            try {
              if (window.MutationObserver && document.body) {
                var ob = new MutationObserver(function () { olhar(); });
                ob.observe(document.body, { childList: true, subtree: true });
                window.__p137Olho = ob;
              }
            } catch (e) { }
            try {
              document.addEventListener('change', function (ev) {
                var id = ev && ev.target ? String(ev.target.id || '') : '';
                if (id.indexOf('custoFilter') === 0) { olhar(); }
              }, true);
            } catch (e2) { }
            try {
              console.log('[PATCH137] custos visiveis e plano no painel. Use P137.conferir()');
            } catch (e3) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(ligar, 900); });
          } else {
            setTimeout(ligar, 900);
          }
        }());
    
