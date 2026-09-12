
        /* PATCH90_ANTITRAVA_GERAL_OK */
        (function () {
          'use strict';
        
          if (window.__p90Pronto) { return; }
          window.__p90Pronto = true;
        
          var JANELA = 2000;     /* tamanho da janela de medicao, em ms */
          var TETO_MS = 700;     /* tempo maximo de CPU por vigia dentro da janela */
          var ESPERA = 300;      /* descanso minimo entre duas execucoes de um vigia amplo */
          var ATRASO = 60;       /* agrupa varias mudancas seguidas numa so execucao */
          var registros = [];
        
          function resumo(fn) {
            var t = '';
            try { t = String(fn); } catch (e) { t = '(sem codigo)'; }
            t = t.replace(/[\r\n\t]+/g, ' ').replace(/\s\s+/g, ' ');
            return t.slice(0, 160);
          }
        
          function agora() {
            try { return Date.now(); } catch (e) { return new Date().getTime(); }
          }
        
          function novo(tipo, fn, extra) {
            var r = {
              tipo: tipo,
              cod: resumo(fn),
              onde: extra || '',
              chamadas: 0,
              execucoes: 0,
              puladas: 0,
              ms: 0,
              msJanela: 0,
              inicioJanela: agora(),
              limitado: false,
              amplo: false,
              dentro: false
            };
            registros.push(r);
            return r;
          }
        
          /* devolve true quando o vigia ainda tem folga de CPU nesta janela */
          function temFolga(r) {
            var t = agora();
            if (t - r.inicioJanela > JANELA) {
              r.inicioJanela = t;
              r.msJanela = 0;
              return true;
            }
            if (r.msJanela > TETO_MS) {
              r.limitado = true;
              return false;
            }
            return true;
          }
        
          function medir(r, fn, alvo, args) {
            var i = agora();
            r.dentro = true;
            try {
              return fn.apply(alvo, args || []);
            } catch (e) {
              throw e;
            } finally {
              r.dentro = false;
              var g = agora() - i;
              r.ms += g;
              r.msJanela += g;
              r.execucoes++;
            }
          }
        
          /* ================================================================ *
           * 1) vigias de tela (MutationObserver)
           *    - um vigia nunca reage as mudancas que ele mesmo acabou de fazer
           *    - vigias que olham a pagina inteira ganham um descanso minimo
           *    - quem passar do limite de CPU tem execucoes puladas
           * ================================================================ */
          var Orig = window.MutationObserver || window.WebKitMutationObserver || null;
        
          if (Orig) {
            var Guardado = function (cb) {
              if (typeof cb !== 'function') { return new Orig(cb); }
        
              var reg = novo('vigia de tela', cb);
              var pendente = false;
              var ultima = 0;
              var guardadas = [];
              var eu = null;
        
              function rodar() {
                pendente = false;
                var lote = guardadas;
                guardadas = [];
                if (!temFolga(reg)) { reg.puladas++; return; }
                ultima = agora();
                try { medir(reg, cb, eu, [lote, eu]); } catch (e) { /* ignora */ }
                ultima = agora();
              }
        
              function porta(recs, obs) {
                reg.chamadas++;
                if (reg.dentro) { reg.puladas++; return; }
                if (recs && recs.length && guardadas.length < 500) {
                  guardadas = guardadas.concat(recs);
                }
                if (!reg.amplo) {
                  if (!temFolga(reg)) { reg.puladas++; guardadas = []; return; }
                  var lote = guardadas;
                  guardadas = [];
                  try { medir(reg, cb, obs, [lote, obs]); } catch (e) { /* ignora */ }
                  ultima = agora();
                  return;
                }
                var falta = ESPERA - (agora() - ultima);
                if (pendente) { return; }
                pendente = true;
                setTimeout(rodar, falta > ATRASO ? falta : ATRASO);
              }
        
              var o = new Orig(porta);
              eu = o;
              reg.obs = o;
        
              var obsOrig = o.observe;
              o.observe = function (alvo, opc) {
                try {
                  var op = opc || {};
                  var raiz = (alvo === document) ||
                             (alvo === document.documentElement) ||
                             (alvo === document.body);
                  if (raiz || op.subtree === true) { reg.amplo = true; }
                  if (alvo && alvo.id) { reg.onde = '#' + alvo.id; }
                  else if (raiz) { reg.onde = 'pagina inteira'; }
                  else if (alvo && alvo.tagName) { reg.onde = String(alvo.tagName).toLowerCase(); }
                } catch (e) { /* ignora */ }
                return obsOrig.call(o, alvo, opc);
              };
        
              return o;
            };
        
            Guardado.prototype = Orig.prototype;
            try { window.MutationObserver = Guardado; } catch (e) { /* ignora */ }
            try { window.WebKitMutationObserver = Guardado; } catch (e2) { /* ignora */ }
          }
        
          /* ================================================================ *
           * 2) tarefas repetidas (setInterval)
           *    mede o tempo gasto e pula rodadas de quem exagerar
           * ================================================================ */
          var origInterval = window.setInterval;
        
          if (typeof origInterval === 'function') {
            window.setInterval = function (fn, ms) {
              if (typeof fn !== 'function') {
                return origInterval.apply(window, arguments);
              }
              var reg = novo('tarefa repetida', fn, 'cada ' + (Number(ms) || 0) + 'ms');
              var extras = Array.prototype.slice.call(arguments, 2);
              var envolvida = function () {
                reg.chamadas++;
                if (reg.dentro) { reg.puladas++; return; }
                if (!temFolga(reg)) { reg.puladas++; return; }
                try { medir(reg, fn, window, extras); } catch (e) { /* ignora */ }
              };
              return origInterval.call(window, envolvida, ms);
            };
          }
        
          /* ================================================================ *
           * 3) relatorio - Ctrl + Alt + D
           * ================================================================ */
          function ordenados() {
            var l = registros.slice(0);
            l.sort(function (a, b) { return b.ms - a.ms; });
            return l;
          }
        
          function texto() {
            var l = ordenados();
            var fora = [];
            var i;
            fora.push('RELATORIO DE DESEMPENHO DO PAINEL (patch 90)');
            fora.push('vigias e tarefas registrados: ' + registros.length);
            fora.push('');
            for (i = 0; i < l.length && i < 15; i++) {
              var r = l[i];
              fora.push((i + 1) + ') ' + r.tipo + ' | ' + (r.onde || '-'));
              fora.push('   tempo total: ' + r.ms + ' ms | rodou: ' + r.execucoes +
                        ' | chamado: ' + r.chamadas + ' | pulado: ' + r.puladas +
                        (r.limitado ? ' | FREADO' : ''));
              fora.push('   codigo: ' + r.cod);
            }
            return fora.join('\n');
          }
        
          function caixa() {
            var v = document.getElementById('p90Caixa');
            if (v) { v.parentNode.removeChild(v); return; }
            var fundo = document.createElement('div');
            fundo.id = 'p90Caixa';
            fundo.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.72);' +
              'display:flex;align-items:center;justify-content:center;padding:18px;';
            var cx = document.createElement('div');
            cx.style.cssText = 'background:#0f172a;color:#e2e8f0;border:1px solid #33415a;border-radius:12px;' +
              'max-width:900px;width:100%;max-height:86vh;overflow:auto;padding:16px;' +
              'font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;';
            cx.textContent = texto();
            var bt = document.createElement('button');
            bt.type = 'button';
            bt.textContent = 'Fechar';
            bt.style.cssText = 'margin-top:12px;padding:8px 14px;border-radius:8px;border:0;' +
              'background:#2563eb;color:#fff;cursor:pointer;font:600 13px system-ui;';
            bt.addEventListener('click', function () {
              if (fundo.parentNode) { fundo.parentNode.removeChild(fundo); }
            });
            cx.appendChild(document.createElement('br'));
            cx.appendChild(bt);
            fundo.appendChild(cx);
            fundo.addEventListener('click', function (ev) {
              if (ev.target === fundo) { fundo.parentNode.removeChild(fundo); }
            });
            (document.body || document.documentElement).appendChild(fundo);
          }
        
          window.p90Relatorio = function () {
            try { caixa(); } catch (e) { /* ignora */ }
            return texto();
          };
        
          document.addEventListener('keydown', function (ev) {
            if (!ev.ctrlKey || !ev.altKey) { return; }
            var k = String(ev.key || '').toLowerCase();
            if (k !== 'd') { return; }
            ev.preventDefault();
            try { caixa(); } catch (e) { /* ignora */ }
          }, true);
        
        })();
    
