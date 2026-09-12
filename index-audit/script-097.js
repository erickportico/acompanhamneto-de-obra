
        /* =====================================================================
         * PATCH 134 - ponte de leitura do Plano Mestre (nunca grava)
         * ===================================================================== */
        (function () {
          if (window.__p134) { return; }
          window.__p134 = true;
        
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
        
          function data(v) {
            var s = texto(v).trim();
            if (!s) { return null; }
            var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) { return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
            m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (m) { return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); }
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
        
          function comoData(d) {
            if (!d) { return '-'; }
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
          function baseFim(t) { return data(primeiro(t, ['baseFim', 'baselineFim', 'linhaBaseFim', 'fimBase'])); }
          function custoPrev(t) { return num(primeiro(t, ['custoPrevisto', 'custoPlanejado', 'orcado', 'custo'])); }
          function custoReal(t) { return num(primeiro(t, ['custoReal', 'realizado', 'gasto'])); }
        
          function pct(t) {
            var v = primeiro(t, ['percentual', 'percent', 'progresso', 'avanco', 'pct', 'concluido']);
            if (v === null) { return null; }
            var n = num(v);
            if (n > 100) { n = 100; }
            if (n < 0) { n = 0; }
            return n;
          }
        
          function fase(t, lista) {
            var pai = primeiro(t, ['fase', 'grupo', 'paiNome', 'faseNome']);
            if (pai) { return texto(pai); }
            var id = primeiro(t, ['pai', 'paiId', 'idPai', 'parent', 'parentId']);
            if (id !== null) {
              var achou = lista.filter(function (x) {
                return texto(primeiro(x, ['id', 'codigo', 'chave'])) === texto(id);
              })[0];
              if (achou) { return nome(achou); }
            }
            return 'Sem fase';
          }
        
          /* ================================================================ *
           * o resumo do plano (calculado na hora, nunca gravado)
           * ================================================================ */
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
            var a = inicio(t), b = fim(t);
            var d = dias(a, b);
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
        
          function resumo() {
            var obra = obraAtual();
            var lista = tarefas(obra);
            var r = {
              obra: obra ? texto(obra.nome || obra.titulo || '') : '',
              temPlano: lista.length > 0,
              tarefas: lista.length,
              avanco: 0,
              criterio: '',
              incompleto: false,
              motivos: [],
              fases: [],
              atrasadas: [],
              piorAtraso: 0,
              proximoMarco: null,
              terminoPrevisto: null,
              terminoBase: null,
              desvioDias: null,
              custoPrevisto: 0,
              custoReal: 0,
              concluidas: 0,
              emAndamento: 0,
              naoIniciadas: 0
            };
            if (!r.temPlano) { return r; }
        
            var pontas = folhas(lista).filter(function (t) { return !ehMarco(t); });
            var p = pesos(pontas);
            r.criterio = p.criterio;
        
            var soma = 0, h = hoje(), i;
            var porFase = {};
            for (i = 0; i < pontas.length; i++) {
              var t = pontas[i];
              var v = pct(t);
              if (v === null) { v = 0; r.incompleto = true; r.motivos.push(nome(t) + ': sem percentual'); }
              if (!fim(t)) { r.incompleto = true; r.motivos.push(nome(t) + ': sem data de fim'); }
              var peso = p.peso(t);
              soma = soma + v * peso;
              if (v >= 100) { r.concluidas = r.concluidas + 1; }
              else if (v > 0) { r.emAndamento = r.emAndamento + 1; }
              else { r.naoIniciadas = r.naoIniciadas + 1; }
        
              var nf = fase(t, lista);
              if (!porFase[nf]) { porFase[nf] = { nome: nf, soma: 0, peso: 0, tarefas: 0 }; }
              porFase[nf].soma = porFase[nf].soma + v * peso;
              porFase[nf].peso = porFase[nf].peso + peso;
              porFase[nf].tarefas = porFase[nf].tarefas + 1;
        
              var f = fim(t);
              if (f && v < 100 && !fimReal(t) && f.getTime() < h.getTime()) {
                var atraso = dias(f, h);
                r.atrasadas.push({ nome: nome(t), fim: f, dias: atraso, percentual: v });
                if (atraso > r.piorAtraso) { r.piorAtraso = atraso; }
              }
              if (f && (!r.terminoPrevisto || f.getTime() > r.terminoPrevisto.getTime())) { r.terminoPrevisto = f; }
              var bf = baseFim(t);
              if (bf && (!r.terminoBase || bf.getTime() > r.terminoBase.getTime())) { r.terminoBase = bf; }
              r.custoPrevisto = r.custoPrevisto + custoPrev(t);
              r.custoReal = r.custoReal + custoReal(t);
            }
        
            r.avanco = p.total > 0 ? Math.round((soma / p.total) * 10) / 10 : 0;
            r.fases = Object.keys(porFase).map(function (k) {
              var x = porFase[k];
              return {
                nome: x.nome, tarefas: x.tarefas,
                avanco: x.peso > 0 ? Math.round((x.soma / x.peso) * 10) / 10 : 0
              };
            }).sort(function (a, b) { return a.avanco - b.avanco; });
        
            r.atrasadas.sort(function (a, b) { return b.dias - a.dias; });
        
            var marcos = lista.filter(function (t) { return ehMarco(t); }).map(function (t) {
              var d = fim(t) || inicio(t);
              return { nome: nome(t), quando: d, percentual: pct(t) || 0, faltam: d ? dias(h, d) : null };
            }).filter(function (m) { return !!m.quando; }).sort(function (a, b) {
              return a.quando.getTime() - b.quando.getTime();
            });
            var futuros = marcos.filter(function (m) { return m.percentual < 100; });
            r.proximoMarco = futuros[0] || null;
            r.marcos = marcos;
        
            if (r.terminoPrevisto && r.terminoBase) {
              r.desvioDias = dias(r.terminoBase, r.terminoPrevisto);
            }
            if (r.incompleto) { r.motivos = r.motivos.slice(0, 8); }
            return r;
          }
        
          /* ================================================================ *
           * os tres cartoes
           * ================================================================ */
          function abrirPlano() {
            try {
              if (typeof window.trocarAba === 'function') {
                (window.trocarAba.__original || window.trocarAba)('obraflow');
                return true;
              }
            } catch (e) { }
            var bt = null;
            try {
              bt = document.querySelector('[data-aba="obraflow"], #btn-obraflow, #tabObraflow');
            } catch (e2) { bt = null; }
            if (bt) { try { bt.click(); return true; } catch (e2b) { } }
            var aba = porId('tab-obraflow');
            if (aba) {
              try {
                if (typeof aba.scrollIntoView === 'function') { aba.scrollIntoView({ behavior: 'smooth' }); }
              } catch (e3) { }
              return true;
            }
            return false;
          }
        
          function grade() {
            var g = document.querySelector('.p118-kpis');
            if (g) { return { alvo: g, solto: false }; }
            var minha = porId('p134Grade');
            if (minha) { return { alvo: minha, solto: true }; }
            var casa = porId('p118Dash') || porId('tab-itens') || porId('tab-geral');
            if (!casa) { return null; }
            minha = document.createElement('div');
            minha.id = 'p134Grade';
            if (casa.firstChild) { casa.insertBefore(minha, casa.firstChild); } else { casa.appendChild(minha); }
            return { alvo: minha, solto: true };
          }
        
          function cartao(id, classe, rotulo, solto) {
            var c = porId(id);
            if (c) { return c; }
            var g = grade();
            if (!g) { return null; }
            c = document.createElement('div');
            c.id = id;
            c.className = (g.solto ? 'p134-solto ' : 'p118-kpi ') + 'p134-kpi ' + classe;
            c.setAttribute('role', 'button');
            c.setAttribute('tabindex', '0');
            c.innerHTML = '<p class="p134rot"></p><p class="p134val">--</p><p class="p134pe"></p>';
            c.addEventListener('click', function () { abrirPlano(); });
            c.addEventListener('keydown', function (ev) {
              if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirPlano(); }
            });
            g.alvo.appendChild(c);
            var r = c.querySelector('.p134rot');
            if (r) { r.textContent = rotulo; }
            return c;
          }
        
          function preencher(id, valor, pe, aviso) {
            var c = porId(id);
            if (!c) { return; }
            var v = c.querySelector('.p134val');
            var p = c.querySelector('.p134pe');
            if (v && v.textContent !== valor) { v.textContent = valor; }
            if (p) {
              var h = texto(pe);
              if (aviso) { h = h + ' <span class="p134-aviso">' + aviso + '</span>'; }
              if (p.innerHTML !== h) { p.innerHTML = h; }
            }
            var rot = c.querySelector('.p134rot');
            if (rot) { c.setAttribute('aria-label', rot.textContent + ': ' + valor + '. Abrir Plano Mestre.'); }
          }
        
          function desenhar() {
            var c1 = cartao('p134Avanco', '', 'Avanco do Cronograma');
            if (!c1) { return false; }
            cartao('p134Atrasos', 'atraso', 'Atrasos');
            cartao('p134Marco', 'marco', 'Proximo marco');
        
            var r = resumo();
            if (!r.temPlano) {
              preencher('p134Avanco', 'sem plano', 'Clique para criar o cronograma desta obra.');
              preencher('p134Atrasos', '-', 'Sem plano para conferir.');
              preencher('p134Marco', '-', 'Sem marcos cadastrados.');
              return true;
            }
        
            var pe = 'peso por ' + r.criterio + ' \u00b7 ' + r.concluidas + ' pronta(s), ' +
                     r.emAndamento + ' andando, ' + r.naoIniciadas + ' a comecar';
            preencher('p134Avanco', String(r.avanco) + '%', pe, r.incompleto ? 'plano incompleto' : '');
        
            if (!r.atrasadas.length) {
              preencher('p134Atrasos', '0', 'Nenhuma tarefa fora do prazo. Termino previsto: ' +
                comoData(r.terminoPrevisto) + '.');
            } else {
              var extra = 'Pior: ' + r.atrasadas[0].nome + ', ' + r.piorAtraso + ' dia(s).';
              if (r.desvioDias !== null && r.desvioDias > 0) {
                extra = extra + ' Obra ' + r.desvioDias + ' dia(s) atras da linha de base.';
              } else if (r.desvioDias !== null && r.desvioDias < 0) {
                extra = extra + ' Obra ' + Math.abs(r.desvioDias) + ' dia(s) adiantada.';
              }
              preencher('p134Atrasos', String(r.atrasadas.length) + ' tarefa(s)', extra);
            }
        
            if (!r.proximoMarco) {
              preencher('p134Marco', 'nenhum', 'Todos os marcos do plano estao cumpridos.');
            } else {
              var m = r.proximoMarco;
              var quando = comoData(m.quando);
              var falta = m.faltam === null ? '' :
                (m.faltam < 0 ? ('venceu ha ' + Math.abs(m.faltam) + ' dia(s)')
                              : (m.faltam === 0 ? 'e hoje' : ('faltam ' + m.faltam + ' dia(s)')));
              preencher('p134Marco', m.nome, quando + (falta ? ' \u00b7 ' + falta : ''));
            }
            return true;
          }
        
          /* ================================================================ *
           * vigia leve e atalhos de conferencia
           * ================================================================ */
          var ultimo = '';
        
          function assinatura(r) {
            return [r.obra, r.tarefas, r.avanco, r.atrasadas.length, r.piorAtraso,
                    r.proximoMarco ? r.proximoMarco.nome : ''].join('|');
          }
        
          function passo() {
            try {
              var r = resumo();
              var a = assinatura(r);
              if (a === ultimo && porId('p134Avanco')) { return; }
              ultimo = a;
              desenhar();
            } catch (e) {
              try { console.warn('[P134]', e); } catch (e2) { }
            }
          }
        
          function verResumo() {
            var r = resumo();
            if (!r.temPlano) { console.log('[P134] esta obra nao tem plano.'); return r; }
            console.log('[P134] obra: ' + r.obra);
            console.log('  avanco do plano: ' + r.avanco + '% (peso por ' + r.criterio + ')');
            console.log('  tarefas: ' + r.tarefas + ' | prontas: ' + r.concluidas +
                        ' | andando: ' + r.emAndamento + ' | a comecar: ' + r.naoIniciadas);
            console.log('  atrasadas: ' + r.atrasadas.length + ' | pior atraso: ' + r.piorAtraso + ' dia(s)');
            console.log('  termino previsto: ' + comoData(r.terminoPrevisto) +
                        ' | linha de base: ' + comoData(r.terminoBase) +
                        (r.desvioDias === null ? '' : ' | desvio: ' + r.desvioDias + ' dia(s)'));
            console.log('  proximo marco: ' + (r.proximoMarco ? r.proximoMarco.nome + ' em ' +
                        comoData(r.proximoMarco.quando) : 'nenhum'));
            console.log('  custo do plano: previsto ' + r.custoPrevisto + ' | real ' + r.custoReal);
            if (r.incompleto) { console.log('  ATENCAO plano incompleto: ' + r.motivos.join(' / ')); }
            return r;
          }
        
          function verFases() {
            var r = resumo();
            r.fases.forEach(function (f) {
              console.log('  - ' + f.nome + ': ' + f.avanco + '% (' + f.tarefas + ' tarefa(s))');
            });
            return r.fases;
          }
        
          function verAtrasos() {
            var r = resumo();
            if (!r.atrasadas.length) { console.log('[P134] nenhuma tarefa fora do prazo.'); return []; }
            r.atrasadas.forEach(function (t) {
              console.log('  - ' + t.nome + ': venceu em ' + comoData(t.fim) + ', ' + t.dias +
                          ' dia(s), esta em ' + t.percentual + '%');
            });
            return r.atrasadas;
          }
        
          window.P134 = {
            resumo: verResumo,
            dados: resumo,
            fases: verFases,
            atrasos: verAtrasos,
            marcos: function () { return resumo().marcos || []; },
            atualizar: function () { ultimo = ''; passo(); return true; }
          };
        
          function comecar() {
            passo();
            window.setInterval(passo, 1200);
            try { console.log('[PATCH134] plano lido no painel. Use P134.resumo(), P134.fases(), P134.atrasos()'); }
            catch (e) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { window.setTimeout(comecar, 500); });
          } else {
            window.setTimeout(comecar, 500);
          }
        }());
    
