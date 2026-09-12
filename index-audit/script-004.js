
        /* ------------------------------------------------------------------ *
         * PATCH 119 - UM RELOGIO SO PARA TODAS AS TAREFAS REPETIDAS           *
         *                                                                    *
         * Antes: cada patch antigo criava o seu proprio relogio (setInterval),
         * dezenas deles acordando a pagina em horas diferentes.              *
         * Agora: existe UM relogio mestre que bate de 250 em 250 ms e chama   *
         * cada tarefa no ritmo que ela pediu. O comportamento nao muda, muda  *
         * so a forma de agendar.                                             *
         *                                                                    *
         * Tambem: tarefas de vigilancia (ritmo de ate 2,5 s) descansam        *
         * enquanto a aba do navegador esta em segundo plano, e tarefas muito  *
         * demoradas tem o ritmo afrouxado para nao travar a tela.             *
         *                                                                    *
         * Relatorio: aperte Ctrl+Alt+R (ou rode p119Relatorio() no console).  *
         * ------------------------------------------------------------------ */
        (function () {
          'use strict';
          if (window.__p119Agenda) { return; }
        
          var origSet = window.setInterval;
          var origClear = window.clearInterval;
          if (typeof origSet !== 'function') { return; }
        
          window.__p119Agenda = true;
        
          var MINIMO = 250;      /* ritmos mais rapidos que isso ficam como estavam */
          var TICK = 250;        /* batida do relogio mestre */
          var LIMITE_PESADA = 150;   /* ms gastos numa rodada para considerar pesada */
          var TETO_ESTICADO = 3000;  /* ritmo maximo depois de afrouxar */
          var SONO = 2500;       /* ate esse ritmo, a tarefa dorme com a aba escondida */
        
          var tarefas = [];
          var contador = 0;
          var mestre = null;
          var BASE_ID = -1000000;
        
          function agora() { return Date.now(); }
        
          function resumoCodigo(fn) {
            var s = '';
            try { s = String(fn); } catch (e) { s = '?'; }
            return s.replace(/\s+/g, ' ').slice(0, 90);
          }
        
          function ligarMestre() {
            if (mestre !== null) { return; }
            mestre = origSet.call(window, rodada, TICK);
          }
        
          function rodada() {
            var t = agora();
            var escondida = !!(document && document.hidden);
            for (var i = 0; i < tarefas.length; i++) {
              var a = tarefas[i];
              if (!a.viva || t < a.prox) { continue; }
              if (escondida && a.ms <= SONO) {
                a.prox = t + a.ms;
                a.dormiu++;
                continue;
              }
              a.prox = t + a.ms;
              var ini = agora();
              try {
                a.fn.apply(window, a.extras);
              } catch (e) { /* mesma politica dos patches originais: segue adiante */ }
              var gasto = agora() - ini;
              a.rodou++;
              a.gasto += gasto;
              if (gasto > LIMITE_PESADA) {
                a.pesadas++;
                if (a.pesadas > 3 && a.ms < TETO_ESTICADO) {
                  a.ms = Math.min(TETO_ESTICADO, a.ms * 2);
                  a.afrouxada = true;
                  a.pesadas = 0;
                }
              }
            }
          }
        
          window.setInterval = function (fn, ms) {
            var ritmo = Number(ms);
            if (typeof fn !== 'function' || !isFinite(ritmo) || ritmo < MINIMO) {
              return origSet.apply(window, arguments);
            }
            contador += 1;
            var a = {
              id: BASE_ID - contador,
              fn: fn,
              ms: ritmo,
              pedido: ritmo,
              prox: agora() + ritmo,
              extras: Array.prototype.slice.call(arguments, 2),
              viva: true,
              rodou: 0,
              dormiu: 0,
              pesadas: 0,
              gasto: 0,
              afrouxada: false,
              cod: resumoCodigo(fn)
            };
            tarefas.push(a);
            ligarMestre();
            return a.id;
          };
        
          window.clearInterval = function (id) {
            if (typeof id === 'number' && id <= BASE_ID) {
              for (var i = 0; i < tarefas.length; i++) {
                if (tarefas[i].id === id) {
                  tarefas[i].viva = false;
                  tarefas.splice(i, 1);
                  return;
                }
              }
              return;
            }
            return origClear.apply(window, arguments);
          };
        
          /* deixa o relogio mestre acordar junto com a aba */
          document.addEventListener('visibilitychange', function () {
            if (document.hidden) { return; }
            var t = agora();
            for (var i = 0; i < tarefas.length; i++) {
              if (tarefas[i].prox > t + TICK) { tarefas[i].prox = t + TICK; }
            }
          });
        
          function texto() {
            var lista = tarefas.slice(0);
            lista.sort(function (x, y) { return y.gasto - x.gasto; });
            var fora = [];
            fora.push('RELOGIOS REUNIDOS NUM SO (patch 119)');
            fora.push('tarefas reunidas: ' + tarefas.length +
                      '  |  relogio mestre: 1 batida cada ' + TICK + ' ms');
            fora.push('');
            for (var i = 0; i < lista.length && i < 20; i++) {
              var a = lista[i];
              fora.push((i + 1) + ') ritmo pedido: ' + a.pedido + ' ms' +
                        (a.afrouxada ? ' (afrouxado para ' + a.ms + ' ms)' : ''));
              fora.push('   rodou: ' + a.rodou + '  |  dormiu: ' + a.dormiu +
                        '  |  tempo total: ' + a.gasto + ' ms');
              fora.push('   codigo: ' + a.cod);
            }
            return fora.join('\n');
          }
        
          function caixa() {
            var velha = document.getElementById('p119Caixa');
            if (velha) {
              if (velha.parentNode) { velha.parentNode.removeChild(velha); }
              return;
            }
            var fundo = document.createElement('div');
            fundo.id = 'p119Caixa';
            fundo.style.cssText = 'position:fixed;inset:0;z-index:2147483000;' +
              'background:rgba(0,0,0,.72);display:flex;align-items:center;' +
              'justify-content:center;padding:18px;';
            var cx = document.createElement('div');
            cx.style.cssText = 'background:#0f172a;color:#e2e8f0;border:1px solid #33415a;' +
              'border-radius:12px;max-width:900px;width:100%;max-height:86vh;overflow:auto;' +
              'padding:16px;font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;';
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
              if (ev.target === fundo && fundo.parentNode) {
                fundo.parentNode.removeChild(fundo);
              }
            });
            (document.body || document.documentElement).appendChild(fundo);
          }
        
          window.p119Relatorio = function () {
            try { caixa(); } catch (e) { /* ignora */ }
            return texto();
          };
        
          document.addEventListener('keydown', function (ev) {
            if (!ev.ctrlKey || !ev.altKey) { return; }
            if (String(ev.key || '').toLowerCase() !== 'r') { return; }
            ev.preventDefault();
            try { caixa(); } catch (e) { /* ignora */ }
          }, true);
        })();
    
