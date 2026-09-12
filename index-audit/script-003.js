
        /* PATCH_VARREDURA_UNICA_OK
           Antes: 9 patches diferentes (linhas ~39290-50374 do arquivo original)
           criavam, cada um, seu proprio setInterval (900ms a 2000ms) + seu proprio
           MutationObserver observando document.documentElement/body inteiro com
           subtree:true, todos fazendo a mesma coisa: varrer o DOM e reinserir um
           botao/elemento que "sumiu". Isso rodava ~9 varreduras completas da
           pagina por segundo, brigando por CPU (motivo do patch anti-trava acima).
        
           Agora: 1 unico MutationObserver + 1 unico setInterval cuidam de rodar
           todas as varreduras registradas. Cada patch so chama
           window.__varreduraUnica(suaFuncao) em vez de criar timer/observer proprio.
           O comportamento de cada patch nao muda, so a forma de agendar. */
        (function () {
          'use strict';
          if (window.__varreduraUnica) { return; }
        
          var tarefas = [];
          var INTERVALO = 900; /* igual ao menor intervalo usado antes, para nao atrasar nenhum patch */
          var pendente = false;
        
          function rodarTodas() {
            for (var i = 0; i < tarefas.length; i++) {
              try { tarefas[i](); } catch (e) { /* ignora, mesma politica dos patches originais */ }
            }
          }
        
          try {
            var Obs = window.MutationObserver || window.WebKitMutationObserver;
            if (Obs) {
              var mo = new Obs(function () {
                if (pendente) { return; }
                pendente = true;
                setTimeout(function () { pendente = false; rodarTodas(); }, 60);
              });
              mo.observe(document.documentElement, { childList: true, subtree: true });
            }
          } catch (e) { /* ignora */ }
        
          setInterval(rodarTodas, INTERVALO);
        
          window.__varreduraUnica = function (fn) {
            if (typeof fn === 'function') { tarefas.push(fn); }
          };
        })();
    
