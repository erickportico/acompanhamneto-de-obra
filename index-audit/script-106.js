
        /* =====================================================================
         * PATCH 142 - o Esc volta a funcionar pelo caminho do "soltar a tecla"
         *
         * Motivo: um vigia antigo (editor de fotos dos slides) fica na janela,
         * no primeiro nivel, e consome todo Esc enquanto existir qualquer texto
         * editavel na pagina - e o titulo do relatorio e sempre editavel.
         * Como o "soltar a tecla" nao passa por aquele vigia, usamos esse
         * caminho para fechar a caixa de cima.
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.P142) { return; }
        
          var contagemAnterior = 0;   /* quantos fechamentos o patch 141 ja fez */
          var vezesReserva = 0;       /* quantas vezes este caminho precisou agir */
          var escNormalFunciona = false;
        
          /* texto rico sendo editado de verdade (titulo do relatorio, texto de
             slide): o Esc e do texto, nao da caixa */
          function editandoTexto() {
            var a = document.activeElement;
            return !!(a && a.isContentEditable);
          }
        
          /* campo comum (caixa de digitacao, lista de escolha): o Esc pode
             fechar a caixa, mas primeiro tiramos o cursor do campo */
          function emCampo() {
            var a = document.activeElement;
            if (!a) { return false; }
            var t = (a.tagName || '').toLowerCase();
            return (t === 'input' || t === 'textarea' || t === 'select');
          }
        
          function travaLigada() {
            var t = document.getElementById('p139Trava');
            return !!(t && String(t.className || '').indexOf('on') >= 0);
          }
        
          function contagem() {
            if (window.P141 && typeof window.P141.quantasFechei === 'function') {
              try { return window.P141.quantasFechei(); } catch (e) { return contagemAnterior; }
            }
            return contagemAnterior;
          }
        
          function fecharDeCima() {
            if (window.P141 && typeof window.P141.fecharTopo === 'function') {
              try { return window.P141.fecharTopo(); } catch (e) { return false; }
            }
            return false;
          }
        
          /* ================================================================ *
           * o caminho de reserva: soltar o Esc
           * ================================================================ */
          window.addEventListener('keyup', function (ev) {
            if (ev.key !== 'Escape' && ev.keyCode !== 27) { return; }
        
            /* a tela de bloqueio manda: nao mexemos em nada */
            if (travaLigada()) { return; }
        
            /* voce esta editando um texto: o Esc e do texto, nao da caixa */
            if (editandoTexto()) { contagemAnterior = contagem(); return; }
        
            /* cursor dentro de um campo: sai do campo e segue fechando a caixa */
            if (emCampo()) {
              try { document.activeElement.blur(); } catch (e) { }
            }
        
            /* se o Esc normal ja fechou algo, nao fechamos de novo */
            var agora = contagem();
            if (agora > contagemAnterior) {
              escNormalFunciona = true;
              contagemAnterior = agora;
              return;
            }
        
            if (fecharDeCima()) { vezesReserva = vezesReserva + 1; }
            contagemAnterior = contagem();
          }, true);
        
          /* ================================================================ *
           * diagnostico no console
           * ================================================================ */
          window.P142 = {
            estado: function () {
              var eds = document.querySelectorAll('[contenteditable="true"]');
              var quem = [];
              var i;
              for (i = 0; i < eds.length; i++) {
                quem.push(eds[i].id || eds[i].tagName.toLowerCase());
              }
              var r = {
                gerenteDeCaixas: !!window.P141,
                textosEditaveisNaPagina: quem,
                escNormalChegou: escNormalFunciona,
                vezesQueOReservaAgiu: vezesReserva,
                editandoTextoAgora: editandoTexto(),
                cursorEmCampo: emCampo()
              };
              try {
                console.log('[PATCH142] textos editaveis que fazem o vigia antigo engolir o Esc: ' +
                            (quem.length ? quem.join(', ') : 'nenhum'));
                console.log('[PATCH142] o caminho de reserva ja fechou caixa ' + vezesReserva + ' vez(es).');
              } catch (e) { }
              return r;
            },
            fecharTopo: function () { return fecharDeCima(); }
          };
        
          /* comeco: guardo a contagem atual do patch 141, senao o primeiro Esc
             seria confundido com um fechamento que ja tinha acontecido antes */
          function comecar() {
            contagemAnterior = contagem();
            try {
              console.log('[PATCH142] Esc liberado pelo caminho do soltar a tecla. Use P142.estado().');
            } catch (e2) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(comecar, 900); });
          } else {
            setTimeout(comecar, 900);
          }
        }());
    
