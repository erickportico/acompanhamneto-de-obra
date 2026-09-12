
        /* =====================================================================
         * PATCH 133 - leva o avanco real da producao para as tarefas do plano
         * ===================================================================== */
        (function () {
          if (window.__p133) { return; }
          window.__p133 = true;
        
          var CHAVE_MODO = 'p133Modo';
          var ORIGEM = 'producao';
          var estado = { modo: 'sugestao', aplicadas: 0, ultimoLote: [], desenhando: false };
        
          try {
            if (window.localStorage) {
              var g = localStorage.getItem(CHAVE_MODO);
              if (g === 'automatico' || g === 'sugestao') { estado.modo = g; }
            }
          } catch (e) { }
        
          function porId(x) { return document.getElementById(x); }
        
          function num(v) {
            var n = parseFloat(String(v === undefined || v === null ? 0 : v).replace(',', '.'));
            return isNaN(n) ? 0 : n;
          }
        
          function texto(v) { return String(v === undefined || v === null ? '' : v); }
        
          function limpar(s) {
            var t = texto(s).toLowerCase().trim();
            try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { }
            return t.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
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
        
          function itens(obra) {
            return (obra && obra.itens && obra.itens.length) ? obra.itens : [];
          }
        
          function ehMarco(t) {
            var tipo = limpar(t.tipo || t.categoria || '');
            return tipo.indexOf('marco') >= 0 || tipo.indexOf('milestone') >= 0;
          }
        
          function ehFase(t) {
            var tipo = limpar(t.tipo || t.categoria || '');
            return tipo.indexOf('fase') >= 0 || tipo.indexOf('grupo') >= 0;
          }
        
          function trancada(t) {
            if (t.p133Travar === true || t.travado === true || t.manual === true) { return true; }
            return limpar(t.origemPercentual || '') === 'manual';
          }
        
          function percentualDe(t) {
            var campos = ['percentual', 'percent', 'progresso', 'avanco', 'pct', 'concluido'];
            var i;
            for (i = 0; i < campos.length; i++) {
              if (t[campos[i]] !== undefined && t[campos[i]] !== null && t[campos[i]] !== '') {
                return num(t[campos[i]]);
              }
            }
            return 0;
          }
        
          function campoPercentual(t) {
            var campos = ['percentual', 'percent', 'progresso', 'avanco', 'pct', 'concluido'];
            var i;
            for (i = 0; i < campos.length; i++) {
              if (t[campos[i]] !== undefined) { return campos[i]; }
            }
            return 'percentual';
          }
        
          function nomeTarefa(t) {
            return texto(t.nome || t.titulo || t.descricao || t.tarefa || 'Tarefa sem nome');
          }
        
          /* ================================================================ *
           * avanco real das pecas, agrupado por localizacao
           * ================================================================ */
          function localizacaoDe(i) {
            return texto(i.localizacao || i.local || i.pavimento || i.setor || i.ambiente || '');
          }
        
          function areaUnit(i) { return num(i.larg) * num(i.alt); }
        
          function avancoPorLocalizacao(obra) {
            var mapa = {}, lista = itens(obra), k, j;
            for (j = 0; j < lista.length; j++) {
              var i = lista[j];
              var nome = localizacaoDe(i);
              var chave = limpar(nome);
              if (!chave) { chave = 'sem localizacao'; nome = 'Sem localizacao'; }
              if (!mapa[chave]) {
                mapa[chave] = { nome: nome, area: 0, areaInst: 0, pecas: 0, inst: 0 };
              }
              var au = areaUnit(i);
              var q = num(i.qtd);
              mapa[chave].area = mapa[chave].area + q * au;
              mapa[chave].areaInst = mapa[chave].areaInst + num(i.instalado) * au;
              mapa[chave].pecas = mapa[chave].pecas + q;
              mapa[chave].inst = mapa[chave].inst + num(i.instalado);
            }
            for (k in mapa) {
              if (!mapa.hasOwnProperty(k)) { continue; }
              var m = mapa[k];
              var base = m.area > 0 ? (m.areaInst / m.area) : (m.pecas > 0 ? (m.inst / m.pecas) : 0);
              m.percentual = Math.round(base * 1000) / 10;
              if (m.percentual > 100) { m.percentual = 100; }
              m.porArea = m.area > 0;
            }
            return mapa;
          }
        
          function vinculoManual(t) {
            var bruto = t.p133Locais || t.vinculoLocalizacoes || t.localizacoes || t.locais ||
                        t.localizacao || t.local || null;
            if (!bruto) { return []; }
            if (typeof bruto === 'string') { bruto = bruto.split(/[;,|]/); }
            if (!bruto.length) { return []; }
            var fora = [], i;
            for (i = 0; i < bruto.length; i++) {
              var c = limpar(bruto[i]);
              if (c) { fora.push(c); }
            }
            return fora;
          }
        
          function casar(t, mapa) {
            var chaves = Object.keys(mapa).filter(function (c) { return c !== 'sem localizacao'; });
            var manual = vinculoManual(t);
            if (manual.length) {
              var usados = manual.filter(function (c) { return mapa[c]; });
              if (usados.length) { return { locais: usados, confianca: 'manual' }; }
            }
            var alvo = limpar(nomeTarefa(t));
            if (!alvo) { return { locais: [], confianca: 'sem' }; }
            var exatos = chaves.filter(function (c) { return c === alvo; });
            if (exatos.length) { return { locais: exatos, confianca: 'seguro' }; }
            var dentro = chaves.filter(function (c) {
              return c.length > 2 && (alvo.indexOf(c) >= 0 || c.indexOf(alvo) >= 0);
            });
            if (dentro.length === 1) { return { locais: dentro, confianca: 'seguro' }; }
            if (dentro.length > 1) { return { locais: dentro, confianca: 'confira' }; }
            var palavras = alvo.split(' ').filter(function (p) { return p.length > 3; });
            var parecidos = chaves.filter(function (c) {
              var i;
              for (i = 0; i < palavras.length; i++) { if (c.indexOf(palavras[i]) >= 0) { return true; } }
              return false;
            });
            if (parecidos.length) { return { locais: parecidos, confianca: 'confira' }; }
            return { locais: [], confianca: 'sem' };
          }
        
          function juntar(locais, mapa) {
            var area = 0, areaInst = 0, pecas = 0, inst = 0, nomes = [], i;
            for (i = 0; i < locais.length; i++) {
              var m = mapa[locais[i]];
              if (!m) { continue; }
              area = area + m.area;
              areaInst = areaInst + m.areaInst;
              pecas = pecas + m.pecas;
              inst = inst + m.inst;
              nomes.push(m.nome);
            }
            var base = area > 0 ? (areaInst / area) : (pecas > 0 ? (inst / pecas) : 0);
            var p = Math.round(base * 1000) / 10;
            if (p > 100) { p = 100; }
            return { percentual: p, nomes: nomes, porArea: area > 0, pecas: pecas };
          }
        
          function calcular() {
            var obra = obraAtual();
            var mapa = avancoPorLocalizacao(obra);
            var lista = tarefas(obra), fora = [], i;
            for (i = 0; i < lista.length; i++) {
              var t = lista[i];
              if (!t || ehFase(t)) { continue; }
              var linha = {
                tarefa: t,
                nome: nomeTarefa(t),
                atual: percentualDe(t),
                campo: campoPercentual(t),
                marco: ehMarco(t),
                travada: trancada(t),
                origem: texto(t.p133Origem || '')
              };
              var c = casar(t, mapa);
              linha.confianca = c.confianca;
              if (c.locais.length) {
                var r = juntar(c.locais, mapa);
                linha.real = r.percentual;
                linha.locais = r.nomes.join(', ');
                linha.porArea = r.porArea;
                linha.pecas = r.pecas;
              } else {
                linha.real = null;
                linha.locais = '';
              }
              linha.mudaria = linha.real !== null && !linha.marco && !linha.travada &&
                              Math.abs(linha.real - linha.atual) >= 0.1;
              linha.podeSozinha = linha.mudaria &&
                                  (linha.confianca === 'seguro' || linha.confianca === 'manual');
              fora.push(linha);
            }
            return { obra: obra, linhas: fora, localizacoes: mapa };
          }
        
          /* ================================================================ *
           * gravar e desfazer
           * ================================================================ */
          function agora() {
            var d = new Date();
            function dd(n) { return n < 10 ? '0' + n : String(n); }
            return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
                   dd(d.getHours()) + ':' + dd(d.getMinutes());
          }
        
          function quemSou() {
            try {
              if (window.PainelNucleo && typeof window.PainelNucleo.sessao === 'function') {
                var s = window.PainelNucleo.sessao();
                if (s) { return texto(s.nome || s.usuario || 'usuario'); }
              }
              if (window.usuarioLogado && window.usuarioLogado.nome) { return texto(window.usuarioLogado.nome); }
            } catch (e) { }
            return 'usuario';
          }
        
          function gravarBase() {
            var nomes = ['salvarDB', 'salvarLocalComoBackup', 'sincronizarBancoNuvem'], i, ok = false;
            for (i = 0; i < nomes.length; i++) {
              var f = window[nomes[i]];
              if (typeof f === 'function') {
                try { (f.__original || f)(); ok = true; } catch (e) { }
              }
            }
            return ok;
          }
        
          function redesenharPlano() {
            var nomes = ['renderObraFlow', 'renderObraflow', 'desenharObraFlow', 'renderPlanoMestre'];
            var i;
            for (i = 0; i < nomes.length; i++) {
              var f = window[nomes[i]];
              if (typeof f === 'function') {
                try { (f.__original || f)(); return true; } catch (e) { }
              }
            }
            return false;
          }
        
          function aplicarLinha(linha) {
            if (!linha || !linha.mudaria) { return false; }
            var t = linha.tarefa;
            t.p133Anterior = linha.atual;
            t.p133Origem = ORIGEM;
            t.p133Quem = quemSou();
            t.p133Quando = agora();
            t[linha.campo] = linha.real;
            if (linha.real >= 100 && t.fimReal === undefined) { t.fimReal = null; }
            estado.aplicadas = estado.aplicadas + 1;
            return true;
          }
        
          function aplicar(soSeguras) {
            var r = calcular(), i, lote = [];
            for (i = 0; i < r.linhas.length; i++) {
              var linha = r.linhas[i];
              if (!linha.mudaria) { continue; }
              if (soSeguras && !linha.podeSozinha) { continue; }
              if (aplicarLinha(linha)) {
                lote.push({ tarefa: linha.tarefa, campo: linha.campo, antes: linha.atual });
              }
            }
            if (lote.length) {
              estado.ultimoLote = lote;
              gravarBase();
              redesenharPlano();
              desenhar();
            }
            return lote.length;
          }
        
          function desfazer() {
            var lote = estado.ultimoLote, i, n = 0;
            for (i = 0; i < lote.length; i++) {
              var x = lote[i];
              if (!x || !x.tarefa) { continue; }
              x.tarefa[x.campo] = x.antes;
              x.tarefa.p133Origem = 'desfeito';
              x.tarefa.p133Quando = agora();
              n = n + 1;
            }
            estado.ultimoLote = [];
            if (n) { gravarBase(); redesenharPlano(); desenhar(); }
            return n;
          }
        
          /* ================================================================ *
           * quadro no Plano Mestre
           * ================================================================ */
          function abaPlanoAberta() {
            var el = porId('tab-obraflow');
            if (!el) { return false; }
            try { return window.getComputedStyle(el).display !== 'none'; } catch (e) { return false; }
          }
        
          function quadro() {
            var q = porId('p133Quadro');
            if (q) { return q; }
            var aba = porId('tab-obraflow');
            if (!aba) { return null; }
            q = document.createElement('div');
            q.id = 'p133Quadro';
            if (aba.firstChild) { aba.insertBefore(q, aba.firstChild); } else { aba.appendChild(q); }
            return q;
          }
        
          function tag(conf) {
            if (conf === 'manual') { return '<span class="p133tag p133seguro">vinculo manual</span>'; }
            if (conf === 'seguro') { return '<span class="p133tag p133seguro">seguro</span>'; }
            if (conf === 'confira') { return '<span class="p133tag p133confira">confira</span>'; }
            return '<span class="p133tag p133sem">sem vinculo</span>';
          }
        
          function pct(v) { return (v === null || v === undefined) ? '-' : (String(v) + '%'); }
        
          function escapar(s) {
            return texto(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          }
        
          function desenhar() {
            if (estado.desenhando || !abaPlanoAberta()) { return; }
            estado.desenhando = true;
            try {
              var q = quadro();
              if (!q) { return; }
              var r = calcular();
              var linhas = r.linhas.filter(function (l) { return l.confianca !== 'sem' || l.atual > 0; });
              var mudam = r.linhas.filter(function (l) { return l.mudaria; });
              var seguras = r.linhas.filter(function (l) { return l.podeSozinha; });
        
              var h = '<h4>Avanco vindo da producao</h4>';
              h = h + '<div class="p133sub">' +
                (estado.modo === 'automatico'
                  ? 'Modo automatico: as tarefas seguras sao atualizadas sozinhas quando voce abre o plano.'
                  : 'Modo sugestao: nada e gravado sem o seu clique.') +
                ' Base: area instalada sobre area contratada de cada localizacao.</div>';
        
              if (!r.linhas.length) {
                h = h + '<div class="p133nada">Esta obra ainda nao tem tarefas no Plano Mestre.</div>';
              } else if (!linhas.length) {
                h = h + '<div class="p133nada">Nenhuma tarefa casou com as localizacoes das pecas. ' +
                  'Use o mesmo nome da localizacao na tarefa, ou escreva o vinculo a mao.</div>';
              } else {
                h = h + '<table><tr><th>Tarefa</th><th>Localizacao das pecas</th>' +
                  '<th class="num">No plano</th><th class="num">Na producao</th>' +
                  '<th>Casamento</th><th></th></tr>';
                linhas.forEach(function (l, idx) {
                  var obs = '';
                  if (l.marco) { obs = 'marco: nao recebe percentual'; }
                  else if (l.travada) { obs = 'tarefa manual: nao mexo'; }
                  else if (l.real === null) { obs = 'sem pecas ligadas'; }
                  else if (!l.mudaria) { obs = 'ja esta igual'; }
                  h = h + '<tr><td>' + escapar(l.nome) + '</td><td>' + escapar(l.locais || '-') +
                    '</td><td class="num">' + pct(l.atual) + '</td><td class="num">' + pct(l.real) +
                    '</td><td>' + tag(l.confianca) + '</td><td class="num">' +
                    (l.mudaria
                      ? '<button type="button" data-p133linha="' + idx + '">Aplicar</button>'
                      : '<span class="p133tag p133sem">' + escapar(obs) + '</span>') +
                    '</td></tr>';
                });
                h = h + '</table>';
              }
        
              h = h + '<div class="p133acoes">' +
                '<button type="button" id="p133Todas">Aplicar as ' + seguras.length + ' seguras</button>' +
                '<button type="button" id="p133TodasMesmo" class="fraco">Aplicar todas as ' +
                mudam.length + ' diferencas</button>' +
                '<button type="button" id="p133Desfazer" class="fraco">Desfazer</button>' +
                '<button type="button" id="p133Modo" class="fraco">Aplicar sozinho: ' +
                (estado.modo === 'automatico' ? 'ligado' : 'desligado') + '</button></div>';
        
              q.innerHTML = h;
        
              var bts = q.querySelectorAll('[data-p133linha]');
              var i;
              for (i = 0; i < bts.length; i++) {
                (function (bt) {
                  bt.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    var l = linhas[parseInt(bt.getAttribute('data-p133linha'), 10)];
                    if (aplicarLinha(l)) {
                      estado.ultimoLote = [{ tarefa: l.tarefa, campo: l.campo, antes: l.atual }];
                      gravarBase();
                      redesenharPlano();
                      desenhar();
                    }
                  });
                }(bts[i]));
              }
              var b1 = porId('p133Todas');
              if (b1) { b1.onclick = function () { aplicar(true); }; }
              var b2 = porId('p133TodasMesmo');
              if (b2) {
                b2.onclick = function () {
                  if (!mudam.length) { return; }
                  if (window.confirm('Vou gravar o percentual da producao em ' + mudam.length +
                      ' tarefa(s), inclusive as marcadas como "confira". Continuar?')) { aplicar(false); }
                };
              }
              var b3 = porId('p133Desfazer');
              if (b3) { b3.onclick = function () { desfazer(); }; }
              var b4 = porId('p133Modo');
              if (b4) { b4.onclick = function () { trocarModo(); }; }
            } finally {
              estado.desenhando = false;
            }
          }
        
          /* ================================================================ *
           * modo, vigia e atalhos de console
           * ================================================================ */
          function guardarModo() {
            try { if (window.localStorage) { localStorage.setItem(CHAVE_MODO, estado.modo); } }
            catch (e) { }
          }
        
          function modo(novo) {
            if (novo === undefined) { return estado.modo; }
            if (novo !== 'automatico' && novo !== 'sugestao') {
              try { console.warn('[P133] use P133.modo("automatico") ou P133.modo("sugestao")'); }
              catch (e) { }
              return estado.modo;
            }
            estado.modo = novo;
            guardarModo();
            if (novo === 'automatico') { aplicar(true); }
            desenhar();
            try { console.log('[P133] modo agora: ' + estado.modo); } catch (e2) { }
            return estado.modo;
          }
        
          function trocarModo() {
            if (estado.modo === 'automatico') { return modo('sugestao'); }
            if (!window.confirm('No modo automatico o painel grava sozinho o percentual real nas ' +
                'tarefas com casamento seguro, sempre que voce abrir o plano. As marcadas como ' +
                '"confira" continuam esperando o seu clique. Ligar?')) { return estado.modo; }
            return modo('automatico');
          }
        
          function ver() {
            var r = calcular();
            console.log('[P133] modo: ' + estado.modo + ' | tarefas lidas: ' + r.linhas.length);
            r.linhas.forEach(function (l) {
              console.log('  - ' + l.nome + ' | plano: ' + pct(l.atual) + ' | producao: ' + pct(l.real) +
                ' | ' + l.confianca + (l.mudaria ? ' | mudaria' : ''));
            });
            return r.linhas.map(function (l) {
              return {
                tarefa: l.nome, noPlano: l.atual, naProducao: l.real,
                casamento: l.confianca, mudaria: l.mudaria, localizacao: l.locais
              };
            });
          }
        
          function passo() {
            if (!abaPlanoAberta()) { return; }
            if (estado.modo === 'automatico' && !estado.autoFeito) {
              estado.autoFeito = true;
              var n = aplicar(true);
              if (n) { try { console.log('[P133] ' + n + ' tarefa(s) atualizadas pela producao.'); } catch (e) { } }
            }
            desenhar();
          }
        
          window.P133 = {
            ver: ver,
            aplicar: function (todas) { return aplicar(!todas); },
            desfazer: desfazer,
            modo: modo,
            localizacoes: function () {
              var m = avancoPorLocalizacao(obraAtual()), k, fora = [];
              for (k in m) {
                if (m.hasOwnProperty(k)) {
                  console.log('  - ' + m[k].nome + ': ' + m[k].percentual + '% (' + m[k].pecas + ' peca(s))');
                  fora.push({ nome: m[k].nome, percentual: m[k].percentual, pecas: m[k].pecas });
                }
              }
              return fora;
            },
            estado: function () { return estado; }
          };
        
          function comecar() {
            passo();
            window.setInterval(passo, 1500);
            try {
              console.log('[PATCH133] plano ligado a producao. Modo: ' + estado.modo +
                '. Use P133.ver(), P133.aplicar(), P133.desfazer(), P133.modo("automatico").');
            } catch (e) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { window.setTimeout(comecar, 400); });
          } else {
            window.setTimeout(comecar, 400);
          }
        }());
    
